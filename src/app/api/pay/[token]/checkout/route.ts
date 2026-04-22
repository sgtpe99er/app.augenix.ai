import { NextRequest } from 'next/server';
import { supabaseAdminClient } from '@/libs/supabase/supabase-admin';
import { stripeAdmin } from '@/libs/stripe/stripe-admin';
import { getOrCreateCustomer } from '@/features/account/controllers/get-or-create-customer';

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  if (!stripeAdmin) return Response.json({ error: 'Stripe not configured' }, { status: 500 });

  // Resolve the payment link
  const { data: link, error } = await supabaseAdminClient
    .from('payment_links' as any)
    .select('*')
    .eq('token', token)
    .eq('used', false)
    .single();

  if (error || !link) return Response.json({ error: 'Invalid or expired payment link' }, { status: 404 });

  const l = link as any;

  // Check expiry
  if (new Date(l.expires_at) < new Date()) {
    return Response.json({ error: 'This payment link has expired' }, { status: 410 });
  }

  // Determine which price to charge — customer may have selected one from multiple options
  let body: { priceId?: string } = {};
  try { body = await req.json(); } catch { /* no body is fine */ }

  const allowedPriceIds: string[] = Array.isArray(l.stripe_price_ids) && l.stripe_price_ids.length > 0
    ? l.stripe_price_ids
    : [l.stripe_price_id];

  const chosenPriceId = body.priceId && allowedPriceIds.includes(body.priceId)
    ? body.priceId
    : allowedPriceIds[0];

  // Get user email
  const { data: authUser } = await supabaseAdminClient.auth.admin.getUserById(l.user_id);
  if (!authUser?.user?.email) return Response.json({ error: 'User not found' }, { status: 404 });

  // Get or create Stripe customer
  const customerId = await getOrCreateCustomer({
    userId: l.user_id,
    email: authUser.user.email,
  });

  if (!customerId) return Response.json({ error: 'Could not create Stripe customer' }, { status: 500 });

  // Fetch price to determine mode
  const price = await stripeAdmin.prices.retrieve(chosenPriceId);
  const mode = price.type === 'recurring' ? 'subscription' : 'payment';

  // Map price ID → hosting months for one-time payments
  const hostingMonthsMap: Record<string, string> = {
    [process.env.STRIPE_PRICE_1MO ?? '']: '1',
    [process.env.STRIPE_PRICE_6MO ?? '']: '6',
    [process.env.STRIPE_PRICE_12MO ?? '']: '12',
    [process.env.STRIPE_PRICE_LIFETIME ?? '']: '1200',
  };
  const hostingMonths = hostingMonthsMap[chosenPriceId] ?? '6';

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  const session = await stripeAdmin.checkout.sessions.create({
    payment_method_types: ['card'],
    billing_address_collection: 'required',
    customer: customerId,
    customer_update: { address: 'auto' },
    line_items: [{ price: chosenPriceId, quantity: 1 }],
    mode,
    allow_promotion_codes: true,
    metadata: {
      ...(mode === 'payment' ? { hosting_months: hostingMonths } : {}),
      payment_link_token: token,
    },
    success_url: `${baseUrl}/pay/${token}/success`,
    cancel_url: `${baseUrl}/pay/${token}`,
  });

  if (!session.url) return Response.json({ error: 'Could not create checkout session' }, { status: 500 });

  return Response.json({ url: session.url });
}
