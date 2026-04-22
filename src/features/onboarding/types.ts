import { z } from 'zod';

// ============================================
// STEP 1: Business Basics
// ============================================
export interface BusinessHours {
  open: string;
  close: string;
}

export interface OnboardingStep1Data {
  businessName: string;
  industry: string;
  industryOther: string;
  yearEstablished: number | null;
  tagline: string;
  description: string;
  // NAP
  addressStreet: string;
  addressCity: string;
  addressState: string;
  addressZip: string;
  addressCountry: string;
  phonePrimary: string;
  phoneSecondary: string;
  emailPublic: string;
  // Hours
  hours: Record<string, BusinessHours | null>;
}

// ============================================
// STEP 2: Domain & Online Presence
// ============================================
export interface SocialLink {
  platform: string;
  url: string;
}

export interface OnboardingStep2Data {
  // Domain
  ownsDomain: boolean;
  existingDomain: string;
  domainRegistrar: string;
  existingWebsiteUrl: string;
  desiredDomain: string;
  needsDomainPurchase: boolean;
  // Social Links
  socialFacebook: string;
  socialInstagram: string;
  socialYoutube: string;
  socialX: string;
  socialTiktok: string;
  socialLinkedin: string;
  socialGoogleBusiness: string;
  socialYelp: string;
  socialOther: SocialLink[];
  // Legacy fields for backward compatibility with existing customer-facing UI
  // TODO: Remove these after updating customer-facing onboarding components
  hasExistingWebsite?: boolean;
  hasExistingLogo?: boolean;
  existingLogoUrl?: string;
  hasBusinessCard?: boolean;
  businessCardFrontUrl?: string;
  businessCardBackUrl?: string;
  hasFacebookPage?: boolean;
  facebookPageUrl?: string;
  stylePreference?: string;
  hasBrandColors?: boolean;
  brandColors?: string[];
  colorPreference?: string;
}

// ============================================
// STEP 3: SEO & Target Market
// ============================================
export interface OnboardingStep3Data {
  targetLocations: string[];
  serviceAreaRadius: string;
  serviceAreaDescription: string;
  targetAudience: string;
  servicesProducts: string;
  serviceKeywords: string[];
  competitorUrls: string[];
  // Legacy field for backward compatibility - moved to Step 6
  websiteFeatures?: string[];
}

// ============================================
// STEP 4: Brand & Style
// ============================================
export interface BrandColor {
  hex: string;
  label: string;
}

export interface BrandGuideLogoSet {
  primaryUrl: string;
  horizontalUrl: string;
  squareUrl: string;
  circleUrl: string;
  lightUrl: string;
  darkUrl: string;
}

export interface BrandGuideTypography {
  headingFont: string;
  bodyFont: string;
  displayFont: string;
  logoFont: string;
  h1Font: string;
  h2Font: string;
  h3Font: string;
  paragraphFont: string;
}

export interface BrandGuideColorSystem {
  primary: BrandColor[];
  secondary: BrandColor[];
  neutrals: BrandColor[];
  text: BrandColor[];
  backgrounds: BrandColor[];
  cta: BrandColor | null;
}

export interface BrandGuideMinimal {
  status: string;
  styleKeywords: string[];
  toneKeywords: string[];
  logoVariants: string[];
  typography: Partial<BrandGuideTypography>;
  colors: Partial<BrandGuideColorSystem>;
  updatedAt: string;
}

export interface BrandGuideSelectionState {
  selectedLogoVariant: string;
  selectedPaletteId: string;
  selectedHeadingFont: string;
  selectedBodyFont: string;
  selectedDisplayFont: string;
  selectedCtaColor: string;
  notes: string;
}

export interface OnboardingStep4Data {
  hasExistingLogo: boolean;
  logoUrls: string[];
  hasBrandColors: boolean;
  brandColors: BrandColor[];
  hasBrandFonts: boolean;
  brandFonts: string[];
  stylePreference: string;
  toneOfVoice: string;
  colorPreference: string;
  fontPreference: string;
  inspirationUrls: string[];
  inspirationNotes: string;
  brandGuideStatus: string;
  brandGuideId: string;
  minimalBrandGuide: BrandGuideMinimal | null;
  brandGuideSelections: BrandGuideSelectionState;
  brandGuidePromptTemplateKey: string;
  // Legacy domain fields for backward compatibility (old step 4 was domain)
  needsDomain?: boolean;
  selectedDomain?: string | null;
  selectedDomainOurPrice?: number | null;
  selectedDomainVercelPrice?: number | null;
  requestedDomain?: string;
  domainPrice?: number | null;
  registrantContact?: DomainRegistrantContact;
}

