'use client';

import { Input } from '@/components/ui/input';

import { PricingSettings } from './settings-defaults';

interface PricingSettingsTabProps {
  pricing: PricingSettings;
  onChange: (pricing: PricingSettings) => void;
}

export function PricingSettingsTab({ pricing, onChange }: PricingSettingsTabProps) {
  const set = (key: keyof PricingSettings, value: string) =>
    onChange({ ...pricing, [key]: parseInt(value) || 0 });

  return (
    <div className='space-y-6'>
      <div className='rounded-xl bg-zinc-100 dark:bg-zinc-900 p-6'>
        <h3 className='mb-4 font-semibold'>Hosting Plans</h3>
        <div className='grid gap-4 sm:grid-cols-2'>
          <div>
            <label className='mb-2 block text-sm text-neutral-400'>6 Month Price ($)</label>
            <Input
              type='number'
              value={pricing.hosting6Month}
              onChange={(e) => set('hosting6Month', e.target.value)}
            />
          </div>
          <div>
            <label className='mb-2 block text-sm text-neutral-400'>12 Month Price ($)</label>
            <Input
              type='number'
              value={pricing.hosting12Month}
              onChange={(e) => set('hosting12Month', e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className='rounded-xl bg-zinc-100 dark:bg-zinc-900 p-6'>
        <h3 className='mb-4 font-semibold'>Domain</h3>
        <div>
          <label className='mb-2 block text-sm text-neutral-400'>Markup Fee ($)</label>
          <Input
            type='number'
            value={pricing.domainMarkup}
            onChange={(e) => set('domainMarkup', e.target.value)}
          />
          <p className='mt-2 text-xs text-neutral-400'>Added to Namecheap&apos;s domain price</p>
        </div>
      </div>

      <div className='rounded-xl bg-zinc-100 dark:bg-zinc-900 p-6'>
        <h3 className='mb-4 font-semibold'>Upsell Services (Monthly)</h3>
        <div className='grid gap-4 sm:grid-cols-3'>
          <div>
            <label className='mb-2 block text-sm text-neutral-400'>SEO ($)</label>
            <Input
              type='number'
              value={pricing.seoMonthly}
              onChange={(e) => set('seoMonthly', e.target.value)}
            />
          </div>
          <div>
            <label className='mb-2 block text-sm text-neutral-400'>Google Ads ($)</label>
            <Input
              type='number'
              value={pricing.googleAdsMonthly}
              onChange={(e) => set('googleAdsMonthly', e.target.value)}
            />
          </div>
          <div>
            <label className='mb-2 block text-sm text-neutral-400'>Google My Business ($)</label>
            <Input
              type='number'
              value={pricing.gmbMonthly}
              onChange={(e) => set('gmbMonthly', e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className='rounded-xl bg-zinc-100 dark:bg-zinc-900 p-6'>
        <h3 className='mb-4 font-semibold'>Other Settings</h3>
        <div className='grid gap-4 sm:grid-cols-2'>
          <div>
            <label className='mb-2 block text-sm text-neutral-400'>Bundle Discount (%)</label>
            <Input
              type='number'
              value={pricing.bundleDiscount}
              onChange={(e) => set('bundleDiscount', e.target.value)}
            />
          </div>
          <div>
            <label className='mb-2 block text-sm text-neutral-400'>Max Monthly Edits</label>
            <Input
              type='number'
              value={pricing.maxMonthlyEdits}
              onChange={(e) => set('maxMonthlyEdits', e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
