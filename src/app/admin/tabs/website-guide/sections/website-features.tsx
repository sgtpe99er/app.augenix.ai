'use client';

import { useEffect, useMemo, useState } from 'react';
import { IoAdd, IoClose } from 'react-icons/io5';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/utils/cn';

import type { WebsiteGuideUnsavedActions } from '../index';
import { LANGUAGES,PAYMENT_METHODS, PRIMARY_CTA_OPTIONS, WEBSITE_FEATURES, WebsiteGuideData } from '../types';

interface WebsiteFeaturesSectionProps {
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
      {label && <Label>{label}</Label>}
      <div className={cn(label ? 'mt-2' : '', 'flex gap-2')}>
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

export function WebsiteFeaturesSection({
  data,
  onSave,
  onDirtyChange,
  onRegisterUnsavedActions,
}: WebsiteFeaturesSectionProps) {
  const [localData, setLocalData] = useState({
    websiteFeatures: data.websiteFeatures || [],
    primaryCta: data.primaryCta,
    leadFormFields: data.leadFormFields || [],
    insuranceInfo: data.insuranceInfo,
    associations: data.associations || [],
    paymentMethods: data.paymentMethods || [],
    uniqueSellingPoints: data.uniqueSellingPoints || [],
    languagesServed: data.languagesServed || [],
  });
  const [saving, setSaving] = useState(false);
  const initialData = useMemo(() => ({
    websiteFeatures: data.websiteFeatures || [],
    primaryCta: data.primaryCta,
    leadFormFields: data.leadFormFields || [],
    insuranceInfo: data.insuranceInfo,
    associations: data.associations || [],
    paymentMethods: data.paymentMethods || [],
    uniqueSellingPoints: data.uniqueSellingPoints || [],
    languagesServed: data.languagesServed || [],
  }), [
    data.associations,
    data.insuranceInfo,
    data.languagesServed,
    data.leadFormFields,
    data.paymentMethods,
    data.primaryCta,
    data.uniqueSellingPoints,
    data.websiteFeatures,
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

  const toggleFeature = (feature: string) => {
    if (localData.websiteFeatures.includes(feature)) {
      setLocalData((prev) => ({
        ...prev,
        websiteFeatures: prev.websiteFeatures.filter((f) => f !== feature),
      }));
    } else {
      setLocalData((prev) => ({
        ...prev,
        websiteFeatures: [...prev.websiteFeatures, feature],
      }));
    }
  };

  const togglePayment = (method: string) => {
    if (localData.paymentMethods.includes(method)) {
      setLocalData((prev) => ({
        ...prev,
        paymentMethods: prev.paymentMethods.filter((m) => m !== method),
      }));
    } else {
      setLocalData((prev) => ({
        ...prev,
        paymentMethods: [...prev.paymentMethods, method],
      }));
    }
  };

  const toggleLanguage = (lang: string) => {
    if (localData.languagesServed.includes(lang)) {
      setLocalData((prev) => ({
        ...prev,
        languagesServed: prev.languagesServed.filter((l) => l !== lang),
      }));
    } else {
      setLocalData((prev) => ({
        ...prev,
        languagesServed: [...prev.languagesServed, lang],
      }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Website Features */}
      <div>
        <h3 className="mb-2 text-lg font-semibold">Website Features *</h3>
        <p className="mb-4 text-sm text-neutral-400">Select features needed at launch. Additional features can be added later.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {WEBSITE_FEATURES.map((feature) => (
            <button
              key={feature.value}
              type="button"
              onClick={() => toggleFeature(feature.value)}
              className={cn(
                'flex items-center gap-3 rounded-lg border p-4 text-left transition-colors',
                localData.websiteFeatures.includes(feature.value)
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : 'border-zinc-700 hover:border-zinc-600'
              )}
            >
              <div
                className={cn(
                  'flex h-5 w-5 items-center justify-center rounded border',
                  localData.websiteFeatures.includes(feature.value)
                    ? 'border-emerald-500 bg-emerald-500'
                    : 'border-zinc-600'
                )}
              >
                {localData.websiteFeatures.includes(feature.value) && (
                  <span className="text-xs text-black">✓</span>
                )}
              </div>
              <span>{feature.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Primary CTA */}
      <div>
        <h3 className="mb-4 text-lg font-semibold">Primary Call-to-Action *</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {PRIMARY_CTA_OPTIONS.map((cta) => (
            <button
              key={cta.value}
              type="button"
              onClick={() => setLocalData((prev) => ({ ...prev, primaryCta: cta.value }))}
              className={cn(
                'rounded-lg border p-4 text-left transition-colors',
                localData.primaryCta === cta.value
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : 'border-zinc-700 hover:border-zinc-600'
              )}
            >
              <span className="font-medium">{cta.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Trust Signals */}
      <div>
        <h3 className="mb-4 text-lg font-semibold">Trust Signals</h3>
        <div className="space-y-5">
          <div>
            <Label htmlFor="insuranceInfo">Insurance Information</Label>
            <p className="mt-1 text-xs text-neutral-500">e.g., "Fully insured and bonded" or "$2M liability coverage"</p>
            <Input
              id="insuranceInfo"
              value={localData.insuranceInfo}
              onChange={(e) => setLocalData((prev) => ({ ...prev, insuranceInfo: e.target.value }))}
              className="mt-2"
            />
          </div>

          <div>
            <Label>Professional Associations</Label>
            <p className="mt-1 text-xs text-neutral-500">e.g., "BBB Accredited", "NARI Member", "Licensed Contractor #12345"</p>
            <TagInput
              label=""
              value={localData.associations}
              onChange={(val) => setLocalData((prev) => ({ ...prev, associations: val }))}
            />
          </div>

          <div>
            <Label className="mb-3 block">Payment Methods</Label>
            <div className="flex flex-wrap gap-2">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method.value}
                  type="button"
                  onClick={() => togglePayment(method.value)}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-sm transition-colors',
                    localData.paymentMethods.includes(method.value)
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                      : 'border-zinc-700 hover:border-zinc-600'
                  )}
                >
                  {method.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* USPs & Languages */}
      <div>
        <h3 className="mb-4 text-lg font-semibold">Additional Info</h3>
        <div className="space-y-5">
          <div>
            <Label>Unique Selling Points</Label>
            <p className="mt-1 text-xs text-neutral-500">e.g., "Family-owned since 1985", "Same-day service", "Free estimates"</p>
            <TagInput
              label=""
              value={localData.uniqueSellingPoints}
              onChange={(val) => setLocalData((prev) => ({ ...prev, uniqueSellingPoints: val }))}
            />
          </div>

          <div>
            <Label className="mb-3 block">Languages Served</Label>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.value}
                  type="button"
                  onClick={() => toggleLanguage(lang.value)}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-sm transition-colors',
                    localData.languagesServed.includes(lang.value)
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                      : 'border-zinc-700 hover:border-zinc-600'
                  )}
                >
                  {lang.label}
                </button>
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
          className="min-w-[130px] shadow-lg shadow-black/30 disabled:bg-zinc-700 disabled:text-neutral-400 disabled:shadow-none"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
