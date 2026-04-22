import { PropsWithChildren } from 'react';

import { Logo } from '@/components/logo';

export default function MarketingLayout({ children }: PropsWithChildren) {
  return (
    <div className='flex min-h-screen flex-col items-center justify-center bg-background px-4'>
      <div className='mb-8'>
        <Logo />
      </div>
      {children}
    </div>
  );
}
