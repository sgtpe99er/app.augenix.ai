/**
 * Stability AI API Client
 *
 * Calls the Stability AI REST API (stable-diffusion-xl-1024-v1-0) and uploads
 * the resulting image to Supabase Storage under the `generated-assets` bucket.
 */

import { supabaseAdminClient } from '@/libs/supabase/supabase-admin';
import { LogoGenerationInput, LogoGenerationOutput } from './types';

const STABILITY_API_KEY = process.env.STABILITY_API_KEY;
const STABILITY_API_URL =
  'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image';

const BUCKET = 'generated-assets';

async function uploadImageToStorage(
  imageBytes: Uint8Array,
  path: string
): Promise<string> {
  const { error } = await supabaseAdminClient.storage
    .from(BUCKET)
    .upload(path, imageBytes, { contentType: 'image/png', upsert: true });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const { data } = supabaseAdminClient.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function generateLogo(input: LogoGenerationInput): Promise<LogoGenerationOutput> {
  const prompt = buildLogoPrompt(input);

  if (!STABILITY_API_KEY) {
    console.warn('STABILITY_API_KEY not set — returning placeholder');
    return {
      imageUrl: '/placeholder-logo.png',
      prompt,
      metadata: { model: 'placeholder', style: input.stylePreference, generatedAt: new Date().toISOString() },
    };
  }

  const response = await fetch(STABILITY_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${STABILITY_API_KEY}`,
    },
    body: JSON.stringify({
      text_prompts: [{ text: prompt, weight: 1 }],
      cfg_scale: 7,
      height: 1024,
      width: 1024,
      steps: 30,
      samples: 1,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Stability AI error: ${err}`);
  }

  const json = await response.json();
  const base64 = json.artifacts[0].base64 as string;
  const imageBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

  const storagePath = `logos/${input.businessName.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.png`;
  const imageUrl = await uploadImageToStorage(imageBytes, storagePath);

  return {
    imageUrl,
    prompt,
    metadata: {
      model: 'stable-diffusion-xl-1024-v1-0',
      style: input.stylePreference,
      generatedAt: new Date().toISOString(),
    },
  };
}

export async function generateLogoVariations(
  input: LogoGenerationInput,
  count: number = 3
): Promise<LogoGenerationOutput[]> {
  const variations: LogoGenerationOutput[] = [];
  for (let i = 0; i < count; i++) {
    const variation = await generateLogo({
      ...input,
      stylePreference: `${input.stylePreference}_variation_${i + 1}`,
    });
    variations.push(variation);
  }
  return variations;
}

function buildLogoPrompt(input: LogoGenerationInput): string {
  const styleDescriptions: Record<string, string> = {
    modern: 'minimalist, clean lines, geometric shapes',
    classic: 'traditional, elegant, timeless design',
    fun: 'playful, colorful, friendly',
    professional: 'corporate, trustworthy, sophisticated',
    elegant: 'luxurious, refined, high-end',
    bold: 'striking, impactful, dynamic',
  };

  const styleDesc = styleDescriptions[input.stylePreference] || styleDescriptions.modern;
  const colors = input.colorPalette.join(', ');

  return `Professional logo design for "${input.businessName}", a ${input.industry} business. Style: ${styleDesc}. Colors: ${colors}. High quality, vector-style, suitable for business use, white background, centered composition.`;
}

export async function generateWebsiteMockup(
  businessName: string,
  _industry: string,
  _stylePreference: string,
  _colorPalette: string[]
): Promise<string> {
  console.log('Generating website mockup for:', businessName);
  return '/placeholder-mockup.png';
}
