import { redirect } from 'next/navigation';

import { getSession } from '@/features/account/controllers/get-session';

export default async function DiscoverPage() {
  const session = await getSession();

  if (!session) {
    redirect('/signup');
  }

  redirect('/dashboard');
}
