insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'customer-assets',
  'customer-assets',
  true,
  52428800,
  array['image/png', 'image/jpeg', 'image/webp', 'application/pdf']
)
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Users/admins can upload customer assets'
  ) then
    execute $policy$
      create policy "Users/admins can upload customer assets"
        on storage.objects for insert
        with check (
          bucket_id = 'customer-assets' and
          (
            is_admin(auth.uid()) or
            split_part(name, '/', 1) = auth.uid()::text
          )
        )
    $policy$;
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Customer assets are publicly readable'
  ) then
    execute $policy$
      create policy "Customer assets are publicly readable"
        on storage.objects for select
        using (bucket_id = 'customer-assets')
    $policy$;
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Users/admins can delete customer assets'
  ) then
    execute $policy$
      create policy "Users/admins can delete customer assets"
        on storage.objects for delete
        using (
          bucket_id = 'customer-assets' and
          (
            is_admin(auth.uid()) or
            split_part(name, '/', 1) = auth.uid()::text
          )
        )
    $policy$;
  end if;
end
$$;
