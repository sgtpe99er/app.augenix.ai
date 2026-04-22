import { redirect } from 'next/navigation';
import { getSession } from '@/features/account/controllers/get-session';
import { stripeAdmin } from '@/libs/stripe/stripe-admin';
import { PaymentPage } from './payment-page';

interface PriceOption {
  id: string;
  unitAmount: number;
  currency: string;
  type: string;
  interval: string | null;
  intervalCount: number | null;
  productName: string;
  productDescription: string | null;
}

export default async function Payment() {
  const session = await getSession();

  if (!session) {
    redirect('/signup');
  }

  // Get all price IDs from environment
  const priceIds = [
    process.env.STRIPE_PRICE_LIFETIME,
    process.env.STRIPE_PRICE_12MO,
    process.env.STRIPE_PRICE_6MO,
    process.env.STRIPE_PRICE_1MO,
  ].filter(Boolean) as string[];

  if (!stripeAdmin || priceIds.length === 0) {
    return <div className="p-8 text-center text-red-500">Payment configuration error. Please contact support.</div>;
  }

  // Fetch all prices + products from Stripe
  const prices = await Promise.all(
    priceIds.map((id) => stripeAdmin!.prices.retrieve(id, { expand: ['product'] }))
  );

  const priceOptions: PriceOption[] = prices.map((p) => {
    const prod = p.product as { name: string; description: string | null } | null;
    return {
      id: p.id,
      unitAmount: p.unit_amount ?? 0,
      currency: p.currency,
      type: p.type,
      interval: p.recurring?.interval ?? null,
      intervalCount: p.recurring?.interval_count ?? null,
      productName: prod?.name ?? 'Website Package',
      productDescription: prod?.description ?? null,
    };
  });

  return (
    <PaymentPage
      prices={priceOptions}
      oneMoId={process.env.STRIPE_PRICE_1MO}
      sixMoId={process.env.STRIPE_PRICE_6MO}
      twelveId={process.env.STRIPE_PRICE_12MO}
      lifetimeId={process.env.STRIPE_PRICE_LIFETIME}
    />
  );
}
