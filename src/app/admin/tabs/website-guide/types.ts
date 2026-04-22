export interface WebsiteGuideData {
  websiteGuideApprovedAt: string | null;

  // Business Basics
  businessName: string;
  industry: string;
  industryOther: string;
  tagline: string;
  yearEstablished: number | null;
  description: string;
  addressStreet: string;
  addressCity: string;
  addressState: string;
  addressZip: string;
  addressCountry: string;
  phonePrimary: string;
  emailPublic: string;
  hours: Record<string, { open: string; close: string } | null>;

  // Domain
  ownsDomain: boolean;
  existingDomain: string;
  domainRegistrar: string;
  desiredDomain: string;
  existingWebsiteUrl: string;
  needsDomainPurchase: boolean;
  emailAddresses: string[];

  // Online Presence
  socialFacebook: string;
  socialInstagram: string;
  socialYoutube: string;
  socialX: string;
  socialTiktok: string;
  socialLinkedin: string;
  socialGoogleBusiness: string;
  socialYelp: string;
  socialOther: { platform: string; url: string }[];

  // SEO & Target Market
  targetAudience: string;
  servicesProducts: string;
  targetLocations: string[];
  serviceAreaRadius: string;
  serviceAreaDescription: string;
  serviceKeywords: string[];
  competitorUrls: string[];

  // Website Features
  websiteFeatures: string[];
  primaryCta: string;
  leadFormFields: string[];
  licenses: { type: string; number: string; state: string }[];
  insuranceInfo: string;
  associations: string[];
  paymentMethods: string[];
  uniqueSellingPoints: string[];
  specialOffers: { title: string; description: string; expires: string }[];
  languagesServed: string[];
  integrationsNeeded: { type: string; details: string }[];
}

