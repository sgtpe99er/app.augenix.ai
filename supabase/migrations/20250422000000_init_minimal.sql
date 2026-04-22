-- Minimal schema for ardent-demo.augenix.ai
-- Core auth tables (shared across all apps - NO prefix)
-- App-specific tables (aa_demo_ prefix)

/**
* USERS (shared auth table - NO prefix)
* Core user profile data synced from auth.users
* This table is shared across all apps using the same Supabase project
*/
create table users (
  id uuid references auth.users not null primary key,
  full_name text,
  avatar_url text,
  billing_address jsonb,
  payment_method jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table users enable row level security;

create policy "Users can view own user data." on users 
  for select using (auth.uid() = id);

create policy "Users can update own user data." on users 
  for update using (auth.uid() = id);

/**
* Trigger: Auto-create user profile on signup
*/
create function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.users (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

/**
* AA_DEMO_BUSINESSES (app-specific table - WITH prefix)
* Stores business information for this specific demo app
*/
create table aa_demo_businesses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null unique,
  business_name text,
  industry text,
  location_city text,
  location_state text,
  location_country text,
  target_audience text,
  services_products text,
  website_features text[],
  status text default 'onboarding' not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table aa_demo_businesses enable row level security;

create policy "Users can view own business data." on aa_demo_businesses 
  for select using (auth.uid() = user_id);

create policy "Users can insert own business data." on aa_demo_businesses 
  for insert with check (auth.uid() = user_id);

create policy "Users can update own business data." on aa_demo_businesses 
  for update using (auth.uid() = user_id);

/**
* Trigger: Update updated_at timestamp
*/
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

create trigger update_users_updated_at before update on users
  for each row execute function update_updated_at_column();

create trigger update_aa_demo_businesses_updated_at before update on aa_demo_businesses
  for each row execute function update_updated_at_column();

/**
* Realtime publication
*/
drop publication if exists supabase_realtime;
create publication supabase_realtime;
