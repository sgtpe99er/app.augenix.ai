-- Add metadata column to migration_jobs table for storing conversion pipeline state
ALTER TABLE migration_jobs
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Add comment
COMMENT ON COLUMN migration_jobs.metadata IS 'Stores conversion pipeline state and other job metadata';
