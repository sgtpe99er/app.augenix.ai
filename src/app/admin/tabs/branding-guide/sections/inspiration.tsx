'use client';

import { useEffect, useMemo, useState } from 'react';
import { IoAdd, IoClose, IoOpenOutline } from 'react-icons/io5';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import type { BrandingGuideUnsavedActions } from '../index';
import { type BrandingGuideData } from '../types';

interface InspirationSectionProps {
  data: BrandingGuideData;
  onSave: (updates: Partial<BrandingGuideData>) => Promise<boolean>;
  onDirtyChange?: (dirty: boolean) => void;
  onRegisterUnsavedActions?: (actions: BrandingGuideUnsavedActions | null) => void;
}

export function InspirationSection({
  data,
  onSave,
  onDirtyChange,
  onRegisterUnsavedActions,
}: InspirationSectionProps) {
  const [inspirationUrls, setInspirationUrls] = useState<string[]>(data.inspirationUrls || []);
  const [inspirationNotes, setInspirationNotes] = useState(data.inspirationNotes);
  const [draftUrl, setDraftUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const initialData = useMemo(
    () => ({
      inspirationUrls: data.inspirationUrls || [],
      inspirationNotes: data.inspirationNotes,
    }),
    [data.inspirationNotes, data.inspirationUrls]
  );

  const isDirty =
    JSON.stringify({ inspirationUrls, inspirationNotes }) !== JSON.stringify(initialData);

  useEffect(() => {
    setInspirationUrls(initialData.inspirationUrls);
    setInspirationNotes(initialData.inspirationNotes);
  }, [initialData]);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const handleSave = async () => {
    if (!isDirty) return true;
    setSaving(true);
    try {
      return await onSave({ inspirationUrls, inspirationNotes });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    onRegisterUnsavedActions?.({
      save: handleSave,
      discard: () => {
        setInspirationUrls(initialData.inspirationUrls);
        setInspirationNotes(initialData.inspirationNotes);
      },
    });

    return () => onRegisterUnsavedActions?.(null);
  }, [initialData, inspirationNotes, inspirationUrls, isDirty, onRegisterUnsavedActions]);

  const addUrl = () => {
    const normalized = draftUrl.trim();
    if (!normalized) return;
    if (!inspirationUrls.includes(normalized)) {
      setInspirationUrls((prev) => [...prev, normalized]);
    }
    setDraftUrl('');
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-zinc-900 p-6">
        <h3 className="text-lg font-semibold text-white">Inspiration</h3>
        <p className="mt-1 text-sm text-neutral-400">Collect visual references and notes about what the customer likes.</p>

        <div className="mt-6">
          <Label htmlFor="inspirationUrl">Add Inspiration URL</Label>
          <div className="mt-2 flex gap-2">
            <Input
              id="inspirationUrl"
              value={draftUrl}
              onChange={(e) => setDraftUrl(e.target.value)}
              placeholder="https://example.com"
              className="flex-1"
            />
            <Button type="button" variant="outline" onClick={addUrl}>
              <IoAdd className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {inspirationUrls.length > 0 ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {inspirationUrls.map((url) => (
              <div key={url} className="rounded-xl bg-zinc-800 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">Reference</div>
                    <a href={url} target="_blank" rel="noopener noreferrer" className="mt-2 block truncate text-sm text-emerald-400 hover:underline">
                      {url}
                    </a>
                  </div>
                  <div className="flex gap-2">
                    <a href={url} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-zinc-900 p-2 text-neutral-300 hover:text-white">
                      <IoOpenOutline className="h-4 w-4" />
                    </a>
                    <button
                      type="button"
                      onClick={() => setInspirationUrls((prev) => prev.filter((item) => item !== url))}
                      className="rounded-lg bg-zinc-900 p-2 text-neutral-300 hover:text-red-400"
                    >
                      <IoClose className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <div className="mt-6">
          <Label htmlFor="inspirationNotes">Inspiration Notes</Label>
          <Textarea
            id="inspirationNotes"
            value={inspirationNotes}
            onChange={(e) => setInspirationNotes(e.target.value)}
            className="mt-2 min-h-[120px]"
            placeholder="What do you like about the references above? Layout? Colors? Typography? Energy?"
          />
        </div>
      </div>

      <div className="sticky bottom-0 z-10 mt-6 flex justify-center py-4">
        <Button
          onClick={() => {
            void handleSave();
          }}
          disabled={saving || !isDirty}
          className="min-w-[130px] bg-emerald-500 text-black shadow-lg shadow-black/30 hover:bg-emerald-400 disabled:bg-zinc-700 disabled:text-neutral-300 disabled:shadow-none disabled:opacity-100"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
