import { redirect } from 'next/navigation';

import { getSession } from '@/features/account/controllers/get-session';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';

/**
 * Shared admin auth guard. Call at the top of any admin server page.
 * Redirects to /login if no session, /dashboard if not admin.
 * Returns the session on success.
 */
export async function requireAdmin() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  const supabase = await createSupabaseServerClient();
  const { data: isAdmin } = await supabase.rpc('is_admin', {
    user_uuid: session.user.id,
  } as any);

  if (!isAdmin) {
    redirect('/dashboard');
  }

  return session;
}
