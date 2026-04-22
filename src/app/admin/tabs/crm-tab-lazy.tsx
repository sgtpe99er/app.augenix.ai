'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  IoSearch,
  IoAdd,
  IoPencil,
  IoTrash,
  IoClose,
  IoCheckmark,
  IoCall,
  IoMail,
  IoGlobe,
  IoLogoFacebook,
  IoFilter,
} from 'react-icons/io5';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/utils/cn';

// ─── Types ────────────────────────────────────────────────────────────────────

type ProspectStage = 'researched' | 'contacted' | 'responded' | 'converted' | 'churned';
type WebsiteStatus = 'none' | 'subdomain' | 'placeholder' | 'low_quality' | 'professional';
type BuildStatus = 'pending' | 'in_progress' | 'live' | 'domain_configured';

interface CrmProspect {
  id: string;
  business_name: string;
  owner_name: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  state: string | null;
  category: string | null;
  google_address: string | null;
  google_reviews: number | null;
  google_rating: number | null;
  facebook_url: string | null;
  website_status: WebsiteStatus;
  email_domain: string | null;
  qualifies: boolean;
  fwd_user_id: string | null;
  subdomain: string | null;
  prospect_stage: ProspectStage;
  site_built: boolean;
  build_status: BuildStatus;
  first_email_date: string | null;
  last_follow_up_date: string | null;
  follow_up_count: number;
  link_clicked: boolean;
  responded: boolean;
  response_date: string | null;
  converted_to_customer: boolean;
  hosting_plan: string | null;
  monthly_revenue: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface PaginatedResponse {
  prospects: CrmProspect[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STAGE_LABELS: Record<ProspectStage, string> = {
  researched: 'Researched',
  contacted: 'Contacted',
  responded: 'Responded',
  converted: 'Converted',
  churned: 'Churned',
};

const STAGE_COLORS: Record<ProspectStage, string> = {
  researched: 'bg-zinc-500/20 text-zinc-400',
  contacted: 'bg-blue-500/20 text-blue-400',
  responded: 'bg-yellow-500/20 text-yellow-400',
  converted: 'bg-emerald-500/20 text-emerald-400',
  churned: 'bg-red-500/20 text-red-400',
};

const WEBSITE_STATUS_LABELS: Record<WebsiteStatus, string> = {
  none: 'No Site',
  subdomain: 'Subdomain',
  placeholder: 'Placeholder',
  low_quality: 'Low Quality',
  professional: 'Professional',
};

const WEBSITE_STATUS_COLORS: Record<WebsiteStatus, string> = {
  none: 'bg-red-500/20 text-red-400',
  subdomain: 'bg-orange-500/20 text-orange-400',
  placeholder: 'bg-yellow-500/20 text-yellow-400',
  low_quality: 'bg-yellow-500/20 text-yellow-400',
  professional: 'bg-zinc-500/20 text-zinc-400',
};

// ─── Edit/Add Modal ───────────────────────────────────────────────────────────

interface ProspectModalProps {
  prospect: CrmProspect | null; // null = add mode
  onClose: () => void;
  onSaved: () => void;
}

function ProspectModal({ prospect, onClose, onSaved }: ProspectModalProps) {
  const isEdit = Boolean(prospect);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<CrmProspect>>(
    prospect ?? {
      prospect_stage: 'researched',
      website_status: 'none',
      build_status: 'pending',
      qualifies: true,
      site_built: false,
      follow_up_count: 0,
      link_clicked: false,
      responded: false,
      converted_to_customer: false,
    }
  );

  const set = (field: keyof CrmProspect, value: unknown) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSave = async () => {
    if (!form.business_name?.trim()) return;
    setSaving(true);
    try {
      const url = isEdit ? `/api/admin/crm/${prospect!.id}` : '/api/admin/crm';
      const method = isEdit ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Save failed');
      onSaved();
      onClose();
    } catch {
      alert('Failed to save prospect.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4'>
      <div className='flex w-full max-w-2xl flex-col rounded-2xl bg-white dark:bg-zinc-900 shadow-xl max-h-[90vh]'>
        {/* Header */}
        <div className='flex shrink-0 items-center justify-between border-b border-zinc-100 dark:border-zinc-800 px-6 py-4'>
          <h2 className='text-base font-semibold'>{isEdit ? 'Edit Prospect' : 'Add Prospect'}</h2>
          <button onClick={onClose} className='rounded-lg p-1.5 text-neutral-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-black dark:hover:text-white transition-colors'>
            <IoClose className='h-5 w-5' />
          </button>
        </div>

        {/* Body */}
        <div className='grid gap-4 overflow-y-auto px-6 py-5 sm:grid-cols-2'>
          {/* Business name */}
          <div className='sm:col-span-2'>
            <label className='mb-1 block text-xs text-neutral-400'>Business Name *</label>
            <Input
              value={form.business_name ?? ''}
              onChange={(e) => set('business_name', e.target.value)}
              placeholder='Acme Roofing LLC'
            />
          </div>

          <div>
            <label className='mb-1 block text-xs text-neutral-400'>Owner Name</label>
            <Input value={form.owner_name ?? ''} onChange={(e) => set('owner_name', e.target.value)} />
          </div>
          <div>
            <label className='mb-1 block text-xs text-neutral-400'>Category</label>
            <Input
              value={form.category ?? ''}
              onChange={(e) => set('category', e.target.value)}
              placeholder='roofing, towing, etc.'
            />
          </div>

          <div>
            <label className='mb-1 block text-xs text-neutral-400'>Phone</label>
            <Input value={form.phone ?? ''} onChange={(e) => set('phone', e.target.value)} />
          </div>
          <div>
            <label className='mb-1 block text-xs text-neutral-400'>Email</label>
            <Input
              type='email'
              value={form.email ?? ''}
              onChange={(e) => set('email', e.target.value)}
            />
          </div>

          <div>
            <label className='mb-1 block text-xs text-neutral-400'>City</label>
            <Input value={form.city ?? ''} onChange={(e) => set('city', e.target.value)} />
          </div>
          <div>
            <label className='mb-1 block text-xs text-neutral-400'>State</label>
            <Input value={form.state ?? ''} onChange={(e) => set('state', e.target.value)} placeholder='TX' />
          </div>

          <div>
            <label className='mb-1 block text-xs text-neutral-400'>Facebook URL</label>
            <Input
              value={form.facebook_url ?? ''}
              onChange={(e) => set('facebook_url', e.target.value)}
            />
          </div>
          <div>
            <label className='mb-1 block text-xs text-neutral-400'>Google Address</label>
            <Input
              value={form.google_address ?? ''}
              onChange={(e) => set('google_address', e.target.value)}
            />
          </div>

          <div>
            <label className='mb-1 block text-xs text-neutral-400'>Google Reviews</label>
            <Input
              type='number'
              value={form.google_reviews ?? ''}
              onChange={(e) => set('google_reviews', e.target.value ? Number(e.target.value) : null)}
            />
          </div>
          <div>
            <label className='mb-1 block text-xs text-neutral-400'>Google Rating</label>
            <Input
              type='number'
              step='0.1'
              min='1'
              max='5'
              value={form.google_rating ?? ''}
              onChange={(e) => set('google_rating', e.target.value ? Number(e.target.value) : null)}
            />
          </div>

          {/* Selects */}
          <div>
            <label className='mb-1 block text-xs text-neutral-400'>Prospect Stage</label>
            <select
              value={form.prospect_stage ?? 'researched'}
              onChange={(e) => set('prospect_stage', e.target.value)}
              className='w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:outline-none'
            >
              {Object.entries(STAGE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label className='mb-1 block text-xs text-neutral-400'>Website Status</label>
            <select
              value={form.website_status ?? 'none'}
              onChange={(e) => set('website_status', e.target.value)}
              className='w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:outline-none'
            >
              {Object.entries(WEBSITE_STATUS_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>

          <div>
            <label className='mb-1 block text-xs text-neutral-400'>Build Status</label>
            <select
              value={form.build_status ?? 'pending'}
              onChange={(e) => set('build_status', e.target.value)}
              className='w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:outline-none'
            >
              <option value='pending'>Pending</option>
              <option value='in_progress'>In Progress</option>
              <option value='live'>Live</option>
              <option value='domain_configured'>Domain Configured</option>
            </select>
          </div>
          <div>
            <label className='mb-1 block text-xs text-neutral-400'>Hosting Plan</label>
            <Input
              value={form.hosting_plan ?? ''}
              onChange={(e) => set('hosting_plan', e.target.value)}
              placeholder='basic, pro, etc.'
            />
          </div>

          <div>
            <label className='mb-1 block text-xs text-neutral-400'>Monthly Revenue ($)</label>
            <Input
              type='number'
              step='0.01'
              value={form.monthly_revenue ?? ''}
              onChange={(e) => set('monthly_revenue', e.target.value ? Number(e.target.value) : null)}
            />
          </div>
          <div>
            <label className='mb-1 block text-xs text-neutral-400'>Follow-Up Count</label>
            <Input
              type='number'
              value={form.follow_up_count ?? 0}
              onChange={(e) => set('follow_up_count', Number(e.target.value))}
            />
          </div>

          <div>
            <label className='mb-1 block text-xs text-neutral-400'>First Email Date</label>
            <Input
              type='date'
              value={form.first_email_date ?? ''}
              onChange={(e) => set('first_email_date', e.target.value || null)}
            />
          </div>
          <div>
            <label className='mb-1 block text-xs text-neutral-400'>Last Follow-Up Date</label>
            <Input
              type='date'
              value={form.last_follow_up_date ?? ''}
              onChange={(e) => set('last_follow_up_date', e.target.value || null)}
            />
          </div>

          {/* Checkboxes */}
          <div className='flex items-center gap-4 sm:col-span-2'>
            {(
              [
                ['qualifies', 'Qualifies'],
                ['site_built', 'Site Built'],
                ['link_clicked', 'Link Clicked'],
                ['responded', 'Responded'],
                ['converted_to_customer', 'Converted'],
              ] as [keyof CrmProspect, string][]
            ).map(([field, label]) => (
              <label key={field} className='flex items-center gap-1.5 text-sm text-neutral-300 cursor-pointer'>
                <input
                  type='checkbox'
                  checked={Boolean(form[field])}
                  onChange={(e) => set(field, e.target.checked)}
                  className='accent-emerald-500'
                />
                {label}
              </label>
            ))}
          </div>

          {/* Notes */}
          <div className='sm:col-span-2'>
            <label className='mb-1 block text-xs text-neutral-400'>Notes</label>
            <textarea
              rows={3}
              value={form.notes ?? ''}
              onChange={(e) => set('notes', e.target.value)}
              className='w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:outline-none resize-none'
            />
          </div>
        </div>

        {/* Footer */}
        <div className='flex shrink-0 justify-end gap-2 border-t border-zinc-100 dark:border-zinc-800 px-6 py-4'>
          <Button variant='outline' onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !form.business_name?.trim()}
            variant='emerald'
          >
            <IoCheckmark className='mr-1.5 h-4 w-4' />
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Prospect'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Tab ─────────────────────────────────────────────────────────────────

export function CrmTab() {
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<'add' | CrmProspect | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchData = useCallback(
    async (opts?: { search?: string; stage?: string; page?: number }) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(opts?.page ?? page),
          limit: '50',
        });
        if (opts?.search ?? search) params.set('search', opts?.search ?? search);
        if (opts?.stage ?? stageFilter) params.set('stage', opts?.stage ?? stageFilter);

        const res = await fetch(`/api/admin/crm?${params}`);
        if (!res.ok) throw new Error('Failed to fetch');
        setData(await res.json());
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error');
      } finally {
        setLoading(false);
      }
    },
    [page, search, stageFilter]
  );

  useEffect(() => { fetchData(); }, []);

  // Debounced search
  useEffect(() => {
    const id = setTimeout(() => { setPage(1); fetchData({ search, stage: stageFilter, page: 1 }); }, 300);
    return () => clearTimeout(id);
  }, [search]);

  useEffect(() => {
    setPage(1);
    fetchData({ search, stage: stageFilter, page: 1 });
  }, [stageFilter]);

  useEffect(() => {
    fetchData({ search, stage: stageFilter, page });
  }, [page]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this prospect? This cannot be undone.')) return;
    setDeletingId(id);
    await fetch(`/api/admin/crm/${id}`, { method: 'DELETE' });
    setDeletingId(null);
    fetchData({ search, stage: stageFilter, page });
  };

  const prospects = data?.pagination ? data.prospects : [];
  const { pagination } = data ?? {};

  // Pipeline summary counts
  const stageCounts = prospects.reduce<Record<string, number>>((acc, p) => {
    acc[p.prospect_stage] = (acc[p.prospect_stage] ?? 0) + 1;
    return acc;
  }, {});

  if (error) {
    return (
      <div className='flex items-center justify-center py-12 text-red-400'>Error: {error}</div>
    );
  }

  return (
    <>
      <div className='space-y-4'>
        {/* Pipeline summary pills */}
        <div className='flex flex-wrap gap-2'>
          {(Object.keys(STAGE_LABELS) as ProspectStage[]).map((stage) => (
            <button
              key={stage}
              onClick={() => setStageFilter(stageFilter === stage ? '' : stage)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition-opacity',
                STAGE_COLORS[stage],
                stageFilter && stageFilter !== stage ? 'opacity-40' : 'opacity-100'
              )}
            >
              {STAGE_LABELS[stage]}
              {stageCounts[stage] ? ` · ${stageCounts[stage]}` : ''}
            </button>
          ))}
          {stageFilter && (
            <button
              onClick={() => setStageFilter('')}
              className='rounded-full px-3 py-1 text-xs text-neutral-400 hover:text-white'
            >
              <IoClose className='inline h-3 w-3 mr-0.5' />
              Clear
            </button>
          )}
        </div>

        {/* Toolbar */}
        <div className='flex items-center gap-3'>
          <div className='relative flex-1'>
            <IoSearch className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500' />
            <Input
              placeholder='Search name, email, phone, city…'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className='pl-10'
            />
          </div>
          <Button
            onClick={() => setModal('add')}
            variant='emerald'
            className='shrink-0'
          >
            <IoAdd className='mr-1.5 h-4 w-4' />
            Add Prospect
          </Button>
        </div>

        {/* Count */}
        {pagination && (
          <div className='text-sm text-neutral-400'>
            {pagination.total} prospect{pagination.total !== 1 ? 's' : ''}
            {stageFilter ? ` · filtered by ${STAGE_LABELS[stageFilter as ProspectStage]}` : ''}
          </div>
        )}

        {/* Table */}
        <div className='overflow-x-auto overflow-hidden rounded-lg border border-zinc-100 dark:border-zinc-800'>
          <table className='w-full min-w-[800px]'>
            <thead className='border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50'>
              <tr>
                <th className='px-4 py-3 text-left text-xs font-medium text-neutral-500'>Business</th>
                <th className='px-4 py-3 text-left text-xs font-medium text-neutral-500'>Contact</th>
                <th className='px-4 py-3 text-left text-xs font-medium text-neutral-500'>Location</th>
                <th className='px-4 py-3 text-left text-xs font-medium text-neutral-500'>Stage</th>
                <th className='px-4 py-3 text-left text-xs font-medium text-neutral-500'>Website</th>
                <th className='px-4 py-3 text-left text-xs font-medium text-neutral-500'>Outreach</th>
                <th className='px-4 py-3 text-left text-xs font-medium text-neutral-500'>Revenue</th>
                <th className='px-4 py-3 text-left text-xs font-medium text-neutral-500'></th>
              </tr>
            </thead>
            <tbody className='divide-y divide-zinc-100 dark:divide-zinc-800'>
              {loading && !data ? (
                <tr>
                  <td colSpan={8} className='px-4 py-8 text-center text-sm text-neutral-500'>
                    Loading…
                  </td>
                </tr>
              ) : prospects.length === 0 ? (
                <tr>
                  <td colSpan={8} className='px-4 py-8 text-center text-sm text-neutral-500'>
                    No prospects found.
                  </td>
                </tr>
              ) : (
                prospects.map((p) => (
                  <tr key={p.id} className='hover:bg-zinc-50 dark:hover:bg-zinc-800/50'>
                    {/* Business */}
                    <td className='px-4 py-3'>
                      <div className='font-medium text-sm leading-tight'>{p.business_name}</div>
                      {p.owner_name && (
                        <div className='text-xs text-neutral-400'>{p.owner_name}</div>
                      )}
                      {p.category && (
                        <div className='text-xs text-neutral-500 italic'>{p.category}</div>
                      )}
                      {p.google_rating && (
                        <div className='text-xs text-yellow-400'>
                          ★ {p.google_rating} ({p.google_reviews ?? 0})
                        </div>
                      )}
                    </td>

                    {/* Contact */}
                    <td className='px-4 py-3'>
                      <div className='flex flex-col gap-0.5'>
                        {p.phone && (
                          <a
                            href={`tel:${p.phone}`}
                            className='flex items-center gap-1 text-xs text-neutral-300 hover:text-white'
                          >
                            <IoCall className='h-3 w-3 shrink-0' />
                            {p.phone}
                          </a>
                        )}
                        {p.email && (
                          <a
                            href={`mailto:${p.email}`}
                            className='flex items-center gap-1 text-xs text-neutral-300 hover:text-white'
                          >
                            <IoMail className='h-3 w-3 shrink-0' />
                            {p.email}
                          </a>
                        )}
                        {p.facebook_url && p.facebook_url !== 'not found' && (
                          <a
                            href={p.facebook_url}
                            target='_blank'
                            rel='noopener noreferrer'
                            className='flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300'
                          >
                            <IoLogoFacebook className='h-3 w-3 shrink-0' />
                            Facebook
                          </a>
                        )}
                        {p.fwd_user_id && (
                          <a
                            href={`/admin/customers/${p.fwd_user_id}`}
                            className='flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300'
                          >
                            <IoGlobe className='h-3 w-3 shrink-0' />
                            FWD User
                          </a>
                        )}
                      </div>
                    </td>

                    {/* Location */}
                    <td className='px-4 py-3 text-sm text-neutral-400'>
                      {[p.city, p.state].filter(Boolean).join(', ') || '—'}
                    </td>

                    {/* Stage */}
                    <td className='px-4 py-3'>
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-xs font-medium',
                          STAGE_COLORS[p.prospect_stage]
                        )}
                      >
                        {STAGE_LABELS[p.prospect_stage]}
                      </span>
                    </td>

                    {/* Website */}
                    <td className='px-4 py-3'>
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-xs',
                          WEBSITE_STATUS_COLORS[p.website_status]
                        )}
                      >
                        {WEBSITE_STATUS_LABELS[p.website_status]}
                      </span>
                      {p.site_built && (
                        <div className='mt-0.5 text-xs text-emerald-400'>Site Built</div>
                      )}
                    </td>

                    {/* Outreach */}
                    <td className='px-4 py-3 text-xs text-neutral-400'>
                      <div>Emails: {p.follow_up_count}</div>
                      {p.link_clicked && <div className='text-cyan-400'>Link Clicked</div>}
                      {p.responded && <div className='text-yellow-400'>Responded</div>}
                      {p.last_follow_up_date && (
                        <div>Last: {new Date(p.last_follow_up_date).toLocaleDateString()}</div>
                      )}
                    </td>

                    {/* Revenue */}
                    <td className='px-4 py-3 text-xs text-neutral-400'>
                      {p.monthly_revenue ? (
                        <span className='text-emerald-400 font-medium'>
                          ${p.monthly_revenue}/mo
                        </span>
                      ) : (
                        '—'
                      )}
                      {p.hosting_plan && (
                        <div className='text-neutral-500'>{p.hosting_plan}</div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className='px-4 py-3'>
                      <div className='flex items-center gap-1'>
                        <Button
                          size='sm'
                          variant='outline'
                          onClick={() => setModal(p)}
                        >
                          <IoPencil className='h-3 w-3' />
                        </Button>
                        <Button
                          size='sm'
                          variant='outline'
                          disabled={deletingId === p.id}
                          onClick={() => handleDelete(p.id)}
                          className='text-red-400 hover:border-red-500 hover:text-red-400'
                        >
                          <IoTrash className='h-3 w-3' />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className='flex items-center justify-between'>
            <div className='text-sm text-neutral-400'>
              Page {pagination.page} of {pagination.totalPages}
            </div>
            <div className='flex items-center gap-2'>
              <Button
                size='sm'
                variant='outline'
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!pagination.hasPrev || loading}
              >
                Previous
              </Button>
              <Button
                size='sm'
                variant='outline'
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={!pagination.hasNext || loading}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal !== null && (
        <ProspectModal
          prospect={modal === 'add' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => fetchData({ search, stage: stageFilter, page })}
        />
      )}
    </>
  );
}
