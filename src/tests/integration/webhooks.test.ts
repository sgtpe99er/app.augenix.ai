/**
 * Integration tests for /api/webhooks (Stripe webhook handler).
 *
 * All external dependencies are mocked. We test:
 * - Auth / signature validation layer
 * - Correct handler called per event type
 * - checkout.session.completed orchestration (asset generation, domain purchase)
 * - Subscription event handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSupabaseMock } from '../helpers/supabase-mock';

// ─── Mock all external modules ────────────────────────────────────────────────

const mockConstructEvent = vi.fn();
const mockSubscriptionsRetrieve = vi.fn();

vi.mock('@/libs/stripe/stripe-admin', () => ({
  stripeAdmin: {
    webhooks: { constructEvent: mockConstructEvent },
    subscriptions: { retrieve: mockSubscriptionsRetrieve },
  },
}));

const mockUpsertUserSubscription = vi.fn().mockResolvedValue(undefined);
vi.mock('@/features/account/controllers/upsert-user-subscription', () => ({
  upsertUserSubscription: mockUpsertUserSubscription,
}));

const mockUpsertPrice = vi.fn().mockResolvedValue(undefined);
vi.mock('@/features/pricing/controllers/upsert-price', () => ({
  upsertPrice: mockUpsertPrice,
}));

const mockUpsertProduct = vi.fn().mockResolvedValue(undefined);
vi.mock('@/features/pricing/controllers/upsert-product', () => ({
  upsertProduct: mockUpsertProduct,
}));

const mockGenerateAssets = vi.fn().mockResolvedValue({ success: true, assets: {}, errors: [] });
vi.mock('@/libs/ai/asset-generator', () => ({
  generateAssets: mockGenerateAssets,
}));

const mockSendPaymentConfirmationEmail = vi.fn().mockResolvedValue(undefined);
vi.mock('@/features/emails/send-payment-confirmation', () => ({
  sendPaymentConfirmationEmail: mockSendPaymentConfirmationEmail,
}));

const mockPurchaseDomain = vi.fn().mockResolvedValue(undefined);
vi.mock('@/libs/vercel/purchase-domain', () => ({
  purchaseDomain: mockPurchaseDomain,
}));

// Supabase mock with sensible defaults for all tables used in handleHostingPayment
let mockSupabase = createSupabaseMock();
vi.mock('@/libs/supabase/supabase-admin', () => ({
  get supabaseAdminClient() { return mockSupabase; },
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest(body: string, signature = 'valid-sig') {
  return new Request('http://localhost/api/webhooks', {
    method: 'POST',
    headers: { 'stripe-signature': signature, 'content-type': 'application/json' },
    body,
  });
}

function makeCheckoutEvent(overrides: Record<string, unknown> = {}) {
  return {
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test_123',
        mode: 'payment',
        customer: 'cus_test_123',
        subscription: null,
        payment_intent: 'pi_test_123',
        amount_subtotal: 30000,
        amount_total: 30000,
        metadata: {},
        ...overrides,
      },
    },
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/webhooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = createSupabaseMock({
      customers: { data: { id: 'user-abc' }, error: null },
      businesses: { data: { id: 'biz-1', business_name: 'Acme Co', industry: 'construction', target_audience: 'Homeowners', services_products: 'Plumbing' }, error: null },
      brand_assets: { data: { style_preference: 'modern', color_preference: 'blue', has_existing_logo: false, has_brand_colors: false }, error: null },
      hosting_payments: { data: null, error: null },
      deployed_websites: { data: null, error: null },
    });

    // Default: subscription retrieve returns price for 12-month plan
    mockSubscriptionsRetrieve.mockResolvedValue({
      items: { data: [{ price: { id: process.env.STRIPE_PRICE_12MO } }] },
    });
  });

  // ─── Signature / config validation ─────────────────────────────────────────

  it('returns 400 when stripe-signature header is missing', async () => {
    const req = new Request('http://localhost/api/webhooks', {
      method: 'POST',
      body: '{}',
    });
    const { POST } = await import('@/app/api/webhooks/route');
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 when signature verification fails', async () => {
    mockConstructEvent.mockImplementationOnce(() => {
      throw new Error('Invalid signature');
    });
    const req = makeRequest('{}', 'bad-sig');
    const { POST } = await import('@/app/api/webhooks/route');
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 200 for an unrecognised (non-relevant) event type', async () => {
    mockConstructEvent.mockReturnValueOnce({ type: 'payment_intent.created', data: { object: {} } });
    const req = makeRequest('{}');
    const { POST } = await import('@/app/api/webhooks/route');
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ received: true });
  });

  // ─── Product / price sync events ───────────────────────────────────────────

  it('calls upsertProduct on product.created', async () => {
    mockConstructEvent.mockReturnValueOnce({ type: 'product.created', data: { object: { id: 'prod_1' } } });
    const { POST } = await import('@/app/api/webhooks/route');
    await POST(makeRequest('{}'));
    expect(mockUpsertProduct).toHaveBeenCalledWith({ id: 'prod_1' });
  });

  it('calls upsertProduct on product.updated', async () => {
    mockConstructEvent.mockReturnValueOnce({ type: 'product.updated', data: { object: { id: 'prod_1' } } });
    const { POST } = await import('@/app/api/webhooks/route');
    await POST(makeRequest('{}'));
    expect(mockUpsertProduct).toHaveBeenCalledWith({ id: 'prod_1' });
  });

  it('calls upsertPrice on price.created', async () => {
    mockConstructEvent.mockReturnValueOnce({ type: 'price.created', data: { object: { id: 'price_1' } } });
    const { POST } = await import('@/app/api/webhooks/route');
    await POST(makeRequest('{}'));
    expect(mockUpsertPrice).toHaveBeenCalledWith({ id: 'price_1' });
  });

  // ─── Subscription events ───────────────────────────────────────────────────

  it('calls upsertUserSubscription on customer.subscription.created', async () => {
    mockConstructEvent.mockReturnValueOnce({
      type: 'customer.subscription.created',
      data: { object: { id: 'sub_1', customer: 'cus_1' } },
    });
    const { POST } = await import('@/app/api/webhooks/route');
    await POST(makeRequest('{}'));
    expect(mockUpsertUserSubscription).toHaveBeenCalledWith({
      subscriptionId: 'sub_1',
      customerId: 'cus_1',
      isCreateAction: false,
    });
  });

  it('calls upsertUserSubscription on customer.subscription.deleted', async () => {
    mockConstructEvent.mockReturnValueOnce({
      type: 'customer.subscription.deleted',
      data: { object: { id: 'sub_1', customer: 'cus_1' } },
    });
    const { POST } = await import('@/app/api/webhooks/route');
    await POST(makeRequest('{}'));
    expect(mockUpsertUserSubscription).toHaveBeenCalledWith({
      subscriptionId: 'sub_1',
      customerId: 'cus_1',
      isCreateAction: false,
    });
  });

  // ─── checkout.session.completed (one-time payment) ─────────────────────────

  it('calls generateAssets on one-time payment checkout', async () => {
    mockConstructEvent.mockReturnValueOnce(makeCheckoutEvent({ mode: 'payment' }));
    const { POST } = await import('@/app/api/webhooks/route');
    const res = await POST(makeRequest('{}'));

    expect(res.status).toBe(200);
    // generateAssets is fire-and-forget — it runs but we check it was invoked
    // Give the microtask queue time to flush
    await vi.waitFor(() => expect(mockGenerateAssets).toHaveBeenCalled(), { timeout: 500 });
  });

  it('calls generateAssets on subscription checkout', async () => {
    mockConstructEvent.mockReturnValueOnce(
      makeCheckoutEvent({ mode: 'subscription', subscription: 'sub_1' })
    );
    const { POST } = await import('@/app/api/webhooks/route');
    await POST(makeRequest('{}'));

    await vi.waitFor(() => expect(mockGenerateAssets).toHaveBeenCalled(), { timeout: 500 });
    expect(mockUpsertUserSubscription).toHaveBeenCalledWith({
      subscriptionId: 'sub_1',
      customerId: 'cus_test_123',
      isCreateAction: true,
    });
  });

  it('triggers purchaseDomain when pending_domain is in metadata', async () => {
    mockConstructEvent.mockReturnValueOnce(
      makeCheckoutEvent({
        mode: 'payment',
        metadata: {
          pending_domain: 'acmeplumbing.com',
          domain_vercel_price_cents: '1500',
        },
      })
    );
    const { POST } = await import('@/app/api/webhooks/route');
    await POST(makeRequest('{}'));

    await vi.waitFor(() => expect(mockPurchaseDomain).toHaveBeenCalled(), { timeout: 500 });
    expect(mockPurchaseDomain).toHaveBeenCalledWith(
      expect.objectContaining({ domain: 'acmeplumbing.com' })
    );
  });

  it('does NOT call purchaseDomain when no pending_domain in metadata', async () => {
    mockConstructEvent.mockReturnValueOnce(makeCheckoutEvent({ mode: 'payment', metadata: {} }));
    const { POST } = await import('@/app/api/webhooks/route');
    await POST(makeRequest('{}'));

    await new Promise((r) => setTimeout(r, 50));
    expect(mockPurchaseDomain).not.toHaveBeenCalled();
  });

  it('returns 200 even when no customer row exists (graceful skip)', async () => {
    mockSupabase = createSupabaseMock({
      customers: { data: null, error: { message: 'not found' } },
    });
    mockConstructEvent.mockReturnValueOnce(makeCheckoutEvent({ mode: 'payment' }));
    const { POST } = await import('@/app/api/webhooks/route');
    const res = await POST(makeRequest('{}'));
    expect(res.status).toBe(200);
  });
});
