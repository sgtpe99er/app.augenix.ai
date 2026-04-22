'use client';

import { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { IoSearch, IoEye, IoPencil, IoTrash, IoPersonAdd, IoShield, IoRefresh, IoChevronBack, IoChevronForward, IoBriefcase } from 'react-icons/io5';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/utils/cn';
import { type CustomerWithEmail, getStatusBadge, formatStatus } from './types';
import { AddUserModal } from './add-user-modal';
import { EditUserModal } from './edit-user-modal';

interface PaginatedResponse {
  customers: CustomerWithEmail[];
  adminUserIds: string[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export function UsersTab() {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'users' | 'prospects'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerWithEmail | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Data state
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const fetchData = async (searchTerm?: string, pageNum?: number, type?: 'all' | 'users' | 'prospects') => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(pageNum ?? page),
        limit: '50',
      });

      if (searchTerm) params.set('search', searchTerm);
      const activeType = type ?? typeFilter;
      if (activeType !== 'all') params.set('type', activeType);

      const response = await fetch(`/api/admin/users?${params}`);
      if (!response.ok) throw new Error('Failed to fetch users');
      
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (page === 1) {
        fetchData(searchQuery);
      } else {
        setPage(1);
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  useEffect(() => {
    setPage(1);
    fetchData(searchQuery, 1, typeFilter);
  }, [typeFilter]);

  useEffect(() => {
    fetchData(searchQuery, page);
  }, [page]);

  const handleDelete = async (userId: string) => {
    if (!confirm('Are you sure you want to permanently delete this user? This cannot be undone.')) return;
    setDeletingId(userId);
    const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
    setDeletingId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? 'Failed to delete user');
      return;
    }
    startTransition(() => router.refresh());
    fetchData(searchQuery, page);
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-neutral-400">Loading users...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-red-400">Error: {error}</div>
      </div>
    );
  }

  const filtered = data?.customers ?? [];

  return (
    <>
      <div className='space-y-4'>
        {/* Type filter pills */}
        <div className="flex items-center gap-2">
          {(['all', 'users', 'prospects'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors',
                typeFilter === t
                  ? 'bg-emerald-500 text-black'
                  : 'bg-zinc-800 text-neutral-400 hover:text-white'
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <IoSearch className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500' />
            <Input
              placeholder='Search by business name or email...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='pl-10'
            />
          </div>
          <Button
            onClick={() => setShowAddModal(true)}
            variant='emerald'
            className='shrink-0'
          >
            <IoPersonAdd className='mr-2 h-4 w-4' />
            Add User
          </Button>
        </div>

        {/* Results count */}
        {data && (
          <div className="text-sm text-neutral-400">
            Showing {((data.pagination.page - 1) * data.pagination.limit) + 1} to{' '}
            {Math.min(data.pagination.page * data.pagination.limit, data.pagination.total)} of{' '}
            {data.pagination.total} users
          </div>
        )}

        <div className='overflow-hidden rounded-lg border border-zinc-100 dark:border-zinc-800'>
          <table className='w-full'>
            <thead className='border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50'>
              <tr>
                <th className='px-4 py-3 text-left text-sm font-medium text-neutral-500'>Business</th>
                <th className='px-4 py-3 text-left text-sm font-medium text-neutral-500'>Email</th>
                <th className='px-4 py-3 text-left text-sm font-medium text-neutral-500'>Role</th>
                <th className='px-4 py-3 text-left text-sm font-medium text-neutral-500'>Status</th>
                <th className='px-4 py-3 text-left text-sm font-medium text-neutral-500'>Joined</th>
                <th className='px-4 py-3 text-left text-sm font-medium text-neutral-500'>Actions</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-zinc-100 dark:divide-zinc-800'>
              {filtered.map((c) => {
                const isAdminUser = data?.adminUserIds.includes(c.user_id);
                return (
                  <tr
                    key={c.user_id}
                    className='hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer'
                    onClick={() => router.push(`/admin/customers/${c.user_id}`)}
                  >
                    <td className='px-4 py-3 font-medium'>{c.business_name ?? 'Unnamed'}</td>
                    <td className='px-4 py-3 text-sm text-neutral-400'>{c.email}</td>
                    <td className='px-4 py-3'>
                      {isAdminUser ? (
                        <span className='flex items-center gap-1 text-xs text-purple-400'>
                          <IoShield className='h-3 w-3' />
                          Admin
                        </span>
                      ) : c.is_prospect ? (
                        <span className='flex items-center gap-1 text-xs text-cyan-400'>
                          <IoBriefcase className='h-3 w-3' />
                          Prospect
                        </span>
                      ) : (
                        <span className='text-xs text-neutral-500'>User</span>
                      )}
                    </td>
                    <td className='px-4 py-3'>
                      <span className={cn('rounded-full px-2 py-0.5 text-xs', getStatusBadge(c.status))}>
                        {formatStatus(c.status)}
                      </span>
                    </td>
                    <td className='px-4 py-3 text-sm text-neutral-400'>
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>
                    <td className='px-4 py-3' onClick={(e) => e.stopPropagation()}>
                      <div className='flex items-center gap-2'>
                        <Button size='sm' variant='outline' asChild>
                          <Link href={`/admin/customers/${c.user_id}`}>
                            <IoEye className='mr-1 h-3 w-3' />
                            View
                          </Link>
                        </Button>
                        <Button
                          size='sm'
                          variant='outline'
                          onClick={() => setEditingCustomer(c)}
                        >
                          <IoPencil className='h-3 w-3' />
                        </Button>
                        <Button
                          size='sm'
                          variant='outline'
                          disabled={deletingId === c.user_id}
                          onClick={() => handleDelete(c.user_id)}
                          className='text-red-400 hover:border-red-500 hover:text-red-400'
                        >
                          <IoTrash className='h-3 w-3' />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className='px-4 py-8 text-center text-sm text-neutral-500'>
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-neutral-400">
              Page {data.pagination.page} of {data.pagination.totalPages}
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={!data.pagination.hasPrev || loading}
              >
                <IoChevronBack className="h-4 w-4" />
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage(p => Math.min(data.pagination.totalPages, p + 1))}
                disabled={!data.pagination.hasNext || loading}
              >
                Next
                <IoChevronForward className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {showAddModal && <AddUserModal onClose={() => setShowAddModal(false)} />}
      {editingCustomer && data && (
        <EditUserModal
          customer={editingCustomer}
          isAdmin={data.adminUserIds.includes(editingCustomer.user_id)}
          onClose={() => setEditingCustomer(null)}
        />
      )}
    </>
  );
}
