import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';

import { AutomationsDashboard } from './automations-dashboard';

export const metadata = {
  title: 'Automations | Augenix',
};

export default async function AutomationsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  let automations: Array<{
    id: string;
    name: string;
    description: string | null;
    status: string;
    created_at: string;
  }> = [];

  let approvals: Array<{
    id: string;
    description: string;
    status: string;
    proposed_action: Record<string, unknown> | null;
    created_at: string;
  }> = [];

  if (user) {
    const { data: membership } = await supabase
      .from('org_members')
      .select('org_id')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    if (membership?.org_id) {
      const [autoRes, approvalRes] = await Promise.all([
        supabase
          .from('automations')
          .select('id, name, description, status, created_at')
          .eq('org_id', membership.org_id)
          .order('created_at', { ascending: false }),
        supabase
          .from('approvals')
          .select('id, description, status, proposed_action, created_at')
          .eq('org_id', membership.org_id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(20),
      ]);

      automations = autoRes.data ?? [];
      approvals = (approvalRes.data ?? []).map((a) => ({
        ...a,
        proposed_action: a.proposed_action as Record<string, unknown> | null,
      }));
    }
  }

  return <AutomationsDashboard automations={automations} approvals={approvals} />;
}
