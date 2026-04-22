export type BusinessStatus = 'onboarding' | 'paid' | 'assets_generating' | 'assets_ready' | 'approved' | 'active';

export type AssetType = 'logo' | 'branding_guide' | 'website_mockup' | 'color_palette' | 'font_selection' | 'branding_colors' | 'branding_fonts';

export type AssetStatus = 'pending' | 'generating' | 'ready' | 'approved' | 'rejected';

export type EditRequestStatus = 'pending' | 'in_progress' | 'completed' | 'rejected';

export type WebsiteStatus = 'building' | 'deployed' | 'failed' | 'suspended';

export type UpsellService = 'seo' | 'google_ads' | 'google_my_business';

export type MigrationJobStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export type MigrationPageStatus = 'pending' | 'rendering' | 'rewriting' | 'done' | 'failed';

export interface MigrationJob {
  id: string;
  customer_id: string;
  target_url: string;
  wp_admin_username: string | null;
  wp_application_password: string | null;
  status: MigrationJobStatus;
  total_pages: number;
  completed_pages: number;
  error_log: string | null;
  created_at: string;
  updated_at: string;
  migration_version: string | null;
  build_status: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  brand_guide_url: string | null;
  asset_manifest_url: string | null;
  component_library_url: string | null;
}

export interface MigrationPage {
  id: string;
  job_id: string;
  url: string;
  original_html: string | null;
  rewritten_html: string | null;
  metadata: Record<string, unknown>;
  status: MigrationPageStatus;
  retry_count: number;
  error_log: string | null;
  created_at: string;
  updated_at: string;
}

export interface Business {
  id: string;
  user_id: string;
  business_name: string | null;
  industry: string | null;
  location_city: string | null;
  location_state: string | null;
  location_country: string | null;
  target_audience: string | null;
  services_products: string | null;
  website_features: string[] | null;
  website_notes?: string | null;
  status: BusinessStatus;
  domain_name: string | null;
  domain_status: 'none' | 'purchasing' | 'active' | 'failed';
  vercel_order_id: string | null;
  domain_registered_at: string | null;
  domain_renewal_price_usd: number | null;
  created_at: string;
  updated_at: string;
}

export interface OnboardingResponse {
  id: string;
  user_id: string;
  business_id: string | null;
  step: number;
  responses: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface BrandAsset {
  id: string;
  user_id: string;
  business_id: string | null;
  has_existing_website: boolean;
  existing_website_url: string | null;
  has_existing_logo: boolean;
  existing_logo_url: string | null;
  has_brand_colors: boolean;
  brand_colors: string[] | null;
  has_brand_fonts: boolean;
  brand_fonts: string[] | null;
  has_business_card: boolean;
  business_card_front_url: string | null;
  business_card_back_url: string | null;
  has_facebook_page: boolean;
  facebook_page_url: string | null;
  style_preference: string | null;
  color_preference: string | null;
  font_preference: string | null;
  created_at: string;
  updated_at: string;
}

export interface DomainRequest {
  id: string;
  user_id: string;
  business_id: string | null;
  needs_domain: boolean;
  requested_domain: string | null;
  domain_price: number | null;
  markup_fee: number;
  status: 'pending' | 'purchased' | 'configured' | 'failed';
  namecheap_order_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface GeneratedAsset {
  id: string;
  user_id: string;
  business_id: string | null;
  asset_type: AssetType;
  storage_url: string | null;
  metadata: Record<string, unknown>;
  status: AssetStatus;
  is_selected: boolean;
  created_at: string;
  updated_at: string;
}

export interface EditRequest {
  id: string;
  user_id: string;
  business_id: string | null;
  request_description: string;
  target_page: string | null;
  status: EditRequestStatus;
  complexity: 'simple' | 'complex' | null;
  admin_notes: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type ApprovalStatus = 'pending' | 'dev_published' | 'approved' | 'prod_published';

export interface DeployedWebsite {
  id: string;
  user_id: string;
  business_id: string | null;
  vercel_project_id: string | null;
  vercel_deployment_id: string | null;
  subdomain: string | null;
  custom_domain: string | null;
  live_url: string | null;
  approval_status: ApprovalStatus;
  status: WebsiteStatus;
  deployed_at: string | null;
  created_at: string;
  updated_at: string;
  // Added by github_deployment_pipeline migration
  site_slug: string | null;
  github_repo_name: string | null;
  github_repo_url: string | null;
  vercel_preview_url: string | null;
  dev_url: string | null;
  prod_url: string | null;
}

export interface HostingPayment {
  id: string;
  user_id: string;
  business_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_checkout_session_id: string | null;
  hosting_months: number;
  amount: number;
  domain_fee: number;
  total_amount: number;
  status: string;
  paid_at: string | null;
  hosting_start_date: string | null;
  hosting_end_date: string | null;
  created_at: string;
}

export interface UpsellSubscription {
  id: string;
  user_id: string;
  business_id: string | null;
  service: UpsellService;
  stripe_subscription_id: string | null;
  monthly_price: number;
  discount_percent: number;
  status: string;
  started_at: string;
  canceled_at: string | null;
  created_at: string;
}

export interface AdminUser {
  id: string;
  user_id: string;
  created_at: string;
}

// Onboarding form data types
export interface OnboardingStep1Data {
  businessName: string;
  industry: string;
  industryOther?: string;
  locationCity: string;
  locationState: string;
  locationCountry: string;
}

export interface OnboardingStep2Data {
  hasExistingWebsite: boolean;
  existingWebsiteUrl?: string;
  hasExistingLogo: boolean;
  existingLogoFile?: File;
  stylePreference?: string;
  hasBrandColors: boolean;
  brandColors?: string[];
  colorPreference?: string;
  hasBrandFonts: boolean;
  brandFonts?: string[];
  fontPreference?: string;
}

export interface OnboardingStep3Data {
  targetAudience: string;
  servicesProducts: string;
  websiteFeatures: string[];
}

export interface OnboardingStep4Data {
  needsDomain: boolean;
  requestedDomain?: string;
  domainPrice?: number;
}

export interface OnboardingFormData {
  step1: OnboardingStep1Data;
  step2: OnboardingStep2Data;
  step3: OnboardingStep3Data;
  step4: OnboardingStep4Data;
}

// Pricing constants
export const HOSTING_PRICES = {
  6: 300,
  12: 500,
} as const;

export const UPSELL_PRICES = {
  seo: 500,
  google_ads: 100,
  google_my_business: 50,
} as const;

export const BUNDLE_DISCOUNT_PERCENT = 20;

export const DOMAIN_MARKUP_FEE = 5;

export const MAX_MONTHLY_EDITS = 5;
