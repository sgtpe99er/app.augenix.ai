'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { BrandingGuideUnsavedActions } from '../../index';
import type { BrandingGuideData } from '../../types';

import { CURATED_FONT_PAIRINGS, CURATED_PALETTES, WEBSITE_TEMPLATES } from './data';
import { PalettePicker } from './palette-picker';
import { Preview } from './preview';
import { TemplatePicker } from './template-picker';
import type { ColorAssignment, ColorPalette, FontPairing, PreviewProps } from './types';
import { defaultAssignment, getTokensForVibe, loadGoogleFont } from './utils';

interface StyleStudioProps {
  data: BrandingGuideData;
  onSave: (updates: Partial<BrandingGuideData>) => Promise<boolean>;
  onDirtyChange?: (dirty: boolean) => void;
  onRegisterUnsavedActions?: (actions: BrandingGuideUnsavedActions | null) => void;
}

/** Find the best font pairing for a given vibe */
function autoSelectFont(vibe: string, savedFonts?: string[]): FontPairing {
  if (savedFonts && savedFonts.length >= 1) {
    const savedMatch = CURATED_FONT_PAIRINGS.find(
      (fp) => fp.vibes.includes(vibe) && fp.heading === savedFonts[0] && (savedFonts[1] ? fp.body === savedFonts[1] : true)
    );
    if (savedMatch) return savedMatch;
  }
  return CURATED_FONT_PAIRINGS.find((fp) => fp.vibes.includes(vibe)) ?? CURATED_FONT_PAIRINGS[0];
}

