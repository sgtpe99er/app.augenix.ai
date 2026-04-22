/**
 * GITHUB DEPLOYMENT PIPELINE
 *
 * Extends deployed_websites with GitHub repo tracking and Vercel preview URL.
 * Adds customers/ media storage bucket for per-customer images and videos.
 */

-- Add GitHub repo fields and Vercel preview URL to deployed_websites
alter table public.deployed_websites
  add column if not exists github_repo_name text,
  add column if not exists github_repo_url  text,
  add column if not exists vercel_preview_url text,
  add column if not exists site_slug text;

-- Extend website_status enum with pipeline states
alter type website_status add value if not exists 'provisioning';
alter type website_status add value if not exists 'pending_changes';
alter type website_status add value if not exists 'error';

-- Admin policy: insert new deployed_website rows (for provision-site edge function)
-- (select/update policies already exist from extend_schema migration)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'deployed_websites'
      and policyname = 'Admins can insert deployed websites.'
  ) then
    execute $p$
      create policy "Admins can insert deployed websites."
        on deployed_websites for insert
        with check (is_admin(auth.uid()))
    $p$;
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- CUSTOMERS MEDIA STORAGE BUCKET
-- Namespace: customers/{user_id}/images/  and  customers/{user_id}/videos/
-- ─────────────────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'customer-media',
  'customer-media',
  true,
  524288000, -- 500MB per file max
  array[
    'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml',
    'video/mp4', 'video/webm', 'video/quicktime'
  ]
)
on conflict (id) do nothing;

-- Users can upload to their own namespace: customers/{user_id}/...
create policy "Users can upload their own customer media"
  on storage.objects for insert
  with check (
    bucket_id = 'customer-media' and
    (storage.foldername(name))[1] = 'customers' and
    auth.uid()::text = (storage.foldername(name))[2]
  );

-- Public read (media is referenced by URLs on the customer's site)
create policy "Customer media is publicly readable"
  on storage.objects for select
  using (bucket_id = 'customer-media');

-- Users can delete their own media
create policy "Users can delete their own customer media"
  on storage.objects for delete
  using (
    bucket_id = 'customer-media' and
    auth.uid()::text = (storage.foldername(name))[2]
  );

-- Admins can manage all customer media
create policy "Admins can upload customer media"
  on storage.objects for insert
  with check (
    bucket_id = 'customer-media' and
    is_admin(auth.uid())
  );

create policy "Admins can delete customer media"
  on storage.objects for delete
  using (
    bucket_id = 'customer-media' and
    is_admin(auth.uid())
  );
