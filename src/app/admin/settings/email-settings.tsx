'use client';

import { Input } from '@/components/ui/input';
import { EmailSettings } from './settings-defaults';

const EMAIL_LABELS: Record<string, string> = {
  welcome: 'Welcome',
  paymentConfirmation: 'Payment Confirmation',
  assetsReady: 'Assets Ready',
  editRequestReceived: 'Edit Request Received',
  editRequestCompleted: 'Edit Request Completed',
  websiteLive: 'Website Live',
  onboardingInvite: 'Onboarding Invite',
  paymentConfirmedWithLink: 'Payment Confirmed',
};

interface EmailSettingsTabProps {
  emails: EmailSettings;
  onChange: (emails: EmailSettings) => void;
}

export function EmailSettingsTab({ emails, onChange }: EmailSettingsTabProps) {
  const setField = (key: string, field: 'subject' | 'body', value: string) =>
    onChange({ ...emails, [key]: { ...emails[key], [field]: value } });

  return (
    <div className='space-y-6'>
      {Object.entries(emails).map(([key, template]) => (
        <div key={key} className='rounded-xl bg-zinc-100 dark:bg-zinc-900 p-6'>
          <h3 className='mb-4 font-semibold'>
            {EMAIL_LABELS[key] ?? key} Email
          </h3>
          <div className='space-y-4'>
            <div>
              <label className='mb-2 block text-sm text-neutral-400'>Subject</label>
              <Input
                value={template.subject}
                onChange={(e) => setField(key, 'subject', e.target.value)}
              />
            </div>
            <div>
              <label className='mb-2 block text-sm text-neutral-400'>Body</label>
              <textarea
                value={template.body}
                onChange={(e) => setField(key, 'body', e.target.value)}
                className='h-48 w-full rounded-lg bg-white dark:bg-zinc-800 p-4 font-mono text-sm text-black dark:text-white outline-none ring-1 ring-zinc-300 dark:ring-transparent focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600'
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
