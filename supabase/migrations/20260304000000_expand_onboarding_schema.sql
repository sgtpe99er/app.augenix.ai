-- Expand onboarding schema with comprehensive business and brand fields
-- Single source of truth: businesses table for business info, brand_assets for brand/style/uploads

-- ============================================
-- BUSINESSES TABLE ADDITIONS
-- ============================================

-- Step 1: Business Basics (expanded)
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS year_established integer;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS tagline text;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS address_street text;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS address_zip text;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS phone_primary text;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS phone_secondary text;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS email_public text;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS hours jsonb;

-- Step 2: Domain (consolidated from old step 4)
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS owns_domain boolean DEFAULT false;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS existing_domain text;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS desired_domain text;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS needs_domain_purchase boolean DEFAULT false;

-- Step 3: SEO & Target Market
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS target_locations jsonb;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS service_area_radius text;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS service_area_description text;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS service_keywords jsonb;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS competitor_urls jsonb;

-- Step 6: Website Features & Trust Signals
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS primary_cta text;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS lead_form_fields jsonb;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS licenses jsonb;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS insurance_info text;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS associations jsonb;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS payment_methods jsonb;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS unique_selling_points jsonb;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS special_offers jsonb;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS languages_served jsonb;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS integrations_needed jsonb;

-- ============================================
-- BRAND_ASSETS TABLE ADDITIONS
-- ============================================

-- Step 2: Social Links
ALTER TABLE brand_assets ADD COLUMN IF NOT EXISTS social_facebook text;
ALTER TABLE brand_assets ADD COLUMN IF NOT EXISTS social_instagram text;
ALTER TABLE brand_assets ADD COLUMN IF NOT EXISTS social_youtube text;
ALTER TABLE brand_assets ADD COLUMN IF NOT EXISTS social_x text;
ALTER TABLE brand_assets ADD COLUMN IF NOT EXISTS social_tiktok text;
ALTER TABLE brand_assets ADD COLUMN IF NOT EXISTS social_linkedin text;
ALTER TABLE brand_assets ADD COLUMN IF NOT EXISTS social_google_business text;
ALTER TABLE brand_assets ADD COLUMN IF NOT EXISTS social_yelp text;
ALTER TABLE brand_assets ADD COLUMN IF NOT EXISTS social_other jsonb;

-- Step 4: Brand & Style (expanded)
ALTER TABLE brand_assets ADD COLUMN IF NOT EXISTS logo_urls jsonb;
ALTER TABLE brand_assets ADD COLUMN IF NOT EXISTS tone_of_voice text;
ALTER TABLE brand_assets ADD COLUMN IF NOT EXISTS inspiration_urls jsonb;
ALTER TABLE brand_assets ADD COLUMN IF NOT EXISTS inspiration_notes text;

-- Step 5: Content & Media (uploads consolidated here)
ALTER TABLE brand_assets ADD COLUMN IF NOT EXISTS uploaded_logos jsonb;
ALTER TABLE brand_assets ADD COLUMN IF NOT EXISTS uploaded_photos jsonb;
ALTER TABLE brand_assets ADD COLUMN IF NOT EXISTS uploaded_team_photos jsonb;
ALTER TABLE brand_assets ADD COLUMN IF NOT EXISTS uploaded_portfolio jsonb;
ALTER TABLE brand_assets ADD COLUMN IF NOT EXISTS uploaded_inspiration jsonb;
ALTER TABLE brand_assets ADD COLUMN IF NOT EXISTS uploaded_other jsonb;
ALTER TABLE brand_assets ADD COLUMN IF NOT EXISTS testimonials jsonb;
ALTER TABLE brand_assets ADD COLUMN IF NOT EXISTS certifications jsonb;
ALTER TABLE brand_assets ADD COLUMN IF NOT EXISTS awards jsonb;
ALTER TABLE brand_assets ADD COLUMN IF NOT EXISTS faqs jsonb;

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON COLUMN businesses.hours IS 'Business hours as JSON: { mon: { open: "9:00", close: "17:00" }, tue: {...}, ... }';
COMMENT ON COLUMN businesses.target_locations IS 'Array of target cities/areas for local SEO';
COMMENT ON COLUMN businesses.service_keywords IS 'Array of keywords to rank for';
COMMENT ON COLUMN businesses.competitor_urls IS 'Array of competitor website URLs';
COMMENT ON COLUMN businesses.licenses IS 'Array of { type, number, state }';
COMMENT ON COLUMN businesses.associations IS 'Array of professional associations';
COMMENT ON COLUMN businesses.payment_methods IS 'Array of accepted payment methods';
COMMENT ON COLUMN businesses.unique_selling_points IS 'Array of USPs';
COMMENT ON COLUMN businesses.special_offers IS 'Array of { title, description, expires }';
COMMENT ON COLUMN businesses.languages_served IS 'Array of languages';
COMMENT ON COLUMN businesses.integrations_needed IS 'Array of { type, details }';

COMMENT ON COLUMN brand_assets.social_other IS 'Array of { platform, url } for additional social links';
COMMENT ON COLUMN brand_assets.logo_urls IS 'Array of uploaded logo URLs';
COMMENT ON COLUMN brand_assets.inspiration_urls IS 'Array of website URLs they like';
COMMENT ON COLUMN brand_assets.uploaded_logos IS 'Array of { url, filename, type }';
COMMENT ON COLUMN brand_assets.uploaded_photos IS 'Array of { url, filename, type }';
COMMENT ON COLUMN brand_assets.uploaded_team_photos IS 'Array of { url, filename, name, title }';
COMMENT ON COLUMN brand_assets.uploaded_portfolio IS 'Array of { url, filename, caption }';
COMMENT ON COLUMN brand_assets.uploaded_inspiration IS 'Array of { url, filename, notes }';
COMMENT ON COLUMN brand_assets.uploaded_other IS 'Array of { url, filename, notes }';
COMMENT ON COLUMN brand_assets.testimonials IS 'Array of { quote, author, rating, photo_url }';
COMMENT ON COLUMN brand_assets.certifications IS 'Array of { name, issuer, year, image_url }';
COMMENT ON COLUMN brand_assets.awards IS 'Array of { name, year, image_url }';
COMMENT ON COLUMN brand_assets.faqs IS 'Array of { question, answer }';
