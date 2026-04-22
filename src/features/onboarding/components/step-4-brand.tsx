'use client';

import { useState } from 'react';
import { useOnboarding } from '../context';
import { STYLE_PREFERENCES, COLOR_SUGGESTIONS, TONE_OF_VOICE } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { IoInformationCircle, IoAdd, IoClose } from 'react-icons/io5';
import { cn } from '@/utils/cn';

function HelperText({ children }: { children: React.ReactNode }) {
  return <p className='mt-1 text-xs text-muted-foreground'>{children}</p>;
}

function SelectionCard({
  selected,
  onClick,
  title,
  description,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <button
      type='button'
      onClick={onClick}
      className={cn(
        'rounded-lg border p-4 text-left transition-colors',
        selected ? 'border-emerald-500 bg-emerald-500/10' : 'border-border hover:border-muted-foreground'
      )}
    >
      <p className='font-medium'>{title}</p>
      {description ? <p className='mt-1 text-sm text-muted-foreground'>{description}</p> : null}
      {children ? <div className='mt-3'>{children}</div> : null}
    </button>
  );
}

export function Step4Brand() {
  const { data, updateStep4, setCurrentStep, saveStep, saving, saveError } = useOnboarding();
  const { step4 } = data;
  const [generatingGuide, setGeneratingGuide] = useState(false);
  const [generateError, setGenerateError] = useState('');
  const [newColor, setNewColor] = useState('#000000');
  const [newColorLabel, setNewColorLabel] = useState('');
  const [newFont, setNewFont] = useState('');
  const minimalGuide = step4.minimalBrandGuide;
  const hasMinimalGuide = !!minimalGuide;
  const guideStatusLabel = (step4.brandGuideStatus || 'not_started').replace(/_/g, ' ');
  const typography = minimalGuide?.typography;
  const colorGroups = minimalGuide?.colors;
  const paletteOptions = [
    { id: 'primary', label: 'Primary palette', colors: colorGroups?.primary ?? [] },
    { id: 'secondary', label: 'Secondary palette', colors: colorGroups?.secondary ?? [] },
    { id: 'neutrals', label: 'Neutral palette', colors: colorGroups?.neutrals ?? [] },
    { id: 'text', label: 'Text colors', colors: colorGroups?.text ?? [] },
    { id: 'backgrounds', label: 'Background colors', colors: colorGroups?.backgrounds ?? [] },
  ].filter((palette) => palette.colors.length > 0);
  const ctaColor = colorGroups?.cta;

  const handleNext = async () => {
    await saveStep('step2');
    await saveStep('step4');
    setCurrentStep(6);
    window.scrollTo(0, 0);
  };

  const handleBack = () => setCurrentStep(4);

  const addColor = () => {
    const colors = step4.brandColors ?? [];
    const exists = colors.some((c) => c.hex === newColor);
    if (!exists) {
      updateStep4({ 
        brandColors: [...colors, { hex: newColor, label: newColorLabel.trim() || '' }], 
        hasBrandColors: true 
      });
      setNewColorLabel('');
    }
  };

  const removeColor = (hex: string) => {
    updateStep4({ brandColors: (step4.brandColors ?? []).filter((c) => c.hex !== hex) });
  };

  const updateColorLabel = (hex: string, label: string) => {
    updateStep4({
      brandColors: (step4.brandColors ?? []).map((c) =>
        c.hex === hex ? { ...c, label } : c
      ),
    });
  };

  const addFont = () => {
    const trimmed = newFont.trim();
    if (trimmed && !(step4.brandFonts ?? []).includes(trimmed)) {
      updateStep4({ brandFonts: [...(step4.brandFonts ?? []), trimmed], hasBrandFonts: true });
      setNewFont('');
    }
  };

  const removeFont = (font: string) => {
    updateStep4({ brandFonts: (step4.brandFonts ?? []).filter((f) => f !== font) });
  };

  const handleGenerateBrandGuide = async () => {
    setGeneratingGuide(true);
    setGenerateError('');

    try {
      await saveStep('step2');
      await saveStep('step4');
      await saveStep('step5');

      const res = await fetch('/api/onboarding/generate-brand-guide', {
        method: 'POST',
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error ?? 'Failed to generate brand guide');
      }

      updateStep4({
        brandGuideId: json.brandGuideId || '',
        brandGuideStatus: json.brandGuideStatus || 'needs_review',
        minimalBrandGuide: json.minimalBrandGuide || null,
        brandGuidePromptTemplateKey: json.brandGuidePromptTemplateKey || step4.brandGuidePromptTemplateKey,
        brandGuideSelections: {
          ...step4.brandGuideSelections,
          ...(json.brandGuideSelections || {}),
        },
      });
    } catch (e) {
      setGenerateError(e instanceof Error ? e.message : 'Failed to generate brand guide');
    } finally {
      setGeneratingGuide(false);
    }
  };

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div>
        <h2 className='text-2xl font-bold'>Brand Guide Review</h2>
        <p className='mt-2 text-muted-foreground'>
          Generate your draft brand guide, review the recommendations, and choose the direction you want us to use.
        </p>
        <div className='mt-4 flex gap-3 rounded-lg border border-blue-500/20 bg-blue-500/10 p-4'>
          <IoInformationCircle className='mt-0.5 h-5 w-5 shrink-0 text-blue-400' />
          <p className='text-sm text-muted-foreground'>
            <strong className='text-blue-300'>This is Step 5 of your onboarding.</strong> We use the intake from the previous step to generate a draft brand guide for you to review and refine here.
          </p>
        </div>
      </div>

      <div className='rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4'>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
          <div>
            <p className='text-sm font-medium text-emerald-300'>Brand guide draft</p>
            <p className='mt-1 text-sm text-muted-foreground'>
              Status: <span className='capitalize text-foreground'>{guideStatusLabel}</span>
            </p>
          </div>
          <div className='flex flex-col items-start gap-2 sm:items-end'>
            <div className='text-sm text-muted-foreground'>
              Template: <span className='text-foreground'>{step4.brandGuidePromptTemplateKey || 'brand-guide-default'}</span>
            </div>
            <Button
              type='button'
              onClick={handleGenerateBrandGuide}
              disabled={generatingGuide || saving}
              className='bg-emerald-500 text-black hover:bg-emerald-400'
            >
              {generatingGuide ? 'Generating…' : hasMinimalGuide ? 'Refresh Draft' : 'Generate Draft'}
            </Button>
          </div>
        </div>

        {generateError ? <p className='mt-3 text-sm text-red-400'>{generateError}</p> : null}

        {hasMinimalGuide ? (
          <div className='mt-4 grid gap-4 md:grid-cols-2'>
            <div className='rounded-lg border border-border bg-background/50 p-4'>
              <p className='text-sm font-medium'>Draft summary</p>
              <div className='mt-3 space-y-2 text-sm'>
                <p>
                  <span className='text-muted-foreground'>Style keywords:</span>{' '}
                  {minimalGuide.styleKeywords?.length ? minimalGuide.styleKeywords.join(', ') : 'None yet'}
                </p>
                <p>
                  <span className='text-muted-foreground'>Tone keywords:</span>{' '}
                  {minimalGuide.toneKeywords?.length ? minimalGuide.toneKeywords.join(', ') : 'None yet'}
                </p>
                <p>
                  <span className='text-muted-foreground'>Logo variants:</span>{' '}
                  {minimalGuide.logoVariants?.length ? minimalGuide.logoVariants.join(', ') : 'None yet'}
                </p>
                <p>
                  <span className='text-muted-foreground'>Updated:</span>{' '}
                  {minimalGuide.updatedAt || 'Not available'}
                </p>
              </div>
            </div>

            <div className='rounded-lg border border-border bg-background/50 p-4'>
              <p className='text-sm font-medium'>Current selections</p>
              <div className='mt-3 space-y-2 text-sm'>
                <p>
                  <span className='text-muted-foreground'>Logo variant:</span>{' '}
                  {step4.brandGuideSelections.selectedLogoVariant || 'Not selected'}
                </p>
                <p>
                  <span className='text-muted-foreground'>Palette:</span>{' '}
                  {step4.brandGuideSelections.selectedPaletteId || 'Not selected'}
                </p>
                <p>
                  <span className='text-muted-foreground'>Heading font:</span>{' '}
                  {step4.brandGuideSelections.selectedHeadingFont || 'Not selected'}
                </p>
                <p>
                  <span className='text-muted-foreground'>Body font:</span>{' '}
                  {step4.brandGuideSelections.selectedBodyFont || 'Not selected'}
                </p>
                <p>
                  <span className='text-muted-foreground'>CTA color:</span>{' '}
                  {step4.brandGuideSelections.selectedCtaColor || 'Not selected'}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <p className='mt-4 text-sm text-muted-foreground'>
            No draft summary has been generated yet. Generate your first draft to review logo, typography, palette, and CTA recommendations.
          </p>
        )}
      </div>

      {hasMinimalGuide ? (
        <div className='space-y-6 rounded-lg border border-border p-4'>
          <div>
            <h3 className='text-lg font-semibold'>Review and choose your brand guide</h3>
            <p className='mt-1 text-sm text-muted-foreground'>
              Pick the draft options you want us to use as the source of truth for design and content.
            </p>
          </div>

          {(minimalGuide?.logoVariants?.length || 0) > 0 && (
            <div>
              <Label className='mb-3 block'>Logo direction</Label>
              <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
                {(minimalGuide?.logoVariants || []).map((variant) => (
                  <SelectionCard
                    key={variant}
                    selected={step4.brandGuideSelections.selectedLogoVariant === variant}
                    onClick={() =>
                      updateStep4({
                        brandGuideSelections: {
                          ...step4.brandGuideSelections,
                          selectedLogoVariant: variant,
                        },
                      })
                    }
                    title={variant}
                  />
                ))}
              </div>
            </div>
          )}

          {paletteOptions.length > 0 && (
            <div>
              <Label className='mb-3 block'>Color palette</Label>
              <div className='grid gap-3 md:grid-cols-2'>
                {paletteOptions.map((palette) => (
                  <SelectionCard
                    key={palette.id}
                    selected={step4.brandGuideSelections.selectedPaletteId === palette.id}
                    onClick={() =>
                      updateStep4({
                        brandGuideSelections: {
                          ...step4.brandGuideSelections,
                          selectedPaletteId: palette.id,
                        },
                      })
                    }
                    title={palette.label}
                    description={palette.colors.map((color) => color.label || color.hex).join(', ')}
                  >
                    <div className='flex flex-wrap gap-2'>
                      {palette.colors.map((color) => (
                        <div
                          key={`${palette.id}-${color.hex}`}
                          className='h-8 w-8 rounded border border-border'
                          style={{ backgroundColor: color.hex }}
                          title={`${color.label || 'Color'} ${color.hex}`}
                        />
                      ))}
                    </div>
                  </SelectionCard>
                ))}
              </div>
            </div>
          )}

          {(typography?.headingFont || typography?.bodyFont || typography?.displayFont) && (
            <div className='grid gap-6 md:grid-cols-2'>
              <div>
                <Label className='mb-3 block'>Heading font</Label>
                <div className='space-y-3'>
                  {[typography?.headingFont, typography?.displayFont].filter(Boolean).map((font) => (
                    <SelectionCard
                      key={`heading-${font}`}
                      selected={step4.brandGuideSelections.selectedHeadingFont === font}
                      onClick={() =>
                        updateStep4({
                          brandGuideSelections: {
                            ...step4.brandGuideSelections,
                            selectedHeadingFont: font || '',
                          },
                        })
                      }
                      title={font || ''}
                    />
                  ))}
                </div>
              </div>

              <div>
                <Label className='mb-3 block'>Body font</Label>
                <div className='space-y-3'>
                  {[typography?.bodyFont, typography?.paragraphFont].filter(Boolean).map((font) => (
                    <SelectionCard
                      key={`body-${font}`}
                      selected={step4.brandGuideSelections.selectedBodyFont === font}
                      onClick={() =>
                        updateStep4({
                          brandGuideSelections: {
                            ...step4.brandGuideSelections,
                            selectedBodyFont: font || '',
                          },
                        })
                      }
                      title={font || ''}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {ctaColor ? (
            <div>
              <Label className='mb-3 block'>CTA color</Label>
              <SelectionCard
                selected={step4.brandGuideSelections.selectedCtaColor === ctaColor.hex}
                onClick={() =>
                  updateStep4({
                    brandGuideSelections: {
                      ...step4.brandGuideSelections,
                      selectedCtaColor: ctaColor.hex,
                    },
                  })
                }
                title={ctaColor.label || ctaColor.hex}
                description={ctaColor.hex}
              >
                <div className='h-10 w-16 rounded border border-border' style={{ backgroundColor: ctaColor.hex }} />
              </SelectionCard>
            </div>
          ) : null}

          <div>
            <Label htmlFor='brandGuideSelectionNotes'>Brand guide notes</Label>
            <Textarea
              id='brandGuideSelectionNotes'
              value={step4.brandGuideSelections.notes}
              onChange={(e) =>
                updateStep4({
                  brandGuideSelections: {
                    ...step4.brandGuideSelections,
                    notes: e.target.value,
                  },
                })
              }
              placeholder='Tell us what you want to keep, combine, or adjust from this draft...'
              className='mt-2 min-h-[96px]'
            />
          </div>
        </div>
      ) : null}

      <div className='space-y-6'>
        {/* Style Preference */}
        <div>
          <Label className='mb-3 block'>What style fits your brand?</Label>
          <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
            {STYLE_PREFERENCES.map((style) => (
              <button
                key={style.value}
                type='button'
                onClick={() => updateStep4({ stylePreference: style.value })}
                className={cn(
                  'rounded-lg border p-4 text-left transition-colors',
                  step4.stylePreference === style.value
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-border hover:border-muted-foreground'
                )}
              >
                <span className='font-medium'>{style.label}</span>
              </button>
            ))}
          </div>
          <HelperText>Choose the overall aesthetic you want for your website.</HelperText>
        </div>

        {/* Tone of Voice */}
        <div>
          <Label className='mb-3 block'>What tone should your website have?</Label>
          <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
            {TONE_OF_VOICE.map((tone) => (
              <button
                key={tone.value}
                type='button'
                onClick={() => updateStep4({ toneOfVoice: tone.value })}
                className={cn(
                  'rounded-lg border p-4 text-left transition-colors',
                  step4.toneOfVoice === tone.value
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-border hover:border-muted-foreground'
                )}
              >
                <span className='font-medium'>{tone.label}</span>
              </button>
            ))}
          </div>
          <HelperText>This affects how we write the content on your website.</HelperText>
        </div>

        {/* Brand Colors */}
        <div>
          <div className='flex items-center gap-3 mb-3'>
            <input
              type='checkbox'
              id='hasBrandColors'
              checked={step4.hasBrandColors}
              onChange={(e) => updateStep4({ hasBrandColors: e.target.checked })}
              className='h-5 w-5 rounded border-border bg-muted'
            />
            <Label htmlFor='hasBrandColors' className='cursor-pointer'>
              I have specific brand colors
            </Label>
          </div>
          
          {step4.hasBrandColors ? (
            <div className='space-y-3'>
              {(step4.brandColors ?? []).length > 0 && (
                <div className='space-y-2'>
                  {(step4.brandColors ?? []).map((color) => (
                    <div key={color.hex} className='flex items-center gap-3 rounded-lg border border-border bg-muted px-3 py-2'>
                      <div className='h-8 w-8 shrink-0 rounded' style={{ backgroundColor: color.hex }} />
                      <span className='w-20 shrink-0 font-mono text-xs text-muted-foreground'>{color.hex}</span>
                      <Input
                        value={color.label}
                        onChange={(e) => updateColorLabel(color.hex, e.target.value)}
                        placeholder='e.g., Primary, Secondary, CTA buttons...'
                        className='flex-1 text-sm'
                      />
                      <button type='button' onClick={() => removeColor(color.hex)} className='text-muted-foreground hover:text-red-400'>
                        <IoClose className='h-4 w-4' />
                      </button>
                    </div>
                  ))}
                </div>
              )}
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
                  className='w-24 font-mono text-sm'
                />
                <Input
                  value={newColorLabel}
                  onChange={(e) => setNewColorLabel(e.target.value)}
                  placeholder='Label (optional)'
                  className='flex-1 text-sm'
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addColor(); } }}
                />
                <Button type='button' variant='outline' onClick={addColor} className='shrink-0'>
                  <IoAdd className='mr-1 h-4 w-4' /> Add
                </Button>
              </div>
              <HelperText>Add a label like &quot;Primary&quot;, &quot;Secondary&quot;, &quot;Accent&quot;, or &quot;CTA buttons&quot; to help us understand how to use each color.</HelperText>
            </div>
          ) : (
            <div>
              <p className='mb-3 text-sm text-muted-foreground'>Choose a color direction:</p>
              <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
                {COLOR_SUGGESTIONS.map((color) => (
                  <button
                    key={color.value}
                    type='button'
                    onClick={() => updateStep4({ colorPreference: color.value })}
                    className={cn(
                      'rounded-lg border p-4 text-left transition-colors',
                      step4.colorPreference === color.value
                        ? 'border-emerald-500 bg-emerald-500/10'
                        : 'border-border hover:border-muted-foreground'
                    )}
                  >
                    <div className='mb-2 flex gap-1'>
                      {color.colors.map((c, i) => (
                        <div key={i} className='h-6 w-6 rounded' style={{ backgroundColor: c }} />
                      ))}
                    </div>
                    <span className='text-sm'>{color.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Brand Fonts */}
        <div>
          <div className='flex items-center gap-3 mb-3'>
            <input
              type='checkbox'
              id='hasBrandFonts'
              checked={step4.hasBrandFonts}
              onChange={(e) => updateStep4({ hasBrandFonts: e.target.checked })}
              className='h-5 w-5 rounded border-border bg-muted'
            />
            <Label htmlFor='hasBrandFonts' className='cursor-pointer'>
              I have specific brand fonts
            </Label>
          </div>
          
          {step4.hasBrandFonts && (
            <div className='space-y-3'>
              {(step4.brandFonts ?? []).length > 0 && (
                <div className='flex flex-wrap gap-2'>
                  {(step4.brandFonts ?? []).map((font) => (
                    <span key={font} className='flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-sm'>
                      {font}
                      <button type='button' onClick={() => removeFont(font)} className='ml-1 text-muted-foreground hover:text-foreground'>
                        <IoClose className='h-3 w-3' />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className='flex gap-2'>
                <Input
                  placeholder='e.g., Montserrat, Open Sans'
                  value={newFont}
                  onChange={(e) => setNewFont(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addFont(); } }}
                  className='flex-1'
                />
                <Button type='button' variant='outline' onClick={addFont} className='shrink-0'>
                  <IoAdd className='h-4 w-4' />
                </Button>
              </div>
              <HelperText>Enter font names you want us to use (e.g., Montserrat, Roboto).</HelperText>
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
          disabled={saving}
          className='bg-emerald-500 px-8 text-black hover:bg-emerald-400'
        >
          {saving ? 'Saving…' : 'Continue →'}
        </Button>
      </div>
    </div>
  );
}
