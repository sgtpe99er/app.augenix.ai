-- Create user cache table to avoid slow auth.listUsers() calls
CREATE TABLE IF NOT EXISTS user_cache (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_sync TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for user cache
CREATE INDEX IF NOT EXISTS idx_user_cache_email ON user_cache(email);
CREATE INDEX IF NOT EXISTS idx_user_cache_created_at ON user_cache(created_at);
CREATE INDEX IF NOT EXISTS idx_user_cache_last_sync ON user_cache(last_sync);

-- Grant permissions
GRANT ALL ON user_cache TO authenticated;
GRANT SELECT ON user_cache TO anon;
