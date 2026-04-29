import { NextRequest, NextResponse } from 'next/server';

import { generateLogo } from '@/libs/ai/stability';

function verifyAgentApiKey(request: NextRequest): boolean {
  const key = process.env.FREEWEBSITE_AGENT_API_KEY;
  if (!key) return false;
  const auth = request.headers.get('authorization');
  return auth === `Bearer ${key}`;
}

export async function POST(request: NextRequest) {
  if (!verifyAgentApiKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { businessName, category, style = 'professional' } = body;

  if (!businessName || typeof businessName !== 'string') {
    return NextResponse.json({ error: 'businessName is required' }, { status: 400 });
  }

  try {
    const result = await generateLogo({
      businessName,
      industry: category || 'General Business',
      stylePreference: style,
      colorPalette: ['#2563eb', '#1e40af', '#ffffff', '#f8fafc'],
    });

    return NextResponse.json({
      logoUrl: result.imageUrl,
      logoSvgUrl: null, // SVG generation not yet supported
      prompt: result.prompt,
      metadata: result.metadata,
    });
  } catch (error) {
    console.error('[Agent Logo Generate] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Logo generation failed' },
      { status: 500 }
    );
  }
}
