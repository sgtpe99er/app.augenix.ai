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

create policy "Users can view own customer inputs." on public.customer_inputs
  for select using (auth.uid() = user_id);

create policy "Users can insert own customer inputs." on public.customer_inputs
  for insert with check (auth.uid() = user_id);

create policy "Users can update own customer inputs." on public.customer_inputs
  for update using (auth.uid() = user_id);

create policy "Users can delete own customer inputs." on public.customer_inputs
  for delete using (auth.uid() = user_id);

create policy "Admins can view all customer inputs." on public.customer_inputs
  for select using (is_admin(auth.uid()));

create policy "Admins can insert customer inputs." on public.customer_inputs
  for insert with check (is_admin(auth.uid()));

create policy "Admins can update customer inputs." on public.customer_inputs
  for update using (is_admin(auth.uid()));

create policy "Admins can delete customer inputs." on public.customer_inputs
  for delete using (is_admin(auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'customer-assets',
  'customer-assets',
  true,
  52428800,
  array['image/png', 'image/jpeg', 'image/webp', 'application/pdf']
)
on conflict (id) do nothing;

create policy "Users/admins can upload customer assets"
  on storage.objects for insert
  with check (
    bucket_id = 'customer-assets' and
    (
      is_admin(auth.uid()) or
      split_part(name, '/', 1) = auth.uid()::text
    )
  );

create policy "Customer assets are publicly readable"
  on storage.objects for select
  using (bucket_id = 'customer-assets');

create policy "Users/admins can delete customer assets"
  on storage.objects for delete
  using (
    bucket_id = 'customer-assets' and
    (
      is_admin(auth.uid()) or
      split_part(name, '/', 1) = auth.uid()::text
    )
  );
