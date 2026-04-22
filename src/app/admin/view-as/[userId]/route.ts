import { type NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '../../require-admin';
import { signImpersonationToken, IMPERSONATE_COOKIE } from '@/utils/impersonation';
import { supabaseAdminClient } from '@/libs/supabase/supabase-admin';

/**
 * GET /admin/view-as/[userId]
 *
 * Verifies the caller is an admin, then sets a short-lived impersonation
 * cookie and redirects to /dashboard. The dashboard reads this cookie and
 * renders the target user's data instead of the admin's own data.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  // requireAdmin redirects to /login or /dashboard if not authorised
  const session = await requireAdmin();

  const { userId: targetUserId } = await params;

  // Verify the target user exists
  const { data: targetAuth, error } = await supabaseAdminClient.auth.admin.getUserById(targetUserId);
  if (error || !targetAuth?.user) {
    return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
  }

  // Log the impersonation event
  console.log(
    `[impersonate] admin=${session.user.id} (${session.user.email}) started viewing as user=${targetUserId} (${targetAuth.user.email})`
  );

  const token = signImpersonationToken(session.user.id, targetUserId);
  const isProduction = process.env.NODE_ENV === 'production';

  const response = NextResponse.redirect(new URL('/dashboard', request.url));
  response.cookies.set(IMPERSONATE_COOKIE, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 3600, // 1 hour
    path: '/',
  });

  return response;
}
