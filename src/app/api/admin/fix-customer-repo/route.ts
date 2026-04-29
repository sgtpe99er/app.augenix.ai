import { NextRequest, NextResponse } from 'next/server';

import { getRepoFile, upsertRepoFile } from '@/libs/github/client';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';

async function assertAdmin(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: isAdmin } = await supabase.rpc('is_admin', { user_uuid: user.id });
  return isAdmin ? user : null;
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const user = await assertAdmin(supabase);
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { repo, file, find, replace, message } = await req.json();
  if (!repo || !file || !find || !replace) {
    return NextResponse.json({ error: 'repo, file, find, replace required' }, { status: 400 });
  }

  const { content, sha } = await getRepoFile(repo, file);
  if (content.includes(replace.slice(0, 20))) {
    return NextResponse.json({ message: 'Already applied — skipping' });
  }
  if (!content.includes(find)) {
    return NextResponse.json({ error: `find string not found in ${file}` }, { status: 400 });
  }

  const updated = content.replace(find, replace);
  await upsertRepoFile(repo, file, updated, message ?? 'fix: patch file', 'main', sha);

  return NextResponse.json({ success: true });
}
