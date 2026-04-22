import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { commitMultipleFiles } from '@/libs/github/client';
import { DESIGN_PAGES, DESIGN_LABELS } from '@/libs/website-variants/home-page-designs';

const ROOT_DOMAIN = process.env.ROOT_DOMAIN ?? 'freewebsite.deal';

async function requireAdmin(): Promise<{ userId: string } | NextResponse> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { get: (name: string) => cookieStore.get(name)?.value } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: isAdmin } = await supabase.rpc('is_admin', { user_uuid: user.id } );
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return { userId: user.id };
}

/**
 * POST /api/admin/backfill-design-pages
 *
 * Backfills design route pages (design-1, design-2, design-3) to GitHub for
 * existing deployed websites that were created before the multi-page approach.
 *
 * Optionally scoped to a single website:
 *   Body: { websiteId?: string }
 *
 * If websiteId is omitted, processes ALL deployed websites missing design variants.
 *
 * For each qualifying site:
 *   - Pushes src/app/design-1/page.tsx, design-2, design-3 to main in a single commit
 *   - Upserts design_variants rows with deterministic route URLs
 */
export async function POST(req: NextRequest) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const body = await req.json().catch(() => ({}));
  const { websiteId } = body as { websiteId?: string };

  // Fetch target websites
  let websitesQuery = supabaseAdmin
    .from('deployed_websites' as any)
    .select('id, github_repo_name, subdomain, business_id');

  if (websiteId) {
    websitesQuery = (websitesQuery as any).eq('id', websiteId);
  } else {
    // Only process sites that have a github repo
    websitesQuery = (websitesQuery as any).not('github_repo_name', 'is', null);
  }

  const { data: websites, error: websitesError } = await websitesQuery;
  if (websitesError) {
    return NextResponse.json({ error: websitesError.message }, { status: 500 });
  }

  const results: Array<{ websiteId: string; repoName: string; status: string; error?: string }> = [];

  for (const website of (websites ?? []) as unknown as Array<{
    id: string;
    github_repo_name: string;
    subdomain: string;
    business_id: string;
  }>) {
    const { id, github_repo_name: repoName, subdomain, business_id: businessId } = website;

    if (!repoName) {
      results.push({ websiteId: id, repoName: '', status: 'skipped: no repo' });
      continue;
    }

    try {
      // Check which variants already exist for this site
      const { data: existingVariants } = await supabaseAdmin
        .from('design_variants' as any)
        .select('variant_number')
        .eq('business_id', businessId) as { data: Array<{ variant_number: number }> | null };

      const existingNumbers = new Set((existingVariants ?? []).map((v) => v.variant_number));
      const missingNumbers = [1, 2, 3].filter((n) => !existingNumbers.has(n));

      // Push design pages to GitHub (always push all 3 in a single commit)
      const files = [
        { path: 'src/app/design-1/page.tsx', content: DESIGN_PAGES[1] },
        { path: 'src/app/design-2/page.tsx', content: DESIGN_PAGES[2] },
        { path: 'src/app/design-3/page.tsx', content: DESIGN_PAGES[3] },
      ];

      await commitMultipleFiles(
        repoName,
        files,
        'feat: backfill design variant pages (design-1, design-2, design-3)',
      );

      // Upsert design_variants records for any missing variants
      for (const variantNumber of missingNumbers) {
        const label = DESIGN_LABELS[variantNumber];
        const vercelDeploymentUrl = `https://${subdomain}/design-${variantNumber}`;
        await supabaseAdmin.from('design_variants' as any).insert({
          business_id: businessId,
          deployed_website_id: id,
          variant_number: variantNumber,
          label,
          github_branch: null,
          vercel_deployment_url: vercelDeploymentUrl,
          thumbnail_url: null,
          status: 'active',
        } as never);
      }

      // For existing variants that may be missing the route URL, update them
      const existingWithMissingUrl = (existingVariants ?? []).filter((v) => [1, 2, 3].includes(v.variant_number));
      for (const variant of existingWithMissingUrl) {
        await supabaseAdmin
          .from('design_variants' as any)
          .update({
            vercel_deployment_url: `https://${subdomain}/design-${variant.variant_number}`,
            updated_at: new Date().toISOString(),
          } as never)
          .eq('business_id', businessId)
          .eq('variant_number', variant.variant_number)
          .is('vercel_deployment_url', null);
      }

      results.push({
        websiteId: id,
        repoName,
        status: `ok: pushed pages, inserted ${missingNumbers.length} variant(s)`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[backfill-design-pages] failed for ${repoName}:`, message);
      results.push({ websiteId: id, repoName, status: 'error', error: message });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
