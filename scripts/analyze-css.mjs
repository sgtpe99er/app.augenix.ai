/**
 * Phase 2.1: CSS Analysis
 * 
 * Analyzes CSS usage across all migrated pages to identify:
 * - Unused CSS rules (via PurgeCSS)
 * - CSS file sizes and usage percentages
 * - Duplicate CSS rules across files
 * - Potential savings
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { PurgeCSS } from 'purgecss';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

const JOB_ID = process.argv[2] || '57e617fe-45f8-4dff-8de8-fd702fd23d2f';

// ── Fetch all migrated pages HTML ───────────────────────────────────────────
async function fetchAllHtml() {
  console.log('Fetching all migrated HTML pages...');
  const { data: pages, error } = await supabase
    .from('migration_pages')
    .select('url, rewritten_html')
    .eq('job_id', JOB_ID)
    .not('rewritten_html', 'is', null);

  if (error) {
    console.error('Error fetching pages:', error);
    return [];
  }

  console.log(`Found ${pages.length} pages with HTML`);
  return pages;
}

// ── Extract CSS URLs from HTML ──────────────────────────────────────────────
function extractCssUrls(html) {
  const cssUrls = new Set();
  
  // Match <link rel="stylesheet" href="...">
  const linkRegex = /<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["']/gi;
  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    cssUrls.add(match[1]);
  }
  
  // Also match href before rel
  const linkRegex2 = /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']stylesheet["']/gi;
  while ((match = linkRegex2.exec(html)) !== null) {
    cssUrls.add(match[1]);
  }
  
  return Array.from(cssUrls);
}

// ── Fetch CSS content ───────────────────────────────────────────────────────
async function fetchCss(url) {
  try {
    const res = await fetch(url, { 
      headers: { 'User-Agent': 'Mozilla/5.0 FWD-CSS-Analyzer/1.0' },
      signal: AbortSignal.timeout(10000)
    });
    if (!res.ok) return null;
    return await res.text();
  } catch (err) {
    console.error(`Failed to fetch ${url}:`, err.message);
    return null;
  }
}

// ── Analyze CSS with PurgeCSS ───────────────────────────────────────────────
async function analyzeCssUsage(cssContent, cssUrl, allHtml) {
  try {
    const result = await new PurgeCSS().purge({
      content: allHtml.map(html => ({ raw: html, extension: 'html' })),
      css: [{ raw: cssContent }],
      safelist: {
        // Keep common dynamic classes
        standard: [/^active/, /^open/, /^show/, /^hide/, /^is-/, /^has-/],
        deep: [/slick/, /swiper/, /owl/, /carousel/],
      },
    });

    const originalSize = cssContent.length;
    const purgedSize = result[0]?.css?.length || 0;
    const savings = originalSize - purgedSize;
    const savingsPercent = ((savings / originalSize) * 100).toFixed(1);

    return {
      url: cssUrl,
      originalSize,
      purgedSize,
      savings,
      savingsPercent: parseFloat(savingsPercent),
      purgedCss: result[0]?.css || '',
    };
  } catch (err) {
    console.error(`PurgeCSS error for ${cssUrl}:`, err.message);
    return null;
  }
}

// ── Find duplicate rules across CSS files ───────────────────────────────────
function findDuplicateRules(cssContents) {
  const ruleMap = new Map(); // rule -> [files that contain it]
  
  for (const { url, content } of cssContents) {
    // Simple rule extraction (selector { ... })
    const ruleRegex = /([^{}]+)\{([^{}]+)\}/g;
    let match;
    while ((match = ruleRegex.exec(content)) !== null) {
      const selector = match[1].trim();
      const body = match[2].trim();
      const rule = `${selector} { ${body} }`;
      
      if (!ruleMap.has(rule)) {
        ruleMap.set(rule, []);
      }
      ruleMap.get(rule).push(url);
    }
  }
  
  // Find rules that appear in multiple files
  const duplicates = [];
  for (const [rule, files] of ruleMap.entries()) {
    if (files.length > 1) {
      duplicates.push({ rule: rule.substring(0, 100), files, count: files.length });
    }
  }
  
  return duplicates.sort((a, b) => b.count - a.count).slice(0, 50);
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n📊 CSS Analysis for Job: ${JOB_ID}\n`);
  
  // 1. Fetch all HTML
  const pages = await fetchAllHtml();
  if (pages.length === 0) {
    console.error('No pages found');
    return;
  }
  
  const allHtml = pages.map(p => p.rewritten_html);
  
  // 2. Extract unique CSS URLs from all pages
  const allCssUrls = new Set();
  for (const page of pages) {
    const urls = extractCssUrls(page.rewritten_html);
    urls.forEach(url => allCssUrls.add(url));
  }
  
  console.log(`\nFound ${allCssUrls.size} unique CSS files\n`);
  
  // 3. Fetch and analyze each CSS file
  const cssContents = [];
  const analysisResults = [];
  
  for (const cssUrl of allCssUrls) {
    // Skip external CSS (Google Fonts, etc.)
    if (cssUrl.includes('fonts.googleapis.com') || cssUrl.includes('fonts.gstatic.com')) {
      console.log(`⏭️  Skipping font CSS: ${cssUrl.substring(0, 60)}...`);
      continue;
    }
    
    console.log(`📥 Fetching: ${cssUrl.substring(0, 80)}...`);
    const content = await fetchCss(cssUrl);
    
    if (!content) {
      console.log(`   ❌ Failed to fetch`);
      continue;
    }
    
    cssContents.push({ url: cssUrl, content });
    
    console.log(`   🔍 Analyzing with PurgeCSS...`);
    const analysis = await analyzeCssUsage(content, cssUrl, allHtml);
    
    if (analysis) {
      analysisResults.push(analysis);
      console.log(`   ✅ ${(analysis.originalSize / 1024).toFixed(1)}KB → ${(analysis.purgedSize / 1024).toFixed(1)}KB (${analysis.savingsPercent}% savings)`);
    }
  }
  
  // 4. Find duplicate rules
  console.log('\n🔄 Finding duplicate rules across files...');
  const duplicates = findDuplicateRules(cssContents);
  
  // 5. Generate report
  console.log('\n' + '='.repeat(80));
  console.log('📊 CSS ANALYSIS REPORT');
  console.log('='.repeat(80));
  
  const totalOriginal = analysisResults.reduce((sum, r) => sum + r.originalSize, 0);
  const totalPurged = analysisResults.reduce((sum, r) => sum + r.purgedSize, 0);
  const totalSavings = totalOriginal - totalPurged;
  
  console.log(`\n📁 Total CSS Files Analyzed: ${analysisResults.length}`);
  console.log(`📄 Total HTML Pages: ${pages.length}`);
  console.log(`\n💾 Size Summary:`);
  console.log(`   Original Total: ${(totalOriginal / 1024).toFixed(1)} KB`);
  console.log(`   After PurgeCSS: ${(totalPurged / 1024).toFixed(1)} KB`);
  console.log(`   Potential Savings: ${(totalSavings / 1024).toFixed(1)} KB (${((totalSavings / totalOriginal) * 100).toFixed(1)}%)`);
  
  console.log(`\n📋 Per-File Breakdown (sorted by savings):`);
  analysisResults
    .sort((a, b) => b.savings - a.savings)
    .forEach((r, i) => {
      const shortUrl = r.url.length > 60 ? '...' + r.url.slice(-57) : r.url;
      console.log(`   ${i + 1}. ${shortUrl}`);
      console.log(`      ${(r.originalSize / 1024).toFixed(1)}KB → ${(r.purgedSize / 1024).toFixed(1)}KB (${r.savingsPercent}% savings)`);
    });
  
  if (duplicates.length > 0) {
    console.log(`\n🔄 Top Duplicate Rules (found in multiple files):`);
    duplicates.slice(0, 10).forEach((d, i) => {
      console.log(`   ${i + 1}. Found in ${d.count} files: ${d.rule.substring(0, 50)}...`);
    });
  }
  
  // 6. Save report to job metadata
  const report = {
    analyzedAt: new Date().toISOString(),
    cssFilesAnalyzed: analysisResults.length,
    htmlPagesAnalyzed: pages.length,
    totalOriginalBytes: totalOriginal,
    totalPurgedBytes: totalPurged,
    potentialSavingsBytes: totalSavings,
    potentialSavingsPercent: ((totalSavings / totalOriginal) * 100).toFixed(1),
    perFileResults: analysisResults.map(r => ({
      url: r.url,
      originalSize: r.originalSize,
      purgedSize: r.purgedSize,
      savingsPercent: r.savingsPercent,
    })),
    duplicateRulesCount: duplicates.length,
  };
  
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
        css_analysis: report,
      },
    })
    .eq('id', JOB_ID);
  
  console.log('✅ Report saved!\n');
}

main().catch(console.error);
