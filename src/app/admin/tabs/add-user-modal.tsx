'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { IoPerson, IoBusiness, IoGlobe, IoRefresh, IoEye, IoEyeOff, IoCopy, IoCheckmark, IoMail } from 'react-icons/io5';
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
import { cn } from '@/utils/cn';
import { INDUSTRIES, WEBSITE_FEATURES } from '@/features/onboarding/types';
import {
  Modal,
  ModalHeader,
  ModalTabs,
  ModalBody,
  ModalFooter,
  ModalProgressDots,
  type ModalTab,
} from '@/components/modal';

interface AddUserModalProps {
  onClose: () => void;
}

const BUSINESS_STATUSES = [
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'assets_generating', label: 'Assets Generating' },
  { value: 'assets_ready', label: 'Assets Ready' },
  { value: 'approved', label: 'Approved' },
  { value: 'active', label: 'Active' },
];

export function AddUserModal({ onClose }: AddUserModalProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    const pwd = Array.from(crypto.getRandomValues(new Uint8Array(14)))
      .map((b) => chars[b % chars.length])
      .join('');
    set('password', pwd);
    setShowPassword(true);
  };

  const copyPassword = () => {
    if (!form.password) return;
    navigator.clipboard.writeText(form.password);
    setCopiedPassword(true);
    setTimeout(() => setCopiedPassword(false), 2000);
  };

  const [form, setForm] = useState({
    email: '',
    password: '',
    role: 'user' as 'user' | 'admin',
    businessName: '',
    industry: '',
    locationCity: '',
    locationState: '',
    locationCountry: '',
    targetAudience: '',
    servicesProducts: '',
    websiteFeatures: [] as string[],
    status: 'onboarding',
    sendWelcomeEmail: true,
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

    const res = await fetch('/api/admin/users', {
      method: 'POST',
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
      <ModalHeader title='Add New User' onClose={onClose} />
      <ModalTabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

      <form onSubmit={handleSubmit}>
        <ModalBody>
          {/* Account Tab */}
          {activeTab === 'account' && (
            <div className='space-y-4'>
              <div className='grid gap-4 sm:grid-cols-2'>
                <div>
                  <Label htmlFor='email'>Email *</Label>
                  <Input
                    id='email'
                    type='email'
                    placeholder='user@example.com'
                    value={form.email}
                    onChange={(e) => set('email', e.target.value)}
                    required
                    className='mt-1'
                  />
                </div>
                <div>
                  <div className='mb-1 flex items-center justify-between'>
                    <Label htmlFor='password'>Password *</Label>
                    <button
                      type='button'
                      onClick={generatePassword}
                      className='flex items-center gap-1 rounded px-2 py-0.5 text-xs text-emerald-400 hover:bg-emerald-500/10 transition-colors'
                    >
                      <IoRefresh className='h-3 w-3' />
                      Auto-generate
                    </button>
                  </div>
                  <div className='relative'>
                    <Input
                      id='password'
                      type={showPassword ? 'text' : 'password'}
                      placeholder='Min 6 characters'
                      value={form.password}
                      onChange={(e) => set('password', e.target.value)}
                      required
                      minLength={6}
                      className='pr-16'
                    />
                    <div className='absolute inset-y-0 right-0 flex items-center gap-0.5 pr-2'>
                      {form.password && (
                        <button
                          type='button'
                          onClick={copyPassword}
                          className='rounded p-1 text-neutral-400 hover:text-white transition-colors'
                          aria-label='Copy password'
                        >
                          {copiedPassword
                            ? <IoCheckmark className='h-4 w-4 text-emerald-400' />
                            : <IoCopy className='h-4 w-4' />}
                        </button>
                      )}
                      <button
                        type='button'
                        onClick={() => setShowPassword((v) => !v)}
                        className='rounded p-1 text-neutral-400 hover:text-white transition-colors'
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <IoEyeOff className='h-4 w-4' /> : <IoEye className='h-4 w-4' />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
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
              <button
                type='button'
                onClick={() => set('sendWelcomeEmail', !form.sendWelcomeEmail)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg border p-3 text-left text-sm transition-colors',
                  form.sendWelcomeEmail
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-zinc-700 hover:border-zinc-600'
                )}
              >
                <div
                  className={cn(
                    'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                    form.sendWelcomeEmail
                      ? 'border-emerald-500 bg-emerald-500'
                      : 'border-zinc-600'
                  )}
                >
                  {form.sendWelcomeEmail && <span className='text-[10px] text-black'>✓</span>}
                </div>
                <IoMail className='h-4 w-4 text-neutral-400' />
                <div>
                  <div className='text-white'>Send welcome email</div>
                  <div className='text-xs text-neutral-500'>Email the user their account details and onboarding link</div>
                </div>
              </button>
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
                    placeholder="e.g., Joe's Coffee Shop"
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
                    placeholder='e.g., Austin'
                    value={form.locationCity}
                    onChange={(e) => set('locationCity', e.target.value)}
                    className='mt-1'
                  />
                </div>
                <div>
                  <Label htmlFor='locationState'>State/Province</Label>
                  <Input
                    id='locationState'
                    placeholder='e.g., Texas'
                    value={form.locationState}
                    onChange={(e) => set('locationState', e.target.value)}
                    className='mt-1'
                  />
                </div>
                <div>
                  <Label htmlFor='locationCountry'>Country</Label>
                  <Input
                    id='locationCountry'
                    placeholder='e.g., USA'
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
                  placeholder='e.g., Local families looking for home repair services...'
                  value={form.targetAudience}
                  onChange={(e) => set('targetAudience', e.target.value)}
                  className='mt-1 min-h-[80px]'
                />
              </div>
              <div>
                <Label htmlFor='servicesProducts'>Services / Products</Label>
                <Textarea
                  id='servicesProducts'
                  placeholder='e.g., Plumbing repairs, water heater installation...'
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
          {activeTab !== 'website' ? (
            <Button
              type='button'
              onClick={() => {
                const idx = TABS.findIndex((t) => t.id === activeTab);
                setActiveTab(TABS[idx + 1].id);
              }}
              className='bg-emerald-500 text-black hover:bg-emerald-400'
            >
              Next →
            </Button>
          ) : (
            <Button
              type='submit'
              disabled={saving || !form.email || !form.password}
              className='bg-emerald-500 text-black hover:bg-emerald-400'
            >
              {saving ? 'Creating...' : 'Create User'}
            </Button>
          )}
        </ModalFooter>
      </form>
    </Modal>
  );
}
