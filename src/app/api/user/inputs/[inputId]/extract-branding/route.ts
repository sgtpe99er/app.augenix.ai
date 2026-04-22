import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/features/account/controllers/get-session';
import { supabaseAdminClient } from '@/libs/supabase/supabase-admin';

const AI_GATEWAY_API_KEY = process.env.AI_GATEWAY_API_KEY;
const AI_GATEWAY_BASE_URL = 'https://ai-gateway.vercel.sh/v1';

interface ExtractedBranding { colors: string[]; fonts: string[]; }

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ inputId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!AI_GATEWAY_API_KEY) return NextResponse.json({ error: 'AI Gateway not configured' }, { status: 500 });

  const { inputId } = await params;

  const { data: input, error: fetchError } = await supabaseAdminClient
    .from('customer_inputs' as any)
    .select('id, user_id, storage_url, mime_type, metadata')
    .eq('id', inputId)
    .single();

  if (fetchError || !input) return NextResponse.json({ error: 'Input not found' }, { status: 404 });
  if ((input as any).user_id !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const storageUrl = (input as any).storage_url as string | null;
  const mimeType = (input as any).mime_type as string | null;

  if (!storageUrl) return NextResponse.json({ error: 'No file URL found' }, { status: 400 });
  if (!mimeType?.startsWith('image/')) return NextResponse.json({ error: 'Only images can be analyzed for branding' }, { status: 400 });

  try {
    const systemPrompt = `You are a brand identity expert. Analyze the provided image and extract:\n1. Colors: Extract ALL distinct colors as hex codes.\n2. Fonts: Identify font families or closest matches.\nReturn JSON: {"colors": ["#hex1", ...], "fonts": ["Font Name", ...]}`;

    const response = await fetch(`${AI_GATEWAY_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${AI_GATEWAY_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: [{ type: 'text', text: 'Analyze this image and extract all colors and fonts used:' }, { type: 'image_url', image_url: { url: storageUrl } }] },
        ],
        max_tokens: 1024,
        temperature: 0.2,
      }),
    });

    if (!response.ok) return NextResponse.json({ error: 'AI analysis failed' }, { status: 500 });

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content ?? '';
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1].trim();

    let extracted: ExtractedBranding;
    try {
      extracted = JSON.parse(jsonStr);
      if (!Array.isArray(extracted.colors)) extracted.colors = [];
      if (!Array.isArray(extracted.fonts)) extracted.fonts = [];
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
    }

    const existingMetadata = (input as any).metadata || {};
    const newMetadata = { ...existingMetadata, extractedBranding: { ...extracted, extractedAt: new Date().toISOString() } };

    const { error: updateError } = await supabaseAdminClient
      .from('customer_inputs' as any)
      .update({ metadata: newMetadata, updated_at: new Date().toISOString() } as any)
      .eq('id', inputId);

    if (updateError) return NextResponse.json({ error: 'Failed to save extracted branding' }, { status: 500 });

    return NextResponse.json({ success: true, extractedBranding: newMetadata.extractedBranding });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Extraction failed' }, { status: 500 });
  }
}
