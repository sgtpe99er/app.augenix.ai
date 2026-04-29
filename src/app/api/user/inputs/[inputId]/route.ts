import { NextRequest, NextResponse } from 'next/server';

import { getSession } from '@/features/account/controllers/get-session';
import { supabaseAdminClient } from '@/libs/supabase/supabase-admin';

async function getUser() {
  const session = await getSession();
  return session?.user ?? null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ inputId: string }> }
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { inputId } = await params;
  const body = await request.json();

  const { data: input, error: fetchError } = await supabaseAdminClient
    .from('customer_inputs' as any)
    .select('id, user_id')
    .eq('id', inputId)
    .single();

  if (fetchError || !input) return NextResponse.json({ error: 'Input not found' }, { status: 404 });
  if ((input as any).user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.notes !== undefined) updateData.notes = body.notes;
  if (body.title !== undefined) updateData.title = body.title;
  if (body.folderId !== undefined) updateData.folder_id = body.folderId || null;
  if (body.tags !== undefined) {
    const tags = Array.isArray(body.tags)
      ? body.tags.map((t: unknown) => (typeof t === 'string' ? t.trim() : '')).filter(Boolean)
      : [];
    updateData.metadata = { tags };
  }

  const { error } = await supabaseAdminClient.from('customer_inputs' as any).update(updateData as any).eq('id', inputId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ inputId: string }> }
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { inputId } = await params;

  const { data: input, error: fetchError } = await supabaseAdminClient
    .from('customer_inputs' as any)
    .select('id, user_id, storage_path')
    .eq('id', inputId)
    .single();

  if (fetchError || !input) return NextResponse.json({ error: 'Input not found' }, { status: 404 });
  if ((input as any).user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { error } = await supabaseAdminClient.from('customer_inputs' as any).delete().eq('id', inputId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const storagePath = (input as any).storage_path as string | null;
  if (storagePath) await supabaseAdminClient.storage.from('customer-assets').remove([storagePath]);

  return NextResponse.json({ success: true });
}
