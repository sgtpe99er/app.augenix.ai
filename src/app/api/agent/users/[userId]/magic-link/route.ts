import { NextRequest, NextResponse } from 'next/server';

import { generateMagicLinkUrl } from '@/features/emails/send-notification';
import { supabaseAdminClient } from '@/libs/supabase/supabase-admin';

function verifyAgentApiKey(request: NextRequest): boolean {
  const key = process.env.FREEWEBSITE_AGENT_API_KEY;
  if (!key) return false;
  const auth = request.headers.get('authorization');
  return auth === `Bearer ${key}`;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  if (!verifyAgentApiKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { userId } = await params;

  // Get user email
  const { data: authUser, error: userError } =
    await supabaseAdminClient.auth.admin.getUserById(userId);

  if (userError || !authUser?.user?.email) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const magicLink = await generateMagicLinkUrl(authUser.user.email);
  if (!magicLink) {
    return NextResponse.json(
      { error: 'Failed to generate magic link' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    magicLink,
    email: authUser.user.email,
  });
}
