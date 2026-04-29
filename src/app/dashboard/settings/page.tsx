import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';

import { DashboardSettings } from './dashboard-settings';

export const metadata = {
  title: 'Settings | Augenix',
};

export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  let org: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    brand_colors: Record<string, string> | null;
    brand_voice: string | null;
    industry: string | null;
    plan: string | null;
  } | null = null;

  if (user) {
    const { data: membership } = await supabase
      .from('org_members')
      .select('org_id')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    if (membership?.org_id) {
      const { data } = await supabase
        .from('organizations')
        .select('id, name, slug, logo_url, brand_colors, brand_voice, industry, plan')
        .eq('id', membership.org_id)
        .single();

      if (data) {
        org = {
          ...data,
          brand_colors: data.brand_colors as Record<string, string> | null,
        };
      }
    }
  }

  return <DashboardSettings org={org} />;
}
