/**
 * E2E tests — Auth redirects & route protection.
 *
 * These tests verify that middleware correctly guards protected routes
 * and that public routes are accessible without auth. They do NOT
 * require Stripe or AI integrations — just a running Next.js server.
 */

import { expect,test } from '@playwright/test';

// ─── Public routes ────────────────────────────────────────────────────────────

test.describe('Public routes', () => {
  test('landing page loads', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/');
    // Page should not show an error
    await expect(page.locator('body')).not.toContainText('Application error');
  });

  test('login page is accessible without auth', async ({ page }) => {
    await page.goto('/login');
    // Should stay on login or be redirected to a login flow — not to dashboard
    await expect(page).not.toHaveURL('/dashboard');
  });
});

// ─── Protected routes — unauthenticated redirects ─────────────────────────────

test.describe('Protected routes redirect unauthenticated users', () => {
  test('/dashboard redirects to login', async ({ page }) => {
    await page.goto('/dashboard');
    // Middleware should redirect away from /dashboard
    await expect(page).not.toHaveURL(/\/dashboard/);
  });

  test('/onboarding redirects to login', async ({ page }) => {
    await page.goto('/onboarding');
    await expect(page).not.toHaveURL(/\/onboarding/);
  });

  test('/payment redirects to login', async ({ page }) => {
    await page.goto('/payment');
    await expect(page).not.toHaveURL(/\/payment/);
  });

  test('/admin redirects away for unauthenticated users', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).not.toHaveURL(/\/admin/);
  });
});

// ─── API routes — unauthenticated return 401 ──────────────────────────────────

test.describe('API routes reject unauthenticated requests', () => {
  test('/api/checkout returns 401 without auth', async ({ request }) => {
    const res = await request.post('/api/checkout', {
      data: { priceId: 'price_test' },
    });
    expect(res.status()).toBe(401);
  });

  test('/api/onboarding/save returns 401 without auth', async ({ request }) => {
    const res = await request.post('/api/onboarding/save', {
      data: { step1: {} },
    });
    expect(res.status()).toBe(401);
  });

  test('/api/edit-requests returns 401 without auth', async ({ request }) => {
    const res = await request.post('/api/edit-requests', {
      data: {},
    });
    expect(res.status()).toBe(401);
  });

  test('/api/admin/provision-site returns 401 without auth', async ({ request }) => {
    const res = await request.post('/api/admin/provision-site', {
      data: {},
    });
    // Either 401 (no auth) or 403 (auth but not admin)
    expect([401, 403]).toContain(res.status());
  });
});
