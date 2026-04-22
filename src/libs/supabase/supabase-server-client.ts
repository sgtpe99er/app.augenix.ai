// ref: https://github.com/vercel/next.js/blob/canary/examples/with-supabase/utils/supabase/server.ts

import { cookies } from 'next/headers';

import { Database } from '@/libs/supabase/types';
import { getEnvVar } from '@/utils/get-env-var';
import { createServerClient } from '@supabase/ssr';

// Support both new Publishable keys (sb_publishable_...) and legacy anon keys
function getPublishableKey(): string {
  // Prefer new publishable key, fall back to legacy anon key
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (publishableKey) return publishableKey;
  if (anonKey) return anonKey;

  throw new Error('Missing Supabase key: Set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    getEnvVar(process.env.NEXT_PUBLIC_SUPABASE_URL, 'NEXT_PUBLIC_SUPABASE_URL'),
    getPublishableKey(),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch (err) {
            // The `setAll` method is called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
            // Log unexpected errors to aid debugging (should not throw in Server Action contexts).
            if (process.env.NODE_ENV !== 'production') {
              console.error('[supabase] setAll failed in server client:', err);
            }
          }
        },
      },
    }
  );
}
