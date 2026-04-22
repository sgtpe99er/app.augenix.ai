-- Migration for WordPress Migration v2
-- Adds support for surgical, template-based migration approach

-- Add metadata column to migration_jobs if it doesn't exist
ALTER TABLE migration_jobs 
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';

-- Add build_status column to track v2 migration progress
ALTER TABLE migration_jobs 
ADD COLUMN IF NOT EXISTS build_status jsonb DEFAULT '{}';

-- Add migration_version to distinguish between v1 and v2
ALTER TABLE migration_jobs 
ADD COLUMN IF NOT EXISTS migration_version text DEFAULT 'v1';

-- Add columns for brand guide and asset tracking
ALTER TABLE migration_jobs 
ADD COLUMN IF NOT EXISTS brand_guide_url text,
ADD COLUMN IF NOT EXISTS component_library_url text,
ADD COLUMN IF NOT EXISTS asset_manifest_url text;

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_migration_jobs_version 
ON migration_jobs(migration_version);

CREATE INDEX IF NOT EXISTS idx_migration_jobs_build_status 
ON migration_jobs USING GIN(build_status);

-- Comments
COMMENT ON COLUMN migration_jobs.metadata IS 'Stores migration-specific metadata: brand_guide, js_inventory, component_mapping, asset_manifest';
COMMENT ON COLUMN migration_jobs.build_status IS 'Tracks current phase, step, and progress of v2 migration';
COMMENT ON COLUMN migration_jobs.migration_version IS 'v1 = bulk migration, v2 = surgical template-based migration';
