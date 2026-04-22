'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { IoChevronDown, IoSearch } from 'react-icons/io5';

interface Customer {
  user_id: string;
  email: string;
  business_name: string | null;
  status: string;
}

export function CustomerSwitcher({ currentCustomerId }: { currentCustomerId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>(null);

  const fetchCustomers = useCallback(async (query: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '20' });
      if (query) params.set('search', query);
      const res = await fetch(`/api/admin/users?${params}`);
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.customers ?? []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchCustomers('');
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setSearch('');
      setCustomers([]);
    }
  }, [open, fetchCustomers]);

  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchCustomers(search), 250);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search, open, fetchCustomers]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const handleSelect = (customer: Customer) => {
    setOpen(false);
    if (customer.user_id !== currentCustomerId) {
      router.push(`/admin/customers/${customer.user_id}`);
    }
  };

  const statusDot = (status: string) => {
    const colors: Record<string, string> = {
      onboarding: 'bg-yellow-500',
      active: 'bg-emerald-500',
      paid: 'bg-emerald-500',
      completed: 'bg-emerald-500',
      approved: 'bg-emerald-500',
      pending: 'bg-yellow-500',
      in_progress: 'bg-blue-500',
      generating: 'bg-purple-500',
      assets_generating: 'bg-purple-500',
      assets_ready: 'bg-cyan-500',
      rejected: 'bg-red-500',
    };
    return colors[status] || 'bg-zinc-400';
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 rounded-md px-1.5 py-0.5 -mx-1.5 -my-0.5 transition-colors hover:bg-zinc-200 dark:hover:bg-zinc-800"
      >
        <span className="text-black dark:text-white font-medium text-sm" id="admin-breadcrumb-client">
          Loading...
        </span>
        <IoChevronDown className="h-3 w-3 text-neutral-500 dark:text-neutral-400 shrink-0" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1.5 w-72 rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900 z-[100]">
          {/* Search input */}
          <div className="flex items-center gap-2 border-b border-zinc-200 px-3 py-2 dark:border-zinc-700">
            <IoSearch className="h-4 w-4 text-neutral-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customers..."
              className="flex-1 bg-transparent text-sm text-black outline-none placeholder:text-neutral-400 dark:text-white dark:placeholder:text-neutral-500"
            />
          </div>

          {/* List */}
          <div className="max-h-64 overflow-y-auto py-1">
            {loading && customers.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-neutral-500">Loading...</div>
            ) : customers.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-neutral-500">No customers found</div>
            ) : (
              customers.map((c) => (
                <button
                  key={c.user_id}
                  type="button"
                  onClick={() => handleSelect(c)}
                  className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                    c.user_id === currentCustomerId ? 'bg-zinc-100 dark:bg-zinc-800' : ''
                  }`}
                >
                  <span className={`h-2 w-2 shrink-0 rounded-full ${statusDot(c.status)}`} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-black dark:text-white">
                      {c.business_name || c.email}
                    </div>
                    {c.business_name && (
                      <div className="truncate text-xs text-neutral-500">{c.email}</div>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
