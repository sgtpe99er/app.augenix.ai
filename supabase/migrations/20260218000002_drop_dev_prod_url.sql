/**
 * dev_url and prod_url are redundant:
 *   dev  = https://{subdomain}.freewebsite.deal
 *   prod = https://{custom_domain}
 * Drop them and derive at the application layer.
 */
alter table public.deployed_websites
  drop column if exists dev_url,
  drop column if exists prod_url;
