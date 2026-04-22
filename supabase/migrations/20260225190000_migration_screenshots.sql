/**
 * MIGRATION SCREENSHOTS
 * Add screenshot columns to migration_pages and create storage bucket
 */

-- Add screenshot URL columns to migration_pages
ALTER TABLE public.migration_pages 
  ADD COLUMN IF NOT EXISTS original_screenshot_url text,
  ADD COLUMN IF NOT EXISTS rewritten_screenshot_url text;

-- Create migration-screenshots bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'migration-screenshots',
  'migration-screenshots',
  true,
  10485760, -- 10MB per screenshot
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Allow service role to upload screenshots
CREATE POLICY "Service role can upload migration screenshots."
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'migration-screenshots');

-- Allow public read
CREATE POLICY "Public can read migration screenshots."
  ON storage.objects FOR SELECT
  USING (bucket_id = 'migration-screenshots');

-- Allow service role to update/delete
CREATE POLICY "Service role can update migration screenshots."
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'migration-screenshots');

CREATE POLICY "Service role can delete migration screenshots."
  ON storage.objects FOR DELETE
  USING (bucket_id = 'migration-screenshots');
