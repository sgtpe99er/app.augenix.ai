-- Add page_label column to migration_pages for phase-based processing
-- Values: 'home', 'main_menu', 'remaining', or NULL (unlabeled)
ALTER TABLE public.migration_pages
  ADD COLUMN IF NOT EXISTS page_label text;

-- Add render_priority if it doesn't exist (used for ordering)
ALTER TABLE public.migration_pages
  ADD COLUMN IF NOT EXISTS render_priority integer DEFAULT 0;

-- Index for fast label-based queries
CREATE INDEX IF NOT EXISTS idx_migration_pages_label ON public.migration_pages(job_id, page_label);
