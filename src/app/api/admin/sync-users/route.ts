import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';
import { supabaseAdminClient } from '@/libs/supabase/supabase-admin';
import { getSession } from '@/features/account/controllers/get-session';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createSupabaseServerClient();
    
    // Check if user is admin
    const { data: isAdmin } = await supabase.rpc('is_admin', {
      user_uuid: session.user.id,
    } as any);

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch all auth users
    const { data: authUsers, error: authError } = await supabaseAdminClient.auth.admin.listUsers();
    
    if (authError) {
      throw authError;
    }

    // Upsert users into cache table
    const usersToUpsert = (authUsers?.users ?? []).map((user) => ({
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      updated_at: new Date().toISOString(),
      last_sync: new Date().toISOString(),
    }));

    // Batch upsert
    const { error: upsertError } = await supabase
      .from('user_cache' as any)
      .upsert(usersToUpsert as any, { onConflict: 'id' });

    if (upsertError) {
      throw upsertError;
    }

    return NextResponse.json({ 
      message: 'User cache synced successfully',
      count: usersToUpsert.length
    });
  } catch (error) {
    console.error('Error syncing user cache:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
