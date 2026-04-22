-- Create brand-assets storage bucket for logo uploads
insert into storage.buckets (id, name, public)
values ('brand-assets', 'brand-assets', true)
on conflict (id) do nothing;

-- Allow authenticated users to upload to their own folder
create policy "Users can upload their own brand assets"
  on storage.objects for insert
  with check (
    bucket_id = 'brand-assets' and
    auth.uid()::text = (storage.foldername(name))[2]
  );

-- Allow public read access
create policy "Brand assets are publicly readable"
  on storage.objects for select
  using (bucket_id = 'brand-assets');

-- Allow users to delete their own assets
create policy "Users can delete their own brand assets"
  on storage.objects for delete
  using (
    bucket_id = 'brand-assets' and
    auth.uid()::text = (storage.foldername(name))[2]
  );
