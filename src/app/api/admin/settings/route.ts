import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/features/account/controllers/get-session';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';
import { supabaseAdminClient } from '@/libs/supabase/supabase-admin';

async function assertAdmin() {
  const session = await getSession();
  if (!session) return null;
  const supabase = await createSupabaseServerClient();
  const { data: isAdmin } = await supabase.rpc('is_admin', { user_uuid: session.user.id } as any);
  return isAdmin ? session : null;
}

export async function GET() {
  const session = await assertAdmin();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data, error } = await supabaseAdminClient
    .from('app_settings' as any)
    .select('pricing, email_templates')
    .eq('id', 'singleton')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PUT(req: NextRequest) {
  const session = await assertAdmin();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { pricing, email_templates } = body;

  const { error } = await supabaseAdminClient
    .from('app_settings' as any)
    .upsert({
      id: 'singleton',
      ...(pricing !== undefined && { pricing }),
      ...(email_templates !== undefined && { email_templates }),
      updated_at: new Date().toISOString(),
    });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
