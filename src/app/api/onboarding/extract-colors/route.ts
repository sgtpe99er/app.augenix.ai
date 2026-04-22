import { NextRequest } from 'next/server';
import { getSession } from '@/features/account/controllers/get-session';

const AI_GATEWAY_URL = 'https://ai-gateway.vercel.sh/v1/chat/completions';
const MODEL = 'google/gemini-2.5-flash-lite';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const apiKey = process.env.AI_GATEWAY_API_KEY;
  if (!apiKey) return Response.json({ error: 'AI Gateway not configured' }, { status: 500 });

  const { imageUrl } = await req.json();
  if (!imageUrl || typeof imageUrl !== 'string') {
    return Response.json({ error: 'imageUrl is required' }, { status: 400 });
  }

  const prompt = `Analyze this logo/brand image and extract the dominant brand colors.
Return ONLY a JSON array of 2-5 hex color codes (e.g. ["#1a2b3c", "#ff5500"]).
Focus on the intentional brand colors — ignore white/near-white backgrounds unless they are clearly a brand color.
Order them from most dominant to least dominant.
Respond with ONLY the JSON array, no other text.`;

  const body = {
    model: MODEL,
    max_tokens: 256,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: imageUrl },
          },
          {
            type: 'text',
            text: prompt,
          },
        ],
      },
    ],
  };

  const res = await fetch(AI_GATEWAY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('[extract-colors] AI Gateway error:', err);
    return Response.json({ error: 'Color extraction failed' }, { status: 500 });
  }

  const data = await res.json();
  const content: string = data.choices?.[0]?.message?.content ?? '[]';

  let colors: string[] = [];
  try {
    const parsed = JSON.parse(content.trim());
    if (Array.isArray(parsed)) {
      colors = parsed
        .filter((c): c is string => typeof c === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(c))
        .slice(0, 5);
    }
  } catch {
    console.error('[extract-colors] Failed to parse AI response:', content);
  }

  return Response.json({ colors });
}
