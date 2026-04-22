# Onboarding Discovery Workflow Plan

## Overview
Use Workflow DevKit + AI SDK to auto-fill onboarding data by scraping user's existing web presence.

## User Flow

### 1. Homepage (unchanged)
- User enters email in hero form
- Clicks "Get Started for Free"
- Magic link sent to email
- **Change:** After auth, redirect to `/onboarding/discover` instead of `/account`

### 2. Discovery Page (`/onboarding/discover`)
New page where user provides ONE entry point:
- Business phone number
- Business name + city
- Existing website URL
- Facebook page URL
- Google Business Profile URL

### 3. Discovery Feed
After submitting entry point:
- Workflow starts, streams discovered items in real-time
- Each item appears with ✅ (confirm) and ❌ (decline) buttons
- User confirms/declines items as they appear
- Items include: business name, phone, address, hours, logo, colors, social links, etc.

### 4. Continue to Onboarding Steps
- User clicks "Continue with confirmed items"
- Redirects to existing onboarding steps (Step 1-6)
- Confirmed items are pre-filled
- User reviews/completes remaining fields

---

## Technical Implementation

### Packages to Install
```bash
npm install workflow @ai-sdk/openai ai
```

### Database Schema
```sql
-- Track discovery sessions (minimal - Workflow handles most state)
CREATE TABLE onboarding_discovery_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  workflow_run_id TEXT, -- Workflow DevKit run ID
  entry_type TEXT NOT NULL, -- 'phone', 'name_city', 'website', 'facebook', 'gbp'
  entry_value TEXT NOT NULL,
  status TEXT DEFAULT 'running', -- 'running', 'awaiting_confirmation', 'completed', 'failed'
  confirmed_data JSONB DEFAULT '{}', -- Final confirmed items
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);
```

### File Structure
```
src/
├── app/
│   └── (auth)/
│       └── onboarding/
│           └── discover/
│               ├── page.tsx           # Discovery page UI
│               └── discovery-feed.tsx # Real-time feed component
├── features/
│   └── onboarding/
│       └── workflows/
│           ├── discover-business.ts   # Main workflow
│           ├── steps/
│           │   ├── discover-sources.ts
│           │   ├── scrape-website.ts
│           │   ├── scrape-gbp.ts
│           │   ├── scrape-facebook.ts
│           │   └── merge-items.ts
│           └── schemas/
│               └── extracted-data.ts  # Zod schemas for AI extraction
└── api/
    └── onboarding/
        └── discover/
            ├── route.ts               # Start discovery workflow
            ├── [runId]/
            │   ├── route.ts           # Get workflow status/items
            │   └── confirm/
            │       └── route.ts       # Submit confirmations
```

### Workflow Structure
```typescript
// src/features/onboarding/workflows/discover-business.ts
import { sleep } from 'workflow';

export async function discoverBusinessWorkflow(input: {
  userId: string;
  entryType: 'phone' | 'name_city' | 'website' | 'facebook' | 'gbp';
  entryValue: string;
}) {
  "use workflow";

  // Step 1: Discover all sources from entry point
  const sources = await discoverSources(input.entryType, input.entryValue);

  // Step 2-4: Scrape sources in parallel
  const results = await Promise.all([
    sources.website ? scrapeWebsite(sources.website) : null,
    sources.gbp ? scrapeGoogleBusiness(sources.gbp) : null,
    sources.facebook ? scrapeFacebook(sources.facebook) : null,
  ]);

  // Step 5: Merge and dedupe items
  const items = await mergeDiscoveredItems(results.filter(Boolean));

  // Step 6: Emit items to frontend, wait for user confirmation
  // (Workflow pauses here until user clicks Continue)
  const { confirmed, declined } = await waitForUserConfirmation(input.userId, items);

  // Step 7: Save confirmed data to onboarding
  await saveConfirmedData(input.userId, confirmed);

  return { success: true, confirmedCount: confirmed.length };
}
```

