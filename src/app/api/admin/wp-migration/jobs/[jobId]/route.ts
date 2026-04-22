import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';

interface RouteContext {
  params: Promise<{ jobId: string }>;
}

export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: isAdmin } = await supabase.rpc('is_admin', {
      user_uuid: user.id,
    } as any);

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { jobId } = await params;

    const { data: job, error: jobError } = await (supabase as any)
      .from('migration_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Migration job not found' }, { status: 404 });
    }

    // Fetch all pages for this job (ordered by status priority then URL)
    const { data: pages, error: pagesError } = await (supabase as any)
      .from('migration_pages')
      .select('id, url, status, metadata, retry_count, error_log, original_screenshot_url, page_label, created_at, updated_at')
      .eq('job_id', jobId)
      .order('status', { ascending: true })
      .order('url', { ascending: true });

    if (pagesError) {
      return NextResponse.json({ error: pagesError.message }, { status: 500 });
    }

    // Compute status counts from the page data
    const totals = {
      pending: 0,
      rendering: 0,
      rewriting: 0,
      done: 0,
      failed: 0,
    };

    for (const row of pages ?? []) {
      const key = row.status as keyof typeof totals;
      if (key in totals) totals[key] += 1;
    }

    return NextResponse.json({
      job,
      pages: pages ?? [],
      pageStatusCounts: totals,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch migration job status' },
      { status: 500 }
    );
  }
}
