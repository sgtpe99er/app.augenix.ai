import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdminClient } from '@/libs/supabase/supabase-admin';

/**
 * GET /t/[trackingId] - Redirect endpoint for tracked links
 * Records the click and redirects to the target URL
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ trackingId: string }> }
) {
  const { trackingId } = await params;

  const { data, error } = await supabaseAdminClient
    .from('link_tracking' as any)
    .select('target_url')
    .eq('tracking_id', trackingId)
    .single();

  if (error || !data) {
    // Fallback: redirect to homepage if tracking record not found
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Record the click (fire and forget)
  void supabaseAdminClient
    .from('link_tracking' as any)
    .update({
      clicked: true,
      clicked_at: new Date().toISOString(),
    })
    .eq('tracking_id', trackingId)
    .then(() => {}, (err) => console.error('[Tracking] Click update error:', err));

  return NextResponse.redirect((data as any).target_url);
}
