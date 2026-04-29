import { NextRequest, NextResponse } from 'next/server';

import { supabaseAdminClient } from '@/libs/supabase/supabase-admin';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';

export const maxDuration = 300; // fix loop makes multiple AI calls per iteration

const MAX_ITERATIONS = 3;
const PASS_THRESHOLD = 8;

async function logActivity(jobId: string, action: string, message: string) {
  try {
    const { data: job } = await supabaseAdminClient
      .from('migration_jobs')
      .select('build_status')
      .eq('id', jobId)
      .single();
    const buildStatus = ((job?.build_status as any) || {});
    const activity = buildStatus.recent_activity || [];
    activity.push({ timestamp: new Date().toISOString(), action, message });
    await supabaseAdminClient
      .from('migration_jobs')
      .update({ build_status: { ...buildStatus, recent_activity: activity } })
      .eq('id', jobId);
  } catch (e) {
    console.error('[logActivity] Failed:', e);
  }
}

async function callAI(apiKey: string, model: string, systemPrompt: string, userPrompt: string, maxTokens: number): Promise<string> {
  const res = await fetch('https://ai-gateway.vercel.sh/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: maxTokens,
    }),
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`AI Gateway error (${res.status}): ${errorText}`);
  }
  const completion = await res.json();
  return completion.choices?.[0]?.message?.content || '';
}

function parseQAReport(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    throw new Error('Failed to parse QA report');
  }
}