export function StyleStudio({ data, onSave, onDirtyChange, onRegisterUnsavedActions }: StyleStudioProps) {
  const [stylePreference, setStylePreference] = useState(data.stylePreference);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedPaletteId, setSelectedPaletteId] = useState<string | null>(null);
  const [colorAssignment, setColorAssignment] = useState<ColorAssignment | null>(null);
  const [autoFontPairing, setAutoFontPairing] = useState<FontPairing>(() => autoSelectFont(data.stylePreference, data.brandFonts));
  const [inspirationPalettes, setInspirationPalettes] = useState<ColorPalette[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasInteracted = useRef(false);
  const handleSaveRef = useRef<() => Promise<boolean | undefined>>(undefined);
  // Snapshot the original extracted colors so autosave doesn't overwrite them
  const extractedColorsRef = useRef<string[]>(data.brandColors);

  const handleTemplateSelect = useCallback(
    (templateId: string) => {
      const template = WEBSITE_TEMPLATES.find((t) => t.id === templateId);
      if (!template) return;

      hasInteracted.current = true;
      setSelectedTemplateId(templateId);
      setStylePreference(template.vibe);

      const font = autoSelectFont(template.vibe, data.brandFonts);
      setAutoFontPairing(font);
      loadGoogleFont(font.heading);
      loadGoogleFont(font.body);
    },
    [data.brandFonts]
  );

  const handlePaletteSelect = useCallback(
    (id: string) => {
      hasInteracted.current = true;
      setSelectedPaletteId(id);
      const original = extractedColorsRef.current;
      const palette = [...CURATED_PALETTES, ...inspirationPalettes].find((p) => p.id === id)
        || (original.length >= 2 && id === 'extracted-brand'
          ? {
              primary: original[0],
              secondary: original[1],
              accent: original[2] || '#64748b',
              background: original[3] || '#64748b',
              text: original[4] || '#64748b',
            }
          : null);
      if (palette) {
        setColorAssignment(defaultAssignment(palette as ColorPalette));
      }
    },
    [inspirationPalettes]
  );

  const allPalettes = useMemo(() => {
    let palettes: ColorPalette[] = [...CURATED_PALETTES];

    const original = extractedColorsRef.current;
    if (original.length >= 2) {
      const sliced = original.slice(0, 5);
      const extracted = sliced.concat(Array(5 - sliced.length).fill('#64748b'));
      palettes.unshift({
        id: 'extracted-brand',
        name: 'From Your Uploads',
        primary: extracted[0],
        secondary: extracted[1],
        accent: extracted[2],
        background: extracted[3],
        text: extracted[4],
        vibes: [],
        source: 'extracted' as const,
      });
    }

    palettes = palettes.concat(inspirationPalettes);

    return palettes;
  }, [inspirationPalettes]);

  const previewProps: PreviewProps = {
    primary: colorAssignment?.primary ?? '#2563EB',
    secondary: colorAssignment?.secondary ?? '#0F172A',
    accent: colorAssignment?.accent ?? '#38BDF8',
    background: colorAssignment?.background ?? '#FFFFFF',
    text: colorAssignment?.text ?? '#1E293B',
    headingFont: autoFontPairing.heading ?? data.typography.fontFamily.primary ?? 'Inter',
    bodyFont: autoFontPairing.body ?? data.typography.fontFamily.secondary ?? 'Inter',
    stylePreference: stylePreference ?? 'modern',
    businessName: data.businessName,
    toneOfVoice: data.toneOfVoice,
    templateId: selectedTemplateId,
  };

  // Initialize from server data (runs only when data from server changes)
  useEffect(() => {
    setStylePreference(data.stylePreference);

    const matchedTemplate = WEBSITE_TEMPLATES.find((t) => t.vibe === data.stylePreference);
    if (matchedTemplate) {
      setSelectedTemplateId(matchedTemplate.id);
    }

    setAutoFontPairing(autoSelectFont(data.stylePreference, data.brandFonts));

    if (data.brandColors.length >= 5) {
      const assignment: ColorAssignment = {
        primary: data.brandColors[0],
        secondary: data.brandColors[1],
        accent: data.brandColors[2],
        background: data.brandColors[3],
        text: data.brandColors[4],
      };
      setColorAssignment(assignment);
    }
  }, [data]);

  // Match saved colors to a palette (separate effect to avoid resetting template on palette sort changes)
  useEffect(() => {
    if (data.brandColors.length >= 5) {
      const assignment: ColorAssignment = {
        primary: data.brandColors[0],
        secondary: data.brandColors[1],
        accent: data.brandColors[2],
        background: data.brandColors[3],
        text: data.brandColors[4],
      };
      const match = allPalettes.find((p) => p.primary === assignment.primary && p.secondary === assignment.secondary);
      if (match && !selectedPaletteId) {
        setSelectedPaletteId(match.id);
      }
    }
  }, [allPalettes, data.brandColors, selectedPaletteId]);

  useEffect(() => {
    loadGoogleFont(autoFontPairing.heading);
    loadGoogleFont(autoFontPairing.body);
  }, [autoFontPairing]);

  const isDirty = useMemo(() => {
    if (stylePreference !== data.stylePreference) return true;

    if (colorAssignment) {
      const saved = data.brandColors;
      if (
        saved.length < 5 ||
        colorAssignment.primary !== saved[0] ||
        colorAssignment.secondary !== saved[1] ||
        colorAssignment.accent !== saved[2] ||
        colorAssignment.background !== saved[3] ||
        colorAssignment.text !== saved[4]
      )
        return true;
    } else if (data.brandColors.length > 0) {
      return true;
    }

    const savedFonts = data.brandFonts;
    if (savedFonts.length < 1 || autoFontPairing.heading !== savedFonts[0] || autoFontPairing.body !== (savedFonts[1] || savedFonts[0])) {
      return true;
    }

    return false;
  }, [stylePreference, colorAssignment, autoFontPairing, data]);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const handleColorAssignmentChange = useCallback((assignment: ColorAssignment) => {
    hasInteracted.current = true;
    setColorAssignment(assignment);
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveStatus('saving');
    try {
      const updates: Partial<BrandingGuideData> = {
        stylePreference,
      };

      if (colorAssignment) {
        updates.brandColors = [
          colorAssignment.primary,
          colorAssignment.secondary,
          colorAssignment.accent,
          colorAssignment.background,
          colorAssignment.text,
        ];
        updates.hasBrandColors = true;
        updates.colors = {
          primary: [colorAssignment.primary],
          secondary: [colorAssignment.secondary],
          accent: [colorAssignment.accent],
          text: [
            { label: 'Body', value: colorAssignment.text },
            { label: 'Heading', value: colorAssignment.secondary },
          ],
          background: [{ label: 'Canvas', value: colorAssignment.background }],
          border: `${colorAssignment.secondary}20`,
        };
      }

      updates.brandFonts = [autoFontPairing.heading, autoFontPairing.body];
      updates.hasBrandFonts = true;
      updates.typography = {
        ...data.typography,
        fontFamily: {
          primary: autoFontPairing.heading,
          secondary: autoFontPairing.body,
        },
      };

      if (stylePreference) {
        const tokens = getTokensForVibe(stylePreference);
        updates.borderRadius = tokens.borderRadius;
        updates.shadows = tokens.shadows;
        updates.spacing = tokens.spacing;
      }

      const ok = await onSave(updates);
      if (ok) {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        setSaveStatus('idle');
      }
      return ok;
    } finally {
      setSaving(false);
    }
  }, [data, stylePreference, colorAssignment, autoFontPairing, onSave]);

  // Keep ref in sync so autosave always calls the latest version
  handleSaveRef.current = handleSave;

  // Autosave with debounce — only after user interaction
  useEffect(() => {
    if (!isDirty || !hasInteracted.current) return;

    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      void handleSaveRef.current?.();
    }, 1500);

    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, [isDirty, stylePreference, colorAssignment, autoFontPairing]);

  useEffect(() => {
    onRegisterUnsavedActions?.({
      save: handleSave,
      discard: () => {
        hasInteracted.current = false;
        setStylePreference(data.stylePreference);
        const matchedTemplate = WEBSITE_TEMPLATES.find((t) => t.vibe === data.stylePreference);
        setSelectedTemplateId(matchedTemplate?.id ?? null);
        setSelectedPaletteId(null);
        setColorAssignment(null);
        setAutoFontPairing(autoSelectFont(data.stylePreference, data.brandFonts));
        setInspirationPalettes([]);
      },
    });

    return () => {
      onRegisterUnsavedActions?.(null);
    };
  }, [handleSave, data, onRegisterUnsavedActions]);

  return (
    <div className='flex h-[calc(100vh-120px)] flex-col gap-3 [color-scheme:dark]'>
      {/* Top row: Preview (left) + Template Picker (right) */}
      <div className='grid min-h-0 flex-1 gap-4 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_360px]'>
        <div className='relative min-h-0 flex flex-col'>
          <Preview {...previewProps} />
          {/* Autosave indicator — centered overlay */}
          {saveStatus !== 'idle' && (
            <div className='pointer-events-none absolute inset-0 flex items-center justify-center'>
              <div className='flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-lg transition-opacity duration-300'>
                {saveStatus === 'saving' ? (
                  <>
                    <div className='h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white' />
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className='h-4 w-4' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth={2.5}>
                      <path strokeLinecap='round' strokeLinejoin='round' d='M5 13l4 4L19 7' />
                    </svg>
                    Saved
                  </>
                )}
              </div>
            </div>
          )}
        </div>
        <TemplatePicker selectedTemplateId={selectedTemplateId} onSelect={handleTemplateSelect} />
      </div>

      {/* Color Palette + Save — compact bottom bar */}
      <div className='shrink-0'>
        <PalettePicker
          allPalettes={allPalettes}
          selectedPaletteId={selectedPaletteId}
          colorAssignment={colorAssignment}
          onPaletteSelect={handlePaletteSelect}
          onAssignmentChange={handleColorAssignmentChange}
        />
      </div>
    </div>
  );
}
