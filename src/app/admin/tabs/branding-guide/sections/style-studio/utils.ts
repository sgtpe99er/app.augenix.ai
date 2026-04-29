import { VIBE_TOKENS } from './data';
import type { ColorAssignment,ColorPalette } from './types';

const loadedFonts = new Set<string>();

export function loadGoogleFont(fontName: string) {
  if (fontName === 'System UI' || loadedFonts.has(fontName)) return;
  loadedFonts.add(fontName);

  const linkId = `google-font-${fontName.replace(/\s+/g, '-').toLowerCase()}`;
  if (document.getElementById(linkId)) return;

  const link = document.createElement('link');
  link.id = linkId;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(
    fontName
  )}:wght@300;400;500;600;700&display=swap`;
  document.head.appendChild(link);
}

export function getLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

export function shuffleColors(palette: ColorPalette): ColorAssignment {
  const colors = [palette.primary, palette.secondary, palette.accent, palette.background, palette.text];
  const roles = ['primary', 'secondary', 'accent', 'background', 'text'] as const;

  // Fisher-Yates shuffle
  const shuffled = [...colors];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // Validate: background should be lighter than text
  const bgIdx = roles.indexOf('background');
  const textIdx = roles.indexOf('text');
  const bgLuminance = getLuminance(shuffled[bgIdx]);
  const textLuminance = getLuminance(shuffled[textIdx]);

  if (bgLuminance < textLuminance) {
    [shuffled[bgIdx], shuffled[textIdx]] = [shuffled[textIdx], shuffled[bgIdx]];
  }

  return {
    primary: shuffled[0],
    secondary: shuffled[1],
    accent: shuffled[2],
    background: shuffled[3],
    text: shuffled[4],
  };
}

export function defaultAssignment(palette: ColorPalette): ColorAssignment {
  return {
    primary: palette.primary,
    secondary: palette.secondary,
    accent: palette.accent,
    background: palette.background,
    text: palette.text,
  };
}

export function getTokensForVibe(vibe: string) {
  return VIBE_TOKENS[vibe as keyof typeof VIBE_TOKENS] ?? VIBE_TOKENS.modern;
}
