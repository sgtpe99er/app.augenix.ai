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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; folderId: string }> }
) {
  const user = await assertAdmin();
  if (!user) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id: customerId, folderId } = await params;
  const body = await request.json();
  const name = (body?.name as string)?.trim();

  if (!name) {
    return NextResponse.json({ error: 'Missing folder name' }, { status: 400 });
  }

  const { data: folder, error: fetchError } = await supabaseAdminClient
    .from('customer_input_folders' as any)
    .select('id, user_id')
    .eq('id', folderId)
    .single();

  if (fetchError || !folder) {
    return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
  }

  if ((folder as any).user_id !== customerId) {
    return NextResponse.json({ error: 'Folder does not belong to customer' }, { status: 400 });
  }

  const { error: updateError } = await supabaseAdminClient
    .from('customer_input_folders' as any)
    .update({ name, updated_at: new Date().toISOString() } as any)
    .eq('id', folderId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; folderId: string }> }
) {
  const user = await assertAdmin();
  if (!user) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id: customerId, folderId } = await params;

  const { data: folder, error: fetchError } = await supabaseAdminClient
    .from('customer_input_folders' as any)
    .select('id, user_id')
    .eq('id', folderId)
    .single();

  if (fetchError || !folder) {
    return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
  }

  if ((folder as any).user_id !== customerId) {
    return NextResponse.json({ error: 'Folder does not belong to customer' }, { status: 400 });
  }

  // Unassign files from this folder (set folder_id to null) before deleting
  await supabaseAdminClient
    .from('customer_inputs' as any)
    .update({ folder_id: null, updated_at: new Date().toISOString() } as any)
    .eq('folder_id', folderId);

  const { error: deleteError } = await supabaseAdminClient
    .from('customer_input_folders' as any)
    .delete()
    .eq('id', folderId);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
