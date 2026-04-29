'use client';

import Link from 'next/link';
import { IoArrowForward,IoDocumentText, IoFlash, IoPeople, IoTerminal } from 'react-icons/io5';

interface DashboardOverviewProps {
  orgName: string;
  stats: { pages: number; contacts: number; edits: number; automations: number };
  recentEdits: Array<{ id: string; instruction: string; status: string; created_at: string; page_title?: string }>;
}

const STATUS_STYLES: Record<string, string> = {
  approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  reverted: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
};

export function DashboardOverview({ orgName, stats, recentEdits }: DashboardOverviewProps) {
  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <h1 className="font-serif text-3xl font-normal tracking-tight text-on-surface lg:text-4xl">
          Welcome back
        </h1>
        <p className="mt-2 text-on-surface-variant">{orgName}</p>
      </div>

      {/* Quick stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Website Pages" value={stats.pages} icon={<IoDocumentText className="h-5 w-5" />} href="/dashboard/command-center" />
        <StatCard label="Contacts" value={stats.contacts} icon={<IoPeople className="h-5 w-5" />} href="/dashboard/crm" />
        <StatCard label="AI Edits" value={stats.edits} icon={<IoTerminal className="h-5 w-5" />} href="/dashboard/command-center" />
        <StatCard label="Automations" value={stats.automations} icon={<IoFlash className="h-5 w-5" />} href="/dashboard/automations" />
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="font-serif text-xl font-normal text-on-surface">Quick Actions</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <QuickAction
            href="/dashboard/command-center"
            title="Edit Your Website"
            description="Describe changes in plain English and let AI handle the rest."
          />
          <QuickAction
            href="/dashboard/content"
            title="Generate Content"
            description="Create blog posts, social content, or email sequences with AI."
          />
          <QuickAction
            href="/dashboard/crm"
            title="View Contacts"
            description="Manage your leads and track your sales pipeline."
          />
        </div>
      </div>

      {/* Recent edits */}
      <div>
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl font-normal text-on-surface">Recent AI Edits</h2>
          <Link href="/dashboard/command-center" className="text-sm font-medium text-on-primary-container hover:underline">
            View all
          </Link>
        </div>
        <div className="mt-4 space-y-2">
          {recentEdits.length === 0 ? (
            <div className="rounded-sm bg-surface-container-lowest p-8 text-center">
              <p className="text-on-surface-variant">No edits yet. Head to the AI Command Center to make your first change.</p>
              <Link
                href="/dashboard/command-center"
                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-on-primary-container hover:underline"
              >
                Open Command Center <IoArrowForward className="h-3.5 w-3.5" />
              </Link>
            </div>
          ) : (
            recentEdits.map((edit) => (
              <div key={edit.id} className="flex items-start justify-between rounded-sm bg-surface-container-lowest p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-on-surface">{edit.instruction}</p>
                  <p className="mt-1 text-xs text-on-surface-variant">
                    {edit.page_title && <span>{edit.page_title} &middot; </span>}
                    {new Date(edit.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span className={`ml-3 shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[edit.status] ?? STATUS_STYLES.pending}`}>
                  {edit.status}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, href }: { label: string; value: number; icon: React.ReactNode; href: string }) {
  return (
    <Link href={href} className="group rounded-sm bg-surface-container-lowest p-5 transition-colors hover:bg-surface-container-low">
      <div className="flex items-center justify-between">
        <span className="text-on-surface-variant">{icon}</span>
        <IoArrowForward className="h-4 w-4 text-on-surface-variant opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      <p className="mt-3 text-3xl font-medium tracking-tight text-on-surface">{value}</p>
      <p className="mt-1 text-sm text-on-surface-variant">{label}</p>
    </Link>
  );
}

function QuickAction({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-3 rounded-sm bg-surface-container-lowest p-5 transition-colors hover:bg-surface-container-low"
    >
      <div className="flex-1">
        <p className="text-sm font-medium text-on-surface">{title}</p>
        <p className="mt-1 text-xs text-on-surface-variant">{description}</p>
      </div>
      <IoArrowForward className="mt-0.5 h-4 w-4 shrink-0 text-on-surface-variant transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
