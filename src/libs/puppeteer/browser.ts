import puppeteerCore from 'puppeteer-core';

import chromium from '@sparticuz/chromium';

/**
 * Launch a Puppeteer browser that works both locally (dev) and on Vercel serverless.
 *
 * - Local: uses the full `puppeteer` package's bundled Chrome
 * - Vercel: uses `@sparticuz/chromium` (Lambda-compatible Chromium binary)
 */
export async function launchBrowser() {
  const isVercel = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;

  if (isVercel) {
    return puppeteerCore.launch({
      args: chromium.args,
      defaultViewport: null,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }

  // Local dev — use full puppeteer (has its own Chrome)
  const puppeteer = await import('puppeteer');
  return puppeteer.default.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
}
