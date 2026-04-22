-- Folders for organizing customer input files (logos, assets, etc.)
create table if not exists public.customer_input_folders (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.customer_input_folders enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'customer_input_folders'
      and policyname = 'Admins can manage customer input folders.'
  ) then
    execute 'create policy "Admins can manage customer input folders." on public.customer_input_folders for all using (is_admin(auth.uid()))';
  end if;
end
$$;

-- Add folder_id to customer_inputs
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'customer_inputs' and column_name = 'folder_id'
  ) then
    alter table public.customer_inputs
      add column folder_id uuid references public.customer_input_folders(id) on delete set null;
  end if;
end
$$;

-- Index for folder lookups
create index if not exists idx_customer_input_folders_user_id on public.customer_input_folders(user_id);
create index if not exists idx_customer_inputs_folder_id on public.customer_inputs(folder_id);
