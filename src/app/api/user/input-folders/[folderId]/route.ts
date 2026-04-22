import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/features/account/controllers/get-session';
import { supabaseAdminClient } from '@/libs/supabase/supabase-admin';

async function getUser() {
  const session = await getSession();
  return session?.user ?? null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ folderId: string }> }
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { folderId } = await params;
  const body = await request.json();
  const name = (body?.name as string)?.trim();
  if (!name) return NextResponse.json({ error: 'Missing folder name' }, { status: 400 });

  const { data: folder, error: fetchError } = await supabaseAdminClient
    .from('customer_input_folders' as any)
    .select('id, user_id')
    .eq('id', folderId)
    .single();

  if (fetchError || !folder) return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
  if ((folder as any).user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { error } = await supabaseAdminClient
    .from('customer_input_folders' as any)
    .update({ name, updated_at: new Date().toISOString() } as any)
    .eq('id', folderId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ folderId: string }> }
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { folderId } = await params;

  const { data: folder, error: fetchError } = await supabaseAdminClient
    .from('customer_input_folders' as any)
    .select('id, user_id')
    .eq('id', folderId)
    .single();

  if (fetchError || !folder) return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
  if ((folder as any).user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await supabaseAdminClient
    .from('customer_inputs' as any)
    .update({ folder_id: null, updated_at: new Date().toISOString() } as any)
    .eq('folder_id', folderId);

  const { error } = await supabaseAdminClient.from('customer_input_folders' as any).delete().eq('id', folderId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
