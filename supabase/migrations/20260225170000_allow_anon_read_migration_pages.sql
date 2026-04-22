-- Allow anonymous users to read migration_pages for serving migrated content
-- This is needed because the customer's Next.js site uses the anon key to fetch migrated HTML
CREATE POLICY "Anyone can read rewritten pages" ON public.migration_pages
  FOR SELECT USING (rewritten_html IS NOT NULL);
