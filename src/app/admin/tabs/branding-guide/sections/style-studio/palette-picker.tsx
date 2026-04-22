'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { IoShuffle, IoColorPaletteOutline, IoClose } from 'react-icons/io5';
import { cn } from '@/utils/cn';
import type { ColorPalette, ColorAssignment } from './types';
import { shuffleColors } from './utils';

interface PalettePickerProps {
  allPalettes: ColorPalette[];
  selectedPaletteId: string | null;
  colorAssignment: ColorAssignment | null;
  onPaletteSelect: (id: string) => void;
  onAssignmentChange: (assignment: ColorAssignment) => void;
}

export function PalettePicker({
  allPalettes,
  selectedPaletteId,
  colorAssignment,
  onPaletteSelect,
  onAssignmentChange,
}: PalettePickerProps) {
  const [fineTuneOpen, setFineTuneOpen] = useState(false);

  // Close modal on Escape
  useEffect(() => {
    if (!fineTuneOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setFineTuneOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [fineTuneOpen]);

  const selectedPalette = allPalettes.find((p) => p.id === selectedPaletteId);

  const handleShuffle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedPalette) {
      onAssignmentChange(shuffleColors(selectedPalette));
    }
  };

  const updateRole = (role: keyof ColorAssignment, value: string) => {
    if (colorAssignment) {
      onAssignmentChange({ ...colorAssignment, [role]: value });
    }
  };

  return (
    <div className='space-y-3 rounded-xl bg-zinc-900 px-5 py-4'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <h3 className='text-base font-semibold text-white'>Select a color palette</h3>
      </div>

      {/* Horizontal scrolling palette cards */}
      <div className='-mx-5 px-5'>
        <div className='flex gap-2 overflow-x-auto pb-2' style={{ scrollbarWidth: 'thin' }}>
          {allPalettes.map((palette) => {
            const isSelected = selectedPaletteId === palette.id;

            return (
              <div
                key={palette.id}
                role='button'
                tabIndex={0}
                onClick={() => onPaletteSelect(palette.id)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onPaletteSelect(palette.id); }}
                className={cn(
                  'shrink-0 cursor-pointer rounded-lg border p-2.5 text-left transition-colors',
                  isSelected
                    ? 'border-emerald-500 ring-2 ring-emerald-500/30'
                    : 'border-zinc-700 bg-zinc-800 hover:border-zinc-500'
                )}
                style={{ width: 170 }}
              >
                {/* Color swatches — ordered: primary, secondary, accent, background, text */}
                <div className='mb-2 flex gap-0.5'>
                  {(['primary', 'secondary', 'accent', 'background', 'text'] as const).map((role) => {
                    const color = isSelected && colorAssignment ? colorAssignment[role] : palette[role];
                    return (
                      <div
                        key={role}
                        className='h-7 flex-1 first:rounded-l-md last:rounded-r-md'
                        style={{ backgroundColor: color }}
                      />
                    );
                  })}
                </div>
                <div className='truncate text-xs font-medium text-white'>{palette.name}</div>

                {/* Action buttons — only on selected card */}
                {isSelected && (
                  <div className='mt-2 flex justify-center gap-1.5'>
                    <button
                      type='button'
                      onClick={(e) => {
                        e.stopPropagation();
                        setFineTuneOpen(true);
                      }}
                      title='Edit colors'
                      className='flex h-6 w-6 items-center justify-center rounded-md bg-zinc-700 text-white transition-colors hover:bg-zinc-600'
                    >
                      <IoColorPaletteOutline className='h-3.5 w-3.5' />
                    </button>
                    <button
                      type='button'
                      onClick={handleShuffle}
                      title='Shuffle colors'
                      className='flex h-6 w-6 items-center justify-center rounded-md bg-zinc-700 text-white transition-colors hover:bg-zinc-600'
                    >
                      <IoShuffle className='h-3.5 w-3.5' />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Fine-tune modal — portal to body, same pattern as Logo & Assets */}
      {fineTuneOpen && colorAssignment && createPortal(
        <div
          className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm dark:bg-black/60'
          onClick={(e) => { if (e.target === e.currentTarget) setFineTuneOpen(false); }}
        >
          <div className='relative w-full max-w-md rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900'>
            {/* Header */}
            <div className='flex items-center justify-between px-6 pt-5 pb-4'>
              <h2 className='text-lg font-bold text-zinc-900 dark:text-white'>Fine-tune Colors</h2>
              <button
                type='button'
                onClick={() => setFineTuneOpen(false)}
                className='rounded-lg p-1.5 text-neutral-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-white'
              >
                <IoClose className='h-5 w-5' />
              </button>
            </div>
            {/* Body */}
            <div className='space-y-4 px-6 pb-6'>
              {(['primary', 'secondary', 'accent', 'background', 'text'] as const).map((role) => (
                <div key={role} className='flex items-center gap-4'>
                  <label className='relative h-10 w-10 shrink-0 cursor-pointer overflow-hidden rounded-lg ring-2 ring-zinc-300 transition-all hover:ring-emerald-500 dark:ring-zinc-600'>
                    <div
                      className='absolute inset-0'
                      style={{ backgroundColor: colorAssignment[role] }}
                    />
                    <input
                      type='color'
                      value={colorAssignment[role]}
                      onChange={(e) => updateRole(role, e.target.value)}
                      className='absolute inset-0 cursor-pointer opacity-0'
                    />
                  </label>
                  <span className='w-24 text-sm font-medium capitalize text-zinc-600 dark:text-neutral-300'>{role}</span>
                  <input
                    type='text'
                    value={colorAssignment[role].slice(1).toUpperCase()}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6);
                      if (val.length === 6) updateRole(role, `#${val.toLowerCase()}`);
                    }}
                    className='w-24 rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 font-mono text-sm uppercase text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white'
                  />
                </div>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
