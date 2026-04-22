-- Add branding_colors and branding_fonts to the asset_type enum
-- These are used by Logo Designer and branding agents
ALTER TYPE asset_type ADD VALUE IF NOT EXISTS 'branding_colors';
ALTER TYPE asset_type ADD VALUE IF NOT EXISTS 'branding_fonts';
