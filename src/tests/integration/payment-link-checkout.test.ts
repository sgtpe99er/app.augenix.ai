/**
 * Integration tests for POST /api/pay/[token]/checkout.
 *
 * Tests:
 * - Stripe not configured → 500
 * - Invalid / expired payment link → 404 / 410
 * - User not found → 404
 * - Customer creation failure → 500
 * - Price ID selection from allowed list
 * - hosting_months metadata set correctly for one-time prices
 * - Subscription mode set for recurring prices
 * - Happy path → returns checkout URL
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Mock external modules ────────────────────────────────────────────────────

const mockGetOrCreateCustomer = vi.fn();
vi.mock('@/features/account/controllers/get-or-create-customer', () => ({
  getOrCreateCustomer: mockGetOrCreateCustomer,
}));

const mockPricesRetrieve = vi.fn();
const mockSessionsCreate = vi.fn();

vi.mock('@/libs/stripe/stripe-admin', () => ({
  get stripeAdmin() { return mockStripe; },
}));

let mockStripe: unknown = {
  prices: { retrieve: mockPricesRetrieve },
  checkout: { sessions: { create: mockSessionsCreate } },
};

const mockPaymentLinkSingle = vi.fn();
const mockGetUserById = vi.fn();

vi.mock('@/libs/supabase/supabase-admin', () => ({
  supabaseAdminClient: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: mockPaymentLinkSingle,
    }),
    auth: { admin: { getUserById: mockGetUserById } },
  },
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(token: string, body?: Record<string, unknown>) {
  return new NextRequest(`http://localhost/api/pay/${token}/checkout`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function makeParams(token: string) {
  return { params: Promise.resolve({ token }) };
}

const VALID_LINK = {
  token: 'valid-token-abc',
  user_id: 'user-1',
  stripe_price_id: process.env.STRIPE_PRICE_6MO,
  stripe_price_ids: [process.env.STRIPE_PRICE_6MO, process.env.STRIPE_PRICE_12MO],
  used: false,
  expires_at: new Date(Date.now() + 86400_000).toISOString(), // 1 day from now
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/pay/[token]/checkout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStripe = {
      prices: { retrieve: mockPricesRetrieve },
      checkout: { sessions: { create: mockSessionsCreate } },
    };

    mockPaymentLinkSingle.mockResolvedValue({ data: VALID_LINK, error: null });
    mockGetUserById.mockResolvedValue({ data: { user: { email: 'customer@example.com' } }, error: null });
    mockGetOrCreateCustomer.mockResolvedValue('cus_test_123');
    mockPricesRetrieve.mockResolvedValue({ type: 'one_time' });
    mockSessionsCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/pay/test' });
  });

  // ─── Stripe config guard ───────────────────────────────────────────────────

  it('returns 500 when Stripe is not configured', async () => {
    mockStripe = null;
    const { POST } = await import('@/app/api/pay/[token]/checkout/route');
    const res = await POST(makeRequest('valid-token-abc'), makeParams('valid-token-abc'));
    expect(res.status).toBe(500);
  });

  // ─── Link validation ───────────────────────────────────────────────────────

  it('returns 404 when token is not found', async () => {
    mockPaymentLinkSingle.mockResolvedValueOnce({ data: null, error: { message: 'not found' } });
    const { POST } = await import('@/app/api/pay/[token]/checkout/route');
    const res = await POST(makeRequest('bad-token'), makeParams('bad-token'));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toMatch(/invalid or expired/i);
  });

  it('returns 410 when payment link has expired', async () => {
    mockPaymentLinkSingle.mockResolvedValueOnce({
      data: { ...VALID_LINK, expires_at: new Date(Date.now() - 1000).toISOString() },
      error: null,
    });
    const { POST } = await import('@/app/api/pay/[token]/checkout/route');
    const res = await POST(makeRequest('expired-token'), makeParams('expired-token'));
    expect(res.status).toBe(410);
    const body = await res.json();
    expect(body.error).toMatch(/expired/i);
  });

  // ─── User / customer guards ────────────────────────────────────────────────

  it('returns 404 when user has no email', async () => {
    mockGetUserById.mockResolvedValueOnce({ data: { user: null }, error: null });
    const { POST } = await import('@/app/api/pay/[token]/checkout/route');
    const res = await POST(makeRequest('valid-token-abc'), makeParams('valid-token-abc'));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toMatch(/user not found/i);
  });

  it('returns 500 when customer creation fails', async () => {
    mockGetOrCreateCustomer.mockResolvedValueOnce(null);
    const { POST } = await import('@/app/api/pay/[token]/checkout/route');
    const res = await POST(makeRequest('valid-token-abc'), makeParams('valid-token-abc'));
    expect(res.status).toBe(500);
  });

  // ─── Price ID selection ────────────────────────────────────────────────────

  it('uses the first allowed price when no priceId in body', async () => {
    const { POST } = await import('@/app/api/pay/[token]/checkout/route');
    await POST(makeRequest('valid-token-abc'), makeParams('valid-token-abc'));
    expect(mockPricesRetrieve).toHaveBeenCalledWith(process.env.STRIPE_PRICE_6MO);
  });

  it('uses a body-supplied priceId when it is in the allowed list', async () => {
    const { POST } = await import('@/app/api/pay/[token]/checkout/route');
    await POST(makeRequest('valid-token-abc', { priceId: process.env.STRIPE_PRICE_12MO }), makeParams('valid-token-abc'));
    expect(mockPricesRetrieve).toHaveBeenCalledWith(process.env.STRIPE_PRICE_12MO);
  });

  it('falls back to first allowed price when body priceId is not in allowed list', async () => {
    const { POST } = await import('@/app/api/pay/[token]/checkout/route');
    await POST(makeRequest('valid-token-abc', { priceId: 'price_attacker_id' }), makeParams('valid-token-abc'));
    expect(mockPricesRetrieve).toHaveBeenCalledWith(process.env.STRIPE_PRICE_6MO);
  });

  // ─── Payment mode ──────────────────────────────────────────────────────────

  it('creates a "payment" mode session for one_time prices', async () => {
    mockPricesRetrieve.mockResolvedValueOnce({ type: 'one_time' });
    const { POST } = await import('@/app/api/pay/[token]/checkout/route');
    await POST(makeRequest('valid-token-abc'), makeParams('valid-token-abc'));
    expect(mockSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'payment' })
    );
  });

  it('creates a "subscription" mode session for recurring prices', async () => {
    mockPricesRetrieve.mockResolvedValueOnce({ type: 'recurring' });
    const { POST } = await import('@/app/api/pay/[token]/checkout/route');
    await POST(makeRequest('valid-token-abc'), makeParams('valid-token-abc'));
    expect(mockSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'subscription' })
    );
  });

  it('includes hosting_months metadata for one-time 12-month price', async () => {
    mockPricesRetrieve.mockResolvedValueOnce({ type: 'one_time' });
    mockPaymentLinkSingle.mockResolvedValueOnce({
      data: {
        ...VALID_LINK,
        stripe_price_id: process.env.STRIPE_PRICE_12MO,
        stripe_price_ids: [process.env.STRIPE_PRICE_12MO],
      },
      error: null,
    });
    const { POST } = await import('@/app/api/pay/[token]/checkout/route');
    await POST(makeRequest('valid-token-abc'), makeParams('valid-token-abc'));

    const callArgs = mockSessionsCreate.mock.calls[0][0];
    expect(callArgs.metadata?.hosting_months).toBe('12');
  });

  it('does NOT include metadata for subscription mode', async () => {
    mockPricesRetrieve.mockResolvedValueOnce({ type: 'recurring' });
    const { POST } = await import('@/app/api/pay/[token]/checkout/route');
    await POST(makeRequest('valid-token-abc'), makeParams('valid-token-abc'));

    const callArgs = mockSessionsCreate.mock.calls[0][0];
    expect(callArgs.metadata).toBeUndefined();
  });

  // ─── Happy path ────────────────────────────────────────────────────────────

  it('returns 200 with checkout URL', async () => {
    const { POST } = await import('@/app/api/pay/[token]/checkout/route');
    const res = await POST(makeRequest('valid-token-abc'), makeParams('valid-token-abc'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.url).toBe('https://checkout.stripe.com/pay/test');
  });

  it('includes the token in success_url and cancel_url', async () => {
    const { POST } = await import('@/app/api/pay/[token]/checkout/route');
    await POST(makeRequest('valid-token-abc'), makeParams('valid-token-abc'));
    const callArgs = mockSessionsCreate.mock.calls[0][0];
    expect(callArgs.success_url).toMatch(/valid-token-abc/);
    expect(callArgs.cancel_url).toMatch(/valid-token-abc/);
  });
});
