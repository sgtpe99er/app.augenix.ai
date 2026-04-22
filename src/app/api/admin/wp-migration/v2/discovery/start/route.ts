import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';
import { supabaseAdminClient } from '@/libs/supabase/supabase-admin';

async function autoLabelPages(
  jobId: string,
  targetUrl: string,
  wpUsername: string | null,
  wpPassword: string | null,
) {
  try {
    // 1. Label the homepage
    const normalizedUrl = targetUrl.replace(/\/$/, '');
    const { data: allPages } = await supabaseAdminClient
      .from('migration_pages')
      .select('id, url')
      .eq('job_id', jobId);

    if (!allPages || allPages.length === 0) return;

    // Find homepage (exact match or with trailing slash)
    const homePage = allPages.find(p => {
      const pageUrl = p.url.replace(/\/$/, '');
      return pageUrl === normalizedUrl;
    });

    if (homePage) {
      await supabaseAdminClient
        .from('migration_pages')
        .update({ page_label: 'home', render_priority: 0 } as any)
        .eq('id', homePage.id);
    }

    // 2. Try to get WP navigation menus to label main menu pages
    if (wpUsername && wpPassword) {
      const authHeader = `Basic ${Buffer.from(`${wpUsername}:${wpPassword}`).toString('base64')}`;
      const baseUrl = normalizedUrl;

      // Try menus/v1 endpoint first (common plugin), then nav_menu_item
      let menuUrls: string[] = [];

      // Try WP REST API menus endpoint
      try {
        const menusRes = await fetch(`${baseUrl}/wp-json/wp/v2/menu-items?menus=primary&per_page=100`, {
          headers: { Authorization: authHeader, Accept: 'application/json' },
          signal: AbortSignal.timeout(10000),
        });
        if (menusRes.ok) {
          const items: any[] = await menusRes.json();
          menuUrls = items.map(i => i.url).filter(Boolean);
        }
      } catch {}

      // Fallback: try /wp-json/menus/v1/menus to list menus, then get first one
      if (menuUrls.length === 0) {
        try {
          const menusListRes = await fetch(`${baseUrl}/wp-json/menus/v1/menus`, {
            headers: { Authorization: authHeader, Accept: 'application/json' },
            signal: AbortSignal.timeout(10000),
          });
          if (menusListRes.ok) {
            const menus: any[] = await menusListRes.json();
            if (menus.length > 0) {
              const primaryMenu = menus.find(m => /primary|main|header/i.test(m.slug || m.name || '')) || menus[0];
              const menuDetailRes = await fetch(`${baseUrl}/wp-json/menus/v1/menus/${primaryMenu.term_id || primaryMenu.id}`, {
                headers: { Authorization: authHeader, Accept: 'application/json' },
                signal: AbortSignal.timeout(10000),
              });
              if (menuDetailRes.ok) {
                const menuDetail = await menuDetailRes.json();
                const items = menuDetail.items || [];
                menuUrls = items.map((i: any) => i.url).filter(Boolean);
              }
            }
          }
        } catch {}
      }

      // Match menu URLs to discovered pages
      if (menuUrls.length > 0) {
        const menuPageIds: string[] = [];
        for (const menuUrl of menuUrls) {
          const normalizedMenuUrl = menuUrl.replace(/\/$/, '');
          const match = allPages.find(p => {
            const pageUrl = p.url.replace(/\/$/, '');
            return pageUrl === normalizedMenuUrl || pageUrl === normalizedMenuUrl.replace(normalizedUrl, '');
          });
          if (match && match.id !== homePage?.id) {
            menuPageIds.push(match.id);
          }
        }

        if (menuPageIds.length > 0) {
          await supabaseAdminClient
            .from('migration_pages')
            .update({ page_label: 'main_menu', render_priority: 1 } as any)
            .in('id', menuPageIds);
        }
      }
    }
  } catch (e) {
    console.error('[autoLabelPages] Error:', e);
    // Non-fatal — user can manually label pages
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { jobId } = await request.json();

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID required' }, { status: 400 });
    }

    // Check if job exists
    const { data: job, error: jobError } = await supabaseAdminClient
      .from('migration_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Check if discovery already done
    const { data: existingPages, error: pagesError } = await supabaseAdminClient
      .from('migration_pages')
      .select('id')
      .eq('job_id', jobId)
      .limit(1);

    if (pagesError) {
      return NextResponse.json({ error: pagesError.message }, { status: 500 });
    }

    if (existingPages && existingPages.length > 0) {
      // Discovery already done, return existing pages
      const { data: pages } = await supabaseAdminClient
        .from('migration_pages')
        .select('*')
        .eq('job_id', jobId)
        .order('render_priority', { ascending: true });

      // Update job to v2 if not already
      await supabaseAdminClient
        .from('migration_jobs')
        .update({ 
          migration_version: 'v2',
          build_status: {
            phase: 'discovery',
            current_step: 'complete',
            completed_at: new Date().toISOString(),
            pages_discovered: pages?.length || 0,
          }
        })
        .eq('id', jobId);

      return NextResponse.json({
        message: 'Discovery already completed',
        pages,
        total: pages?.length || 0,
      });
    }

    // Run discovery using existing logic
    const discoveryResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/admin/wp-migration/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        customerId: job.customer_id,
        targetUrl: job.target_url,
        username: job.wp_admin_username,
        password: job.wp_application_password,
        jobId: jobId,
      }),
    });

    if (!discoveryResponse.ok) {
      const error = await discoveryResponse.text();
      return NextResponse.json({ error: 'Discovery failed: ' + error }, { status: 500 });
    }

    const discoveryResult = await discoveryResponse.json();

    // Auto-label pages: homepage = 'home', nav menu pages = 'main_menu'
    await autoLabelPages(jobId, job.target_url, job.wp_admin_username, job.wp_application_password);

    // Update job status
    const buildStatus = (job.build_status as any) || {};
    await supabaseAdminClient
      .from('migration_jobs')
      .update({
        migration_version: 'v2',
        build_status: {
          ...buildStatus,
          phase: 'discovery',
          current_step: 'complete',
          completed_at: new Date().toISOString(),
          recent_activity: [
            ...(buildStatus.recent_activity || []),
            {
              timestamp: new Date().toISOString(),
              action: 'discovery_completed',
              message: `Discovered ${discoveryResult.totalPages} pages`,
              details: {
                totalPages: discoveryResult.totalPages,
                pages: discoveryResult.pages,
                posts: discoveryResult.posts,
                customTypes: discoveryResult.customTypes?.length || 0,
              }
            }
          ]
        }
      })
      .eq('id', jobId);

    return NextResponse.json({
      message: 'Discovery completed',
      pages: discoveryResult.pages,
      total: discoveryResult.totalPages,
    });
  } catch (error: any) {
    console.error('[wp-migration-v2-discovery] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
