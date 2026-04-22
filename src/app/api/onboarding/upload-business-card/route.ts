import { NextRequest } from 'next/server';
import { getSession } from '@/features/account/controllers/get-session';
import { supabaseAdminClient } from '@/libs/supabase/supabase-admin';

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/heic'];

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const side = formData.get('side') as string | null; // 'front' or 'back'

  if (!file) return Response.json({ error: 'No file provided' }, { status: 400 });
  if (!['front', 'back'].includes(side ?? '')) {
    return Response.json({ error: 'side must be "front" or "back"' }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return Response.json({ error: 'Invalid file type. Use PNG, JPG, WebP, or HEIC.' }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return Response.json({ error: 'File too large. Max 10MB.' }, { status: 400 });
  }

  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `business-cards/${session.user.id}/${side}.${ext}`;

  const { error } = await supabaseAdminClient.storage
    .from('brand-assets')
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) {
    console.error('[upload-business-card]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }

  const { data: urlData } = supabaseAdminClient.storage
    .from('brand-assets')
    .getPublicUrl(path);

  return Response.json({ url: urlData.publicUrl });
}
