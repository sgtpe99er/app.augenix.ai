'use client';

import { useEffect, useState } from 'react';
import { IoSparkles, IoColorPalette, IoChevronBack, IoChevronForward } from 'react-icons/io5';
import { cn } from '@/utils/cn';
import { StyleStudio } from './sections/style-studio/index';
import { InspirationSection } from './sections/inspiration';
import { BrandingGuideData, initialBrandingGuideData } from './types';

export type BrandingGuideSubTab = 'inspiration' | 'style';

const subTabs = [
  { id: 'inspiration' as BrandingGuideSubTab, label: 'Inspiration', icon: IoSparkles },
  { id: 'style' as BrandingGuideSubTab, label: 'Style', icon: IoColorPalette },
];

interface BrandingGuideSidebarProps {
  activeSubTab: BrandingGuideSubTab;
  onSubTabChange: (tab: BrandingGuideSubTab) => void;
  onBack: () => void;
}

export function BrandingGuideSidebar({ activeSubTab, onSubTabChange, onBack }: BrandingGuideSidebarProps) {
  return (
    <nav className='flex flex-col gap-1'>
      <button
        onClick={onBack}
        className='mb-2 flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-neutral-400 transition-colors hover:bg-zinc-800 hover:text-white'
      >
        <IoChevronBack className='h-4 w-4' />
        <span>Branding Guide</span>
      </button>
      {subTabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onSubTabChange(tab.id)}
          className={cn(
            'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors',
            activeSubTab === tab.id
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'text-neutral-500 hover:bg-zinc-800 hover:text-white'
          )}
        >
          <tab.icon className='h-4 w-4 shrink-0' />
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}

interface BrandingGuideMenuItemProps {
  onClick: () => void;
  isActive: boolean;
}

export function BrandingGuideMenuItem({ onClick, isActive }: BrandingGuideMenuItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors',
        isActive
          ? 'bg-emerald-500/20 text-emerald-400'
          : 'text-neutral-500 hover:bg-zinc-200 hover:text-black dark:text-neutral-400 dark:hover:bg-zinc-900 dark:hover:text-white'
      )}
    >
      <span className='flex items-center gap-2'>
        <IoColorPalette className='h-4 w-4 shrink-0' />
        <span>Branding Guide</span>
      </span>
      <IoChevronForward className='h-4 w-4' />
    </button>
  );
}

export interface BrandingGuideUnsavedActions {
  save: () => Promise<boolean>;
  discard: () => void;
}

interface BrandingGuideContentProps {
  businessId: string;
  activeSubTab: BrandingGuideSubTab;
  onSubTabChange?: (tab: BrandingGuideSubTab) => void;
  apiBasePath?: string;
  onDirtyChange?: (dirty: boolean) => void;
  onRegisterUnsavedActions?: (actions: BrandingGuideUnsavedActions | null) => void;
}

export function BrandingGuideContent({
  businessId,
  activeSubTab,
  onSubTabChange,
  apiBasePath = '/api/admin/branding-guide',
  onDirtyChange,
  onRegisterUnsavedActions,
}: BrandingGuideContentProps) {
  const [data, setData] = useState<BrandingGuideData>(initialBrandingGuideData);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!businessId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${apiBasePath}/${businessId}`);
      if (res.ok) {
        const json = await res.json();
        setData({ ...initialBrandingGuideData, ...json.data });
      }
    } catch (error) {
      console.error('Failed to fetch branding guide:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, [businessId, apiBasePath]);

  const handleSave = async (updates: Partial<BrandingGuideData>) => {
    const res = await fetch(`${apiBasePath}/${businessId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      console.error('Branding Guide save failed:', errorData);
      return false;
    }

    setData((prev) => ({ ...prev, ...updates }));
    return true;
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center py-20'>
        <div className='text-center'>
          <div className='mx-auto h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-emerald-400' />
          <p className='mt-4 text-neutral-400'>Loading branding guide...</p>
        </div>
      </div>
    );
  }

  if (!businessId) {
    return (
      <div className='rounded-xl bg-zinc-900 p-8 text-center'>
        <p className='text-neutral-400'>No business found for this customer.</p>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      {activeSubTab === 'style' && (
        <StyleStudio
          data={data}
          onSave={handleSave}
          onDirtyChange={onDirtyChange}
          onRegisterUnsavedActions={onRegisterUnsavedActions}
        />
      )}
      {activeSubTab === 'inspiration' && (
        <InspirationSection
          data={data}
          onSave={handleSave}
          onDirtyChange={onDirtyChange}
          onRegisterUnsavedActions={onRegisterUnsavedActions}
        />
      )}
    </div>
  );
}
