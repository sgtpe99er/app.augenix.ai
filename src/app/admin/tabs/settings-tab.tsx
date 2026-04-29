'use client';

import { useEffect, useState } from 'react';
import { IoCash, IoCheckmark,IoMail, IoSave } from 'react-icons/io5';

import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn';

import { EmailSettingsTab } from '../settings/email-settings';
import { PricingSettingsTab } from '../settings/pricing-settings';
import { DEFAULT_EMAILS, DEFAULT_PRICING, EmailSettings, PricingSettings } from '../settings/settings-defaults';

type SettingsSubTab = 'pricing' | 'emails';

const SUB_TABS = [
  { id: 'pricing' as const, label: 'Pricing', icon: IoCash },
  { id: 'emails' as const, label: 'Email Templates', icon: IoMail },
];

export function SettingsTab() {
  const [activeSubTab, setActiveSubTab] = useState<SettingsSubTab>('pricing');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const [pricing, setPricing] = useState<PricingSettings>(DEFAULT_PRICING);
  const [emails, setEmails] = useState<EmailSettings>(DEFAULT_EMAILS);

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((data) => {
        if (data.pricing && Object.keys(data.pricing).length > 0) {
          setPricing({ ...DEFAULT_PRICING, ...data.pricing });
        }
        if (data.email_templates && Object.keys(data.email_templates).length > 0) {
          setEmails({ ...DEFAULT_EMAILS, ...data.email_templates });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setError('');
    setSaving(true);
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pricing, email_templates: emails }),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? 'Failed to save');
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div>
      {/* Header - Save button only */}
      <div className='mb-6 flex items-center justify-end gap-3'>
        {error && <p className='text-sm text-red-400'>{error}</p>}
        <Button
          onClick={handleSave}
          disabled={saving || loading}
          variant='emerald'
        >
          {saved ? (
            <>
              <IoCheckmark className='mr-2 h-4 w-4' />
              Saved
            </>
          ) : (
            <>
              <IoSave className='mr-2 h-4 w-4' />
              {saving ? 'Saving...' : 'Save Changes'}
            </>
          )}
        </Button>
      </div>

      {/* Sub-Tabs */}
      <div className='mb-6 flex gap-2 overflow-x-auto border-b border-zinc-200 dark:border-zinc-800 pb-2'>
        {SUB_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={cn(
              'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap',
              activeSubTab === tab.id
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'text-neutral-500 dark:text-neutral-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-black dark:hover:text-white'
            )}
          >
            <tab.icon className='h-4 w-4' />
            {tab.label}
          </button>
        ))}
      </div>

      {loading && <p className='text-sm text-neutral-400'>Loading settings...</p>}

      {!loading && activeSubTab === 'pricing' && (
        <PricingSettingsTab pricing={pricing} onChange={setPricing} />
      )}

      {!loading && activeSubTab === 'emails' && (
        <EmailSettingsTab emails={emails} onChange={setEmails} />
      )}
    </div>
  );
}
