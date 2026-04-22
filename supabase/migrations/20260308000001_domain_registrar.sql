-- Add domain_registrar column to businesses table
-- Stores where the customer purchased their domain (e.g., GoDaddy, Namecheap)
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS domain_registrar text;
