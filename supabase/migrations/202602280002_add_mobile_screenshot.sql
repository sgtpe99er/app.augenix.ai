-- Add mobile_screenshot_url column to migration_pages
ALTER TABLE migration_pages 
ADD COLUMN IF NOT EXISTS mobile_screenshot_url text;
