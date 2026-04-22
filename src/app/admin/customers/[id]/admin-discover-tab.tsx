'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  IoCheckmark,
  IoClose,
  IoStorefront,
  IoCall,
  IoMail,
  IoLocationSharp,
  IoTime,
  IoLogoFacebook,
  IoLogoInstagram,
  IoGlobe,
  IoColorPalette,
  IoImage,
  IoPricetag,
  IoSparkles,
  IoArrowForward,
  IoRefresh,
  IoSearch,
} from 'react-icons/io5';

import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn';
import { AdminSection } from '@/components/admin/section';
import type { Business, BrandAsset } from '@/types/database';

interface DiscoveryItem {
  id: string;
  field_type: string;
  field_value: any;
  source: string;
  source_url?: string;
  confidence: number;
  status: 'pending' | 'confirmed' | 'declined';
}

interface AdminDiscoverTabProps {
  userId: string;
  business: Business | null;
  brandAssets: BrandAsset | null;
  onRefresh: () => void;
}

const FIELD_ICONS: Record<string, React.ReactNode> = {
  business_name: <IoStorefront className="h-5 w-5" />,
  phone: <IoCall className="h-5 w-5" />,
  email: <IoMail className="h-5 w-5" />,
  address: <IoLocationSharp className="h-5 w-5" />,
  hours: <IoTime className="h-5 w-5" />,
  facebook: <IoLogoFacebook className="h-5 w-5" />,
  instagram: <IoLogoInstagram className="h-5 w-5" />,
  website: <IoGlobe className="h-5 w-5" />,
  logo: <IoImage className="h-5 w-5" />,
  brand_colors: <IoColorPalette className="h-5 w-5" />,
  services: <IoPricetag className="h-5 w-5" />,
  description: <IoStorefront className="h-5 w-5" />,
  tagline: <IoSparkles className="h-5 w-5" />,
  social_facebook: <IoLogoFacebook className="h-5 w-5" />,
  social_instagram: <IoLogoInstagram className="h-5 w-5" />,
  social_youtube: <IoGlobe className="h-5 w-5" />,
  social_linkedin: <IoGlobe className="h-5 w-5" />,
  social_x: <IoGlobe className="h-5 w-5" />,
  social_tiktok: <IoGlobe className="h-5 w-5" />,
  social_gbp: <IoGlobe className="h-5 w-5" />,
  social_yelp: <IoGlobe className="h-5 w-5" />,
  social_bbb: <IoGlobe className="h-5 w-5" />,
  industry: <IoStorefront className="h-5 w-5" />,
  related_business: <IoStorefront className="h-5 w-5" />,
};

const FIELD_LABELS: Record<string, string> = {
  business_name: 'Business Name',
  phone: 'Phone Number',
  email: 'Email Address',
  address: 'Address',
  hours: 'Business Hours',
  facebook: 'Facebook Page',
  instagram: 'Instagram',
  website: 'Website',
  logo: 'Logo',
  brand_colors: 'Brand Colors',
  services: 'Services',
  description: 'Description',
  tagline: 'Tagline',
  social_facebook: 'Facebook',
  social_instagram: 'Instagram',
  social_youtube: 'YouTube',
  social_linkedin: 'LinkedIn',
  social_x: 'X (Twitter)',
  social_tiktok: 'TikTok',
  social_gbp: 'Google Business',
  social_yelp: 'Yelp',
  social_bbb: 'Better Business Bureau',
  industry: 'Industry',
  related_business: 'Related Business',
};

const ENTRY_TYPES = [
  { id: 'website', label: 'Website URL', placeholder: 'https://example.com' },
  { id: 'phone', label: 'Phone Number', placeholder: '(555) 123-4567' },
  { id: 'facebook', label: 'Facebook Page', placeholder: 'https://facebook.com/business' },
  { id: 'gbp', label: 'Google Business Profile', placeholder: 'https://g.co/kgs/...' },
  { id: 'name_city', label: 'Business Name + City', placeholder: 'Business Name' },
];

