export type DeployedWebsite = {
  id: string;
  user_id: string;
  business_id: string | null;
  site_slug: string | null;
  subdomain: string | null;
  custom_domain: string | null;
  dev_url: string | null;
  live_url: string | null;
  vercel_preview_url: string | null;
  vercel_project_id: string | null;
  github_repo_name: string | null;
  github_repo_url: string | null;
  status: string;
  approval_status: string;
  email_dns_status: string | null;
  deployed_at: string | null;
  created_at: string;
  businessName: string;
  userEmail: string;
};

export { ProjectsTab } from './projects-tab-lazy';
