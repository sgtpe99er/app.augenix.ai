/**
 * Utilities for admin "View as User" impersonation.
 *
 * A short-lived HMAC-signed token is stored in an HttpOnly cookie.
 * This lets the admin browse the dashboard as a target user without
 * changing the admin's own Supabase session.
 */

import crypto from 'crypto';

export const IMPERSONATE_COOKIE = 'fwd_view_as';
/** Token lifetime: 1 hour */
const TTL_SECONDS = 3600;

function getSecret(): string {
  const s = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error('Missing secret key for impersonation token');
  return s;
}

/** Create a signed impersonation token. */
export function signImpersonationToken(adminId: string, targetUserId: string): string {
  const payload = Buffer.from(
    JSON.stringify({ aid: adminId, tid: targetUserId, exp: Math.floor(Date.now() / 1000) + TTL_SECONDS })
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

/** Verify a signed token. Returns parsed claims or null if invalid/expired. */
export function verifyImpersonationToken(
  token: string
): { adminId: string; targetUserId: string } | null {
  try {
    const dot = token.lastIndexOf('.');
    if (dot === -1) return null;
    const payload = token.slice(0, dot);
    const sig = token.slice(dot + 1);
    const expected = crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url');
    // Constant-time comparison to prevent timing attacks
    if (
      sig.length !== expected.length ||
      !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
    ) {
      return null;
    }
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!claims.aid || !claims.tid || !claims.exp) return null;
    if (claims.exp < Math.floor(Date.now() / 1000)) return null; // expired
    return { adminId: claims.aid, targetUserId: claims.tid };
  } catch {
    return null;
  }
}
