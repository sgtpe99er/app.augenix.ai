import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';
import { supabaseAdminClient } from '@/libs/supabase/supabase-admin';
import { getSession } from '@/features/account/controllers/get-session';

async function checkAdmin() {
  const session = await getSession();
  if (!session) return null;
  const supabase = await createSupabaseServerClient();
  const { data: isAdmin } = await supabase.rpc('is_admin', { user_uuid: session.user.id } as any);
  return isAdmin ? session : null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await checkAdmin();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id: userId } = await params;
  const body = await request.json();
  const { custom_domain: rawDomain, approval_status, subdomain } = body;
  const custom_domain = rawDomain != null
    ? rawDomain.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '').trim() || null
    : undefined;

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (custom_domain !== undefined) update.custom_domain = custom_domain;
  if (approval_status !== undefined) update.approval_status = approval_status;
  if (subdomain !== undefined) update.subdomain = subdomain || null;

  // Upsert — create the row if it doesn't exist yet
  const { data: existing } = await supabaseAdminClient
    .from('deployed_websites' as any)
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabaseAdminClient
      .from('deployed_websites' as any)
      .update(update)
      .eq('user_id', userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await supabaseAdminClient
      .from('deployed_websites' as any)
      .insert({ user_id: userId, status: 'building', approval_status: 'pending', ...update });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
