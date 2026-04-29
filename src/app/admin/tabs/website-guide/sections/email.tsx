'use client';

import { useEffect, useMemo, useState } from 'react';
import { IoAdd, IoClose, IoInformationCircle } from 'react-icons/io5';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import type { WebsiteGuideUnsavedActions } from '../index';
import { EMAIL_SUGGESTIONS,WebsiteGuideData } from '../types';

interface EmailSectionProps {
  data: WebsiteGuideData;
  onSave: (updates: Partial<WebsiteGuideData>) => Promise<boolean>;
  onDirtyChange?: (dirty: boolean) => void;
  onRegisterUnsavedActions?: (actions: WebsiteGuideUnsavedActions | null) => void;
}

export function EmailSection({
  data,
  onSave,
  onDirtyChange,
  onRegisterUnsavedActions,
}: EmailSectionProps) {
  const [localData, setLocalData] = useState({
    emailAddresses: data.emailAddresses || [],
  });
  const [newEmail, setNewEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const initialData = useMemo(() => ({
    emailAddresses: data.emailAddresses || [],
  }), [data.emailAddresses]);
  const isDirty = JSON.stringify(localData) !== JSON.stringify(initialData);

  useEffect(() => {
    setLocalData(initialData);
  }, [initialData]);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  // Get domain for auto-complete
  const domain = data.existingDomain
    ? data.existingDomain
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .replace(/\/+$/, '')
    : '';

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

  const addEmail = (email: string) => {
    const trimmed = email.trim();
    if (trimmed && !localData.emailAddresses.includes(trimmed)) {
      setLocalData((prev) => ({
        ...prev,
        emailAddresses: [...prev.emailAddresses, trimmed],
      }));
    }
    setNewEmail('');
  };

  const removeEmail = (email: string) => {
    setLocalData((prev) => ({
      ...prev,
      emailAddresses: prev.emailAddresses.filter((e) => e !== email),
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-4 text-lg font-semibold">Email Addresses to Setup</h3>
        
        <div className="mb-4 flex gap-3 rounded-lg border border-blue-500/20 bg-blue-500/10 p-4">
          <IoInformationCircle className="mt-0.5 h-5 w-5 shrink-0 text-blue-400" />
          <div className="text-sm text-neutral-300">
            <p className="mb-2">Suggested email addresses:</p>
            <ul className="list-inside list-disc text-neutral-400">
              {EMAIL_SUGGESTIONS.map((suggestion) => (
                <li key={suggestion}>{suggestion}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Add new email */}
        <div className="flex gap-2">
          <Input
            value={newEmail}
            onChange={(e) => {
              let value = e.target.value;
              // Auto-append domain when user types @
              if (value.endsWith('@') && domain) {
                value = value + domain;
              }
              setNewEmail(value);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addEmail(newEmail);
              }
            }}
            placeholder="Add email address..."
            className="flex-1"
          />
          <Button type="button" variant="outline" onClick={() => addEmail(newEmail)}>
            <IoAdd className="h-4 w-4" />
          </Button>
        </div>

        {/* Email list */}
        {localData.emailAddresses.length > 0 && (
          <div className="mt-4 divide-y divide-zinc-800 rounded-lg border border-zinc-800">
            {localData.emailAddresses.map((email) => (
              <div
                key={email}
                className="flex items-center justify-between px-4 py-3"
              >
                <span className="text-sm">{email}</span>
                <button
                  type="button"
                  onClick={() => removeEmail(email)}
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
          className="min-w-[130px] shadow-lg shadow-black/30 disabled:opacity-100 disabled:bg-zinc-700 disabled:text-neutral-300 disabled:shadow-none"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
