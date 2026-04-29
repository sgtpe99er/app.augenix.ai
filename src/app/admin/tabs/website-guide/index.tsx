'use client';

import { useEffect,useState } from 'react';
import {
  IoBusiness,
  IoChevronBack,
  IoChevronForward,
  IoExtensionPuzzle,
  IoGlobe,
  IoList,
  IoMail,
  IoSearch,
  IoShareSocial,
} from 'react-icons/io5';

import { cn } from '@/utils/cn';

import { BusinessBasicsSection } from './sections/business-basics';
import { DomainSection } from './sections/domain';
import { EmailSection } from './sections/email';
import { OnlinePresenceSection } from './sections/online-presence';
import { OverviewSection } from './sections/overview';
import { SeoTargetMarketSection } from './sections/seo-target-market';
import { WebsiteFeaturesSection } from './sections/website-features';
import { initialWebsiteGuideData, WEBSITE_GUIDE_FIELDS,WebsiteGuideData } from './types';

export type WebsiteGuideSubTab = 'overview' | 'business' | 'domain' | 'email' | 'presence' | 'seo' | 'features';

const subTabs = [
  { id: 'overview' as WebsiteGuideSubTab, label: 'Overview', icon: IoList },
  { id: 'business' as WebsiteGuideSubTab, label: 'Business Basics', icon: IoBusiness },
  { id: 'domain' as WebsiteGuideSubTab, label: 'Domain', icon: IoGlobe },
  { id: 'email' as WebsiteGuideSubTab, label: 'Email', icon: IoMail },
  { id: 'presence' as WebsiteGuideSubTab, label: 'Online Presence', icon: IoShareSocial },
  { id: 'seo' as WebsiteGuideSubTab, label: 'SEO & Target Market', icon: IoSearch },
  { id: 'features' as WebsiteGuideSubTab, label: 'Website Features', icon: IoExtensionPuzzle },
];

interface WebsiteGuideSidebarProps {
  activeSubTab: WebsiteGuideSubTab;
  onSubTabChange: (tab: WebsiteGuideSubTab) => void;
  onBack: () => void;
  items?: typeof subTabs;
}

