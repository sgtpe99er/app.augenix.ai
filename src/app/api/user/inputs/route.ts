import { NextRequest, NextResponse } from 'next/server';

import { getSession } from '@/features/account/controllers/get-session';
import { supabaseAdminClient } from '@/libs/supabase/supabase-admin';

async function getUser() {
  const session = await getSession();
  return session?.user ?? null;
}

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabaseAdminClient
    .from('customer_inputs' as any)
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ inputs: data ?? [] });
}

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    const body = await request.json();
    const source_url = body?.source_url as string | undefined;
    const notes = (body?.notes as string | undefined) ?? '';
    const title = (body?.title as string | undefined) ?? null;

    if (!source_url) return NextResponse.json({ error: 'Missing source_url' }, { status: 400 });

    const { data, error } = await supabaseAdminClient
      .from('customer_inputs' as any)
      .insert({ user_id: user.id, input_type: 'url', title, notes, source_url, updated_at: new Date().toISOString() } as any)
      .select('*')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, input: data });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File;
  const notes = (formData.get('notes') as string | null) ?? '';
  const title = (formData.get('title') as string | null) ?? null;
  const rawTags = (formData.get('tags') as string | null) ?? '[]';
  const folderId = (formData.get('folderId') as string | null) || null;

  let tags: string[] = [];
  try {
    const parsed = JSON.parse(rawTags);
    if (Array.isArray(parsed)) tags = parsed.map((t) => (typeof t === 'string' ? t.trim() : '')).filter(Boolean);
  } catch { tags = []; }

  if (!file) return NextResponse.json({ error: 'Missing file' }, { status: 400 });

  const fileExt = file.name.split('.').pop() || 'bin';
  const safeExt = fileExt.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10) || 'bin';
  const storagePath = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${safeExt}`;

  const { error: uploadError } = await supabaseAdminClient.storage
    .from('customer-assets')
    .upload(storagePath, file, { upsert: true });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: publicUrlData } = supabaseAdminClient.storage.from('customer-assets').getPublicUrl(storagePath);

  const { data, error } = await supabaseAdminClient
    .from('customer_inputs' as any)
    .insert({
      user_id: user.id, input_type: 'file', title, notes,
      metadata: { tags }, storage_path: storagePath,
      storage_url: publicUrlData.publicUrl, file_name: file.name,
      mime_type: file.type || null, folder_id: folderId,
      updated_at: new Date().toISOString(),
    } as any)
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, input: data });
}
