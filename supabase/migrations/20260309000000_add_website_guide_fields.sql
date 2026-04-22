-- Add Website Guide fields to businesses table

-- Email addresses to setup on domain
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS email_addresses text[] DEFAULT '{}';

-- SEO & Target Market fields
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS target_audience text;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS services_products text;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS target_locations text[] DEFAULT '{}';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS service_area_radius text;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS service_area_description text;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS service_keywords text[] DEFAULT '{}';

-- Website Features fields
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS website_features text[] DEFAULT '{}';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS primary_cta text;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS insurance_info text;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS associations text[] DEFAULT '{}';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS payment_methods text[] DEFAULT '{}';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS unique_selling_points text[] DEFAULT '{}';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS languages_served text[] DEFAULT '{}';

-- Existing website URL (for migration reference)
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS existing_website_url text;

-- Add social link columns to brand_assets if they don't exist
ALTER TABLE brand_assets ADD COLUMN IF NOT EXISTS social_youtube text;
ALTER TABLE brand_assets ADD COLUMN IF NOT EXISTS social_x text;
ALTER TABLE brand_assets ADD COLUMN IF NOT EXISTS social_tiktok text;
ALTER TABLE brand_assets ADD COLUMN IF NOT EXISTS social_linkedin text;
ALTER TABLE brand_assets ADD COLUMN IF NOT EXISTS social_yelp text;
