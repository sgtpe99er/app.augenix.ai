export interface ExtractedBranding {
  colors: string[];
  fonts: string[];
  extractedAt: string;
}

export interface BrandingImageInput {
  id: string;
  title: string | null;
  notes: string;
  tags: string[];
  storageUrl: string | null;
  fileName: string | null;
  mimeType: string | null;
  createdAt: string;
  folderId: string | null;
  extractedBranding?: ExtractedBranding | null;
}

export interface InputFolder {
  id: string;
  name: string;
  createdAt: string;
}

export interface ColorRole {
  label: string;
  value: string;
}

export interface TypographyScale {
  h1: string;
  h2: string;
  h3: string;
  body: string;
  small: string;
}

export interface TypographyWeights {
  light: number;
  normal: number;
  medium: number;
  semibold: number;
  bold: number;
}

export interface TypographyLineHeights {
  tight: number;
  normal: number;
  relaxed: number;
}

export interface TypographyFontAssignments {
  h1: string;
  h2: string;
  h3: string;
  body: string;
  small: string;
}

export interface BrandingGuideData {
  brandingGuideApprovedAt: string | null;
  customerId: string;
  businessName: string;
  hasExistingLogo: boolean;
  logoUrls: string[];
  uploadedImages: BrandingImageInput[];
  folders: InputFolder[];
  hasBrandColors: boolean;
  brandColors: string[];
  colorPreference: string;
  colors: {
    primary: string[];
    secondary: string[];
    accent: string[];
    text: ColorRole[];
    background: ColorRole[];
    border: string;
  };
  hasBrandFonts: boolean;
  brandFonts: string[];
  fontPreference: string;
  typography: {
    fontFamily: {
      primary: string;
      secondary: string;
    };
    fontAssignments: TypographyFontAssignments;
    fontSizes: TypographyScale;
    fontWeights: TypographyWeights;
    lineHeights: TypographyLineHeights;
  };
  stylePreference: string;
  toneOfVoice: string;
  inspirationUrls: string[];
  inspirationNotes: string;
  spacing: Record<string, string>;
  borderRadius: Record<string, string>;
  shadows: Record<string, string>;
  uiPatterns: {
    buttons: {
      primary: string;
      secondary: string;
    };
    cards: string;
    inputs: string;
  };
  cssVariables: string;
}

export const BRANDING_GUIDE_FIELDS: {
  section: string;
  fields: {
    key: keyof BrandingGuideData;
    label: string;
    type: 'string' | 'boolean' | 'array' | 'object';
    critical: boolean;
  }[];
}[] = [
  {
    section: 'Logo & Assets',
    fields: [
      { key: 'hasExistingLogo', label: 'Has Existing Logo', type: 'boolean', critical: true },
      { key: 'logoUrls', label: 'Logo URLs', type: 'array', critical: false },
      { key: 'uploadedImages', label: 'Uploaded Images', type: 'array', critical: false },
    ],
  },
  {
    section: 'Colors',
    fields: [
      { key: 'hasBrandColors', label: 'Has Brand Colors', type: 'boolean', critical: true },
      { key: 'brandColors', label: 'Brand Colors', type: 'array', critical: true },
      { key: 'colorPreference', label: 'Color Preference', type: 'string', critical: false },
      { key: 'colors', label: 'Extracted Color System', type: 'object', critical: false },
    ],
  },
  {
    section: 'Typography',
    fields: [
      { key: 'hasBrandFonts', label: 'Has Brand Fonts', type: 'boolean', critical: true },
      { key: 'brandFonts', label: 'Brand Fonts', type: 'array', critical: true },
      { key: 'fontPreference', label: 'Font Preference', type: 'string', critical: false },
      { key: 'typography', label: 'Typography Scale', type: 'object', critical: false },
    ],
  },
  {
    section: 'Style Preference',
    fields: [{ key: 'stylePreference', label: 'Style Preference', type: 'string', critical: true }],
  },
  {
    section: 'Tone of Voice',
    fields: [{ key: 'toneOfVoice', label: 'Tone of Voice', type: 'string', critical: true }],
  },
  {
    section: 'Inspiration',
    fields: [
      { key: 'inspirationUrls', label: 'Inspiration URLs', type: 'array', critical: false },
      { key: 'inspirationNotes', label: 'Inspiration Notes', type: 'string', critical: false },
    ],
  },
  {
    section: 'Design Tokens',
    fields: [
      { key: 'spacing', label: 'Spacing Scale', type: 'object', critical: false },
      { key: 'borderRadius', label: 'Border Radius', type: 'object', critical: false },
      { key: 'shadows', label: 'Shadows', type: 'object', critical: false },
      { key: 'uiPatterns', label: 'UI Patterns', type: 'object', critical: false },
      { key: 'cssVariables', label: 'CSS Variables', type: 'string', critical: false },
    ],
  },
];

