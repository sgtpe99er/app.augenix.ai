/**
 * Add payment tracking fields to businesses table.
 * These are auto-updated by the Stripe webhook (not manually editable).
 * - payment_status: unpaid | paid | refunded | cancelled
 * - subscription_plan: monthly | 6_month | annual | lifetime (null if unpaid)
 * - amount_paid: total amount charged (null if unpaid)
 * - payment_paid_at: timestamp of successful payment
 */
alter table public.businesses
  add column if not exists payment_status text not null default 'unpaid',
  add column if not exists subscription_plan text,
  add column if not exists amount_paid numeric(10,2),
  add column if not exists payment_paid_at timestamp with time zone;
