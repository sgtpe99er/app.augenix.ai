/**
 * DEPLOYED WEBSITES — dev/prod workflow
 *
 * dev_url      — the *.freewebsite.deal subdomain URL (always published here first)
 * prod_url     — the customer's custom domain URL (pushed after approval)
 * approval_status — tracks where in the dev→prod workflow we are
 */

alter table public.deployed_websites
  add column if not exists dev_url text,
  add column if not exists prod_url text,
  add column if not exists approval_status text not null default 'pending';

-- approval_status values:
--   pending         — no dev build yet
--   dev_published   — published to subdomain, awaiting customer approval
--   approved        — customer approved, ready to push to prod
--   prod_published  — live on production/custom domain
