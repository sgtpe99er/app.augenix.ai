'use client';

import { useCallback, useEffect, useState } from 'react';
import DOMPurify from 'dompurify';
import {
  IoArrowBack,
  IoCheckmarkCircle,
  IoDownload,
  IoPencil,
  IoSparkles,
  IoTrashOutline,
} from 'react-icons/io5';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/utils/cn';

// ─── Types ────────────────────────────────────────────────────────────────────

interface GeneratedAsset {
  id: string;
  asset_type: string;
  storage_url: string | null;
  status: string;
  is_selected: boolean;
  feedback_round: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface GeneratedLogoReviewProps {
  businessId: string;
  apiBase?: string;
}

export function GeneratedLogoReview({ businessId, apiBase: apiBaseProp }: GeneratedLogoReviewProps) {
  const [logos, setLogos] = useState<GeneratedAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [winner, setWinner] = useState<GeneratedAsset | null>(null);
  const [confirmWinnerId, setConfirmWinnerId] = useState<string | null>(null);
  const [selectingWinner, setSelectingWinner] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // SVG inline rendering
  const [svgContents, setSvgContents] = useState<Record<string, string>>({});

  // Card flip edit state
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState<Record<string, string>>({});
  const [refiningId, setRefiningId] = useState<string | null>(null);

  const apiBase = apiBaseProp ?? `/api/admin/businesses/${businessId}`;

  // ── Fetch logos ──────────────────────────────────────────────────────────────

  const fetchLogos = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`${apiBase}/generated-assets`);
      if (!res.ok) throw new Error('Failed to load logos');
      const json = await res.json();
      const all: GeneratedAsset[] = (json.assets ?? []).filter(
        (a: GeneratedAsset) => a.asset_type === 'logo'
      );

      const existingWinner = all.find((a) => a.is_selected);
      if (existingWinner) setWinner(existingWinner);

