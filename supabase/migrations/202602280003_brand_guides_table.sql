-- Create brand_guides table for storing extracted brand guidelines
CREATE TABLE IF NOT EXISTS brand_guides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES migration_jobs(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES users(id) ON DELETE CASCADE,
  
  -- Brand guide data
  colors jsonb,
  typography jsonb,
  spacing jsonb,
  border_radius jsonb,
  shadows jsonb,
  ui_patterns jsonb,
  
  -- Generated CSS variables
  css_variables text,
  
  -- Metadata
  is_active boolean DEFAULT true,
  version integer DEFAULT 1,
  extracted_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Tracking
  extraction_model text DEFAULT 'gpt-4o-mini',
  confidence_score numeric(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  
  UNIQUE(job_id) -- One brand guide per migration job
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_brand_guides_customer_id ON brand_guides(customer_id);
CREATE INDEX IF NOT EXISTS idx_brand_guides_active ON brand_guides(is_active);
CREATE INDEX IF NOT EXISTS idx_brand_guides_extracted_at ON brand_guides(extracted_at);

-- Add RLS policies
ALTER TABLE brand_guides ENABLE ROW LEVEL SECURITY;

-- Admin can access all brand guides
CREATE POLICY "Admins can view all brand guides" ON brand_guides
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

-- Admin can insert brand guides
CREATE POLICY "Admins can insert brand guides" ON brand_guides
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

-- Admin can update brand guides
CREATE POLICY "Admins can update brand guides" ON brand_guides
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

-- Admin can delete brand guides
CREATE POLICY "Admins can delete brand guides" ON brand_guides
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

-- Customer can view their own brand guides
CREATE POLICY "Customers can view own brand guides" ON brand_guides
  FOR SELECT USING (
    customer_id = auth.uid()
  );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_brand_guides_updated_at
  BEFORE UPDATE ON brand_guides
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

-- Add comments
COMMENT ON TABLE brand_guides IS 'Stores extracted brand guidelines from WordPress sites';
COMMENT ON COLUMN brand_guides.colors IS 'JSON object containing color palette (primary, secondary, text, background, etc.)';
COMMENT ON COLUMN brand_guides.typography IS 'JSON object containing font families, sizes, weights, line heights';
COMMENT ON COLUMN brand_guides.spacing IS 'JSON object containing spacing scale values';
COMMENT ON COLUMN brand_guides.border_radius IS 'JSON object containing border radius values';
COMMENT ON COLUMN brand_guides.shadows IS 'JSON object containing shadow definitions';
COMMENT ON COLUMN brand_guides.ui_patterns IS 'JSON object containing common UI patterns (buttons, forms, etc.)';
COMMENT ON COLUMN brand_guides.css_variables IS 'Generated CSS variables file content';
COMMENT ON COLUMN brand_guides.confidence_score IS 'AI model confidence in extraction accuracy (0-1)';
