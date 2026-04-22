import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';
import { supabaseAdminClient } from '@/libs/supabase/supabase-admin';

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

// The ACTUAL page.tsx from the template repo — AI must follow this exact pattern
const TEMPLATE_PAGE_REFERENCE = `
// This is the REAL template page.tsx. Your generated code MUST follow this exact pattern.

import Image from 'next/image';
import Link from 'next/link';
import { IoLocationSharp, IoTime, IoCall } from 'react-icons/io5';
import { Container } from '@/components/container';
import { Button } from '@/components/ui/button';
import { siteConfig } from '../../site.config';
import { ServicesGrid } from '@/components/blocks/services-grid';
import { GalleryGrid } from '@/components/blocks/gallery-grid';
import { Testimonials } from '@/components/blocks/testimonials';
import { CTABanner } from '@/components/blocks/cta-banner';

export default function HomePage() {
  const { business, services, gallery, testimonials, maps, features } = siteConfig;
  return (
    <div className='flex flex-col'>
      <HeroSection />
      <ServicesGrid services={services} />
      <AboutSnippetSection />
      {features.hasGallery && (
        <GalleryGrid images={gallery.images.slice(0, 6)} headline={gallery.headline} subtext={gallery.subheadline} showViewAllLink />
      )}
      {features.hasTestimonials && <Testimonials testimonials={testimonials} />}
      <CTABanner headline='Come See Us' phone={business.phone} phoneRaw={business.phoneRaw} address={business.address.full} directionsUrl={maps.directionsUrl} primaryLabel='Contact Us' primaryHref='/contact' />
    </div>
  );
}

// HeroSection — local component using ONLY Tailwind classes and brand CSS vars
function HeroSection() {
  const { business, hours, maps } = siteConfig;
  return (
    <section className='relative min-h-[85vh] overflow-hidden'>
      <Image src='/images/hero.jpg' alt={business.name} fill priority className='object-cover' />
      <div className='absolute inset-0 bg-black/65' />
      <Container className='relative z-10 flex min-h-[85vh] flex-col items-center justify-center text-center'>
        <h1 className='mb-6 max-w-4xl leading-tight'>{business.tagline}</h1>
        <p className='mb-10 max-w-xl text-lg text-brand-text lg:text-xl'>{business.description}</p>
        <div className='flex flex-col gap-4 sm:flex-row'>
          <Button size='lg' className='bg-brand-primary px-8 py-6 text-lg font-semibold text-black hover:bg-brand-cream' asChild>
            <a href={\`tel:\${business.phoneRaw}\`}><IoCall className='mr-2 h-5 w-5' />Call Now</a>
          </Button>
          <Button size='lg' variant='outline' className='border-brand-primary px-8 py-6 text-lg text-brand-primary hover:bg-brand-primary hover:text-black' asChild>
            <a href={maps.directionsUrl} target='_blank' rel='noopener noreferrer'><IoLocationSharp className='mr-2 h-5 w-5' />Get Directions</a>
          </Button>
        </div>
      </Container>
    </section>
  );
}

// AboutSnippetSection — local component, all data from siteConfig
function AboutSnippetSection() {
  const { business, about } = siteConfig;
  return (
    <section className='bg-zinc-950 py-20'>
      <Container>
        <div className='grid items-center gap-12 lg:grid-cols-2'>
          <div>
            <h2 className='mb-6'>{about.headline}</h2>
            {about.story.slice(0, 2).map((para, i) => (
              <p key={i} className='mb-4 text-brand-text'>{para}</p>
            ))}
            <Button className='mt-4 bg-brand-primary text-black hover:bg-brand-cream' asChild>
              <Link href='/about'>Our Story</Link>
            </Button>
          </div>
          <div className='relative aspect-[4/3] overflow-hidden rounded-xl'>
            <Image src='/images/about.jpg' alt={\`About \${business.name}\`} fill className='object-cover' />
          </div>
        </div>
      </Container>
    </section>
  );
}
`;

