'use client';

import { useState, useEffect } from 'react';
import { IoRocket, IoEye, IoGlobe, IoChevronBack, IoChevronForward } from 'react-icons/io5';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn';
import { type DeployedWebsite } from './projects-tab';
import { getStatusBadge, formatStatus } from './types';

interface PaginatedResponse {
  websites: DeployedWebsite[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export function ProjectsTab() {
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const fetchData = async (pageNum?: number) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(pageNum ?? page),
        limit: '50',
      });
      
      if (statusFilter) {
        params.set('status', statusFilter);
      }

      const response = await fetch(`/api/admin/websites?${params}`);
      if (!response.ok) throw new Error('Failed to fetch websites');
      
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
    setPage(1);
    fetchData(1);
  }, [statusFilter]);

  useEffect(() => {
    fetchData();
  }, [page]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-neutral-400">Loading websites...</div>
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

  const websites = data?.websites ?? [];

  return (
    <div className='space-y-4'>
      {/* Toolbar */}
      <div className='flex items-center gap-3'>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg bg-transparent px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 focus:border-emerald-500 focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="building">Building</option>
          <option value="built">Built</option>
          <option value="deployed">Deployed</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {/* Results count */}
      {data && (
        <div className="text-sm text-neutral-400">
          Showing {((data.pagination.page - 1) * data.pagination.limit) + 1} to{' '}
          {Math.min(data.pagination.page * data.pagination.limit, data.pagination.total)} of{' '}
          {data.pagination.total} websites
        </div>
      )}

      <div className='overflow-hidden rounded-lg border border-zinc-100 dark:border-zinc-800'>
        <table className='w-full'>
          <thead className='border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50'>
            <tr>
              <th className='px-4 py-3 text-left text-sm font-medium text-neutral-500'>Business</th>
              <th className='px-4 py-3 text-left text-sm font-medium text-neutral-500'>Domain</th>
              <th className='px-4 py-3 text-left text-sm font-medium text-neutral-500'>Status</th>
              <th className='px-4 py-3 text-left text-sm font-medium text-neutral-500'>Created</th>
              <th className='px-4 py-3 text-left text-sm font-medium text-neutral-500'>Actions</th>
            </tr>
          </thead>
          <tbody className='divide-y divide-zinc-100 dark:divide-zinc-800'>
            {websites.map((site) => (
              <tr key={site.id} className='hover:bg-zinc-50 dark:hover:bg-zinc-800/50'>
                <td className='px-4 py-3'>
                  <div>
                    <p className='font-medium'>{site.businessName}</p>
                    <p className='text-sm text-neutral-400'>{site.userEmail}</p>
                  </div>
                </td>
                <td className='px-4 py-3'>
                  <div className='space-y-1'>
                    {site.custom_domain && (
                      <p className='text-sm font-mono text-emerald-400'>{site.custom_domain}</p>
                    )}
                    {site.subdomain && (
                      <p className='text-sm font-mono text-neutral-400'>{site.subdomain}.freewebsite.deal</p>
                    )}
                  </div>
                </td>
                <td className='px-4 py-3'>
                  <span className={cn('rounded-full px-2 py-0.5 text-xs', getStatusBadge(site.status))}>
                    {formatStatus(site.status)}
                  </span>
                </td>
                <td className='px-4 py-3 text-sm text-neutral-400'>
                  {new Date(site.created_at).toLocaleDateString()}
                </td>
                <td className='px-4 py-3'>
                  <div className='flex items-center gap-2'>
                    {site.live_url && (
                      <Button size='sm' variant='outline' asChild>
                        <a href={site.live_url} target="_blank" rel="noopener noreferrer">
                          <IoGlobe className='mr-1 h-3 w-3' />
                          Live
                        </a>
                      </Button>
                    )}
                    {site.vercel_preview_url && (
                      <Button size='sm' variant='outline' asChild>
                        <a href={site.vercel_preview_url} target="_blank" rel="noopener noreferrer">
                          <IoEye className='mr-1 h-3 w-3' />
                          Preview
                        </a>
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {websites.length === 0 && !loading && (
              <tr>
                <td colSpan={5} className='px-4 py-8 text-center text-sm text-neutral-500'>
                  No websites found.
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
  );
}
