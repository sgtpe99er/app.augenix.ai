import { type NextRequest, NextResponse } from 'next/server';

import { getEnvVar } from '@/utils/get-env-var';
import { createServerClient } from '@supabase/ssr';

function getPublishableKey(): string {
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (publishableKey) return publishableKey;
  if (anonKey) return anonKey;

  throw new Error('Missing Supabase key: Set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

const ROOT_DOMAIN = process.env.ROOT_DOMAIN ?? 'augenix.ai';

function getSubdomain(request: NextRequest): string | null {
  const host = request.headers.get('host') ?? '';
  const hostname = host.split(':')[0];
  if (hostname === ROOT_DOMAIN || hostname === `app.${ROOT_DOMAIN}` || hostname === 'localhost') {
    return null;
  }
  const parts = hostname.split('.');
  if (parts.length >= 3 && hostname.endsWith(ROOT_DOMAIN)) {
    return parts[0];
  }
  return null;
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    getEnvVar(process.env.NEXT_PUBLIC_SUPABASE_URL, 'NEXT_PUBLIC_SUPABASE_URL'),
    getPublishableKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }

          supabaseResponse = NextResponse.next({ request });

          const isProduction = process.env.NODE_ENV === 'production';
          const cookieDomain = isProduction ? `.${ROOT_DOMAIN}` : undefined;

          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, {
              ...(options as Record<string, unknown>),
              ...(cookieDomain ? { domain: cookieDomain } : {}),
              ...(isProduction ? { sameSite: 'none' as const, secure: true } : {}),
            });
          }
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const subdomain = getSubdomain(request);

  // Subdomain requests: resolve org and inject org_id header
  if (subdomain) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }

    const { data: org } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', subdomain)
      .single();

    if (org) {
      supabaseResponse.headers.set('x-org-id', org.id);
      supabaseResponse.headers.set('x-org-slug', subdomain);
    }
  }

  // Protect admin routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }

    const { data: isAdmin, error } = await supabase.rpc('is_admin', {
      user_uuid: user.id,
    });

    if (error || !isAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
  }

  // Protect dashboard routes
  const protectedRoutes = ['/dashboard', '/onboarding', '/payment'];
  if (protectedRoutes.some(route => request.nextUrl.pathname.startsWith(route))) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
