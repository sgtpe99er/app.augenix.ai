-- Add ON DELETE CASCADE to all FK constraints referencing auth.users
-- so that deleting a user from auth cascades to all related tables.

DO $$
DECLARE
  tables_cols text[][] := ARRAY[
    ARRAY['users',                 'id',      'users_id_fkey'],
    ARRAY['customers',             'id',      'customers_id_fkey'],
    ARRAY['subscriptions',         'user_id', 'subscriptions_user_id_fkey'],
    ARRAY['businesses',            'user_id', 'businesses_user_id_fkey'],
    ARRAY['onboarding_responses',  'user_id', 'onboarding_responses_user_id_fkey'],
    ARRAY['brand_assets',          'user_id', 'brand_assets_user_id_fkey'],
    ARRAY['domain_requests',       'user_id', 'domain_requests_user_id_fkey'],
    ARRAY['generated_assets',      'user_id', 'generated_assets_user_id_fkey'],
    ARRAY['edit_requests',         'user_id', 'edit_requests_user_id_fkey'],
    ARRAY['deployed_websites',     'user_id', 'deployed_websites_user_id_fkey'],
    ARRAY['hosting_payments',      'user_id', 'hosting_payments_user_id_fkey'],
    ARRAY['upsell_subscriptions',  'user_id', 'upsell_subscriptions_user_id_fkey'],
    ARRAY['admin_users',           'user_id', 'admin_users_user_id_fkey'],
    ARRAY['customer_inputs',       'user_id', 'customer_inputs_user_id_fkey'],
    ARRAY['customer_input_folders','user_id', 'customer_input_folders_user_id_fkey']
  ];
  t text[];
  tbl text;
  col text;
  con text;
BEGIN
  FOREACH t SLICE 1 IN ARRAY tables_cols LOOP
    tbl := t[1];
    col := t[2];
    con := t[3];

    -- Only proceed if table exists
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      -- Drop old constraint if it exists
      IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_schema = 'public' AND table_name = tbl AND constraint_name = con
      ) THEN
        EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', tbl, con);
      END IF;

      -- Re-add with ON DELETE CASCADE
      EXECUTE format(
        'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES auth.users(id) ON DELETE CASCADE',
        tbl, con, col
      );
    END IF;
  END LOOP;
END
$$;
