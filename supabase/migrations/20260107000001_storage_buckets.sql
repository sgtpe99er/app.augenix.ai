/**
 * STORAGE BUCKETS
 * Create the generated-assets bucket for AI-generated images
 */
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'generated-assets',
  'generated-assets',
  true,
  52428800, -- 50MB
  array['image/png', 'image/jpeg', 'image/webp', 'application/json', 'application/pdf']
)
on conflict (id) do nothing;

-- Allow the service role (admin client) to upload
create policy "Service role can upload generated assets."
  on storage.objects for insert
  with check (bucket_id = 'generated-assets');

-- Allow public read
create policy "Public can read generated assets."
  on storage.objects for select
  using (bucket_id = 'generated-assets');

-- Allow service role to update/delete
create policy "Service role can update generated assets."
  on storage.objects for update
  using (bucket_id = 'generated-assets');

create policy "Service role can delete generated assets."
  on storage.objects for delete
  using (bucket_id = 'generated-assets');
