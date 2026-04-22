import { NextRequest } from 'next/server';

import { getSession } from '@/features/account/controllers/get-session';
import { searchDomains } from '@/libs/vercel/domains';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const query = req.nextUrl.searchParams.get('query')?.trim().toLowerCase();
  if (!query) return Response.json({ error: 'Missing query param' }, { status: 400 });

  // Strip protocol/www/spaces and any existing TLD the user may have typed
  const cleaned = query
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\.[a-z]{2,}$/, '')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 63);

  if (!cleaned) return Response.json({ error: 'Invalid query' }, { status: 400 });

  try {
    const results = await searchDomains(cleaned);
    return Response.json({ results });
  } catch (err) {
    console.error('Domain search error:', err);
    return Response.json({ error: 'Domain search failed' }, { status: 500 });
  }
}
