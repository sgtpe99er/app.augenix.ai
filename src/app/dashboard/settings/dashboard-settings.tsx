'use client';

import { useState } from 'react';
import { IoBrush, IoCloudUpload, IoInformation,IoSave } from 'react-icons/io5';

import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn';

interface OrgData {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  brand_colors: Record<string, string> | null;
  brand_voice: string | null;
  industry: string | null;
  plan: string | null;
}

const PLAN_LABELS: Record<string, string> = {
  free: 'Free / Starter',
  website_pro: 'Website Pro',
  automation_pro: 'Automation Pro',
  enterprise: 'Enterprise',
};

export function DashboardSettings({ org }: { org: OrgData | null }) {
  const [name, setName] = useState(org?.name ?? '');
  const [industry, setIndustry] = useState(org?.industry ?? '');
  const [brandVoice, setBrandVoice] = useState(org?.brand_voice ?? '');
  const [primaryColor, setPrimaryColor] = useState(org?.brand_colors?.primary ?? '#000000');
  const [secondaryColor, setSecondaryColor] = useState(org?.brand_colors?.secondary ?? '#666666');
  const [accentColor, setAccentColor] = useState(org?.brand_colors?.accent ?? '#0066cc');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!org) return;
    setSaving(true);
    setSaved(false);

    try {
      const res = await fetch('/api/dashboard/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId: org.id,
          name,
          industry,
          brandVoice,
          brandColors: { primary: primaryColor, secondary: secondaryColor, accent: accentColor },
        }),
      });

      if (res.ok) setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  if (!org) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-on-surface-variant">No organization found. Please contact support.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-normal tracking-tight text-on-surface lg:text-4xl">Settings</h1>
        <p className="mt-2 text-on-surface-variant">
          Manage your organization&apos;s branding, voice, and preferences.
        </p>
      </div>

      {/* Plan info */}
      <div className="flex items-center gap-3 rounded-sm bg-surface-container-lowest p-4">
        <IoInformation className="h-5 w-5 shrink-0 text-on-primary-container" />
        <div>
          <p className="text-sm font-medium text-on-surface">
            Current Plan: <span className="text-on-primary-container">{PLAN_LABELS[org.plan ?? 'free'] ?? org.plan}</span>
          </p>
          <p className="text-xs text-on-surface-variant">
            Subdomain: <span className="font-mono">{org.slug}.augenix.ai</span>
          </p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Business info */}
        <div className="space-y-5">
          <h2 className="text-sm font-medium text-on-surface">Business Information</h2>

          <div>
            <label htmlFor="org-name" className="mb-2 block text-sm font-medium text-on-surface">
              Business Name
            </label>
            <input
              id="org-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-sm border border-outline-variant/20 bg-surface-container-lowest px-3 py-2.5 text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label htmlFor="industry" className="mb-2 block text-sm font-medium text-on-surface">
              Industry
            </label>
            <input
              id="industry"
              type="text"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="e.g. Plumbing, HVAC, Legal, Restaurant..."
              className="w-full rounded-sm border border-outline-variant/20 bg-surface-container-lowest px-3 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label htmlFor="brand-voice" className="mb-2 block text-sm font-medium text-on-surface">
              Brand Voice
            </label>
            <p className="mb-2 text-xs text-on-surface-variant">
              Describe how AI-generated content should sound for your brand.
            </p>
            <textarea
              id="brand-voice"
              value={brandVoice}
              onChange={(e) => setBrandVoice(e.target.value)}
              placeholder="e.g. Professional but friendly. Use simple language. Emphasize reliability and speed."
              rows={3}
              className="w-full resize-none rounded-sm border border-outline-variant/20 bg-surface-container-lowest px-3 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Logo upload */}
          <div>
            <label className="mb-2 block text-sm font-medium text-on-surface">Logo</label>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-sm border border-dashed border-outline-variant/40 bg-surface px-4 py-6 text-sm text-on-surface-variant transition-colors hover:border-on-primary-container hover:text-on-primary-container">
              <IoCloudUpload className="h-5 w-5" />
              {org.logo_url ? 'Replace logo' : 'Upload your logo'}
              <input type="file" accept="image/*" className="hidden" />
            </label>
          </div>
        </div>

        {/* Brand colors */}
        <div className="space-y-5">
          <h2 className="flex items-center gap-2 text-sm font-medium text-on-surface">
            <IoBrush className="h-4 w-4" />
            Brand Colors
          </h2>

          <div className="space-y-4">
            <ColorPicker label="Primary" value={primaryColor} onChange={setPrimaryColor} />
            <ColorPicker label="Secondary" value={secondaryColor} onChange={setSecondaryColor} />
            <ColorPicker label="Accent" value={accentColor} onChange={setAccentColor} />
          </div>

          {/* Preview */}
          <div>
            <p className="mb-2 text-xs font-medium text-on-surface-variant">Preview</p>
            <div className="overflow-hidden rounded-sm border border-outline-variant/20">
              <div className="p-4" style={{ backgroundColor: primaryColor }}>
                <p className="text-sm font-medium text-white">{name || 'Your Business'}</p>
              </div>
              <div className="p-4" style={{ backgroundColor: secondaryColor + '10' }}>
                <p className="text-sm" style={{ color: secondaryColor }}>Secondary content area</p>
              </div>
              <div className="flex items-center justify-center p-4">
                <span
                  className="rounded-sm px-4 py-2 text-sm font-medium text-white"
                  style={{ backgroundColor: accentColor }}
                >
                  Call to Action
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 border-t border-outline-variant/20 pt-6">
        <Button onClick={handleSave} disabled={saving} className="bg-primary text-primary-foreground hover:bg-primary/90">
          <IoSave className="mr-2 h-4 w-4" />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
        {saved && <span className="text-sm text-emerald-600 dark:text-emerald-400">Settings saved.</span>}
      </div>
    </div>
  );
}

function ColorPicker({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-9 cursor-pointer rounded-sm border border-outline-variant/20"
      />
      <div>
        <p className="text-sm font-medium text-on-surface">{label}</p>
        <p className="text-xs text-on-surface-variant">{value}</p>
      </div>
    </div>
  );
}
