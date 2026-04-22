import { getSession } from '@/features/account/controllers/get-session';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';
import { stripeAdmin } from '@/libs/stripe/stripe-admin';

export async function GET() {
  const session = await getSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = await createSupabaseServerClient();
  const { data: isAdmin } = await supabase.rpc('is_admin', { user_uuid: session.user.id } as any);
  if (!isAdmin) return Response.json({ error: 'Forbidden' }, { status: 403 });

  if (!stripeAdmin) return Response.json({ error: 'Stripe not configured' }, { status: 500 });

  try {
    // Only expose prices that are explicitly configured in env vars
    const allowedPriceIds = new Set(
      [
        process.env.STRIPE_PRICE_1MO,
        process.env.STRIPE_PRICE_6MO,
        process.env.STRIPE_PRICE_12MO,
        process.env.STRIPE_PRICE_LIFETIME,
      ].filter(Boolean) as string[]
    );

    // Fetch active products + their active prices from Stripe directly
    const productsRes = await stripeAdmin.products.list({ active: true, limit: 100 });
    const pricesRes = await stripeAdmin.prices.list({ active: true, limit: 100, expand: ['data.product'] });

    const result = productsRes.data.map((product) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      prices: pricesRes.data
        .filter((p) => {
          const productId = typeof p.product === 'string' ? p.product : (p.product as any)?.id;
          return productId === product.id && allowedPriceIds.has(p.id);
        })
        .map((p) => ({
          id: p.id,
          unit_amount: p.unit_amount,
          currency: p.currency,
          type: p.type,
          recurring: p.recurring ? { interval: p.recurring.interval } : null,
        })),
    })).filter((p) => p.prices.length > 0);

    return Response.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[stripe-products]', msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}
