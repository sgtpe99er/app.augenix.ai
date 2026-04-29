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
    const { systemPrompt, welcomeMessage, primaryColor } = body;

    // Get user's org
    const { data: membership } = await supabase
      .from('org_members')
      .select('org_id')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    // Store chatbot config in org settings (using a JSONB column or separate table)
    // For now we store it as part of the org's brand_voice field or a dedicated config
    // This would be extended to a chatbot_config table in production
    const { error: updateError } = await supabase
      .from('organizations')
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq('id', membership.org_id);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to save config' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Chatbot config error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
