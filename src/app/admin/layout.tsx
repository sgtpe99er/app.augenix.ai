'use client';

import { createContext, PropsWithChildren, ReactNode, useCallback,useContext, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  IoBusinessSharp,
  IoCard,
  IoChevronBack,
  IoChevronForward,
  IoCreate,
  IoGridOutline,
  IoHelpCircle,
  IoListOutline,
  IoLogOutOutline,
  IoMenu,
  IoPeople,
  IoPersonCircleOutline,
  IoRocket,
  IoSettings,
  IoStatsChart,
} from 'react-icons/io5';

import { signOut } from '@/app/(auth)/auth-actions';
import { CustomerSwitcher } from '@/components/admin/customer-switcher';
import { DashboardShell } from '@/components/dashboard-shell';
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
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/utils/cn';

const NAV_ITEMS = [
  { href: '/admin', label: 'Overview', icon: IoStatsChart, exact: true },
  { href: '/admin/customers', label: 'Customers', icon: IoPeople, exact: false },
  { href: '/admin/edits', label: 'Edit Requests', icon: IoCreate, exact: false },
  { href: '/admin/analytics', label: 'Analytics', icon: IoCard, exact: false },
  { href: '/admin/sites', label: 'Sites', icon: IoRocket, exact: false },
  { href: '/admin/pipeline', label: 'Pipeline', icon: IoBusinessSharp, exact: false },
  { href: '/admin/queue', label: 'Request Queue', icon: IoListOutline, exact: false },
  { href: '/admin/help', label: 'Help', icon: IoHelpCircle, exact: false },
  { href: '/admin/settings', label: 'Settings', icon: IoSettings, exact: false },
];

// --- Context for customer sub-menu in mobile Sheet ---

interface AdminMobileMenuContextValue {
  setCustomerMenu: (node: ReactNode) => void;
  closeMobileMenu: () => void;
}

const AdminMobileMenuContext = createContext<AdminMobileMenuContextValue | null>(null);

export function useAdminMobileMenu() {
  return useContext(AdminMobileMenuContext);
}

// --- Layout ---

