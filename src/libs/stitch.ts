/**
 * Google Stitch SDK service module.
 *
 * Generates 3 AI-designed HTML variants for a business using the Stitch SDK.
 * Each variant is fetched as HTML + screenshot, uploaded to Supabase Storage
 * (generated-assets bucket), and returned with extracted brand-token metadata.
 *
 * Env vars required:
 *   GOOGLE_STITCH_API_KEY — Google Stitch API key
 *   NEXT_PUBLIC_SUPABASE_URL — Supabase project URL
 *   SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY — Supabase service-role key
 */

import { Stitch, StitchToolClient, Screen } from '@google/stitch-sdk';
import { supabaseAdminClient } from '@/libs/supabase/supabase-admin';

const STORAGE_BUCKET = 'generated-assets';

/** Create a Stitch SDK client using GOOGLE_STITCH_API_KEY. */
function createStitchClient(): StitchToolClient {
  return new StitchToolClient({
    apiKey: process.env.GOOGLE_STITCH_API_KEY,
  });
}

export interface BusinessInfo {
  name: string;
  industry?: string;
  description?: string;
  services?: string;
  address?: string;
  phone?: string;
  location?: string;
}

export interface BrandTokens {
  primaryColor?: string;
  secondaryColor?: string;
  headingFont?: string;
  bodyFont?: string;
  accentColor?: string;
}

export interface StitchVariant {
  variantNumber: 1 | 2 | 3;
  label: string;
  stitch_project_id: string;
  stitch_screen_id: string;
  stitch_html_url: string;
  thumbnail_url: string;
  brand_tokens: BrandTokens;
}

/**
 * Build a detailed design prompt from business info so Stitch generates
 * a relevant, on-brand website design.
 */
function buildDesignPrompt(business: BusinessInfo): string {
  const parts = [
    `Design a professional business website homepage for "${business.name}".`,
  ];
  if (business.industry) parts.push(`Industry: ${business.industry}.`);
  if (business.description) parts.push(`About: ${business.description}`);
  if (business.services) parts.push(`Services offered: ${business.services}.`);
  if (business.location) parts.push(`Location: ${business.location}.`);
  if (business.address) parts.push(`Address: ${business.address}.`);
  if (business.phone) parts.push(`Phone: ${business.phone}.`);
  parts.push(
    'The page should include: a hero section with headline and call-to-action buttons, ' +
    'a services section, an about section, and a contact/CTA footer. ' +
    'Use a dark, modern color palette with a strong brand accent color. ' +
    'Make it look professional, trustworthy, and locally-focused.'
  );
  return parts.join(' ');
}

/**
 * Extract basic brand tokens from CSS found in the Stitch HTML.
 * Falls back to empty tokens if parsing fails.
 */