// ============================================
// STEP 5: Content & Media (Uploads)
// ============================================
export interface UploadedFile {
  url: string;
  filename: string;
  notes?: string;
}

export type OnboardingAssetTag =
  | 'logo'
  | 'business_card'
  | 'flyer'
  | 'brochure'
  | 'menu'
  | 'truck_wrap'
  | 'signage'
  | 'project_photo'
  | 'team_photo'
  | 'storefront'
  | 'inspiration'
  | 'old_website_screenshot'
  | 'current_branding'
  | 'reference_only'
  | 'other';

export interface IntakeAsset {
  id: string;
  inputType: 'file' | 'url';
  title: string;
  notes: string;
  tags: OnboardingAssetTag[];
  sourceUrl: string;
  storageUrl: string;
  storagePath: string;
  fileName: string;
  mimeType: string;
  metadata: Record<string, unknown>;
}

export interface TeamPhoto extends UploadedFile {
  name: string;
  title: string;
}

export interface Testimonial {
  quote: string;
  author: string;
  rating: number | null;
  photoUrl: string;
}

export interface Certification {
  name: string;
  issuer: string;
  year: number | null;
  imageUrl: string;
}

export interface Award {
  name: string;
  year: number | null;
  imageUrl: string;
}

export interface FAQ {
  question: string;
  answer: string;
}

export interface OnboardingStep5Data {
  uploadedLogos: UploadedFile[];
  uploadedPhotos: UploadedFile[];
  uploadedTeamPhotos: TeamPhoto[];
  uploadedPortfolio: UploadedFile[];
  uploadedInspiration: UploadedFile[];
  uploadedDocuments: UploadedFile[];
  uploadedOther: UploadedFile[];
  uploadedAssets: IntakeAsset[];
  websiteInspirationUrls: string[];
  intakeNotes: string;
  existingWebsiteScanEnabled: boolean;
  testimonials: Testimonial[];
  certifications: Certification[];
  awards: Award[];
  faqs: FAQ[];
}

