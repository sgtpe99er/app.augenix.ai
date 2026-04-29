import { NextRequest, NextResponse } from 'next/server';

import { getSession } from '@/features/account/controllers/get-session';
import { generateMagicLinkUrl } from '@/features/emails/send-notification';
import { supabaseAdminClient } from '@/libs/supabase/supabase-admin';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';

async function checkAdmin() {
  const session = await getSession();
  if (!session) return null;
  const supabase = await createSupabaseServerClient();
  const { data: isAdmin } = await supabase.rpc('is_admin', { user_uuid: session.user.id } as any);
  return isAdmin ? session : null;
}

/**
 * Generate a magic-link that signs in as the given user and lands on /dashboard.
 * The admin can paste this into a private/incognito window to see the user's
 * dashboard without disrupting their own session.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await checkAdmin();
    if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id: userId } = await params;

    const { data: authUser, error: userError } = await supabaseAdminClient.auth.admin.getUserById(userId);
    if (userError || !authUser?.user?.email) {
      console.error('[impersonate] getUserById failed:', userError?.message);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const email = authUser.user.email;

    const url = await generateMagicLinkUrl(email);
    if (!url) {
      return NextResponse.json({ error: 'Failed to generate magic link. Check Supabase auth settings.' }, { status: 500 });
    }

    return NextResponse.json({ url });
  } catch (err: any) {
    console.error('[impersonate] Unhandled error:', err);
    return NextResponse.json({ error: 'Failed to generate magic link' }, { status: 500 });
  }
}
