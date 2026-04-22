/**
 * Phase 2.1: Remove WP Bloat
 * 
 * Strips WordPress-specific bloat from migrated HTML:
 * - WP emoji scripts and styles
 * - Admin bar scripts/styles
 * - WP REST API discovery links
 * - Generator meta tags
 * - HTML comments (except conditional IE comments)
 * - Unused tracking scripts (keeps GTM if present)
 * - wp-embed scripts
 * - Gutenberg block styles (if unused)
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

const cliArgs = process.argv.slice(2);
const DRY_RUN = cliArgs.includes('--dry-run');

let JOB_ID = '57e617fe-45f8-4dff-8de8-fd702fd23d2f';
let TARGET_URL = null;

for (let i = 0; i < cliArgs.length; i++) {
  const arg = cliArgs[i];
  if (arg === '--dry-run') continue;
  if (arg === '--url') {
    TARGET_URL = cliArgs[i + 1] || null;
    i++;
    continue;
  }
  if (arg.startsWith('--')) continue;
  JOB_ID = arg;
}

// ── Patterns to remove ──────────────────────────────────────────────────────

const REMOVE_PATTERNS = {
  // WP Emoji scripts and styles
  wpEmoji: [
    /<script\b[^>]*>(?:(?!<\/script>)[\s\S])*?_wpemojiSettings(?:(?!<\/script>)[\s\S])*?<\/script>/gi,
    /<script[^>]*wp-emoji-release\.min\.js[^>]*><\/script>/gi,
    /<style[^>]*>[\s\S]*?img\.wp-smiley[\s\S]*?<\/style>/gi,
    /<link[^>]*wp-emoji[^>]*>/gi,
  ],
  
  // Admin bar
  adminBar: [
    /<link[^>]*admin-bar[^>]*>/gi,
    /<script[^>]*admin-bar[^>]*><\/script>/gi,
    /<style[^>]*>#wpadminbar[\s\S]*?<\/style>/gi,
    /<div[^>]*id=["']wpadminbar["'][^>]*>[\s\S]*?<\/div>/gi,
  ],
  
  // REST API discovery links
  restApi: [
    /<link[^>]*rel=["']https:\/\/api\.w\.org\/["'][^>]*>/gi,
    /<link[^>]*rel=["']alternate["'][^>]*type=["']application\/json["'][^>]*>/gi,
    /<link[^>]*rel=["']EditURI["'][^>]*>/gi,
    /<link[^>]*rel=["']wlwmanifest["'][^>]*>/gi,
  ],
  
  // Generator meta tags
  generator: [
    /<meta[^>]*name=["']generator["'][^>]*>/gi,
  ],
  
  // WP embed scripts
  wpEmbed: [
    /<script[^>]*wp-embed\.min\.js[^>]*><\/script>/gi,
    /<script\b[^>]*>(?:(?!<\/script>)[\s\S])*?wp\.receiveEmbedMessage(?:(?!<\/script>)[\s\S])*?<\/script>/gi,
  ],
  
  // Gutenberg block library (if not using blocks)
  gutenberg: [
    /<link[^>]*wp-block-library[^>]*>/gi,
    /<style[^>]*id=["']wp-block-library[^>]*>[\s\S]*?<\/style>/gi,
  ],
  
  // DNS prefetch for WP services
  dnsPrefetch: [
    /<link[^>]*rel=["']dns-prefetch["'][^>]*href=["'][^"']*s\.w\.org[^"']*["'][^>]*>/gi,
  ],
  
  // Shortlink
  shortlink: [
    /<link[^>]*rel=["']shortlink["'][^>]*>/gi,
  ],
  
  // Pingback
  pingback: [
    /<link[^>]*rel=["']pingback["'][^>]*>/gi,
  ],
  
  // oEmbed discovery
  oembed: [
    /<link[^>]*rel=["']alternate["'][^>]*type=["']application\/json\+oembed["'][^>]*>/gi,
    /<link[^>]*rel=["']alternate["'][^>]*type=["']text\/xml\+oembed["'][^>]*>/gi,
  ],
  
  // NOTE: Do not strip general HTML comments. It can accidentally remove
  // critical structure in malformed HTML and break head/style loading.
};

// ── Remove bloat from HTML ──────────────────────────────────────────────────

function getHtmlHealth(html) {
  const stylesheetCount = (html.match(/<link\b[^>]*rel=["'][^"']*stylesheet[^"']*["'][^>]*>/gi) || []).length;
  return {
    hasHeadClose: /<\/head>/i.test(html),
    hasBodyClose: /<\/body>/i.test(html),
    stylesheetCount,
  };
}

function removeBloat(html) {
  let cleaned = html;
  const removedItems = {};
  
  for (const [category, patterns] of Object.entries(REMOVE_PATTERNS)) {
    let categoryCount = 0;
    for (const pattern of patterns) {
      const matches = cleaned.match(pattern);
      if (matches) {
        categoryCount += matches.length;
        cleaned = cleaned.replace(pattern, '');
      }
    }
    if (categoryCount > 0) {
      removedItems[category] = categoryCount;
    }
  }
  
  // Clean up multiple blank lines
  cleaned = cleaned.replace(/\n\s*\n\s*\n/g, '\n\n');
  
  // Calculate size reduction
  const originalSize = Buffer.byteLength(html, 'utf8');
  const cleanedSize = Buffer.byteLength(cleaned, 'utf8');
  const savings = originalSize - cleanedSize;
  
  return { cleaned, removedItems, originalSize, cleanedSize, savings };
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🧹 Remove WP Bloat - Job: ${JOB_ID}`);
  if (TARGET_URL) {
    console.log(`   Target URL: ${TARGET_URL}`);
  }
  console.log(`   Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : 'LIVE'}\n`);
  
  // Fetch all pages with rewritten_html
  let query = supabase
    .from('migration_pages')
    .select('id, url, rewritten_html')
    .eq('job_id', JOB_ID)
    .not('rewritten_html', 'is', null);

  if (TARGET_URL) {
    query = query.eq('url', TARGET_URL);
  }

  const { data: pages, error } = await query;
  
  if (error) {
    console.error('Error fetching pages:', error);
    return;
  }
  
  console.log(`Found ${pages.length} pages to process\n`);
  
  let totalOriginal = 0;
  let totalCleaned = 0;
  let totalSavings = 0;
  const allRemovedItems = {};
  let pagesUpdated = 0;
  
  for (const page of pages) {
    const result = removeBloat(page.rewritten_html);
    const beforeHealth = getHtmlHealth(page.rewritten_html);
    const afterHealth = getHtmlHealth(result.cleaned);
    const brokeHead = beforeHealth.hasHeadClose && !afterHealth.hasHeadClose;
    const lostAllStylesheets = beforeHealth.stylesheetCount > 0 && afterHealth.stylesheetCount === 0;
    const structurallyUnsafe = brokeHead || lostAllStylesheets;
    
    totalOriginal += result.originalSize;
    totalCleaned += result.cleanedSize;
    totalSavings += result.savings;
    
    // Aggregate removed items
    for (const [category, count] of Object.entries(result.removedItems)) {
      allRemovedItems[category] = (allRemovedItems[category] || 0) + count;
    }
    
    if (result.savings > 0) {
      const shortUrl = page.url.length > 50 ? '...' + page.url.slice(-47) : page.url;
      console.log(`✓ ${shortUrl}`);
      console.log(`  Removed: ${Object.entries(result.removedItems).map(([k, v]) => `${k}(${v})`).join(', ')}`);
      console.log(`  Savings: ${(result.savings / 1024).toFixed(1)}KB`);
      console.log(`  Health: head ${beforeHealth.hasHeadClose}→${afterHealth.hasHeadClose}, stylesheets ${beforeHealth.stylesheetCount}→${afterHealth.stylesheetCount}`);

      if (structurallyUnsafe) {
        console.log('  ⚠️  Skipped: transformation failed structural safety checks');
        continue;
      }
      
      if (!DRY_RUN) {
        await supabase
          .from('migration_pages')
          .update({ rewritten_html: result.cleaned })
          .eq('id', page.id);
        pagesUpdated++;
      }
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  console.log(`\nPages processed: ${pages.length}`);
  console.log(`Pages with bloat removed: ${pagesUpdated}`);
  console.log(`\nTotal size before: ${(totalOriginal / 1024).toFixed(1)} KB`);
  console.log(`Total size after:  ${(totalCleaned / 1024).toFixed(1)} KB`);
  console.log(`Total savings:     ${(totalSavings / 1024).toFixed(1)} KB (${((totalSavings / totalOriginal) * 100).toFixed(1)}%)`);
  
  console.log('\nItems removed:');
  for (const [category, count] of Object.entries(allRemovedItems).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${category}: ${count}`);
  }
  
  // Save report to job metadata
  if (!DRY_RUN) {
    console.log('\n💾 Saving report to job metadata...');
    const { data: job } = await supabase
      .from('migration_jobs')
      .select('metadata')
      .eq('id', JOB_ID)
      .single();
    
    await supabase
      .from('migration_jobs')
      .update({
        metadata: {
          ...(job?.metadata || {}),
          wp_bloat_removal: {
            completedAt: new Date().toISOString(),
            pagesProcessed: pages.length,
            totalSavingsBytes: totalSavings,
            totalSavingsPercent: ((totalSavings / totalOriginal) * 100).toFixed(1),
            itemsRemoved: allRemovedItems,
          },
        },
      })
      .eq('id', JOB_ID);
    
    console.log('✅ Done!\n');
  } else {
    console.log('\n⚠️  DRY RUN - no changes made. Run without --dry-run to apply.\n');
  }
}

main().catch(console.error);
