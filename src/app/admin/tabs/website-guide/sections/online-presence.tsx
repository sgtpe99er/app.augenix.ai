'use client';

import { useEffect, useMemo, useState } from 'react';
import { IoAdd, IoClose } from 'react-icons/io5';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import type { WebsiteGuideUnsavedActions } from '../index';
import { WebsiteGuideData } from '../types';

interface OnlinePresenceSectionProps {
  data: WebsiteGuideData;
  onSave: (updates: Partial<WebsiteGuideData>) => Promise<boolean>;
  onDirtyChange?: (dirty: boolean) => void;
  onRegisterUnsavedActions?: (actions: WebsiteGuideUnsavedActions | null) => void;
}

const SOCIAL_FIELDS = [
  { key: 'socialFacebook', label: 'Facebook' },
  { key: 'socialInstagram', label: 'Instagram' },
  { key: 'socialYoutube', label: 'YouTube' },
  { key: 'socialX', label: 'X (Twitter)' },
  { key: 'socialTiktok', label: 'TikTok' },
  { key: 'socialLinkedin', label: 'LinkedIn' },
  { key: 'socialGoogleBusiness', label: 'Google Business' },
  { key: 'socialYelp', label: 'Yelp' },
] as const;

export function OnlinePresenceSection({
  data,
  onSave,
  onDirtyChange,
  onRegisterUnsavedActions,
}: OnlinePresenceSectionProps) {
  const [localData, setLocalData] = useState({
    socialFacebook: data.socialFacebook,
    socialInstagram: data.socialInstagram,
    socialYoutube: data.socialYoutube,
    socialX: data.socialX,
    socialTiktok: data.socialTiktok,
    socialLinkedin: data.socialLinkedin,
    socialGoogleBusiness: data.socialGoogleBusiness,
    socialYelp: data.socialYelp,
    socialOther: data.socialOther || [],
  });
  const [newPlatform, setNewPlatform] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const initialData = useMemo(() => ({
    socialFacebook: data.socialFacebook,
    socialInstagram: data.socialInstagram,
    socialYoutube: data.socialYoutube,
    socialX: data.socialX,
    socialTiktok: data.socialTiktok,
    socialLinkedin: data.socialLinkedin,
    socialGoogleBusiness: data.socialGoogleBusiness,
    socialYelp: data.socialYelp,
    socialOther: data.socialOther || [],
  }), [
    data.socialFacebook,
    data.socialGoogleBusiness,
    data.socialInstagram,
    data.socialLinkedin,
    data.socialOther,
    data.socialTiktok,
    data.socialX,
    data.socialYelp,
    data.socialYoutube,
  ]);
  const isDirty = JSON.stringify(localData) !== JSON.stringify(initialData);

  useEffect(() => {
    setLocalData(initialData);
  }, [initialData]);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const handleSave = async (): Promise<boolean> => {
    if (!isDirty) return true;
    setSaving(true);
    try {
      return await onSave(localData);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    onRegisterUnsavedActions?.({
      save: handleSave,
      discard: () => setLocalData(initialData),
    });

    return () => {
      onRegisterUnsavedActions?.(null);
    };
  }, [handleSave, initialData, onRegisterUnsavedActions]);

  const addOtherSocial = () => {
    if (newPlatform.trim() && newUrl.trim()) {
      setLocalData((prev) => ({
        ...prev,
        socialOther: [...prev.socialOther, { platform: newPlatform.trim(), url: newUrl.trim() }],
      }));
      setNewPlatform('');
      setNewUrl('');
    }
  };

  const removeOtherSocial = (index: number) => {
    setLocalData((prev) => ({
      ...prev,
      socialOther: prev.socialOther.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-6 text-lg font-semibold">Social Media Profiles</h3>

        <div className="grid gap-4 sm:grid-cols-2">
          {SOCIAL_FIELDS.map((field) => (
            <div key={field.key}>
              <Label htmlFor={field.key}>{field.label}</Label>
              <Input
                id={field.key}
                value={localData[field.key]}
                onChange={(e) => setLocalData((prev) => ({ ...prev, [field.key]: e.target.value }))}
                className="mt-2"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Other Social Links */}
      <div>
        <h3 className="mb-4 text-lg font-semibold">Other Social Links</h3>

        <div className="flex items-end gap-2">
          <div className="w-1/3">
            <Label className="mb-2 block text-sm">Platform</Label>
            <Input
              value={newPlatform}
              onChange={(e) => setNewPlatform(e.target.value)}
              placeholder="Platform name..."
            />
          </div>
          <div className="flex-1">
            <Label className="mb-2 block text-sm">URL</Label>
            <Input
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addOtherSocial();
                }
              }}
              placeholder="https://..."
            />
          </div>
          <Button type="button" variant="outline" onClick={addOtherSocial}>
            <IoAdd className="h-4 w-4" />
          </Button>
        </div>

        {localData.socialOther.length > 0 && (
          <div className="mt-4 divide-y divide-zinc-800 rounded-lg border border-zinc-800">
            {localData.socialOther.map((social, index) => (
              <div key={index} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{social.platform}:</span>
                  <span className="text-sm text-neutral-400">{social.url}</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeOtherSocial(index)}
                  className="text-neutral-500 hover:text-red-400"
                >
                  <IoClose className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* Sticky Save Footer */}
      <div className="sticky bottom-0 z-10 mt-6 flex justify-center py-4">
        <Button
          onClick={handleSave}
          disabled={saving || !isDirty}
          variant="emerald"
          className="min-w-[130px] shadow-lg shadow-black/30 disabled:bg-zinc-700 disabled:text-neutral-400 disabled:shadow-none"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
