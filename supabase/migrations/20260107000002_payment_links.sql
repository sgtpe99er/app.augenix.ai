/**
 * PAYMENT LINKS
 * Unique, tokenized payment URLs the admin sends to manually-created users.
 */
create table if not exists public.payment_links (
  id            uuid primary key default gen_random_uuid(),
  token         text unique not null default encode(gen_random_bytes(24), 'hex'),
  user_id       uuid not null references auth.users(id) on delete cascade,
  stripe_price_id text not null,
  note          text,
  used          boolean not null default false,
  expires_at    timestamptz not null default (now() + interval '30 days'),
  created_at    timestamptz not null default now()
);

alter table public.payment_links enable row level security;

-- Only service role (admin API) can read/write
create policy "Service role only."
  on public.payment_links
  using (false);
