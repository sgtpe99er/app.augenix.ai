/**
 * DOMAIN REGISTRATION
 *
 * Adds domain tracking fields to the businesses table.
 * domain_status values: none | purchasing | active | failed
 */

alter table public.businesses
  add column if not exists domain_name            text,
  add column if not exists domain_status          text not null default 'none',
  add column if not exists vercel_order_id        text,
  add column if not exists domain_registered_at   timestamptz,
  add column if not exists domain_renewal_price_usd numeric(6,2);
