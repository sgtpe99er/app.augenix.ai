import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';
import { supabaseAdminClient } from '@/libs/supabase/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { jobId, pageUrl } = await request.json();

    if (!jobId || !pageUrl) {
      return NextResponse.json({ error: 'Job ID and page URL required' }, { status: 400 });
    }

    // Get job details
    const { data: job, error: jobError } = await supabaseAdminClient
      .from('migration_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Get page details
    const { data: page, error: pageError } = await supabaseAdminClient
      .from('migration_pages')
      .select('*')
      .eq('job_id', jobId)
      .eq('url', pageUrl)
      .single();

    if (pageError || !page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    if (!page.original_screenshot_url || !page.mobile_screenshot_url) {
      return NextResponse.json({ error: 'Screenshots not found. Please capture screenshots first.' }, { status: 400 });
    }

    // Get homepage for comparison
    const { data: homepage, error: homepageError } = await supabaseAdminClient
      .from('migration_pages')
      .select('original_html, original_screenshot_url, mobile_screenshot_url')
      .eq('job_id', jobId)
      .eq('url', job.target_url)
      .single();

    if (homepageError || !homepage) {
      return NextResponse.json({ error: 'Homepage not found' }, { status: 404 });
    }

    // Get existing components
    const existingComponents = (job.metadata as any)?.component_library?.components || [];

    // Use AI to analyze and build page
    const prompt = `
Analyze this menu page and determine how to build it using existing components or create new ones.

Existing Components:
${JSON.stringify(existingComponents, null, 2)}

Page URL: ${pageUrl}
Page Screenshots:
- Desktop: ${page.original_screenshot_url}
- Mobile: ${page.mobile_screenshot_url}

Homepage for reference:
- Desktop: ${homepage.original_screenshot_url}
- Mobile: ${homepage.mobile_screenshot_url}

Tasks:
1. Compare this page to the homepage
2. Identify which sections are the same (header, footer, etc.)
3. Identify new sections that need components
4. Map out the page structure
5. Identify any JavaScript-dependent elements

Return JSON:
{
  "sharedSections": [
    {
      "name": "Header",
      "component": "Header",
      "similarity": "identical" | "similar" | "different"
    }
  ],
  "newSections": [
    {
      "name": "AboutSection",
      "description": "About us section with team photos",
      "props": ["title", "teamMembers"],
      "componentType": "section"
    }
  ],
  "pageStructure": {
    "sections": [
      {
        "component": "Header",
        "props": {}
      },
      {
        "component": "Hero",
        "props": {
          "title": "About Us",
          "subtitle": "Our story"
        }
      }
    ]
  },
  "jsDependencies": [
    {
      "element": "Contact Form",
      "type": "form",
      "description": "Contact form with validation",
      "library": "react-hook-form"
    }
  ],
  "buildPlan": {
    "componentsNeeded": ["AboutSection"],
    "componentsReused": ["Header", "Footer"],
    "estimatedComplexity": "low" | "medium" | "high"
  }
}
`;

    const AI_GATEWAY_API_KEY = process.env.AI_GATEWAY_API_KEY;
    if (!AI_GATEWAY_API_KEY) {
      return NextResponse.json({ error: 'AI Gateway API key not configured' }, { status: 500 });
    }

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
            content: 'You are an expert React developer analyzing pages to determine component reuse and build strategy.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 2000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      throw new Error(`AI Gateway error (${aiResponse.status}): ${errorText}`);
    }

    const completion = await aiResponse.json();
    const analysisText = completion.choices?.[0]?.message?.content;
    let analysis;

    try {
      analysis = JSON.parse(analysisText || '{}');
    } catch (e) {
      const jsonMatch = analysisText?.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse analysis from AI response');
      }
    }

    // Update job status
    const buildStatus = (job.build_status as any) || {};
    const completedPages = buildStatus.pages_complete || [];
    
    // Save analysis to metadata
    const metadata = (job.metadata as any) || {};
    if (!metadata.page_analyses) metadata.page_analyses = {};
    metadata.page_analyses[pageUrl] = {
      ...analysis,
      analyzedAt: new Date().toISOString(),
    };

    // Update JavaScript inventory
    if (analysis.jsDependencies && analysis.jsDependencies.length > 0) {
      if (!metadata.js_inventory) metadata.js_inventory = [];
      for (const dep of analysis.jsDependencies) {
        if (!metadata.js_inventory.find((item: any) => item.element === dep.element)) {
          metadata.js_inventory.push({
            ...dep,
            page: pageUrl,
            discoveredAt: new Date().toISOString(),
          });
        }
      }
    }

    await supabaseAdminClient
      .from('migration_jobs')
      .update({
        metadata,
        build_status: {
          ...buildStatus,
          phase: 'menu_pages',
          current_step: 'analyzed',
          last_analyzed_page: pageUrl,
          recent_activity: [
            ...(buildStatus.recent_activity || []),
            {
              timestamp: new Date().toISOString(),
              action: 'page_analyzed',
              message: `Analyzed ${pageUrl}: ${analysis.buildPlan?.componentsNeeded?.length || 0} new components needed`,
            }
          ]
        }
      })
      .eq('id', jobId);

    return NextResponse.json({
      message: 'Page analysis completed',
      pageUrl,
      analysis,
      nextSteps: {
        componentsToCreate: analysis.buildPlan?.componentsNeeded || [],
        componentsToReuse: analysis.buildPlan?.componentsReused || [],
        complexity: analysis.buildPlan?.estimatedComplexity || 'medium',
      },
    });
  } catch (error: any) {
    console.error('[wp-migration-v2-menu-build] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
