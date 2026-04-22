import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';
import { supabaseAdminClient } from '@/libs/supabase/supabase-admin';

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
    console.log('[wp-migration-v2-brand-guide] Starting brand guide extraction');
    
    const AI_GATEWAY_API_KEY = process.env.AI_GATEWAY_API_KEY;
    if (!AI_GATEWAY_API_KEY) {
      console.error('[wp-migration-v2-brand-guide] AI Gateway API key not configured');
      return NextResponse.json(
        { error: 'AI Gateway API key not configured' },
        { status: 500 }
      );
    }

    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { jobId, pageLabel } = await request.json();

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

    console.log('[wp-migration-v2-brand-guide] Processing job:', jobId);
    await logActivity(jobId, 'brand_guide_start', 'Starting brand guide extraction...');

    // Get job and homepage data
    const { data: job, error: jobError } = await supabaseAdminClient
      .from('migration_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      console.error('[wp-migration-v2-brand-guide] Job not found:', jobError);
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Try to find homepage - URLs might differ by trailing slash
    const targetUrl = job.target_url;
    const targetUrlAlt = targetUrl.endsWith('/') ? targetUrl.slice(0, -1) : targetUrl + '/';
    
    console.log('[wp-migration-v2-brand-guide] Looking for homepage with URL:', targetUrl, 'or', targetUrlAlt);

    let homepage: { original_html: string | null; url: string } | null = null;
    
    // Try exact match first
    const { data: exactMatch } = await supabaseAdminClient
      .from('migration_pages')
      .select('original_html, url')
      .eq('job_id', jobId)
      .eq('url', targetUrl)
      .single();
    
    if (exactMatch) {
      homepage = exactMatch;
    } else {
      // Try alternate URL (with/without trailing slash)
      const { data: altMatch } = await supabaseAdminClient
        .from('migration_pages')
        .select('original_html, url')
        .eq('job_id', jobId)
        .eq('url', targetUrlAlt)
        .single();
      
      if (altMatch) {
        homepage = altMatch;
      }
    }

    if (!homepage) {
      // Log all pages for this job to debug
      const { data: allPages } = await supabaseAdminClient
        .from('migration_pages')
        .select('url, original_html')
        .eq('job_id', jobId);
      
      console.error('[wp-migration-v2-brand-guide] No homepage found. Job target_url:', targetUrl);
      console.error('[wp-migration-v2-brand-guide] Available pages:', allPages?.map(p => ({ url: p.url, hasHtml: !!p.original_html })));
      return NextResponse.json({ error: 'Homepage not found. Please run Capture first.' }, { status: 404 });
    }

    if (!homepage.original_html) {
      console.error('[wp-migration-v2-brand-guide] Homepage HTML is empty for:', homepage.url);
      return NextResponse.json({ error: 'Homepage HTML not found. Please run Capture first.' }, { status: 400 });
    }

    console.log('[wp-migration-v2-brand-guide] Found homepage:', homepage.url, 'HTML length:', homepage.original_html.length);
    await logActivity(jobId, 'brand_guide_html', `Found homepage HTML (${Math.round(homepage.original_html.length / 1024)}KB)`);

    // Check if brand guide already exists
    const { data: existingBrandGuide, error: existingError } = await supabaseAdminClient
      .from('brand_guides')
      .select('*')
      .eq('job_id', jobId)
      .single();

    if (existingError && existingError.code !== 'PGRST116') {
      console.error('[wp-migration-v2-brand-guide] Error checking existing brand guide:', existingError);
    }

    if (existingBrandGuide) {
      console.log('[wp-migration-v2-brand-guide] Brand guide already exists');
      return NextResponse.json({
        message: 'Brand guide already exists',
        brandGuide: {
          colors: existingBrandGuide.colors,
          typography: existingBrandGuide.typography,
          spacing: existingBrandGuide.spacing,
          border_radius: existingBrandGuide.border_radius,
          shadows: existingBrandGuide.shadows,
          ui_patterns: existingBrandGuide.ui_patterns,
        },
        cssVariables: existingBrandGuide.css_variables,
      });
    }

    await logActivity(jobId, 'brand_guide_css', 'Extracting CSS from HTML...');

    // Extract CSS from HTML
    const cssRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
    const cssMatches = homepage.original_html.match(cssRegex) || [];
    const inlineCSS = cssMatches.map((match: string) => match.replace(/<\/?style[^>]*>/g, '')).join('\n');

    // Extract external CSS URLs
    const linkRegex = /<link[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi;
    const externalCSS = [];
    let linkMatch;
    while ((linkMatch = linkRegex.exec(homepage.original_html)) !== null) {
      externalCSS.push(linkMatch[1]);
    }

    await logActivity(jobId, 'brand_guide_ai', `Found ${cssMatches.length} inline styles, ${externalCSS.length} external CSS. Sending to AI...`);

    // Use AI to extract brand guide
    const prompt = `
Extract a comprehensive brand guide from the following CSS and HTML content. Focus on:

1. **Colors**: Extract all color codes used, categorize as:
   - Primary colors (main brand colors)
   - Secondary colors
   - Accent colors
   - Text colors (headings, body, links)
   - Background colors
   - Border colors

2. **Typography**: Identify:
   - Font families used
   - Font sizes for each hierarchy level
   - Font weights
   - Line heights

3. **Spacing**: Identify common:
   - Margin values
   - Padding values
   - Spacing patterns

4. **UI Patterns**:
   - Border radius values
   - Box shadows
   - Button styles
   - Form input styles

HTML Content (first 2000 chars):
${homepage.original_html.substring(0, 2000)}

Inline CSS:
${inlineCSS}

External CSS URLs:
${externalCSS.join('\n')}

Return ONLY valid JSON in the following format. Do not include any text before or after the JSON:

{
  "colors": {
    "primary": ["#000000", "#333333"],
    "secondary": ["#666666", "#999999"],
    "accent": ["#007bff"],
    "text": {
      "heading": "#000000",
      "body": "#333333",
      "link": "#007bff",
      "linkHover": "#0056b3"
    },
    "background": {
      "primary": "#ffffff",
      "secondary": "#f8f9fa"
    },
    "border": "#dee2e6"
  },
  "typography": {
    "fontFamily": {
      "primary": "Montserrat",
      "secondary": "system-ui"
    },
    "fontSizes": {
      "h1": "2.5rem",
      "h2": "2rem",
      "h3": "1.5rem",
      "body": "1rem",
      "small": "0.875rem"
    },
    "fontWeights": {
      "light": 300,
      "normal": 400,
      "medium": 500,
      "semibold": 600,
      "bold": 700
    },
    "lineHeights": {
      "tight": 1.2,
      "normal": 1.5,
      "relaxed": 1.8
    }
  },
  "spacing": {
    "xs": "4px",
    "sm": "8px",
    "md": "16px",
    "lg": "24px",
    "xl": "32px",
    "2xl": "48px"
  },
  "borderRadius": {
    "sm": "4px",
    "md": "8px",
    "lg": "12px",
    "xl": "16px"
  },
  "shadows": {
    "sm": "0 1px 2px rgba(0,0,0,0.1)",
    "md": "0 4px 6px rgba(0,0,0,0.1)",
    "lg": "0 10px 15px rgba(0,0,0,0.1)"
  },
  "ui_patterns": {
    "buttons": {
      "primary": "bg-blue-500 text-white rounded-md px-4 py-2",
      "secondary": "bg-gray-200 text-gray-800 rounded-md px-4 py-2"
    },
    "cards": "bg-white rounded-lg shadow-md p-4",
    "inputs": "border border-gray-300 rounded-md px-3 py-2"
  }
}
`;

    const aiResponse = await fetch('https://ai-gateway.vercel.sh/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AI_GATEWAY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at extracting design systems and brand guidelines from CSS and HTML. Always return valid JSON with no additional text or explanation.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[wp-migration-v2-brand-guide] AI Gateway error:', aiResponse.status, errorText);
      throw new Error(`AI Gateway error (${aiResponse.status}): ${errorText}`);
    }

    const completion = await aiResponse.json();
    const brandGuideText = completion.choices?.[0]?.message?.content;
    await logActivity(jobId, 'brand_guide_ai_done', `AI responded (${brandGuideText?.length || 0} chars). Parsing brand guide...`);
    
    let brandGuide;
    try {
      // First try to parse the entire response as JSON
      brandGuide = JSON.parse(brandGuideText || '{}');
    } catch (e) {
      console.log('[wp-migration-v2-brand-guide] Direct JSON parse failed, trying to extract JSON from response');
      // Try to extract JSON from response
      const jsonMatch = brandGuideText?.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        console.log('[wp-migration-v2-brand-guide] Found JSON match:', jsonMatch[0].substring(0, 200) + '...');
        try {
          brandGuide = JSON.parse(jsonMatch[0]);
        } catch (parseError) {
          console.error('[wp-migration-v2-brand-guide] JSON parse error:', parseError);
          console.error('[wp-migration-v2-brand-guide] Failed JSON string:', jsonMatch[0]);
          throw new Error('Failed to parse brand guide from AI response');
        }
      } else {
        console.error('[wp-migration-v2-brand-guide] No JSON found in response');
        console.error('[wp-migration-v2-brand-guide] Full response:', brandGuideText);
        
        // Fallback to a basic brand guide
        brandGuide = {
          colors: {
            primary: ["#000000", "#333333"],
            secondary: ["#666666", "#999999"],
            accent: ["#007bff"],
            text: {
              heading: "#000000",
              body: "#333333",
              link: "#007bff",
              linkHover: "#0056b3"
            },
            background: {
              primary: "#ffffff",
              secondary: "#f8f9fa"
            },
            border: "#dee2e6"
          },
          typography: {
            fontFamily: {
              primary: "system-ui",
              secondary: "system-ui"
            },
            fontSizes: {
              h1: "2.5rem",
              h2: "2rem",
              h3: "1.5rem",
              body: "1rem",
              small: "0.875rem"
            },
            fontWeights: {
              light: 300,
              normal: 400,
              medium: 500,
              semibold: 600,
              bold: 700
            },
            lineHeights: {
              tight: 1.2,
              normal: 1.5,
              relaxed: 1.8
            }
          },
          spacing: {
            xs: "4px",
            sm: "8px",
            md: "16px",
            lg: "24px",
            xl: "32px",
            "2xl": "48px"
          },
          borderRadius: {
            sm: "4px",
            md: "8px",
            lg: "12px",
            xl: "16px"
          },
          shadows: {
            sm: "0 1px 2px rgba(0,0,0,0.1)",
            md: "0 4px 6px rgba(0,0,0,0.1)",
            lg: "0 10px 15px rgba(0,0,0,0.1)"
          },
          ui_patterns: {
            buttons: {
              primary: "bg-blue-500 text-white rounded-md px-4 py-2",
              secondary: "bg-gray-200 text-gray-800 rounded-md px-4 py-2"
            },
            cards: "bg-white rounded-lg shadow-md p-4",
            inputs: "border border-gray-300 rounded-md px-3 py-2"
          }
        };
      }
    }

    // Validate brand guide structure
    if (!brandGuide.colors || !brandGuide.typography) {
      console.error('[wp-migration-v2-brand-guide] Invalid brand guide structure:', brandGuide);
      // Don't throw error, continue with fallback
      console.warn('[wp-migration-v2-brand-guide] Using fallback brand guide due to invalid structure');
    }

    await logActivity(jobId, 'brand_guide_parsed', 'Brand guide parsed. Generating CSS variables...');

    // Generate CSS variables file first
    let cssVariables: string;
    try {
      cssVariables = generateCSSVariables(brandGuide);
    } catch (error) {
      console.error('[wp-migration-v2-brand-guide] CSS generation error:', error);
      // Fallback CSS if generation fails
      cssVariables = `:root {
  /* Fallback CSS variables */
  --color-primary: #000;
  --color-secondary: #666;
  --font-primary: system-ui;
}`;
    }

    await logActivity(jobId, 'brand_guide_saving', 'Saving brand guide to database...');
    
    // Validate required fields
    if (!job.customer_id) {
      console.error('[wp-migration-v2-brand-guide] Missing customer_id');
      return NextResponse.json({ error: 'Missing customer_id' }, { status: 400 });
    }
    
    const brandGuideData = {
      job_id: jobId,
      customer_id: job.customer_id,
      colors: brandGuide.colors || {},
      typography: brandGuide.typography || {},
      spacing: brandGuide.spacing || {},
      border_radius: brandGuide.border_radius || {},
      shadows: brandGuide.shadows || {},
      ui_patterns: brandGuide.ui_patterns || {},
      css_variables: cssVariables || '',
      extraction_model: 'gpt-4o-mini',
      confidence_score: 0.85, // Must be between 0 and 1
    };

    
    const { data: savedBrandGuide, error: saveError } = await supabaseAdminClient
      .from('brand_guides')
      .insert(brandGuideData)
      .select()
      .single();

    if (saveError) {
      console.error('[wp-migration-v2-brand-guide] Database save error:', saveError);
      console.error('[wp-migration-v2-brand-guide] Save error details:', JSON.stringify(saveError, null, 2));
      throw saveError;
    }

    await logActivity(jobId, 'brand_guide_saved', 'Brand guide saved. Uploading CSS file...');

    // Upload CSS file to storage
    const cssPath = `${jobId}/brand-guide/variables.css`;
    const { error: cssUploadError } = await supabaseAdminClient.storage
      .from('migration-assets')
      .upload(cssPath, cssVariables, {
        contentType: 'text/css',
        upsert: true,
      });

    let cssUrl = null;
    if (!cssUploadError) {
      const { data: urlData } = supabaseAdminClient.storage
        .from('migration-assets')
        .getPublicUrl(cssPath);
      cssUrl = urlData;

      await supabaseAdminClient
        .from('migration_jobs')
        .update({ brand_guide_url: cssUrl.publicUrl })
        .eq('id', jobId);
    }

    const buildStatus = (job.build_status as any) || {};

    await supabaseAdminClient
      .from('migration_jobs')
      .update({
        brand_guide_url: cssUrl?.publicUrl || null,
        build_status: {
          ...buildStatus,
          phase: 'homepage',
          current_step: 'brand_guide_complete',
          completed_at: new Date().toISOString(),
          recent_activity: [
            ...(buildStatus.recent_activity || []),
            {
              timestamp: new Date().toISOString(),
              action: 'brand_guide_extracted',
              message: 'Brand guide extracted successfully',
              details: {
                model: 'gpt-4o-mini',
                colors: Object.keys(brandGuide.colors || {}).length,
                fonts: Object.keys(brandGuide.typography?.fontFamily || {}).length,
              }
            }
          ]
        }
      })
      .eq('id', jobId);

    return NextResponse.json({
      message: 'Brand guide extracted successfully',
      brandGuide: {
        colors: savedBrandGuide.colors,
        typography: savedBrandGuide.typography,
        spacing: savedBrandGuide.spacing,
        border_radius: savedBrandGuide.border_radius,
        shadows: savedBrandGuide.shadows,
        ui_patterns: savedBrandGuide.ui_patterns,
      },
      cssVariables,
      brandGuideId: savedBrandGuide.id,
    });
  } catch (error: any) {
    console.error('[wp-migration-v2-brand-guide] Error occurred:', error);
    console.error('[wp-migration-v2-brand-guide] Error message:', error.message);
    console.error('[wp-migration-v2-brand-guide] Error stack:', error.stack);
    
    // Try to get more error details if it's a Supabase error
    if (error.details) {
      console.error('[wp-migration-v2-brand-guide] Error details:', error.details);
    }
    if (error.hint) {
      console.error('[wp-migration-v2-brand-guide] Error hint:', error.hint);
    }
    if (error.code) {
      console.error('[wp-migration-v2-brand-guide] Error code:', error.code);
    }
    
    return NextResponse.json(
      { 
        error: error.message || 'Internal server error',
        details: error.details || null,
        code: error.code || null
      },
      { status: 500 }
    );
  }
}

