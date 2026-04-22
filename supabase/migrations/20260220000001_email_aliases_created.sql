/**
 * Track whether noreply@ and support@ aliases have been created
 * in Forward Email for a customer's custom domain.
 */

alter table public.deployed_websites
  add column if not exists email_aliases_created boolean not null default false;
