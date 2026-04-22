#!/usr/bin/env node
/**
 * Capture screenshot for the homepage of the most recent migration
 * This re-renders just the homepage to capture its original screenshot
 * Run: node scripts/capture-homepage-screenshot.mjs
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

async function main() {
  // Get most recent migration job
  const { data: jobs, error: jobError } = await supabase
    .from('migration_jobs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1);

  if (jobError || !jobs?.length) {
    console.error('No migration jobs found');
    return;
  }

  const job = jobs[0];
  console.log('Job:', job.target_url);

  // Find homepage
  const { data: pages } = await supabase
    .from('migration_pages')
    .select('*')
    .eq('job_id', job.id)
    .order('render_priority', { ascending: true })
    .limit(10);

  const homepage = pages?.find(p => {
    const pathname = new URL(p.url).pathname;
    return pathname === '/' || pathname === '';
  });

  if (!homepage) {
    console.error('No homepage found');
    return;
  }

  console.log('Homepage:', homepage.url);
  console.log('Page ID:', homepage.id);

  // Launch browser and capture screenshot of the ORIGINAL WordPress page
  console.log('\nLaunching browser to capture original WordPress page...');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    extraHTTPHeaders: {
      Authorization: `Basic ${Buffer.from(`${job.wp_admin_username}:${job.wp_application_password}`).toString('base64')}`,
    },
    ignoreHTTPSErrors: true,
  });

  const page = await context.newPage();

  // Intercept all requests to add auth header
  await page.route('**/*', (route) => {
    const headers = {
      ...route.request().headers(),
      Authorization: `Basic ${Buffer.from(`${job.wp_admin_username}:${job.wp_application_password}`).toString('base64')}`,
    };
    route.continue({ headers });
  });

  try {
    console.log('Navigating to:', homepage.url);
    await page.goto(homepage.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(3000); // Let JS settle

    console.log('Taking full-page screenshot...');
    const screenshotBuffer = await page.screenshot({ fullPage: true, type: 'png' });

    // Upload to Supabase
    const screenshotPath = `${job.id}/original_home.png`;
    console.log('Uploading to:', screenshotPath);

    const { error: uploadError } = await supabase.storage
      .from(SCREENSHOT_BUCKET)
      .upload(screenshotPath, screenshotBuffer, {
        contentType: 'image/png',
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return;
    }

    const { data: urlData } = supabase.storage
      .from(SCREENSHOT_BUCKET)
      .getPublicUrl(screenshotPath);

    const screenshotUrl = urlData.publicUrl;
    console.log('Screenshot URL:', screenshotUrl);

    // Update the page record
    const { error: updateError } = await supabase
      .from('migration_pages')
      .update({ original_screenshot_url: screenshotUrl })
      .eq('id', homepage.id);

    if (updateError) {
      console.error('Update error:', updateError);
      return;
    }

    console.log('\n✅ Homepage screenshot captured and saved!');
    console.log('Page ID:', homepage.id);
    console.log('Screenshot URL:', screenshotUrl);
    console.log('\nYou can now run the visual comparison.');

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
