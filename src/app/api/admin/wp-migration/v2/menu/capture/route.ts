import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';
import { supabaseAdminClient } from '@/libs/supabase/supabase-admin';
import puppeteer from 'puppeteer';

const SCREENSHOT_BUCKET = 'migration-screenshots';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { jobId, pageUrl } = await request.json();

    if (!jobId || !pageUrl) {
      return NextResponse.json({ error: 'Job ID and page URL required' }, { status: 400 });
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

    // Get page details
    const { data: page, error: pageError } = await supabaseAdminClient
      .from('migration_pages')
      .select('*')
      .eq('job_id', jobId)
      .eq('url', pageUrl)
      .single();

    if (pageError || !page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    // Check if screenshots already exist
    if (page.original_screenshot_url && page.mobile_screenshot_url) {
      return NextResponse.json({
        message: 'Screenshots already exist',
        screenshots: {
          desktop: page.original_screenshot_url,
          mobile: page.mobile_screenshot_url,
        },
      });
    }

    // Launch browser
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const fullUrl = pageUrl.startsWith('http') ? pageUrl : `${job.target_url}${pageUrl}`;
      
      // Desktop screenshot
      const desktopPage = await browser.newPage();
      await desktopPage.setViewport({ width: 1920, height: 1080 });
      await desktopPage.goto(fullUrl, { waitUntil: 'networkidle2' });
      
      const desktopScreenshot = await desktopPage.screenshot({ 
        fullPage: true, 
        type: 'png' 
      });
      
      await desktopPage.close();

      // Mobile screenshot
      const mobilePage = await browser.newPage();
      await mobilePage.setViewport({ width: 375, height: 667 });
      await mobilePage.goto(fullUrl, { waitUntil: 'networkidle2' });
      
      const mobileScreenshot = await mobilePage.screenshot({ 
        fullPage: true, 
        type: 'png' 
      });
      
      await mobilePage.close();

      // Upload screenshots
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const pathname = new URL(pageUrl).pathname.replace(/\//g, '_') || '_page';
      
      // Desktop screenshot
      const desktopPath = `${jobId}/menu-pages/${pathname}-desktop-${timestamp}.png`;
      const { error: desktopUploadError } = await supabaseAdminClient.storage
        .from(SCREENSHOT_BUCKET)
        .upload(desktopPath, desktopScreenshot, {
          contentType: 'image/png',
          upsert: true,
        });

      if (desktopUploadError) {
        throw desktopUploadError;
      }

      const { data: desktopUrl } = supabaseAdminClient.storage
        .from(SCREENSHOT_BUCKET)
        .getPublicUrl(desktopPath);

      // Mobile screenshot
      const mobilePath = `${jobId}/menu-pages/${pathname}-mobile-${timestamp}.png`;
      const { error: mobileUploadError } = await supabaseAdminClient.storage
        .from(SCREENSHOT_BUCKET)
        .upload(mobilePath, mobileScreenshot, {
          contentType: 'image/png',
          upsert: true,
        });

      if (mobileUploadError) {
        throw mobileUploadError;
      }

      const { data: mobileUrl } = supabaseAdminClient.storage
        .from(SCREENSHOT_BUCKET)
        .getPublicUrl(mobilePath);

      // Update database
      await supabaseAdminClient
        .from('migration_pages')
        .update({
          original_screenshot_url: desktopUrl.publicUrl,
          mobile_screenshot_url: mobileUrl.publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', page.id);

      return NextResponse.json({
        message: 'Screenshots captured successfully',
        screenshots: {
          desktop: desktopUrl.publicUrl,
          mobile: mobileUrl.publicUrl,
        },
      });
    } finally {
      await browser.close();
    }
  } catch (error: any) {
    console.error('[wp-migration-v2-menu-capture] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
