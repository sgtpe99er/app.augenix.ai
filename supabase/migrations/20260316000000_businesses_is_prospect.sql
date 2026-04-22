-- Add is_prospect flag to businesses table.
-- Prospect businesses are created by the marketing agent for cold outreach;
-- they have placeholder @prospect.freewebsite.deal emails and are not
-- yet paying customers.
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS is_prospect BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS businesses_is_prospect_idx ON businesses (is_prospect);
