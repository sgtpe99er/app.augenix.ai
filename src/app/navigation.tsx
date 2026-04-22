import Link from 'next/link';
import { IoMenu } from 'react-icons/io5';

import { AccountMenu } from '@/components/account-menu';
import { SparkleButton } from '@/components/ui/sparkle-button';
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { getSession } from '@/features/account/controllers/get-session';

import { signOut } from './(auth)/auth-actions';

export async function Navigation() {
  const session = await getSession();

  return (
    <div className='relative flex items-center gap-6'>
      <Link href='/support' className='hidden text-sm text-gray-600 hover:text-gray-900 lg:block'>
        Support
      </Link>
      {session ? (
        <AccountMenu signOut={signOut} />
      ) : (
        <>
          <Link href='/login' className='hidden text-sm text-gray-600 hover:text-gray-900 lg:block'>
            Sign In
          </Link>
          <Link href='/signup' className='hidden lg:block'>
            <SparkleButton className='flex-shrink-0'>
              Get started for free
            </SparkleButton>
          </Link>
          <Sheet>
            <SheetTrigger className='block text-gray-900 lg:hidden'>
              <IoMenu size={28} />
            </SheetTrigger>
            <SheetContent className='w-full bg-white'>
              <SheetTitle className='sr-only'>Navigation Menu</SheetTitle>
              <nav className='flex flex-col gap-6 py-8'>
                <SheetClose asChild>
                  <Link href='/support' className='text-lg text-gray-600 hover:text-gray-900'>
                    Support
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link href='/login' className='text-lg text-gray-600 hover:text-gray-900'>
                    Sign In
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link href='/signup'>
                    <SparkleButton className='flex-shrink-0'>
                      Get started for free
                    </SparkleButton>
                  </Link>
                </SheetClose>
              </nav>
            </SheetContent>
          </Sheet>
        </>
      )}
    </div>
  );
}
