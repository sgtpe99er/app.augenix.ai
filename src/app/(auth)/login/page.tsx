import { redirect } from 'next/navigation';

import { getSession } from '@/features/account/controllers/get-session';

import { signInWithPassword } from '../auth-actions';
import { AuthUI } from '../auth-ui';

export default async function LoginPage() {
  const session = await getSession();

  if (session) {
    redirect('/dashboard');
  }

  return (
    <section className='flex min-h-screen items-center justify-center p-6' style={{ backgroundColor: '#f7f9fb' }}>
      <AuthUI signInWithPassword={signInWithPassword} />
    </section>
  );
}