// ============================================
// LEGACY: Domain Registrant Contact (for backward compatibility)
// ============================================
export interface DomainRegistrantContact {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

// ============================================
// STEP 6: Website Features & Preferences
// ============================================
export interface License {
  type: string;
  number: string;
  state: string;
}

export interface SpecialOffer {
  title: string;
  description: string;
  expires: string;
}

export interface Integration {
  type: string;
  details: string;
}

export interface OnboardingStep6Data {
  websiteFeatures: string[];
  primaryCta: string;
  leadFormFields: string[];
  // Trust Signals
  licenses: License[];
  insuranceInfo: string;
  associations: string[];
  paymentMethods: string[];
  // USPs
  uniqueSellingPoints: string[];
  specialOffers: SpecialOffer[];
  languagesServed: string[];
  integrationsNeeded: Integration[];
}

// ============================================
// COMBINED FORM DATA
// ============================================
export interface OnboardingFormData {
  step1: OnboardingStep1Data;
  step2: OnboardingStep2Data;
  step3: OnboardingStep3Data;
  step4: OnboardingStep4Data;
  step5: OnboardingStep5Data;
  step6: OnboardingStep6Data;
}

export const initialOnboardingData: OnboardingFormData = {
  step1: {
    businessName: '',
    industry: '',
    industryOther: '',
    yearEstablished: null,
    tagline: '',
    description: '',
    addressStreet: '',
    addressCity: '',
    addressState: '',
    addressZip: '',
    addressCountry: '',
    phonePrimary: '',
    phoneSecondary: '',
    emailPublic: '',
    hours: {},
  },
  step2: {
    ownsDomain: false,
    existingDomain: '',
    domainRegistrar: '',
    existingWebsiteUrl: '',
    desiredDomain: '',
    needsDomainPurchase: false,
    socialFacebook: '',
    socialInstagram: '',
    socialYoutube: '',
    socialX: '',
    socialTiktok: '',
    socialLinkedin: '',
    socialGoogleBusiness: '',
    socialYelp: '',
    socialOther: [],
    // Legacy fields for backward compatibility
    hasExistingWebsite: false,
    hasExistingLogo: false,
    existingLogoUrl: '',
    hasBusinessCard: false,
    businessCardFrontUrl: '',
    businessCardBackUrl: '',
    hasFacebookPage: false,
    facebookPageUrl: '',
    stylePreference: '',
    hasBrandColors: false,
    brandColors: [],
    colorPreference: '',
  },
  step3: {
    targetLocations: [],
    serviceAreaRadius: '',
    serviceAreaDescription: '',
    targetAudience: '',
    servicesProducts: '',
    serviceKeywords: [],
    competitorUrls: [],
    websiteFeatures: [],
  },
  step4: {
    hasExistingLogo: false,
    logoUrls: [],
    hasBrandColors: false,
    brandColors: [],
    hasBrandFonts: false,
    brandFonts: [],
    stylePreference: '',
    toneOfVoice: '',
    colorPreference: '',
    fontPreference: '',
    inspirationUrls: [],
    inspirationNotes: '',
    brandGuideStatus: 'not_started',
    brandGuideId: '',
    minimalBrandGuide: null,
    brandGuideSelections: {
      selectedLogoVariant: '',
      selectedPaletteId: '',
      selectedHeadingFont: '',
      selectedBodyFont: '',
      selectedDisplayFont: '',
      selectedCtaColor: '',
      notes: '',
    },
    brandGuidePromptTemplateKey: 'brand-guide-default',
    // Legacy domain fields
    needsDomain: false,
    selectedDomain: '',
    domainPrice: undefined,
    registrantContact: undefined,
  },
  step5: {
    uploadedLogos: [],
    uploadedPhotos: [],
    uploadedTeamPhotos: [],
    uploadedPortfolio: [],
    uploadedInspiration: [],
    uploadedDocuments: [],
    uploadedOther: [],
    uploadedAssets: [],
    websiteInspirationUrls: [],
    intakeNotes: '',
    existingWebsiteScanEnabled: true,
    testimonials: [],
    certifications: [],
    awards: [],
    faqs: [],
  },
  step6: {
    websiteFeatures: [],
    primaryCta: '',
    leadFormFields: [],
    licenses: [],
    insuranceInfo: '',
    associations: [],
    paymentMethods: [],
    uniqueSellingPoints: [],
    specialOffers: [],
    languagesServed: [],
    integrationsNeeded: [],
  },
};

// ============================================
// VALIDATION SCHEMAS
// ============================================
export const Step1Schema = z.object({
  businessName: z.string().min(1, 'Business name is required'),
  industry: z.string().min(1, 'Industry is required'),
  industryOther: z.string().optional(),
  addressCity: z.string().min(1, 'City is required'),
  addressState: z.string().optional(),
  addressCountry: z.string().min(1, 'Country is required'),
}).refine((d) => d.industry !== 'other' || (d.industryOther ?? '').trim().length > 0, {
  message: 'Please specify your industry',
  path: ['industryOther'],
});

export const Step2Schema = z.object({
  ownsDomain: z.boolean(),
  existingDomain: z.string().optional(),
  existingWebsiteUrl: z.string().optional(),
  desiredDomain: z.string().optional(),
});

export const Step3Schema = z.object({
  targetAudience: z.string().min(1, 'Target audience is required'),
  servicesProducts: z.string().min(1, 'Services/products are required'),
});

export const Step4Schema = z.object({
  stylePreference: z.string().optional(),
  toneOfVoice: z.string().optional(),
});

export const Step5Schema = z.object({
  // Uploads are optional
});

export const Step6Schema = z.object({
  websiteFeatures: z.array(z.string()).min(1, 'Select at least one feature'),
});

export type Step1Errors = Partial<Record<keyof z.infer<typeof Step1Schema>, string>>;
export type Step2Errors = Partial<Record<keyof z.infer<typeof Step2Schema>, string>>;
export type Step3Errors = Partial<Record<keyof z.infer<typeof Step3Schema>, string>>;
export type Step4Errors = Partial<Record<keyof z.infer<typeof Step4Schema>, string>>;
export type Step5Errors = Partial<Record<keyof z.infer<typeof Step5Schema>, string>>;
export type Step6Errors = Partial<Record<keyof z.infer<typeof Step6Schema>, string>>;

export const INDUSTRIES = [
  { value: 'retail', label: 'Retail / Shop' },
  { value: 'services', label: 'Professional Services' },
  { value: 'food', label: 'Food & Restaurant' },
  { value: 'health', label: 'Health & Wellness' },
  { value: 'beauty', label: 'Beauty & Salon' },
  { value: 'construction', label: 'Construction & Home Services' },
  { value: 'automotive', label: 'Automotive' },
  { value: 'education', label: 'Education & Training' },
  { value: 'creative', label: 'Creative & Design' },
  { value: 'other', label: 'Other' },
];

export const STYLE_PREFERENCES = [
  { value: 'modern', label: 'Modern & Minimalist' },
  { value: 'classic', label: 'Classic & Traditional' },
  { value: 'fun', label: 'Fun & Playful' },
  { value: 'professional', label: 'Professional & Corporate' },
  { value: 'elegant', label: 'Elegant & Luxurious' },
  { value: 'bold', label: 'Bold & Vibrant' },
];

export const WEBSITE_FEATURES = [
  { value: 'contact_form', label: 'Contact Form' },
  { value: 'about_page', label: 'About Us Page' },
  { value: 'services_page', label: 'Services/Products Page' },
  { value: 'gallery', label: 'Photo Gallery' },
  { value: 'testimonials', label: 'Customer Testimonials' },
  { value: 'map', label: 'Location Map' },
  { value: 'social_links', label: 'Social Media Links' },
  { value: 'blog', label: 'Blog Section' },
  { value: 'booking', label: 'Appointment Booking' },
  { value: 'pricing', label: 'Pricing Table' },
];

export const COLOR_SUGGESTIONS = [
  { value: 'blue', label: 'Blue - Trust & Professionalism', colors: ['#1e40af', '#3b82f6', '#93c5fd'] },
  { value: 'green', label: 'Green - Growth & Nature', colors: ['#166534', '#22c55e', '#86efac'] },
  { value: 'red', label: 'Red - Energy & Passion', colors: ['#991b1b', '#ef4444', '#fca5a5'] },
  { value: 'purple', label: 'Purple - Creativity & Luxury', colors: ['#6b21a8', '#a855f7', '#d8b4fe'] },
  { value: 'orange', label: 'Orange - Friendly & Energetic', colors: ['#c2410c', '#f97316', '#fdba74'] },
  { value: 'neutral', label: 'Neutral - Sophisticated & Timeless', colors: ['#1f2937', '#6b7280', '#d1d5db'] },
];

export const TONE_OF_VOICE = [
  { value: 'professional', label: 'Professional & Formal' },
  { value: 'friendly', label: 'Friendly & Approachable' },
  { value: 'casual', label: 'Casual & Relaxed' },
  { value: 'authoritative', label: 'Authoritative & Expert' },
  { value: 'playful', label: 'Playful & Fun' },
];

export const PRIMARY_CTA_OPTIONS = [
  { value: 'call', label: 'Call Us' },
  { value: 'book', label: 'Book Appointment' },
  { value: 'quote', label: 'Get a Quote' },
  { value: 'contact', label: 'Contact Us' },
  { value: 'buy', label: 'Shop / Buy Now' },
  { value: 'learn', label: 'Learn More' },
];

export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'check', label: 'Check' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'debit_card', label: 'Debit Card' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'venmo', label: 'Venmo' },
  { value: 'zelle', label: 'Zelle' },
  { value: 'apple_pay', label: 'Apple Pay' },
  { value: 'google_pay', label: 'Google Pay' },
  { value: 'financing', label: 'Financing Available' },
];

