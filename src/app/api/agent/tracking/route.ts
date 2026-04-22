import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdminClient } from '@/libs/supabase/supabase-admin';
import crypto from 'crypto';

function verifyAgentApiKey(request: NextRequest): boolean {
  const key = process.env.FREEWEBSITE_AGENT_API_KEY;
  if (!key) return false;
  const auth = request.headers.get('authorization');
  return auth === `Bearer ${key}`;
}

/**
 * POST /api/agent/tracking - Create a tracked URL
 * Body: { userId, targetUrl }
 * Returns: { trackingId, trackedUrl }
 */
export async function POST(request: NextRequest) {
  if (!verifyAgentApiKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { userId, targetUrl } = body;

  if (!userId || !targetUrl) {
    return NextResponse.json({ error: 'userId and targetUrl are required' }, { status: 400 });
  }

  const trackingId = crypto.randomBytes(12).toString('hex');
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://freewebsite.deal';

  // Store tracking record
  const { error } = await supabaseAdminClient.from('link_tracking' as any).insert({
    tracking_id: trackingId,
    user_id: userId,
    target_url: targetUrl,
    clicked: false,
  });

  if (error) {
    // Table might not exist yet — return the data anyway but note it
    console.error('[Tracking] Insert error:', error);
    return NextResponse.json({
      trackingId,
      trackedUrl: `${siteUrl}/t/${trackingId}`,
      warning: 'Tracking record could not be stored — link_tracking table may need migration',
    });
  }

  return NextResponse.json({
    trackingId,
    trackedUrl: `${siteUrl}/t/${trackingId}`,
  });
}

/**
 * GET /api/agent/tracking?trackingId=xxx - Check if a link was clicked
 */
export async function GET(request: NextRequest) {
  if (!verifyAgentApiKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const trackingId = new URL(request.url).searchParams.get('trackingId');
  if (!trackingId) {
    return NextResponse.json({ error: 'trackingId query param is required' }, { status: 400 });
  }

  const { data, error } = await supabaseAdminClient
    .from('link_tracking' as any)
    .select('clicked, clicked_at, user_id')
    .eq('tracking_id', trackingId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Tracking record not found' }, { status: 404 });
  }

  return NextResponse.json({
    trackingId,
    clicked: (data as any).clicked,
    clickedAt: (data as any).clicked_at,
    userId: (data as any).user_id,
  });
}
