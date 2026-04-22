export interface BrandingGuideInput {
  businessName: string;
  industry: string;
  targetAudience: string;
  servicesProducts: string;
  stylePreference: string;
  colorPreference: string;
  existingWebsiteUrl?: string;
}

export interface BrandingGuideOutput {
  brandStory: string;
  missionStatement: string;
  valueProposition: string;
  targetAudienceDescription: string;
  brandVoice: string;
  colorPalette: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  typography: {
    headingFont: string;
    bodyFont: string;
  };
  logoGuidelines: string;
}

export interface LogoGenerationInput {
  businessName: string;
  industry: string;
  stylePreference: string;
  colorPalette: string[];
}

export interface LogoGenerationOutput {
  imageUrl: string;
  prompt: string;
  metadata: Record<string, unknown>;
}

export interface WebsiteCopyInput {
  businessName: string;
  industry: string;
  targetAudience: string;
  servicesProducts: string;
  websiteFeatures: string[];
  brandVoice: string;
}

export interface WebsiteCopyOutput {
  heroHeadline: string;
  heroSubheadline: string;
  aboutSection: string;
  servicesSection: {
    title: string;
    description: string;
  }[];
  ctaText: string;
  contactSection: string;
}

export interface AssetGenerationJob {
  id: string;
  userId: string;
  businessId: string;
  type: 'logo' | 'branding_guide' | 'website_copy' | 'website_mockup';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}
