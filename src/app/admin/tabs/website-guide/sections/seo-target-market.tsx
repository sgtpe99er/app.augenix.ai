'use client';

import { useEffect, useMemo, useState } from 'react';
import { IoAdd, IoClose } from 'react-icons/io5';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import type { WebsiteGuideUnsavedActions } from '../index';
import { WebsiteGuideData } from '../types';

interface SeoTargetMarketSectionProps {
  data: WebsiteGuideData;
  onSave: (updates: Partial<WebsiteGuideData>) => Promise<boolean>;
  onDirtyChange?: (dirty: boolean) => void;
  onRegisterUnsavedActions?: (actions: WebsiteGuideUnsavedActions | null) => void;
}

function TagInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string[];
  onChange: (val: string[]) => void;
  placeholder?: string;
}) {
  const [inputValue, setInputValue] = useState('');

  const addTag = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
      setInputValue('');
    }
  };

  const removeTag = (tag: string) => {
    onChange(value.filter((t) => t !== tag));
  };

  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-2 flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addTag();
            }
          }}
          placeholder={placeholder}
          className="flex-1"
        />
        <Button type="button" variant="outline" onClick={addTag}>
          <IoAdd className="h-4 w-4" />
        </Button>
      </div>
      {value.length > 0 && (
        <div className="mt-3 divide-y divide-zinc-800 rounded-lg border border-zinc-800">
          {value.map((tag) => (
            <div
              key={tag}
              className="flex items-center justify-between px-4 py-3"
            >
              <span className="text-sm">{tag}</span>
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="text-neutral-500 hover:text-red-400"
              >
                <IoClose className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function SeoTargetMarketSection({
  data,
  onSave,
  onDirtyChange,
  onRegisterUnsavedActions,
}: SeoTargetMarketSectionProps) {
  const [localData, setLocalData] = useState({
    targetAudience: data.targetAudience,
    servicesProducts: data.servicesProducts,
    targetLocations: data.targetLocations || [],
    serviceAreaRadius: data.serviceAreaRadius,
    serviceAreaDescription: data.serviceAreaDescription,
    serviceKeywords: data.serviceKeywords || [],
    competitorUrls: data.competitorUrls || [],
  });
  const [saving, setSaving] = useState(false);
  const initialData = useMemo(() => ({
    targetAudience: data.targetAudience,
    servicesProducts: data.servicesProducts,
    targetLocations: data.targetLocations || [],
    serviceAreaRadius: data.serviceAreaRadius,
    serviceAreaDescription: data.serviceAreaDescription,
    serviceKeywords: data.serviceKeywords || [],
    competitorUrls: data.competitorUrls || [],
  }), [
    data.competitorUrls,
    data.serviceAreaDescription,
    data.serviceAreaRadius,
    data.serviceKeywords,
    data.servicesProducts,
    data.targetAudience,
    data.targetLocations,
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

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-6 text-lg font-semibold">SEO & Target Market</h3>

        <div className="space-y-5">
          <div>
            <Label htmlFor="targetAudience">Target Audience</Label>
            <Textarea
              id="targetAudience"
              value={localData.targetAudience}
              onChange={(e) => setLocalData((prev) => ({ ...prev, targetAudience: e.target.value }))}
              className="mt-2 min-h-[100px]"
            />
          </div>

          <div>
            <Label htmlFor="servicesProducts">Services/Products *</Label>
            <Textarea
              id="servicesProducts"
              value={localData.servicesProducts}
              onChange={(e) => setLocalData((prev) => ({ ...prev, servicesProducts: e.target.value }))}
              className="mt-2 min-h-[100px]"
            />
          </div>

          <TagInput
            label="Target Locations *"
            value={localData.targetLocations}
            onChange={(val) => setLocalData((prev) => ({ ...prev, targetLocations: val }))}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="serviceAreaRadius">Service Area Radius</Label>
              <Input
                id="serviceAreaRadius"
                value={localData.serviceAreaRadius}
                onChange={(e) => setLocalData((prev) => ({ ...prev, serviceAreaRadius: e.target.value }))}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="serviceAreaDescription">Service Area Description</Label>
              <Input
                id="serviceAreaDescription"
                value={localData.serviceAreaDescription}
                onChange={(e) => setLocalData((prev) => ({ ...prev, serviceAreaDescription: e.target.value }))}
                className="mt-2"
              />
            </div>
          </div>

          <TagInput
            label="SEO Keywords"
            value={localData.serviceKeywords}
            onChange={(val) => setLocalData((prev) => ({ ...prev, serviceKeywords: val }))}
            placeholder="Add keyword..."
          />

          <TagInput
            label="Competitor URLs"
            value={localData.competitorUrls}
            onChange={(val) => setLocalData((prev) => ({ ...prev, competitorUrls: val }))}
            placeholder="Add competitor URL..."
          />
        </div>

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
