import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';
import { supabaseAdminClient } from '@/libs/supabase/supabase-admin';

async function assertAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: isAdmin } = await supabase.rpc('is_admin', {
    user_uuid: user.id,
  } as any);

  return isAdmin ? user : null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await assertAdmin();
  if (!user) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id: customerId } = await params;

  const { data, error } = await supabaseAdminClient
    .from('customer_input_folders' as any)
    .select('*')
    .eq('user_id', customerId)
    .order('name', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ folders: data ?? [] });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await assertAdmin();
  if (!user) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id: customerId } = await params;
  const body = await request.json();
  const name = (body?.name as string)?.trim();

  if (!name) {
    return NextResponse.json({ error: 'Missing folder name' }, { status: 400 });
  }

  const { data, error } = await supabaseAdminClient
    .from('customer_input_folders' as any)
    .insert({
      user_id: customerId,
      name,
      updated_at: new Date().toISOString(),
    } as any)
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, folder: data });
}