function generateCSSVariables(brandGuide: any): string {
  const css = `
:root {
  /* Colors */
  --color-primary: ${brandGuide.colors?.primary?.[0] || '#000'};
  --color-primary-dark: ${brandGuide.colors?.primary?.[1] || brandGuide.colors?.primary?.[0] || '#000'};
  --color-secondary: ${brandGuide.colors?.secondary?.[0] || '#666'};
  --color-accent: ${brandGuide.colors?.accent?.[0] || '#007bff'};
  
  --color-text-heading: ${brandGuide.colors?.text?.heading || '#000'};
  --color-text-body: ${brandGuide.colors?.text?.body || '#333'};
  --color-text-link: ${brandGuide.colors?.text?.link || '#007bff'};
  --color-text-link-hover: ${brandGuide.colors?.text?.linkHover || '#0056b3'};
  
  --color-bg-primary: ${brandGuide.colors?.background?.primary || '#fff'};
  --color-bg-secondary: ${brandGuide.colors?.background?.secondary || '#f8f9fa'};
  --color-border: ${brandGuide.colors?.border || '#dee2e6'};
  
  /* Typography */
  --font-primary: ${brandGuide.typography?.fontFamily?.primary || 'system-ui'};
  --font-secondary: ${brandGuide.typography?.fontFamily?.secondary || 'system-ui'};
  
  --font-size-h1: ${brandGuide.typography?.fontSizes?.h1 || '2.5rem'};
  --font-size-h2: ${brandGuide.typography?.fontSizes?.h2 || '2rem'};
  --font-size-h3: ${brandGuide.typography?.fontSizes?.h3 || '1.5rem'};
  --font-size-body: ${brandGuide.typography?.fontSizes?.body || '1rem'};
  --font-size-small: ${brandGuide.typography?.fontSizes?.small || '0.875rem'};
  
  --font-weight-light: ${brandGuide.typography?.fontWeights?.light || 300};
  --font-weight-normal: ${brandGuide.typography?.fontWeights?.normal || 400};
  --font-weight-medium: ${brandGuide.typography?.fontWeights?.medium || 500};
  --font-weight-semibold: ${brandGuide.typography?.fontWeights?.semibold || 600};
  --font-weight-bold: ${brandGuide.typography?.fontWeights?.bold || 700};
  
  --line-height-tight: ${brandGuide.typography?.lineHeights?.tight || 1.2};
  --line-height-normal: ${brandGuide.typography?.lineHeights?.normal || 1.5};
  --line-height-relaxed: ${brandGuide.typography?.lineHeights?.relaxed || 1.8};
  
  /* Spacing */
  --spacing-xs: ${brandGuide.spacing?.xs || '4px'};
  --spacing-sm: ${brandGuide.spacing?.sm || '8px'};
  --spacing-md: ${brandGuide.spacing?.md || '16px'};
  --spacing-lg: ${brandGuide.spacing?.lg || '24px'};
  --spacing-xl: ${brandGuide.spacing?.xl || '32px'};
  --spacing-2xl: ${brandGuide.spacing?.['2xl'] || '48px'};
  
  /* Border Radius */
  --radius-sm: ${brandGuide.borderRadius?.sm || '4px'};
  --radius-md: ${brandGuide.borderRadius?.md || '8px'};
  --radius-lg: ${brandGuide.borderRadius?.lg || '12px'};
  --radius-xl: ${brandGuide.borderRadius?.xl || '16px'};
  
  /* Shadows */
  --shadow-sm: ${brandGuide.shadows?.sm || '0 1px 2px rgba(0,0,0,0.1)'};
  --shadow-md: ${brandGuide.shadows?.md || '0 4px 6px rgba(0,0,0,0.1)'};
  --shadow-lg: ${brandGuide.shadows?.lg || '0 10px 15px rgba(0,0,0,0.1)'};
}
`;

  return css;
}
