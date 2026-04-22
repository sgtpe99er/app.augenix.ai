import Stripe from 'stripe';

export async function upsertProduct(product: Stripe.Product) {
  console.log('upsertProduct: products table not configured in minimal demo', product.id);
}
