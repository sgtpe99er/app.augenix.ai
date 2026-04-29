import { NextRequest, NextResponse } from 'next/server';

import { supabaseAdminClient } from '@/libs/supabase/supabase-admin';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';

async function assertAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null };

  const { data: isAdmin } = await supabase.rpc('is_admin', {
    user_uuid: user.id,
  } as any);

  if (!isAdmin) return { supabase, user: null };
  return { supabase, user };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user } = await assertAdmin();
  if (!user) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id: customerId } = await params;

  const { data, error } = await supabaseAdminClient
    .from('customer_inputs' as any)
    .select('*')
    .eq('user_id', customerId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ inputs: data ?? [] });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user } = await assertAdmin();
  if (!user) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id: customerId } = await params;

  const contentType = request.headers.get('content-type') || '';

  // URL input (JSON)
  if (contentType.includes('application/json')) {
    const body = await request.json();
    const source_url = body?.source_url as string | undefined;
    const notes = (body?.notes as string | undefined) ?? '';
    const title = (body?.title as string | undefined) ?? null;

    if (!source_url) {
      return NextResponse.json({ error: 'Missing source_url' }, { status: 400 });
    }

    const { data, error } = await supabaseAdminClient
      .from('customer_inputs' as any)
      .insert({
        user_id: customerId,
        input_type: 'url',
        title,
        notes,
        source_url,
        updated_at: new Date().toISOString(),
      } as any)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, input: data });
  }

  // File input (multipart/form-data)
  const formData = await request.formData();
  const file = formData.get('file') as File;
  const notes = (formData.get('notes') as string | null) ?? '';
  const title = (formData.get('title') as string | null) ?? null;
  const rawTags = (formData.get('tags') as string | null) ?? '[]';
  const folderId = (formData.get('folderId') as string | null) || null;

  let tags: string[] = [];
  try {
    const parsed = JSON.parse(rawTags);
    if (Array.isArray(parsed)) {
      tags = parsed
        .map((tag) => (typeof tag === 'string' ? tag.trim() : ''))
        .filter(Boolean);
    }
  } catch {
    tags = [];
  }

  if (!file) {
    return NextResponse.json({ error: 'Missing file' }, { status: 400 });
  }

  const fileExt = file.name.split('.').pop() || 'bin';
  const safeExt = fileExt.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10) || 'bin';
  const storagePath = `${customerId}/${Date.now()}-${crypto.randomUUID()}.${safeExt}`;

  const { error: uploadError } = await supabaseAdminClient.storage
    .from('customer-assets')
    .upload(storagePath, file, { upsert: true });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: publicUrlData } = supabaseAdminClient.storage
    .from('customer-assets')
    .getPublicUrl(storagePath);

  const storageUrl = publicUrlData.publicUrl;

  const { data, error } = await supabaseAdminClient
    .from('customer_inputs' as any)
    .insert({
      user_id: customerId,
      input_type: 'file',
      title,
      notes,
      metadata: { tags },
      storage_path: storagePath,
      storage_url: storageUrl,
      file_name: file.name,
      mime_type: file.type || null,
      folder_id: folderId,
      updated_at: new Date().toISOString(),
    } as any)
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, input: data });
}
