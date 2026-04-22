/**
 * DOMAIN REGISTRANT CONTACT
 *
 * Stores the customer's ICANN registrant contact info on the businesses table.
 * Only populated when the customer purchases a domain.
 */

alter table public.businesses
  add column if not exists domain_registrant_contact jsonb;