function extractBrandTokens(html: string): BrandTokens {
  const tokens: BrandTokens = {};
  try {
    // Extract CSS custom properties for colors
    const cssVarMatches = html.matchAll(/--([a-z-]+(?:color|primary|secondary|accent)[a-z-]*):\s*(#[0-9a-fA-F]{3,8}|rgb[^;]+|hsl[^;]+)/gi);
    for (const match of cssVarMatches) {
      const name = match[1].toLowerCase();
      const value = match[2].trim();
      if ((name.includes('primary') || name === 'color-main') && !tokens.primaryColor) {
        tokens.primaryColor = value;
      } else if ((name.includes('secondary') || name.includes('accent')) && !tokens.secondaryColor) {
        tokens.secondaryColor = value;
      }
    }

    // Extract Google Fonts or font-family declarations
    const fontFamilyMatches = html.matchAll(/font-family:\s*['"]?([^'";,]+)/gi);
    for (const match of fontFamilyMatches) {
      const font = match[1].trim().replace(/['"]/g, '');
      if (!font.toLowerCase().includes('system') && !font.toLowerCase().includes('sans-serif') && !font.toLowerCase().includes('serif')) {
        if (!tokens.headingFont) {
          tokens.headingFont = font;
        } else if (!tokens.bodyFont && font !== tokens.headingFont) {
          tokens.bodyFont = font;
          break;
        }
      }
    }
  } catch {
    // Parsing failed — return empty tokens
  }
  return tokens;
}

/**
 * Upload a file to Supabase Storage and return its public URL.
 */
async function uploadToStorage(
  path: string,
  content: string | Buffer,
  contentType: string,
): Promise<string> {
  const { error } = await supabaseAdminClient.storage
    .from(STORAGE_BUCKET)
    .upload(path, content, { contentType, upsert: true });

  if (error) throw new Error(`Storage upload failed for ${path}: ${error.message}`);

  const { data: { publicUrl } } = supabaseAdminClient.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(path);

  return publicUrl;
}

const VARIANT_LABELS: Record<number, string> = {
  1: 'Design 1 — Style A',
  2: 'Design 2 — Style B',
  3: 'Design 3 — Style C',
};

/**
 * Generate 3 AI design variants for a business using Google Stitch.
 *
 * Flow:
 *  1. Create a Stitch project via callTool (avoids SDK index-0 assumption bug)
 *  2. Generate initial screen from business-specific prompt
 *  3. Call screen.variants() to get 3 design directions
 *  4. For each variant: download HTML + screenshot, upload to Supabase Storage
 *  5. Extract brand tokens from HTML CSS
 *  6. Return metadata for each variant
 */
export async function generateDesignVariants(
  business: BusinessInfo,
  businessId: string,
): Promise<StitchVariant[]> {
  const prompt = buildDesignPrompt(business);
  const client = createStitchClient();

  // 1. Create a Stitch project scoped to this business
  const projectTitle = `FWD - ${business.name}`.slice(0, 60);
  const projectResult = await client.callTool('create_project', { title: projectTitle }) as any;
  const projectId: string = projectResult.name?.replace('projects/', '') ?? projectResult.id;

  // 2. Generate initial screen — use callTool directly to avoid SDK's
  //    outputComponents[0] assumption (the design component isn't always at index 0)
  const genResult = await client.callTool('generate_screen_from_text', {
    projectId,
    prompt,
    deviceType: 'DESKTOP',
  }) as any;

  // Find the design component containing screens
  const baseScreenData = (genResult?.outputComponents ?? [])
    .flatMap((c: any) => c?.design?.screens ?? [])
    .at(0);

  if (!baseScreenData) {
    throw new Error('[stitch] No base screen found in generate_screen_from_text response');
  }

  // Build a Screen instance from the raw data so we can call .variants()
  const baseScreen = new Screen(client as any, { ...baseScreenData, projectId });

  // 3. Generate 3 variants with different color, layout, and font directions
  let variantScreens: Screen[] = [];
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      variantScreens = await baseScreen.variants(
        'Create 3 distinctly different design directions: vary the color scheme, layout structure, and typography style. Each should feel like a completely different visual approach.',
        {
          variantCount: 3,
          creativeRange: 'EXPLORE',
          aspects: ['COLOR_SCHEME', 'LAYOUT', 'TEXT_FONT'],
        },
      );
      break;
    } catch (err) {
      console.warn(`[stitch] variants() attempt ${attempt} failed:`, err);
      if (attempt === 3) throw err;
      await new Promise((r) => setTimeout(r, 5000 * attempt));
    }
  }

  // 4. Process each variant
  const results: StitchVariant[] = [];

  for (let i = 0; i < variantScreens.length && i < 3; i++) {
    const screen = variantScreens[i];
    const variantNumber = (i + 1) as 1 | 2 | 3;

    try {
      // Download HTML and screenshot URLs from Stitch
      const [htmlDownloadUrl, imageDownloadUrl] = await Promise.all([
        screen.getHtml(),
        screen.getImage(),
      ]);

      // Fetch the actual content
      const [htmlResponse, imageResponse] = await Promise.all([
        fetch(htmlDownloadUrl),
        fetch(imageDownloadUrl),
      ]);

      if (!htmlResponse.ok || !imageResponse.ok) {
        console.error(`[stitch] Failed to download variant ${variantNumber} assets`);
        continue;
      }

      const [htmlContent, imageBuffer] = await Promise.all([
        htmlResponse.text(),
        imageResponse.arrayBuffer(),
      ]);

      // Upload to Supabase Storage
      const storagePrefix = `stitch/${businessId}/v${variantNumber}`;
      const [htmlUrl, thumbnailUrl] = await Promise.all([
        uploadToStorage(`${storagePrefix}/design.html`, htmlContent, 'text/html'),
        uploadToStorage(`${storagePrefix}/preview.webp`, Buffer.from(imageBuffer), 'image/webp'),
      ]);

      // Extract brand tokens from the CSS in the HTML
      const brand_tokens = extractBrandTokens(htmlContent);

      results.push({
        variantNumber,
        label: VARIANT_LABELS[variantNumber],
        stitch_project_id: projectId,
        stitch_screen_id: screen.id,
        stitch_html_url: htmlUrl,
        thumbnail_url: thumbnailUrl,
        brand_tokens,
      });
    } catch (err) {
      console.error(`[stitch] Error processing variant ${variantNumber}:`, err);
      // Continue — partial variants are recoverable
    }
  }

  return results;
}
