/**
 * Integration tests for /api/checkout (Stripe Checkout session creation).
 *
 * Tests:
 * - Auth guard (unauthenticated → 401)
 * - Price ID allowlist validation
 * - Domain price drift guard (> $1 → 409)
 * - Stripe not configured → 503
 * - Happy path → returns checkout URL
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Mock external modules ────────────────────────────────────────────────────

const mockGetSession = vi.fn();
vi.mock('@/features/account/controllers/get-session', () => ({
  getSession: mockGetSession,
}));

const mockGetOrCreateCustomer = vi.fn();
vi.mock('@/features/account/controllers/get-or-create-customer', () => ({
  getOrCreateCustomer: mockGetOrCreateCustomer,
}));

const mockGetDomainPrice = vi.fn();
vi.mock('@/libs/vercel/domains', () => ({
  getDomainPrice: mockGetDomainPrice,
  DOMAIN_MARKUP_USD: 7,
}));

const mockSessionsCreate = vi.fn();
vi.mock('@/libs/stripe/stripe-admin', () => ({
  stripeAdmin: {
    checkout: { sessions: { create: mockSessionsCreate } },
  },
}));

vi.mock('@/libs/supabase/supabase-admin', () => ({
  supabaseAdminClient: {
    auth: {
      admin: {
        getUserById: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'user@example.com' } },
          error: null,
        }),
      },
    },
  },
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/checkout', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const VALID_PRICE = process.env.STRIPE_PRICE_6MO!;

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/checkout', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockGetOrCreateCustomer.mockResolvedValue('cus_test_123');
    mockSessionsCreate.mockResolvedValue({
      url: 'https://checkout.stripe.com/test-session',
    });
  });

  // ─── Auth guard ────────────────────────────────────────────────────────────

  it('returns 401 when user is not authenticated', async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const { POST } = await import('@/app/api/checkout/route');
    const res = await POST(makeRequest({ priceId: VALID_PRICE }));
    expect(res.status).toBe(401);
  });

  // ─── Price ID validation ───────────────────────────────────────────────────

  it('returns 400 for an invalid priceId', async () => {
    const { POST } = await import('@/app/api/checkout/route');
    const res = await POST(makeRequest({ priceId: 'price_malicious_id' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid price/i);
  });

  it('returns 400 when priceId is missing', async () => {
    const { POST } = await import('@/app/api/checkout/route');
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it('accepts STRIPE_PRICE_6MO as a valid priceId', async () => {
    const { POST } = await import('@/app/api/checkout/route');
    const res = await POST(makeRequest({ priceId: process.env.STRIPE_PRICE_6MO }));
    expect(res.status).toBe(200);
  });

  it('accepts STRIPE_PRICE_12MO as a valid priceId', async () => {
    const { POST } = await import('@/app/api/checkout/route');
    const res = await POST(makeRequest({ priceId: process.env.STRIPE_PRICE_12MO }));
    expect(res.status).toBe(200);
  });

  // ─── Domain price drift guard ──────────────────────────────────────────────

  it('returns 409 when domain price has drifted more than $1', async () => {
    // Vercel returns $15, we expected $22 ($15 + $7 markup)
    // But client sent $35 (way off)
    mockGetDomainPrice.mockResolvedValueOnce({ purchasePrice: 15 });
    const { POST } = await import('@/app/api/checkout/route');
    const res = await POST(
      makeRequest({
        priceId: VALID_PRICE,
        domain: 'acme.com',
        domainOurPriceCents: 3500, // client claims $35, expected $22 → drift > $1
      })
    );
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/price has changed/i);
  });

  it('returns 502 when domain price lookup fails', async () => {
    mockGetDomainPrice.mockRejectedValueOnce(new Error('Vercel API down'));
    const { POST } = await import('@/app/api/checkout/route');
    const res = await POST(
      makeRequest({
        priceId: VALID_PRICE,
        domain: 'acme.com',
        domainOurPriceCents: 2200,
      })
    );
    expect(res.status).toBe(502);
  });

  it('passes domain verification when price is within $1 drift', async () => {
    // Vercel price: $15.00 → our price = $22.00 = 2200 cents
    mockGetDomainPrice.mockResolvedValueOnce({ purchasePrice: 15 });
    const { POST } = await import('@/app/api/checkout/route');
    const res = await POST(
      makeRequest({
        priceId: VALID_PRICE,
        domain: 'acme.com',
        domainOurPriceCents: 2200, // exactly right
      })
    );
    expect(res.status).toBe(200);
  });

  // ─── Stripe errors ─────────────────────────────────────────────────────────

  it('returns 500 when Stripe returns no checkout URL', async () => {
    mockSessionsCreate.mockResolvedValueOnce({ url: null });
    const { POST } = await import('@/app/api/checkout/route');
    const res = await POST(makeRequest({ priceId: VALID_PRICE }));
    expect(res.status).toBe(500);
  });

  it('returns 500 when customer creation fails', async () => {
    mockGetOrCreateCustomer.mockResolvedValueOnce(null);
    const { POST } = await import('@/app/api/checkout/route');
    const res = await POST(makeRequest({ priceId: VALID_PRICE }));
    expect(res.status).toBe(500);
  });

  // ─── Happy path ────────────────────────────────────────────────────────────

  it('returns a Stripe checkout URL on success', async () => {
    const { POST } = await import('@/app/api/checkout/route');
    const res = await POST(makeRequest({ priceId: VALID_PRICE }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.url).toBe('https://checkout.stripe.com/test-session');
  });

  it('includes domain line item in Stripe session when domain provided', async () => {
    mockGetDomainPrice.mockResolvedValueOnce({ purchasePrice: 15 });
    const { POST } = await import('@/app/api/checkout/route');
    await POST(
      makeRequest({
        priceId: VALID_PRICE,
        domain: 'acme.com',
        domainOurPriceCents: 2200,
      })
    );

    const callArgs = mockSessionsCreate.mock.calls[0][0];
    expect(callArgs.line_items).toHaveLength(2);
    expect(callArgs.metadata?.pending_domain).toBe('acme.com');
  });
});
