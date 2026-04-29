import { NextRequest, NextResponse } from 'next/server';

import { supabaseAdminClient } from '@/libs/supabase/supabase-admin';
import { getBranchDeployment } from '@/libs/vercel/client';

function verifyAgentApiKey(request: NextRequest): boolean {
  const key = process.env.FREEWEBSITE_AGENT_API_KEY;
  if (!key) return false;
  const auth = request.headers.get('authorization');
  return auth === `Bearer ${key}`;
}

/**
 * POST /api/agent/websites/sync-variants
 *
 * Polls Vercel for preview deployment URLs for all design variants that
 * don't have a URL yet. Call this a minute or two after generate completes,
 * once Vercel has had time to queue branch deployments.
 *
 * Body: { userId } or { deployedWebsiteId }
 *
 * Returns: { synced: number, variants: Array<{ variantNumber, branch, url, status }> }
 */
export async function POST(request: NextRequest) {
  if (!verifyAgentApiKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { userId, deployedWebsiteId } = body;
  if (!userId && !deployedWebsiteId) {
    return NextResponse.json({ error: 'userId or deployedWebsiteId is required' }, { status: 400 });
  }

  const db = supabaseAdminClient;

  // Resolve deployed website
  let website: { id: string; vercel_project_id: string | null } | null = null;
  if (deployedWebsiteId) {
    const { data } = await db
      .from('deployed_websites' as any)
      .select('id, vercel_project_id')
      .eq('id', deployedWebsiteId)
      .single();
    website = data as { id: string; vercel_project_id: string | null } | null;
  } else {
    const { data } = await db
      .from('deployed_websites' as any)
      .select('id, vercel_project_id')
      .eq('user_id', userId)
      .single();
    website = data as { id: string; vercel_project_id: string | null } | null;
  }

  if (!website) {
    return NextResponse.json({ error: 'Deployed website not found' }, { status: 404 });
  }

  if (!website.vercel_project_id) {
    return NextResponse.json({ error: 'Website has no Vercel project ID yet' }, { status: 400 });
  }

  // Fetch variants missing a deployment URL
  const { data: variants, error: variantsError } = await db
    .from('design_variants' as any)
    .select('id, variant_number, github_branch, vercel_deployment_url, status')
    .eq('deployed_website_id', website.id)
    .order('variant_number', { ascending: true });

  if (variantsError) {
    return NextResponse.json({ error: variantsError.message }, { status: 500 });
  }

  if (!variants || variants.length === 0) {
    return NextResponse.json({ synced: 0, variants: [], message: 'No variants found' });
  }

  const results: Array<{ variantNumber: number; branch: string; url: string | null; status: string }> = [];
  let synced = 0;

  for (const variant of variants as Array<any>) {
    if (variant.vercel_deployment_url) {
      // Already has a URL — include in results but don't update
      results.push({
        variantNumber: variant.variant_number,
        branch: variant.github_branch,
        url: variant.vercel_deployment_url,
        status: variant.status,
      });
      continue;
    }

    try {
      const deployment = await getBranchDeployment(website.vercel_project_id!, variant.github_branch);

      if (deployment?.url) {
        const deploymentUrl = `https://${deployment.url}`;
        const newStatus = deployment.state === 'READY' ? 'active' : 'draft';

        await db
          .from('design_variants' as any)
          .update({
            vercel_deployment_url: deploymentUrl,
            status: newStatus,
            updated_at: new Date().toISOString(),
          } as never)
          .eq('id', variant.id);

        results.push({
          variantNumber: variant.variant_number,
          branch: variant.github_branch,
          url: deploymentUrl,
          status: newStatus,
        });
        synced++;
      } else {
        // Deployment not queued yet — leave as-is
        results.push({
          variantNumber: variant.variant_number,
          branch: variant.github_branch,
          url: null,
          status: variant.status,
        });
      }
    } catch (err) {
      console.error(`[sync-variants] Failed to fetch deployment for branch ${variant.github_branch}:`, err);
      results.push({
        variantNumber: variant.variant_number,
        branch: variant.github_branch,
        url: null,
        status: variant.status,
      });
    }
  }

  return NextResponse.json({ synced, variants: results });
}
