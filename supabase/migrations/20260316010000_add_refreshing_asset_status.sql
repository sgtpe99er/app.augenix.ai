-- Add 'refreshing' to asset_status enum
-- Used when a user requests a Canva refresh — the Logo Designer agent picks it up asynchronously.
ALTER TYPE asset_status ADD VALUE IF NOT EXISTS 'refreshing';
