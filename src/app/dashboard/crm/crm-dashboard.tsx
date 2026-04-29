'use client';

import { useState } from 'react';
import { IoFunnel, IoGrid, IoList,IoPersonAdd, IoSearch } from 'react-icons/io5';

import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn';

interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  tags: string[];
  pipeline_stage: string;
  source: string;
  created_at: string;
}

const PIPELINE_STAGES = [
  { key: 'new', label: 'New', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  { key: 'contacted', label: 'Contacted', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
  { key: 'qualified', label: 'Qualified', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
  { key: 'won', label: 'Won', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' },
  { key: 'lost', label: 'Lost', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
];

export function CrmDashboard({ contacts }: { contacts: Contact[] }) {
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'list' | 'pipeline'>('list');
  const [stageFilter, setStageFilter] = useState<string | null>(null);

  const filtered = contacts.filter((c) => {
    const matchesSearch =
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase());
    const matchesStage = !stageFilter || c.pipeline_stage === stageFilter;
    return matchesSearch && matchesStage;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-normal tracking-tight text-on-surface lg:text-4xl">CRM</h1>
          <p className="mt-2 text-on-surface-variant">Manage contacts, track leads, and grow your pipeline.</p>
        </div>
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
          <IoPersonAdd className="mr-2 h-4 w-4" />
          Add Contact
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <IoSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-sm border border-outline-variant/20 bg-surface-container-lowest py-2 pl-9 pr-3 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-1 rounded-sm border border-outline-variant/20 p-0.5">
          <button
            onClick={() => setView('list')}
            className={cn('rounded-sm p-1.5 text-on-surface-variant transition-colors', view === 'list' && 'bg-primary text-primary-foreground')}
          >
            <IoList className="h-4 w-4" />
          </button>
          <button
            onClick={() => setView('pipeline')}
            className={cn('rounded-sm p-1.5 text-on-surface-variant transition-colors', view === 'pipeline' && 'bg-primary text-primary-foreground')}
          >
            <IoGrid className="h-4 w-4" />
          </button>
        </div>

        <select
          value={stageFilter ?? ''}
          onChange={(e) => setStageFilter(e.target.value || null)}
          className="rounded-sm border border-outline-variant/20 bg-surface-container-lowest px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
        >
          <option value="">All Stages</option>
          {PIPELINE_STAGES.map((s) => (
            <option key={s.key} value={s.key}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* List view */}
      {view === 'list' && (
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="rounded-sm bg-surface-container-lowest p-8 text-center">
              <p className="text-on-surface-variant">
                {contacts.length === 0 ? 'No contacts yet. Add your first contact to get started.' : 'No contacts match your search.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-outline-variant/20 text-left">
                    <th className="pb-3 pr-4 font-medium text-on-surface-variant">Name</th>
                    <th className="pb-3 pr-4 font-medium text-on-surface-variant">Email</th>
                    <th className="hidden pb-3 pr-4 font-medium text-on-surface-variant sm:table-cell">Phone</th>
                    <th className="pb-3 pr-4 font-medium text-on-surface-variant">Stage</th>
                    <th className="hidden pb-3 font-medium text-on-surface-variant md:table-cell">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((contact) => {
                    const stage = PIPELINE_STAGES.find((s) => s.key === contact.pipeline_stage) ?? PIPELINE_STAGES[0];
                    return (
                      <tr key={contact.id} className="border-b border-outline-variant/10 transition-colors hover:bg-surface-container-low">
                        <td className="py-3 pr-4">
                          <p className="font-medium text-on-surface">{contact.name}</p>
                          {contact.tags.length > 0 && (
                            <div className="mt-1 flex gap-1">
                              {contact.tags.slice(0, 3).map((tag) => (
                                <span key={tag} className="rounded-full bg-surface-container-low px-2 py-0.5 text-xs text-on-surface-variant">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="py-3 pr-4 text-on-surface-variant">{contact.email}</td>
                        <td className="hidden py-3 pr-4 text-on-surface-variant sm:table-cell">{contact.phone ?? '—'}</td>
                        <td className="py-3 pr-4">
                          <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', stage.color)}>
                            {stage.label}
                          </span>
                        </td>
                        <td className="hidden py-3 text-on-surface-variant capitalize md:table-cell">{contact.source}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Pipeline (Kanban) view */}
      {view === 'pipeline' && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {PIPELINE_STAGES.map((stage) => {
            const stageContacts = filtered.filter((c) => c.pipeline_stage === stage.key);
            return (
              <div key={stage.key} className="w-[260px] shrink-0">
                <div className="mb-3 flex items-center gap-2">
                  <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', stage.color)}>
                    {stage.label}
                  </span>
                  <span className="text-xs text-on-surface-variant">{stageContacts.length}</span>
                </div>
                <div className="space-y-2">
                  {stageContacts.map((contact) => (
                    <div key={contact.id} className="rounded-sm bg-surface-container-lowest p-3">
                      <p className="text-sm font-medium text-on-surface">{contact.name}</p>
                      <p className="mt-1 text-xs text-on-surface-variant">{contact.email}</p>
                      {contact.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {contact.tags.slice(0, 2).map((tag) => (
                            <span key={tag} className="rounded-full bg-surface-container-low px-2 py-0.5 text-xs text-on-surface-variant">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {stageContacts.length === 0 && (
                    <div className="rounded-sm border border-dashed border-outline-variant/20 p-4 text-center text-xs text-on-surface-variant">
                      No contacts
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
