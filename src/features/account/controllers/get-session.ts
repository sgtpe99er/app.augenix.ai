import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';

export async function getSession() {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.getUser();

  if (error) {
    console.error(error);
  }

  if (!data?.user) return null;

  // Return a session-like object so existing call sites can keep using `session.user.*`
  return { user: data.user } as any;
}
