/**
 * One-time script: Auto-label home page and main menu pages for an existing job.
 * 
 * Usage: node scripts/auto-label-pages.mjs
 * 
 * Reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Parse .env.local
const envPath = resolve(process.cwd(), '.env.local');
const envContent = readFileSync(envPath, 'utf8');
const env = {};
for (const line of envContent.split('\n')) {
  const idx = line.indexOf('=');
  if (idx === -1 || line.startsWith('#')) continue;
  const key = line.substring(0, idx).trim();
  const val = line.substring(idx + 1).trim().replace(/^["']|["']$/g, '');
  if (key) env[key] = val;
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Find the most recent job (Integrated Outdoors)
const { data: jobs, error: jobsError } = await supabase
  .from('migration_jobs')
  .select('id, target_url, wp_admin_username, wp_application_password, migration_version')
  .order('created_at', { ascending: false })
  .limit(5);

if (jobsError) {
  console.error('Error fetching jobs:', jobsError);
  process.exit(1);
}

console.log('Recent v2 jobs:');
jobs.forEach((j, i) => console.log(`  ${i}: ${j.id} — ${j.target_url}`));

// Pick the first one (most recent)
const job = jobs[0];
if (!job) {
  console.error('No v2 jobs found');
  process.exit(1);
}

console.log(`\nProcessing job: ${job.id} (${job.target_url})`);

const jobId = job.id;
const targetUrl = job.target_url;
const wpUsername = job.wp_admin_username;
const wpPassword = job.wp_application_password;

// 1. Get all pages
const { data: allPages } = await supabase
  .from('migration_pages')
  .select('id, url, page_label')
  .eq('job_id', jobId);

if (!allPages || allPages.length === 0) {
  console.error('No pages found for this job');
  process.exit(1);
}

console.log(`Found ${allPages.length} pages`);

// 2. Label homepage
const normalizedUrl = targetUrl.replace(/\/\s*$/, '');
const homePage = allPages.find(p => {
  const pageUrl = p.url.replace(/\/\s*$/, '');
  return pageUrl === normalizedUrl;
});

if (homePage) {
  const { error } = await supabase
    .from('migration_pages')
    .update({ page_label: 'home', render_priority: 0 })
    .eq('id', homePage.id);
  console.log(error ? `❌ Failed to label homepage: ${error.message}` : `✅ Labeled homepage: ${homePage.url}`);
} else {
  console.log('⚠️  Could not find homepage by URL match');
}

// 3. Try to get WP navigation menus
if (!wpUsername || !wpPassword) {
  console.log('⚠️  No WP credentials — skipping menu detection');
  process.exit(0);
}

const authHeader = `Basic ${Buffer.from(`${wpUsername}:${wpPassword}`).toString('base64')}`;
let menuUrls = [];

// Try WP REST API v2 menu-items
try {
  const res = await fetch(`${normalizedUrl}/wp-json/wp/v2/menu-items?menus=primary&per_page=100`, {
    headers: { Authorization: authHeader, Accept: 'application/json' },
    signal: AbortSignal.timeout(10000),
  });
  if (res.ok) {
    const items = await res.json();
    menuUrls = items.map(i => i.url).filter(Boolean);
    console.log(`Found ${menuUrls.length} menu items from /wp/v2/menu-items`);
  } else {
    console.log(`/wp/v2/menu-items returned ${res.status}`);
  }
} catch (e) {
  console.log(`/wp/v2/menu-items failed: ${e.message}`);
}

// Fallback: /wp-json/menus/v1/menus
if (menuUrls.length === 0) {
  try {
    const menusListRes = await fetch(`${normalizedUrl}/wp-json/menus/v1/menus`, {
      headers: { Authorization: authHeader, Accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    });
    if (menusListRes.ok) {
      const menus = await menusListRes.json();
      console.log(`Found ${menus.length} menus from /menus/v1/menus:`, menus.map(m => m.slug || m.name));
      if (menus.length > 0) {
        const primaryMenu = menus.find(m => /primary|main|header/i.test(m.slug || m.name || '')) || menus[0];
        console.log(`Using menu: ${primaryMenu.slug || primaryMenu.name} (id: ${primaryMenu.term_id || primaryMenu.id})`);
        const menuDetailRes = await fetch(`${normalizedUrl}/wp-json/menus/v1/menus/${primaryMenu.term_id || primaryMenu.id}`, {
          headers: { Authorization: authHeader, Accept: 'application/json' },
          signal: AbortSignal.timeout(10000),
        });
        if (menuDetailRes.ok) {
          const menuDetail = await menuDetailRes.json();
          const items = menuDetail.items || [];
          menuUrls = items.map(i => i.url).filter(Boolean);
          console.log(`Found ${menuUrls.length} menu items from menu detail`);
        }
      }
    } else {
      console.log(`/menus/v1/menus returned ${menusListRes.status}`);
    }
  } catch (e) {
    console.log(`/menus/v1/menus failed: ${e.message}`);
  }
}

// Fallback: try scraping nav links from homepage HTML
if (menuUrls.length === 0) {
  console.log('Trying fallback: scraping nav links from homepage HTML...');
  const { data: homePageData } = await supabase
    .from('migration_pages')
    .select('original_html')
    .eq('id', homePage?.id)
    .single();
  
  if (homePageData?.original_html) {
    // Extract links from <nav> or <header> elements
    const navRegex = /<(?:nav|header)[^>]*>([\s\S]*?)<\/(?:nav|header)>/gi;
    const linkRegex = /href=["']([^"'#]+)["']/gi;
    let navMatch;
    while ((navMatch = navRegex.exec(homePageData.original_html)) !== null) {
      let linkMatch;
      while ((linkMatch = linkRegex.exec(navMatch[1])) !== null) {
        const href = linkMatch[1];
        if (href.startsWith(normalizedUrl) || href.startsWith('/')) {
          const fullUrl = href.startsWith('/') ? `${normalizedUrl}${href}` : href;
          menuUrls.push(fullUrl);
        }
      }
    }
    menuUrls = [...new Set(menuUrls)]; // dedupe
    console.log(`Found ${menuUrls.length} nav/header links from homepage HTML`);
  }
}

if (menuUrls.length === 0) {
  console.log('⚠️  No menu URLs found. You can manually label pages in the Phase 1 UI.');
  process.exit(0);
}

console.log('\nMenu URLs found:');
menuUrls.forEach(u => console.log(`  ${u}`));

// Match menu URLs to discovered pages
const menuPageIds = [];
for (const menuUrl of menuUrls) {
  const normalizedMenuUrl = menuUrl.replace(/\/\s*$/, '');
  const match = allPages.find(p => {
    const pageUrl = p.url.replace(/\/\s*$/, '');
    return pageUrl === normalizedMenuUrl;
  });
  if (match && match.id !== homePage?.id) {
    menuPageIds.push(match.id);
  }
}

console.log(`\nMatched ${menuPageIds.length} menu pages to discovered pages`);

if (menuPageIds.length > 0) {
  const { error } = await supabase
    .from('migration_pages')
    .update({ page_label: 'main_menu', render_priority: 1 })
    .in('id', menuPageIds);
  
  if (error) {
    console.error('❌ Failed to label menu pages:', error.message);
  } else {
    const labeled = allPages.filter(p => menuPageIds.includes(p.id));
    console.log('✅ Labeled main menu pages:');
    labeled.forEach(p => console.log(`  ${p.url}`));
  }
} else {
  console.log('⚠️  No menu pages matched discovered pages. Label manually in Phase 1 UI.');
}
