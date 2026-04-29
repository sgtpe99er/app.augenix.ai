import { NextRequest, NextResponse } from 'next/server';

import { supabaseAdminClient } from '@/libs/supabase/supabase-admin';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';

const AI_GATEWAY_API_KEY = process.env.AI_GATEWAY_API_KEY;
const AI_GATEWAY_BASE_URL = 'https://ai-gateway.vercel.sh/v1';

async function assertAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: isAdmin } = await supabase.rpc('is_admin', {
    user_uuid: user.id,
  } as any);

  return isAdmin ? user : null;
}

interface ExtractedBranding {
  colors: string[];
  fonts: string[];
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; inputId: string }> }
) {
  const adminUser = await assertAdmin();
  if (!adminUser) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!AI_GATEWAY_API_KEY) {
    return NextResponse.json({ error: 'AI Gateway not configured' }, { status: 500 });
  }

  const { id: customerId, inputId } = await params;

  const { data: input, error: fetchError } = await supabaseAdminClient
    .from('customer_inputs' as any)
    .select('id, user_id, storage_url, mime_type, metadata')
    .eq('id', inputId)
    .single();

  if (fetchError || !input) {
    return NextResponse.json({ error: 'Input not found' }, { status: 404 });
  }

  if ((input as any).user_id !== customerId) {
    return NextResponse.json({ error: 'Input does not belong to customer' }, { status: 400 });
  }

  const storageUrl = (input as any).storage_url as string | null;
  const mimeType = (input as any).mime_type as string | null;

  if (!storageUrl) {
    return NextResponse.json({ error: 'No file URL found' }, { status: 400 });
  }

  if (!mimeType?.startsWith('image/')) {
    return NextResponse.json({ error: 'Only images can be analyzed for branding' }, { status: 400 });
  }

  try {
    const systemPrompt = `You are a brand identity expert. Analyze the provided image (likely a logo, business card, or marketing material) and extract:

1. **Colors**: Extract ALL distinct colors visible in the image. Return them as hex codes (e.g., #FF5733). Include:
   - Primary/dominant colors
   - Secondary colors
   - Accent colors
   - Background colors (if not white/transparent)
   
2. **Fonts**: Identify any text in the image and determine the font families or closest matches. Consider:
   - Serif vs sans-serif
   - Weight (light, regular, bold)
   - Style characteristics (modern, classic, playful, etc.)
   - If you can identify the exact font, use that name
   - If not, describe it as "Sans-serif, bold, modern" or similar

Return your response as JSON with this exact structure:
{
  "colors": ["#hex1", "#hex2", ...],
  "fonts": ["Font Name 1", "Font description 2", ...]
}

Be thorough - extract every distinct color you can see, even subtle ones. For fonts, if there are multiple text styles, list each one.`;

    const response = await fetch(`${AI_GATEWAY_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AI_GATEWAY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this image and extract all colors and fonts used:',
              },
              {
                type: 'image_url',
                image_url: { url: storageUrl },
              },
            ],
          },
        ],
        max_tokens: 1024,
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[extract-branding] AI Gateway error:', errorText);
      return NextResponse.json({ error: 'AI analysis failed' }, { status: 500 });
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content ?? '';

    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    let extracted: ExtractedBranding;
    try {
      extracted = JSON.parse(jsonStr);
      if (!Array.isArray(extracted.colors)) extracted.colors = [];
      if (!Array.isArray(extracted.fonts)) extracted.fonts = [];
    } catch {
      console.error('[extract-branding] Failed to parse AI response:', content);
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
    }

    const existingMetadata = (input as any).metadata || {};
    const newMetadata = {
      ...existingMetadata,
      extractedBranding: {
        colors: extracted.colors,
        fonts: extracted.fonts,
        extractedAt: new Date().toISOString(),
      },
    };

    const { error: updateError } = await supabaseAdminClient
      .from('customer_inputs' as any)
      .update({ metadata: newMetadata, updated_at: new Date().toISOString() } as any)
      .eq('id', inputId);

    if (updateError) {
      console.error('[extract-branding] Update error:', updateError);
      return NextResponse.json({ error: 'Failed to save extracted branding' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      extractedBranding: newMetadata.extractedBranding,
    });
  } catch (error: any) {
    console.error('[extract-branding] Error:', error);
    return NextResponse.json({ error: error.message || 'Extraction failed' }, { status: 500 });
  }
}
