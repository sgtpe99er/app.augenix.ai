-- Add Google Stitch SDK columns to design_variants
-- These store the AI-generated HTML/screenshot for each design variant

alter table design_variants
  add column if not exists stitch_project_id text,
  add column if not exists stitch_screen_id  text,
  add column if not exists stitch_html_url   text,
  add column if not exists brand_tokens      jsonb;

-- Make github_branch nullable so pure-Stitch variants can exist without a branch
alter table design_variants
  alter column github_branch drop not null;

comment on column design_variants.stitch_project_id is 'Google Stitch project ID used to generate this variant set';
comment on column design_variants.stitch_screen_id  is 'Google Stitch screen ID for this specific variant';
comment on column design_variants.stitch_html_url   is 'Vercel Blob URL of the downloaded Stitch HTML for iframe preview';
comment on column design_variants.brand_tokens      is 'Extracted brand tokens (primary/secondary colors, heading/body fonts) as JSON';
