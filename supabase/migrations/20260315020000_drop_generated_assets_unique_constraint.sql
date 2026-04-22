-- Drop unique constraint on (user_id, asset_type) to allow multiple logos per client
-- This is needed to support the logo feedback loop (3 options per round)
DROP INDEX IF EXISTS generated_assets_user_asset_type_unique;
