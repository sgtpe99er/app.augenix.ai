// ref: https://github.com/vercel/next.js/blob/canary/examples/with-supabase/app/auth/callback/route.ts

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { getEnvVar } from '@/utils/get-env-var';
import { createServerClient } from '@supabase/ssr';

function getPublishableKey(): string {
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (publishableKey) return publishableKey;
  if (anonKey) return anonKey;
  throw new Error('Missing Supabase key');
}

/** Resolve site URL at request time (never at module level). */
function getSiteUrl(): string {
  if (process.env.ROOT_DOMAIN) return `https://${process.env.ROOT_DOMAIN}`;
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, '') || 'http://localhost:3000';
}

export async function GET(request: NextRequest) {
  const siteUrl = getSiteUrl();
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const token = requestUrl.searchParams.get('token');
  const tokenHash = requestUrl.searchParams.get('token_hash');
  const type = (requestUrl.searchParams.get('type') ?? 'magiclink') as 'magiclink' | 'email';
  const next = requestUrl.searchParams.get('next');

  // Build the default redirect URL
  const defaultRedirect = next
    ? `${siteUrl}${next.startsWith('/') ? next : `/${next}`}`
    : `${siteUrl}/dashboard`;

  // In production, set cookies on the parent domain so all subdomains share the session.
  // SameSite=None; Secure is required because the preview bar makes cross-origin fetch
  // requests from subdomain sites to the main domain (same eTLD+1 but different origin).
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieDomain = process.env.ROOT_DOMAIN ? `.${process.env.ROOT_DOMAIN}` : undefined;

  // Create the redirect response FIRST, then create a Supabase client that
  // writes session cookies directly onto this response. This is critical —
  // the next/headers cookie store doesn't reliably attach cookies to
  // NextResponse.redirect() responses.
  let response = NextResponse.redirect(defaultRedirect);

  const supabase = createServerClient(
    getEnvVar(process.env.NEXT_PUBLIC_SUPABASE_URL, 'NEXT_PUBLIC_SUPABASE_URL'),
    getPublishableKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, {
              ...options,
              ...(cookieDomain ? { domain: cookieDomain } : {}),
              ...(isProduction ? { sameSite: 'none' as const, secure: true } : {}),
            });
          }
        },
      },
    }
  );

  try {
    // PKCE flow (OAuth / magic link via signInWithOtp)
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        console.error('[auth/callback] exchangeCodeForSession failed:', error.message);
        return NextResponse.redirect(`${siteUrl}/login?error=code_exchange_failed`);
      }
    }
    // Token hash flow (magic links from generateLink / custom emails)
    else if (token || tokenHash) {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: (token || tokenHash)!,
        type,
      });
      if (error) {
        console.error('[auth/callback] verifyOtp failed:', error.message);
        return NextResponse.redirect(`${siteUrl}/login?error=token_verify_failed`);
      }
    }
    // No auth params — bail
    else {
      return NextResponse.redirect(siteUrl);
    }
  } catch (err) {
    console.error('[auth/callback] Exception during auth:', err);
    return NextResponse.redirect(`${siteUrl}/login?error=auth_exception`);
  }

  // Verify session was established
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    console.error('[auth/callback] No user after successful verification');
    return NextResponse.redirect(`${siteUrl}/login?error=no_session`);
  }

  // If no explicit next path, check if admin and redirect accordingly
  if (!next) {
    const { data: isAdmin } = await supabase.rpc('is_admin', { user_uuid: user.id } as any);
    if (isAdmin) {
      // Build a new redirect and copy Set-Cookie headers verbatim so all cookie
      // attributes (domain, httpOnly, secure, sameSite, maxAge) are preserved.
      const adminResponse = NextResponse.redirect(`${siteUrl}/admin`);
      for (const setCookie of response.headers.getSetCookie()) {
        adminResponse.headers.append('set-cookie', setCookie);
      }
      return adminResponse;
    }
  }

  // Return redirect with session cookies attached
  return response;
}
