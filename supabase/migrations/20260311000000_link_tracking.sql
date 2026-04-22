-- Link click tracking for email outreach
CREATE TABLE IF NOT EXISTS link_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tracking_id TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_url TEXT NOT NULL,
  clicked BOOLEAN DEFAULT FALSE,
  clicked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_link_tracking_tracking_id ON link_tracking(tracking_id);
CREATE INDEX idx_link_tracking_user_id ON link_tracking(user_id);