export const STYLE_PREFERENCES = [
  {
    value: 'modern',
    label: 'Modern',
    description: 'Clean layouts, minimal details, crisp hierarchy',
  },
  {
    value: 'classic',
    label: 'Classic',
    description: 'Timeless typography, traditional spacing, refined details',
  },
  {
    value: 'bold',
    label: 'Bold',
    description: 'High contrast, strong headings, confident presentation',
  },
  {
    value: 'professional',
    label: 'Professional',
    description: 'Structured, trustworthy, polished business presentation',
  },
  {
    value: 'playful',
    label: 'Playful',
    description: 'Friendly shapes, bright accents, approachable feel',
  },
  {
    value: 'elegant',
    label: 'Elegant',
    description: 'Refined layouts, generous spacing, premium tone',
  },
];

export const TONE_OF_VOICE = [
  {
    value: 'professional',
    label: 'Professional',
    example: 'We deliver exceptional results with a clear, dependable process.',
  },
  {
    value: 'friendly',
    label: 'Friendly',
    example: 'We make the process simple, welcoming, and easy to trust.',
  },
  {
    value: 'casual',
    label: 'Casual',
    example: 'Let’s keep things straightforward and build something great together.',
  },
  {
    value: 'authoritative',
    label: 'Authoritative',
    example: 'Industry-leading expertise backed by proven results and experience.',
  },
  {
    value: 'playful',
    label: 'Playful',
    example: 'Bright ideas, upbeat energy, and a brand that feels alive.',
  },
];

export const FONT_OPTIONS = [
  'Inter',
  'Montserrat',
  'Poppins',
  'Playfair Display',
  'Lora',
  'DM Sans',
  'Source Sans 3',
  'Nunito Sans',
  'Merriweather',
  'Raleway',
  'Open Sans',
  'Roboto Slab',
  'System UI',
];

export interface ColorPalette {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  vibes: string[];
  source: 'curated' | 'extracted' | 'inspiration' | 'ai-generated';
}

export interface FontPairing {
  id: string;
  name: string;
  heading: string;
  body: string;
  vibes: string[];
  source: 'curated' | 'extracted' | 'ai-generated';
}

export interface StylePackage {
  name: string;
  palette: ColorPalette;
  fonts: FontPairing;
  vibe: string;
}

export interface ColorAssignment {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
}

export interface PreviewProps {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  headingFont: string;
  bodyFont: string;
  stylePreference: string;
  businessName: string;
  toneOfVoice: string;
}

export const initialBrandingGuideData: BrandingGuideData = {
  brandingGuideApprovedAt: null,
  customerId: '',
  businessName: '',
  hasExistingLogo: false,
  logoUrls: [],
  uploadedImages: [],
  folders: [],
  hasBrandColors: false,
  brandColors: [],
  colorPreference: '',
  colors: {
    primary: [],
    secondary: [],
    accent: [],
    text: [],
    background: [],
    border: '',
  },
  hasBrandFonts: false,
  brandFonts: [],
  fontPreference: '',
  typography: {
    fontFamily: {
      primary: 'Inter',
      secondary: 'System UI',
    },
    fontAssignments: {
      h1: '',
      h2: '',
      h3: '',
      body: '',
      small: '',
    },
    fontSizes: {
      h1: '2.75rem',
      h2: '2rem',
      h3: '1.5rem',
      body: '1rem',
      small: '0.875rem',
    },
    fontWeights: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeights: {
      tight: 1.15,
      normal: 1.5,
      relaxed: 1.75,
    },
  },
  stylePreference: '',
  toneOfVoice: '',
  inspirationUrls: [],
  inspirationNotes: '',
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    '2xl': '48px',
  },
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
  },
  shadows: {
    sm: '0 1px 2px rgba(0,0,0,0.08)',
    md: '0 8px 24px rgba(0,0,0,0.12)',
    lg: '0 18px 48px rgba(0,0,0,0.18)',
  },
  uiPatterns: {
    buttons: {
      primary: 'Solid brand fill with strong contrast text',
      secondary: 'Subtle outline with brand accent border',
    },
    cards: 'Rounded cards with soft elevation and generous spacing',
    inputs: 'Clean form fields with subtle borders and clear focus state',
  },
  cssVariables: '',
};
