'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { WebsiteGuideUnsavedActions } from '../index';
import { WebsiteGuideData } from '../types';
import { cn } from '@/utils/cn';

interface DomainSectionProps {
  data: WebsiteGuideData;
  onSave: (updates: Partial<WebsiteGuideData>) => Promise<boolean>;
  onDirtyChange?: (dirty: boolean) => void;
  onRegisterUnsavedActions?: (actions: WebsiteGuideUnsavedActions | null) => void;
}

export function DomainSection({
  data,
  onSave,
  onDirtyChange,
  onRegisterUnsavedActions,
}: DomainSectionProps) {
  const [localData, setLocalData] = useState({
    ownsDomain: data.ownsDomain,
    existingDomain: data.existingDomain,
    domainRegistrar: data.domainRegistrar,
    desiredDomain: data.desiredDomain,
    needsDomainPurchase: data.needsDomainPurchase,
  });
  const [saving, setSaving] = useState(false);
  const initialData = useMemo(() => ({
    ownsDomain: data.ownsDomain,
    existingDomain: data.existingDomain,
    domainRegistrar: data.domainRegistrar,
    desiredDomain: data.desiredDomain,
    needsDomainPurchase: data.needsDomainPurchase,
  }), [data.desiredDomain, data.domainRegistrar, data.existingDomain, data.needsDomainPurchase, data.ownsDomain]);
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
        <h3 className="mb-6 text-lg font-semibold">Domain</h3>

        <div className="space-y-5">
          {/* Domain Ownership */}
          <div>
            <Label className="mb-3 block">Domain Status</Label>
            <div className="grid gap-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setLocalData((prev) => ({ ...prev, ownsDomain: false }))}
                className={cn(
                  'rounded-xl border p-5 text-left transition-colors',
                  !localData.ownsDomain
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-zinc-700 hover:border-zinc-600'
                )}
              >
                <h4 className="font-medium">Needs a domain</h4>
                <p className="mt-1 text-sm text-neutral-400">Customer needs a new domain</p>
              </button>
              <button
                type="button"
                onClick={() => setLocalData((prev) => ({ ...prev, ownsDomain: true }))}
                className={cn(
                  'rounded-xl border p-5 text-left transition-colors',
                  localData.ownsDomain
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-zinc-700 hover:border-zinc-600'
                )}
              >
                <h4 className="font-medium">Has existing domain</h4>
                <p className="mt-1 text-sm text-neutral-400">Customer owns a domain</p>
              </button>
            </div>
          </div>

          {localData.ownsDomain ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="existingDomain">Existing Domain</Label>
                <Input
                  id="existingDomain"
                  value={localData.existingDomain}
                  onChange={(e) => setLocalData((prev) => ({ ...prev, existingDomain: e.target.value }))}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="domainRegistrar">Domain Registrar</Label>
                <Input
                  id="domainRegistrar"
                  value={localData.domainRegistrar}
                  onChange={(e) => setLocalData((prev) => ({ ...prev, domainRegistrar: e.target.value }))}
                  className="mt-2"
                />
              </div>
            </div>
          ) : (
            <div>
              <Label htmlFor="desiredDomain">Desired Domain</Label>
              <Input
                id="desiredDomain"
                value={localData.desiredDomain}
                onChange={(e) => setLocalData((prev) => ({ ...prev, desiredDomain: e.target.value }))}
                className="mt-2"
              />
            </div>
          )}
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
