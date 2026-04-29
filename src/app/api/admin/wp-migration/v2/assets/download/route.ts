import { NextRequest, NextResponse } from 'next/server';

import { supabaseAdminClient } from '@/libs/supabase/supabase-admin';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';

const ASSET_BUCKET = 'migration-assets';

async function logActivity(jobId: string, action: string, message: string) {
  try {
    const { data: job } = await supabaseAdminClient
      .from('migration_jobs')
      .select('build_status')
      .eq('id', jobId)
      .single();
    const buildStatus = ((job?.build_status as any) || {});
    const activity = buildStatus.recent_activity || [];
    activity.push({ timestamp: new Date().toISOString(), action, message });
    await supabaseAdminClient
      .from('migration_jobs')
      .update({ build_status: { ...buildStatus, recent_activity: activity } })
      .eq('id', jobId);
  } catch (e) {
    console.error('[logActivity] Failed:', e);
  }
}

function resolveUrl(src: string, baseUrl: string): string | null {
  if (!src || src.startsWith('data:')) return null;
  try {
    if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('//')) {
      return src.startsWith('//') ? `https:${src}` : src;
    }
    const base = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
    return new URL(src, base).href;
  } catch {
    return null;
  }
}

function getStoragePath(jobId: string, assetType: string, originalUrl: string): string {
  try {
    const url = new URL(originalUrl);
    // Use the pathname to create a stable, deterministic path (no timestamps)
    const cleanPath = url.pathname.replace(/^\/+/, '').replace(/[^a-zA-Z0-9.\-_\/]/g, '_');
    return `${jobId}/assets/${assetType}/${cleanPath}`;
  } catch {
    const hash = originalUrl.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0);
    return `${jobId}/assets/${assetType}/${Math.abs(hash)}`;
  }
}