### AI Extraction Example
```typescript
// src/features/onboarding/workflows/steps/scrape-website.ts
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

const websiteDataSchema = z.object({
  businessName: z.string().optional(),
  tagline: z.string().optional(),
  description: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  hours: z.record(z.string()).optional(),
  socialLinks: z.array(z.object({
    platform: z.enum(['facebook', 'instagram', 'twitter', 'linkedin', 'youtube', 'tiktok', 'yelp']),
    url: z.string(),
  })).optional(),
  services: z.array(z.string()).optional(),
  logoUrl: z.string().optional(),
  brandColors: z.array(z.string()).optional(),
});

export async function scrapeWebsite(url: string) {
  "use step";

  // Fetch HTML with Playwright
  const html = await fetchWithPlaywright(url);

  // Extract structured data with AI
  const { object } = await generateObject({
    model: openai('gpt-4o'),
    schema: websiteDataSchema,
    prompt: `Extract business information from this website HTML. 
             Look for: business name, contact info, hours, social links, services, logo URL, brand colors.
             
             HTML:
             ${html.slice(0, 50000)}`, // Truncate to fit context
  });

  return {
    source: 'website',
    sourceUrl: url,
    data: object,
  };
}
```

---

## UI Components

### Discovery Feed Item
```tsx
interface DiscoveryItem {
  id: string;
  fieldType: string; // 'business_name', 'phone', 'address', etc.
  value: any;
  source: string;
  confidence: number;
  status: 'pending' | 'confirmed' | 'declined';
}

function DiscoveryFeedItem({ item, onConfirm, onDecline }: Props) {
  return (
    <div className={cn(
      'rounded-xl border p-4 transition-all',
      item.status === 'confirmed' && 'border-emerald-500 bg-emerald-500/10',
      item.status === 'declined' && 'border-red-500/50 bg-red-500/5 opacity-50',
      item.status === 'pending' && 'border-zinc-700 bg-zinc-900',
    )}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-neutral-400">{getFieldLabel(item.fieldType)}</p>
          <p className="font-medium">{formatValue(item.value)}</p>
          <p className="text-xs text-neutral-500">Found on: {item.source}</p>
        </div>
        {item.status === 'pending' && (
          <div className="flex gap-2">
            <button onClick={onConfirm} className="rounded-lg bg-emerald-500 p-2 text-black hover:bg-emerald-400">
              <IoCheckmark className="h-5 w-5" />
            </button>
            <button onClick={onDecline} className="rounded-lg bg-zinc-700 p-2 hover:bg-zinc-600">
              <IoClose className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## Build Order

1. **Install packages** - workflow, @ai-sdk/openai, ai
2. **Database migration** - onboarding_discovery_sessions table
3. **Update auth redirect** - After magic link, go to /onboarding/discover
4. **Discovery page UI** - Entry point form
5. **API: Start workflow** - POST /api/onboarding/discover
6. **Workflow: discoverSources** - Find GBP, website, social from entry
7. **Workflow: scrapeWebsite** - Playwright + AI extraction
8. **Workflow: scrapeGoogleBusiness** - Places API or scrape
9. **Workflow: scrapeFacebook** - Scrape public page
10. **Workflow: mergeItems** - Dedupe, confidence scoring
11. **API: Get items** - GET /api/onboarding/discover/[runId]
12. **Discovery Feed UI** - Real-time item rendering with confirm/decline
13. **API: Submit confirmations** - POST /api/onboarding/discover/[runId]/confirm
14. **Workflow: finalize** - Save to businesses/brand_assets tables
15. **Continue flow** - Redirect to /onboarding with pre-filled data

---

## Notes

- Email is captured FIRST (critical for re-engagement)
- Discovery is optional - user can skip and fill manually
- Workflow handles retries, durability, observability
- AI SDK handles structured extraction from messy HTML
- User stays engaged by confirming items as they appear
- Declined items inform system (could surface alternatives)
