import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/features/account/controllers/get-session';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = request.nextUrl.searchParams.get('url');
  const filename = request.nextUrl.searchParams.get('filename') || 'download';

  if (!url) return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });

  try {
    const fileRes = await fetch(url);
    if (!fileRes.ok) return NextResponse.json({ error: 'Failed to fetch file' }, { status: 502 });

    const contentType = fileRes.headers.get('content-type') || 'application/octet-stream';
    const buffer = await fileRes.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(buffer.byteLength),
      },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
