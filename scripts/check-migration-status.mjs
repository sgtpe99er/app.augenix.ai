#!/usr/bin/env node
/**
 * Check migration status for testing visual comparison
 * Run: node scripts/check-migration-status.mjs
 */

import { createClient } from '@supabase/supabase-js';
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

async function main() {
  // Get most recent migration job
  const { data: jobs, error: jobError } = await supabase
    .from('migration_jobs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1);

  if (jobError) {
    console.error('Error fetching jobs:', jobError);
    return;
  }

  if (!jobs || jobs.length === 0) {
    console.log('No migration jobs found');
    return;
  }

  const job = jobs[0];
  console.log('\n=== Most Recent Migration Job ===');
  console.log('ID:', job.id);
  console.log('Target URL:', job.target_url);
  console.log('Status:', job.status);
  console.log('Total Pages:', job.total_pages);
  console.log('Completed Pages:', job.completed_pages);
  console.log('Created:', job.created_at);

  // Get pages for this job
  const { data: pages, error: pagesError } = await supabase
    .from('migration_pages')
    .select('id, url, status, original_screenshot_url, rewritten_screenshot_url, rewritten_html, metadata')
    .eq('job_id', job.id)
    .order('render_priority', { ascending: true })
    .limit(10);

  if (pagesError) {
    console.error('Error fetching pages:', pagesError);
    return;
  }

  console.log('\n=== Migration Pages ===');
  for (const page of pages || []) {
    const pathname = new URL(page.url).pathname;
    const isHomepage = pathname === '/' || pathname === '';
    console.log(`\n${isHomepage ? '🏠 HOMEPAGE' : '📄'} ${page.url}`);
    console.log('  ID:', page.id);
    console.log('  Status:', page.status);
    console.log('  Has Original Screenshot:', !!page.original_screenshot_url);
    console.log('  Has Rewritten HTML:', !!page.rewritten_html);
    console.log('  Has Rewritten Screenshot:', !!page.rewritten_screenshot_url);
    if (page.original_screenshot_url) {
      console.log('  Original Screenshot URL:', page.original_screenshot_url);
    }
    if (page.metadata?.visual_comparison_result) {
      console.log('  Visual Comparison Result:', page.metadata.visual_comparison_result);
    }
  }

  // Find homepage specifically
  const homepage = pages?.find(p => {
    const pathname = new URL(p.url).pathname;
    return pathname === '/' || pathname === '';
  });

  if (homepage) {
    console.log('\n=== Homepage Ready for Visual Compare? ===');
    console.log('Page ID:', homepage.id);
    console.log('Has Original Screenshot:', !!homepage.original_screenshot_url);
    console.log('Has Rewritten HTML:', !!homepage.rewritten_html);
    
    if (homepage.original_screenshot_url && homepage.rewritten_html) {
      console.log('\n✅ Homepage is READY for visual comparison!');
      console.log('\nTo test, call this endpoint (while logged in as admin):');
      console.log('POST /api/admin/wp-migration/visual-compare');
      console.log('Body: { "pageId": "' + homepage.id + '" }');
    } else {
      console.log('\n❌ Homepage is NOT ready for visual comparison');
      if (!homepage.original_screenshot_url) {
        console.log('   - Missing original screenshot (re-run render step)');
      }
      if (!homepage.rewritten_html) {
        console.log('   - Missing rewritten HTML (complete rewrite step)');
      }
    }
  }
}

main().catch(console.error);
