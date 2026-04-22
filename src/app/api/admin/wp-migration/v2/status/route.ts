import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';
import { supabaseAdminClient } from '@/libs/supabase/supabase-admin';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID required' }, { status: 400 });
    }

    // Get job details - lightweight query, no HTML content
    const { data: job, error: jobError } = await supabaseAdminClient
      .from('migration_jobs')
      .select('id, target_url, migration_version, total_pages, created_at, build_status, metadata, brand_guide_url, component_library_url, asset_manifest_url')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Separate lightweight query for page stats (no HTML content)
    const { data: pageStats } = await supabaseAdminClient
      .from('migration_pages')
      .select('id, url, status, original_screenshot_url, metadata')
      .eq('job_id', jobId);

    // Check hasHtml with a count query instead of fetching content
    const { count: htmlCount } = await supabaseAdminClient
      .from('migration_pages')
      .select('id', { count: 'exact', head: true })
      .eq('job_id', jobId)
      .not('original_html', 'is', null);

    // Determine current phase and next step
    const buildStatus = (job.build_status || {}) as Record<string, any>;
    const currentPhase = buildStatus.phase || 'discovery';
    const currentStep = buildStatus.current_step || null;
    
    // Check for existing resources
    const existingResources = {
      hasDiscovery: pageStats && pageStats.length > 0,
      hasScreenshots: pageStats?.some(p => p.original_screenshot_url) || false,
      hasHtml: (htmlCount || 0) > 0,
      hasAssets: (job.metadata as any)?.asset_manifest || false,
      hasBrandGuide: !!job.brand_guide_url,
      hasComponents: !!job.component_library_url || !!(job.metadata as any)?.component_library,
    };

    // Determine next step based on what exists
    let nextStep = null;
    let canProceed = true;

    if (!existingResources.hasDiscovery) {
      nextStep = {
        phase: 'discovery',
        step: 'start_discovery',
        description: 'Discover pages from WordPress site',
        endpoint: '/api/admin/wp-migration/v2/discovery/start',
        automation: 'scripted',
      };
    } else if (!existingResources.hasScreenshots || !existingResources.hasHtml) {
      nextStep = {
        phase: 'homepage',
        step: 'capture_homepage',
        description: 'Capture homepage screenshots and HTML',
        endpoint: '/api/admin/wp-migration/v2/homepage/capture',
        automation: 'scripted',
      };
    } else if (!existingResources.hasBrandGuide) {
      nextStep = {
        phase: 'homepage',
        step: 'extract_brand_guide',
        description: 'Extract brand guide from homepage',
        endpoint: '/api/admin/wp-migration/v2/homepage/extract-brand',
        automation: 'ai-assisted',
      };
    } else if (!existingResources.hasComponents) {
      nextStep = {
        phase: 'homepage',
        step: 'create_components',
        description: 'Create component scaffolding',
        endpoint: '/api/admin/wp-migration/v2/homepage/create-components',
        automation: 'ai-assisted',
      };
    } else if (!existingResources.hasAssets) {
      nextStep = {
        phase: 'assets',
        step: 'download_assets',
        description: 'Download and organize assets',
        endpoint: '/api/admin/wp-migration/v2/assets/download',
        automation: 'scripted',
      };
    } else {
      // Check for menu pages
      const menuPages = pageStats?.filter((p: any) => 
        p.metadata?.is_menu_page || p.status === 'done'
      ) || [];

      const builtPages = buildStatus.pages_complete || [];
      const unbuiltMenuPages = menuPages.filter(p => !builtPages.includes(p.url));

      if (unbuiltMenuPages.length > 0) {
        nextStep = {
          phase: 'menu_pages',
          step: 'build_menu_page',
          description: `Build next menu page: ${unbuiltMenuPages[0].url}`,
          endpoint: '/api/admin/wp-migration/v2/menu/build',
          automation: 'ai-assisted',
          pageUrl: unbuiltMenuPages[0].url,
        };
      } else {
        nextStep = {
          phase: 'complete',
          step: 'migration_complete',
          description: 'Migration complete!',
          endpoint: null,
          automation: null,
        };
      }
    }

    // Get recent activity
    const activity = buildStatus.recent_activity || [];

    return NextResponse.json({
      job: {
        id: job.id,
        migration_version: job.migration_version,
        created_at: job.created_at,
        total_pages: job.total_pages,
        build_status: buildStatus,
      },
      currentPhase,
      currentStep,
      nextStep,
      existingResources,
      activity,
      stats: {
        totalPages: pageStats?.length || 0,
        pagesWithScreenshots: pageStats?.filter((p: any) => p.original_screenshot_url).length || 0,
        pagesWithHtml: htmlCount || 0,
        completedPages: (buildStatus.pages_complete || []).length,
      },
    });
  } catch (error: any) {
    console.error('[wp-migration-v2-status] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
