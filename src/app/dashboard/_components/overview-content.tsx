'use client';

import type { Business, DeployedWebsite } from '@/types/database';

interface OverviewContentProps {
  hasPlan: boolean;
  business: Business | null;
  deployedWebsite: DeployedWebsite | null;
  websiteGuideNeedsApproval: boolean;
  hostingEndDate: string | null;
  userEmail: string;
  selection: unknown;
  feedback: unknown[];
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function OverviewContent({
  business,
  userEmail,
}: OverviewContentProps) {
  const displayName = business?.business_name || userEmail || 'there';
  const greeting = getGreeting();

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-lg font-semibold'>
          {greeting}, {displayName}
        </h1>
        <p className='mt-2 text-sm text-neutral-500'>
          Welcome to your dashboard.
        </p>
      </div>
    </div>
  );
}
