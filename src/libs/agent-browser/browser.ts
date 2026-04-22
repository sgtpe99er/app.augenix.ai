/**
 * Get the fully-rendered HTML of a page using Playwright (Chromium).
 * This handles JS-rendered sites (GoDaddy, Wix, Squarespace, etc.) correctly,
 * including hours widgets, dynamic phone links, etc.
 */
export async function getPageHtml(url: string, timeoutMs = 20000): Promise<string> {
  console.log(`[Browser] Launching Playwright for ${url}`);

  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });

    // Wait a moment for JS to settle
    await page.waitForTimeout(2000);

    const html = await page.content();
    console.log(`[Browser] Got rendered HTML for ${url}, length: ${html.length}`);
    return html;
  } finally {
    await browser.close();
  }
}
