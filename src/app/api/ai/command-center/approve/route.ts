import { NextRequest, NextResponse } from 'next/server';

import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { pageId, orgId, proposedContent } = body;

    if (!pageId || !proposedContent) {
      return NextResponse.json({ error: 'pageId and proposedContent are required' }, { status: 400 });
    }

    // Fetch current page to get the "before" snapshot
    const { data: page, error: pageError } = await supabase
      .from('pages')
      .select('id, content')
      .eq('id', pageId)
      .single();

    if (pageError || !page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    const contentBefore = page.content;
    const contentAfter = proposedContent.sections ?? proposedContent;

    // Update the page with new content
    const { error: updateError } = await supabase
      .from('pages')
      .update({
        content: contentAfter,
        updated_at: new Date().toISOString(),
      })
      .eq('id', pageId);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update page' }, { status: 500 });
    }

    // Log the edit
    await supabase.from('page_edits').insert({
      page_id: pageId,
      org_id: orgId,
      user_id: user.id,
      instruction: proposedContent.instruction ?? 'AI edit approved',
      content_before: contentBefore,
      content_after: contentAfter,
      status: 'approved',
    });

    // Trigger revalidation on the Sites project
    const revalidateUrl = process.env.SITES_REVALIDATE_URL;
    const revalidateSecret = process.env.SITES_REVALIDATE_SECRET;
    if (revalidateUrl && revalidateSecret) {
      fetch(revalidateUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-revalidate-secret': revalidateSecret,
        },
        body: JSON.stringify({ orgId, pageSlug: page.id }),
      }).catch(() => {
        // Non-blocking — don't fail the approval if revalidation fails
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Approve error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
