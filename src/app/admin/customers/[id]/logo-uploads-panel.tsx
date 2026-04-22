'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  IoAdd,
  IoCheckmark,
  IoChevronDown,
  IoCloudUpload,
  IoClose,
  IoColorPalette,
  IoDocument,
  IoDownload,
  IoEye,
  IoFolder,
  IoFolderOpen,
  IoImage,
  IoPencil,
  IoSync,
  IoText,
  IoTrash,
} from 'react-icons/io5';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface UploadedFile {
  id: string;
  title: string | null;
  notes: string;
  tags: string[];
  storageUrl: string | null;
  fileName: string | null;
  mimeType: string | null;
  createdAt: string;
  folderId: string | null;
  extractedBranding?: { colors: string[]; fonts: string[] } | null;
}

interface Folder {
  id: string;
  name: string;
  createdAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BASE_TAG_OPTIONS = [
  'logo',
  'services',
  'business card',
  'truck wrap',
  'team',
  'project photos',
  'equipment',
  'signage',
  'brochure',
  'social media',
];

function getPreviewType(mimeType: string | null) {
  if (!mimeType) return 'file';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType === 'application/pdf') return 'pdf';
  return 'file';
}

function formatTag(tag: string) {
  return tag
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function normalizeInput(raw: Record<string, unknown>): UploadedFile {
  const metadata = (raw.metadata as Record<string, unknown> | null) ?? {};
  const tags = Array.isArray(metadata.tags)
    ? (metadata.tags as unknown[]).map((t) => (typeof t === 'string' ? t.trim() : '')).filter(Boolean)
    : [];
  const extractedBranding = raw.extracted_branding as { colors: string[]; fonts: string[] } | null;
  return {
    id: String(raw.id),
    title: (raw.title as string | null) ?? null,
    notes: (raw.notes as string) ?? '',
    tags,
    storageUrl: (raw.storage_url as string | null) ?? null,
    fileName: (raw.file_name as string | null) ?? null,
    mimeType: (raw.mime_type as string | null) ?? null,
    createdAt: (raw.created_at as string) ?? '',
    folderId: (raw.folder_id as string | null) ?? null,
    extractedBranding: extractedBranding ?? null,
  };
}

function normalizeFolder(raw: Record<string, unknown>): Folder {
  return {
    id: String(raw.id),
    name: String(raw.name),
    createdAt: String(raw.created_at),
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

interface LogoUploadsPanelProps {
  customerId: string;
  apiBasePath?: string;
  downloadBasePath?: string;
}

export function LogoUploadsPanel({ customerId, apiBasePath, downloadBasePath }: LogoUploadsPanelProps) {
  const base = apiBasePath ?? `/api/admin/customers/${customerId}`;
  const downloadBase = downloadBasePath ?? '/api/admin';
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);

  // Upload state — supports multiple files
  const [uploadingInput, setUploadingInput] = useState(false);
  const [deletingInputId, setDeletingInputId] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showUploader, setShowUploader] = useState(false);
  const [queuedFiles, setQueuedFiles] = useState<File[]>([]);
  const [uploadNotes, setUploadNotes] = useState('');
  const [uploadFolderId, setUploadFolderId] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagQuery, setTagQuery] = useState('');
  const [showTagMenu, setShowTagMenu] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Add menu
  const [showAddMenu, setShowAddMenu] = useState(false);
  const addMenuRef = useRef<HTMLDivElement | null>(null);

  // Folder state
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [editFolderName, setEditFolderName] = useState('');
  const [savingFolder, setSavingFolder] = useState(false);
  const [deletingFolderId, setDeletingFolderId] = useState<string | null>(null);

  // File detail state
  const [viewingFile, setViewingFile] = useState<UploadedFile | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editTagQuery, setEditTagQuery] = useState('');
  const [showEditTagMenu, setShowEditTagMenu] = useState(false);
  const [editFolderId, setEditFolderId] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [extractingBranding, setExtractingBranding] = useState(false);
  const [editExtractedColors, setEditExtractedColors] = useState<string[]>([]);
  const [editExtractedFonts, setEditExtractedFonts] = useState<string[]>([]);

  // ── All tag options (preset + any custom tags already used) ──────────────

  const allTagOptions = useMemo(() => {
    const custom = files.flatMap((f) => f.tags).filter((t) => !BASE_TAG_OPTIONS.includes(t));
    const unique = Array.from(new Set([...BASE_TAG_OPTIONS, ...custom]));
    return unique;
  }, [files]);

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const [inputsRes, foldersRes] = await Promise.all([
        fetch(`${base}/inputs`),
        fetch(`${base}/input-folders`),
      ]);
      if (inputsRes.ok) {
        const json = await inputsRes.json();
        const raws: Record<string, unknown>[] = json.inputs ?? [];
        setFiles(raws.filter((r) => r.input_type === 'file' && r.storage_url).map(normalizeInput));
      }
      if (foldersRes.ok) {
        const json = await foldersRes.json();
        const raws: Record<string, unknown>[] = json.folders ?? [];
        setFolders(raws.map(normalizeFolder));
      }
    } catch (err) {
      console.error('[LogoUploadsPanel] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  // ── Add menu close on outside click ──────────────────────────────────────

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setShowAddMenu(false);
      }
    }
    if (showAddMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showAddMenu]);

  // ── Upload helpers ────────────────────────────────────────────────────────

  const resetUploadDraft = () => {
    setQueuedFiles([]);
    setUploadNotes('');
    setSelectedTags([]);
    setTagQuery('');
    setShowTagMenu(false);
    setIsDragOver(false);
  };

  const handleStartAddFile = () => {
    setUploadFolderId(activeFolderId);
    setShowUploader(true);
    setShowAddMenu(false);
  };

  const handleCancelUpload = () => {
    resetUploadDraft();
    setShowUploader(false);
  };

  const addFilesToQueue = (incoming: FileList | File[]) => {
    const arr = Array.from(incoming);
    setQueuedFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name + f.size));
      return [...prev, ...arr.filter((f) => !existing.has(f.name + f.size))];
    });
    setShowUploader(true);
    setUploadFolderId(activeFolderId);
  };

  const removeFromQueue = (index: number) => {
    setQueuedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleToggleTag = (tag: string) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
    setTagQuery('');
  };

  const handleToggleEditTag = (tag: string) => {
    setEditTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
    setEditTagQuery('');
  };

  const filteredTags = useMemo(() => {
    const q = tagQuery.trim().toLowerCase();
    const matches = allTagOptions.filter((t) => t.toLowerCase().includes(q) && !selectedTags.includes(t));
    if (!q || selectedTags.includes(q) || matches.some((t) => t.toLowerCase() === q)) return matches;
    return [q, ...matches];
  }, [selectedTags, tagQuery, allTagOptions]);

  const filteredEditTags = useMemo(() => {
    const q = editTagQuery.trim().toLowerCase();
    const matches = allTagOptions.filter((t) => t.toLowerCase().includes(q) && !editTags.includes(t));
    if (!q || editTags.includes(q) || matches.some((t) => t.toLowerCase() === q)) return matches;
    return [q, ...matches];
  }, [editTags, editTagQuery, allTagOptions]);

  const handleUploadFiles = async () => {
    if (queuedFiles.length === 0) return;
    setUploadingInput(true);
    let successCount = 0;
    let failCount = 0;

    for (const file of queuedFiles) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('notes', uploadNotes.trim());
        formData.append('tags', JSON.stringify(selectedTags));
        if (uploadFolderId) formData.append('folderId', uploadFolderId);

        const res = await fetch(`${base}/inputs`, { method: 'POST', body: formData });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error((json as { error?: string }).error || 'Upload failed');
        }
        successCount++;
      } catch (err: unknown) {
        failCount++;
        const msg = err instanceof Error ? err.message : 'Upload failed';
        console.error(`[LogoUploadsPanel] upload error for ${file.name}:`, msg);
      }
    }

    setUploadingInput(false);

    if (failCount === 0) {
      toast({ description: successCount === 1 ? 'File uploaded.' : `${successCount} files uploaded.` });
    } else if (successCount === 0) {
      toast({ variant: 'destructive', description: 'All uploads failed. Please try again.' });
    } else {
      toast({ description: `${successCount} uploaded, ${failCount} failed.` });
    }

    resetUploadDraft();
    setShowUploader(false);
    await refetch();
  };

  const handleDeleteInput = async (inputId: string) => {
    setDeletingInputId(inputId);
    try {
      const res = await fetch(`${base}/inputs/${inputId}`, { method: 'DELETE' });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error((json as { error?: string }).error || 'Delete failed');
      }
      await refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Delete failed';
      toast({ variant: 'destructive', description: msg });
    } finally {
      setDeletingInputId(null);
    }
  };

  // ── File detail ───────────────────────────────────────────────────────────

  const openFileDetail = (file: UploadedFile) => {
    setViewingFile(file);
    setEditNotes(file.notes);
    setEditTags([...file.tags]);
    setEditTagQuery('');
    setShowEditTagMenu(false);
    setEditFolderId(file.folderId);
    setEditExtractedColors(file.extractedBranding?.colors ?? []);
    setEditExtractedFonts(file.extractedBranding?.fonts ?? []);
  };

  const closeFileDetail = () => {
    setViewingFile(null);
    setEditNotes('');
    setEditTags([]);
    setEditTagQuery('');
    setShowEditTagMenu(false);
    setEditFolderId(null);
    setEditExtractedColors([]);
    setEditExtractedFonts([]);
  };

  const handleSaveFileEdit = async () => {
    if (!viewingFile) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`${base}/inputs/${viewingFile.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: editNotes.trim(), tags: editTags, folderId: editFolderId }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error((json as { error?: string }).error || 'Save failed');
      }
      closeFileDetail();
      await refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Save failed';
      toast({ variant: 'destructive', description: msg });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteFromDetail = async () => {
    if (!viewingFile) return;
    const fileId = viewingFile.id;
    closeFileDetail();
    await handleDeleteInput(fileId);
  };

  const handleExtractBranding = async () => {
    if (!viewingFile) return;
    setExtractingBranding(true);
    try {
      const res = await fetch(`${base}/inputs/${viewingFile.id}/extract-branding`, {
        method: 'POST',
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error((json as { error?: string }).error || 'Extraction failed');
      }
      const result = await res.json();
      setEditExtractedColors(result.extractedBranding?.colors ?? []);
      setEditExtractedFonts(result.extractedBranding?.fonts ?? []);
      toast({ description: 'Branding extracted!' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Extraction failed';
      toast({ variant: 'destructive', description: msg });
    } finally {
      setExtractingBranding(false);
    }
  };

  // ── Folder CRUD ───────────────────────────────────────────────────────────

  const handleCreateFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;
    setCreatingFolder(true);
    try {
      const res = await fetch(`${base}/input-folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error((json as { error?: string }).error || 'Failed to create folder');
      }
      setNewFolderName('');
      setShowNewFolderModal(false);
      await refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create folder';
      toast({ variant: 'destructive', description: msg });
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleRenameFolder = async () => {
    if (!editingFolder) return;
    const name = editFolderName.trim();
    if (!name) return;
    setSavingFolder(true);
    try {
      const res = await fetch(`${base}/input-folders/${editingFolder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error((json as { error?: string }).error || 'Rename failed');
      }
      setEditingFolder(null);
      setEditFolderName('');
      await refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Rename failed';
      toast({ variant: 'destructive', description: msg });
    } finally {
      setSavingFolder(false);
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    setDeletingFolderId(folderId);
    try {
      const res = await fetch(`${base}/input-folders/${folderId}`, { method: 'DELETE' });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error((json as { error?: string }).error || 'Delete failed');
      }
      if (activeFolderId === folderId) setActiveFolderId(null);
      await refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Delete failed';
      toast({ variant: 'destructive', description: msg });
    } finally {
      setDeletingFolderId(null);
    }
  };

  // ── Derived ───────────────────────────────────────────────────────────────

  const visibleFiles = activeFolderId
    ? files.filter((f) => f.folderId === activeFolderId)
    : files;

  const folderFileCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const f of files) {
      if (f.folderId) counts[f.folderId] = (counts[f.folderId] || 0) + 1;
    }
    return counts;
  }, [files]);


  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-700 border-t-emerald-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-zinc-900 p-6">
        <div className="flex flex-col gap-4 pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Brand Assets</h3>
            <p className="mt-1 text-sm text-neutral-400">Manually upload logos and brand files, organized into folders.</p>
          </div>
          <div className="relative" ref={addMenuRef}>
            <Button
              type="button"
              onClick={() => setShowAddMenu((prev) => !prev)}
              className="bg-emerald-500 text-black hover:bg-emerald-400"
            >
              <IoAdd className="mr-2 h-4 w-4" />
              Add
              <IoChevronDown className="ml-1.5 h-3.5 w-3.5" />
            </Button>
            {showAddMenu && (
              <div className="absolute right-0 top-full z-20 mt-1.5 w-44 overflow-hidden rounded-xl border border-zinc-700 bg-zinc-800 shadow-xl">
                <button
                  type="button"
                  onClick={handleStartAddFile}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-white transition-colors hover:bg-zinc-700"
                >
                  <IoCloudUpload className="h-4 w-4 text-emerald-400" />
                  Add File
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAddMenu(false); setShowNewFolderModal(true); }}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-white transition-colors hover:bg-zinc-700"
                >
                  <IoFolder className="h-4 w-4 text-amber-400" />
                  Add Folder
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Hidden multi-file input */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*,.pdf"
          multiple
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) addFilesToQueue(e.target.files);
            e.currentTarget.value = '';
          }}
          className="hidden"
        />

        {/* Folder tabs */}
        {folders.length > 0 && (
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveFolderId(null)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${activeFolderId === null ? 'bg-white/10 text-white' : 'text-neutral-400 hover:bg-white/5 hover:text-neutral-200'}`}
            >
              All
              <span className="ml-1 text-xs text-neutral-500">({files.length})</span>
            </button>
            {folders.map((folder) => (
              <div key={folder.id} className="group/folder relative inline-flex items-center">
                <button
                  type="button"
                  onClick={() => setActiveFolderId(activeFolderId === folder.id ? null : folder.id)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${activeFolderId === folder.id ? 'bg-amber-500/15 text-amber-300' : 'text-neutral-400 hover:bg-white/5 hover:text-neutral-200'}`}
                >
                  {activeFolderId === folder.id ? <IoFolderOpen className="h-4 w-4 text-amber-400" /> : <IoFolder className="h-4 w-4 text-amber-400/60" />}
                  {folder.name}
                  <span className="ml-1 text-xs text-neutral-500">({folderFileCounts[folder.id] || 0})</span>
                </button>
                <div className="ml-0.5 flex gap-0.5 opacity-0 transition-opacity group-hover/folder:opacity-100">
                  <button type="button" onClick={() => { setEditingFolder(folder); setEditFolderName(folder.name); }} className="rounded p-1 text-neutral-500 hover:bg-white/10 hover:text-white" title="Rename">
                    <IoPencil className="h-3 w-3" />
                  </button>
                  <button type="button" onClick={() => void handleDeleteFolder(folder.id)} disabled={deletingFolderId === folder.id} className="rounded p-1 text-neutral-500 hover:bg-red-500/10 hover:text-red-400" title="Delete">
                    <IoTrash className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {visibleFiles.length === 0 ? (
          <p className="text-sm text-neutral-400">
            {activeFolderId ? 'No files in this folder.' : 'No uploaded files yet. Click Add → Add File to upload.'}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {visibleFiles.map((file) => (
              <div key={file.id} className="group relative overflow-hidden rounded-xl bg-zinc-800 ring-1 ring-zinc-700">
                <button type="button" onClick={() => openFileDetail(file)} className="block w-full">
                  <div className="flex aspect-[4/3] w-full items-center justify-center bg-black/40">
                    {getPreviewType(file.mimeType) === 'image' ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={file.storageUrl || ''} alt={file.fileName || 'Preview'} className="h-full w-full object-contain transition-transform duration-200 group-hover:scale-[1.02]" />
                    ) : (
                      <div className="text-center text-xs font-medium text-neutral-200">
                        {getPreviewType(file.mimeType) === 'pdf' ? 'PDF' : 'FILE'}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2 p-3 text-left">
                    <div className="truncate text-sm font-medium text-white">{file.fileName || 'File'}</div>
                    {file.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {file.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="rounded-full bg-zinc-700 px-2 py-0.5 text-[11px] text-neutral-200">{formatTag(tag)}</span>
                        ))}
                      </div>
                    )}
                    {file.notes && <div className="line-clamp-2 text-xs text-neutral-300">{file.notes}</div>}
                  </div>
                </button>
                <div className="absolute right-2 top-2 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => openFileDetail(file)}>
                    <IoEye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      const filename = encodeURIComponent(file.fileName || 'download');
                      const url = encodeURIComponent(file.storageUrl || '');
                      const a = document.createElement('a');
                      a.href = `${downloadBase}/download?url=${url}&filename=${filename}`;
                      a.download = file.fileName || 'download';
                      a.click();
                    }}
                  >
                    <IoDownload className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploader
        ? createPortal(
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm dark:bg-black/70"
              onClick={(e) => { if (e.target === e.currentTarget) handleCancelUpload(); }}
            >
              <div className="relative w-full max-w-2xl rounded-xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
                <button
                  type="button"
                  onClick={handleCancelUpload}
                  className="absolute right-4 top-4 rounded-lg p-1.5 text-neutral-500 transition-colors hover:bg-zinc-100 hover:text-black dark:text-neutral-400 dark:hover:bg-zinc-800 dark:hover:text-white"
                >
                  <IoClose className="h-5 w-5" />
                </button>

                <h3 className="mb-5 text-lg font-semibold text-black dark:text-white">
                  Add Files
                  {uploadFolderId && folders.find((f) => f.id === uploadFolderId) && (
                    <span className="ml-2 text-sm font-normal text-neutral-500 dark:text-neutral-400">
                      to {folders.find((f) => f.id === uploadFolderId)!.name}
                    </span>
                  )}
                </h3>

                {/* Drop zone — always visible, allows adding more files */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => fileRef.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileRef.current?.click(); }
                  }}
                  onDragOver={(e) => { e.preventDefault(); if (!uploadingInput) setIsDragOver(true); }}
                  onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOver(false);
                    if (uploadingInput) return;
                    if (e.dataTransfer.files.length > 0) addFilesToQueue(e.dataTransfer.files);
                  }}
                  className={`flex min-h-[140px] w-full flex-col items-center justify-center rounded-xl border border-dashed px-6 py-8 text-sm transition-colors ${
                    uploadingInput
                      ? 'cursor-not-allowed border-zinc-300 bg-zinc-50 text-neutral-400 dark:border-zinc-700 dark:bg-zinc-950/60 dark:text-neutral-500'
                      : isDragOver
                        ? 'cursor-pointer border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200'
                        : 'cursor-pointer border-zinc-300 bg-zinc-50 text-neutral-600 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-950/60 dark:text-neutral-300 dark:hover:border-zinc-600'
                  }`}
                >
                  <IoCloudUpload className="mb-2 h-7 w-7" />
                  <div className="text-sm font-medium">
                    {queuedFiles.length === 0 ? 'Drag files here, or click to choose' : 'Drop more files, or click to add'}
                  </div>
                  <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">PNG, JPG, WEBP, PDF — multiple files supported</div>
                </div>

                {/* Queued files list */}
                {queuedFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                      {queuedFiles.length} file{queuedFiles.length !== 1 ? 's' : ''} queued
                    </p>
                    <div className="max-h-36 space-y-1.5 overflow-y-auto">
                      {queuedFiles.map((f, i) => (
                        <div key={i} className="flex items-center justify-between gap-3 rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-800">
                          <div className="flex min-w-0 items-center gap-2">
                            {f.type.startsWith('image/') ? (
                              <IoImage className="h-4 w-4 shrink-0 text-emerald-500" />
                            ) : (
                              <IoDocument className="h-4 w-4 shrink-0 text-blue-400" />
                            )}
                            <span className="truncate text-sm text-black dark:text-white">{f.name}</span>
                            <span className="shrink-0 text-xs text-neutral-500">{(f.size / 1024).toFixed(0)} KB</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFromQueue(i)}
                            disabled={uploadingInput}
                            className="shrink-0 rounded p-0.5 text-neutral-400 hover:bg-zinc-200 hover:text-red-500 dark:hover:bg-zinc-700"
                          >
                            <IoClose className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Shared notes, tags, folder — shown once files are queued */}
                {queuedFiles.length > 0 && (
                  <div className="mt-4 space-y-4">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-black dark:text-white">
                        Notes {queuedFiles.length > 1 && <span className="font-normal text-neutral-500">(applied to all)</span>}
                      </p>
                      <Textarea
                        value={uploadNotes}
                        onChange={(e) => setUploadNotes(e.target.value)}
                        placeholder="Add context about how these files should be used"
                        className="min-h-[70px]"
                        disabled={uploadingInput}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-black dark:text-white">
                          Tags {queuedFiles.length > 1 && <span className="font-normal text-neutral-500">(applied to all)</span>}
                        </p>
                        <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowTagMenu((p) => !p)}>
                          <IoAdd className="mr-1 h-3.5 w-3.5" />
                          Add Tag
                        </Button>
                      </div>
                      {selectedTags.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {selectedTags.map((tag) => (
                            <span key={tag} className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                              {formatTag(tag)}
                              <button type="button" onClick={() => handleToggleTag(tag)} className="text-emerald-600 hover:text-emerald-800 dark:text-emerald-200 dark:hover:text-white">
                                <IoClose className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-neutral-500">No tags selected</p>
                      )}
                      {showTagMenu && (
                        <div className="space-y-2 pt-1">
                          <Input value={tagQuery} onChange={(e) => setTagQuery(e.target.value)} placeholder="Search or create a tag" className="h-8 text-sm" />
                          <div className="max-h-32 space-y-0.5 overflow-y-auto">
                            {filteredTags.length > 0 ? (
                              filteredTags.map((tag) => (
                                <button
                                  key={tag}
                                  type="button"
                                  onClick={() => handleToggleTag(tag)}
                                  className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm text-neutral-700 transition-colors hover:bg-zinc-100 dark:text-neutral-200 dark:hover:bg-zinc-800"
                                >
                                  <span>{formatTag(tag)}{!BASE_TAG_OPTIONS.includes(tag) && !files.flatMap(f => f.tags).includes(tag) ? ' (new)' : ''}</span>
                                  <IoCheckmark className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                                </button>
                              ))
                            ) : (
                              <p className="px-2 py-1.5 text-sm text-neutral-500">No matching tags</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {folders.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-black dark:text-white">Folder</p>
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            onClick={() => setUploadFolderId(null)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                              !uploadFolderId
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                : 'bg-zinc-100 text-neutral-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-neutral-300 dark:hover:bg-zinc-700'
                            }`}
                          >
                            No folder
                          </button>
                          {folders.map((folder) => (
                            <button
                              key={folder.id}
                              type="button"
                              onClick={() => setUploadFolderId(folder.id)}
                              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                                uploadFolderId === folder.id
                                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                  : 'bg-zinc-100 text-neutral-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-neutral-300 dark:hover:bg-zinc-700'
                              }`}
                            >
                              <IoFolder className="h-3.5 w-3.5" />
                              {folder.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-700">
                      <Button type="button" variant="outline" onClick={handleCancelUpload} disabled={uploadingInput}>Cancel</Button>
                      <Button
                        type="button"
                        onClick={() => void handleUploadFiles()}
                        disabled={uploadingInput || queuedFiles.length === 0}
                        className="bg-emerald-500 text-black hover:bg-emerald-400 disabled:bg-zinc-200 disabled:text-neutral-400 disabled:opacity-100 dark:disabled:bg-zinc-800 dark:disabled:text-neutral-300"
                      >
                        {uploadingInput
                          ? 'Uploading…'
                          : queuedFiles.length === 1
                            ? 'Upload File'
                            : `Upload ${queuedFiles.length} Files`}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>,
            document.body
          )
        : null}

      {/* New Folder Modal */}
      {showNewFolderModal
        ? createPortal(
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
              onClick={(e) => { if (e.target === e.currentTarget) { setShowNewFolderModal(false); setNewFolderName(''); } }}
            >
              <div className="relative w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
                <button
                  type="button"
                  onClick={() => { setShowNewFolderModal(false); setNewFolderName(''); }}
                  className="absolute right-4 top-4 rounded-lg p-1.5 text-neutral-500 transition-colors hover:bg-zinc-100 hover:text-black dark:text-neutral-400 dark:hover:bg-zinc-800 dark:hover:text-white"
                >
                  <IoClose className="h-5 w-5" />
                </button>
                <h3 className="mb-4 text-lg font-semibold text-black dark:text-white">New Folder</h3>
                <Input
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Folder name"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter' && newFolderName.trim()) void handleCreateFolder(); }}
                />
                <div className="mt-4 flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => { setShowNewFolderModal(false); setNewFolderName(''); }} disabled={creatingFolder}>Cancel</Button>
                  <Button type="button" onClick={() => void handleCreateFolder()} disabled={creatingFolder || !newFolderName.trim()} className="bg-emerald-500 text-black hover:bg-emerald-400">
                    {creatingFolder ? 'Creating...' : 'Create Folder'}
                  </Button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}

      {/* Rename Folder Modal */}
      {editingFolder
        ? createPortal(
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
              onClick={(e) => { if (e.target === e.currentTarget) { setEditingFolder(null); setEditFolderName(''); } }}
            >
              <div className="relative w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
                <button
                  type="button"
                  onClick={() => { setEditingFolder(null); setEditFolderName(''); }}
                  className="absolute right-4 top-4 rounded-lg p-1.5 text-neutral-500 transition-colors hover:bg-zinc-100 hover:text-black dark:text-neutral-400 dark:hover:bg-zinc-800 dark:hover:text-white"
                >
                  <IoClose className="h-5 w-5" />
                </button>
                <h3 className="mb-4 text-lg font-semibold text-black dark:text-white">Rename Folder</h3>
                <Input
                  value={editFolderName}
                  onChange={(e) => setEditFolderName(e.target.value)}
                  placeholder="Folder name"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter' && editFolderName.trim()) void handleRenameFolder(); }}
                />
                <div className="mt-4 flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => { setEditingFolder(null); setEditFolderName(''); }} disabled={savingFolder}>Cancel</Button>
                  <Button type="button" onClick={() => void handleRenameFolder()} disabled={savingFolder || !editFolderName.trim()} className="bg-emerald-500 text-black hover:bg-emerald-400">
                    {savingFolder ? 'Saving...' : 'Rename'}
                  </Button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}

      {/* File Detail Modal */}
      {viewingFile
        ? createPortal(
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 dark:bg-black/70"
              onClick={(e) => { if (e.target === e.currentTarget) closeFileDetail(); }}
            >
              <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
                <button
                  type="button"
                  onClick={closeFileDetail}
                  className="absolute right-4 top-4 rounded-lg p-1.5 text-neutral-500 transition-colors hover:bg-zinc-100 hover:text-black dark:text-neutral-400 dark:hover:bg-zinc-800 dark:hover:text-white"
                >
                  <IoClose className="h-5 w-5" />
                </button>
                <h3 className="mb-5 text-lg font-semibold text-black dark:text-white">{viewingFile.fileName || 'File'}</h3>

                <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                  <div className="space-y-4">
                    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/70">
                      {getPreviewType(viewingFile.mimeType) === 'image' ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={viewingFile.storageUrl || ''} alt={viewingFile.fileName || 'Preview'} className="max-h-[400px] w-full object-contain" />
                      ) : (
                        <div className="flex h-48 items-center justify-center">
                          <div className="text-center">
                            <IoImage className="mx-auto mb-2 h-10 w-10 text-neutral-400" />
                            <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
                              {viewingFile.mimeType === 'application/pdf' ? 'PDF Document' : 'File'}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3 rounded-xl bg-zinc-50 p-4 ring-1 ring-zinc-200 dark:bg-zinc-950/60 dark:ring-zinc-800">
                      <p className="text-sm font-medium text-black dark:text-white">Notes</p>
                      <Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="Add context about this file" className="min-h-[100px]" disabled={savingEdit} />
                    </div>
                  </div>

                  <div className="space-y-4">
                    {folders.length > 0 && (
                      <div className="space-y-3 rounded-xl bg-zinc-50 p-4 ring-1 ring-zinc-200 dark:bg-zinc-950/60 dark:ring-zinc-800">
                        <p className="text-sm font-medium text-black dark:text-white">Folder</p>
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditFolderId(null)}
                            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                              !editFolderId
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                : 'bg-zinc-200 text-neutral-600 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-neutral-300 dark:hover:bg-zinc-600'
                            }`}
                          >
                            None
                          </button>
                          {folders.map((folder) => (
                            <button
                              key={folder.id}
                              type="button"
                              onClick={() => setEditFolderId(folder.id)}
                              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                                editFolderId === folder.id
                                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                                  : 'bg-zinc-200 text-neutral-600 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-neutral-300 dark:hover:bg-zinc-600'
                              }`}
                            >
                              <IoFolder className="h-3 w-3" />
                              {folder.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-3 rounded-xl bg-zinc-50 p-4 ring-1 ring-zinc-200 dark:bg-zinc-950/60 dark:ring-zinc-800">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-black dark:text-white">Tags</p>
                        <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => setShowEditTagMenu((p) => !p)}>
                          <IoAdd className="mr-1 h-4 w-4" />
                          Tag
                          <IoChevronDown className="ml-1 h-4 w-4" />
                        </Button>
                      </div>
                      {editTags.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {editTags.map((tag) => (
                            <span key={tag} className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                              {formatTag(tag)}
                              <button type="button" onClick={() => handleToggleEditTag(tag)} className="text-emerald-600 hover:text-emerald-800 dark:text-emerald-200 dark:hover:text-white">
                                <IoClose className="h-3.5 w-3.5" />
                              </button>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-neutral-500">No tags assigned.</p>
                      )}
                      {showEditTagMenu && (
                        <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
                          <Input value={editTagQuery} onChange={(e) => setEditTagQuery(e.target.value)} placeholder="Search or create a tag" />
                          <div className="max-h-40 space-y-1 overflow-y-auto">
                            {filteredEditTags.length > 0 ? (
                              filteredEditTags.map((tag) => (
                                <button
                                  key={tag}
                                  type="button"
                                  onClick={() => handleToggleEditTag(tag)}
                                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-neutral-700 transition-colors hover:bg-zinc-100 dark:text-neutral-200 dark:hover:bg-zinc-800"
                                >
                                  <span>{formatTag(tag)}</span>
                                  <IoCheckmark className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                                </button>
                              ))
                            ) : (
                              <p className="px-3 py-2 text-sm text-neutral-500">No matching tags</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="rounded-xl bg-zinc-50 p-4 ring-1 ring-zinc-200 dark:bg-zinc-950/60 dark:ring-zinc-800">
                      <p className="mb-2 text-xs text-neutral-500">File info</p>
                      <p className="truncate text-sm text-black dark:text-white">{viewingFile.fileName}</p>
                      <p className="text-xs text-neutral-500">{viewingFile.mimeType || 'Unknown type'}</p>
                    </div>

                    {getPreviewType(viewingFile.mimeType) === 'image' && (
                      <div className="space-y-3 rounded-xl bg-zinc-50 p-4 ring-1 ring-zinc-200 dark:bg-zinc-950/60 dark:ring-zinc-800">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium text-black dark:text-white">Extracted Branding</p>
                          <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => void handleExtractBranding()} disabled={extractingBranding || savingEdit}>
                            {extractingBranding ? <IoSync className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
                            {extractingBranding ? 'Extracting...' : editExtractedColors.length > 0 || editExtractedFonts.length > 0 ? 'Re-extract' : 'Extract'}
                          </Button>
                        </div>
                        {(editExtractedColors.length > 0 || editExtractedFonts.length > 0) ? (
                          <div className="space-y-3">
                            {editExtractedColors.length > 0 && (
                              <div>
                                <p className="mb-1.5 flex items-center gap-1.5 text-xs text-neutral-500">
                                  <IoColorPalette className="h-3.5 w-3.5" /> Colors
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                  {editExtractedColors.map((color) => (
                                    <span key={color} className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-xs dark:border-zinc-700 dark:bg-zinc-800">
                                      <span className="h-3 w-3 rounded-full ring-1 ring-black/10" style={{ backgroundColor: color }} />
                                      <span className="text-black dark:text-white">{color}</span>
                                      <button type="button" onClick={() => setEditExtractedColors((c) => c.filter((x) => x !== color))} className="text-neutral-400 hover:text-red-500">
                                        <IoClose className="h-3 w-3" />
                                      </button>
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {editExtractedFonts.length > 0 && (
                              <div>
                                <p className="mb-1.5 flex items-center gap-1.5 text-xs text-neutral-500">
                                  <IoText className="h-3.5 w-3.5" /> Fonts
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                  {editExtractedFonts.map((font) => (
                                    <span key={font} className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-xs dark:border-zinc-700 dark:bg-zinc-800">
                                      <span className="text-black dark:text-white">{font}</span>
                                      <button type="button" onClick={() => setEditExtractedFonts((f) => f.filter((x) => x !== font))} className="text-neutral-400 hover:text-red-500">
                                        <IoClose className="h-3 w-3" />
                                      </button>
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-neutral-500">Use AI to extract colors and fonts from this image.</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-zinc-200 pt-4 dark:border-zinc-800">
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
                      onClick={() => void handleDeleteFromDetail()}
                      disabled={savingEdit || deletingInputId === viewingFile.id}
                    >
                      {deletingInputId === viewingFile.id ? 'Deleting...' : 'Delete'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const filename = encodeURIComponent(viewingFile.fileName || 'download');
                        const url = encodeURIComponent(viewingFile.storageUrl || '');
                        const a = document.createElement('a');
                        a.href = `${downloadBase}/download?url=${url}&filename=${filename}`;
                        a.download = viewingFile.fileName || 'download';
                        a.click();
                      }}
                    >
                      <IoDownload className="mr-1.5 h-4 w-4" />
                      Download
                    </Button>
                  </div>
                  <div className="flex gap-3">
                    <Button type="button" variant="outline" onClick={closeFileDetail} disabled={savingEdit}>Cancel</Button>
                    <Button type="button" onClick={() => void handleSaveFileEdit()} disabled={savingEdit} className="bg-emerald-500 text-black hover:bg-emerald-400">
                      {savingEdit ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
