-- Logo feedback table for tracking admin ratings on generated logo assets
-- Also adds feedback_round tracking to generated_assets

-- Add feedback_round to generated_assets to track which generation round a logo belongs to
ALTER TABLE generated_assets
  ADD COLUMN IF NOT EXISTS feedback_round integer DEFAULT 1;

-- Create logo_feedback table
CREATE TABLE logo_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES generated_assets(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES businesses(id),
  overall_rating text CHECK (overall_rating IN ('like', 'dislike')),
  category_ratings jsonb DEFAULT '{}',
  notes text DEFAULT '',
  feedback_round integer DEFAULT 1,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Auto-update updated_at
CREATE TRIGGER update_logo_feedback_updated_at
  BEFORE UPDATE ON logo_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS: admins and service role only
ALTER TABLE logo_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage logo_feedback"
  ON logo_feedback
  FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Service role full access to logo_feedback"
  ON logo_feedback
  FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- Indexes
CREATE INDEX logo_feedback_asset_id_idx ON logo_feedback(asset_id);
CREATE INDEX logo_feedback_business_id_idx ON logo_feedback(business_id);
CREATE INDEX logo_feedback_business_round_idx ON logo_feedback(business_id, feedback_round);
