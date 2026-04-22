'use client';

import { AdminStat } from '@/components/admin/stat';
import { AdminSectionHeader } from '@/components/admin/section-header';
import { AdminSection } from '@/components/admin/section';
import { type DashboardStats } from './types';

interface AnalyticsTabProps {
  stats: DashboardStats;
}

export function AnalyticsTab({ stats }: AnalyticsTabProps) {
  return (
    <div className='space-y-6'>
      {/* Revenue */}
      <AdminSection>
        <AdminSectionHeader title='Revenue Overview' />
        <div className='grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-3'>
          <AdminStat value={`$${stats.monthlyRevenue.toLocaleString()}`} label='Monthly Revenue' accent />
          <AdminStat value={stats.activeWebsites} label='Active Websites' accent />
          <AdminStat value={stats.newUsersThisWeek} label='New Users (7d)' />
        </div>
      </AdminSection>

      {/* Pipeline */}
      <AdminSection>
        <AdminSectionHeader title='Pipeline' />
        <div className='grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-3'>
          <AdminStat value={stats.pendingQueue} label='Queue Items' />
          <AdminStat value={stats.pendingEdits} label='Pending Edit Requests' />
        </div>
      </AdminSection>

      {/* Charts placeholder */}
      <div className='flex h-48 items-center justify-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg'>
        <p className='text-sm font-light text-neutral-400'>Detailed charts coming soon</p>
      </div>
    </div>
  );
}