function guessContentType(url: string, fallbackType: string): string {
  const lower = url.toLowerCase();
  if (lower.includes('.png')) return 'image/png';
  if (lower.includes('.gif')) return 'image/gif';
  if (lower.includes('.svg')) return 'image/svg+xml';
  if (lower.includes('.webp')) return 'image/webp';
  if (lower.includes('.jpg') || lower.includes('.jpeg')) return 'image/jpeg';
  if (lower.includes('.ico')) return 'image/x-icon';
  if (lower.includes('.css')) return 'text/css';
  if (lower.includes('.js')) return 'application/javascript';
  if (fallbackType === 'image') return 'image/jpeg';
  if (fallbackType === 'css') return 'text/css';
  return 'application/octet-stream';
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { jobId, pageLabel } = await request.json();

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID required' }, { status: 400 });
    }

    // Get job details
    const { data: job, error: jobError } = await supabaseAdminClient
      .from('migration_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Phase-aware idempotency: check per-label manifest or global manifest
    const manifestKey = pageLabel ? `asset_manifest_${pageLabel}` : 'asset_manifest';
    if ((job.metadata as any)?.[manifestKey]) {
      return NextResponse.json({
        message: 'Assets already downloaded',
        manifest: (job.metadata as any)[manifestKey],
      });
    }

    const scopeLabel = pageLabel || null;
    await logActivity(jobId, 'assets_start', `Starting asset discovery${scopeLabel ? ` for ${scopeLabel} pages` : ''}...`);

    // Get pages scoped to the label (or all pages if no label)
    let pagesQuery = supabaseAdminClient
      .from('migration_pages')
      .select('url, original_html, metadata')
      .eq('job_id', jobId) as any;
    if (scopeLabel) {
      pagesQuery = pagesQuery.eq('page_label', scopeLabel);
    }
    const { data: pages, error: pagesError } = await pagesQuery
      .order('render_priority', { ascending: true });

    if (pagesError) {
      return NextResponse.json({ error: pagesError.message }, { status: 500 });
    }

    if (!pages || pages.length === 0) {
      return NextResponse.json({ error: 'No pages found' }, { status: 404 });
    }

    const baseUrl = job.target_url;

    // Extract all asset URLs from HTML (handles both relative AND absolute URLs)
    const assetUrls = new Map<string, { url: string; type: string; pages: string[] }>();

    function addAsset(src: string, type: string, pageUrl: string) {
      const resolved = resolveUrl(src, baseUrl);
      if (!resolved) return;
      if (!assetUrls.has(resolved)) {
        assetUrls.set(resolved, { url: resolved, type, pages: [] });
      }
      assetUrls.get(resolved)!.pages.push(pageUrl);
    }
    
    for (const page of pages) {
      if (!page.original_html) continue;
      
      let match;

      // Extract images (src attribute)
      const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
      while ((match = imgRegex.exec(page.original_html)) !== null) {
        addAsset(match[1], 'image', page.url);
      }

      // Extract srcset images
      const srcsetRegex = /srcset=["']([^"']+)["']/gi;
      while ((match = srcsetRegex.exec(page.original_html)) !== null) {
        const entries = match[1].split(',');
        for (const entry of entries) {
          const src = entry.trim().split(/\s+/)[0];
          if (src) addAsset(src, 'image', page.url);
        }
      }

      // Extract background images from inline styles and <style> blocks
      const bgRegex = /url\(["']?([^"')]+?)["']?\)/gi;
      while ((match = bgRegex.exec(page.original_html)) !== null) {
        const src = match[1];
        if (src && /\.(jpe?g|png|gif|svg|webp|avif)/i.test(src)) {
          addAsset(src, 'image', page.url);
        }
      }

      // Extract CSS files
      const cssRegex = /<link[^>]+href=["']([^"']+\.css[^"']*)["'][^>]*>/gi;
      while ((match = cssRegex.exec(page.original_html)) !== null) {
        addAsset(match[1], 'css', page.url);
      }

      // Extract JS files (skip analytics/tracking/jquery)
      const jsRegex = /<script[^>]+src=["']([^"']+\.js[^"']*)["'][^>]*>/gi;
      while ((match = jsRegex.exec(page.original_html)) !== null) {
        const src = match[1];
        if (!/jquery|analytics|gtag|google|facebook|pixel|hotjar|clarity/i.test(src)) {
          addAsset(src, 'js', page.url);
        }
      }
    }

    const totalAssets = assetUrls.size;
    await logActivity(jobId, 'assets_discovered', `Found ${totalAssets} unique assets across ${pages.length} pages. Checking for existing downloads...`);

    // Build a lookup of assets already downloaded by v1 (stored in page metadata.asset_map)
    const v1AssetMap = new Map<string, string>();
    for (const page of pages) {
      const pageMeta = (page.metadata as any) || {};
      if (pageMeta.asset_map) {
        for (const [wpUrl, storageUrl] of Object.entries(pageMeta.asset_map)) {
          v1AssetMap.set(wpUrl, storageUrl as string);
        }
      }
    }

    // Check which assets already exist (v1 map first, then v2 storage path)
    let alreadyExist = 0;
    let needsDownload: [string, { url: string; type: string; pages: string[] }][] = [];

    for (const [originalUrl, asset] of assetUrls) {
      // Check v1 asset map first
      if (v1AssetMap.has(originalUrl)) {
        alreadyExist++;
        (asset as any).storageUrl = v1AssetMap.get(originalUrl)!;
        (asset as any).alreadyExisted = true;
        continue;
      }

      // Check v2 storage path
      const storagePath = getStoragePath(jobId, asset.type, originalUrl);
      const { data: existingFile } = await supabaseAdminClient.storage
        .from(ASSET_BUCKET)
        .createSignedUrl(storagePath, 1);

      if (existingFile?.signedUrl) {
        alreadyExist++;
        const { data: publicUrl } = supabaseAdminClient.storage
          .from(ASSET_BUCKET)
          .getPublicUrl(storagePath);
        (asset as any).storageUrl = publicUrl.publicUrl;
        (asset as any).alreadyExisted = true;
      } else {
        needsDownload.push([originalUrl, asset]);
      }
    }

    await logActivity(jobId, 'assets_checked', `${alreadyExist} already in storage (${v1AssetMap.size} from previous migration), ${needsDownload.length} need downloading`);

    // Build manifest
    const assetManifest = {
      total: totalAssets,
      downloaded: 0,
      skipped: alreadyExist,
      failed: 0,
      assets: [] as any[],
    };

    // Add already-existing assets to manifest
    for (const [originalUrl, asset] of assetUrls) {
      if ((asset as any).alreadyExisted) {
        assetManifest.assets.push({
          originalUrl,
          storageUrl: (asset as any).storageUrl,
          type: asset.type,
          pages: asset.pages,
          alreadyExisted: true,
        });
      }
    }

    // Download only new assets
    if (needsDownload.length > 0) {
      const authHeader = job.wp_admin_username && job.wp_application_password
        ? `Basic ${Buffer.from(`${job.wp_admin_username}:${job.wp_application_password}`).toString('base64')}`
        : null;

      let downloadedSoFar = 0;
      for (const [originalUrl, asset] of needsDownload) {
        try {
          const response = await fetch(asset.url, {
            headers: authHeader ? { Authorization: authHeader } : {},
            signal: AbortSignal.timeout(15000),
          });

          if (!response.ok) {
            console.warn(`[assets] Failed to download ${asset.url}: ${response.status}`);
            assetManifest.failed++;
            continue;
          }

          const buffer = await response.arrayBuffer();
          const storagePath = getStoragePath(jobId, asset.type, originalUrl);
          const contentType = guessContentType(originalUrl, asset.type);

          const { error: uploadError } = await supabaseAdminClient.storage
            .from(ASSET_BUCKET)
            .upload(storagePath, buffer, { contentType, upsert: true });

          if (uploadError) {
            console.error(`[assets] Upload failed for ${asset.url}:`, uploadError);
            assetManifest.failed++;
            continue;
          }

          const { data: publicUrl } = supabaseAdminClient.storage
            .from(ASSET_BUCKET)
            .getPublicUrl(storagePath);

          assetManifest.assets.push({
            originalUrl,
            storageUrl: publicUrl.publicUrl,
            type: asset.type,
            size: buffer.byteLength,
            pages: asset.pages,
            downloadedAt: new Date().toISOString(),
          });

          assetManifest.downloaded++;
          downloadedSoFar++;

          // Log progress every 10 assets
          if (downloadedSoFar % 10 === 0) {
            await logActivity(jobId, 'assets_progress', `Downloaded ${downloadedSoFar}/${needsDownload.length} assets...`);
          }
        } catch (error) {
          console.error(`[assets] Error downloading ${asset.url}:`, error);
          assetManifest.failed++;
        }
      }
    }

    // Save manifest to metadata (phase-aware key)
    const metadata = (job.metadata as any) || {};
    metadata[manifestKey] = assetManifest;
    metadata[`${manifestKey}_downloaded_at`] = new Date().toISOString();
    // Also set the legacy key for backward compat when no label
    if (!pageLabel) {
      metadata.asset_manifest = assetManifest;
      metadata.asset_downloaded_at = new Date().toISOString();
    }

    const buildStatus = (job.build_status as any) || {};
    await supabaseAdminClient
      .from('migration_jobs')
      .update({
        metadata,
        build_status: {
          ...buildStatus,
          phase: 'assets',
          current_step: 'download_complete',
          completed_at: new Date().toISOString(),
          recent_activity: [
            ...(buildStatus.recent_activity || []),
            {
              timestamp: new Date().toISOString(),
              action: 'assets_complete',
              message: `Assets complete: ${assetManifest.downloaded} downloaded, ${assetManifest.skipped} already existed, ${assetManifest.failed} failed (${assetManifest.total} total)`,
              details: {
                total: assetManifest.total,
                downloaded: assetManifest.downloaded,
                skipped: assetManifest.skipped,
                failed: assetManifest.failed,
                types: [...new Set(assetManifest.assets.map((a: any) => a.type))],
              }
            }
          ]
        }
      })
      .eq('id', jobId);

    await logActivity(jobId, 'assets_done', `Complete: ${assetManifest.downloaded} new, ${assetManifest.skipped} existing, ${assetManifest.failed} failed`);

    return NextResponse.json({
      message: 'Asset download completed',
      manifest: assetManifest,
    });
  } catch (error: any) {
    console.error('[wp-migration-v2-assets] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
