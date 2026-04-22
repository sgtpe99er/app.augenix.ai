#!/usr/bin/env node
/**
 * Capture screenshots for ALL pages of a migration job
 * Visits each original WordPress page and saves a full-page screenshot to Supabase
 * 
 * Usage: node scripts/capture-all-screenshots.mjs [--job-id=<uuid>] [--limit=<n>] [--skip-existing]
 * 
 * Options:
 *   --job-id       Specific job ID (defaults to most recent job)
 *   --limit        Max pages to process (defaults to all)
 *   --skip-existing Skip pages that already have screenshots
 *   --batch-size   Pages per browser session (default: 20, helps with memory)
 */

import { createClient } from '@supabase/supabase-js';
import { chromium } from 'playwright-core';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const SCREENSHOT_BUCKET = 'migration-screenshots';

// Parse CLI args
const args = process.argv.slice(2);
const getArg = (name) => {
  const arg = args.find(a => a.startsWith(`--${name}=`));
  return arg ? arg.split('=')[1] : null;
};
const hasFlag = (name) => args.includes(`--${name}`);

const CLI_JOB_ID = getArg('job-id');
const CLI_LIMIT = getArg('limit') ? parseInt(getArg('limit'), 10) : null;
const SKIP_EXISTING = hasFlag('skip-existing');
const BATCH_SIZE = getArg('batch-size') ? parseInt(getArg('batch-size'), 10) : 20;

async function getJob() {
  if (CLI_JOB_ID) {
    const { data, error } = await supabase
      .from('migration_jobs')
      .select('*')
      .eq('id', CLI_JOB_ID)
      .single();
    if (error) throw new Error(`Job not found: ${CLI_JOB_ID}`);
    return data;
  }

  const { data: jobs, error } = await supabase
    .from('migration_jobs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error || !jobs?.length) throw new Error('No migration jobs found');
  return jobs[0];
}

async function getPages(jobId) {
  let query = supabase
    .from('migration_pages')
    .select('id, url, original_screenshot_url, status')
    .eq('job_id', jobId)
    .eq('status', 'done')
    .order('render_priority', { ascending: true });

  if (SKIP_EXISTING) {
    query = query.is('original_screenshot_url', null);
  }

  if (CLI_LIMIT) {
    query = query.limit(CLI_LIMIT);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function captureScreenshot(browser, page, url, authHeader) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    ignoreHTTPSErrors: true,
  });

  const browserPage = await context.newPage();

  // Intercept all requests to add auth header
  await browserPage.route('**/*', (route) => {
    const headers = {
      ...route.request().headers(),
      Authorization: authHeader,
    };
    route.continue({ headers });
  });

  try {
    await browserPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await browserPage.waitForTimeout(2000); // Let JS settle
    const buffer = await browserPage.screenshot({ fullPage: true, type: 'png' });
    return buffer;
  } finally {
    await context.close();
  }
}

async function uploadScreenshot(jobId, pageUrl, buffer) {
  const pathname = new URL(pageUrl).pathname.replace(/\//g, '_') || '_home';
  const screenshotPath = `${jobId}/original${pathname}.png`;

  const { error } = await supabase.storage
    .from(SCREENSHOT_BUCKET)
    .upload(screenshotPath, buffer, {
      contentType: 'image/png',
      upsert: true,
    });

  if (error) throw error;

  const { data } = supabase.storage
    .from(SCREENSHOT_BUCKET)
    .getPublicUrl(screenshotPath);

  return data.publicUrl;
}

async function updatePage(pageId, screenshotUrl) {
  const { error } = await supabase
    .from('migration_pages')
    .update({ original_screenshot_url: screenshotUrl })
    .eq('id', pageId);

  if (error) throw error;
}

async function processBatch(pages, job, startIndex) {
  const authHeader = `Basic ${Buffer.from(`${job.wp_admin_username}:${job.wp_application_password}`).toString('base64')}`;
  
  console.log(`\nLaunching browser for batch starting at index ${startIndex}...`);
  const browser = await chromium.launch({ headless: true });

  let processed = 0;
  let failed = 0;

  try {
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const globalIndex = startIndex + i + 1;
      
      try {
        process.stdout.write(`[${globalIndex}/${startIndex + pages.length}] ${page.url.substring(0, 60)}... `);
        
        const buffer = await captureScreenshot(browser, page, page.url, authHeader);
        const screenshotUrl = await uploadScreenshot(job.id, page.url, buffer);
        await updatePage(page.id, screenshotUrl);
        
        console.log('✓');
        processed++;
      } catch (err) {
        console.log(`✗ ${err.message.substring(0, 50)}`);
        failed++;
      }

      // Small delay between pages to be polite
      await new Promise(r => setTimeout(r, 300));
    }
  } finally {
    await browser.close();
  }

  return { processed, failed };
}

async function main() {
  console.log('=== Screenshot Capture Script ===\n');

  const job = await getJob();
  console.log('Job ID:', job.id);
  console.log('Target URL:', job.target_url);
  console.log('Total Pages:', job.total_pages);

  const pages = await getPages(job.id);
  console.log(`\nPages to process: ${pages.length}`);
  if (SKIP_EXISTING) console.log('(Skipping pages with existing screenshots)');

  if (pages.length === 0) {
    console.log('\nNo pages to process. All done!');
    return;
  }

  let totalProcessed = 0;
  let totalFailed = 0;

  // Process in batches to manage memory
  for (let i = 0; i < pages.length; i += BATCH_SIZE) {
    const batch = pages.slice(i, i + BATCH_SIZE);
    const { processed, failed } = await processBatch(batch, job, i);
    totalProcessed += processed;
    totalFailed += failed;
  }

  console.log('\n=== Summary ===');
  console.log(`Processed: ${totalProcessed}`);
  console.log(`Failed: ${totalFailed}`);
  console.log(`Total: ${pages.length}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
