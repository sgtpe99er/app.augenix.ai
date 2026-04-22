import { redirect } from 'next/navigation';

import { getSession } from '@/features/account/controllers/get-session';

import { signInWithMagicLink, signUpWithPassword, signInWithPassword, resetPassword } from '../auth-actions';
import { AuthUI } from '../auth-ui';

export default async function LoginPage() {
  const session = await getSession();

  if (session) {
    redirect('/dashboard');
  }

  return (
    <section className='py-xl m-auto flex h-full max-w-lg items-center'>
      <AuthUI 
        mode='login' 
        signInWithMagicLink={signInWithMagicLink}
        signUpWithPassword={signUpWithPassword}
        signInWithPassword={signInWithPassword}
        resetPassword={resetPassword}
      />
    </section>
  );
}
