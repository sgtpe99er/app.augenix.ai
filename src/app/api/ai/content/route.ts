import { NextRequest, NextResponse } from 'next/server';

import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, prompt } = body;

    if (!type || !prompt) {
      return NextResponse.json({ error: 'type and prompt are required' }, { status: 400 });
    }

    // In production, this calls the AI model via @ai-sdk/gateway
    // For now, return a placeholder response that indicates the system is ready
    const content = `[AI Content Generation — ${type}]\n\nYour request: "${prompt}"\n\nThis feature will generate ${type === 'blog' ? 'a full blog post' : type === 'social' ? 'social media posts' : 'an email sequence'} using AI when the AI Gateway is configured.\n\nTo enable AI generation, set the AI_GATEWAY_API_KEY environment variable.`;

    return NextResponse.json({ content });
  } catch (err) {
    console.error('Content generation error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
