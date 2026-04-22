export const maxDuration = 120;

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';
import { supabaseAdminClient } from '@/libs/supabase/supabase-admin';
import { launchBrowser } from '@/libs/puppeteer/browser';
import sharp from 'sharp';

const SCREENSHOT_BUCKET = 'migration-screenshots';

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

async function fetchImageAsCompressedBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    // Resize to max 1280x7000 and convert to JPEG to stay under Claude's 5MB / 8000px limits
    const compressed = await sharp(buffer)
      .resize(1280, 7000, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 70 })
      .toBuffer();
    return compressed.toString('base64');
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const AI_GATEWAY_API_KEY = process.env.AI_GATEWAY_API_KEY;
    if (!AI_GATEWAY_API_KEY) {
      return NextResponse.json({ error: 'AI Gateway API key not configured' }, { status: 500 });
    }

    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { jobId, customerId, pageLabel } = await request.json();

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID required' }, { status: 400 });
    }

    // Get job
    const { data: job, error: jobError } = await supabaseAdminClient
      .from('migration_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const metadata = (job.metadata as any) || {};

    // Require deploy preview
    const deployPreview = metadata.deploy_preview;
    if (!deployPreview?.url) {
      return NextResponse.json({ error: 'Deploy preview not available. Run Deploy Preview first.' }, { status: 400 });
    }

    await logActivity(jobId, 'visual_qa_start', 'Starting visual QA — capturing new site screenshots...');

    // Get original screenshots
    const targetUrl = job.target_url;
    const targetUrlAlt = targetUrl.endsWith('/') ? targetUrl.slice(0, -1) : targetUrl + '/';

    let homepage: any = null;
    const { data: exactMatch } = await supabaseAdminClient
      .from('migration_pages')
      .select('original_screenshot_url, mobile_screenshot_url, url')
      .eq('job_id', jobId)
      .eq('url', targetUrl)
      .single();

    if (exactMatch) {
      homepage = exactMatch;
    } else {
      const { data: altMatch } = await supabaseAdminClient
        .from('migration_pages')
        .select('original_screenshot_url, mobile_screenshot_url, url')
        .eq('job_id', jobId)
        .eq('url', targetUrlAlt)
        .single();
      if (altMatch) homepage = altMatch;
    }

    if (!homepage?.original_screenshot_url) {
      return NextResponse.json({ error: 'Original screenshots not found. Run Capture first.' }, { status: 400 });
    }

    // 1. Take screenshots of the newly deployed page
    const deployUrl = deployPreview.url;
    await logActivity(jobId, 'visual_qa_screenshot', `Capturing screenshots of ${deployUrl}...`);

    const browser = await launchBrowser();

    let newDesktopBase64: string;
    let newMobileBase64: string;
    let persistedDesktopUrl: string;
    let persistedMobileUrl: string;

    try {
      // Desktop: full-page PNG for storage, viewport JPEG for AI
      const desktopPage = await browser.newPage();
      await desktopPage.setViewport({ width: 1920, height: 1080 });
      await desktopPage.goto(deployUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await new Promise(r => setTimeout(r, 3000)); // wait for JS rendering
      const desktopFullPng = await desktopPage.screenshot({ fullPage: true, type: 'png' }) as Buffer;
      const desktopJpeg = await desktopPage.screenshot({ fullPage: false, type: 'jpeg', quality: 70 }) as Buffer;
      const desktopForAi = await sharp(desktopJpeg)
        .resize(1280, 7000, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 70 })
        .toBuffer();
      newDesktopBase64 = desktopForAi.toString('base64');
      await desktopPage.close();

      // Mobile: full-page PNG for storage, viewport JPEG for AI
      const mobilePage = await browser.newPage();
      await mobilePage.setViewport({ width: 375, height: 667 });
      await mobilePage.goto(deployUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await new Promise(r => setTimeout(r, 3000)); // wait for JS rendering
      const mobileFullPng = await mobilePage.screenshot({ fullPage: true, type: 'png' }) as Buffer;
      const mobileJpeg = await mobilePage.screenshot({ fullPage: false, type: 'jpeg', quality: 70 }) as Buffer;
      const mobileForAi = await sharp(mobileJpeg)
        .resize(1280, 7000, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 70 })
        .toBuffer();
      newMobileBase64 = mobileForAi.toString('base64');
      await mobilePage.close();

      // Upload full-page PNGs to Supabase (for UI viewing)
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

      const desktopPath = `${jobId}/new-site/desktop-${timestamp}.png`;
      await supabaseAdminClient.storage
        .from(SCREENSHOT_BUCKET)
        .upload(desktopPath, desktopFullPng, { contentType: 'image/png', upsert: true });
      const { data: desktopUrlData } = supabaseAdminClient.storage
        .from(SCREENSHOT_BUCKET)
        .getPublicUrl(desktopPath);
      persistedDesktopUrl = desktopUrlData.publicUrl;

      const mobilePath = `${jobId}/new-site/mobile-${timestamp}.png`;
      await supabaseAdminClient.storage
        .from(SCREENSHOT_BUCKET)
        .upload(mobilePath, mobileFullPng, { contentType: 'image/png', upsert: true });
      const { data: mobileUrlData } = supabaseAdminClient.storage
        .from(SCREENSHOT_BUCKET)
        .getPublicUrl(mobilePath);
      persistedMobileUrl = mobileUrlData.publicUrl;
    } finally {
      await browser.close();
    }

    await logActivity(jobId, 'visual_qa_screenshots_done', 'New site screenshots captured. Fetching original screenshots...');

    // 2. Fetch original screenshots as base64 (re-encode as JPEG to stay under 5MB Claude limit)
    const oldDesktopBase64 = await fetchImageAsCompressedBase64(homepage.original_screenshot_url);
    const oldMobileBase64 = homepage.mobile_screenshot_url
      ? await fetchImageAsCompressedBase64(homepage.mobile_screenshot_url)
      : null;

    if (!oldDesktopBase64) {
      return NextResponse.json({ error: 'Failed to fetch original desktop screenshot' }, { status: 500 });
    }

    await logActivity(jobId, 'visual_qa_ai', 'Sending old + new screenshots to Claude for visual comparison...');

    // 3. Build message with images for Claude vision
    const imageMessages: any[] = [];

    // Old desktop
    imageMessages.push({
      type: 'text',
      text: '## ORIGINAL WORDPRESS SITE — Desktop Screenshot:',
    });
    imageMessages.push({
      type: 'image_url',
      image_url: { url: `data:image/jpeg;base64,${oldDesktopBase64}` },
    });

    // New desktop
    imageMessages.push({
      type: 'text',
      text: '## NEW NEXT.JS SITE — Desktop Screenshot:',
    });
    imageMessages.push({
      type: 'image_url',
      image_url: { url: `data:image/jpeg;base64,${newDesktopBase64}` },
    });

    // Old mobile (if available)
    if (oldMobileBase64) {
      imageMessages.push({
        type: 'text',
        text: '## ORIGINAL WORDPRESS SITE — Mobile Screenshot:',
      });
      imageMessages.push({
        type: 'image_url',
        image_url: { url: `data:image/jpeg;base64,${oldMobileBase64}` },
      });
    }

    // New mobile
    imageMessages.push({
      type: 'text',
      text: '## NEW NEXT.JS SITE — Mobile Screenshot:',
    });
    imageMessages.push({
      type: 'image_url',
      image_url: { url: `data:image/jpeg;base64,${newMobileBase64}` },
    });

    // QA prompt
    imageMessages.push({
      type: 'text',
      text: `## VISUAL QA CHECKLIST — Compare the original WordPress site screenshots with the new Next.js site screenshots.

Evaluate each item and give a score (0-10) and notes:

1. **Layout Match**: Does the new site have the same overall layout structure? (header, hero, sections, footer)
2. **Color Accuracy**: Do the colors match the original site?
3. **Typography**: Are fonts, sizes, and weights visually similar?
4. **Image Placement**: Are images in the same positions with similar sizing?
5. **Navigation**: Does the nav bar look similar (links, layout, CTA button)?
6. **Hero Section**: Does the hero area match (background, headline, buttons)?
7. **Content Sections**: Do service/about/testimonial sections look similar?
8. **Spacing & Padding**: Is the whitespace/padding visually consistent?
9. **Mobile Layout**: Does the mobile version match the original mobile layout?
10. **Overall Impression**: How close is the new site to the original? Would a customer accept this?

Return as JSON:
{
  "scores": {
    "layout_match": { "score": 8, "notes": "..." },
    "color_accuracy": { "score": 7, "notes": "..." },
    "typography": { "score": 9, "notes": "..." },
    "image_placement": { "score": 8, "notes": "..." },
    "navigation": { "score": 7, "notes": "..." },
    "hero_section": { "score": 6, "notes": "..." },
    "content_sections": { "score": 8, "notes": "..." },
    "spacing_padding": { "score": 9, "notes": "..." },
    "mobile_layout": { "score": 7, "notes": "..." },
    "overall_impression": { "score": 7, "notes": "..." }
  },
  "overall_score": 7.6,
  "top_issues": [
    "Issue 1",
    "Issue 2",
    "Issue 3"
  ],
  "recommendations": [
    "Recommendation 1",
    "Recommendation 2",
    "Recommendation 3"
  ],
  "ready_for_deployment": false,
  "summary": "Brief visual comparison assessment"
}`,
    });

    const aiResponse = await fetch('https://ai-gateway.vercel.sh/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AI_GATEWAY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-opus-4.6',
        messages: [
          {
            role: 'system',
            content: 'You are an expert visual QA engineer comparing an original WordPress website with its newly generated Next.js replacement. Compare the screenshots carefully. Be thorough and critical. Return ONLY valid JSON.',
          },
          {
            role: 'user',
            content: imageMessages,
          },
        ],
        temperature: 0.3,
        max_tokens: 3000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      throw new Error(`AI Gateway error (${aiResponse.status}): ${errorText}`);
    }

    const completion = await aiResponse.json();
    const qaText = completion.choices?.[0]?.message?.content || '';

    let qaReport: any;
    try {
      qaReport = JSON.parse(qaText);
    } catch {
      const jsonMatch = qaText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        qaReport = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse visual QA report from AI response');
      }
    }

    await logActivity(jobId, 'visual_qa_done', `Visual QA complete: ${qaReport.overall_score}/10, ${qaReport.ready_for_deployment ? 'READY' : 'needs work'}`);

    // Store in job metadata
    metadata.visual_qa_report = qaReport;
    metadata.visual_qa_at = new Date().toISOString();
    metadata.visual_qa_screenshots = {
      old_desktop: homepage.original_screenshot_url,
      old_mobile: homepage.mobile_screenshot_url || null,
      new_desktop: persistedDesktopUrl,
      new_mobile: persistedMobileUrl,
    };

    // Re-read current build_status from DB
    const { data: freshJob } = await supabaseAdminClient
      .from('migration_jobs')
      .select('build_status')
      .eq('id', jobId)
      .single();
    const buildStatus = ((freshJob?.build_status as any) || {});
    await supabaseAdminClient
      .from('migration_jobs')
      .update({
        metadata,
        build_status: {
          ...buildStatus,
          phase: 'homepage',
          current_step: 'visual_qa_complete',
          recent_activity: [
            ...(buildStatus.recent_activity || []),
            {
              timestamp: new Date().toISOString(),
              action: 'visual_qa_complete',
              message: `Visual QA: ${qaReport.overall_score}/10 — ${qaReport.summary}`,
            },
          ],
        },
      })
      .eq('id', jobId);

    return NextResponse.json({
      message: 'Visual QA complete',
      qaReport,
      screenshots: {
        old_desktop: homepage.original_screenshot_url,
        old_mobile: homepage.mobile_screenshot_url || null,
        new_desktop: persistedDesktopUrl,
        new_mobile: persistedMobileUrl,
      },
    });
  } catch (error: any) {
    console.error('[wp-migration-v2-visual-qa] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
