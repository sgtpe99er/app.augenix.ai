'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
} from 'react-icons/io5';

import { Container } from '@/components/container';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn';

interface DiscoveryItem {
  id: string;
  field_type: string;
  field_value: any;
  source: string;
  source_url?: string;
  confidence: number;
  status: 'pending' | 'confirmed' | 'declined';
}

interface DiscoveryFeedProps {
  sessionId: string;
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
  related_business: 'Related Business',
};

export function DiscoveryFeed({ sessionId }: DiscoveryFeedProps) {
  const router = useRouter();
  const [items, setItems] = useState<DiscoveryItem[]>([]);
  const [status, setStatus] = useState<'running' | 'awaiting_confirmation' | 'completed' | 'failed'>('running');
  const [isPolling, setIsPolling] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchItems = useCallback(async () => {
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
    fetchItems();

    if (isPolling) {
      const interval = setInterval(fetchItems, 500);
      return () => clearInterval(interval);
    }
  }, [fetchItems, isPolling]);

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
    const targetItems = items.filter(i => i.status !== 'confirmed');
    setItems(prev => prev.map(item => ({ ...item, status: 'confirmed' })));
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
    const targetItems = items.filter(i => i.status !== 'declined');
    setItems(prev => prev.map(item => ({ ...item, status: 'declined' })));
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

  async function handleContinue() {
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/onboarding/discover/${sessionId}/finalize`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to finalize discovery');
      }

      router.push(`/onboarding?discovery=${sessionId}`);
    } catch (err) {
      console.error('Failed to finalize:', err);
      setIsSubmitting(false);
    }
  }

  const confirmedCount = items.filter((i) => i.status === 'confirmed').length;
  const declinedCount = items.filter((i) => i.status === 'declined').length;
  const pendingCount = items.filter((i) => i.status === 'pending').length;

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
  for (const item of items) {
    const list = grouped.get(item.field_type) || [];
    list.push(item);
    grouped.set(item.field_type, list);
  }
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

  function formatValue(fieldType: string, value: any): string {
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'object' && value !== null) {
      // Related business object
      if (fieldType === 'related_business' || value.name) {
        const name = value.name || 'Unknown';
        const url = value.websiteUrl;
        return url ? `${name} \u2014 ${url}` : name;
      }
      if (fieldType === 'address') {
        const { street, city, state, zip, country } = value;
        return [street, city, state, zip, country].filter(Boolean).join(', ');
      }
      if (fieldType === 'hours') {
        return Object.entries(value)
          .map(([day, hours]) => `${day}: ${hours}`)
          .join(', ');
      }
      return JSON.stringify(value);
    }
    return String(value);
  }

  return (
    <div className="min-h-screen bg-white py-12">
      <Container className="max-w-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            {status === 'running' ? (
              <IoRefresh className="h-8 w-8 text-emerald-600 animate-spin" />
            ) : (
              <IoSparkles className="h-8 w-8 text-emerald-600" />
            )}
          </div>
          <h1 className="mb-2 text-3xl font-bold">
            {status === 'running' ? 'Finding your business info...' : 'Review your information'}
          </h1>
          <p className="text-gray-600">
            {status === 'running'
              ? 'Confirm or decline each item as we find it.'
              : 'Confirm the items you want to use, then continue.'}
          </p>
        </div>

        {/* Stats bar */}
        <div className="mb-6 flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-emerald-500" />
            <span className="text-gray-700">Confirmed: {confirmedCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-red-500" />
            <span className="text-gray-700">Declined: {declinedCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-zinc-500" />
            <span className="text-gray-700">Pending: {pendingCount}</span>
          </div>
        </div>

        {/* Check All / Uncheck All buttons */}
        {items.length > 0 && (
          <div className="mb-4 flex items-center justify-center gap-3">
            <button
              onClick={handleConfirmAll}
              className="flex items-center gap-2 rounded-lg bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-200 transition-colors"
            >
              <IoCheckmark className="h-4 w-4" />
              Check All
            </button>
            <button
              onClick={handleDeclineAll}
              className="flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
            >
              Uncheck All
            </button>
          </div>
        )}

        {/* Items feed - grouped by type */}
        <div className="space-y-6">
          {items.length === 0 && status === 'running' && (
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
              <IoRefresh className="mx-auto h-8 w-8 text-gray-400 animate-spin" />
              <p className="mt-4 text-gray-500">Searching for your business information...</p>
            </div>
          )}

          {groupedItems.map((group) => (
            <div key={group.type}>
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-500">
                <span className="text-gray-400">{FIELD_ICONS[group.type] || <IoStorefront className="h-4 w-4" />}</span>
                {FIELD_LABELS[group.type] || group.type}
                {group.items.length > 1 && (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">{group.items.length}</span>
                )}
              </div>
              <div className="space-y-2">
                {group.items.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      'rounded-xl border p-4 transition-all',
                      item.status === 'confirmed' && 'border-emerald-500 bg-emerald-50',
                      item.status === 'declined' && 'border-red-300 bg-red-50 opacity-50',
                      item.status === 'pending' && 'border-gray-200 bg-white shadow-sm'
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            'font-medium break-words',
                            item.status === 'declined' && 'line-through'
                          )}
                        >
                          {formatValue(item.field_type, item.field_value)}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {item.source_url ? (
                            <>Found on: <a href={item.source_url} target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-700">{item.source_url}</a></>
                          ) : (
                            <>Source: {item.source}</>
                          )}
                        </p>
                      </div>

                      <button
                        onClick={() => item.status === 'confirmed' ? handleDecline(item.id) : handleConfirm(item.id)}
                        className={cn(
                          'flex h-6 w-6 items-center justify-center rounded border-2 transition-colors flex-shrink-0',
                          item.status === 'confirmed'
                            ? 'border-emerald-500 bg-emerald-500 text-white'
                            : 'border-gray-300 bg-transparent hover:border-gray-400'
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
        </div>

        {/* Continue button */}
        {(status !== 'running' || items.length > 0) && (
          <div className="mt-8">
            <Button
              onClick={handleContinue}
              disabled={isSubmitting}
              className="w-full bg-emerald-500 text-white hover:bg-emerald-600 disabled:bg-gray-300"
            >
              {isSubmitting ? (
                'Saving...'
              ) : (
                <>
                  Continue with {confirmedCount} confirmed items
                  <IoArrowForward className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
            <p className="mt-3 text-center text-sm text-gray-500">
              You can edit any information in the next steps
            </p>
          </div>
        )}
      </Container>
    </div>
  );
}
