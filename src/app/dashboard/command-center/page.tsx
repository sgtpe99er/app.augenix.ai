import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';

import { CommandCenter } from './command-center';

export const metadata = {
  title: 'AI Command Center | Augenix',
};

export default async function CommandCenterPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  let pages: Array<{ id: string; slug: string; title: string }> = [];
  let orgId: string | null = null;
  let editHistory: Array<{ id: string; instruction: string; status: string; created_at: string; page_id: string }> = [];

  if (user) {
    const { data: membership } = await supabase
      .from('org_members')
      .select('org_id')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    orgId = membership?.org_id ?? null;

    if (orgId) {
      const [pagesRes, editsRes] = await Promise.all([
        supabase
          .from('pages')
          .select('id, slug, title')
          .eq('org_id', orgId)
          .order('slug'),
        supabase
          .from('page_edits')
          .select('id, instruction, status, created_at, page_id')
          .eq('org_id', orgId)
          .order('created_at', { ascending: false })
          .limit(20),
      ]);

      pages = pagesRes.data ?? [];
      editHistory = editsRes.data ?? [];
    }
  }

  return <CommandCenter pages={pages} orgId={orgId} editHistory={editHistory} />;
}
