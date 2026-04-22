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

export interface WebsiteTemplate {
  id: string;
  name: string;
  vibe: string;
  description: string;
  defaultPaletteId: string;
  defaultFontPairingId: string;
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
  templateId: string | null;
}
