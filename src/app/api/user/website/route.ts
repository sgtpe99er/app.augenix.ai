import { NextRequest, NextResponse } from 'next/server';

import { getSession } from '@/features/account/controllers/get-session';
import { supabaseAdminClient } from '@/libs/supabase/supabase-admin';

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { custom_domain: rawDomain } = await request.json();
  const custom_domain = rawDomain
    ? rawDomain.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '').trim()
    : null;

  const { data: existing } = await supabaseAdminClient
    .from('deployed_websites' as any)
    .select('id')
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: 'No website record found' }, { status: 404 });
  }

  const { error } = await supabaseAdminClient
    .from('deployed_websites' as any)
    .update({
      custom_domain: custom_domain?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', session.user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
