create unique index if not exists generated_assets_user_asset_type_unique
  on public.generated_assets (user_id, asset_type);

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'customer_input_type'
  ) then
    create type customer_input_type as enum ('file', 'url');
  end if;
end
$$;

create table if not exists public.customer_inputs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  business_id uuid references public.businesses,
  input_type customer_input_type not null,
  title text,
  notes text not null default '',
  source_url text,
  storage_path text,
  storage_url text,
  file_name text,
  mime_type text,
  metadata jsonb not null default '{}',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.customer_inputs enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'customer_inputs'
      and policyname = 'Users can view own customer inputs.'
  ) then
    execute 'create policy "Users can view own customer inputs." on public.customer_inputs for select using (auth.uid() = user_id)';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'customer_inputs'
      and policyname = 'Users can insert own customer inputs.'
  ) then
    execute 'create policy "Users can insert own customer inputs." on public.customer_inputs for insert with check (auth.uid() = user_id)';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'customer_inputs'
      and policyname = 'Users can update own customer inputs.'
  ) then
    execute 'create policy "Users can update own customer inputs." on public.customer_inputs for update using (auth.uid() = user_id)';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'customer_inputs'
      and policyname = 'Users can delete own customer inputs.'
  ) then
    execute 'create policy "Users can delete own customer inputs." on public.customer_inputs for delete using (auth.uid() = user_id)';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'customer_inputs'
      and policyname = 'Admins can view all customer inputs.'
  ) then
    execute 'create policy "Admins can view all customer inputs." on public.customer_inputs for select using (is_admin(auth.uid()))';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'customer_inputs'
      and policyname = 'Admins can insert customer inputs.'
  ) then
    execute 'create policy "Admins can insert customer inputs." on public.customer_inputs for insert with check (is_admin(auth.uid()))';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'customer_inputs'
      and policyname = 'Admins can update customer inputs.'
  ) then
    execute 'create policy "Admins can update customer inputs." on public.customer_inputs for update using (is_admin(auth.uid()))';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'customer_inputs'
      and policyname = 'Admins can delete customer inputs.'
  ) then
    execute 'create policy "Admins can delete customer inputs." on public.customer_inputs for delete using (is_admin(auth.uid()))';
  end if;
end
$$;
