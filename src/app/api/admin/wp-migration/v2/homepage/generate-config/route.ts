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
    if ((job.metadata as any)?.generated_site_config) {
      const meta = (job.metadata as any);
      delete meta.generated_page_code;
      delete meta.generated_page_code_at;
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
      await logActivity(jobId, 'config_rerun', 'Re-running site config generation (downstream steps cleared)...');
    } else {
      await logActivity(jobId, 'config_start', 'Starting site config generation...');
    }

    // Get brand guide
    const { data: brandGuide, error: brandGuideError } = await supabaseAdminClient
      .from('brand_guides')
      .select('*')
      .eq('job_id', jobId)
      .single();

    if (brandGuideError || !brandGuide) {
      return NextResponse.json({ error: 'Brand guide not found. Run Brand Guide step first.' }, { status: 400 });
    }

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

    // Get all discovered pages for navigation inference
    const { data: allPages } = await supabaseAdminClient
      .from('migration_pages')
      .select('url, page_label')
      .eq('job_id', jobId)
      .order('render_priority', { ascending: true });

    // Extract nav links and social links from HTML for better context
    const html = homepage.original_html;

    // Extract text content hints (title, meta description, headings)
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
    const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);

    // Extract social links
    const socialLinks: Record<string, string> = {};
    const socialPatterns = [
      { key: 'facebook', regex: /href=["'](https?:\/\/(?:www\.)?facebook\.com\/[^"']+)["']/gi },
      { key: 'instagram', regex: /href=["'](https?:\/\/(?:www\.)?instagram\.com\/[^"']+)["']/gi },
      { key: 'twitter', regex: /href=["'](https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[^"']+)["']/gi },
      { key: 'yelp', regex: /href=["'](https?:\/\/(?:www\.)?yelp\.com\/[^"']+)["']/gi },
      { key: 'google', regex: /href=["'](https?:\/\/(?:www\.)?google\.com\/maps[^"']+)["']/gi },
    ];
    for (const { key, regex } of socialPatterns) {
      const match = regex.exec(html);
      if (match) socialLinks[key] = match[1];
    }

    // Extract phone numbers
    const phoneMatch = html.match(/href=["']tel:([^"']+)["']/i);
    const phoneDisplay = phoneMatch ? phoneMatch[1].replace(/[^\d+()-.\s]/g, '') : null;

    // Extract email
    const emailMatch = html.match(/href=["']mailto:([^"'?]+)["']/i);

    // Extract address-like text (look for common patterns)
    const addressMatch = html.match(/\d+\s+[\w\s]+(?:St|Street|Ave|Avenue|Blvd|Boulevard|Dr|Drive|Rd|Road|Ln|Lane|Way|Ct|Court)[^<]{0,80}/i);

    // Get menu pages for navigation
    const menuPages = (allPages || []).filter((p: any) => p.page_label === 'main_menu');

    // Build brand info from brand guide
    const brandColors = brandGuide.colors as any;
    const brandTypography = brandGuide.typography as any;

    await logActivity(jobId, 'config_context', `Gathered context: ${menuPages.length} nav pages, ${Object.keys(socialLinks).length} social links, phone: ${phoneDisplay ? 'yes' : 'no'}, email: ${emailMatch ? 'yes' : 'no'}`);

    // Build the AI prompt
    const siteConfigTemplate = `
export const siteConfig = {
  fromEmail: 'noreply@DOMAIN',
  contactFormTo: 'EMAIL',
  business: {
    name: 'BUSINESS_NAME',
    legalName: 'BUSINESS_LEGAL_NAME',
    tagline: 'TAGLINE',
    description: 'DESCRIPTION',
    phone: 'PHONE',
    phoneRaw: 'PHONE_RAW',
    email: 'EMAIL',
    address: {
      street: 'STREET',
      city: 'CITY',
      state: 'STATE',
      zip: 'ZIP',
      country: 'US',
      full: 'FULL_ADDRESS',
    },
    schemaType: 'LocalBusiness',
    geo: { latitude: 0, longitude: 0 },
  },
  hours: [
    { days: 'Monday – Friday', hours: '9:00 AM – 5:00 PM' },
  ],
  hoursSpec: [
    { dayOfWeek: ['Monday','Tuesday','Wednesday','Thursday','Friday'], opens: '09:00', closes: '17:00' },
  ],
  brand: {
    primary: '#000000',
    secondary: '#666666',
    text: '#333333',
    cream: '#f5f5f5',
    bg: '#ffffff',
  },
  nav: [
    { label: 'About', href: '/about' },
  ],
  navCta: { label: 'Contact', href: '/contact' },
  services: [
    { icon: 'IoConstruct', title: 'Service', description: 'Description' },
  ],
  gallery: {
    headline: 'Our Work',
    subheadline: 'See our recent projects',
    images: [
      { src: '/images/gallery-1.jpg', alt: 'Project description' },
    ],
  },
  testimonials: [
    { name: 'Customer', quote: 'Great service!', rating: 5 },
  ],
  social: {
    facebook: null,
    instagram: null,
    google: null,
    yelp: null,
    twitter: null,
  },
  maps: { embedUrl: '', directionsUrl: '' },
  analytics: { gaId: null },
  siteUrl: 'https://DOMAIN',
  defaultOgImage: '/images/og-image.jpg',
  features: {
    hasMenu: false,
    hasGallery: true,
    hasAboutPage: true,
    hasTestimonials: true,
    hasTeamSection: false,
  },
  about: {
    headline: 'About Us',
    subheadline: 'Our Story',
    story: ['About paragraph'],
    values: [
      { icon: 'IoHeart', title: 'Value', description: 'Description' },
    ],
    team: [],
  },
  menu: {
    headline: 'Menu',
    subheadline: 'What We Offer',
    description: 'Our offerings',
    categories: [] as { name: string; items: { name: string; description: string }[] }[],
  },
} as const;

export type SiteConfig = typeof siteConfig;
`;

    const prompt = `You are generating a site.config.ts file for a Next.js website that is being migrated from WordPress.

Here is the TEMPLATE structure you must follow exactly (same keys, same TypeScript shape):
${siteConfigTemplate}

Here is data extracted from the WordPress homepage:

**Page title:** ${titleMatch?.[1] || 'Unknown'}
**Meta description:** ${metaDescMatch?.[1] || 'None found'}
**H1 heading:** ${h1Match?.[1]?.replace(/<[^>]+>/g, '').trim() || 'None found'}
**Source URL:** ${targetUrl}
**Phone:** ${phoneDisplay || 'Not found'}
**Email:** ${emailMatch?.[1] || 'Not found'}
**Address hint:** ${addressMatch?.[0]?.trim() || 'Not found'}

**Social links found:**
${Object.entries(socialLinks).map(([k, v]) => `- ${k}: ${v}`).join('\n') || 'None found'}

**Navigation pages (main menu):**
${menuPages.map((p: any) => `- ${p.url}`).join('\n') || 'None found'}

**Brand colors extracted:**
${JSON.stringify(brandColors, null, 2)}

**Typography extracted:**
${JSON.stringify(brandTypography, null, 2)}

**Components identified:**
${componentLibrary.map((c: any) => `- ${c.name} (${c.type}): ${c.description}`).join('\n') || 'None'}

**Homepage text content (extracted from HTML — use this to find real testimonials, services, about text):**
${html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 6000)}

INSTRUCTIONS:
1. Fill in the template with REAL data extracted from the WordPress HTML and metadata above
2. For brand colors, use the EXTRACTED colors from the brand guide to populate primary, secondary, text, cream, bg
3. For nav items, create entries from the main menu pages (use the URL path as href and derive a label from it)
4. For services, extract ALL services/features mentioned in the HTML — include every service the business offers with accurate titles and descriptions from the page content
5. For testimonials, extract REAL customer reviews/testimonials from the HTML. Look for review text, customer names, star ratings. If NO real testimonials exist in the HTML, set the array to empty [] and add a TODO comment — NEVER fabricate fake names or fake quotes
6. For the about section, extract REAL text from the HTML (look for "about us" sections, company descriptions, story paragraphs). NEVER fabricate about text
7. Set feature flags based on what sections actually exist on the WordPress homepage (hasGallery, hasMenu, hasTestimonials, etc.)
8. Use react-icons/io5 icon names for icon fields (IoConstruct, IoHome, IoBrush, etc.)
9. Set schemaType to the most appropriate schema.org LocalBusiness subtype
10. For maps, try to extract a Google Maps embed URL from the HTML (look for iframe src with google.com/maps) and construct a directions URL from the business address
11. For gallery, extract image descriptions/categories if the WordPress site has a gallery section
12. CRITICAL: The output MUST be a COMPLETE, valid TypeScript file. Do NOT truncate or cut off mid-object. Every opened { must have a closing }. The file must end with \`} as const;\` followed by \`export type SiteConfig = typeof siteConfig;\`

Return ONLY the TypeScript code for site.config.ts. No markdown fences, no explanation. Just the code starting with export const siteConfig.`;

    await logActivity(jobId, 'config_ai', 'Sending to AI for config generation...');

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
            content: 'You are an expert web developer generating a site configuration file for a Next.js website. Return ONLY valid TypeScript code. No markdown code fences. No explanation text. The output MUST be a COMPLETE file ending with `} as const;` followed by `export type SiteConfig = typeof siteConfig;`.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 8000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      throw new Error(`AI Gateway error (${aiResponse.status}): ${errorText}`);
    }

    const completion = await aiResponse.json();
    let configCode = completion.choices?.[0]?.message?.content || '';

    // Clean up: remove markdown fences if AI included them
    configCode = configCode.replace(/^```(?:typescript|ts)?\n?/gm, '').replace(/```\s*$/gm, '').trim();

    // Detect truncation — config must end with a valid closing (}; or } or the export type line)
    const trimmedEnd = configCode.trimEnd();
    const validEndings = ['};', '}', 'siteConfig;', 'siteConfig ;'];
    const looksComplete = validEndings.some(e => trimmedEnd.endsWith(e));
    if (!looksComplete) {
      await logActivity(jobId, 'config_truncated', `WARNING: Generated config appears truncated (${configCode.length} chars, ends with: "...${trimmedEnd.slice(-40)}"). Re-running with more tokens may help.`);
      throw new Error('Generated site config is truncated (AI ran out of tokens). The config file is incomplete and would cause runtime errors. Please try again.');
    }

    await logActivity(jobId, 'config_ai_done', `AI generated config (${configCode.length} chars)`);

    // Validate config has key properties by checking for common siteConfig fields
    const hasServices = configCode.includes('services');
    const hasBusiness = configCode.includes('business');
    if (!hasBusiness) {
      await logActivity(jobId, 'config_warning', 'WARNING: Config may be missing business property');
    }

    // Store in job metadata
    const metadata = (job.metadata as any) || {};
    metadata.generated_site_config = configCode;
    metadata.generated_site_config_at = new Date().toISOString();

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
          current_step: 'generate_config_complete',
          recent_activity: [
            ...(buildStatus.recent_activity || []),
            {
              timestamp: new Date().toISOString(),
              action: 'config_generated',
              message: `Site config generated (${configCode.length} chars)`,
            },
          ],
        },
      })
      .eq('id', jobId);

    return NextResponse.json({
      message: 'Site config generated',
      siteConfig: configCode,
    });
  } catch (error: any) {
    console.error('[wp-migration-v2-generate-config] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