export default function AdminLayout({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const { preference, setPreference } = useThemePreference();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [menuView, setMenuView] = useState<'main' | 'customer'>('main');
  const [customerMenuNode, setCustomerMenuNode] = useState<ReactNode>(null);

  const customerMatch = pathname.match(/^\/admin\/customers\/([^/]+)/);
  const isCustomerDetail = !!customerMatch;
  const isMainDashboard = pathname === '/admin' || pathname === '/admin/settings';

  const handleOpenChange = useCallback((open: boolean) => {
    if (open) {
      setMenuView(isCustomerDetail && customerMenuNode ? 'customer' : 'main');
    }
    setMobileMenuOpen(open);
  }, [isCustomerDetail, customerMenuNode]);

  const handleLogout = async () => {
    const response = await signOut();
    if (response?.error) {
      toast({ variant: 'destructive', description: 'Error logging out. Please try again.' });
    } else {
      router.refresh();
      toast({ description: 'You have been logged out.' });
    }
  };

  const setCustomerMenu = useCallback((node: ReactNode) => {
    setCustomerMenuNode(node);
  }, []);

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  const sidebar = (
    <nav className='flex flex-col gap-1'>
      {NAV_ITEMS.map((item) => {
        const isActive = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(item.href + '/');

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors',
              isActive
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'text-neutral-500 hover:bg-zinc-200 hover:text-black dark:text-neutral-400 dark:hover:bg-zinc-900 dark:hover:text-white'
            )}
          >
            <item.icon className='h-4 w-4 shrink-0' />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  const accountSection = (
    <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
      <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-neutral-400">Account</p>
      <SheetClose asChild>
        <Link
          href="/admin"
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-neutral-500 hover:bg-zinc-200 hover:text-black transition-colors dark:text-neutral-400 dark:hover:bg-zinc-900 dark:hover:text-white"
        >
          <IoGridOutline className="h-4 w-4 shrink-0" />
          <span>Dashboard</span>
        </Link>
      </SheetClose>
      <button
        onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-neutral-500 hover:bg-zinc-200 hover:text-black transition-colors dark:text-neutral-400 dark:hover:bg-zinc-900 dark:hover:text-white"
      >
        <IoLogOutOutline className="h-4 w-4 shrink-0" />
        <span>Log Out</span>
      </button>
      <p className="mt-3 px-3 text-xs font-medium text-neutral-400">Appearance</p>
      <div className="mt-1 flex gap-1 px-3">
        {(['dark', 'light', 'system'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setPreference(t)}
            className={cn(
              'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              preference === t
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'text-neutral-500 hover:bg-zinc-200 hover:text-black dark:hover:bg-zinc-900 dark:hover:text-white'
            )}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <AdminMobileMenuContext.Provider value={{ setCustomerMenu, closeMobileMenu }}>
      <div className="min-h-screen">
        {/* Compact Admin Header - full width border */}
        <div className="sticky top-0 z-50">
          {/* Full-width background and border */}
          <div
            className="absolute inset-0 bg-white dark:bg-black border-b border-zinc-300 dark:border-zinc-700"
            style={{ left: 'calc(-50vw + 50%)', width: '100vw' }}
          />
          {/* Content */}
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-[260px] right-0 hidden items-center justify-center lg:flex">
              <span id="admin-header-context" className="text-sm font-medium text-black dark:text-white"></span>
            </div>
            <div className="flex h-12 items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Small FWD Logo */}
                <Link href="/" className="flex-shrink-0">
                  <Image
                    src="/FWD_logo.webp"
                    alt="FWD"
                    width={28}
                    height={28}
                    className="rounded-full"
                  />
                </Link>

                {/* Breadcrumb Navigation */}
                <div className="flex items-center gap-2 text-sm">
                  <Link
                    href="/admin"
                    className={`font-medium transition-colors ${
                      isMainDashboard
                        ? 'text-black dark:text-white'
                        : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
                    }`}
                  >
                    Dashboard
                  </Link>

                  {isCustomerDetail && (
                    <>
                      <IoChevronForward className="h-3 w-3 text-neutral-400 dark:text-neutral-600" />
                      <CustomerSwitcher currentCustomerId={customerMatch![1]} />
                      <span id="admin-breadcrumb-status" className="hidden rounded-full px-2 py-0.5 text-xs lg:inline"></span>
                    </>
                  )}
                </div>
              </div>

              {/* Profile Menu (desktop only) + Mobile Hamburger */}
              <div className="flex items-center gap-2">
                <div className="hidden lg:block">
                  <DropdownMenu>
                    <DropdownMenuTrigger className="rounded-full">
                      <IoPersonCircleOutline size={24} />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="me-4">
                      <DropdownMenuItem asChild>
                        <Link href="/admin">Dashboard</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleLogout}>Log Out</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel>Theme</DropdownMenuLabel>
                      <ThemeMenuRadioGroup preference={preference} onChange={setPreference} />
                      <DropdownMenuArrow className="me-4 fill-foreground" />
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <Sheet open={mobileMenuOpen} onOpenChange={handleOpenChange}>
                  <SheetTrigger className="text-black dark:text-white lg:hidden">
                    <IoMenu size={24} />
                  </SheetTrigger>
                  <SheetContent side="right" className="w-[280px] overflow-hidden border-zinc-200 bg-zinc-50 p-0 dark:border-zinc-800 dark:bg-zinc-950">
                    <SheetTitle className="sr-only">Admin Menu</SheetTitle>
                    <div className="relative h-full">
                      {/* Main nav panel */}
                      <div
                        className={cn(
                          'absolute inset-0 flex flex-col overflow-y-auto p-4 transition-transform duration-200 ease-in-out',
                          menuView === 'main' ? 'translate-x-0' : '-translate-x-full pointer-events-none'
                        )}
                      >
                        <nav className="flex flex-col gap-1 pt-4">
                          {NAV_ITEMS.map((item) => {
                            const isActive = item.exact
                              ? pathname === item.href
                              : pathname === item.href || pathname.startsWith(item.href + '/');
                            return (
                              <SheetClose asChild key={item.href}>
                                <Link
                                  href={item.href}
                                  className={cn(
                                    'flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors',
                                    isActive
                                      ? 'bg-emerald-500/20 text-emerald-400'
                                      : 'text-neutral-500 hover:bg-zinc-200 hover:text-black dark:text-neutral-400 dark:hover:bg-zinc-900 dark:hover:text-white'
                                  )}
                                >
                                  <item.icon className="h-4 w-4 shrink-0" />
                                  <span>{item.label}</span>
                                </Link>
                              </SheetClose>
                            );
                          })}
                        </nav>
                        {accountSection}
                      </div>

                      {/* Customer sub-menu panel */}
                      {customerMenuNode && (
                        <div
                          className={cn(
                            'absolute inset-0 flex flex-col overflow-y-auto p-4 transition-transform duration-200 ease-in-out',
                            menuView === 'customer' ? 'translate-x-0' : 'translate-x-full pointer-events-none'
                          )}
                        >
                          <div className="pt-4">
                            <button
                              onClick={() => setMenuView('main')}
                              className="mb-3 flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-neutral-400 hover:bg-zinc-200 hover:text-black transition-colors dark:hover:bg-zinc-800 dark:hover:text-white"
                            >
                              <IoChevronBack className="h-4 w-4" />
                              <span>Main Menu</span>
                            </button>
                            {customerMenuNode}
                          </div>
                        </div>
                      )}
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>
          </div>
        </div>

        {/* Customer detail routes handle their own DashboardShell with sub-sidebar */}
        {isCustomerDetail ? children : <DashboardShell sidebar={sidebar}>{children}</DashboardShell>}
      </div>
    </AdminMobileMenuContext.Provider>
  );
}
