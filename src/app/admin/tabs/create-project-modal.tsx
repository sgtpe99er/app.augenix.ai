'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { IoAlertCircle,IoCheckmarkCircle, IoClose, IoRocket } from 'react-icons/io5';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { type CustomerWithEmail } from './types';

interface CreateProjectModalProps {
  customers: CustomerWithEmail[];
  onClose: () => void;
}

type Step = 'form' | 'provisioning' | 'success' | 'error';

export function CreateProjectModal({ customers, onClose }: CreateProjectModalProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [step, setStep] = useState<Step>('form');
  const [errorMsg, setErrorMsg] = useState('');
  const [result, setResult] = useState<{ repo_url: string; live_url: string } | null>(null);

  const [userId, setUserId] = useState('');
  const [businessId, setBusinessId] = useState('');
  const [siteSlug, setSiteSlug] = useState('');

  const selectedCustomer = customers.find((c) => c.user_id === userId);

  const handleUserChange = (id: string) => {
    setUserId(id);
    const c = customers.find((c) => c.user_id === id);
    setBusinessId(c?.business_id ?? '');
    if (c?.business_name) {
      const slug = c.business_name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 40);
      setSiteSlug(`${slug}-${id.slice(0, 6)}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !businessId || !siteSlug) return;

    setStep('provisioning');
    setErrorMsg('');

    try {
      const res = await fetch('/api/admin/provision-site', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, business_id: businessId, site_slug: siteSlug }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error ?? 'Provisioning failed');
        setStep('error');
        return;
      }

      setResult({ repo_url: data.repo_url, live_url: data.live_url });
      setStep('success');
      startTransition(() => router.refresh());
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unknown error');
      setStep('error');
    }
  };

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4'>
      <div className='relative w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 p-6 shadow-xl'>
        {/* Close */}
        {step !== 'provisioning' && (
          <button
            onClick={onClose}
            className='absolute right-4 top-4 text-neutral-500 hover:text-white'
          >
            <IoClose className='h-5 w-5' />
          </button>
        )}

        {/* Form */}
        {step === 'form' && (
          <>
            <h2 className='mb-1 text-lg font-semibold'>Provision Customer Site</h2>
            <p className='mb-5 text-sm text-neutral-400'>
              Creates a GitHub repo from the template and sets up a Vercel project with subdomain.
            </p>
            <form onSubmit={handleSubmit} className='space-y-4'>
              {/* Customer selector */}
              <div>
                <label className='mb-1.5 block text-sm font-medium text-neutral-300'>
                  Customer
                </label>
                <select
                  required
                  value={userId}
                  onChange={(e) => handleUserChange(e.target.value)}
                  className='w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none'
                >
                  <option value=''>Select a customer…</option>
                  {customers
                    .filter((c) => c.business_id)
                    .map((c) => (
                      <option key={c.user_id} value={c.user_id}>
                        {c.business_name ?? 'Unnamed'} — {c.email}
                      </option>
                    ))}
                </select>
                {userId && !selectedCustomer?.business_id && (
                  <p className='mt-1 text-xs text-red-400'>This customer has no business record.</p>
                )}
              </div>

              {/* Site slug */}
              <div>
                <label className='mb-1.5 block text-sm font-medium text-neutral-300'>
                  Site Slug
                </label>
                <Input
                  required
                  value={siteSlug}
                  onChange={(e) =>
                    setSiteSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                  }
                  placeholder='acmecorp-a1b2c3'
                  className='font-mono'
                />
                {siteSlug && (
                  <p className='mt-1 text-xs text-neutral-500'>
                    Will deploy to:{' '}
                    <span className='text-emerald-400'>
                      {siteSlug}.freewebsite.deal
                    </span>
                  </p>
                )}
              </div>

              <div className='flex gap-3 pt-2'>
                <Button type='button' variant='outline' className='flex-1' onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  type='submit'
                  disabled={!userId || !businessId || !siteSlug}
                  className='flex-1 bg-emerald-500 text-black hover:bg-emerald-400'
                >
                  <IoRocket className='mr-2 h-4 w-4' />
                  Provision
                </Button>
              </div>
            </form>
          </>
        )}

        {/* Provisioning */}
        {step === 'provisioning' && (
          <div className='flex flex-col items-center gap-4 py-6 text-center'>
            <div className='flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20'>
              <IoRocket className='h-7 w-7 animate-pulse text-emerald-400' />
            </div>
            <div>
              <h2 className='text-lg font-semibold'>Provisioning Site…</h2>
              <p className='mt-1 text-sm text-neutral-400'>
                Creating GitHub repo and Vercel project. This takes about 10–20 seconds.
              </p>
            </div>
            <div className='w-full space-y-2 rounded-lg bg-zinc-800 p-4 text-left text-sm text-neutral-400'>
              <p className='flex items-center gap-2'>
                <span className='h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400' />
                Creating GitHub repo from template…
              </p>
              <p className='flex items-center gap-2'>
                <span className='h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400' />
                Creating Vercel project…
              </p>
              <p className='flex items-center gap-2'>
                <span className='h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400' />
                Assigning subdomain…
              </p>
            </div>
          </div>
        )}

        {/* Success */}
        {step === 'success' && result && (
          <div className='flex flex-col items-center gap-4 py-4 text-center'>
            <div className='flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20'>
              <IoCheckmarkCircle className='h-7 w-7 text-emerald-400' />
            </div>
            <div>
              <h2 className='text-lg font-semibold'>Site Provisioned!</h2>
              <p className='mt-1 text-sm text-neutral-400'>
                GitHub repo created and Vercel is building the first deployment.
              </p>
            </div>
            <div className='w-full space-y-2 text-left text-sm'>
              <a
                href={result.repo_url}
                target='_blank'
                rel='noopener noreferrer'
                className='flex items-center justify-between rounded-lg bg-zinc-800 px-4 py-3 hover:bg-zinc-700'
              >
                <span className='text-neutral-300'>GitHub Repo</span>
                <span className='font-mono text-xs text-emerald-400 truncate max-w-[200px]'>
                  {result.repo_url.replace('https://github.com/', '')}
                </span>
              </a>
              <a
                href={result.live_url}
                target='_blank'
                rel='noopener noreferrer'
                className='flex items-center justify-between rounded-lg bg-zinc-800 px-4 py-3 hover:bg-zinc-700'
              >
                <span className='text-neutral-300'>Live URL</span>
                <span className='font-mono text-xs text-emerald-400 truncate max-w-[200px]'>
                  {result.live_url.replace('https://', '')}
                </span>
              </a>
            </div>
            <Button onClick={onClose} className='mt-2 w-full bg-emerald-500 text-black hover:bg-emerald-400'>
              Done
            </Button>
          </div>
        )}

        {/* Error */}
        {step === 'error' && (
          <div className='flex flex-col items-center gap-4 py-4 text-center'>
            <div className='flex h-14 w-14 items-center justify-center rounded-full bg-red-500/20'>
              <IoAlertCircle className='h-7 w-7 text-red-400' />
            </div>
            <div>
              <h2 className='text-lg font-semibold'>Provisioning Failed</h2>
              <p className='mt-2 rounded-lg bg-zinc-800 px-4 py-3 text-left text-sm text-red-300'>
                {errorMsg}
              </p>
            </div>
            <div className='flex w-full gap-3'>
              <Button variant='outline' className='flex-1' onClick={() => setStep('form')}>
                Try Again
              </Button>
              <Button variant='outline' className='flex-1' onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
