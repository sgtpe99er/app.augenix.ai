'use client';

import { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { IoPlay } from 'react-icons/io5';
import { Button } from '@/components/ui/button';
import { AdminStat } from '@/components/admin/stat';
import { AdminSectionHeader } from '@/components/admin/section-header';
import { AdminListRow } from '@/components/admin/list-row';
import { cn } from '@/utils/cn';
import {
  type DashboardStats,
  type EditRequestWithBusiness,
  getStatusBadge,
  formatStatus,
} from './types';

interface OverviewTabProps {
  stats: DashboardStats;
}

export function OverviewTab({ stats }: OverviewTabProps) {
  const router = useRouter();
  const [editRequests, setEditRequests] = useState<EditRequestWithBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    const fetchEditRequests = async () => {
      try {
        const response = await fetch('/api/admin/edits?status=pending&limit=5');
        if (response.ok) {
          const data = await response.json();
          setEditRequests(data.editRequests || []);
        }
      } catch (error) {
        console.error('Failed to fetch edit requests:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEditRequests();
  }, []);

  const handleStartEditRequest = async (id: string) => {
    setUpdatingId(id);
    await fetch(`/api/admin/edit-requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'in_progress' }),
    });
    setUpdatingId(null);
    startTransition(() => router.refresh());
  };

  const pendingRequests = editRequests.filter(e => e.status === 'pending');

  return (
    <div className='space-y-8'>
      {/* Stats Grid */}
      <div className='grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-3 lg:grid-cols-5 border-b border-zinc-100 dark:border-zinc-900 pb-8'>
        <AdminStat value={`$${(stats.monthlyRevenue / 100).toFixed(0)}`} label='Monthly Revenue' accent />
        <AdminStat value={stats.totalUsers} label='Paying Users' sub={`+${stats.newUsersThisWeek} this week`} />
        <AdminStat value={stats.totalProspects} label='Prospects' />
        <AdminStat value={stats.pendingQueue} label='Queue Items' />
        <AdminStat value={stats.activeWebsites} label='Active Websites' accent />
      </div>

      {/* Pending Edit Requests */}
      <div>
        <AdminSectionHeader
          title='Pending Edit Requests'
          action={
            <Link href='/admin/edits' className='text-xs font-light text-neutral-400 hover:text-black dark:hover:text-white'>
              View all →
            </Link>
          }
        />
        {loading ? (
          <p className='text-sm text-neutral-500'>Loading...</p>
        ) : pendingRequests.length === 0 ? (
          <p className='text-sm text-neutral-500'>No pending requests.</p>
        ) : (
          <div className='divide-y divide-zinc-100 dark:divide-zinc-900'>
            {pendingRequests.slice(0, 5).map((req) => (
              <AdminListRow
                key={req.id}
                title={req.request_description ?? 'No description'}
                subtitle={`${req.businessName} · ${new Date(req.created_at).toLocaleDateString()}`}
                actions={
                  <>
                    <span className={cn('rounded-full px-2 py-0.5 text-xs', getStatusBadge(req.status))}>
                      {formatStatus(req.status)}
                    </span>
                    <Button
                      size='sm'
                      variant='emerald'
                      disabled={updatingId === req.id}
                      onClick={() => handleStartEditRequest(req.id)}
                    >
                      <IoPlay className='mr-1 h-3 w-3' />
                      Start
                    </Button>
                    <Button size='sm' variant='outline' asChild>
                      <Link href={`/admin/customers/${req.user_id}`}>View</Link>
                    </Button>
                  </>
                }
              />
            ))}
            {pendingRequests.length > 5 && (
              <div className='pt-4'>
                <Button variant='outline' className='w-full' asChild>
                  <Link href='/admin/edits'>View All Requests</Link>
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
