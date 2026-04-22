-- Add selected flag to design_variants
-- Tracks which variant the user has chosen as their final design

ALTER TABLE design_variants
  ADD COLUMN IF NOT EXISTS selected boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN design_variants.selected IS 'True when this variant has been selected by the user as their final design';
