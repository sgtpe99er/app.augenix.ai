import { NextRequest } from 'next/server';
import { getSession } from '@/features/account/controllers/get-session';
import { supabaseAdminClient } from '@/libs/supabase/supabase-admin';

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file') as File | null;

  if (!file) return Response.json({ error: 'No file provided' }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type)) {
    return Response.json({ error: 'Invalid file type. Use PNG, JPG, SVG, or WebP.' }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return Response.json({ error: 'File too large. Max 5MB.' }, { status: 400 });
  }

  const ext = file.name.split('.').pop() ?? 'png';
  const path = `logos/${session.user.id}/logo.${ext}`;

  const { error } = await supabaseAdminClient.storage
    .from('brand-assets')
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) {
    console.error('[upload-logo]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }

  const { data: urlData } = supabaseAdminClient.storage
    .from('brand-assets')
    .getPublicUrl(path);

  return Response.json({ url: urlData.publicUrl });
}
