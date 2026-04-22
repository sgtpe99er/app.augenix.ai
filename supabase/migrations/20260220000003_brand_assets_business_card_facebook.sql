-- Add business card and Facebook page fields to brand_assets
alter table brand_assets
  add column if not exists has_business_card boolean default false,
  add column if not exists business_card_front_url text,
  add column if not exists business_card_back_url text,
  add column if not exists has_facebook_page boolean default false,
  add column if not exists facebook_page_url text;
