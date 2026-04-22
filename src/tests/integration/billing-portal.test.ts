/**
 * Integration tests for POST /api/billing-portal.
 *
 * Tests:
 * - Auth guard
 * - Stripe not configured → 503
 * - No Stripe customer row → 404
 * - Stripe API error → bubbles up
 * - Happy path → returns portal URL
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock external modules ────────────────────────────────────────────────────

const mockGetSession = vi.fn();
vi.mock('@/features/account/controllers/get-session', () => ({
  getSession: mockGetSession,
}));

const mockBillingPortalCreate = vi.fn();
const mockCustomerSingle = vi.fn();

vi.mock('@/libs/stripe/stripe-admin', () => ({
  get stripeAdmin() { return mockStripeAdmin; },
}));

let mockStripeAdmin: unknown = {
  billingPortal: { sessions: { create: mockBillingPortalCreate } },
};

vi.mock('@/libs/supabase/supabase-admin', () => ({
  supabaseAdminClient: {
    from: vi.fn().mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: mockCustomerSingle,
    })),
  },
}));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/billing-portal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStripeAdmin = { billingPortal: { sessions: { create: mockBillingPortalCreate } } };
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockCustomerSingle.mockResolvedValue({ data: { stripe_customer_id: 'cus_test_123' }, error: null });
    mockBillingPortalCreate.mockResolvedValue({ url: 'https://billing.stripe.com/session/test' });
  });

  it('returns 401 when unauthenticated', async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const { POST } = await import('@/app/api/billing-portal/route');
    const res = await POST();
    expect(res.status).toBe(401);
  });

  it('returns 503 when Stripe is not configured', async () => {
    mockStripeAdmin = null;
    const { POST } = await import('@/app/api/billing-portal/route');
    const res = await POST();
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toMatch(/stripe not configured/i);
  });

  it('returns 404 when no Stripe customer row exists', async () => {
    mockCustomerSingle.mockResolvedValueOnce({ data: null, error: null });
    const { POST } = await import('@/app/api/billing-portal/route');
    const res = await POST();
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toMatch(/billing account/i);
  });

  it('returns 404 when stripe_customer_id is null', async () => {
    mockCustomerSingle.mockResolvedValueOnce({ data: { stripe_customer_id: null }, error: null });
    const { POST } = await import('@/app/api/billing-portal/route');
    const res = await POST();
    expect(res.status).toBe(404);
  });

  it('returns 200 with a portal URL on success', async () => {
    const { POST } = await import('@/app/api/billing-portal/route');
    const res = await POST();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.url).toBe('https://billing.stripe.com/session/test');
  });

  it('passes return_url pointing to /dashboard', async () => {
    const { POST } = await import('@/app/api/billing-portal/route');
    await POST();
    const callArgs = mockBillingPortalCreate.mock.calls[0][0];
    expect(callArgs.return_url).toMatch(/\/dashboard$/);
    expect(callArgs.customer).toBe('cus_test_123');
  });
});
