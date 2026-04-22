import type { Database } from '@/libs/supabase/types';
import { getEnvVar } from '@/utils/get-env-var';
import { createClient } from '@supabase/supabase-js';

// Support both new Secret keys (sb_secret_...) and legacy service_role keys
function getSecretKey(): string {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (secretKey) return secretKey;
  if (serviceRoleKey) return serviceRoleKey;
  
  throw new Error('Missing Supabase secret key: Set SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY');
}

// Create client with auth options to avoid client-side initialization
export const supabaseAdminClient = createClient<Database>(
  getEnvVar(process.env.NEXT_PUBLIC_SUPABASE_URL, 'NEXT_PUBLIC_SUPABASE_URL'),
  getSecretKey(),
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  }
);
