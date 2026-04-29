'use client';

import React, { useCallback, useEffect, useRef,useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/utils/cn';

// ─── Types ────────────────────────────────────────────────────────────────────

interface QueueItem {
  id: string;
  business_id: string | null;
  business_name: string | null;
  user_id: string | null;
  task_type: string;
  priority: number;
  payload: Record<string, unknown>;
  status: string;
  claimed_by: string | null;
  claimed_at: string | null;
  result: Record<string, unknown> | null;
  error: string | null;
  retry_count: number;
  max_retries: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

interface QueueStats {
  pending: number;
  claimed: number;
  processing: number;
  completed: number;
  failed: number;
  completed_today: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TASK_TYPES = [
  'logo_generation',
  'logo_refresh',
  'branding_guide',
  'edit_request',
  'website_generation',
  'web_discovery',
  'domain_purchase',
  'wp_migration',
  'site_provision',
] as const;

const TASK_TYPE_LABELS: Record<string, string> = {
  logo_generation: 'Logo Generation',
  logo_refresh: 'Logo Refresh',
  branding_guide: 'Branding Guide',
  edit_request: 'Edit Request',
  website_generation: 'Website Generation',
  web_discovery: 'Web Discovery',
  domain_purchase: 'Domain Purchase',
  wp_migration: 'WP Migration',
  site_provision: 'Site Provision',
};

const TASK_TYPE_COLORS: Record<string, string> = {
  logo_generation: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  logo_refresh: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300',
  branding_guide: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  edit_request: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  website_generation: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
  web_discovery: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
  domain_purchase: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  wp_migration: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  site_provision: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  claimed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  processing: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  cancelled: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function shortId(id: string): string {
  return id.substring(0, 8);
}

// ─── Components ───────────────────────────────────────────────────────────────

function StatBadge({ label, value, variant = 'default' }: { label: string; value: number; variant?: 'default' | 'danger' | 'muted' }) {
  return (
    <div className={cn(
      'flex flex-col items-center rounded-lg border px-4 py-2 min-w-[80px]',
      variant === 'danger' && value > 0 ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30' : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900'
    )}>
      <span className={cn(
        'text-xl font-bold tabular-nums',
        variant === 'danger' && value > 0 ? 'text-red-600 dark:text-red-400' : 'text-black dark:text-white'
      )}>
        {value}
      </span>
      <span className="text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{label}</span>
    </div>
  );
}

function Badge({ label, colorClass }: { label: string; colorClass: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', colorClass)}>
      {label}
    </span>
  );
}

function DetailPanel({ item, onClose, onCancel, onRetry, onPriorityChange }: {
  item: QueueItem;
  onClose: () => void;
  onCancel: (id: string) => Promise<void>;
  onRetry: (id: string) => Promise<void>;
  onPriorityChange: (id: string, priority: number) => Promise<void>;
}) {
  const [editingPriority, setEditingPriority] = useState(false);
  const [priorityVal, setPriorityVal] = useState(String(item.priority));
  const [loading, setLoading] = useState(false);

  const handlePrioritySave = async () => {
    const p = parseInt(priorityVal, 10);
    if (isNaN(p)) return;
    setLoading(true);
    await onPriorityChange(item.id, p);
    setLoading(false);
    setEditingPriority(false);
  };

  const handleCancel = async () => {
    setLoading(true);
    await onCancel(item.id);
    setLoading(false);
  };

  const handleRetry = async () => {
    setLoading(true);
    await onRetry(item.id);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-t-2xl sm:rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-2xl overflow-y-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-700">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm text-zinc-500">{shortId(item.id)}</span>
            <Badge label={item.task_type} colorClass={TASK_TYPE_COLORS[item.task_type] ?? 'bg-zinc-100 text-zinc-700'} />
            <Badge label={item.status} colorClass={STATUS_COLORS[item.status] ?? 'bg-zinc-100 text-zinc-700'} />
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-black dark:hover:text-white text-xl leading-none">&times;</button>
        </div>

        <div className="px-6 py-4 space-y-5">
          {/* Meta row */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-zinc-500">Business</span>
              <p className="font-medium">{item.business_name ?? item.business_id ?? '—'}</p>
            </div>
            <div>
              <span className="text-zinc-500">Claimed By</span>
              <p className="font-medium">{item.claimed_by ?? '—'}</p>
            </div>
            <div>
              <span className="text-zinc-500">Priority</span>
              {editingPriority ? (
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    type="number"
                    value={priorityVal}
                    onChange={(e) => setPriorityVal(e.target.value)}
                    className="w-20 h-7 text-sm"
                  />
                  <Button size="sm" onClick={handlePrioritySave} disabled={loading} className="h-7 text-xs px-2">Save</Button>
                  <button onClick={() => setEditingPriority(false)} className="text-xs text-zinc-500">Cancel</button>
                </div>
              ) : (
                <p className="font-medium flex items-center gap-2">
                  {item.priority}
                  <button onClick={() => setEditingPriority(true)} className="text-xs text-zinc-400 hover:text-black dark:hover:text-white underline">edit</button>
                </p>
              )}
            </div>
            <div>
              <span className="text-zinc-500">Retries</span>
              <p className="font-medium">{item.retry_count} / {item.max_retries}</p>
            </div>
            <div>
              <span className="text-zinc-500">Created</span>
              <p className="font-medium">{new Date(item.created_at).toLocaleString()}</p>
            </div>
            {item.claimed_at && (
              <div>
                <span className="text-zinc-500">Claimed At</span>
                <p className="font-medium">{new Date(item.claimed_at).toLocaleString()}</p>
              </div>
            )}
            {item.completed_at && (
              <div>
                <span className="text-zinc-500">Completed At</span>
                <p className="font-medium">{new Date(item.completed_at).toLocaleString()}</p>
              </div>
            )}
          </div>

          {/* Payload */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-1">Payload</p>
            <pre className="rounded-lg bg-zinc-50 dark:bg-zinc-800 p-3 text-xs overflow-x-auto whitespace-pre-wrap break-all">
              {JSON.stringify(item.payload, null, 2)}
            </pre>
          </div>

          {/* Result */}
          {item.result && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-1">Result</p>
              <pre className="rounded-lg bg-green-50 dark:bg-green-950/20 p-3 text-xs overflow-x-auto whitespace-pre-wrap break-all">
                {JSON.stringify(item.result, null, 2)}
              </pre>
            </div>
          )}

          {/* Error */}
          {item.error && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-red-500 mb-1">Error</p>
              <pre className="rounded-lg bg-red-50 dark:bg-red-950/20 p-3 text-xs text-red-700 dark:text-red-300 overflow-x-auto whitespace-pre-wrap break-all">
                {item.error}
              </pre>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            {['failed', 'cancelled'].includes(item.status) && (
              <Button size="sm" onClick={handleRetry} disabled={loading} className="text-xs">
                Retry
              </Button>
            )}
            {!['completed', 'cancelled', 'failed'].includes(item.status) && (
              <Button size="sm" variant="outline" onClick={handleCancel} disabled={loading} className="text-xs text-red-600 border-red-200 hover:bg-red-50">
                Cancel
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export function AdminQueueDashboard() {
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [items, setItems] = useState<QueueItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<QueueItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filters
  const [filterStatus, setFilterStatus] = useState('');
  const [filterTaskType, setFilterTaskType] = useState('');
  const [filterBusiness, setFilterBusiness] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  const PER_PAGE = 25;
  const statsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/queue/stats');
      if (res.ok) setStats(await res.json());
    } catch { /* silent */ }
  }, []);

  const fetchItems = useCallback(async (p: number) => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('page', String(p));
    params.set('per_page', String(PER_PAGE));
    if (filterStatus) params.set('status', filterStatus);
    if (filterTaskType) params.set('task_type', filterTaskType);
    if (filterBusiness) params.set('business_id', filterBusiness);
    if (filterFrom) params.set('from', filterFrom);
    if (filterTo) params.set('to', filterTo);

    try {
      const res = await fetch(`/api/admin/queue?${params}`);
      if (res.ok) {
        const json = await res.json();
        setItems(json.items ?? []);
        setTotal(json.total ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterTaskType, filterBusiness, filterFrom, filterTo]);

  // Set header context label
  useEffect(() => {
    const contextEl = document.getElementById('admin-header-context');
    if (contextEl) contextEl.textContent = 'Request Queue';
    return () => { if (contextEl) contextEl.textContent = ''; };
  }, []);

  // Initial load + polling stats
  useEffect(() => {
    fetchStats();
    fetchItems(1);
    statsIntervalRef.current = setInterval(fetchStats, 15_000);
    return () => { if (statsIntervalRef.current) clearInterval(statsIntervalRef.current); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch when page changes
  useEffect(() => {
    fetchItems(page);
  }, [page, fetchItems]);

  const handleApplyFilters = () => {
    setPage(1);
    fetchItems(1);
  };

  const handleClearFilters = () => {
    setFilterStatus('');
    setFilterTaskType('');
    setFilterBusiness('');
    setFilterFrom('');
    setFilterTo('');
    setPage(1);
  };

  const handleCancel = async (id: string) => {
    await fetch(`/api/admin/queue/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'cancelled' }),
    });
    await fetchItems(page);
    await fetchStats();
    setSelectedItem(null);
  };

  const handleRetry = async (id: string) => {
    await fetch(`/api/admin/queue/${id}/retry`, { method: 'POST' });
    await fetchItems(page);
    await fetchStats();
    setSelectedItem(null);
  };

  const handlePriorityChange = async (id: string, priority: number) => {
    await fetch(`/api/admin/queue/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priority }),
    });
    await fetchItems(page);
  };

  const handleBulkCancel = async () => {
    await Promise.all([...selectedIds].map((id) => handleCancel(id)));
    setSelectedIds(new Set());
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSelected = items.length > 0 && items.every((i) => selectedIds.has(i.id));
  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((i) => i.id)));
    }
  };

  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-black dark:text-white">Request Queue</h1>
            <p className="text-sm text-zinc-500 mt-0.5">Async agent task queue</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => { fetchItems(page); fetchStats(); }} className="text-xs">
            Refresh
          </Button>
        </div>

        {/* Stat badges */}
        {stats && (
          <div className="flex flex-wrap gap-3">
            <StatBadge label="Pending" value={stats.pending} />
            <StatBadge label="Claimed" value={stats.claimed} />
            <StatBadge label="Processing" value={stats.processing} />
            <StatBadge label="Failed" value={stats.failed} variant="danger" />
            <StatBadge label="Completed today" value={stats.completed_today} />
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50 p-3">
          {/* Status */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-zinc-500">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-sm px-2 py-1 text-black dark:text-white"
            >
              <option value="">All</option>
              {['pending', 'claimed', 'processing', 'completed', 'failed', 'cancelled'].map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>

          {/* Task type */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-zinc-500">Task Type</label>
            <select
              value={filterTaskType}
              onChange={(e) => setFilterTaskType(e.target.value)}
              className="rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-sm px-2 py-1 text-black dark:text-white"
            >
              <option value="">All</option>
              {TASK_TYPES.map((t) => (
                <option key={t} value={t}>{TASK_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>

          {/* From date */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-zinc-500">From</label>
            <Input
              type="date"
              value={filterFrom}
              onChange={(e) => setFilterFrom(e.target.value)}
              className="h-8 text-sm w-36"
            />
          </div>

          {/* To date */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-zinc-500">To</label>
            <Input
              type="date"
              value={filterTo}
              onChange={(e) => setFilterTo(e.target.value)}
              className="h-8 text-sm w-36"
            />
          </div>

          <Button size="sm" onClick={handleApplyFilters} className="text-xs h-8">Apply</Button>
          <Button size="sm" variant="outline" onClick={handleClearFilters} className="text-xs h-8">Clear</Button>
        </div>

        {/* Bulk actions */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 rounded-lg bg-zinc-100 dark:bg-zinc-800 px-4 py-2 text-sm">
            <span className="font-medium">{selectedIds.size} selected</span>
            <Button size="sm" variant="outline" onClick={handleBulkCancel} className="text-xs text-red-600 border-red-200 hover:bg-red-50 h-7">
              Cancel Selected
            </Button>
            <button onClick={() => setSelectedIds(new Set())} className="text-xs text-zinc-500 hover:text-black dark:hover:text-white">
              Deselect all
            </button>
          </div>
        )}

        {/* Table */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-zinc-400 text-sm">Loading…</div>
          ) : items.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-zinc-400 text-sm">No items found</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-700">
                  <th className="px-3 py-3 text-left">
                    <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="cursor-pointer" />
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">ID</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Business</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Task Type</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Priority</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Status</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Claimed By</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Created</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr
                    key={item.id}
                    className={cn(
                      'border-b border-zinc-100 dark:border-zinc-800 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors',
                      i % 2 === 0 ? 'bg-white dark:bg-zinc-950' : 'bg-zinc-50/50 dark:bg-zinc-900/50'
                    )}
                    onClick={() => setSelectedItem(item)}
                  >
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(item.id)}
                        onChange={() => toggleSelect(item.id)}
                        className="cursor-pointer"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <span className="font-mono text-xs text-zinc-500">{shortId(item.id)}</span>
                    </td>
                    <td className="px-3 py-3 max-w-[140px] truncate">
                      <span className="text-black dark:text-white">{item.business_name ?? '—'}</span>
                    </td>
                    <td className="px-3 py-3">
                      <Badge
                        label={TASK_TYPE_LABELS[item.task_type] ?? item.task_type}
                        colorClass={TASK_TYPE_COLORS[item.task_type] ?? 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <span className="tabular-nums">{item.priority}</span>
                    </td>
                    <td className="px-3 py-3">
                      <Badge label={item.status} colorClass={STATUS_COLORS[item.status] ?? 'bg-zinc-100 text-zinc-700'} />
                    </td>
                    <td className="px-3 py-3 text-zinc-500 max-w-[100px] truncate">
                      {item.claimed_by ?? '—'}
                    </td>
                    <td className="px-3 py-3 text-zinc-500 whitespace-nowrap">
                      {relativeTime(item.created_at)}
                    </td>
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        {['failed', 'cancelled'].includes(item.status) && (
                          <button
                            onClick={() => handleRetry(item.id)}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            Retry
                          </button>
                        )}
                        {!['completed', 'cancelled', 'failed'].includes(item.status) && (
                          <button
                            onClick={() => handleCancel(item.id)}
                            className="text-xs text-red-500 hover:underline"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm text-zinc-500">
            <span>{total} total items</span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="text-xs h-8"
              >
                Previous
              </Button>
              <span className="tabular-nums">Page {page} of {totalPages}</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="text-xs h-8"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
      {/* Detail panel */}
      {selectedItem && (
        <DetailPanel
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onCancel={handleCancel}
          onRetry={handleRetry}
          onPriorityChange={handlePriorityChange}
        />
      )}
    </>
  );
}
