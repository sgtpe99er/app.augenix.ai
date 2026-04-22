import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';

async function fetchAllWpItems(baseUrl: string, endpoint: 'pages' | 'posts', authHeader: string) {
  const firstUrl = `${baseUrl}/wp-json/wp/v2/${endpoint}?per_page=100&page=1`;
  const firstResponse = await fetch(firstUrl, {
    headers: { Authorization: authHeader, Accept: 'application/json' },
  });

  if (!firstResponse.ok) {
    const errText = await firstResponse.text();
    throw new Error(`Failed to fetch WP ${endpoint}: ${firstResponse.status} ${errText.substring(0, 100)}`);
  }

  const totalPages = Number(firstResponse.headers.get('x-wp-totalpages') || '1');
  const firstData = await firstResponse.json();
  const allItems = Array.isArray(firstData) ? [...firstData] : [];

  for (let page = 2; page <= totalPages; page += 1) {
    const url = `${baseUrl}/wp-json/wp/v2/${endpoint}?per_page=100&page=${page}`;
    const response = await fetch(url, {
      headers: { Authorization: authHeader, Accept: 'application/json' },
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Failed to fetch WP ${endpoint} page ${page}: ${response.status} ${errText.substring(0, 100)}`);
    }

    const pageData = await response.json();
    if (Array.isArray(pageData)) {
      allItems.push(...pageData);
    }
  }

  return allItems;
}

async function fetchCustomPostTypeEndpoints(baseUrl: string, authHeader: string) {
  const response = await fetch(`${baseUrl}/wp-json/wp/v2/types`, {
    headers: { Authorization: authHeader, Accept: 'application/json' },
  });

  if (!response.ok) return [] as string[];

  const data = await response.json();
  const entries = Object.values(data || {}) as Array<Record<string, any>>;

  return entries
    .map((item) => item?.rest_base as string | undefined)
    .filter((restBase): restBase is string => Boolean(restBase))
    .filter((restBase) => restBase !== 'posts' && restBase !== 'pages' && restBase !== 'media');
}

async function fetchAllWpItemsByEndpoint(baseUrl: string, endpoint: string, authHeader: string) {
  const firstUrl = `${baseUrl}/wp-json/wp/v2/${endpoint}?per_page=100&page=1`;
  const firstResponse = await fetch(firstUrl, {
    headers: { Authorization: authHeader, Accept: 'application/json' },
  });

  if (!firstResponse.ok) return [];

  const totalPages = Number(firstResponse.headers.get('x-wp-totalpages') || '1');
  const firstData = await firstResponse.json();
  const allItems = Array.isArray(firstData) ? [...firstData] : [];

  for (let page = 2; page <= totalPages; page += 1) {
    const url = `${baseUrl}/wp-json/wp/v2/${endpoint}?per_page=100&page=${page}`;
    const response = await fetch(url, {
      headers: { Authorization: authHeader, Accept: 'application/json' },
    });
    if (!response.ok) break;
    const pageData = await response.json();
    if (Array.isArray(pageData)) allItems.push(...pageData);
  }

  return allItems;
}

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: isAdmin } = await supabase.rpc('is_admin', {
      user_uuid: user.id,
    } as any);

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse request body
    const body = await req.json();
    const { targetUrl, username, password, customerId } = body;

    if (!targetUrl || !username || !password || !customerId) {
      return NextResponse.json(
        { error: 'Missing required fields: targetUrl, username, password, customerId' },
        { status: 400 }
      );
    }

    // Format URL to ensure no trailing slash
    const baseUrl = targetUrl.replace(/\/$/, '');
    const credentials = Buffer.from(`${username}:${password}`).toString('base64');
    const authHeader = `Basic ${credentials}`;
    
    // 1. Fetch all pages and posts (with pagination)
    const [pagesData, postsData] = await Promise.all([
      fetchAllWpItems(baseUrl, 'pages', authHeader),
      fetchAllWpItems(baseUrl, 'posts', authHeader),
    ]);

    // 2. Fetch custom post types (if any)
    const cptEndpoints = await fetchCustomPostTypeEndpoints(baseUrl, authHeader);
    const cptCollections = await Promise.all(
      cptEndpoints.map((endpoint) => fetchAllWpItemsByEndpoint(baseUrl, endpoint, authHeader))
    );
    const cptItems = cptCollections.flat();

    const allItems = [...pagesData, ...postsData, ...cptItems].filter(
      (item: any) => item.link && item.status === 'publish'
    );
    const totalPages = allItems.length;

    if (totalPages === 0) {
      return NextResponse.json(
        { error: 'No published pages or posts found on this WordPress site.' },
        { status: 400 }
      );
    }

    // 3. Create Migration Job
    const jobData = {
      customer_id: customerId,
      target_url: baseUrl,
      wp_admin_username: username,
      wp_application_password: password, // Note: Should be encrypted in a real production environment
      status: 'in_progress' as const,
      total_pages: totalPages,
      completed_pages: 0
    };

    const { data: job, error: jobError } = await (supabase as any)
      .from('migration_jobs')
      .insert(jobData)
      .select()
      .single();

    if (jobError) {
      console.error('Error creating migration job:', jobError);
      return NextResponse.json(
        { error: `Failed to create migration job: ${jobError.message}` },
        { status: 500 }
      );
    }

    // 4. Create Migration Pages with render priority
    // Priority: 1 = homepage, 2 = top-level pages (likely menu items), 3 = blog posts, 4 = other
    const pagesToInsert = allItems.map((item: any) => {
      const url = item.link as string;
      const pathname = new URL(url).pathname;
      const isHomepage = pathname === '/' || pathname === '';
      const isBlogPost = item.type === 'post';
      const isTopLevelPage = item.type === 'page' && pathname.split('/').filter(Boolean).length <= 1;
      
      let render_priority = 4; // Default: other
      if (isHomepage) {
        render_priority = 1;
      } else if (isTopLevelPage) {
        render_priority = 2; // Top-level pages (likely menu items)
      } else if (isBlogPost) {
        render_priority = 3; // Blog posts
      }

      return {
        job_id: job.id,
        url: item.link,
        status: 'pending',
        render_priority,
        metadata: {
          wp_id: item.id,
          wp_type: item.type,
          wp_title: item.title?.rendered,
          wp_slug: item.slug
        }
      };
    });

    const { error: pagesError } = await (supabase as any)
      .from('migration_pages')
      .insert(pagesToInsert);

    if (pagesError) {
      console.error('Error creating migration pages:', pagesError);
      // We don't fail completely here, but we should probably clean up or flag it
      await (supabase as any).from('migration_jobs').update({ status: 'failed', error_log: 'Failed to insert pages' }).eq('id', job.id);
      return NextResponse.json(
        { error: `Failed to queue migration pages: ${pagesError.message}` },
        { status: 500 }
      );
    }

    // Success - In a full implementation, this is where we would trigger 
    // the background worker (e.g., via Inngest or Trigger.dev) to start processing
    
    return NextResponse.json({ 
      success: true, 
      message: `Migration job started successfully. Queued ${totalPages} pages for processing.`,
      jobId: job.id,
      totalPages
    });

  } catch (error: any) {
    console.error('WP Migration Start Error:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred starting the migration' },
      { status: 500 }
    );
  }
}