// Design system: blocks, UI components, CSS variables, and strict rules
const AVAILABLE_BLOCKS = `
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

### globals.css base styles (already applied, do NOT re-declare):
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
- text-foreground → default text

### Fonts (via Tailwind classes):
- font-sans → Montserrat (default body font, already applied to body)
- font-alt → Montserrat Alternates (headings, already applied to h1-h3)

### Icons: react-icons/io5 only (IoCall, IoLocationSharp, IoTime, IoHeart, IoConstruct, etc.)

## ABSOLUTE RULES — VIOLATIONS WILL FAIL QA
1. NEVER use inline styles (style={{ }}). Use ONLY Tailwind CSS classes.
2. NEVER use style JSX (<style jsx>). Use ONLY Tailwind CSS classes.
3. NEVER hardcode colors as hex/rgb values. Use brand-* Tailwind classes (bg-brand-primary, text-brand-cream, etc.) or standard Tailwind colors (bg-zinc-950, text-white, etc.).
4. NEVER hardcode font-family. The fonts are already set globally. Use font-sans or font-alt classes if needed.
5. NEVER duplicate block component functionality. If a section matches ServicesGrid, Testimonials, CTABanner, GalleryGrid, etc., USE the block component.
6. ALL text content must come from siteConfig — NEVER hardcode business-specific text.
7. Wrap ALL section content in <Container> for consistent max-width and padding.
8. Use responsive Tailwind classes (mobile-first): sm:, md:, lg:, xl: breakpoints.
9. Use Next.js <Image> component for all images with proper fill/width/height props.
10. Section backgrounds: alternate between bg-background (default dark), bg-zinc-950, bg-zinc-900, bg-brand-bg for visual variety.
`;

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
    if ((job.metadata as any)?.generated_page_code) {
      const meta = (job.metadata as any);
      delete meta.code_qa_report;
      delete meta.code_qa_at;
      delete meta.deploy_preview;
      delete meta.visual_qa_report;
      delete meta.visual_qa_at;
      delete meta.visual_qa_screenshots;
      delete meta.fix_history;
      await supabaseAdminClient
        .from('migration_jobs')
        .update({ metadata: meta })
        .eq('id', jobId);
      await logActivity(jobId, 'page_gen_rerun', 'Re-running page code generation (downstream steps cleared)...');
    }

    // Require site config first
    const siteConfigCode = (job.metadata as any)?.generated_site_config;
    if (!siteConfigCode) {
      return NextResponse.json({ error: 'Site config not generated. Run Generate Config first.' }, { status: 400 });
    }

    await logActivity(jobId, 'page_gen_start', 'Starting page code generation...');

    // Get brand guide
    const { data: brandGuide } = await supabaseAdminClient
      .from('brand_guides')
      .select('*')
      .eq('job_id', jobId)
      .single();

    // Get component library
    const rawLib = (job.metadata as any)?.component_library;
    const componentLibrary = Array.isArray(rawLib) ? rawLib : (rawLib?.components || []);

    // Get homepage HTML
    const targetUrl = job.target_url;
    const targetUrlAlt = targetUrl.endsWith('/') ? targetUrl.slice(0, -1) : targetUrl + '/';

    let homepage: { original_html: string | null; url: string } | null = null;

    const { data: exactMatch } = await supabaseAdminClient
      .from('migration_pages')
      .select('original_html, url')
      .eq('job_id', jobId)
      .eq('url', targetUrl)
      .single();

    if (exactMatch) {
      homepage = exactMatch;
    } else {
      const { data: altMatch } = await supabaseAdminClient
        .from('migration_pages')
        .select('original_html, url')
        .eq('job_id', jobId)
        .eq('url', targetUrlAlt)
        .single();
      if (altMatch) homepage = altMatch;
    }

    if (!homepage?.original_html) {
      return NextResponse.json({ error: 'Homepage HTML not found. Run Capture first.' }, { status: 400 });
    }

    // Get asset manifest for image references
    const assetManifest = (job.metadata as any)?.asset_manifest_home || (job.metadata as any)?.asset_manifest;
    const assetMapping = assetManifest?.assets?.map((a: any) => `${a.originalUrl} → ${a.storageUrl}`).slice(0, 50).join('\n') || 'No assets downloaded yet';

    const html = homepage.original_html;
    const htmlLength = html.length;

    // For very large HTML, send it in sections with focus on structure
    // Extract the main structural sections
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    const bodyHtml = bodyMatch ? bodyMatch[1] : html;

    // Strip scripts/styles and trim to reasonable size for AI
    const cleanedHtml = bodyHtml
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, '');
    const MAX_HTML_CHARS = 12000;
    const trimmedHtml = cleanedHtml.length > MAX_HTML_CHARS
      ? cleanedHtml.substring(0, MAX_HTML_CHARS) + '\n<!-- ... truncated ... -->'
      : cleanedHtml;

    await logActivity(jobId, 'page_gen_context', `HTML: ${htmlLength} chars (trimmed to ${trimmedHtml.length}), config: ${siteConfigCode.length} chars, ${componentLibrary.length} components, ${assetManifest?.assets?.length || 0} assets`);

    const prompt = `You are generating a Next.js home page (page.tsx) for a WordPress-to-Next.js migration.

## TARGET STRUCTURE
The generated file MUST follow this exact pattern:
${TEMPLATE_PAGE_REFERENCE}

## AVAILABLE COMPONENTS
${AVAILABLE_BLOCKS}

## SITE CONFIG (already generated — FULL file, do NOT truncate or skip any properties)
The siteConfig file has been generated with all the business data. Your page.tsx MUST import it and ONLY use properties that actually exist in this config. Do NOT destructure or reference any property that is not defined here.
\`\`\`
${siteConfigCode}
\`\`\`

## COMPONENTS IDENTIFIED FROM WORDPRESS SITE
Each of these was found on the WordPress homepage. You MUST include a corresponding section for EVERY component listed below. If a matching block component exists (e.g., ServicesGrid, Testimonials, CTABanner), use it. Otherwise, create a local component.
${componentLibrary.map((c: any) => `- **${c.name}** (${c.type}): ${c.description}`).join('\n') || 'None identified'}

## ASSET MAPPING (WordPress URL → Storage URL)
${assetMapping}

## ORIGINAL WORDPRESS HTML (body content)
${trimmedHtml}

## BRAND GUIDE
${brandGuide ? JSON.stringify({ colors: brandGuide.colors, typography: brandGuide.typography }, null, 2).substring(0, 1500) : 'Not available'}

## INSTRUCTIONS
1. Generate a COMPLETE page.tsx file that recreates the WordPress homepage using Next.js + React.
2. MANDATORY: Use the reusable block components for matching sections (ServicesGrid, Testimonials, CTABanner, GalleryGrid, ContactForm, GoogleMap, MenuDisplay). Do NOT recreate their functionality with custom code.
3. For sections that don't map to existing blocks, create local function components in the same file (like HeroSection, AboutSnippetSection). Follow the EXACT pattern from the template reference above.
4. SECTION COVERAGE: You MUST create a section for EVERY component identified from the WordPress site (listed above). If you skip a section, explain why in a TODO comment. Do NOT silently omit sections.
5. ALL data must come from siteConfig — NEVER hardcode business-specific text, phone numbers, addresses, testimonials, etc. If data is missing from siteConfig, add a TODO comment but still reference siteConfig.
6. NEVER fabricate or invent placeholder data (fake names, fake testimonials, fake reviews). If real data isn't in siteConfig, use a TODO comment and leave the section structure ready for data.
7. ONLY destructure/reference properties that ACTUALLY EXIST in the siteConfig shown above. Read it carefully. If a property doesn't exist, do NOT reference it.
8. STYLING: Use ONLY Tailwind CSS utility classes. ABSOLUTELY NO inline styles (style={{ }}), NO <style jsx>, NO hardcoded hex/rgb colors. Use brand-* classes (bg-brand-primary, text-brand-text, text-brand-cream, etc.) and standard Tailwind classes (bg-zinc-950, text-white, etc.).
9. CONTRAST: On dark overlays (bg-black/65 etc.), use text-white or text-gray-200 for body text — NEVER use text-brand-text on dark backgrounds (it may be dark and invisible). text-brand-cream is safe for headings on dark backgrounds.
10. HEADINGS: h1/h2/h3 are already styled globally (font-alt, brand-cream, responsive sizing). Do NOT add font-family, color, or font-size styles to headings — they inherit from globals.css.
11. Use Next.js <Image> component for ALL images with proper fill/width/height props. Use asset storage URLs from the mapping above where available.
12. Wrap ALL section content in <Container> for consistent max-width and padding.
13. Make the page responsive using mobile-first Tailwind breakpoints (sm:, md:, lg:, xl:).
14. Keep the same visual structure/section order as the WordPress site.
15. Alternate section backgrounds for visual variety: bg-background, bg-zinc-950, bg-zinc-900, bg-brand-bg.
16. Use <Button> component (with asChild prop) for all CTAs, not raw <a> or <button> tags.
17. Include all necessary imports at the top. Export a default function component.

Return ONLY the TypeScript/JSX code for page.tsx. No markdown fences, no explanation.`;

    await logActivity(jobId, 'page_gen_ai', 'Sending to AI for page generation...');

    const aiResponse = await fetch('https://ai-gateway.vercel.sh/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AI_GATEWAY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-sonnet-4.6',
        messages: [
          {
            role: 'system',
            content: 'You are an expert Next.js developer generating a production-quality home page. Return ONLY valid TypeScript/JSX code. No markdown code fences. No explanation.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 10000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      throw new Error(`AI Gateway error (${aiResponse.status}): ${errorText}`);
    }

    const completion = await aiResponse.json();
    let pageCode = completion.choices?.[0]?.message?.content || '';

    // Clean up markdown fences if present
    pageCode = pageCode.replace(/^```(?:typescript|tsx|ts)?\n?/gm, '').replace(/```\s*$/gm, '').trim();

    // Detect and fix duplication — AI sometimes repeats the entire file multiple times
    const importMatches = pageCode.match(/^import\s+/gm);
    if (importMatches && importMatches.length > 20) {
      // Find the second occurrence of the first import line to locate the duplication boundary
      const firstImportLine = pageCode.match(/^(import\s+.+)$/m)?.[1];
      if (firstImportLine) {
        const firstIdx = pageCode.indexOf(firstImportLine);
        const secondIdx = pageCode.indexOf(firstImportLine, firstIdx + firstImportLine.length);
        if (secondIdx > firstIdx) {
          const originalLength = pageCode.length;
          pageCode = pageCode.substring(0, secondIdx).trim();
          await logActivity(jobId, 'page_gen_dedup', `Stripped duplicated code: ${originalLength} → ${pageCode.length} chars (AI repeated the file ${Math.round(originalLength / pageCode.length)}x)`);
        }
      }
    }

    // Detect truncation — page should end with a closing brace
    const trimmedPageEnd = pageCode.trimEnd();
    if (!trimmedPageEnd.endsWith('}') && !trimmedPageEnd.endsWith('};')) {
      await logActivity(jobId, 'page_gen_truncated', `WARNING: Generated page code may be truncated (${pageCode.length} chars)`);
    }

    await logActivity(jobId, 'page_gen_ai_done', `AI generated page code (${pageCode.length} chars)`);

    // Store in job metadata
    const metadata = (job.metadata as any) || {};
    metadata.generated_page_code = pageCode;
    metadata.generated_page_code_at = new Date().toISOString();

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
          current_step: 'generate_page_complete',
          recent_activity: [
            ...(buildStatus.recent_activity || []),
            {
              timestamp: new Date().toISOString(),
              action: 'page_generated',
              message: `Page code generated (${pageCode.length} chars)`,
            },
          ],
        },
      })
      .eq('id', jobId);

    return NextResponse.json({
      message: 'Page code generated',
      pageCode,
    });
  } catch (error: any) {
    console.error('[wp-migration-v2-generate-page] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
