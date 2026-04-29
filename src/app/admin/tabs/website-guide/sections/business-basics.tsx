'use client';

import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

import type { WebsiteGuideUnsavedActions } from '../index';
import { DAYS_OF_WEEK,INDUSTRIES, WebsiteGuideData } from '../types';

interface BusinessBasicsSectionProps {
  data: WebsiteGuideData;
  onSave: (updates: Partial<WebsiteGuideData>) => Promise<boolean>;
  onDirtyChange?: (dirty: boolean) => void;
  onRegisterUnsavedActions?: (actions: WebsiteGuideUnsavedActions | null) => void;
}

export function BusinessBasicsSection({
  data,
  onSave,
  onDirtyChange,
  onRegisterUnsavedActions,
}: BusinessBasicsSectionProps) {
  const [localData, setLocalData] = useState({
    businessName: data.businessName,
    industry: data.industry,
    industryOther: data.industryOther,
    tagline: data.tagline,
    yearEstablished: data.yearEstablished,
    description: data.description,
    addressStreet: data.addressStreet,
    addressCity: data.addressCity,
    addressState: data.addressState,
    addressZip: data.addressZip,
    addressCountry: data.addressCountry,
    phonePrimary: data.phonePrimary,
    emailPublic: data.emailPublic,
    hours: data.hours,
  });
  const [saving, setSaving] = useState(false);
  const initialData = useMemo(() => ({
    businessName: data.businessName,
    industry: data.industry,
    industryOther: data.industryOther,
    tagline: data.tagline,
    yearEstablished: data.yearEstablished,
    description: data.description,
    addressStreet: data.addressStreet,
    addressCity: data.addressCity,
    addressState: data.addressState,
    addressZip: data.addressZip,
    addressCountry: data.addressCountry,
    phonePrimary: data.phonePrimary,
    emailPublic: data.emailPublic,
    hours: data.hours,
  }), [
    data.addressCity,
    data.addressCountry,
    data.addressState,
    data.addressStreet,
    data.addressZip,
    data.businessName,
    data.description,
    data.emailPublic,
    data.hours,
    data.industry,
    data.industryOther,
    data.phonePrimary,
    data.tagline,
    data.yearEstablished,
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

  const updateHours = (day: string, value: string) => {
    const parts = value.split('-').map((s) => s.trim());
    const newHours = {
      ...localData.hours,
      [day]: value.trim() ? { open: parts[0] || '', close: parts[1] || '' } : null,
    };
    setLocalData((prev) => ({ ...prev, hours: newHours }));
  };

  const getHoursDisplay = (day: string) => {
    const h = localData.hours?.[day];
    if (!h) return '';
    return h.open && h.close ? `${h.open} - ${h.close}` : h.open || '';
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-6 text-lg font-semibold">Business Basics</h3>

        <div className="space-y-5">
          {/* Business Name & Industry */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="businessName">Business Name *</Label>
              <Input
                id="businessName"
                value={localData.businessName}
                onChange={(e) => setLocalData((prev) => ({ ...prev, businessName: e.target.value }))}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="industry">Industry</Label>
              <Select
                value={localData.industry}
                onValueChange={(value) => setLocalData((prev) => ({ ...prev, industry: value }))}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map((ind) => (
                    <SelectItem key={ind.value} value={ind.value}>
                      {ind.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {localData.industry === 'other' && (
            <div>
              <Label htmlFor="industryOther">Specify Industry</Label>
              <Input
                id="industryOther"
                value={localData.industryOther}
                onChange={(e) => setLocalData((prev) => ({ ...prev, industryOther: e.target.value }))}
                className="mt-2"
              />
            </div>
          )}

          {/* Tagline & Year */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="tagline">Tagline</Label>
              <Input
                id="tagline"
                value={localData.tagline}
                onChange={(e) => setLocalData((prev) => ({ ...prev, tagline: e.target.value }))}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="yearEstablished">Year Established</Label>
              <Input
                id="yearEstablished"
                type="number"
                value={localData.yearEstablished ?? ''}
                onChange={(e) =>
                  setLocalData((prev) => ({
                    ...prev,
                    yearEstablished: e.target.value ? parseInt(e.target.value) : null,
                  }))
                }
                className="mt-2"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Business Description</Label>
            <Textarea
              id="description"
              value={localData.description}
              onChange={(e) => setLocalData((prev) => ({ ...prev, description: e.target.value }))}
              className="mt-2 min-h-[100px]"
            />
          </div>

          {/* Address */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-neutral-400">Address</h4>
            <div>
              <Label htmlFor="addressStreet">Street Address</Label>
              <Input
                id="addressStreet"
                value={localData.addressStreet}
                onChange={(e) => setLocalData((prev) => ({ ...prev, addressStreet: e.target.value }))}
                className="mt-2"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <Label htmlFor="addressCity">City *</Label>
                <Input
                  id="addressCity"
                  value={localData.addressCity}
                  onChange={(e) => setLocalData((prev) => ({ ...prev, addressCity: e.target.value }))}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="addressState">State *</Label>
                <Input
                  id="addressState"
                  value={localData.addressState}
                  onChange={(e) => setLocalData((prev) => ({ ...prev, addressState: e.target.value }))}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="addressZip">ZIP Code</Label>
                <Input
                  id="addressZip"
                  value={localData.addressZip}
                  onChange={(e) => setLocalData((prev) => ({ ...prev, addressZip: e.target.value }))}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="addressCountry">Country *</Label>
                <Input
                  id="addressCountry"
                  value={localData.addressCountry}
                  onChange={(e) => setLocalData((prev) => ({ ...prev, addressCountry: e.target.value }))}
                  className="mt-2"
                />
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-neutral-400">Contact</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="phonePrimary">Primary Phone *</Label>
                <Input
                  id="phonePrimary"
                  type="tel"
                  value={localData.phonePrimary}
                  onChange={(e) => setLocalData((prev) => ({ ...prev, phonePrimary: e.target.value }))}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="emailPublic">Public Email</Label>
                <Input
                  id="emailPublic"
                  type="email"
                  value={localData.emailPublic}
                  onChange={(e) => setLocalData((prev) => ({ ...prev, emailPublic: e.target.value }))}
                  className="mt-2"
                />
              </div>
            </div>
          </div>

          {/* Business Hours */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-neutral-400">Business Hours</h4>
            <div className="space-y-2">
              {DAYS_OF_WEEK.map((day) => (
                <div key={day.value} className="flex items-center gap-3">
                  <span className="w-24 text-sm">{day.label}</span>
                  <Input
                    value={getHoursDisplay(day.value)}
                    onChange={(e) => updateHours(day.value, e.target.value)}
                    className="flex-1"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Sticky Save Footer */}
      <div className="sticky bottom-0 z-10 mt-6 flex justify-center py-4">
        <Button
          onClick={handleSave}
          disabled={saving || !isDirty}
          variant="emerald"
          className="min-w-[130px] shadow-lg shadow-black/30 disabled:opacity-100 disabled:bg-zinc-700 disabled:text-neutral-300 disabled:shadow-none"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
