import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';
import { supabaseAdminClient } from '@/libs/supabase/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { entryType, entryValue, entryValueSecondary, userId: targetUserId } = body;

    if (!entryType || !entryValue) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const validTypes = ['phone', 'name_city', 'website', 'facebook', 'gbp'];
    if (!validTypes.includes(entryType)) {
      return NextResponse.json({ error: 'Invalid entry type' }, { status: 400 });
    }

    // If a targetUserId is provided (admin running for a customer), check if user is admin
    let effectiveUserId = user.id;
    if (targetUserId && targetUserId !== user.id) {
      const { data: isAdmin } = await supabase.rpc('is_admin', {
        user_uuid: user.id,
      } as any);

      if (!isAdmin) {
        return NextResponse.json({ error: 'Unauthorized to run discovery for another user' }, { status: 403 });
      }
      effectiveUserId = targetUserId;
    }

    // Create discovery session
    const { data: session, error: sessionError } = await supabaseAdminClient
      .from('onboarding_discovery_sessions')
      .insert({
        user_id: effectiveUserId,
        entry_type: entryType,
        entry_value: entryValue,
        entry_value_secondary: entryValueSecondary || null,
        status: 'running',
      })
      .select('id')
      .single();

    if (sessionError) {
      console.error('Failed to create discovery session:', sessionError);
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
    }

    // Start the discovery workflow (async - don't await)
    startDiscoveryWorkflow(session.id, effectiveUserId, entryType, entryValue, entryValueSecondary);

    return NextResponse.json({ sessionId: session.id });
  } catch (error) {
    console.error('Discovery API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function startDiscoveryWorkflow(
  sessionId: string,
  userId: string,
  entryType: string,
  entryValue: string,
  entryValueSecondary?: string
) {
  const { runDiscoveryWorkflow } = await import('@/features/onboarding/workflows/discover-business-new');
  
  // Run in background (don't await) so the API returns immediately
  runDiscoveryWorkflow({
    sessionId,
    userId,
    entryType: entryType as any,
    entryValue,
    entryValueSecondary,
  }).catch(async (error: Error) => {
    console.error('Workflow error:', error);
    
    // Update session status to failed
    const { supabaseAdminClient } = await import('@/libs/supabase/supabase-admin');
    await supabaseAdminClient
      .from('onboarding_discovery_sessions')
      .update({ status: 'failed' })
      .eq('id', sessionId);
  });
}
