'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { IoPersonCircleOutline } from 'react-icons/io5';

import { ThemeMenuRadioGroup, useThemePreference } from '@/components/theme-selector';
import {
  DropdownMenu,
  DropdownMenuArrow,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ActionResponse } from '@/types/action-response';

import { useToast } from './ui/use-toast';

interface AccountMenuProps {
  signOut: () => Promise<ActionResponse>;
  businessName?: string | null;
  userEmail?: string;
}

export function AccountMenu({ signOut, businessName, userEmail }: AccountMenuProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { preference, setPreference } = useThemePreference();

  async function handleLogoutClick() {
    const response = await signOut();

    if (response?.error) {
      toast({
        variant: 'destructive',
        description: 'An error occurred while logging out. Please try again or contact support.',
      });
    } else {
      router.refresh();

      toast({
        description: 'You have been logged out.',
      });
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className='rounded-full'>
        <IoPersonCircleOutline size={24} />
      </DropdownMenuTrigger>
      <DropdownMenuContent className='me-4'>
        {(businessName || userEmail) && (
          <>
            <div className='px-2 py-1.5'>
              {businessName && (
                <div className='text-sm font-medium text-foreground'>{businessName}</div>
              )}
              {userEmail && (
                <div className='text-xs text-muted-foreground'>{userEmail}</div>
              )}
            </div>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem asChild>
          <Link href='/dashboard'>Dashboard</Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleLogoutClick}>Log Out</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        <ThemeMenuRadioGroup preference={preference} onChange={setPreference} />
        <DropdownMenuArrow className='me-4 fill-foreground' />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
