ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS branding_guide_approved_at timestamptz;
