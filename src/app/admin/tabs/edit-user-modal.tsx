'use client';

import { useState } from 'react';
import { cn } from '@/utils/cn';
import { useRouter } from 'next/navigation';
import { IoPerson, IoBusiness, IoGlobe } from 'react-icons/io5';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { INDUSTRIES, WEBSITE_FEATURES } from '@/features/onboarding/types';
import type { CustomerWithEmail } from './types';
import {
  Modal,
  ModalHeader,
  ModalTabs,
  ModalBody,
  ModalFooter,
  ModalProgressDots,
  type ModalTab,
} from '@/components/modal';

interface EditUserModalProps {
  customer: CustomerWithEmail;
  isAdmin: boolean;
  onClose: () => void;
}

function PaymentInfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className='flex items-center justify-between py-1.5'>
      <span className='text-sm text-neutral-400'>{label}</span>
      <span className='text-sm font-medium'>{value}</span>
    </div>
  );
}

const BUSINESS_STATUSES = [
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'assets_generating', label: 'Assets Generating' },
  { value: 'assets_ready', label: 'Assets Ready' },
  { value: 'approved', label: 'Approved' },
  { value: 'active', label: 'Active' },
];

const PAYMENT_STATUS_BADGE: Record<string, string> = {
  unpaid: 'bg-zinc-500/20 text-zinc-400',
  paid: 'bg-emerald-500/20 text-emerald-400',
  refunded: 'bg-yellow-500/20 text-yellow-400',
  cancelled: 'bg-red-500/20 text-red-400',
};

const PLAN_LABELS: Record<string, string> = {
  monthly: 'Monthly',
  '6_month': '6 Month',
  annual: 'Annual',
  lifetime: 'Lifetime',
};

