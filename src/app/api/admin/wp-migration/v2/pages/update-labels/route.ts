import { NextRequest, NextResponse } from 'next/server';

import { supabaseAdminClient } from '@/libs/supabase/supabase-admin';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { pageIds, label } = await request.json();

    if (!pageIds || !Array.isArray(pageIds) || pageIds.length === 0) {
      return NextResponse.json({ error: 'pageIds array required' }, { status: 400 });
    }

    // label can be 'home', 'main_menu', 'remaining', or null (to clear)
    const validLabels = ['home', 'main_menu', 'remaining', null];
    if (!validLabels.includes(label)) {
      return NextResponse.json({ error: 'Invalid label. Must be: home, main_menu, remaining, or null' }, { status: 400 });
    }

    const { error } = await supabaseAdminClient
      .from('migration_pages')
      .update({ page_label: label } as any)
      .in('id', pageIds);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      message: `Updated ${pageIds.length} page(s) to label: ${label || 'none'}`,
      updated: pageIds.length,
    });
  } catch (error: any) {
    console.error('[update-labels] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
