'use client';

import { PropsWithChildren, useCallback,useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  IoChatbubbleEllipses,
  IoChevronBack,
  IoChevronForward,
  IoCog,
  IoDocumentText,
  IoFlash,
  IoHome,
  IoLogOutOutline,
  IoMenu,
  IoPeople,
  IoPersonCircleOutline,
  IoTerminal,
} from 'react-icons/io5';

import { signOut } from '@/app/(auth)/auth-actions';
import { ThemeMenuRadioGroup, useThemePreference } from '@/components/theme-selector';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/utils/cn';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Overview', icon: IoHome, exact: true },
  { href: '/dashboard/command-center', label: 'AI Command Center', icon: IoTerminal, exact: false },
  { href: '/dashboard/crm', label: 'CRM', icon: IoPeople, exact: false },
  { href: '/dashboard/content', label: 'Content', icon: IoDocumentText, exact: false },
  { href: '/dashboard/automations', label: 'Automations', icon: IoFlash, exact: false },
  { href: '/dashboard/chatbot', label: 'Chatbot', icon: IoChatbubbleEllipses, exact: false },
  { href: '/dashboard/settings', label: 'Settings', icon: IoCog, exact: false },
];

export default function DashboardLayout({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const { preference, setPreference } = useThemePreference();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    const response = await signOut();
    if (response?.error) {
      toast({ variant: 'destructive', description: 'Error logging out. Please try again.' });
    } else {
      router.refresh();
      toast({ description: 'You have been logged out.' });
    }
  };

  const navContent = (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const isActive = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(item.href + '/');

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={cn(
              'flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
            )}
          >
            <item.icon className="h-[18px] w-[18px] shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex h-full min-h-screen bg-surface">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden flex-col border-r border-outline-variant/20 bg-surface-container-lowest lg:flex',
          collapsed ? 'w-[60px]' : 'w-[260px]'
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-outline-variant/20 px-4">
          {!collapsed && (
            <Link href="/dashboard" className="font-serif text-lg font-medium tracking-tight text-on-surface">
              Augenix
            </Link>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="rounded-sm p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container-low"
          >
            {collapsed ? <IoChevronForward className="h-4 w-4" /> : <IoChevronBack className="h-4 w-4" />}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3">{navContent}</div>

        <div className="border-t border-outline-variant/20 p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-2 rounded-sm px-2 py-2 text-sm text-on-surface-variant transition-colors hover:bg-surface-container-low">
                <IoPersonCircleOutline className="h-5 w-5 shrink-0" />
                {!collapsed && <span className="truncate">Account</span>}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="end" className="w-56">
              <DropdownMenuLabel>Preferences</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <ThemeMenuRadioGroup preference={preference} onChange={setPreference} />
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <IoLogOutOutline className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex flex-1 flex-col">
        {/* Mobile header */}
        <header className="flex h-14 items-center gap-3 border-b border-outline-variant/20 bg-surface-container-lowest px-4 lg:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <button className="rounded-sm p-1.5 text-on-surface-variant hover:bg-surface-container-low">
                <IoMenu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[260px] bg-surface-container-lowest p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <div className="flex h-14 items-center border-b border-outline-variant/20 px-4">
                <span className="font-serif text-lg font-medium tracking-tight text-on-surface">Augenix</span>
              </div>
              <div className="p-3">{navContent}</div>
            </SheetContent>
          </Sheet>
          <span className="font-serif text-lg font-medium tracking-tight text-on-surface">Augenix</span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto px-4 py-8 lg:px-10 lg:py-10">
          <div className="mx-auto max-w-[1200px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
