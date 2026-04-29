import { type NextRequest, NextResponse } from 'next/server';

import { IMPERSONATE_COOKIE } from '@/utils/impersonation';

/**
 * POST /api/admin/exit-impersonation
 *
 * Clears the impersonation cookie and redirects the admin back to /admin.
 */
export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(new URL('/admin', request.url));
  response.cookies.set(IMPERSONATE_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
  return response;
}
