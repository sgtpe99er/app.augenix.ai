import { NextRequest, NextResponse } from 'next/server';

import { supabaseAdminClient } from '@/libs/supabase/supabase-admin';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';

export const maxDuration = 120;

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

    const { jobId, pageLabel } = await request.json();

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

    // If re-running, clear downstream metadata
    if ((job.metadata as any)?.code_qa_report) {
      const meta = (job.metadata as any);
      delete meta.deploy_preview;
      delete meta.visual_qa_report;
      delete meta.visual_qa_at;
      delete meta.visual_qa_screenshots;
      delete meta.fix_history;
      await supabaseAdminClient
        .from('migration_jobs')
        .update({ metadata: meta })
        .eq('id', jobId);
      await logActivity(jobId, 'code_qa_rerun', 'Re-running Code QA (downstream steps cleared)...');
    }

    // Require page code
    const pageCode = (job.metadata as any)?.generated_page_code;
    if (!pageCode) {
      return NextResponse.json({ error: 'Page code not generated. Run Generate Page first.' }, { status: 400 });
    }

    // Require site config
    const siteConfig = (job.metadata as any)?.generated_site_config;
    if (!siteConfig) {
      return NextResponse.json({ error: 'Site config not generated. Run Generate Config first.' }, { status: 400 });
    }

    await logActivity(jobId, 'code_qa_start', 'Starting code QA analysis...');

    const rawLib = (job.metadata as any)?.component_library;
    const componentLibrary = Array.isArray(rawLib) ? rawLib : (rawLib?.components || []);

    const prompt = `You are performing Code Quality Assurance on a WordPress-to-Next.js migration.

## SOURCE WORDPRESS SITE
- URL: ${job.target_url}

## GENERATED site.config.ts
${siteConfig}

## GENERATED page.tsx
${pageCode}

## COMPONENTS IDENTIFIED
${componentLibrary.map((c: any) => `- ${c.name}: ${c.description}`).join('\n') || 'None'}

## QA CHECKLIST — Evaluate each item and give a score (0-10) and notes:

1. **Section Coverage**: Does the generated page include ALL major sections from the WordPress homepage? (Hero, About, Services, Testimonials, CTA, Footer, etc.)
2. **Content Accuracy**: Is the siteConfig populated with actual business data (name, phone, address, services) not placeholder text?
3. **Navigation**: Does the nav config match the WordPress site's main menu?
4. **Brand Fidelity**: Do the brand colors match the original site's color scheme?
5. **Component Usage**: Are the available template blocks (ServicesGrid, Testimonials, CTABanner, etc.) used appropriately?
6. **Image References**: Are images properly referenced (using Next.js Image component, correct asset URLs)?
7. **Responsive Design**: Does the code use mobile-first responsive Tailwind classes?
8. **Code Quality**: Is the code clean, properly typed, and follows Next.js best practices?
9. **Missing Elements**: What significant elements from the WordPress site are NOT represented?
10. **Overall Readiness**: How ready is this for deployment? What are the top 3 things to fix?

Return as JSON:
{
  "scores": {
    "section_coverage": { "score": 8, "notes": "..." },
    "content_accuracy": { "score": 7, "notes": "..." },
    "navigation": { "score": 9, "notes": "..." },
    "brand_fidelity": { "score": 8, "notes": "..." },
    "component_usage": { "score": 7, "notes": "..." },
    "image_references": { "score": 6, "notes": "..." },
    "responsive_design": { "score": 8, "notes": "..." },
    "code_quality": { "score": 9, "notes": "..." },
    "missing_elements": { "score": 7, "notes": "..." },
    "overall_readiness": { "score": 7, "notes": "..." }
  },
  "overall_score": 7.6,
  "top_issues": [
    "Issue 1 description",
    "Issue 2 description",
    "Issue 3 description"
  ],
  "recommendations": [
    "Recommendation 1",
    "Recommendation 2",
    "Recommendation 3"
  ],
  "ready_for_deployment": false,
  "summary": "Brief overall assessment"
}`;

    await logActivity(jobId, 'code_qa_ai', 'Sending generated code to AI for code review...');

    const aiResponse = await fetch('https://ai-gateway.vercel.sh/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AI_GATEWAY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-opus-4.6',
        messages: [
          {
            role: 'system',
            content: 'You are an expert QA engineer reviewing a WordPress-to-Next.js migration. Be thorough and critical. Return ONLY valid JSON.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 3000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      throw new Error(`AI Gateway error (${aiResponse.status}): ${errorText}`);
    }

    const completion = await aiResponse.json();
    const qaText = completion.choices?.[0]?.message?.content || '';

    let qaReport: any;
    try {
      qaReport = JSON.parse(qaText);
    } catch {
      const jsonMatch = qaText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        qaReport = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse QA report from AI response');
      }
    }

    await logActivity(jobId, 'code_qa_done', `Code QA complete: overall score ${qaReport.overall_score}/10, ${qaReport.ready_for_deployment ? 'READY' : 'needs work'}`);

    // Store in job metadata
    const metadata = (job.metadata as any) || {};
    metadata.code_qa_report = qaReport;
    metadata.code_qa_at = new Date().toISOString();

    // Re-read current build_status from DB to avoid overwriting logActivity entries
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
              action: 'code_qa_complete',
              message: `Code QA: ${qaReport.overall_score}/10 — ${qaReport.summary}`,
            },
          ],
        },
      })
      .eq('id', jobId);

    return NextResponse.json({
      message: 'Code QA complete',
      qaReport,
    });
  } catch (error: any) {
    console.error('[wp-migration-v2-code-qa] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
