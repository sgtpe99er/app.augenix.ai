import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/features/account/controllers/get-session';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const category = formData.get('category') as string | null;

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  // Validate file type
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { error: 'Invalid file type. Allowed: images, PDF, Word documents' },
      { status: 400 }
    );
  }

  // Validate file size (10MB max)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return NextResponse.json(
      { error: 'File too large. Maximum size is 10MB' },
      { status: 400 }
    );
  }

  const supabase = await createSupabaseServerClient();
  const userId = session.user.id;

  // Generate unique filename
  const ext = file.name.split('.').pop() || 'bin';
  const filename = `${uuidv4()}.${ext}`;
  const storagePath = `onboarding/${userId}/${category || 'other'}/${filename}`;

  // Upload to Supabase Storage
  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from('customer-inputs')
    .upload(storagePath, arrayBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error('[upload-content] Storage upload error:', uploadError);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('customer-inputs')
    .getPublicUrl(storagePath);

  const fileId = uuidv4();

  return NextResponse.json({
    id: fileId,
    url: urlData.publicUrl,
    filename: file.name,
    storagePath,
    mimeType: file.type,
    category: category || 'other',
  });
}
