import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';

import { DashboardOverview } from './dashboard-overview';

export const metadata = {
  title: 'Dashboard | Augenix',
};

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  let orgName = 'Your Business';
  let stats = { pages: 0, contacts: 0, edits: 0, automations: 0 };
  let recentEdits: Array<{ id: string; instruction: string; status: string; created_at: string; page_title?: string }> = [];

  if (user) {
    const { data: membership } = await supabase
      .from('org_members')
      .select('org_id, organizations(id, name)')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    const orgId = membership?.org_id;

    if (orgId) {
      const orgs = membership?.organizations as unknown as { name: string } | { name: string }[] | null;
      const orgObj = Array.isArray(orgs) ? orgs[0] : orgs;
      orgName = orgObj?.name ?? orgName;

      const [pagesRes, contactsRes, editsRes, automationsRes, recentEditsRes] = await Promise.all([
        supabase.from('pages').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
        supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
        supabase.from('page_edits').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
        supabase.from('automations').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
        supabase
          .from('page_edits')
          .select('id, instruction, status, created_at, pages(title)')
          .eq('org_id', orgId)
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      stats = {
        pages: pagesRes.count ?? 0,
        contacts: contactsRes.count ?? 0,
        edits: editsRes.count ?? 0,
        automations: automationsRes.count ?? 0,
      };

      recentEdits = (recentEditsRes.data ?? []).map((e) => ({
        id: e.id,
        instruction: e.instruction,
        status: e.status,
        created_at: e.created_at,
        page_title: ((p) => { const obj = Array.isArray(p) ? p[0] : p; return (obj as { title: string } | null)?.title; })(e.pages as unknown) ?? undefined,
      }));
    }
  }

  return <DashboardOverview orgName={orgName} stats={stats} recentEdits={recentEdits} />;
}
