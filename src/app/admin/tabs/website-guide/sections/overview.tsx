'use client';

import { IoAlertCircle, IoCheckmarkCircle, IoPencil } from 'react-icons/io5';

import { Button } from '@/components/ui/button';

import type { WebsiteGuideSubTab } from '../index';
import { WEBSITE_GUIDE_FIELDS,WebsiteGuideData } from '../types';

interface OverviewSectionProps {
  data: WebsiteGuideData;
  onNavigate?: (tab: WebsiteGuideSubTab) => void;
  title?: string;
  instructions?: string;
  showApprovalSummary?: boolean;
  onApprove?: () => Promise<void>;
  approving?: boolean;
  approvalError?: string | null;
  missingRequiredFields?: string[];
}

const SECTION_TO_TAB: Record<string, WebsiteGuideSubTab> = {
  'Business Basics': 'business',
  'Domain': 'domain',
  'Email': 'email',
  'Online Presence': 'presence',
  'SEO & Target Market': 'seo',
  'Website Features': 'features',
};

function formatValue(value: unknown, type: string): string {
  if (value === null || value === undefined || value === '') return '—';
  
  if (type === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  
  if (type === 'array') {
    if (Array.isArray(value)) {
      if (value.length === 0) return '—';
      if (typeof value[0] === 'string') {
        return value.join(', ');
      }
      return `${value.length} item(s)`;
    }
    return '—';
  }
  
  if (type === 'object') {
    if (Array.isArray(value)) {
      return value.length > 0 ? `${value.length} item(s)` : '—';
    }
    if (typeof value === 'object') {
      const keys = Object.keys(value);
      return keys.length > 0 ? `${keys.length} item(s)` : '—';
    }
    return '—';
  }
  
  if (type === 'hours') {
    if (typeof value === 'object' && value !== null) {
      const hours = value as Record<string, { open: string; close: string } | null>;
      const dayOrder = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
      const dayNames: Record<string, string> = {
        mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun'
      };
      
      const activeDays = dayOrder.filter(d => hours[d] !== null && hours[d] !== undefined);
      if (activeDays.length === 0) return '—';
      
      // Format time (e.g., "09:00" -> "9am", "17:00" -> "5pm")
      const formatTime = (time: string) => {
        const [h, m] = time.split(':').map(Number);
        const suffix = h >= 12 ? 'pm' : 'am';
        const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
        return m === 0 ? `${hour12}${suffix}` : `${hour12}:${m.toString().padStart(2, '0')}${suffix}`;
      };
      
      // Get the most common time range
      const firstDay = hours[activeDays[0]];
      const timeRange = firstDay ? `${formatTime(firstDay.open)}-${formatTime(firstDay.close)}` : '';
      
      // Summarize days (e.g., "Mon-Fri" for consecutive days)
      const formatDayRange = (days: string[]) => {
        if (days.length === 7) return 'Every day';
        if (days.length === 1) return dayNames[days[0]];
        
        // Check for Mon-Fri pattern
        const weekdays = ['mon', 'tue', 'wed', 'thu', 'fri'];
        if (days.length === 5 && weekdays.every(d => days.includes(d))) {
          return 'Mon-Fri';
        }
        
        // Check for consecutive days
        const firstIdx = dayOrder.indexOf(days[0]);
        const lastIdx = dayOrder.indexOf(days[days.length - 1]);
        const isConsecutive = days.every((d, i) => dayOrder.indexOf(d) === firstIdx + i);
        
        if (isConsecutive && days.length > 2) {
          return `${dayNames[days[0]]}-${dayNames[days[days.length - 1]]}`;
        }
        
        return days.map(d => dayNames[d]).join(', ');
      };
      
      return `${formatDayRange(activeDays)} ${timeRange}`;
    }
    return '—';
  }
  
  return String(value);
}

function hasValue(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return true;
}

function formatApprovalDate(value: string | null): string {
  if (!value) return '—';

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function OverviewSection({
  data,
  onNavigate,
  title,
  instructions,
  showApprovalSummary = false,
  onApprove,
  approving = false,
  approvalError,
  missingRequiredFields = [],
}: OverviewSectionProps) {
  return (
    <div className="space-y-6">
      {(title || instructions || showApprovalSummary) && (
        <div>
          {title ? <h2 className="text-2xl font-bold">{title}</h2> : null}
          {instructions ? (
            <p className="mt-2 text-sm text-neutral-400">{instructions}</p>
          ) : null}

          {showApprovalSummary ? (
            <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-800/60 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-white">Approval Status</p>
                  <p className="mt-1 text-sm text-neutral-400">
                    {data.websiteGuideApprovedAt
                      ? 'Approved'
                      : 'Not approved yet'}
                  </p>
                </div>
                <div className="sm:text-right">
                  <p className="text-sm font-medium text-white">Last Approval</p>
                  <p className="mt-1 text-sm text-neutral-400">
                    {formatApprovalDate(data.websiteGuideApprovedAt)}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {showApprovalSummary && approvalError ? (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-950/60 p-4">
              <p className="text-sm font-medium text-red-100">Approval blocked</p>
              <p className="mt-1 text-sm text-red-50">{approvalError}</p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-red-50">
                {missingRequiredFields.map((field) => (
                  <li key={field}>{field}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}

      {/* All Fields Table */}
      {WEBSITE_GUIDE_FIELDS.map((section) => (
        <div key={section.section}>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">{section.section}</h3>
            {onNavigate && SECTION_TO_TAB[section.section] && (
              <button
                onClick={() => {
                  onNavigate(SECTION_TO_TAB[section.section]);
                  window.scrollTo({ top: 0, behavior: 'instant' });
                }}
                className="flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-1.5 text-sm font-medium text-neutral-300 transition-colors hover:bg-zinc-700 hover:text-white"
              >
                <IoPencil className="h-3.5 w-3.5" />
                Edit
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm table-fixed">
              <thead>
                <tr className="border-b border-zinc-800 text-left">
                  <th className="w-[200px] pb-3 pr-4 font-medium text-neutral-400">Field</th>
                  <th className="w-[400px] pb-3 pr-4 font-medium text-neutral-400">Value</th>
                  <th className="w-[80px] pb-3 font-medium text-neutral-400">Required</th>
                </tr>
              </thead>
              <tbody>
                {section.fields.map((field) => {
                  const value = data[field.key];
                  const filled = hasValue(value);
                  return (
                    <tr key={field.key} className="border-b border-zinc-800/50">
                      <td className="w-[200px] py-3 pr-4 font-medium">{field.label}</td>
                      <td className="w-[400px] py-3 pr-4">
                        <span className={filled ? 'text-black' : 'text-neutral-500'}>
                          {formatValue(value, field.type)}
                        </span>
                      </td>
                      <td className="w-[80px] py-3">
                        {field.critical ? (
                          filled ? (
                            <IoCheckmarkCircle className="h-5 w-5 text-emerald-400" />
                          ) : (
                            <IoAlertCircle className="h-5 w-5 text-yellow-400" />
                          )
                        ) : (
                          <span className="text-neutral-600">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {showApprovalSummary && onApprove ? (
        <div className="sticky bottom-0 z-10 mt-6 flex justify-center py-4">
          {data.websiteGuideApprovedAt ? (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-500/20 px-5 py-3 text-sm font-medium text-emerald-400">
              <IoCheckmarkCircle className="h-5 w-5" aria-hidden="true" />
              Approved for Website
            </div>
          ) : (
            <Button
              onClick={() => {
                void onApprove();
              }}
              disabled={approving}
              variant="emerald"
              className="min-w-[130px] shadow-lg shadow-black/30 disabled:opacity-100 disabled:bg-emerald-600"
            >
              {approving ? 'Approving...' : 'Approve for Website'}
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}