export function WebsiteGuideSidebar({
  activeSubTab,
  onSubTabChange,
  onBack,
  items = subTabs,
}: WebsiteGuideSidebarProps) {
  return (
    <nav className="flex flex-col gap-1">
      {/* Back button header */}
      <button
        onClick={onBack}
        className="mb-2 flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-neutral-400 hover:bg-zinc-800 hover:text-white transition-colors"
      >
        <IoChevronBack className="h-4 w-4" />
        <span>Website Guide</span>
      </button>

      {/* Sub-tabs */}
      {items.map((tab) => (
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
          <tab.icon className="h-4 w-4 shrink-0" />
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}

interface WebsiteGuideMenuItemProps {
  onClick: () => void;
  isActive: boolean;
}

export function WebsiteGuideMenuItem({ onClick, isActive }: WebsiteGuideMenuItemProps) {
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
      <span className="flex items-center gap-2">
        <IoList className="h-4 w-4 shrink-0" />
        <span>Website Guide</span>
      </span>
      <IoChevronForward className="h-4 w-4" />
    </button>
  );
}

interface WebsiteGuideContentProps {
  businessId: string;
  activeSubTab: WebsiteGuideSubTab;
  onSubTabChange?: (tab: WebsiteGuideSubTab) => void;
  apiBasePath?: string;
  reviewTitle?: string;
  reviewInstructions?: string;
  showReviewApproval?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
  onRegisterUnsavedActions?: (actions: WebsiteGuideUnsavedActions | null) => void;
}

export interface WebsiteGuideUnsavedActions {
  save: () => Promise<boolean>;
  discard: () => void;
}

export function WebsiteGuideContent({
  businessId,
  activeSubTab,
  onSubTabChange,
  apiBasePath = '/api/admin/website-guide',
  reviewTitle,
  reviewInstructions,
  showReviewApproval = false,
  onDirtyChange,
  onRegisterUnsavedActions,
}: WebsiteGuideContentProps) {
  const [data, setData] = useState<WebsiteGuideData>(initialWebsiteGuideData);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);
  const [missingRequiredFields, setMissingRequiredFields] = useState<string[]>([]);

  useEffect(() => {
    if (!businessId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${apiBasePath}/${businessId}`);
        if (res.ok) {
          const json = await res.json();
          setData({ ...initialWebsiteGuideData, ...json.data });
        }
      } catch (err) {
        console.error('Failed to fetch website guide:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [businessId, apiBasePath]);

  useEffect(() => {
    if (activeSubTab === 'overview') {
      onDirtyChange?.(false);
      onRegisterUnsavedActions?.(null);
    }
  }, [activeSubTab, onDirtyChange, onRegisterUnsavedActions]);

  const handleSave = async (updates: Partial<WebsiteGuideData>): Promise<boolean> => {
    if (!businessId) return false;
    setSaving(true);
    try {
      console.log('Website Guide - saving updates:', updates);
      const res = await fetch(`${apiBasePath}/${businessId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        console.log('Website Guide - save successful, updating state');
        setData((prev) => ({ ...prev, ...updates }));
        return true;
      } else {
        const errorData = await res.json();
        console.error('Website Guide - save failed:', errorData);
        return false;
      }
    } catch (err) {
      console.error('Failed to save:', err);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!businessId) return;
    const missingCriticalFields = WEBSITE_GUIDE_FIELDS.flatMap((section) =>
      section.fields
        .filter((field) => field.critical)
        .filter((field) => {
          const value = data[field.key];

          if (value === null || value === undefined || value === '') {
            return true;
          }

          if (Array.isArray(value)) {
            return value.length === 0;
          }

          if (typeof value === 'object') {
            return Object.keys(value).length === 0;
          }

          return false;
        })
        .map((field) => `${section.section}: ${field.label}`)
    );

    if (missingCriticalFields.length > 0) {
      setApprovalError('Complete these required fields before approving:');
      setMissingRequiredFields(missingCriticalFields);
      return;
    }

    setApprovalError(null);
    setMissingRequiredFields([]);
    setApproving(true);
    const approvedAt = new Date().toISOString();

    try {
      const res = await fetch(`${apiBasePath}/${businessId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ websiteGuideApprovedAt: approvedAt }),
      });
      if (res.ok) {
        setData((prev) => ({ ...prev, websiteGuideApprovedAt: approvedAt }));
      } else {
        const errorData = await res.json();
        console.error('Website Guide - approval failed:', errorData);
      }
    } catch (err) {
      console.error('Failed to approve website guide:', err);
    } finally {
      setApproving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-emerald-400" />
          <p className="mt-4 text-neutral-400">Loading website guide...</p>
        </div>
      </div>
    );
  }

  if (!businessId) {
    return (
      <div className="rounded-xl bg-zinc-900 p-8 text-center">
        <p className="text-neutral-400">No business found for this customer.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {activeSubTab === 'overview' && (
        <OverviewSection
          data={data}
          onNavigate={onSubTabChange}
          title={reviewTitle}
          instructions={reviewInstructions}
          showApprovalSummary={showReviewApproval}
          onApprove={showReviewApproval ? handleApprove : undefined}
          approving={approving}
          approvalError={approvalError}
          missingRequiredFields={missingRequiredFields}
        />
      )}
      {activeSubTab === 'business' && (
        <BusinessBasicsSection
          data={data}
          onSave={handleSave}
          onDirtyChange={onDirtyChange}
          onRegisterUnsavedActions={onRegisterUnsavedActions}
        />
      )}
      {activeSubTab === 'domain' && (
        <DomainSection
          data={data}
          onSave={handleSave}
          onDirtyChange={onDirtyChange}
          onRegisterUnsavedActions={onRegisterUnsavedActions}
        />
      )}
      {activeSubTab === 'email' && (
        <EmailSection
          data={data}
          onSave={handleSave}
          onDirtyChange={onDirtyChange}
          onRegisterUnsavedActions={onRegisterUnsavedActions}
        />
      )}
      {activeSubTab === 'presence' && (
        <OnlinePresenceSection
          data={data}
          onSave={handleSave}
          onDirtyChange={onDirtyChange}
          onRegisterUnsavedActions={onRegisterUnsavedActions}
        />
      )}
      {activeSubTab === 'seo' && (
        <SeoTargetMarketSection
          data={data}
          onSave={handleSave}
          onDirtyChange={onDirtyChange}
          onRegisterUnsavedActions={onRegisterUnsavedActions}
        />
      )}
      {activeSubTab === 'features' && (
        <WebsiteFeaturesSection
          data={data}
          onSave={handleSave}
          onDirtyChange={onDirtyChange}
          onRegisterUnsavedActions={onRegisterUnsavedActions}
        />
      )}
    </div>
  );
}

export { subTabs as websiteGuideSubTabs };
