'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AdminStat } from '@/components/admin/stat';
import { AdminSectionHeader } from '@/components/admin/section-header';
import { AdminSection } from '@/components/admin/section';
import { AdminListRow } from '@/components/admin/list-row';
import { Button } from '@/components/ui/button';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/modal';

export default function StyleGuidePage() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className='min-h-screen px-8 py-10 max-w-3xl'>
      <div className='mb-10'>
        <Link href='/admin' className='text-xs text-neutral-400 hover:text-black dark:hover:text-white'>
          ← Back to dashboard
        </Link>
        <h1 className='mt-3 text-2xl font-semibold tracking-tight'>Admin Style Guide</h1>
        <p className='mt-1 text-sm font-light text-neutral-400'>
          Visual documentation for the Refined design system used across admin tabs.
        </p>
      </div>

      {/* Stats */}
      <section className='mb-10'>
        <AdminSectionHeader title='Stats — AdminStat' />
        <div className='grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-3 border-b border-zinc-100 dark:border-zinc-900 pb-8'>
          <AdminStat value='$1,200' label='Monthly Revenue' accent />
          <AdminStat value='23' label='Paying Users' sub='+4 this week' />
          <AdminStat value='47' label='Prospects' />
          <AdminStat value='3' label='Queue Items' />
          <AdminStat value='23' label='Active Sites' accent />
        </div>
      </section>

      {/* Section Headers */}
      <section className='mb-10'>
        <AdminSectionHeader title='Section Header — AdminSectionHeader' />
        <div className='border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg p-4 space-y-4'>
          <AdminSectionHeader title='Pending Edits' action={<a href='#' className='text-xs font-light text-neutral-400 hover:text-black dark:hover:text-white'>View all →</a>} />
          <AdminSectionHeader title='Customers' />
        </div>
      </section>

      {/* List Rows */}
      <section className='mb-10'>
        <AdminSectionHeader title='List Rows — AdminListRow' />
        <div className='divide-y divide-zinc-100 dark:divide-zinc-900'>
          <AdminListRow
            title='Update hero headline copy'
            subtitle='Howdy Painting · Mar 14'
            actions={
              <>
                <Button variant='emerald' size='sm'>Start</Button>
                <button className='rounded-lg px-3 py-1.5 text-xs font-medium text-neutral-400 hover:text-black dark:hover:text-white'>View</button>
              </>
            }
          />
          <AdminListRow
            title='Add photo gallery section'
            subtitle='Glass & Sons Plumbing · Mar 15'
            actions={
              <>
                <Button variant='emerald' size='sm'>Start</Button>
                <button className='rounded-lg px-3 py-1.5 text-xs font-medium text-neutral-400 hover:text-black dark:hover:text-white'>View</button>
              </>
            }
          />
        </div>
      </section>

      {/* Buttons */}
      <section className='mb-10'>
        <AdminSectionHeader title='Buttons' />
        <div className='flex flex-wrap items-center gap-3'>
          <Button variant='emerald'>+ Add Customer</Button>
          <Button variant='outline'>Cancel</Button>
          <Button variant='destructive'>Delete</Button>
          <button className='rounded-lg px-4 py-2 text-sm font-medium text-neutral-400 hover:text-black dark:hover:text-white transition-colors'>Text only</button>
        </div>
      </section>

      {/* Modal */}
      <section className='mb-10'>
        <AdminSectionHeader title='Modal' />
        <Button variant='emerald' onClick={() => setModalOpen(true)}>Open Modal</Button>
        {modalOpen && (
          <Modal onClose={() => setModalOpen(false)} maxWidth='max-w-md'>
            <ModalHeader title='Example Modal' subtitle='This uses the Refined modal style.' onClose={() => setModalOpen(false)} />
            <ModalBody>
              <div className='space-y-4'>
                <div>
                  <label className='block text-xs font-medium text-neutral-500 mb-1.5'>Business name</label>
                  <input
                    type='text'
                    placeholder='e.g. Howdy Painting'
                    className='w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-transparent px-3 py-2.5 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 dark:focus:ring-emerald-400/30 transition'
                  />
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <button onClick={() => setModalOpen(false)} className='rounded-lg px-4 py-2 text-sm font-medium text-neutral-400 hover:text-black dark:hover:text-white transition-colors'>
                Cancel
              </button>
              <Button variant='emerald'>Save</Button>
            </ModalFooter>
          </Modal>
        )}
      </section>

      {/* AdminSection */}
      <section className='mb-10'>
        <AdminSectionHeader title='Section Wrapper — AdminSection' />
        <div className='space-y-4'>
          <AdminSection>
            <AdminSectionHeader title='Hosting Plan' />
            <p className='text-sm font-light text-neutral-500'>$29/month · Renews Apr 17</p>
          </AdminSection>
          <AdminSection>
            <AdminSectionHeader title='Billing & Subscription' />
            <p className='text-sm font-light text-neutral-500'>View invoices via the Stripe customer portal.</p>
          </AdminSection>
        </div>
        <p className='mt-3 text-xs font-light text-neutral-400'>
          Light: <code className='font-mono bg-neutral-100 dark:bg-zinc-800 px-1 rounded'>bg-neutral-50</code> · Dark: <code className='font-mono bg-neutral-100 dark:bg-zinc-800 px-1 rounded'>bg-white/[0.03]</code> · No border, no shadow.
        </p>
      </section>

      {/* Design Tokens */}
      <section className='mb-10 rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800 px-5 py-4'>
        <p className='text-[11px] font-semibold uppercase tracking-widest text-neutral-400 mb-3'>Design Tokens</p>
        <ul className='space-y-1.5 text-sm font-light text-neutral-500 dark:text-neutral-400'>
          <li>· No card boxes — no <code className='font-mono text-xs bg-zinc-100 dark:bg-zinc-800 px-1 rounded'>bg-zinc-900 rounded-xl</code> wrappers. Space and dividers separate content.</li>
          <li>· Flat stats — <code className='font-mono text-xs bg-zinc-100 dark:bg-zinc-800 px-1 rounded'>text-4xl font-semibold</code> numbers, <code className='font-mono text-xs bg-zinc-100 dark:bg-zinc-800 px-1 rounded'>text-sm font-light</code> labels, emerald on key metrics.</li>
          <li>· Section headers — <code className='font-mono text-xs bg-zinc-100 dark:bg-zinc-800 px-1 rounded'>text-base font-semibold</code>, no uppercase/tracking.</li>
          <li>· Dividers — <code className='font-mono text-xs bg-zinc-100 dark:bg-zinc-800 px-1 rounded'>divide-zinc-100 dark:divide-zinc-900</code>.</li>
          <li>· Buttons — emerald primary, text-only secondary.</li>
          <li>· Modals — <code className='font-mono text-xs bg-zinc-100 dark:bg-zinc-800 px-1 rounded'>rounded-2xl</code>, <code className='font-mono text-xs bg-zinc-100 dark:bg-zinc-800 px-1 rounded'>backdrop-blur-sm bg-black/30</code>, emerald focus ring on inputs.</li>
        </ul>
      </section>
    </div>
  );
}
