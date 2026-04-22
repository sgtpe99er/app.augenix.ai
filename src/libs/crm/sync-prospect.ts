import { supabaseAdminClient } from '@/libs/supabase/supabase-admin';

function generateProspectId(): string {
  const hex = Math.random().toString(16).slice(2, 10).toUpperCase();
  return `PRO-${hex}`;
}

/**
 * Sync a prospect user to the crm_prospects table.
 * If a record with matching business_name already exists, links fwd_user_id.
 * Otherwise creates a new researched-stage record.
 */
export async function syncProspectToCrm(userId: string, businessName: string): Promise<void> {
  try {
    const { data: existing } = await supabaseAdminClient
      .from('crm_prospects' as any)
      .select('id')
      .ilike('business_name', businessName)
      .maybeSingle();

    if (existing) {
      await supabaseAdminClient
        .from('crm_prospects' as any)
        .update({ fwd_user_id: userId })
        .eq('id', (existing as any).id);
    } else {
      await supabaseAdminClient
        .from('crm_prospects' as any)
        .insert({
          id: generateProspectId(),
          business_name: businessName,
          fwd_user_id: userId,
          prospect_stage: 'researched',
          website_status: 'none',
          qualifies: true,
        });
    }
  } catch (err) {
    console.error('Failed to sync prospect to CRM:', err);
  }
}
