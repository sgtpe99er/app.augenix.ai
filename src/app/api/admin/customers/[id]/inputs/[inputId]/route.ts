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
  { params }: { params: Promise<{ id: string; inputId: string }> }
) {
  const adminUser = await assertAdmin();
  if (!adminUser) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id: customerId, inputId } = await params;
  const body = await request.json();

  const { data: input, error: fetchError } = await supabaseAdminClient
    .from('customer_inputs' as any)
    .select('id, user_id')
    .eq('id', inputId)
    .single();

  if (fetchError || !input) {
    return NextResponse.json({ error: 'Input not found' }, { status: 404 });
  }

  if ((input as any).user_id !== customerId) {
    return NextResponse.json({ error: 'Input does not belong to customer' }, { status: 400 });
  }

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

  const { error: updateError } = await supabaseAdminClient
    .from('customer_inputs' as any)
    .update(updateData as any)
    .eq('id', inputId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; inputId: string }> }
) {
  const adminUser = await assertAdmin();
  if (!adminUser) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id: customerId, inputId } = await params;

  const { data: input, error: fetchError } = await supabaseAdminClient
    .from('customer_inputs' as any)
    .select('id, user_id, input_type, storage_path')
    .eq('id', inputId)
    .single();

  if (fetchError || !input) {
    return NextResponse.json({ error: 'Input not found' }, { status: 404 });
  }

  if ((input as any).user_id !== customerId) {
    return NextResponse.json({ error: 'Input does not belong to customer' }, { status: 400 });
  }

  const storagePath = (input as any).storage_path as string | null;

  const { error: deleteError } = await supabaseAdminClient
    .from('customer_inputs' as any)
    .delete()
    .eq('id', inputId);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  if (storagePath) {
    await supabaseAdminClient.storage
      .from('customer-assets')
      .remove([storagePath]);
  }

  return NextResponse.json({ success: true });
}