export const SOCIAL_PLATFORMS = [
  { value: 'facebook', label: 'Facebook', field: 'socialFacebook' },
  { value: 'instagram', label: 'Instagram', field: 'socialInstagram' },
  { value: 'youtube', label: 'YouTube', field: 'socialYoutube' },
  { value: 'x', label: 'X (Twitter)', field: 'socialX' },
  { value: 'tiktok', label: 'TikTok', field: 'socialTiktok' },
  { value: 'linkedin', label: 'LinkedIn', field: 'socialLinkedin' },
  { value: 'google_business', label: 'Google Business', field: 'socialGoogleBusiness' },
  { value: 'yelp', label: 'Yelp', field: 'socialYelp' },
];

export const DAYS_OF_WEEK = [
  { value: 'mon', label: 'Monday' },
  { value: 'tue', label: 'Tuesday' },
  { value: 'wed', label: 'Wednesday' },
  { value: 'thu', label: 'Thursday' },
  { value: 'fri', label: 'Friday' },
  { value: 'sat', label: 'Saturday' },
  { value: 'sun', label: 'Sunday' },
];

export const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'zh', label: 'Chinese' },
  { value: 'vi', label: 'Vietnamese' },
  { value: 'ko', label: 'Korean' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ar', label: 'Arabic' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'other', label: 'Other' },
];

export const INTEGRATION_TYPES = [
  { value: 'booking', label: 'Appointment Booking (Calendly, Acuity, etc.)' },
  { value: 'payment', label: 'Payment Processing (Stripe, Square, etc.)' },
  { value: 'chat', label: 'Live Chat Widget' },
  { value: 'reviews', label: 'Review Integration (Google, Yelp)' },
  { value: 'email', label: 'Email Marketing (Mailchimp, etc.)' },
  { value: 'crm', label: 'CRM Integration' },
  { value: 'analytics', label: 'Analytics (Google Analytics, etc.)' },
  { value: 'other', label: 'Other' },
];
