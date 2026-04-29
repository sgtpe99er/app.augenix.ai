'use client';

import { useCallback,useState } from 'react';
import { IoArrowForward,IoCheckmarkCircle, IoClose, IoCloudUpload, IoRefresh, IoTime } from 'react-icons/io5';

import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn';

interface Page {
  id: string;
  slug: string;
  title: string;
}

interface Edit {
  id: string;
  instruction: string;
  status: string;
  created_at: string;
  page_id: string;
}

interface CommandCenterProps {
  pages: Page[];
  orgId: string | null;
  editHistory: Edit[];
}

type Phase = 'input' | 'generating' | 'review';

interface ProposedChange {
  summary: string;
  sections: Array<{ id: string; type: string; action: string; preview: string }>;
}

const STATUS_STYLES: Record<string, string> = {
  approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  reverted: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
};

export function CommandCenter({ pages, orgId, editHistory }: CommandCenterProps) {
  const [selectedPage, setSelectedPage] = useState<string>(pages[0]?.id ?? '');
  const [instruction, setInstruction] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>('input');
  const [proposedChange, setProposedChange] = useState<ProposedChange | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedPageData = pages.find((p) => p.id === selectedPage);

  const handleGenerate = useCallback(async () => {
    if (!selectedPage || !instruction.trim()) return;
    setError(null);
    setPhase('generating');

    try {
      const formData = new FormData();
      formData.append('pageId', selectedPage);
      formData.append('instruction', instruction);
      if (orgId) formData.append('orgId', orgId);
      if (imageFile) formData.append('image', imageFile);

      const res = await fetch('/api/ai/command-center', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Failed to generate changes');
      }

      const data = await res.json();
      setProposedChange(data);
      setPhase('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setPhase('input');
    }
  }, [selectedPage, instruction, orgId, imageFile]);

  const handleApprove = useCallback(async () => {
    if (!proposedChange) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/ai/command-center/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageId: selectedPage,
          orgId,
          proposedContent: proposedChange,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Failed to publish changes');
      }

      setPhase('input');
      setInstruction('');
      setImageFile(null);
      setProposedChange(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  }, [proposedChange, selectedPage, orgId]);

  const handleReset = () => {
    setPhase('input');
    setProposedChange(null);
    setError(null);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-serif text-3xl font-normal tracking-tight text-on-surface lg:text-4xl">
          AI Command Center
        </h1>
        <p className="mt-2 text-on-surface-variant">
          Describe changes in plain English. AI generates the update, you review and approve.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        {/* Main panel */}
        <div className="space-y-6">
          {/* Page selector */}
          <div>
            <label htmlFor="page-select" className="mb-2 block text-sm font-medium text-on-surface">
              Select Page
            </label>
            <select
              id="page-select"
              value={selectedPage}
              onChange={(e) => setSelectedPage(e.target.value)}
              disabled={phase !== 'input'}
              className="w-full rounded-sm border border-outline-variant/20 bg-surface-container-lowest px-3 py-2.5 text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
            >
              {pages.length === 0 && <option value="">No pages available</option>}
              {pages.map((page) => (
                <option key={page.id} value={page.id}>
                  {page.title} ({page.slug})
                </option>
              ))}
            </select>
            {selectedPageData && (
              <a
                href={`/${selectedPageData.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1.5 inline-flex items-center gap-1 text-xs text-on-primary-container hover:underline"
              >
                Preview live page <IoArrowForward className="h-3 w-3" />
              </a>
            )}
          </div>

          {/* Input phase */}
          {phase === 'input' && (
            <div className="space-y-4">
              <div>
                <label htmlFor="instruction" className="mb-2 block text-sm font-medium text-on-surface">
                  What would you like to change?
                </label>
                <textarea
                  id="instruction"
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                  placeholder="e.g. Update the hero section to mention our new same-day delivery service..."
                  rows={4}
                  className="w-full resize-none rounded-sm border border-outline-variant/20 bg-surface-container-lowest px-3 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Image upload */}
              <div>
                <label className="mb-2 block text-sm font-medium text-on-surface">
                  Attach Image <span className="font-normal text-on-surface-variant">(optional)</span>
                </label>
                <label
                  className={cn(
                    'flex cursor-pointer items-center justify-center gap-2 rounded-sm border border-dashed border-outline-variant/40 bg-surface px-4 py-6 text-sm text-on-surface-variant transition-colors hover:border-on-primary-container hover:text-on-primary-container',
                    imageFile && 'border-on-primary-container bg-on-primary-container/5 text-on-primary-container'
                  )}
                >
                  <IoCloudUpload className="h-5 w-5" />
                  {imageFile ? imageFile.name : 'Click to upload or drag and drop'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                  />
                </label>
                {imageFile && (
                  <button
                    onClick={() => setImageFile(null)}
                    className="mt-1 text-xs text-on-surface-variant hover:text-destructive"
                  >
                    Remove image
                  </button>
                )}
              </div>

              {error && (
                <div className="rounded-sm bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <Button
                onClick={handleGenerate}
                disabled={!selectedPage || !instruction.trim()}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Generate Changes
              </Button>
            </div>
          )}

          {/* Generating phase */}
          {phase === 'generating' && (
            <div className="flex flex-col items-center justify-center rounded-sm bg-surface-container-lowest py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-on-primary-container border-t-transparent" />
              <p className="mt-4 text-sm font-medium text-on-surface">Generating changes...</p>
              <p className="mt-1 text-xs text-on-surface-variant">AI is analyzing your request and preparing a proposal.</p>
            </div>
          )}

          {/* Review phase */}
          {phase === 'review' && proposedChange && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="rounded-sm bg-surface-container-lowest p-6">
                <h3 className="text-sm font-medium text-on-surface">Change Summary</h3>
                <p className="mt-2 text-sm text-on-surface-variant">{proposedChange.summary}</p>
              </div>

              {/* Section changes */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-on-surface">Proposed Changes</h3>
                {proposedChange.sections.map((section) => (
                  <div key={section.id} className="rounded-sm border border-outline-variant/20 bg-surface-container-lowest p-4">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-medium',
                        section.action === 'added' && 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
                        section.action === 'modified' && 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
                        section.action === 'removed' && 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
                      )}>
                        {section.action}
                      </span>
                      <span className="text-xs text-on-surface-variant">{section.type}</span>
                    </div>
                    <p className="mt-2 text-sm text-on-surface">{section.preview}</p>
                  </div>
                ))}
              </div>

              {error && (
                <div className="rounded-sm bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleApprove}
                  disabled={isSubmitting}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <IoCheckmarkCircle className="mr-2 h-4 w-4" />
                  {isSubmitting ? 'Publishing...' : 'Approve & Publish'}
                </Button>
                <Button variant="outline" onClick={handleReset} disabled={isSubmitting}>
                  <IoRefresh className="mr-2 h-4 w-4" />
                  Request Revision
                </Button>
                <Button variant="ghost" onClick={handleReset} disabled={isSubmitting}>
                  <IoClose className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Edit history sidebar */}
        <div>
          <h3 className="text-sm font-medium text-on-surface">Edit History</h3>
          <div className="mt-3 space-y-2">
            {editHistory.length === 0 ? (
              <p className="text-sm text-on-surface-variant">No edits yet.</p>
            ) : (
              editHistory.map((edit) => (
                <div key={edit.id} className="rounded-sm bg-surface-container-lowest p-3">
                  <p className="truncate text-sm text-on-surface">{edit.instruction}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', STATUS_STYLES[edit.status] ?? STATUS_STYLES.pending)}>
                      {edit.status}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-on-surface-variant">
                      <IoTime className="h-3 w-3" />
                      {new Date(edit.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
