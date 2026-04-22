-- Add timestamps for admin action buttons
ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS onboarding_link_sent_at timestamptz,
ADD COLUMN IF NOT EXISTS payment_link_sent_at timestamptz,
ADD COLUMN IF NOT EXISTS password_reset_sent_at timestamptz;
