-- Add unique constraints for upsert operations on brand_assets and domain_requests

-- brand_assets needs unique constraint on user_id for upsert
ALTER TABLE brand_assets DROP CONSTRAINT IF EXISTS brand_assets_user_id_key;
ALTER TABLE brand_assets ADD CONSTRAINT brand_assets_user_id_key UNIQUE (user_id);

-- domain_requests needs unique constraint on user_id for upsert
ALTER TABLE domain_requests DROP CONSTRAINT IF EXISTS domain_requests_user_id_key;
ALTER TABLE domain_requests ADD CONSTRAINT domain_requests_user_id_key UNIQUE (user_id);

-- Add missing uploaded_documents column to brand_assets
ALTER TABLE brand_assets ADD COLUMN IF NOT EXISTS uploaded_documents jsonb;

COMMENT ON COLUMN brand_assets.uploaded_documents IS 'Array of { url, filename, notes } for uploaded documents';
