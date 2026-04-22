'use client';

import { useState, useEffect } from 'react';
import { IoCreate, IoEye, IoPlay, IoChevronBack, IoChevronForward } from 'react-icons/io5';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn';
import { type EditRequestWithBusiness, getStatusBadge, formatStatus } from './types';

interface PaginatedResponse {
  editRequests: EditRequestWithBusiness[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export function EditsTab() {
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

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

      const response = await fetch(`/api/admin/edits?${params}`);
      if (!response.ok) throw new Error('Failed to fetch edit requests');
      
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

  const handleStartEditRequest = async (id: string) => {
    setUpdatingId(id);
    try {
      await fetch(`/api/admin/edit-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'in_progress' }),
      });
      fetchData();
    } catch (err) {
      console.error('Failed to update edit request:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-neutral-400">Loading edit requests...</div>
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

  const editRequests = data?.editRequests ?? [];

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
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {/* Results count */}
      {data && (
        <div className="text-sm text-neutral-400">
          Showing {((data.pagination.page - 1) * data.pagination.limit) + 1} to{' '}
          {Math.min(data.pagination.page * data.pagination.limit, data.pagination.total)} of{' '}
          {data.pagination.total} edit requests
        </div>
      )}

      <div className='overflow-hidden rounded-lg border border-zinc-100 dark:border-zinc-800'>
        <table className='w-full'>
          <thead className='border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50'>
            <tr>
              <th className='px-4 py-3 text-left text-sm font-medium text-neutral-500'>Business</th>
              <th className='px-4 py-3 text-left text-sm font-medium text-neutral-500'>Type</th>
              <th className='px-4 py-3 text-left text-sm font-medium text-neutral-500'>Description</th>
              <th className='px-4 py-3 text-left text-sm font-medium text-neutral-500'>Status</th>
              <th className='px-4 py-3 text-left text-sm font-medium text-neutral-500'>Created</th>
              <th className='px-4 py-3 text-left text-sm font-medium text-neutral-500'>Actions</th>
            </tr>
          </thead>
          <tbody className='divide-y divide-zinc-100 dark:divide-zinc-800'>
            {editRequests.map((edit) => (
              <tr key={edit.id} className='hover:bg-zinc-50 dark:hover:bg-zinc-800/50'>
                <td className='px-4 py-3 font-medium'>{edit.businessName}</td>
                <td className='px-4 py-3'>
                  <span className='inline-flex items-center gap-1 rounded-full bg-purple-500/20 px-2 py-1 text-xs text-purple-400'>
                    <IoCreate className='h-3 w-3' />
                    Edit
                  </span>
                </td>
                <td className='px-4 py-3 text-sm text-neutral-400 max-w-xs truncate'>
                  {edit.request_description || 'No description'}
                </td>
                <td className='px-4 py-3'>
                  <span className={cn('rounded-full px-2 py-0.5 text-xs', getStatusBadge(edit.status))}>
                    {formatStatus(edit.status)}
                  </span>
                </td>
                <td className='px-4 py-3 text-sm text-neutral-400'>
                  {new Date(edit.created_at).toLocaleDateString()}
                </td>
                <td className='px-4 py-3'>
                  <div className='flex items-center gap-2'>
                    {edit.status === 'pending' && (
                      <Button
                        size='sm'
                        variant='outline'
                        onClick={() => handleStartEditRequest(edit.id)}
                        disabled={updatingId === edit.id}
                      >
                        <IoPlay className='mr-1 h-3 w-3' />
                        Start
                      </Button>
                    )}
                    <Button size='sm' variant='outline' asChild>
                      <a href={`/admin/customers/${edit.user_id}`} target="_blank" rel="noopener noreferrer">
                        <IoEye className='mr-1 h-3 w-3' />
                        View
                      </a>
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {editRequests.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className='px-4 py-8 text-center text-sm text-neutral-500'>
                  No edit requests found.
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
