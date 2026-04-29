import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';

import { CrmDashboard } from './crm-dashboard';

export const metadata = {
  title: 'CRM | Augenix',
};

export default async function CrmPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  let contacts: Array<{
    id: string;
    name: string;
    email: string;
    phone: string | null;
    tags: string[];
    pipeline_stage: string;
    source: string;
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
      const { data } = await supabase
        .from('contacts')
        .select('id, name, email, phone, tags, pipeline_stage, source, created_at')
        .eq('org_id', membership.org_id)
        .order('created_at', { ascending: false })
        .limit(100);

      contacts = (data ?? []).map((c) => ({
        ...c,
        tags: c.tags ?? [],
        phone: c.phone ?? null,
        pipeline_stage: c.pipeline_stage ?? 'new',
        source: c.source ?? 'manual',
      }));
    }
  }

  return <CrmDashboard contacts={contacts} />;
}
