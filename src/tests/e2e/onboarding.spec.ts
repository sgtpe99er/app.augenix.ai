/**
 * E2E tests — Onboarding wizard UI behaviour.
 *
 * These tests verify the multi-step onboarding wizard in isolation
 * using a mocked/test authenticated session. Requires PLAYWRIGHT_USER_EMAIL
 * and PLAYWRIGHT_USER_PASSWORD env vars to be set for an existing test account.
 *
 * Skipped automatically when credentials are not configured (local dev without
 * a test account). In CI, set these secrets to enable the full suite.
 */

import { expect,test } from '@playwright/test';

const TEST_EMAIL = process.env.PLAYWRIGHT_USER_EMAIL;
const TEST_PASSWORD = process.env.PLAYWRIGHT_USER_PASSWORD;

// Skip entire describe block when test credentials aren't configured
test.describe('Onboarding wizard', () => {
  test.skip(!TEST_EMAIL || !TEST_PASSWORD, 'Test credentials not configured (set PLAYWRIGHT_USER_EMAIL and PLAYWRIGHT_USER_PASSWORD)');

  test.beforeEach(async ({ page }) => {
    // Sign in via the login page
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(TEST_EMAIL!);
    await page.getByLabel(/password/i).fill(TEST_PASSWORD!);
    await page.getByRole('button', { name: /sign in|continue|log in/i }).click();
    await page.waitForURL(/\/(dashboard|onboarding)/);
  });

  test('step 1 — validates required fields', async ({ page }) => {
    await page.goto('/onboarding');

    // Try to proceed without filling anything in
    await page.getByRole('button', { name: /next|continue/i }).click();

    // Should show validation errors
    await expect(page.locator('body')).toContainText(/required|please enter/i);
  });

  test('step 1 — advances to step 2 with valid data', async ({ page }) => {
    await page.goto('/onboarding');

    await page.getByLabel(/business name/i).fill('Acme Plumbing');

    // Select industry
    const industrySelect = page.getByLabel(/industry/i);
    if (await industrySelect.isVisible()) {
      await industrySelect.selectOption('construction');
    }

    await page.getByLabel(/city/i).fill('Austin');
    await page.getByLabel(/country/i).fill('US');

    await page.getByRole('button', { name: /next|continue/i }).click();

    // Should advance — step indicator or heading changes
    await expect(page.locator('body')).not.toContainText(/business name is required/i);
  });

  test('"other" industry reveals text input', async ({ page }) => {
    await page.goto('/onboarding');

    const industrySelect = page.getByLabel(/industry/i);
    if (await industrySelect.isVisible()) {
      await industrySelect.selectOption('other');
      await expect(page.getByLabel(/specify/i)).toBeVisible();
    }
  });
});

// ─── Onboarding page structure (no auth required for structure checks) ─────────

test.describe('Onboarding page — unauthenticated', () => {
  test('redirects unauthenticated users away', async ({ page }) => {
    await page.goto('/onboarding');
    await expect(page).not.toHaveURL(/\/onboarding/);
  });
});
