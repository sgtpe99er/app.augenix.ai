import Stripe from 'stripe';
import { NextRequest } from 'next/server';
import { getSession } from '@/features/account/controllers/get-session';
import { getOrCreateCustomer } from '@/features/account/controllers/get-or-create-customer';
import { supabaseAdminClient } from '@/libs/supabase/supabase-admin';
import { stripeAdmin } from '@/libs/stripe/stripe-admin';
import { getDomainPrice, DOMAIN_MARKUP_USD } from '@/libs/vercel/domains';

const ALLOWED_PRICE_IDS = new Set([
  process.env.STRIPE_PRICE_1MO,
  process.env.STRIPE_PRICE_6MO,
  process.env.STRIPE_PRICE_12MO,
  process.env.STRIPE_PRICE_LIFETIME,
]);

interface CheckoutBody {
  priceId: string;
  domain?: string;
  domainOurPriceCents?: number;
  successUrl?: string;
  cancelUrl?: string;
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  if (!stripeAdmin) return Response.json({ error: 'Stripe not configured' }, { status: 503 });

  const { priceId, domain, domainOurPriceCents, successUrl, cancelUrl } = await req.json() as CheckoutBody;

  if (!priceId || !ALLOWED_PRICE_IDS.has(priceId)) {
    return Response.json({ error: 'Invalid price' }, { status: 400 });
  }

  const { data: authUser } = await supabaseAdminClient.auth.admin.getUserById(session.user.id);
  if (!authUser?.user?.email) return Response.json({ error: 'User not found' }, { status: 404 });

  const customerId = await getOrCreateCustomer({
    userId: session.user.id,
    email: authUser.user.email,
  });
  if (!customerId) return Response.json({ error: 'Could not create Stripe customer' }, { status: 500 });

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    { price: priceId, quantity: 1 },
  ];

  const metadata: Record<string, string> = {};

  // If a domain was selected, verify the price server-side then add as a one-time line item
  if (domain && domainOurPriceCents) {
    let verifiedVercelPriceCents: number;
    try {
      const priceData = await getDomainPrice(domain);
      verifiedVercelPriceCents = Math.round(priceData.purchasePrice * 100);
      const expectedOurPriceCents = verifiedVercelPriceCents + DOMAIN_MARKUP_USD * 100;
      // Allow up to $1 drift in case of minor price fluctuation
      if (Math.abs(expectedOurPriceCents - domainOurPriceCents) > 100) {
        return Response.json({ error: 'Domain price has changed. Please refresh and try again.' }, { status: 409 });
      }
    } catch {
      return Response.json({ error: 'Could not verify domain price. Please try again.' }, { status: 502 });
    }

    const domainProductId = process.env.STRIPE_DOMAIN_PRODUCT_ID;

    lineItems.push({
      price_data: {
        currency: 'usd',
        ...(domainProductId
          ? { product: domainProductId }
          : {
              product_data: {
                name: `Domain: ${domain}`,
                description: '1-year domain registration',
              },
            }),
        unit_amount: Math.round(verifiedVercelPriceCents + DOMAIN_MARKUP_USD * 100),
        recurring: {
          interval: 'year',
        },
      },
      quantity: 1,
    });

    metadata.pending_domain = domain;
    metadata.domain_vercel_price_cents = verifiedVercelPriceCents.toString();
  }

  const checkoutSession = await stripeAdmin.checkout.sessions.create({
    payment_method_types: ['card'],
    billing_address_collection: 'required',
    customer: customerId,
    customer_update: { address: 'auto' },
    line_items: lineItems,
    mode: 'subscription',
    allow_promotion_codes: true,
    subscription_data: Object.keys(metadata).length > 0 ? { metadata } : undefined,
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    success_url: successUrl ? `${baseUrl}${successUrl}` : `${baseUrl}/dashboard?payment=success`,
    cancel_url: cancelUrl ? `${baseUrl}${cancelUrl}` : `${baseUrl}/payment`,
  });

  if (!checkoutSession.url) return Response.json({ error: 'Could not create checkout session' }, { status: 500 });

  return Response.json({ url: checkoutSession.url });
}
