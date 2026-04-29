import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';

import { requireAdmin } from '../require-admin';
import { AnalyticsTab } from '../tabs/analytics-tab';

export default async function AdminAnalyticsPage() {
  await requireAdmin();

  const supabase = await createSupabaseServerClient();
  const { data: stats } = await supabase.rpc('get_admin_stats');

  if (!stats) {
    throw new Error('Failed to fetch admin stats');
  }

  return <AnalyticsTab stats={{ ...(stats as any), totalUsers: 0, totalProspects: 0 }} />;
}