export function AdminDiscoverTab({ userId, business, brandAssets, onRefresh }: AdminDiscoverTabProps) {
  // Phase state: 'entry' | 'discovering' | 'feed'
  const [phase, setPhase] = useState<'entry' | 'discovering' | 'feed'>('entry');
  
  // Entry form state
  const [entryType, setEntryType] = useState('website');
  const [entryValue, setEntryValue] = useState('');
  const [entryValueSecondary, setEntryValueSecondary] = useState(''); // For name_city
  
  // Discovery state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [items, setItems] = useState<DiscoveryItem[]>([]);
  const [status, setStatus] = useState<'running' | 'awaiting_confirmation' | 'completed' | 'failed'>('running');
  const [isPolling, setIsPolling] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Build a map of known values for each entry type from existing data
  const ba = brandAssets as any;
  const biz = business as any;
  const knownValues: Record<string, { value: string; secondary?: string }> = {};
  if (ba?.existing_website_url) knownValues.website = { value: ba.existing_website_url };
  if (biz?.phone_primary) knownValues.phone = { value: biz.phone_primary };
  if (ba?.social_facebook || ba?.facebook_page_url) knownValues.facebook = { value: ba.social_facebook || ba.facebook_page_url };
  if (ba?.social_google_business) knownValues.gbp = { value: ba.social_google_business };
  if (biz?.business_name) knownValues.name_city = { value: biz.business_name, secondary: biz.location_city || '' };

  const handleEntryTypeChange = (type: string) => {
    setEntryType(type);
    const known = knownValues[type];
    if (known) {
      setEntryValue(known.value);
      setEntryValueSecondary(known.secondary || '');
    } else {
      setEntryValue('');
      setEntryValueSecondary('');
    }
  };

  // Pre-fill entry value from existing business/brand data on mount
  useEffect(() => {
    if (knownValues.website) {
      setEntryType('website');
      setEntryValue(knownValues.website.value);
    } else if (knownValues.facebook) {
      setEntryType('facebook');
      setEntryValue(knownValues.facebook.value);
    } else if (knownValues.name_city) {
      setEntryType('name_city');
      setEntryValue(knownValues.name_city.value);
      setEntryValueSecondary(knownValues.name_city.secondary || '');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business, brandAssets]);

  // Start discovery
  async function handleStartDiscovery() {
    if (!entryValue.trim()) {
      setError('Please enter a value');
      return;
    }

    setError(null);
    setPhase('discovering');
    setStartTime(Date.now());

    try {
      const response = await fetch('/api/onboarding/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          entryType,
          entryValue: entryValue.trim(),
          entryValueSecondary: entryValueSecondary.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to start discovery');
      }

      const data = await response.json();
      setSessionId(data.sessionId);
      setIsPolling(true);
      setPhase('feed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start discovery');
      setPhase('entry');
    }
  }

  // Poll for items
  const fetchItems = useCallback(async () => {
    if (!sessionId) return;

    try {
      const response = await fetch(`/api/onboarding/discover/${sessionId}`);
      if (!response.ok) return;

      const data = await response.json();
      setItems(data.items || []);
      setStatus(data.status);

      if (data.status === 'awaiting_confirmation' || data.status === 'completed' || data.status === 'failed') {
        setIsPolling(false);
      }
    } catch (err) {
      console.error('Failed to fetch discovery items:', err);
    }
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    
    fetchItems();

    if (isPolling) {
      // Poll every 500ms for real-time feel
      const interval = setInterval(fetchItems, 500);
      return () => clearInterval(interval);
    }
  }, [fetchItems, isPolling, sessionId]);

  // Track elapsed time
  useEffect(() => {
    if (!startTime || status !== 'running') return;
    
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    
    return () => clearInterval(interval);
  }, [startTime, status]);

  // Confirm/decline items
  async function handleConfirm(itemId: string) {
    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, status: 'confirmed' } : item))
    );

    await fetch(`/api/onboarding/discover/${sessionId}/items/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'confirmed' }),
    });
  }

  async function handleDecline(itemId: string) {
    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, status: 'declined' } : item))
    );

    await fetch(`/api/onboarding/discover/${sessionId}/items/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'declined' }),
    });
  }

  async function handleConfirmAll() {
    const targetItems = items.filter(i => i.status !== 'confirmed' && i.field_type !== '_progress');
    setItems(prev => prev.map(item => item.field_type !== '_progress' ? { ...item, status: 'confirmed' } : item));
    await Promise.all(
      targetItems.map(item =>
        fetch(`/api/onboarding/discover/${sessionId}/items/${item.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'confirmed' }),
        })
      )
    );
  }

  async function handleDeclineAll() {
    const targetItems = items.filter(i => i.status !== 'declined' && i.field_type !== '_progress');
    setItems(prev => prev.map(item => item.field_type !== '_progress' ? { ...item, status: 'declined' } : item));
    await Promise.all(
      targetItems.map(item =>
        fetch(`/api/onboarding/discover/${sessionId}/items/${item.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'declined' }),
        })
      )
    );
  }

  // Save confirmed items to business
  async function handleSaveToCustomer() {
    if (!sessionId) return;
    
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/onboarding/discover/${sessionId}/finalize`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to save discovery data');
      }

      // Refresh the page data
      onRefresh();
      
      // Reset to entry phase
      setPhase('entry');
      setSessionId(null);
      setItems([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSubmitting(false);
    }
  }

  // Reset to start over
  function handleReset() {
    setPhase('entry');
    setSessionId(null);
    setItems([]);
    setStatus('running');
    setIsPolling(false);
    setError(null);
    setStartTime(null);
    setElapsedTime(0);
  }

  // Separate progress items from real items
  const progressItems = items.filter((i) => i.field_type === '_progress');
  const realItems = items.filter((i) => i.field_type !== '_progress');
  const confirmedCount = realItems.filter((i) => i.status === 'confirmed').length;
  const pendingCount = realItems.filter((i) => i.status === 'pending').length;

  // Group items by field_type for display
  const FIELD_ORDER: string[] = [
    'business_name', 'website', 'phone', 'email', 'address',
    'social_facebook', 'social_instagram', 'social_youtube', 'social_linkedin',
    'social_x', 'social_tiktok', 'social_gbp', 'social_yelp', 'social_bbb',
    'hours', 'services', 'description', 'tagline', 'industry',
    'logo', 'brand_colors', 'related_business',
  ];
  const groupedItems: { type: string; items: DiscoveryItem[] }[] = [];
  const grouped = new Map<string, DiscoveryItem[]>();
  for (const item of realItems) {
    const list = grouped.get(item.field_type) || [];
    list.push(item);
    grouped.set(item.field_type, list);
  }
  // Add in defined order first, then any remaining types
  for (const type of FIELD_ORDER) {
    const list = grouped.get(type);
    if (list && list.length > 0) {
      groupedItems.push({ type, items: list });
      grouped.delete(type);
    }
  }
  for (const [type, list] of grouped) {
    groupedItems.push({ type, items: list });
  }

  // Render value for display
  function renderValue(fieldType: string, value: any): string {
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'object' && value !== null) {
      // Related business object
      if (fieldType === 'related_business' || value.name) {
        const name = value.name || 'Unknown';
        const url = value.websiteUrl;
        return url ? `${name} — ${url}` : name;
      }
      // Address object
      if (value.street || value.city) {
        return [value.street, value.city, value.state, value.zip].filter(Boolean).join(', ');
      }
      // Hours object
      return Object.entries(value)
        .map(([day, hours]) => `${day}: ${typeof hours === 'string' ? hours : JSON.stringify(hours)}`)
        .join('; ');
    }
    return String(value);
  }

  // Entry Phase
  if (phase === 'entry') {
    return (
      <div className="space-y-6">
        <AdminSection>
          <h3 className="mb-4 text-lg font-semibold flex items-center gap-2">
            <IoSearch className="h-5 w-5 text-emerald-400" />
            Discover Business Information
          </h3>
          <p className="mb-6 text-sm text-neutral-400">
            Enter one piece of information and we&apos;ll automatically find and extract business details from public sources.
          </p>

          {error && (
            <div className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Entry Type Selection */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-neutral-300">
              What information do you have?
            </label>
            <div className="flex flex-wrap gap-2">
              {ENTRY_TYPES.map((type) => (
                <button
                  key={type.id}
                  onClick={() => handleEntryTypeChange(type.id)}
                  className={cn(
                    'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                    entryType === type.id
                      ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/50'
                      : 'bg-zinc-800 text-neutral-400 hover:bg-zinc-700 hover:text-white'
                  )}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Entry Value Input */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-neutral-300">
              {ENTRY_TYPES.find((t) => t.id === entryType)?.label}
            </label>
            <input
              type="text"
              value={entryValue}
              onChange={(e) => setEntryValue(e.target.value)}
              placeholder={ENTRY_TYPES.find((t) => t.id === entryType)?.placeholder}
              className="w-full rounded-lg border border-zinc-200 bg-transparent px-4 py-3 text-white placeholder-neutral-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-800"
            />
          </div>

          {/* Secondary input for name_city */}
          {entryType === 'name_city' && (
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-neutral-300">
                City
              </label>
              <input
                type="text"
                value={entryValueSecondary}
                onChange={(e) => setEntryValueSecondary(e.target.value)}
                placeholder="City name"
                className="w-full rounded-lg border border-zinc-200 bg-transparent px-4 py-3 text-white placeholder-neutral-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-800"
              />
            </div>
          )}

          <Button
            onClick={handleStartDiscovery}
            disabled={!entryValue.trim()}
            variant="emerald"
            className="w-full"
          >
            <IoSearch className="mr-2 h-4 w-4" />
            Start Discovery
          </Button>
        </AdminSection>

        {/* Show existing data that will be used */}
        {(business || brandAssets) && (() => {
          const rows: { label: string; value: string }[] = [];
          if (biz?.business_name) rows.push({ label: 'Business Name', value: biz.business_name });
          if (biz?.phone_primary) rows.push({ label: 'Phone', value: biz.phone_primary });
          if (biz?.email) rows.push({ label: 'Email', value: biz.email });
          const addr = [biz?.address_street, biz?.location_city, biz?.location_state, biz?.address_zip].filter(Boolean).join(', ');
          if (addr) rows.push({ label: 'Address', value: addr });
          if (ba?.existing_website_url) rows.push({ label: 'Website', value: ba.existing_website_url });
          if (ba?.social_facebook || ba?.facebook_page_url) rows.push({ label: 'Facebook', value: ba.social_facebook || ba.facebook_page_url });
          if (ba?.social_instagram) rows.push({ label: 'Instagram', value: ba.social_instagram });
          if (ba?.social_google_business) rows.push({ label: 'Google Business', value: ba.social_google_business });
          if (ba?.social_youtube) rows.push({ label: 'YouTube', value: ba.social_youtube });
          if (ba?.social_linkedin) rows.push({ label: 'LinkedIn', value: ba.social_linkedin });
          if (ba?.social_x) rows.push({ label: 'X (Twitter)', value: ba.social_x });
          if (ba?.social_tiktok) rows.push({ label: 'TikTok', value: ba.social_tiktok });
          if (ba?.social_yelp) rows.push({ label: 'Yelp', value: ba.social_yelp });

          if (rows.length === 0) return null;

          return (
            <AdminSection>
              <h4 className="mb-3 text-sm font-semibold text-neutral-300">Existing Customer Data</h4>
              <div className="grid gap-2 text-sm">
                {rows.map(r => (
                  <div key={r.label} className="flex justify-between gap-4">
                    <span className="text-neutral-500 shrink-0">{r.label}:</span>
                    <span className="truncate text-right">{r.value}</span>
                  </div>
                ))}
              </div>
            </AdminSection>
          );
        })()}
      </div>
    );
  }

  // Discovering Phase (loading)
  if (phase === 'discovering') {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
        <p className="text-neutral-400">Starting discovery...</p>
      </div>
    );
  }

  // Feed Phase
  return (
    <div className="space-y-6">
      {/* Header */}
      <AdminSection>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Discovery Results</h3>
          <p className="text-sm text-neutral-400">
            {status === 'running' 
              ? `Searching... ${realItems.length > 0 ? `(${realItems.length} found so far)` : ''}` 
              : `Found ${realItems.length} items`}
            {confirmedCount > 0 && ` • ${confirmedCount} confirmed`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset} className="border-zinc-700">
            <IoRefresh className="mr-2 h-4 w-4" />
            Start Over
          </Button>
        </div>
      </div>
      </AdminSection>

      {/* Progress feed - shows real-time status updates */}
      {status === 'running' && progressItems.length > 0 && (
        <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 animate-pulse rounded-full bg-blue-500" />
              <span className="text-sm font-medium text-blue-400">Discovery in progress...</span>
            </div>
            <span className="text-xs text-neutral-500 font-mono">{elapsedTime}s</span>
          </div>
          <div className="space-y-2 font-mono text-sm">
            {progressItems.map((item, idx) => (
              <div 
                key={item.id} 
                className={cn(
                  "text-neutral-300 transition-opacity",
                  idx === progressItems.length - 1 ? "opacity-100" : "opacity-50"
                )}
              >
                {item.field_value}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status indicator when no progress items yet */}
      {status === 'running' && progressItems.length === 0 && (
        <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
              <span className="text-sm text-blue-400">Initializing discovery...</span>
            </div>
            <span className="text-xs text-neutral-500 font-mono">{elapsedTime}s</span>
          </div>
          {elapsedTime > 30 && (
            <p className="mt-2 text-xs text-yellow-500">
              Taking longer than expected. The website may be slow to respond.
            </p>
          )}
        </div>
      )}

      {/* Check All / Uncheck All buttons */}
      {realItems.length > 0 && (
        <div className="mb-4 flex items-center gap-3">
          <button
            onClick={handleConfirmAll}
            className="flex items-center gap-2 rounded-lg bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-400 hover:bg-emerald-500/30 transition-colors"
          >
            <IoCheckmark className="h-4 w-4" />
            Check All
          </button>
          <button
            onClick={handleDeclineAll}
            className="flex items-center gap-2 rounded-lg bg-zinc-700 px-4 py-2 text-sm font-medium text-neutral-300 hover:bg-zinc-600 transition-colors"
          >
            Uncheck All
          </button>
        </div>
      )}

      {/* Items list - grouped by type */}
      <AdminSection>
      <div className="space-y-6">
        {groupedItems.map((group) => (
          <div key={group.type}>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-neutral-400">
              <span className="text-neutral-500">{FIELD_ICONS[group.type] || <IoGlobe className="h-4 w-4" />}</span>
              {FIELD_LABELS[group.type] || group.type}
              {group.items.length > 1 && (
                <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-neutral-500">{group.items.length}</span>
              )}
            </div>
            <div className="space-y-2">
              {group.items.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    'rounded-xl border p-4 transition-all',
                    item.status === 'confirmed'
                      ? 'border-emerald-500/50 bg-emerald-500/10'
                      : item.status === 'declined'
                      ? 'border-zinc-700 bg-zinc-800/50 opacity-50'
                      : 'border-zinc-700 bg-zinc-900'
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-white break-words">{renderValue(item.field_type, item.field_value)}</p>
                      <p className="mt-1 text-xs text-neutral-500">
                        {item.source_url ? (
                          <>Source: <a href={item.source_url} target="_blank" rel="noopener noreferrer" className="underline hover:text-neutral-300">{item.source_url}</a></>
                        ) : (
                          <>Source: {item.source}</>
                        )}
                        {' '}• Confidence: {Math.round(item.confidence * 100)}%
                      </p>
                    </div>

                    <button
                      onClick={() => item.status === 'confirmed' ? handleDecline(item.id) : handleConfirm(item.id)}
                      className={cn(
                        'flex h-6 w-6 items-center justify-center rounded border-2 transition-colors flex-shrink-0',
                        item.status === 'confirmed'
                          ? 'border-emerald-500 bg-emerald-500 text-black'
                          : 'border-zinc-600 bg-transparent hover:border-zinc-500'
                      )}
                      title={item.status === 'confirmed' ? 'Uncheck to decline' : 'Check to accept'}
                    >
                      {item.status === 'confirmed' && <IoCheckmark className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {items.length === 0 && status !== 'running' && (
          <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-8 text-center">
            <p className="text-neutral-400">No information found</p>
          </div>
        )}
      </div>
      </AdminSection>

      {/* Save button */}
      {items.length > 0 && status !== 'running' && (
        <div className="flex justify-end gap-3">
          <Button
            onClick={handleSaveToCustomer}
            disabled={isSubmitting || pendingCount > 0}
            variant="emerald"
          >
            {isSubmitting ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
                Saving...
              </>
            ) : (
              <>
                <IoArrowForward className="mr-2 h-4 w-4" />
                Save {confirmedCount} Items to Customer
              </>
            )}
          </Button>
        </div>
      )}

      {pendingCount > 0 && status !== 'running' && (
        <p className="text-center text-sm text-warning-foreground bg-warning/20 rounded-lg px-4 py-2">
          Please confirm or decline all {pendingCount} pending items before saving
        </p>
      )}
    </div>
  );
}
