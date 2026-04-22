import { supabaseAdminClient } from '@/libs/supabase/supabase-admin';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';
import { requireAdmin } from './require-admin';
import { OverviewTab } from './tabs/overview-tab';

export default async function AdminPage() {
  await requireAdmin();

  const supabase = await createSupabaseServerClient();

  const [{ data: stats }, { data: authData }] = await Promise.all([
    supabase.rpc('get_admin_stats'),
    supabaseAdminClient.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  if (!stats) {
    throw new Error('Failed to fetch admin stats');
  }

  const allUsers = (authData as any)?.users ?? [];
  const totalProspects = allUsers.filter((u: any) =>
    (u.email ?? '').toLowerCase().endsWith('@prospect.freewebsite.deal')
  ).length;
  const totalUsers = allUsers.length - totalProspects;

  return (
    <OverviewTab
      stats={{ ...(stats as any), totalUsers, totalProspects }}
    />
  );
}
