'use client';

import { useRef, useState } from 'react';
import { useOnboarding } from '../context';
import { IntakeAsset, OnboardingAssetTag } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { IoInformationCircle, IoCloudUpload, IoClose, IoLink, IoDocumentText } from 'react-icons/io5';

const ASSET_TAG_OPTIONS: Array<{ value: OnboardingAssetTag; label: string }> = [
  { value: 'logo', label: 'Logo' },
  { value: 'business_card', label: 'Business card' },
  { value: 'flyer', label: 'Flyer' },
  { value: 'brochure', label: 'Brochure' },
  { value: 'menu', label: 'Menu' },
  { value: 'truck_wrap', label: 'Truck wrap' },
  { value: 'signage', label: 'Signage' },
  { value: 'project_photo', label: 'Project photo' },
  { value: 'team_photo', label: 'Team photo' },
  { value: 'storefront', label: 'Storefront' },
  { value: 'inspiration', label: 'Inspiration' },
  { value: 'old_website_screenshot', label: 'Old website screenshot' },
  { value: 'current_branding', label: 'Current branding' },
  { value: 'reference_only', label: 'Reference only' },
  { value: 'other', label: 'Other' },
];

function UploadDropzone({
  onUpload,
  uploading,
}: {
  onUpload: (file: File) => void;
  uploading: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFiles = (fileList: FileList | null) => {
    if (fileList) {
      Array.from(fileList).forEach((file) => onUpload(file));
    }
  };

  return (
    <div className='rounded-lg border border-border p-4'>
      <div className='mb-3 flex items-start gap-3'>
        <IoCloudUpload className='mt-0.5 h-5 w-5 text-muted-foreground' />
        <div>
          <p className='font-medium'>Upload files</p>
          <p className='text-xs text-muted-foreground'>Add any logos, photos, menus, brochures, screenshots, or brand references.</p>
        </div>
      </div>

      <input
        ref={fileRef}
        type='file'
        accept='image/*,.pdf,.doc,.docx'
        multiple
        onChange={(e) => {
          handleFiles(e.target.files);
          e.currentTarget.value = '';
        }}
        className='hidden'
      />
      <div
        role='button'
        tabIndex={0}
        onClick={() => fileRef.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileRef.current?.click(); } }}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed p-3 text-xs transition-colors ${
          isDragOver ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground'
        } ${uploading ? 'pointer-events-none opacity-50' : ''}`}
      >
        <IoCloudUpload className='h-4 w-4' />
        {uploading ? 'Uploading…' : 'Drop files or click to upload'}
      </div>
    </div>
  );
}

function isImageAsset(asset: IntakeAsset) {
  return asset.mimeType.startsWith('image/') || asset.storageUrl.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i);
}

function AssetCard({
  asset,
  onRemove,
  onUpdate,
}: {
  asset: IntakeAsset;
  onRemove: (assetId: string) => void;
  onUpdate: (assetId: string, updates: Partial<IntakeAsset>) => void;
}) {
  const toggleTag = (tag: OnboardingAssetTag) => {
    const nextTags = asset.tags.includes(tag)
      ? asset.tags.filter((value) => value !== tag)
      : [...asset.tags, tag];
    onUpdate(asset.id, { tags: nextTags });
  };

  return (
    <div className='rounded-xl border border-border bg-muted/30 p-4'>
      <div className='flex items-start justify-between gap-4'>
        <div className='flex min-w-0 items-center gap-3'>
          <div className='flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-background'>
            {isImageAsset(asset) && asset.storageUrl ? (
              <img src={asset.storageUrl} alt={asset.title || asset.fileName || 'Asset preview'} className='h-full w-full object-cover' />
            ) : asset.inputType === 'url' ? (
              <IoLink className='h-5 w-5 text-muted-foreground' />
            ) : (
              <IoDocumentText className='h-5 w-5 text-muted-foreground' />
            )}
          </div>
          <div className='min-w-0'>
            <p className='truncate font-medium'>{asset.title || asset.fileName || asset.sourceUrl || 'Untitled asset'}</p>
            <p className='truncate text-xs text-muted-foreground'>
              {asset.inputType === 'url' ? asset.sourceUrl : asset.fileName || asset.storageUrl}
            </p>
          </div>
        </div>
        <button
          type='button'
          onClick={() => onRemove(asset.id)}
          className='rounded-full p-1 text-muted-foreground transition-colors hover:text-foreground'
        >
          <IoClose className='h-4 w-4' />
        </button>
      </div>

      <div className='mt-4 grid gap-4 lg:grid-cols-[1fr,1fr]'>
        <div className='space-y-2'>
          <Label>Title</Label>
          <Input
            value={asset.title}
            onChange={(event) => onUpdate(asset.id, { title: event.target.value })}
            placeholder='Describe what this asset is'
          />
        </div>
        <div className='space-y-2'>
          <Label>Notes</Label>
          <Textarea
            value={asset.notes}
            onChange={(event) => onUpdate(asset.id, { notes: event.target.value })}
            placeholder='Add any context for how we should use this'
            rows={3}
          />
        </div>
      </div>

      <div className='mt-4'>
        <Label>Tags</Label>
        <div className='mt-2 flex flex-wrap gap-2'>
          {ASSET_TAG_OPTIONS.map((option) => {
            const selected = asset.tags.includes(option.value);
            return (
              <button
                key={option.value}
                type='button'
                onClick={() => toggleTag(option.value)}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                  selected
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                    : 'border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function Step5Content() {
  const { data, updateStep5, setCurrentStep, saveStep, saving, saveError } = useOnboarding();
  const { step2, step5 } = data;
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [newUrl, setNewUrl] = useState('');

  const handleUpload = async (file: File) => {
    setUploading(true);
    setUploadError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', 'brand-intake');
      const res = await fetch('/api/onboarding/upload-content', { method: 'POST', body: formData });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Upload failed');

      const lowerName = file.name.toLowerCase();
      const guessedTags: OnboardingAssetTag[] =
        lowerName.includes('logo')
          ? ['logo']
          : file.type.startsWith('image/')
            ? ['project_photo']
            : ['other'];

      const nextAsset: IntakeAsset = {
        id: json.id,
        inputType: 'file',
        title: file.name.replace(/\.[^.]+$/, ''),
        notes: '',
        tags: guessedTags,
        sourceUrl: '',
        storageUrl: json.url,
        storagePath: json.storagePath || '',
        fileName: json.filename || file.name,
        mimeType: json.mimeType || file.type || '',
        metadata: {
          category: json.category || 'brand-intake',
          size: file.size,
        },
      };

      updateStep5({
        uploadedAssets: [...(step5.uploadedAssets || []), nextAsset],
      });
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = (assetId: string) => {
    const assetToRemove = (step5.uploadedAssets || []).find((asset) => asset.id === assetId);
    updateStep5({
      uploadedAssets: (step5.uploadedAssets || []).filter((asset) => asset.id !== assetId),
      websiteInspirationUrls:
        assetToRemove?.inputType === 'url' && assetToRemove.sourceUrl
          ? (step5.websiteInspirationUrls || []).filter((url) => url !== assetToRemove.sourceUrl)
          : step5.websiteInspirationUrls,
    });
  };

  const handleUpdateAsset = (assetId: string, updates: Partial<IntakeAsset>) => {
    updateStep5({
      uploadedAssets: (step5.uploadedAssets || []).map((asset) =>
        asset.id === assetId ? { ...asset, ...updates } : asset
      ),
    });
  };

  const handleAddUrl = () => {
    const trimmed = newUrl.trim();
    if (!trimmed) return;

    const alreadyExists = (step5.websiteInspirationUrls || []).includes(trimmed);
    if (alreadyExists) {
      setNewUrl('');
      return;
    }

    const nextUrls = [...(step5.websiteInspirationUrls || []), trimmed];
    const nextUrlAsset: IntakeAsset = {
      id: crypto.randomUUID(),
      inputType: 'url',
      title: trimmed,
      notes: '',
      tags: ['inspiration'],
      sourceUrl: trimmed,
      storageUrl: '',
      storagePath: '',
      fileName: '',
      mimeType: 'text/url',
      metadata: {
        category: 'website_inspiration',
      },
    };
    const nextAssets = [
      ...(step5.uploadedAssets || []),
      nextUrlAsset,
    ];

    updateStep5({
      websiteInspirationUrls: nextUrls,
      uploadedAssets: nextAssets,
    });
    setNewUrl('');
  };

  const handleRemoveUrl = (url: string) => {
    updateStep5({
      websiteInspirationUrls: (step5.websiteInspirationUrls || []).filter((value) => value !== url),
      uploadedAssets: (step5.uploadedAssets || []).filter(
        (asset) => !(asset.inputType === 'url' && asset.sourceUrl === url)
      ),
    });
  };

  const handleNext = async () => {
    await saveStep('step5');
    setCurrentStep(5);
    window.scrollTo(0, 0);
  };

  const handleBack = () => setCurrentStep(3);

  return (
    <div className='space-y-6'>
      <div>
        <h2 className='text-2xl font-bold'>Brand & Content Intake</h2>
        <div className='mt-4 flex gap-3 rounded-lg border border-blue-500/20 bg-blue-500/10 p-4'>
          <IoInformationCircle className='mt-0.5 h-5 w-5 shrink-0 text-blue-400' />
          <p className='text-sm text-muted-foreground'>
            Upload logos, business cards, truck wrap images, photos, flyers, and links you want us to use to build you website and Brand Guide.
          </p>
        </div>
      </div>

      <UploadDropzone onUpload={handleUpload} uploading={uploading} />

      <div className='rounded-xl border border-border p-4'>
        <div className='flex items-start gap-3'>
          <IoLink className='mt-0.5 h-5 w-5 text-muted-foreground' />
          <div>
            <p className='font-medium'>Add inspiration URLs</p>
            <p className='text-xs text-muted-foreground'>Paste websites or pages you want us to reference for style, layout, or messaging.</p>
          </div>
        </div>
        <div className='mt-4 flex gap-2'>
          <Input
            value={newUrl}
            onChange={(event) => setNewUrl(event.target.value)}
            placeholder='https://example.com'
          />
          <Button type='button' variant='outline' onClick={handleAddUrl}>
            Add URL
          </Button>
        </div>
        {(step5.websiteInspirationUrls || []).length > 0 && (
          <div className='mt-4 flex flex-wrap gap-2'>
            {(step5.websiteInspirationUrls || []).map((url) => (
              <div key={url} className='flex max-w-full items-center gap-2 rounded-full border border-border px-3 py-1 text-sm'>
                <span className='truncate'>{url}</span>
                <button type='button' onClick={() => handleRemoveUrl(url)} className='text-muted-foreground hover:text-foreground'>
                  <IoClose className='h-4 w-4' />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className='rounded-xl border border-border p-4'>
        <Label htmlFor='intakeNotes'>Anything else we should know?</Label>
        <Textarea
          id='intakeNotes'
          value={step5.intakeNotes}
          onChange={(event) => updateStep5({ intakeNotes: event.target.value })}
          placeholder='Tell us what matters most, what not to use, which assets are newest, or anything else that will help us draft your brand guide.'
          rows={5}
          className='mt-2'
        />
      </div>

      <div className='space-y-4'>
        <div className='flex items-center justify-between'>
          <div>
            <h3 className='text-lg font-semibold'>Collected assets</h3>
            <p className='text-sm text-muted-foreground'>Review each item and tag it so the brand guide draft uses the right sources.</p>
          </div>
          <span className='text-sm text-muted-foreground'>{(step5.uploadedAssets || []).length} items</span>
        </div>

        {(step5.uploadedAssets || []).length === 0 ? (
          <div className='rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground'>
            No assets added yet. Upload files or add inspiration URLs to continue building your brand guide draft.
          </div>
        ) : (
          <div className='space-y-4'>
            {(step5.uploadedAssets || []).map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                onRemove={handleRemove}
                onUpdate={handleUpdateAsset}
              />
            ))}
          </div>
        )}
      </div>

      {uploadError && <p className='text-sm text-red-400'>{uploadError}</p>}
      {saveError && <p className='text-sm text-red-400'>{saveError}</p>}
      
      <div className='flex justify-between pt-4'>
        <Button variant='outline' onClick={handleBack}>
          ← Back
        </Button>
        <Button
          onClick={handleNext}
          disabled={saving}
          className='bg-emerald-500 px-8 text-black hover:bg-emerald-400'
        >
          {saving ? 'Saving…' : 'Continue →'}
        </Button>
      </div>
    </div>
  );
}