export function EditUserModal({ customer, isAdmin, onClose }: EditUserModalProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    role: isAdmin ? 'admin' : 'user',
    businessName: customer.business_name ?? '',
    industry: customer.industry ?? '',
    locationCity: customer.location_city ?? '',
    locationState: customer.location_state ?? '',
    locationCountry: customer.location_country ?? '',
    targetAudience: customer.target_audience ?? '',
    servicesProducts: customer.services_products ?? '',
    websiteFeatures: (customer.website_features ?? []) as string[],
    status: customer.status,
  });

  const set = (field: string, value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const toggleFeature = (feature: string) => {
    setForm((prev) => ({
      ...prev,
      websiteFeatures: prev.websiteFeatures.includes(feature)
        ? prev.websiteFeatures.filter((f) => f !== feature)
        : [...prev.websiteFeatures, feature],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    const res = await fetch(`/api/admin/users/${customer.user_id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error ?? 'Something went wrong');
      return;
    }

    router.refresh();
    onClose();
  };

  const TABS: ModalTab[] = [
    { id: 'account', label: 'Account', icon: IoPerson },
    { id: 'business', label: 'Business Info', icon: IoBusiness },
    { id: 'website', label: 'Website Details', icon: IoGlobe },
  ];
  const [activeTab, setActiveTab] = useState('account');

  return (
    <Modal onClose={onClose}>
      <ModalHeader title='Edit User' subtitle={customer.email} onClose={onClose} />
      <ModalTabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

      <form onSubmit={handleSubmit}>
        <ModalBody>
          {/* Account Tab */}
          {activeTab === 'account' && (
            <div className='space-y-4'>
              <div>
                <Label htmlFor='role'>Role</Label>
                <Select value={form.role} onValueChange={(v) => set('role', v)}>
                  <SelectTrigger className='mt-1'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='user'>Regular User</SelectItem>
                    <SelectItem value='admin'>Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* Payment Info — read-only, auto-updated by Stripe */}
              <div className='rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3'>
                <div className='mb-2 flex items-center justify-between'>
                  <span className='text-sm font-medium text-neutral-300'>Payment Info</span>
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-xs font-medium',
                      PAYMENT_STATUS_BADGE[customer.payment_status ?? 'unpaid'] ?? PAYMENT_STATUS_BADGE.unpaid
                    )}
                  >
                    {(customer.payment_status ?? 'unpaid').charAt(0).toUpperCase() +
                      (customer.payment_status ?? 'unpaid').slice(1)}
                  </span>
                </div>
                <div className='divide-y divide-zinc-700'>
                  <PaymentInfoRow
                    label='Plan'
                    value={
                      customer.subscription_plan
                        ? PLAN_LABELS[customer.subscription_plan] ?? customer.subscription_plan
                        : <span className='text-neutral-500'>—</span>
                    }
                  />
                  <PaymentInfoRow
                    label='Amount Paid'
                    value={
                      customer.amount_paid != null
                        ? `$${Number(customer.amount_paid).toFixed(2)}`
                        : <span className='text-neutral-500'>—</span>
                    }
                  />
                  <PaymentInfoRow
                    label='Paid At'
                    value={
                      customer.payment_paid_at
                        ? new Date(customer.payment_paid_at).toLocaleDateString()
                        : <span className='text-neutral-500'>—</span>
                    }
                  />
                </div>
                <p className='mt-2 text-xs text-neutral-500'>Auto-updated by Stripe. Not editable.</p>
              </div>

              <div>
                <Label htmlFor='status'>Account Status</Label>
                <Select value={form.status} onValueChange={(v) => set('status', v)}>
                  <SelectTrigger className='mt-1'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BUSINESS_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Business Info Tab */}
          {activeTab === 'business' && (
            <div className='space-y-4'>
              <div className='grid gap-4 sm:grid-cols-2'>
                <div>
                  <Label htmlFor='businessName'>Business Name</Label>
                  <Input
                    id='businessName'
                    value={form.businessName}
                    onChange={(e) => set('businessName', e.target.value)}
                    className='mt-1'
                  />
                </div>
                <div>
                  <Label htmlFor='industry'>Industry</Label>
                  <Select value={form.industry} onValueChange={(v) => set('industry', v)}>
                    <SelectTrigger className='mt-1'>
                      <SelectValue placeholder='Select industry' />
                    </SelectTrigger>
                    <SelectContent>
                      {INDUSTRIES.map((i) => (
                        <SelectItem key={i.value} value={i.value}>
                          {i.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className='grid gap-4 sm:grid-cols-3'>
                <div>
                  <Label htmlFor='locationCity'>City</Label>
                  <Input
                    id='locationCity'
                    value={form.locationCity}
                    onChange={(e) => set('locationCity', e.target.value)}
                    className='mt-1'
                  />
                </div>
                <div>
                  <Label htmlFor='locationState'>State/Province</Label>
                  <Input
                    id='locationState'
                    value={form.locationState}
                    onChange={(e) => set('locationState', e.target.value)}
                    className='mt-1'
                  />
                </div>
                <div>
                  <Label htmlFor='locationCountry'>Country</Label>
                  <Input
                    id='locationCountry'
                    value={form.locationCountry}
                    onChange={(e) => set('locationCountry', e.target.value)}
                    className='mt-1'
                  />
                </div>
              </div>
            </div>
          )}

          {/* Website Details Tab */}
          {activeTab === 'website' && (
            <div className='space-y-4'>
              <div>
                <Label htmlFor='targetAudience'>Target Audience</Label>
                <Textarea
                  id='targetAudience'
                  value={form.targetAudience}
                  onChange={(e) => set('targetAudience', e.target.value)}
                  className='mt-1 min-h-[80px]'
                />
              </div>
              <div>
                <Label htmlFor='servicesProducts'>Services / Products</Label>
                <Textarea
                  id='servicesProducts'
                  value={form.servicesProducts}
                  onChange={(e) => set('servicesProducts', e.target.value)}
                  className='mt-1 min-h-[80px]'
                />
              </div>
              <div>
                <Label className='mb-2 block'>Website Features</Label>
                <div className='grid gap-2 sm:grid-cols-2'>
                  {WEBSITE_FEATURES.map((feature) => (
                    <button
                      key={feature.value}
                      type='button'
                      onClick={() => toggleFeature(feature.value)}
                      className={cn(
                        'flex items-center gap-3 rounded-lg border p-3 text-left text-sm transition-colors',
                        form.websiteFeatures.includes(feature.value)
                          ? 'border-emerald-500 bg-emerald-500/10'
                          : 'border-zinc-700 hover:border-zinc-600'
                      )}
                    >
                      <div
                        className={cn(
                          'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                          form.websiteFeatures.includes(feature.value)
                            ? 'border-emerald-500 bg-emerald-500'
                            : 'border-zinc-600'
                        )}
                      >
                        {form.websiteFeatures.includes(feature.value) && (
                          <span className='text-[10px] text-black'>✓</span>
                        )}
                      </div>
                      {feature.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </ModalBody>

        <ModalFooter
          left={<ModalProgressDots tabs={TABS} activeTab={activeTab} />}
          error={error}
        >
          <Button type='button' variant='outline' onClick={onClose}>
            Cancel
          </Button>
          <Button
            type='submit'
            disabled={saving}
            className='bg-emerald-500 text-black hover:bg-emerald-400'
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
