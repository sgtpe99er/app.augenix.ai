/**
 * Add email_dns_status to deployed_websites
 *
 * Tracks the state of outbound email DNS provisioning for custom domains.
 * Sites on *.freewebsite.deal subdomains don't need per-site provisioning.
 *
 * Values:
 *   not_started      — no action taken yet
 *   provisioning     — DNS records being added to Vercel
 *   provisioned      — records added, awaiting Forward Email verification
 *   verified         — Forward Email SMTP verified (may still need FE admin approval)
 *   approved         — FE admin approved, outbound email fully active
 *   error            — something failed, check email_dns_error
 */

alter table public.deployed_websites
  add column if not exists email_dns_status text not null default 'not_started',
  add column if not exists email_dns_error text,
  add column if not exists email_dns_provisioned_at timestamp with time zone;