export const WEBSITE_GUIDE_FIELDS: {
  section: string;
  fields: {
    key: keyof WebsiteGuideData;
    label: string;
    type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'hours';
    critical: boolean;
  }[];
}[] = [
  {
    section: 'Business Basics',
    fields: [
      { key: 'businessName', label: 'Business Name', type: 'string', critical: true },
      { key: 'industry', label: 'Industry', type: 'string', critical: false },
      { key: 'industryOther', label: 'Industry (Other)', type: 'string', critical: false },
      { key: 'tagline', label: 'Tagline', type: 'string', critical: false },
      { key: 'yearEstablished', label: 'Year Established', type: 'number', critical: false },
      { key: 'description', label: 'Description', type: 'string', critical: false },
      { key: 'addressStreet', label: 'Street Address', type: 'string', critical: false },
      { key: 'addressCity', label: 'City', type: 'string', critical: true },
      { key: 'addressState', label: 'State/Province', type: 'string', critical: true },
      { key: 'addressZip', label: 'ZIP/Postal Code', type: 'string', critical: false },
      { key: 'addressCountry', label: 'Country', type: 'string', critical: true },
      { key: 'phonePrimary', label: 'Primary Phone', type: 'string', critical: true },
      { key: 'emailPublic', label: 'Public Email', type: 'string', critical: false },
      { key: 'hours', label: 'Business Hours', type: 'hours', critical: false },
    ],
  },
  {
    section: 'Domain',
    fields: [
      { key: 'ownsDomain', label: 'Owns Domain', type: 'boolean', critical: false },
      { key: 'existingDomain', label: 'Existing Domain', type: 'string', critical: false },
      { key: 'domainRegistrar', label: 'Domain Registrar', type: 'string', critical: false },
      { key: 'desiredDomain', label: 'Desired Domain', type: 'string', critical: false },
      { key: 'existingWebsiteUrl', label: 'Existing Website URL', type: 'string', critical: false },
      { key: 'needsDomainPurchase', label: 'Needs Domain Purchase', type: 'boolean', critical: false },
    ],
  },
  {
    section: 'Email',
    fields: [
      { key: 'emailAddresses', label: 'Email Addresses to Setup', type: 'array', critical: false },
    ],
  },
  {
    section: 'Online Presence',
    fields: [
      { key: 'socialFacebook', label: 'Facebook', type: 'string', critical: false },
      { key: 'socialInstagram', label: 'Instagram', type: 'string', critical: false },
      { key: 'socialYoutube', label: 'YouTube', type: 'string', critical: false },
      { key: 'socialX', label: 'X (Twitter)', type: 'string', critical: false },
      { key: 'socialTiktok', label: 'TikTok', type: 'string', critical: false },
      { key: 'socialLinkedin', label: 'LinkedIn', type: 'string', critical: false },
      { key: 'socialGoogleBusiness', label: 'Google Business', type: 'string', critical: false },
      { key: 'socialYelp', label: 'Yelp', type: 'string', critical: false },
      { key: 'socialOther', label: 'Other Social Links', type: 'object', critical: false },
    ],
  },
  {
    section: 'SEO & Target Market',
    fields: [
      { key: 'targetAudience', label: 'Target Audience', type: 'string', critical: false },
      { key: 'servicesProducts', label: 'Services/Products', type: 'string', critical: true },
      { key: 'targetLocations', label: 'Target Locations', type: 'array', critical: true },
      { key: 'serviceAreaRadius', label: 'Service Area Radius', type: 'string', critical: false },
      { key: 'serviceAreaDescription', label: 'Service Area Description', type: 'string', critical: false },
      { key: 'serviceKeywords', label: 'SEO Keywords', type: 'array', critical: false },
      { key: 'competitorUrls', label: 'Competitor URLs', type: 'array', critical: false },
    ],
  },
  {
    section: 'Website Features',
    fields: [
      { key: 'websiteFeatures', label: 'Website Features', type: 'array', critical: false },
      { key: 'primaryCta', label: 'Primary CTA', type: 'string', critical: true },
      { key: 'leadFormFields', label: 'Lead Form Fields', type: 'array', critical: false },
      { key: 'licenses', label: 'Licenses', type: 'object', critical: false },
      { key: 'insuranceInfo', label: 'Insurance Info', type: 'string', critical: false },
      { key: 'associations', label: 'Associations', type: 'array', critical: false },
      { key: 'paymentMethods', label: 'Payment Methods', type: 'array', critical: false },
      { key: 'uniqueSellingPoints', label: 'Unique Selling Points', type: 'array', critical: false },
      { key: 'specialOffers', label: 'Special Offers', type: 'object', critical: false },
      { key: 'languagesServed', label: 'Languages Served', type: 'array', critical: false },
      { key: 'integrationsNeeded', label: 'Integrations Needed', type: 'object', critical: false },
    ],
  },
];

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

export const DAYS_OF_WEEK = [
  { value: 'mon', label: 'Monday' },
  { value: 'tue', label: 'Tuesday' },
  { value: 'wed', label: 'Wednesday' },
  { value: 'thu', label: 'Thursday' },
  { value: 'fri', label: 'Friday' },
  { value: 'sat', label: 'Saturday' },
  { value: 'sun', label: 'Sunday' },
];

export const EMAIL_SUGGESTIONS = [
  'firstname@domain.com',
  'firstname.lastname@domain.com',
  'noreply@domain.com',
  'sales@domain.com',
  'support@domain.com',
];

export const initialWebsiteGuideData: WebsiteGuideData = {
  websiteGuideApprovedAt: null,
  businessName: '',
  industry: '',
  industryOther: '',
  tagline: '',
  yearEstablished: null,
  description: '',
  addressStreet: '',
  addressCity: '',
  addressState: '',
  addressZip: '',
  addressCountry: '',
  phonePrimary: '',
  emailPublic: '',
  hours: {},
  ownsDomain: false,
  existingDomain: '',
  domainRegistrar: '',
  desiredDomain: '',
  existingWebsiteUrl: '',
  needsDomainPurchase: false,
  emailAddresses: [],
  socialFacebook: '',
  socialInstagram: '',
  socialYoutube: '',
  socialX: '',
  socialTiktok: '',
  socialLinkedin: '',
  socialGoogleBusiness: '',
  socialYelp: '',
  socialOther: [],
  targetAudience: '',
  servicesProducts: '',
  targetLocations: [],
  serviceAreaRadius: '',
  serviceAreaDescription: '',
  serviceKeywords: [],
  competitorUrls: [],
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
};
