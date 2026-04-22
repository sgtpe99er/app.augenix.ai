export const maxDuration = 120;

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';
import { supabaseAdminClient } from '@/libs/supabase/supabase-admin';
import { launchBrowser } from '@/libs/puppeteer/browser';

const SCREENSHOT_BUCKET = 'migration-screenshots';

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

    // Determine which pages to capture based on pageLabel
    const scopeLabel = pageLabel || 'home';
    let pagesToCapture: any[] = [];

    if (scopeLabel === 'home') {
      // Home page: find by URL match or label
      const { data: labeled } = await supabaseAdminClient
        .from('migration_pages')
        .select('*')
        .eq('job_id', jobId)
        .eq('page_label' as any, 'home');
      
      if (labeled && labeled.length > 0) {
        pagesToCapture = labeled;
      } else {
        // Fallback: match by target URL
        const { data: homepage } = await supabaseAdminClient
          .from('migration_pages')
          .select('*')
          .eq('job_id', jobId)
          .eq('url', job.target_url)
          .single();
        if (homepage) pagesToCapture = [homepage];
      }
    } else {
      // Other labels: fetch all pages with that label
      const { data: labeled } = await supabaseAdminClient
        .from('migration_pages')
        .select('*')
        .eq('job_id', jobId)
        .eq('page_label' as any, scopeLabel);
      pagesToCapture = labeled || [];
    }

    if (pagesToCapture.length === 0) {
      return NextResponse.json({ error: `No pages found with label: ${scopeLabel}` }, { status: 404 });
    }

    // Check if all pages already captured
    const uncaptured = pagesToCapture.filter(p => !p.original_screenshot_url || !p.original_html);
    if (uncaptured.length === 0) {
      return NextResponse.json({
        message: `Capture already completed for ${pagesToCapture.length} ${scopeLabel} page(s)`,
        captured: pagesToCapture.length,
      });
    }

    // Launch browser
    const browser = await launchBrowser();

    try {
      const results: any[] = [];

      for (const page of uncaptured) {
        const pageUrl = page.url;
        const slug = new URL(pageUrl).pathname.replace(/\//g, '_') || 'home';

        // Desktop screenshot
        const desktopPage = await browser.newPage();
        await desktopPage.setViewport({ width: 1920, height: 1080 });
        await desktopPage.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        
        const desktopScreenshot = await desktopPage.screenshot({ fullPage: true, type: 'png' });
        const htmlContent = await desktopPage.content();
        await desktopPage.close();

        // Mobile screenshot
        const mobilePage = await browser.newPage();
        await mobilePage.setViewport({ width: 375, height: 667 });
        await mobilePage.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        const mobileScreenshot = await mobilePage.screenshot({ fullPage: true, type: 'png' });
        await mobilePage.close();

        // Upload screenshots
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        
        const desktopPath = `${jobId}/${scopeLabel}/${slug}/desktop-${timestamp}.png`;
        const { error: desktopUploadError } = await supabaseAdminClient.storage
          .from(SCREENSHOT_BUCKET)
          .upload(desktopPath, desktopScreenshot, { contentType: 'image/png', upsert: true });
        if (desktopUploadError) throw desktopUploadError;

        const { data: desktopUrl } = supabaseAdminClient.storage
          .from(SCREENSHOT_BUCKET)
          .getPublicUrl(desktopPath);

        const mobilePath = `${jobId}/${scopeLabel}/${slug}/mobile-${timestamp}.png`;
        const { error: mobileUploadError } = await supabaseAdminClient.storage
          .from(SCREENSHOT_BUCKET)
          .upload(mobilePath, mobileScreenshot, { contentType: 'image/png', upsert: true });
        if (mobileUploadError) throw mobileUploadError;

        const { data: mobileUrl } = supabaseAdminClient.storage
          .from(SCREENSHOT_BUCKET)
          .getPublicUrl(mobilePath);

        // Update page record
        await supabaseAdminClient
          .from('migration_pages')
          .update({
            original_html: htmlContent,
            original_screenshot_url: desktopUrl.publicUrl,
            mobile_screenshot_url: mobileUrl.publicUrl,
            status: 'done',
            updated_at: new Date().toISOString(),
          })
          .eq('id', page.id);

        results.push({ url: pageUrl, desktop: desktopUrl.publicUrl, mobile: mobileUrl.publicUrl });
      }

      // Update job status
      const buildStatus = (job.build_status as any) || {};
      await supabaseAdminClient
        .from('migration_jobs')
        .update({
          build_status: {
            ...buildStatus,
            phase: scopeLabel,
            current_step: 'capture_complete',
            completed_at: new Date().toISOString(),
            recent_activity: [
              ...(buildStatus.recent_activity || []),
              {
                timestamp: new Date().toISOString(),
                action: `${scopeLabel}_captured`,
                message: `Captured ${results.length} ${scopeLabel} page(s)`,
                details: { captured: results.length },
              }
            ]
          }
        })
        .eq('id', jobId);

      return NextResponse.json({
        message: `Captured ${results.length} ${scopeLabel} page(s)`,
        results,
      });
    } finally {
      await browser.close();
    }
  } catch (error: any) {
    console.error('[wp-migration-v2-capture] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
