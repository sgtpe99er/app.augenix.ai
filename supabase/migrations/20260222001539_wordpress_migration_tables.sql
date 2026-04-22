-- Create enum for migration job status
CREATE TYPE migration_job_status AS ENUM (
  'pending',
  'in_progress',
  'completed',
  'failed'
);

-- Create enum for migration page status
CREATE TYPE migration_page_status AS ENUM (
  'pending',
  'rendering',
  'rewriting',
  'done',
  'failed'
);

-- Create migration_jobs table
CREATE TABLE public.migration_jobs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  target_url text NOT NULL,
  wp_admin_username text,
  wp_application_password text, -- Note: Store encrypted or in Vault in production
  status migration_job_status DEFAULT 'pending' NOT NULL,
  total_pages integer DEFAULT 0 NOT NULL,
  completed_pages integer DEFAULT 0 NOT NULL,
  error_log text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create migration_pages table
CREATE TABLE public.migration_pages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id uuid REFERENCES public.migration_jobs(id) ON DELETE CASCADE NOT NULL,
  url text NOT NULL,
  original_html text,
  rewritten_html text,
  metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
  status migration_page_status DEFAULT 'pending' NOT NULL,
  retry_count integer DEFAULT 0 NOT NULL,
  error_log text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies
ALTER TABLE public.migration_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.migration_pages ENABLE ROW LEVEL SECURITY;

-- Only admins can access migration jobs and pages
CREATE POLICY "Admins can view all migration jobs" ON public.migration_jobs
  FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert migration jobs" ON public.migration_jobs
  FOR INSERT WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update migration jobs" ON public.migration_jobs
  FOR UPDATE USING (is_admin(auth.uid()));

CREATE POLICY "Admins can view all migration pages" ON public.migration_pages
  FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert migration pages" ON public.migration_pages
  FOR INSERT WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update migration pages" ON public.migration_pages
  FOR UPDATE USING (is_admin(auth.uid()));

-- Triggers for updated_at
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.migration_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.migration_pages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();