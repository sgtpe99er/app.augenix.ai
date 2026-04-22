-- Onboarding Discovery Sessions
-- Tracks discovery workflow runs for auto-filling onboarding data

CREATE TABLE onboarding_discovery_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  workflow_run_id TEXT, -- Workflow DevKit run ID
  entry_type TEXT NOT NULL CHECK (entry_type IN ('phone', 'name_city', 'website', 'facebook', 'gbp')),
  entry_value TEXT NOT NULL,
  entry_value_secondary TEXT, -- For name_city: the city
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'awaiting_confirmation', 'completed', 'failed', 'skipped')),
  discovered_sources JSONB DEFAULT '[]', -- URLs discovered (website, GBP, Facebook, etc.)
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Discovery Items
-- Individual pieces of data discovered from scraping
CREATE TABLE onboarding_discovery_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES onboarding_discovery_sessions(id) ON DELETE CASCADE,
  field_type TEXT NOT NULL, -- 'business_name', 'phone', 'address', 'logo', 'hours', etc.
  field_value JSONB NOT NULL, -- Flexible: string, object, array
  source TEXT NOT NULL, -- 'website', 'google_business', 'facebook', 'yelp'
  source_url TEXT, -- The specific URL this was found on
  confidence REAL DEFAULT 1.0 CHECK (confidence >= 0 AND confidence <= 1),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'declined')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_discovery_sessions_user ON onboarding_discovery_sessions(user_id);
CREATE INDEX idx_discovery_sessions_status ON onboarding_discovery_sessions(status);
CREATE INDEX idx_discovery_items_session ON onboarding_discovery_items(session_id);
CREATE INDEX idx_discovery_items_status ON onboarding_discovery_items(status);

-- RLS Policies
ALTER TABLE onboarding_discovery_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_discovery_items ENABLE ROW LEVEL SECURITY;

-- Users can only see their own discovery sessions
CREATE POLICY "Users can view own discovery sessions"
  ON onboarding_discovery_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own discovery sessions"
  ON onboarding_discovery_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own discovery sessions"
  ON onboarding_discovery_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can see items from their own sessions
CREATE POLICY "Users can view own discovery items"
  ON onboarding_discovery_items FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM onboarding_discovery_sessions WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own discovery items"
  ON onboarding_discovery_items FOR UPDATE
  USING (
    session_id IN (
      SELECT id FROM onboarding_discovery_sessions WHERE user_id = auth.uid()
    )
  );

-- Service role can do everything (for workflow backend)
CREATE POLICY "Service role full access to discovery sessions"
  ON onboarding_discovery_sessions FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access to discovery items"
  ON onboarding_discovery_items FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');
