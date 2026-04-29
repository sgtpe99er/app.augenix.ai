'use client';

import { PropsWithChildren } from 'react';
import { usePathname } from 'next/navigation';

export function ConditionalHeader({ children }: PropsWithChildren) {
  const pathname = usePathname();
  
  // Hide the global header on admin, auth, onboarding, payment, and dashboard pages
  if (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/payment') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup')
  ) {
    return null;
  }

  return <>{children}</>;
}