export async function POST(request: NextRequest) {
  try {
    const AI_GATEWAY_API_KEY = process.env.AI_GATEWAY_API_KEY;
    if (!AI_GATEWAY_API_KEY) {
      return NextResponse.json({ error: 'AI Gateway API key not configured' }, { status: 500 });
    }

    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { jobId } = await request.json();
    if (!jobId) {
      return NextResponse.json({ error: 'Job ID required' }, { status: 400 });
    }

    // Get job
    const { data: job, error: jobError } = await supabaseAdminClient
      .from('migration_jobs')
      .select('*')
      .eq('id', jobId)
      .single();
    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    let metadata = (job.metadata as any) || {};
    const qaReport = metadata.code_qa_report;
    if (!qaReport) {
      return NextResponse.json({ error: 'No Code QA report found. Run Code QA first.' }, { status: 400 });
    }
    if (qaReport.overall_score >= PASS_THRESHOLD) {
      return NextResponse.json({ message: `Score is already ${qaReport.overall_score}/10 — no fixes needed.`, qaReport });
    }

    let currentSiteConfig = metadata.generated_site_config;
    let currentPageCode = metadata.generated_page_code;
    if (!currentSiteConfig || !currentPageCode) {
      return NextResponse.json({ error: 'Generated code not found.' }, { status: 400 });
    }

    // Save the original (pre-fix) code so the user can always revert
    if (!metadata.original_site_config) {
      metadata.original_site_config = currentSiteConfig;
      metadata.original_page_code = currentPageCode;
      metadata.original_code_qa_report = qaReport;
    }

    const rawLib = metadata.component_library;
    const componentLibrary = Array.isArray(rawLib) ? rawLib : (rawLib?.components || []);

    // Track iteration history and best version
    const fixHistory: any[] = metadata.fix_history || [];
    let currentQA = qaReport;
    let iteration = fixHistory.length;
    let bestScore = currentQA.overall_score;
    let bestSiteConfig = currentSiteConfig;
    let bestPageCode = currentPageCode;
    let bestQA = currentQA;

    if (iteration >= MAX_ITERATIONS) {
      return NextResponse.json({
        message: `Max iterations (${MAX_ITERATIONS}) already reached. Score: ${currentQA.overall_score}/10`,
        qaReport: currentQA,
        iterations: iteration,
      });
    }

    await logActivity(jobId, 'fix_start', `Starting auto-fix loop (iteration ${iteration + 1}/${MAX_ITERATIONS}, current score: ${currentQA.overall_score}/10)...`);

    // ── Fix → QA Loop ───────────────────────────────────────────────────────────
    while (iteration < MAX_ITERATIONS && currentQA.overall_score < PASS_THRESHOLD) {
      iteration++;

      // Build the fix prompt with QA issues
      const issuesSummary = [
        ...(currentQA.top_issues || []).map((i: string) => `- ${i}`),
        ...(currentQA.recommendations || []).map((r: string) => `- ${r}`),
      ].join('\n');

      const lowScores = Object.entries(currentQA.scores || {})
        .filter(([, v]: [string, any]) => v.score < PASS_THRESHOLD)
        .map(([k, v]: [string, any]) => `- **${k.replace(/_/g, ' ')}** (${v.score}/10): ${v.notes}`)
        .join('\n');

      // ── Step A: Fix the code ──────────────────────────────────────────────
      await logActivity(jobId, 'fix_ai', `Iteration ${iteration}/${MAX_ITERATIONS}: Sending code + QA issues to AI for fixes...`);

      const fixPrompt = `You are fixing issues in a WordPress-to-Next.js migration.

## CURRENT site.config.ts
${currentSiteConfig}

## CURRENT page.tsx
${currentPageCode}

## QA REPORT (overall score: ${currentQA.overall_score}/10)
### Issues to Fix:
${issuesSummary}

### Low-scoring Areas:
${lowScores}

## REUSABLE BLOCK COMPONENTS (import from @/components/blocks/)
You MUST use these for matching sections. Do NOT recreate their functionality inline.
1. ServicesGrid - props: { services: { icon: string, title: string, description: string }[] }
2. GalleryGrid - props: { images: { src: string, alt: string }[], headline: string, subtext: string, showViewAllLink?: boolean }
3. Testimonials - props: { testimonials: { name: string, quote: string, rating: number }[] }
4. CTABanner - props: { headline: string, phone: string, phoneRaw: string, address: string, directionsUrl: string, primaryLabel: string, primaryHref: string }
5. ContactForm - (self-contained form component, no props needed)
6. GoogleMap - props: { embedUrl: string }
7. MenuDisplay - props: { categories: { name: string, items: { name: string, description: string }[] }[] }

## UI COMPONENTS
- Container - wrapper with max-width and padding. Use it for EVERY section content.
- Button - styled button with variants (default, outline, ghost) and sizes (sm, default, lg). Use 'asChild' prop with Link or <a>.

## DESIGN SYSTEM — CRITICAL RULES

### globals.css base styles (already applied globally, do NOT re-declare):
- h1: font-alt font-bold text-4xl text-brand-cream lg:text-6xl
- h2: font-alt font-semibold text-2xl text-brand-cream lg:text-4xl
- h3: font-alt font-semibold text-xl text-brand-cream
- body: bg-background text-foreground

### Brand CSS variables (Tailwind classes — set by siteConfig in layout.tsx):
- text-brand-primary, bg-brand-primary → accent color
- text-brand-secondary, bg-brand-secondary → secondary color
- text-brand-text → body text color
- text-brand-cream → light heading/accent text
- bg-brand-bg → page background
- bg-background → dark background (default black)

### Fonts (via Tailwind):
- font-sans → Montserrat (default body, already on body)
- font-alt → Montserrat Alternates (headings, already on h1-h3)

### Icons: react-icons/io5 only

## ABSOLUTE RULES — VIOLATIONS WILL FAIL QA
1. NEVER use inline styles (style={{ }}). Use ONLY Tailwind CSS classes.
2. NEVER use style JSX (<style jsx>). Use ONLY Tailwind CSS classes.
3. NEVER hardcode colors as hex/rgb values. Use brand-* Tailwind classes or standard Tailwind colors.
4. NEVER hardcode font-family. Fonts are set globally.
5. NEVER duplicate block component functionality. If a section matches ServicesGrid, Testimonials, CTABanner, etc., USE the block.
6. ALL text content must come from siteConfig — NEVER hardcode business text.
7. Wrap ALL section content in <Container>.
8. Use responsive Tailwind classes (mobile-first): sm:, md:, lg:, xl: breakpoints.
9. Use Next.js <Image> for all images.
10. Use <Button> component (with asChild) for CTAs.
11. CRITICAL: In page.tsx, ONLY destructure and reference siteConfig properties that ACTUALLY EXIST in the site.config.ts shown above. Read it carefully. If a property like serviceAreas, financing, process, chat, etc. does NOT exist in the config, do NOT reference it in page.tsx — the build WILL fail with a TypeScript error. If you need a new property, you MUST add it to the site.config.ts file in your response.
12. NEVER add new imports for modules that don't exist in the template (e.g. custom hooks, utilities). Only use: next/image, next/link, react-icons/io5, @/components/container, @/components/ui/button, @/components/blocks/*, and the site.config import.

## INSTRUCTIONS
Fix ALL the issues listed above. Return BOTH files as a single response in this exact format:

===SITE_CONFIG_START===
(complete updated site.config.ts code)
===SITE_CONFIG_END===

===PAGE_CODE_START===
(complete updated page.tsx code)
===PAGE_CODE_END===

Rules:
- Return the COMPLETE file contents, not just the changed parts
- Fix every issue mentioned in the QA report
- Keep all existing working code intact — only change what needs fixing
- Follow ALL the absolute rules above — especially NO inline styles`;

      const fixResponse = await callAI(
        AI_GATEWAY_API_KEY,
        'anthropic/claude-sonnet-4.6',
        'You are an expert Next.js developer fixing code issues. Return the complete updated files in the exact format requested. No markdown fences around the code blocks — just the delimiters as specified.',
        fixPrompt,
        10000,
      );

      // Parse the fixed code
      const configMatch = fixResponse.match(/===SITE_CONFIG_START===\s*([\s\S]*?)\s*===SITE_CONFIG_END===/);
      const pageMatch = fixResponse.match(/===PAGE_CODE_START===\s*([\s\S]*?)\s*===PAGE_CODE_END===/);

      if (!configMatch && !pageMatch) {
        await logActivity(jobId, 'fix_parse_error', `Iteration ${iteration}: AI response didn't contain expected delimiters. Trying fallback parse...`);
        // Fallback: try to extract any code blocks
        const codeBlocks = fixResponse.split(/```(?:typescript|tsx|ts)?\n?/).filter((_: string, i: number) => i % 2 === 1);
        if (codeBlocks.length >= 2) {
          currentSiteConfig = codeBlocks[0].replace(/```\s*$/gm, '').trim();
          currentPageCode = codeBlocks[1].replace(/```\s*$/gm, '').trim();
        } else if (codeBlocks.length === 1) {
          // Only page code was returned
          currentPageCode = codeBlocks[0].replace(/```\s*$/gm, '').trim();
        } else {
          await logActivity(jobId, 'fix_failed', `Iteration ${iteration}: Could not parse AI fix response. Stopping.`);
          break;
        }
      } else {
        if (configMatch) currentSiteConfig = configMatch[1].replace(/^```(?:typescript|tsx|ts)?\n?/gm, '').replace(/```\s*$/gm, '').trim();
        if (pageMatch) currentPageCode = pageMatch[1].replace(/^```(?:typescript|tsx|ts)?\n?/gm, '').replace(/```\s*$/gm, '').trim();
      }

      await logActivity(jobId, 'fix_applied', `Iteration ${iteration}: Code updated (config: ${currentSiteConfig.length} chars, page: ${currentPageCode.length} chars). Running Code QA...`);

      // ── Step B: Re-run Code QA ────────────────────────────────────────────
      const qaPrompt = `You are performing Code Quality Assurance on a WordPress-to-Next.js migration.

## SOURCE WORDPRESS SITE
- URL: ${job.target_url}

## GENERATED site.config.ts
${currentSiteConfig}

## GENERATED page.tsx
${currentPageCode}

## COMPONENTS IDENTIFIED
${componentLibrary.map((c: any) => `- ${c.name}: ${c.description}`).join('\n') || 'None'}

## QA CHECKLIST — Evaluate each item and give a score (0-10) and notes:

1. **Section Coverage**: Does the generated page include ALL major sections from the WordPress homepage?
2. **Content Accuracy**: Is the siteConfig populated with actual business data, not placeholder text?
3. **Navigation**: Does the nav config match the WordPress site's main menu?
4. **Brand Fidelity**: Do the brand colors match the original site's color scheme?
5. **Component Usage**: Are the available template blocks used appropriately?
6. **Image References**: Are images properly referenced (Next.js Image, correct URLs)?
7. **Responsive Design**: Does the code use mobile-first responsive Tailwind classes?
8. **Code Quality**: Is the code clean, properly typed, follows Next.js best practices?
9. **Missing Elements**: What significant elements from the WordPress site are NOT represented?
10. **Overall Readiness**: How ready is this for deployment? Top 3 things to fix?

Return as JSON:
{
  "scores": {
    "section_coverage": { "score": 0, "notes": "..." },
    "content_accuracy": { "score": 0, "notes": "..." },
    "navigation": { "score": 0, "notes": "..." },
    "brand_fidelity": { "score": 0, "notes": "..." },
    "component_usage": { "score": 0, "notes": "..." },
    "image_references": { "score": 0, "notes": "..." },
    "responsive_design": { "score": 0, "notes": "..." },
    "code_quality": { "score": 0, "notes": "..." },
    "missing_elements": { "score": 0, "notes": "..." },
    "overall_readiness": { "score": 0, "notes": "..." }
  },
  "overall_score": 0,
  "top_issues": [],
  "recommendations": [],
  "ready_for_deployment": false,
  "summary": "..."
}`;

      const qaResponse = await callAI(
        AI_GATEWAY_API_KEY,
        'anthropic/claude-opus-4.6',
        'You are an expert QA engineer reviewing a WordPress-to-Next.js migration. Be thorough and critical. Return ONLY valid JSON.',
        qaPrompt,
        3000,
      );

      currentQA = parseQAReport(qaResponse);

      // Track the best-scoring version
      if (currentQA.overall_score >= bestScore) {
        bestScore = currentQA.overall_score;
        bestSiteConfig = currentSiteConfig;
        bestPageCode = currentPageCode;
        bestQA = currentQA;
      } else {
        await logActivity(jobId, 'fix_regression', `Iteration ${iteration}: Score dropped ${currentQA.overall_score}/10 (best was ${bestScore}/10) — will keep best version`);
      }

      // Record this iteration
      fixHistory.push({
        iteration,
        timestamp: new Date().toISOString(),
        previousScore: iteration === 1 ? qaReport.overall_score : fixHistory[fixHistory.length - 1]?.newScore,
        newScore: currentQA.overall_score,
        issuesFixed: issuesSummary.split('\n').length,
      });

      const passed = currentQA.overall_score >= PASS_THRESHOLD;
      await logActivity(
        jobId,
        'fix_qa_result',
        `Iteration ${iteration}: Score ${currentQA.overall_score}/10 ${passed ? '✓ PASSED' : `(threshold: ${PASS_THRESHOLD})`}${iteration < MAX_ITERATIONS && !passed ? ' — continuing...' : ''}`,
      );

      if (passed) break;
    }

    // ── Save results (use the best-scoring version, not necessarily the last) ──
    metadata.generated_site_config = bestSiteConfig;
    metadata.generated_site_config_at = new Date().toISOString();
    metadata.generated_page_code = bestPageCode;
    metadata.generated_page_code_at = new Date().toISOString();
    metadata.code_qa_report = bestQA;
    metadata.code_qa_at = new Date().toISOString();
    metadata.fix_history = fixHistory;

    // Clear downstream steps since code changed
    delete metadata.deploy_preview;
    delete metadata.visual_qa_report;
    delete metadata.visual_qa_at;
    delete metadata.visual_qa_screenshots;

    const passed = currentQA.overall_score >= PASS_THRESHOLD;
    const summaryMsg = passed
      ? `Auto-fix complete: ${currentQA.overall_score}/10 after ${iteration} iteration(s) ✓`
      : `Auto-fix stopped after ${iteration} iteration(s): ${currentQA.overall_score}/10 (threshold: ${PASS_THRESHOLD})`;

    await logActivity(jobId, 'fix_complete', summaryMsg);

    // Re-read build_status to avoid overwriting activity log
    const { data: freshJob } = await supabaseAdminClient
      .from('migration_jobs')
      .select('build_status')
      .eq('id', jobId)
      .single();
    const buildStatus = ((freshJob?.build_status as any) || {});

    await supabaseAdminClient
      .from('migration_jobs')
      .update({
        metadata,
        build_status: {
          ...buildStatus,
          phase: 'homepage',
          current_step: 'code_qa_complete',
          recent_activity: [
            ...(buildStatus.recent_activity || []),
            {
              timestamp: new Date().toISOString(),
              action: 'fix_loop_done',
              message: summaryMsg,
            },
          ],
        },
      })
      .eq('id', jobId);

    return NextResponse.json({
      message: summaryMsg,
      qaReport: currentQA,
      iterations: iteration,
      fixHistory,
      passed,
    });
  } catch (error: any) {
    console.error('[wp-migration-v2-fix-code] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 },
    );
  }
}
