-- Fix design_variants schema for Stitch-only variants
-- (no GitHub branch or Vercel deployment required for AI-generated variants)

-- Add updated_at tracking
ALTER TABLE design_variants
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Allow NULL vercel_deployment_url (Stitch variants don't have one initially)
ALTER TABLE design_variants
  ALTER COLUMN vercel_deployment_url DROP NOT NULL;

-- Allow HTML files in generated-assets bucket (for Stitch HTML storage)
UPDATE storage.buckets
SET allowed_mime_types = array_append(allowed_mime_types, 'text/html')
WHERE id = 'generated-assets'
  AND NOT ('text/html' = ANY(COALESCE(allowed_mime_types, ARRAY[]::text[])));

COMMENT ON COLUMN design_variants.updated_at IS 'Last updated timestamp, refreshed on each Stitch re-generation';
