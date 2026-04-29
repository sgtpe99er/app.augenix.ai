import { NextResponse } from 'next/server';

import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: isAdmin } = await supabase.rpc('is_admin', {
      user_uuid: user.id,
    } as any);

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse request body
    const body = await req.json();
    const { targetUrl, username, password } = body;

    if (!targetUrl || !username || !password) {
      return NextResponse.json(
        { error: 'Missing required fields: targetUrl, username, password' },
        { status: 400 }
      );
    }

    // Format URL to ensure no trailing slash
    const baseUrl = targetUrl.replace(/\/$/, '');
    
    // Test WP REST API Connection
    // We hit the /wp-json/wp/v2/users/me endpoint which requires authentication
    const apiUrl = `${baseUrl}/wp-json/wp/v2/users/me`;
    
    // Create Basic Auth header
    const credentials = Buffer.from(`${username}:${password}`).toString('base64');
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      // Short timeout for pre-flight check
      signal: AbortSignal.timeout(10000)
    });

    if (response.ok) {
      const data = await response.json();
      return NextResponse.json({ 
        success: true, 
        message: 'Connection successful',
        user: {
          id: data.id,
          name: data.name,
          url: data.url
        }
      });
    }

    // Handle specific error cases
    if (response.status === 401 || response.status === 403) {
      return NextResponse.json(
        { error: 'Authentication failed. Please check your username and application password.' },
        { status: response.status }
      );
    }

    if (response.status === 404) {
      return NextResponse.json(
        { error: 'REST API not found. Ensure this is a WordPress site and the REST API is enabled.' },
        { status: 404 }
      );
    }

    // Generic error
    const text = await response.text();
    return NextResponse.json(
      { error: `Connection failed with status ${response.status}: ${text.substring(0, 100)}` },
      { status: response.status }
    );

  } catch (error: any) {
    console.error('WP Preflight Error:', error);
    
    if (error.name === 'TimeoutError') {
      return NextResponse.json(
        { error: 'Connection timed out. The server might be blocking the request (WAF/Firewall) or is unreachable.' },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred during pre-flight check' },
      { status: 500 }
    );
  }
}
