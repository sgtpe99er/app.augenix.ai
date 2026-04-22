-- Add indexes for admin dashboard performance optimization

-- User lookups
CREATE INDEX IF NOT EXISTS idx_businesses_user_id ON businesses(user_id);
CREATE INDEX IF NOT EXISTS idx_edit_requests_user_id ON edit_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_assets_user_id ON generated_assets(user_id);
CREATE INDEX IF NOT EXISTS idx_deployed_websites_user_id ON deployed_websites(user_id);

-- Status filters
CREATE INDEX IF NOT EXISTS idx_businesses_status ON businesses(status);
CREATE INDEX IF NOT EXISTS idx_edit_requests_status ON edit_requests(status);
CREATE INDEX IF NOT EXISTS idx_generated_assets_status ON generated_assets(status);
CREATE INDEX IF NOT EXISTS idx_deployed_websites_status ON deployed_websites(status);

-- Date queries for stats
CREATE INDEX IF NOT EXISTS idx_hosting_payments_created_at ON hosting_payments(created_at);
CREATE INDEX IF NOT EXISTS idx_hosting_payments_status_created_at ON hosting_payments(status, created_at);
CREATE INDEX IF NOT EXISTS idx_businesses_created_at ON businesses(created_at);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_generated_assets_status_created_at ON generated_assets(status, created_at);
CREATE INDEX IF NOT EXISTS idx_edit_requests_status_created_at ON edit_requests(status, created_at);
CREATE INDEX IF NOT EXISTS idx_deployed_websites_status_created_at ON deployed_websites(status, created_at);

-- Admin users lookup
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON admin_users(user_id);
