'use client';

import { IoCheckmarkCircle, IoCloseCircle, IoFlash, IoPause, IoPlay, IoWarning } from 'react-icons/io5';

import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn';

interface Automation {
  id: string;
  name: string;
  description: string | null;
  status: string;
  created_at: string;
}

interface Approval {
  id: string;
  description: string;
  status: string;
  proposed_action: Record<string, unknown> | null;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof IoFlash }> = {
  active: { label: 'Active', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400', icon: IoPlay },
  paused: { label: 'Paused', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400', icon: IoPause },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', icon: IoWarning },
};

export function AutomationsDashboard({ automations, approvals }: { automations: Automation[]; approvals: Approval[] }) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-normal tracking-tight text-on-surface lg:text-4xl">
          Automations
        </h1>
        <p className="mt-2 text-on-surface-variant">
          Monitor your AI-powered workflows and approve pending actions.
        </p>
      </div>

      {/* Pending approvals */}
      {approvals.length > 0 && (
        <div>
          <h2 className="flex items-center gap-2 text-sm font-medium text-on-surface">
            <IoWarning className="h-4 w-4 text-amber-500" />
            Pending Approvals ({approvals.length})
          </h2>
          <div className="mt-3 space-y-2">
            {approvals.map((approval) => (
              <div key={approval.id} className="flex items-start justify-between gap-4 rounded-sm bg-amber-50 p-4 dark:bg-amber-900/10">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-on-surface">{approval.description}</p>
                  <p className="mt-1 text-xs text-on-surface-variant">
                    {new Date(approval.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-500">
                    <IoCheckmarkCircle className="mr-1 h-3.5 w-3.5" />
                    Approve
                  </Button>
                  <Button size="sm" variant="outline">
                    <IoCloseCircle className="mr-1 h-3.5 w-3.5" />
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Automations list */}
      <div>
        <h2 className="text-sm font-medium text-on-surface">Workflows</h2>
        <div className="mt-3 space-y-2">
          {automations.length === 0 ? (
            <div className="rounded-sm bg-surface-container-lowest p-8 text-center">
              <IoFlash className="mx-auto h-8 w-8 text-on-surface-variant/40" />
              <p className="mt-3 text-on-surface-variant">No automations configured yet.</p>
              <p className="mt-1 text-xs text-on-surface-variant">
                Contact your admin to set up AI-powered workflows for your business.
              </p>
            </div>
          ) : (
            automations.map((auto) => {
              const config = STATUS_CONFIG[auto.status] ?? STATUS_CONFIG.active;
              return (
                <div key={auto.id} className="flex items-center justify-between rounded-sm bg-surface-container-lowest p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-on-surface">{auto.name}</p>
                      <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', config.color)}>
                        {config.label}
                      </span>
                    </div>
                    {auto.description && (
                      <p className="mt-1 text-xs text-on-surface-variant">{auto.description}</p>
                    )}
                  </div>
                  <config.icon className="h-4 w-4 shrink-0 text-on-surface-variant" />
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
