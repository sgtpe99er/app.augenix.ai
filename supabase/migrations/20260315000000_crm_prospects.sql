-- CRM prospects table
-- Replaces the Google Sheet used for prospect tracking.
-- Tracks: outreach pipeline, website build status, revenue, and linkage to FWD users.

CREATE TYPE prospect_stage AS ENUM (
  'researched',
  'contacted',
  'responded',
  'converted',
  'churned'
);

CREATE TYPE crm_website_status AS ENUM (
  'none',
  'subdomain',
  'placeholder',
  'low_quality',
  'professional'
);

CREATE TYPE crm_build_status AS ENUM (
  'pending',
  'in_progress',
  'live',
  'domain_configured'
);

CREATE TABLE crm_prospects (
  id TEXT PRIMARY KEY, -- PRO-XXXXXXXX format (matches existing sheet IDs)

  -- Contact info
  business_name TEXT NOT NULL,
  owner_name TEXT,
  phone TEXT,
  email TEXT,
  city TEXT,
  state TEXT,
  category TEXT,

  -- Google / web presence
  google_address TEXT,
  google_reviews INTEGER,
  google_rating NUMERIC(3, 1),
  facebook_url TEXT,
  website_status crm_website_status DEFAULT 'none',
  email_domain TEXT,

  -- Qualification
  qualifies BOOLEAN DEFAULT TRUE,

  -- FWD user link (set when prospect converts and creates an account)
  fwd_user_id UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  subdomain TEXT,

  -- Pipeline stage
  prospect_stage prospect_stage DEFAULT 'researched',

  -- Website build
  site_built BOOLEAN DEFAULT FALSE,
  build_status crm_build_status DEFAULT 'pending',

  -- Outreach tracking
  first_email_date DATE,
  last_follow_up_date DATE,
  follow_up_count INTEGER DEFAULT 0,
  link_clicked BOOLEAN DEFAULT FALSE,
  responded BOOLEAN DEFAULT FALSE,
  response_date DATE,
  converted_to_customer BOOLEAN DEFAULT FALSE,

  -- Revenue (set once converted)
  hosting_plan TEXT,
  monthly_revenue NUMERIC(10, 2),

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Auto-update updated_at
CREATE TRIGGER update_crm_prospects_updated_at
  BEFORE UPDATE ON crm_prospects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column ();

-- RLS: only admins and service role can access
ALTER TABLE crm_prospects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage crm_prospects"
  ON crm_prospects
  FOR ALL
  TO authenticated
  USING (is_admin (auth.uid ()))
  WITH CHECK (is_admin (auth.uid ()));

CREATE POLICY "Service role full access to crm_prospects"
  ON crm_prospects
  FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- Index for common queries
CREATE INDEX crm_prospects_stage_idx ON crm_prospects (prospect_stage);
CREATE INDEX crm_prospects_state_city_idx ON crm_prospects (state, city);
CREATE INDEX crm_prospects_converted_idx ON crm_prospects (converted_to_customer);
