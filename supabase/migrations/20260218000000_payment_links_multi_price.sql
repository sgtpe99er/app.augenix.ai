/**
 * Add stripe_price_ids (jsonb array) to payment_links for multi-price support.
 * The old stripe_price_id column is kept for backward compatibility.
 */
alter table public.payment_links
  add column if not exists stripe_price_ids jsonb;
