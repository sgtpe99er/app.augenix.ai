/**
 * APP_SETTINGS
 * Stores admin-configurable settings (pricing, email templates)
 * Single-row table — always upsert with id = 'singleton'
 */
create table app_settings (
  id text primary key default 'singleton',
  pricing jsonb not null default '{}',
  email_templates jsonb not null default '{}',
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Only admins can read/write settings
alter table app_settings enable row level security;
create policy "Admins can read settings." on app_settings for select using (is_admin(auth.uid()));
create policy "Admins can upsert settings." on app_settings for insert with check (is_admin(auth.uid()));
create policy "Admins can update settings." on app_settings for update using (is_admin(auth.uid()));

-- Seed default row
insert into app_settings (id, pricing, email_templates) values (
  'singleton',
  '{
    "hosting6Month": 300,
    "hosting12Month": 500,
    "domainMarkup": 5,
    "seoMonthly": 500,
    "googleAdsMonthly": 100,
    "gmbMonthly": 50,
    "bundleDiscount": 20,
    "maxMonthlyEdits": 10
  }',
  '{}'
);