      const hasGenerating = all.some((a) => a.status === 'generating');
      setGenerating(hasGenerating);
      setLogos(all);
    } catch (err) {
      console.error('[GeneratedLogoReview] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    if (businessId) void fetchLogos();
  }, [businessId, fetchLogos]);

  // ── Poll for new logos while generating ─────────────────────────────────────

  useEffect(() => {
    if (!generating) return;
    const interval = setInterval(() => void fetchLogos(true), 15000);
    return () => clearInterval(interval);
  }, [generating, fetchLogos]);

  // ── Fetch SVG contents for inline rendering ─────────────────────────────────

  useEffect(() => {
    const svgLogos = logos.filter(
      (l) => l.storage_url && l.status === 'ready' && getLogoFileFormat(l) === 'svg' && !svgContents[l.id]
    );
    for (const logo of svgLogos) {
      fetch(logo.storage_url!)
        .then((r) => r.text())
        .then((text) => {
          if (text.includes('<svg')) {
            setSvgContents((prev) => ({ ...prev, [logo.id]: text }));
          }
        })
        .catch(() => { /* fallback to img tag */ });
    }
  }, [logos, svgContents]);

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function getLogoFileFormat(logo: GeneratedAsset): string {
    const metaFormat = logo.metadata?.file_format as string | undefined;
    if (metaFormat) return metaFormat;
    const url = logo.storage_url ?? '';
    if (url.includes('.svg')) return 'svg';
    if (url.includes('.webp')) return 'webp';
    return 'png';
  }

  function handleDownload(logo: GeneratedAsset) {
    if (!logo.storage_url) return;
    const ext = getLogoFileFormat(logo);
    const filename = encodeURIComponent(`logo-${logo.id}.${ext}`);
    const url = encodeURIComponent(logo.storage_url);
    const a = document.createElement('a');
    a.href = `/api/admin/download?url=${url}&filename=${filename}`;
    a.download = `logo-${logo.id}.${ext}`;
    a.click();
  }

  // ── Logo Preview Component ──────────────────────────────────────────────────
  // SVG content is sanitized with DOMPurify (svg profile) before rendering

  function LogoPreview({ logo, className }: { logo: GeneratedAsset; className?: string }) {
    const isSvg = getLogoFileFormat(logo) === 'svg';
    const svgContent = svgContents[logo.id];

    if (isSvg && svgContent) {
      const sanitized = DOMPurify.sanitize(svgContent, {
        USE_PROFILES: { svg: true, svgFilters: true },
        ADD_TAGS: ['use'],
      });
      return (
        <div
          className={cn('flex h-full w-full items-center justify-center [&>svg]:h-full [&>svg]:max-h-full [&>svg]:w-full [&>svg]:max-w-full [&>svg]:object-contain', className)}
          dangerouslySetInnerHTML={{ __html: sanitized }}
        />
      );
    }

    if (logo.storage_url) {
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={logo.storage_url} alt='Generated logo' className={cn('max-h-full max-w-full object-contain', className)} />;
    }

    return <span className='text-xs text-neutral-700'>No preview</span>;
  }

  // ── Delete logo ─────────────────────────────────────────────────────────────

  async function handleDeleteLogo(assetId: string) {
    setDeletingId(assetId);
    try {
      const res = await fetch(`${apiBase}/generated-assets/${assetId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setLogos((prev) => prev.filter((l) => l.id !== assetId));
      toast({ description: 'Logo deleted.' });
    } catch (err) {
      console.error('[GeneratedLogoReview] delete error:', err);
      toast({ variant: 'destructive', description: 'Failed to delete logo.' });
    } finally {
      setDeletingId(null);
    }
  }

  // ── Refine logo ─────────────────────────────────────────────────────────────

  async function handleRefineLogo(assetId: string) {
    const notes = editNotes[assetId]?.trim();
    if (!notes) {
      toast({ variant: 'destructive', description: 'Please describe the changes you want.' });
      return;
    }

    setRefiningId(assetId);
    try {
      const res = await fetch(`${apiBase}/generated-assets/${assetId}/refine`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error((json as { error?: string }).error ?? 'Refinement failed');
      }

      toast({ description: 'Refined logo created! Check below.' });
      setEditingCardId(null);
      setEditNotes((prev) => ({ ...prev, [assetId]: '' }));
      await fetchLogos();
    } catch (err) {
      console.error('[GeneratedLogoReview] refine error:', err);
      toast({ variant: 'destructive', description: err instanceof Error ? err.message : 'Refinement failed.' });
    } finally {
      setRefiningId(null);
    }
  }

  // ── Reset & regenerate ───────────────────────────────────────────────────────

  async function handleResetLogos() {
    setResetting(true);
    try {
      const res = await fetch(`${apiBase}/generated-assets/reset-logos`, { method: 'POST' });
      if (!res.ok) throw new Error('Reset failed');
      toast({ description: 'Logos reset! New logos are being generated.' });
      setWinner(null);
      setConfirmReset(false);
      setSvgContents({});
      await fetchLogos();
    } catch (err) {
      console.error('[GeneratedLogoReview] reset error:', err);
      toast({ variant: 'destructive', description: 'Failed to reset logos. Please try again.' });
    } finally {
      setResetting(false);
    }
  }

  // ── Generate more logos ────────────────────────────────────────────────────

  async function handleGenerateMore() {
    setSubmitting(true);
    try {
      const payload = logos
        .filter((l) => !l.is_selected && l.status !== 'rejected')
        .map((logo) => ({ assetId: logo.id }));

      const res = await fetch(`${apiBase}/generated-assets/submit-all-feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedbacks: payload }),
      });

      if (!res.ok) throw new Error('Submission failed');
      toast({ description: 'Generating more logos...' });
      await fetchLogos();
    } catch (err) {
      console.error('[GeneratedLogoReview] submit error:', err);
      toast({ variant: 'destructive', description: 'Failed to generate. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  }

  // ── Select winner ─────────────────────────────────────────────────────────────

  async function handleSelectWinner(assetId: string) {
    setSelectingWinner(true);
    try {
      const res = await fetch(`${apiBase}/generated-assets/${assetId}/select-winner`, { method: 'POST' });
      if (!res.ok) throw new Error('Selection failed');
      const json = await res.json();
      const winnerAsset = logos.find((l) => l.id === assetId);
      if (winnerAsset) setWinner({ ...winnerAsset, ...(json.winner ?? {}) });
      await fetchLogos();
      setConfirmWinnerId(null);
      toast({ description: 'Logo selected! It will appear on your website.' });
    } catch (err) {
      console.error('[GeneratedLogoReview] select winner error:', err);
      toast({ variant: 'destructive', description: 'Failed to select logo. Please try again.' });
    } finally {
      setSelectingWinner(false);
    }
  }

  // ── Rendering ─────────────────────────────────────────────────────────────────

  const activeLogos = logos.filter((l) => l.asset_type === 'logo' && l.status !== 'rejected' && l.status !== 'generating');
  const hasLogos = activeLogos.length > 0 || logos.some((l) => l.status === 'generating');

  if (loading) {
    return (
      <div className='flex items-center justify-center py-12'>
        <div className='h-5 w-5 animate-spin rounded-full border-2 border-zinc-700 border-t-emerald-400' />
      </div>
    );
  }

  if (!hasLogos) {
    return (
      <div className='rounded-xl border border-dashed border-zinc-700 p-8 text-center'>
        <IoSparkles className='mx-auto mb-3 h-8 w-8 text-neutral-600' />
        <p className='mb-4 text-sm text-neutral-500'>No generated logos yet.</p>
        <Button onClick={handleResetLogos} disabled={resetting} variant='emerald' size='sm'>
          <IoSparkles className='mr-2 h-4 w-4' />
          {resetting ? 'Generating...' : 'Generate New Logos'}
        </Button>
      </div>
    );
  }

  if (activeLogos.length === 0 && generating) {
    return (
      <div className='space-y-4'>
        <h3 className='font-alt text-sm font-semibold text-white'>Generated Logos</h3>
        <div className='flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5'>
          <div className='h-4 w-4 flex-shrink-0 animate-spin rounded-full border-2 border-zinc-700 border-t-emerald-400' />
          <div>
            <p className='text-sm font-medium text-white'>Generating new logos...</p>
            <p className='mt-0.5 text-xs text-neutral-500'>This page will update automatically.</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Winner view ──────────────────────────────────────────────────────────────

  if (winner) {
    return (
      <div className='space-y-4'>
        <div className='flex items-center gap-2'>
          <IoCheckmarkCircle className='h-4 w-4 text-emerald-400' />
          <h3 className='font-alt text-sm font-semibold text-white'>Selected Logo</h3>
        </div>

        <div className='overflow-hidden rounded-xl border border-emerald-500/20 bg-zinc-900'>
          <div className='flex items-center justify-center bg-zinc-950 p-8'>
            <LogoPreview logo={winner} className='max-h-56' />
          </div>

          <div className='flex flex-wrap items-center gap-2 border-t border-zinc-800 px-4 py-3'>
            <span className='mr-auto text-xs font-medium text-emerald-400'>Active on website</span>
            {winner.storage_url && (
              <button
                type='button'
                onClick={() => handleDownload(winner)}
                className='flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-neutral-400 transition-colors hover:bg-zinc-800 hover:text-white'
              >
                <IoDownload className='h-3.5 w-3.5' />
                Download {getLogoFileFormat(winner).toUpperCase()}
              </button>
            )}
          </div>

          <div className='border-t border-zinc-800/50 px-4 py-2.5'>
            {confirmReset ? (
              <div className='flex items-center gap-3'>
                <p className='text-xs text-amber-300'>Delete all logos and start fresh?</p>
                <Button
                  size='sm'
                  onClick={handleResetLogos}
                  disabled={resetting}
                  className='h-6 bg-amber-500 px-2.5 text-[11px] text-black hover:bg-amber-400'
                >
                  {resetting ? 'Resetting...' : 'Yes, Reset'}
                </Button>
                <button onClick={() => setConfirmReset(false)} className='text-[11px] text-neutral-500 hover:text-neutral-300'>
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmReset(true)}
                className='text-[11px] text-neutral-600 transition-colors hover:text-neutral-400'
              >
                Start over with new logos
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Review grid ──────────────────────────────────────────────────────────────

  const roundNumber = activeLogos[0]?.feedback_round ?? 1;

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <div className='flex items-baseline gap-2'>
          <h3 className='font-alt text-sm font-semibold text-white'>Generated Logos</h3>
          {roundNumber > 1 && (
            <span className='rounded-full bg-zinc-800 px-2 py-0.5 text-[11px] text-neutral-500'>
              Round {roundNumber}
            </span>
          )}
        </div>
        <div className='flex items-center gap-3'>
          <span className='text-[11px] text-neutral-600'>
            {activeLogos.length} logo{activeLogos.length !== 1 ? 's' : ''}
          </span>
          {confirmReset ? (
            <div className='flex items-center gap-2'>
              <Button
                size='sm'
                onClick={handleResetLogos}
                disabled={resetting}
                className='h-6 bg-amber-500 px-2.5 text-[11px] text-black hover:bg-amber-400'
              >
                {resetting ? 'Resetting...' : 'Confirm'}
              </Button>
              <button onClick={() => setConfirmReset(false)} className='text-[11px] text-neutral-500 hover:text-neutral-300'>
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmReset(true)}
              className='text-[11px] text-neutral-600 transition-colors hover:text-neutral-400'
            >
              Start over
            </button>
          )}
        </div>
      </div>

      {generating && (
        <div className='flex items-center gap-3 rounded-lg border border-emerald-500/15 bg-emerald-500/5 px-4 py-3'>
          <div className='h-4 w-4 flex-shrink-0 animate-spin rounded-full border-2 border-zinc-700 border-t-emerald-400' />
          <p className='text-xs text-neutral-400'>
            New logos are being generated. This page will update automatically.
          </p>
        </div>
      )}

      <div className='grid gap-3 md:grid-cols-2 lg:grid-cols-3'>
        {activeLogos.map((logo) => {
          const isDeleting = deletingId === logo.id;
          const isEditing = editingCardId === logo.id;
          const isRefining = refiningId === logo.id;

          return (
            <div
              key={logo.id}
              className={cn(
                'group flex flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 transition-colors hover:border-zinc-700',
                isDeleting && 'pointer-events-none opacity-50'
              )}
            >
              {isEditing ? (
                <div className='flex flex-1 flex-col p-4'>
                  <div className='mb-3 flex items-center gap-2'>
                    <button
                      onClick={() => setEditingCardId(null)}
                      className='flex items-center gap-1 text-[11px] text-neutral-500 transition-colors hover:text-neutral-300'
                    >
                      <IoArrowBack className='h-3 w-3' />
                      Back
                    </button>
                    <span className='text-[11px] font-medium text-white'>Edit Logo</span>
                  </div>

                  <div className='mb-3 flex h-24 items-center justify-center rounded-lg bg-zinc-950 p-2'>
                    <LogoPreview logo={logo} className='max-h-20' />
                  </div>

                  <Textarea
                    value={editNotes[logo.id] ?? ''}
                    onChange={(e) => setEditNotes((prev) => ({ ...prev, [logo.id]: e.target.value }))}
                    placeholder='Describe changes... e.g. "make the icon larger, change blue to green"'
                    className='mb-3 min-h-[80px] flex-1 resize-none border-zinc-800 bg-zinc-950 text-xs text-white placeholder:text-neutral-700 focus:border-zinc-600'
                  />

                  <Button
                    onClick={() => handleRefineLogo(logo.id)}
                    disabled={isRefining || !editNotes[logo.id]?.trim()}
                    variant='emerald'
                    size='sm'
                    className='w-full'
                  >
                    {isRefining ? (
                      <>
                        <div className='mr-2 h-3 w-3 animate-spin rounded-full border border-white/30 border-t-white' />
                        Refining...
                      </>
                    ) : (
                      'Submit Changes'
                    )}
                  </Button>
                </div>
              ) : (
                <>
                  <div className='relative flex aspect-square items-center justify-center overflow-hidden bg-zinc-950 p-4'>
                    <LogoPreview logo={logo} />

                    <div className='absolute inset-0 flex items-center justify-center gap-2 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100'>
                      <button
                        type='button'
                        onClick={() => {
                          setEditingCardId(logo.id);
                          if (!editNotes[logo.id]) setEditNotes((prev) => ({ ...prev, [logo.id]: '' }));
                        }}
                        className='flex h-8 items-center gap-1.5 rounded-md border border-zinc-600 bg-zinc-800/90 px-3 text-[11px] font-medium text-white transition-colors hover:border-zinc-500 hover:bg-zinc-700'
                      >
                        <IoPencil className='h-3 w-3' />
                        Edit
                      </button>
                    </div>

                    <button
                      type='button'
                      onClick={() => handleDeleteLogo(logo.id)}
                      disabled={isDeleting}
                      className='absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-md border border-zinc-700/50 bg-zinc-900/90 text-neutral-500 opacity-0 backdrop-blur-sm transition-all hover:border-red-500/50 hover:bg-red-500/15 hover:text-red-400 group-hover:opacity-100'
                      title='Delete logo'
                    >
                      <IoTrashOutline className='h-3.5 w-3.5' />
                    </button>

                    {logo.metadata?.generation_type === 'refinement' && (
                      <span className='absolute left-2 top-2 rounded bg-blue-500/20 px-1.5 py-0.5 text-[10px] text-blue-400'>
                        Refined
                      </span>
                    )}
                  </div>

                  <div className='flex items-center gap-1 border-t border-zinc-800/50 px-2 py-2'>
                    {confirmWinnerId === logo.id ? (
                      <div className='flex flex-1 items-center gap-1.5 rounded-md bg-amber-500/10 px-2 py-1'>
                        <span className='flex-1 text-[11px] text-amber-300'>Confirm?</span>
                        <button
                          onClick={() => handleSelectWinner(logo.id)}
                          disabled={selectingWinner}
                          className='rounded px-1.5 py-0.5 text-[11px] font-medium text-amber-400 transition-colors hover:bg-amber-500/20'
                        >
                          {selectingWinner ? 'Saving...' : 'Yes'}
                        </button>
                        <button
                          onClick={() => setConfirmWinnerId(null)}
                          className='rounded px-1.5 py-0.5 text-[11px] text-neutral-500 transition-colors hover:text-neutral-300'
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmWinnerId(logo.id)}
                        className='flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-emerald-400 transition-colors hover:bg-emerald-500/10'
                      >
                        <IoCheckmarkCircle className='h-3 w-3' />
                        Use on Website
                      </button>
                    )}

                    <div className='flex-1' />

                    {logo.storage_url && (
                      <button
                        type='button'
                        onClick={() => handleDownload(logo)}
                        className='flex items-center gap-1 rounded-md px-2 py-1 text-neutral-600 transition-colors hover:bg-zinc-800 hover:text-neutral-400'
                        title={`Download ${getLogoFileFormat(logo).toUpperCase()}`}
                      >
                        <IoDownload className='h-3.5 w-3.5' />
                        <span className='text-[11px]'>{getLogoFileFormat(logo).toUpperCase()}</span>
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className='flex justify-end pt-2'>
        <Button onClick={handleGenerateMore} disabled={submitting} variant='emerald' size='sm'>
          <IoSparkles className='mr-1.5 h-3.5 w-3.5' />
          {submitting ? 'Generating...' : 'Generate More Logos'}
        </Button>
      </div>
    </div>
  );
}
