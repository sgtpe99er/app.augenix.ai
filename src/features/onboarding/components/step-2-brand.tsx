'use client';

import { useRef, useState } from 'react';
import { IoAdd, IoClose, IoCloudUpload, IoLogoFacebook } from 'react-icons/io5';
import { useOnboarding } from '../context';
import { STYLE_PREFERENCES, COLOR_SUGGESTIONS } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/utils/cn';

export function Step2Brand() {
  const { data, updateStep2, setCurrentStep, saveStep, saving, saveError } = useOnboarding();
  const { step2 } = data;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [cardFrontUploading, setCardFrontUploading] = useState(false);
  const [cardFrontError, setCardFrontError] = useState('');
  const [cardBackUploading, setCardBackUploading] = useState(false);
  const [cardBackError, setCardBackError] = useState('');
  const [newColor, setNewColor] = useState('#000000');

  const isValid = step2.stylePreference !== '' || step2.hasExistingLogo;

  const handleNext = async () => {
    if (!isValid) return;
    await saveStep('step2');
    setCurrentStep(3);
  };

  const handleBack = () => setCurrentStep(1);

  const extractColors = async (imageUrl: string) => {
    setExtracting(true);
    try {
      const colorRes = await fetch('/api/onboarding/extract-colors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl }),
      });
      const colorJson = await colorRes.json();
      if (colorRes.ok && Array.isArray(colorJson.colors) && colorJson.colors.length > 0) {
        updateStep2({ hasBrandColors: true, brandColors: colorJson.colors });
      }
    } catch {
      // Color extraction is best-effort
    } finally {
      setExtracting(false);
    }
  };

  const handleLogoUpload = async (file: File) => {
    setUploading(true);
    setUploadError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/onboarding/upload-logo', { method: 'POST', body: formData });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Upload failed');
      updateStep2({ existingLogoUrl: json.url });
      if (file.type !== 'image/svg+xml') await extractColors(json.url);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleCardUpload = async (file: File, side: 'front' | 'back') => {
    const setLoading = side === 'front' ? setCardFrontUploading : setCardBackUploading;
    const setError = side === 'front' ? setCardFrontError : setCardBackError;
    setLoading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('side', side);
      const res = await fetch('/api/onboarding/upload-business-card', { method: 'POST', body: formData });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Upload failed');
      if (side === 'front') {
        updateStep2({ businessCardFrontUrl: json.url });
        if (!step2.hasBrandColors) await extractColors(json.url);
      } else {
        updateStep2({ businessCardBackUrl: json.url });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  const addColor = () => {
    const colors = step2.brandColors ?? [];
    if (!colors.includes(newColor)) {
      updateStep2({ brandColors: [...colors, newColor] });
    }
  };

  const removeColor = (color: string) => {
    updateStep2({ brandColors: (step2.brandColors ?? []).filter((c) => c !== color) });
  };

  return (
    <div className='space-y-6'>
      <div>
        <h2 className='text-2xl font-bold'>Your Brand Assets</h2>
        <p className='mt-2 text-muted-foreground'>
          Tell us about your existing branding, or let us create something new for you.
        </p>
      </div>

      <div className='space-y-6'>
        {/* Existing Website */}
        <div className='rounded-lg border border-border p-4'>
          <div className='flex items-center gap-3'>
            <input
              type='checkbox'
              id='hasExistingWebsite'
              checked={step2.hasExistingWebsite}
              onChange={(e) => updateStep2({ hasExistingWebsite: e.target.checked })}
              className='h-5 w-5 rounded border-border bg-muted'
            />
            <Label htmlFor='hasExistingWebsite' className='cursor-pointer'>
              I have an existing website
            </Label>
          </div>
          {step2.hasExistingWebsite && (
            <div className='mt-4'>
              <Input
                placeholder='https://yourwebsite.com'
                value={step2.existingWebsiteUrl}
                onChange={(e) => updateStep2({ existingWebsiteUrl: e.target.value })}
              />
              <p className='mt-2 text-xs text-muted-foreground'>
                We&apos;ll use this to understand your current branding
              </p>
            </div>
          )}
        </div>

        {/* Existing Logo */}
        <div className='rounded-lg border border-border p-4'>
          <div className='flex items-center gap-3'>
            <input
              type='checkbox'
              id='hasExistingLogo'
              checked={step2.hasExistingLogo}
              onChange={(e) => updateStep2({ hasExistingLogo: e.target.checked })}
              className='h-5 w-5 rounded border-border bg-muted'
            />
            <Label htmlFor='hasExistingLogo' className='cursor-pointer'>
              I have an existing logo
            </Label>
          </div>
          {step2.hasExistingLogo && (
            <div className='mt-4'>
              {step2.existingLogoUrl ? (
                <div className='space-y-2'>
                  <div className='flex items-center gap-3 rounded-lg bg-muted px-4 py-3'>
                    <img src={step2.existingLogoUrl} alt='Logo preview' className='h-12 w-12 rounded object-contain' />
                    <p className='flex-1 truncate text-sm text-emerald-400'>Logo uploaded</p>
                    <button type='button' onClick={() => updateStep2({ existingLogoUrl: '' })} className='text-muted-foreground hover:text-foreground'>
                      <IoClose className='h-4 w-4' />
                    </button>
                  </div>
                  {extracting && (
                    <p className='flex items-center gap-2 text-xs text-muted-foreground'>
                      <span className='inline-block h-3 w-3 animate-spin rounded-full border-2 border-border border-t-emerald-400' />
                      Detecting brand colors from your logo…
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <input
                    ref={fileInputRef}
                    type='file'
                    accept='image/*'
                    className='hidden'
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); }}
                  />
                  <button
                    type='button'
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className='flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border p-6 text-center hover:border-muted-foreground transition-colors'
                  >
                    <IoCloudUpload className='h-8 w-8 text-muted-foreground' />
                    <p className='text-sm text-muted-foreground'>{uploading ? 'Uploading…' : 'Click to upload your logo'}</p>
                    <p className='text-xs text-muted-foreground'>PNG, JPG, SVG up to 5MB</p>
                  </button>
                  {uploadError && <p className='mt-2 text-sm text-red-400'>{uploadError}</p>}
                </>
              )}
            </div>
          )}
        </div>

        {/* Business Card */}
        <div className='rounded-lg border border-border p-4'>
          <div className='flex items-center gap-3'>
            <input
              type='checkbox'
              id='hasBusinessCard'
              checked={step2.hasBusinessCard}
              onChange={(e) => updateStep2({ hasBusinessCard: e.target.checked })}
              className='h-5 w-5 rounded border-border bg-muted'
            />
            <Label htmlFor='hasBusinessCard' className='cursor-pointer'>
              I have a business card
            </Label>
          </div>
          {step2.hasBusinessCard && (
            <div className='mt-4 space-y-4'>
              <div className='grid gap-4 sm:grid-cols-2'>
                {/* Front */}
                <div>
                  <p className='mb-2 text-sm text-muted-foreground'>Front side</p>
                  {step2.businessCardFrontUrl ? (
                    <div className='flex items-center gap-3 rounded-lg bg-muted px-4 py-3'>
                      <img src={step2.businessCardFrontUrl} alt='Card front' className='h-10 w-16 rounded object-contain' />
                      <p className='flex-1 truncate text-sm text-emerald-400'>Front uploaded</p>
                      <button type='button' onClick={() => updateStep2({ businessCardFrontUrl: '' })} className='text-muted-foreground hover:text-foreground'>
                        <IoClose className='h-4 w-4' />
                      </button>
                    </div>
                  ) : (
                    <label className='flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border p-5 text-center hover:border-muted-foreground transition-colors'>
                      <IoCloudUpload className='h-7 w-7 text-muted-foreground' />
                      <p className='text-sm text-muted-foreground'>{cardFrontUploading ? 'Uploading…' : 'Upload front'}</p>
                      <input type='file' accept='image/*' className='hidden' disabled={cardFrontUploading}
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCardUpload(f, 'front'); }} />
                    </label>
                  )}
                  {cardFrontError && <p className='mt-1 text-xs text-red-400'>{cardFrontError}</p>}
                </div>
                {/* Back */}
                <div>
                  <p className='mb-2 text-sm text-muted-foreground'>Back side <span className='text-muted-foreground'>(optional)</span></p>
                  {step2.businessCardBackUrl ? (
                    <div className='flex items-center gap-3 rounded-lg bg-muted px-4 py-3'>
                      <img src={step2.businessCardBackUrl} alt='Card back' className='h-10 w-16 rounded object-contain' />
                      <p className='flex-1 truncate text-sm text-emerald-400'>Back uploaded</p>
                      <button type='button' onClick={() => updateStep2({ businessCardBackUrl: '' })} className='text-muted-foreground hover:text-foreground'>
                        <IoClose className='h-4 w-4' />
                      </button>
                    </div>
                  ) : (
                    <label className='flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border p-5 text-center hover:border-muted-foreground transition-colors'>
                      <IoCloudUpload className='h-7 w-7 text-muted-foreground' />
                      <p className='text-sm text-muted-foreground'>{cardBackUploading ? 'Uploading…' : 'Upload back'}</p>
                      <input type='file' accept='image/*' className='hidden' disabled={cardBackUploading}
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCardUpload(f, 'back'); }} />
                    </label>
                  )}
                  {cardBackError && <p className='mt-1 text-xs text-red-400'>{cardBackError}</p>}
                </div>
              </div>
              {extracting && (
                <p className='flex items-center gap-2 text-xs text-muted-foreground'>
                  <span className='inline-block h-3 w-3 animate-spin rounded-full border-2 border-border border-t-emerald-400' />
                  Detecting brand colors from your business card…
                </p>
              )}
              <p className='text-xs text-muted-foreground'>We&apos;ll use your business card to match your existing branding style and colors.</p>
            </div>
          )}
        </div>

        {/* Facebook Page */}
        <div className='rounded-lg border border-border p-4'>
          <div className='flex items-center gap-3'>
            <input
              type='checkbox'
              id='hasFacebookPage'
              checked={step2.hasFacebookPage}
              onChange={(e) => updateStep2({ hasFacebookPage: e.target.checked })}
              className='h-5 w-5 rounded border-border bg-muted'
            />
            <Label htmlFor='hasFacebookPage' className='cursor-pointer flex items-center gap-2'>
              <IoLogoFacebook className='h-4 w-4 text-blue-400' />
              I have a Facebook page
            </Label>
          </div>
          {step2.hasFacebookPage && (
            <div className='mt-4'>
              <Input
                placeholder='https://facebook.com/yourbusiness'
                value={step2.facebookPageUrl}
                onChange={(e) => updateStep2({ facebookPageUrl: e.target.value })}
              />
              <p className='mt-2 text-xs text-muted-foreground'>
                We&apos;ll use your Facebook page to understand your brand voice and gather content ideas.
              </p>
            </div>
          )}
        </div>

        {/* Style Preference */}
        {!step2.hasExistingLogo && (
          <div>
            <Label className='mb-3 block'>What style fits your brand? *</Label>
            <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
              {STYLE_PREFERENCES.map((style) => (
                <button
                  key={style.value}
                  type='button'
                  onClick={() => updateStep2({ stylePreference: style.value })}
                  className={cn(
                    'rounded-lg border p-4 text-left transition-colors',
                    step2.stylePreference === style.value
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : 'border-border hover:border-border'
                  )}
                >
                  <span className='font-medium'>{style.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Color Preference */}
        <div>
          <div className='flex items-center gap-3 mb-3'>
            <input
              type='checkbox'
              id='hasBrandColors'
              checked={step2.hasBrandColors}
              onChange={(e) => updateStep2({ hasBrandColors: e.target.checked })}
              className='h-5 w-5 rounded border-border bg-muted'
            />
            <Label htmlFor='hasBrandColors' className='cursor-pointer'>
              I have specific brand colors
            </Label>
          </div>
          
          {step2.hasBrandColors ? (
            <div className='space-y-3'>
              {/* Existing color swatches */}
              {(step2.brandColors ?? []).length > 0 && (
                <div className='flex flex-wrap gap-2'>
                  {(step2.brandColors ?? []).map((color) => (
                    <div key={color} className='flex items-center gap-1 rounded-lg border border-border bg-muted px-2 py-1'>
                      <div className='h-5 w-5 rounded' style={{ backgroundColor: color }} />
                      <span className='text-xs text-muted-foreground'>{color}</span>
                      <button type='button' onClick={() => removeColor(color)} className='ml-1 text-muted-foreground hover:text-foreground'>
                        <IoClose className='h-3 w-3' />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {/* Color picker + add */}
              <div className='flex items-center gap-2'>
                <input
                  type='color'
                  value={newColor}
                  onChange={(e) => setNewColor(e.target.value)}
                  className='h-10 w-14 cursor-pointer rounded border border-border bg-muted p-1'
                />
                <Input
                  value={newColor}
                  onChange={(e) => setNewColor(e.target.value)}
                  placeholder='#000000'
                  className='w-32 font-mono text-sm'
                />
                <Button type='button' variant='outline' onClick={addColor} className='shrink-0'>
                  <IoAdd className='mr-1 h-4 w-4' /> Add
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <p className='mb-3 text-sm text-muted-foreground'>Choose a color direction:</p>
              <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
                {COLOR_SUGGESTIONS.map((color) => (
                  <button
                    key={color.value}
                    type='button'
                    onClick={() => updateStep2({ colorPreference: color.value })}
                    className={cn(
                      'rounded-lg border p-4 text-left transition-colors',
                      step2.colorPreference === color.value
                        ? 'border-emerald-500 bg-emerald-500/10'
                        : 'border-border hover:border-border'
                    )}
                  >
                    <div className='mb-2 flex gap-1'>
                      {color.colors.map((c, i) => (
                        <div
                          key={i}
                          className='h-6 w-6 rounded'
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                    <span className='text-sm'>{color.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {saveError && <p className='text-sm text-red-400'>{saveError}</p>}
      <div className='flex justify-between pt-4'>
        <Button variant='outline' onClick={handleBack}>
          ← Back
        </Button>
        <Button
          onClick={handleNext}
          disabled={!isValid || saving}
          className='bg-emerald-500 px-8 text-black hover:bg-emerald-400'
        >
          {saving ? 'Saving…' : 'Continue →'}
        </Button>
      </div>
    </div>
  );
}
