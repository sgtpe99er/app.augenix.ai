'use server';

import { redirect } from 'next/navigation';

import { sendWelcomeEmail } from '@/features/emails/send-welcome';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';
import { ActionResponse } from '@/types/action-response';
import { getURL } from '@/utils/get-url';

export async function signInWithOAuth(provider: 'github' | 'google'): Promise<ActionResponse> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: getURL('/auth/callback'),
    },
  });

  if (error) {
    console.error(error);
    return { data: null, error: error };
  }

  return redirect(data.url);
}

export async function signInWithMagicLink(email: string): Promise<ActionResponse> {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: getURL('/auth/callback?next=/dashboard'),
      shouldCreateUser: true,
    },
  });

  if (error) {
    console.error(error);
    return { data: null, error: error };
  }

  sendWelcomeEmail({ userEmail: email }).catch((err) =>
    console.error('sendWelcomeEmail failed:', err)
  );

  return { data: null, error: null };
}

export async function signUpWithPassword(email: string, password: string): Promise<ActionResponse> {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: getURL('/auth/callback?next=/dashboard'),
    },
  });

  if (error) {
    console.error(error);
    return { data: null, error: error };
  }

  // Send welcome email (fire-and-forget — don't block signup)
  sendWelcomeEmail({ userEmail: email }).catch((err) =>
    console.error('sendWelcomeEmail failed:', err)
  );

  return { data: null, error: null };
}

export async function signInWithPassword(email: string, password: string): Promise<ActionResponse> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error(error);
    return { data: null, error: error };
  }

  const { data: isAdmin } = await supabase.rpc('is_admin', { user_uuid: data.user.id } as any);

  // Use server-side redirect so session cookies are guaranteed to be set
  // on the response before the browser navigates. Client-side router.push()
  // after a Server Action can race against cookie propagation.
  redirect(isAdmin ? '/admin' : '/dashboard');
}

export async function resetPassword(email: string): Promise<ActionResponse> {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: getURL('/auth/reset-password'),
  });

  if (error) {
    console.error(error);
    return { data: null, error: error };
  }

  return { data: null, error: null };
}

export async function updatePassword(password: string): Promise<ActionResponse> {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    console.error(error);
    return { data: null, error: error };
  }

  return { data: null, error: null };
}

export async function signOut(): Promise<ActionResponse> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error(error);
    return { data: null, error: error };
  }

  return { data: null, error: null };
}
