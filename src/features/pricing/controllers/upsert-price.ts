import Stripe from 'stripe';

export async function upsertPrice(price: Stripe.Price) {
  console.log('upsertPrice: pricing table not configured in minimal demo', price.id);
}
