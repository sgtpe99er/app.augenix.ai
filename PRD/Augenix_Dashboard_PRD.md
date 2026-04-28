# PRD: Augenix Dashboard Platform

**Version**: 2.1  
**Date**: April 28, 2026  
**Owner**: Nathan Glass  
**Status**: Draft for Review

---

## 1. Executive Summary

**Augenix** is building a multi-tenant SaaS platform that provides local businesses with:
- A modern dashboard to manage their AI-powered website and marketing automations.
- An **AI-first CMS** that replaces traditional page editors with natural language commands.
- A full suite of AI tools (chatbot, content generation, email sequences, social posting, automations).

The platform consists of two projects:
- **Augenix Dashboard** (`app.augenix.ai` + `*.augenix.ai`) — the multi-tenant SaaS dashboard where clients manage their website, CRM, and automations.
- **Augenix Sites** (client custom domains, e.g. `acmeplumbing.com`) — a lightweight site renderer that serves client websites by reading structured content from Supabase.

Both projects share one Supabase instance. The platform is managed centrally from `app.augenix.ai`.

The core innovation is the **AI Website Command Center** — users simply describe changes in plain English, optionally upload an image, review the AI's proposal, and approve. Changes go live instantly via Supabase real-time content delivery. No traditional CMS or page builder required.

This platform serves two client segments from one codebase:
- **Website Clients** (full CMS + CRM + AI marketing tools)
- **Automation Clients** (AI automations dashboard only)

**Goal**: Deliver a highly maintainable, scalable, AI-native platform that lets you serve 10–100+ clients with minimal ongoing development effort.

---

## 2. Problem Statement

Local businesses need professional websites and marketing systems but lack time, budget, or technical skills to maintain them. Traditional CMS platforms are complex and time-consuming. Existing AI website tools are either too limited or require constant manual editing.

**Current Pain**:
- Updating a website requires logging into a clunky editor or hiring a developer.
- Content creation (blog, social, email) is repetitive and slow.
- No single place to manage website + CRM + AI automations.
- As the builder, you face code duplication when scaling across clients.

**Solution**: One intelligent dashboard where AI does the heavy lifting for content and edits, while you retain full control via a central admin panel.

---

## 3. Vision & Goals

**Vision**: Every local business has an AI co-pilot that maintains and grows their online presence while they focus on running their company.

**Business Goals** (12 months):
- Onboard 50+ paying clients
- Achieve $15k–25k MRR
- Maintain <5 hours/week of support work per 10 clients
- Zero code duplication across client instances

**Product Goals**:
- 90%+ of website edits completed via AI commands (no manual editing)
- < 2 minutes from "describe change" to live
- High client retention through delightful AI experiences

---

## 4. Target Users & Personas

| Persona                  | Type              | Needs                                                                 | Pain Points                          |
|--------------------------|-------------------|-----------------------------------------------------------------------|--------------------------------------|
| Small business owner     | Website Client    | Easy website updates, lead management, content creation               | No time for tech, hates editing tools |
| Marketing manager        | Website Client    | Consistent content across blog/social/email                           | Repetitive work, inconsistent output |
| Operations / Admin       | Automation Client | Monitor automations, human-in-the-loop approvals                      | Wants visibility without complexity  |
| You (Founder)            | Admin             | Manage all clients, enable features, support, billing                 | Scaling without proportional effort  |

---

## 5. Product Scope & Modules

**Two-project architecture** powered by one shared Supabase instance:
- **Augenix Dashboard** — Multi-tenant Next.js app (this project) deployed as one Vercel project. Handles all client dashboards, admin panel, AI processing, CRM, and automations.
- **Augenix Sites** — Lightweight Next.js site renderer deployed as a second Vercel project (separate repo). Serves all client public-facing websites from Supabase content.

### Core Shared Modules (All Clients)
- Authentication (Supabase Auth)
- Organization / Workspace management
- Billing & Subscriptions (Stripe)
- Usage analytics & AI credit tracking
- Settings & Branding (logo, colors)
- Transactional email system (react-email + nodemailer)
- Dark mode support

### Website Client Modules (Paid Tier)
- **AI Website Command Center** (Core CMS replacement — see §7)
- CRM (Contacts, form submissions, lead pipeline)
- AI Chatbot (embeddable on their website)
- AI Content Generation (blog, social, email)
- Email Sequences & Broadcasts
- Social Posting Scheduler

### Automation-Only Client Modules
- AI Automations Dashboard (visual status, logs, human approvals)
- Custom workflow builder (prompt-based or config-driven)
- Human-in-the-loop queue

### Admin Panel (`app.augenix.ai`)
- Client list & search
- Per-client feature toggles (CRM, CMS, AI tools, etc.)
- Impersonation mode (JWT-based impersonation cookie)
- Global usage & revenue dashboard
- Client onboarding wizard

---

## 6. Authentication & Login Flow

### Overview
All authentication is handled centrally via Supabase Auth in the `app.augenix.ai` project. The marketing site (`augenix.ai`) links to the login page. Supabase session cookies are configured on the `.augenix.ai` parent domain so they work across all subdomains.

### Login Experience

| Entry Point                        | Behavior                                                                 | Post-Login Destination                  |
|------------------------------------|--------------------------------------------------------------------------|-----------------------------------------|
| Login button on **augenix.ai**     | Redirects to `app.augenix.ai/login`                                      | User's subdomain (e.g. `acme.augenix.ai`) |
| Direct visit to `acme.augenix.ai`  | Shows branded login page for that client                                 | Stays on `acme.augenix.ai`               |
| Already logged in                  | Auto-redirected to correct dashboard                                     | Their subdomain                         |

### Key Requirements
- **Single Auth Source**: All Supabase authentication occurs inside the `app.augenix.ai` project.
- **Smart Redirect**: After successful login, the system automatically redirects the user to their primary organization's subdomain.
- **Branded Login on Subdomains**: The login page on `client.augenix.ai/login` pulls the organization's logo, colors, and name from Supabase for a native feel.
- **Admin Access**: Admin users log in at `app.augenix.ai` and remain in the admin panel (with ability to impersonate clients).

### Technical Implementation

**Middleware** (`src/middleware.ts`):
1. Detects subdomain from `Host` header (e.g. `acme` from `acme.augenix.ai`).
2. Refreshes Supabase session via `@supabase/ssr` `createServerClient`.
3. For **subdomain requests**: looks up the `organizations` table by `slug`, verifies the user is a member via `org_members`, and injects the `org_id` into request headers.
4. For **`app.augenix.ai` admin routes**: checks `is_admin` RPC and redirects non-admins to `/dashboard`.
5. Protects `/dashboard`, `/onboarding`, `/payment` routes — redirects unauthenticated users to `/login`.

**Cross-Subdomain Cookies**:
- In production, Supabase auth cookies are set with `domain: '.augenix.ai'`, `SameSite: None`, `Secure: true`.
- This allows seamless auth across `app.augenix.ai`, `acme.augenix.ai`, etc.

**Impersonation**:
- Admin clicks "Impersonate" on a client → sets a signed JWT cookie (`impersonate_token`) containing `{ adminId, targetUserId }`.
- Dashboard layout reads this cookie, verifies the admin's identity, and renders the target user's data.
- An "Exit Impersonation" action clears the cookie.

**Admin Role Verification**:
- A Supabase RPC function `is_admin(user_uuid)` checks the `admin_users` table.
- Middleware calls this for all `/admin/*` routes.

---

## 7. Key User Flows

### 7.1 Primary Flow: AI Website Command Center (The Star Feature)

1. User logs into `acme.augenix.ai`.
2. Navigates to **AI Command Center**.
3. Selects a **page** from a dropdown (Homepage, About, Services, Contact, Blog, etc. — predefined per client in the `pages` table).
4. The current page content loads from Supabase (structured JSON content — see §10).
5. Types natural language instruction, e.g.:
   - "Update the hero section to say we now offer same-day delivery"
   - "Add a new FAQ about our warranty policy to the bottom of this page"
   - "Replace the team photo with this new image and update the caption"
6. Optionally uploads an image to Supabase Storage (AI decides: add new or replace existing).
7. Clicks **"Generate Changes"**.
8. The system sends the current page content + user instruction + brand context (from org settings) to the AI model via `@ai-sdk/gateway`.
9. AI returns a **proposed new version** of the structured page content.
10. The UI renders a **diff view**:
    - Side-by-side Before / After preview
    - Highlighted changes per section (text diffs, new/removed sections, image swaps)
    - Summary of what changed in plain English
11. User can request revisions ("Make the tone more friendly") → loops back to step 8 with revision context.
12. User clicks **"Approve & Publish"**.
13. The approved content is written to the `pages` table → the edit is logged in `page_edits` → changes are **instantly live** via Supabase real-time.

**AI Processing Details**:
- Model: Accessed via `@ai-sdk/gateway` (Vercel AI SDK Gateway). Recommended: GPT-4o or Claude Sonnet for text edits.
- System prompt includes: page structure schema, brand voice from org settings, current page content, image context.
- Output: Freeform structured JSON (sections array). Validated with Zod for basic shape (array of `{ id, type, content }` objects) but content within each section is unconstrained.
- Image handling: If user uploads an image, it's stored in Supabase Storage. The AI receives the image URL and decides placement based on the instruction.

**Content Structure** (freeform):

Page content is stored as a **freeform JSON array of sections**. There is no fixed schema for section types — the AI can create any structure it deems appropriate for the instruction. This gives maximum flexibility for diverse business websites.

```json
{
  "sections": [
    {
      "id": "s1",
      "type": "hero",
      "content": {
        "headline": "Welcome to Acme Plumbing",
        "subheadline": "Same-day service, guaranteed.",
        "ctaText": "Book Now",
        "ctaLink": "/contact",
        "backgroundImage": "https://..."
      }
    },
    {
      "id": "s2",
      "type": "three_column_features",
      "content": {
        "heading": "Why Choose Us",
        "items": [
          { "title": "Licensed & Insured", "description": "...", "icon": "shield" },
          { "title": "24/7 Emergency", "description": "...", "icon": "clock" },
          { "title": "Free Estimates", "description": "...", "icon": "calculator" }
        ]
      }
    },
    {
      "id": "s3",
      "type": "testimonial_carousel",
      "content": {
        "items": [
          { "quote": "...", "author": "Jane D.", "rating": 5 }
        ]
      }
    }
  ]
}
```

The Augenix Sites renderer interprets each section's `type` field and renders it with the appropriate component. Unknown types fall back to a generic content block. This allows the AI to invent new section types as needed while the renderer gracefully handles them.

### 7.2 Client Onboarding Flow

1. New client signs up at `app.augenix.ai/signup`.
2. Post-signup, they enter the **onboarding wizard**:
   - **Step 1**: Business info (name, industry, location).
   - **Step 2**: Brand assets (existing logo upload, brand colors, style preferences).
   - **Step 3**: Target audience, services/products, desired website features.
   - **Step 4**: Select a pricing plan (Stripe Checkout).
3. On completion, the system creates their `organization`, assigns a subdomain slug, and seeds their initial pages with AI-generated content based on onboarding data.
4. Client is redirected to their subdomain dashboard.

### 7.3 Other Important Flows
- **CRM**: Website forms submit to an API endpoint → stored in `contacts` table → appear in dashboard with lead scoring.
- **Content Generation**: From Command Center or dedicated "Quick Create" → generate blog post / social posts / email from a prompt or uploaded notes.
- **Automation Monitoring** (for automation clients): See running workflows, approve/reject AI-suggested actions in the human-in-the-loop queue.
- **Admin Client Management**: Toggle features for any client instantly, impersonate, view usage.

---

## 8. Feature Specifications

### 8.1 AI Website Command Center
- Page selector dropdown populated from `pages` table (filtered by org)
- Live preview link for the selected page (opens the client's public website)
- Natural language input (textarea) + optional image upload (drag-and-drop to Supabase Storage)
- AI processing via `@ai-sdk/gateway` with structured JSON output (Zod-validated)
- Diff/review screen: side-by-side section comparison, highlighted changes, plain-English summary
- One-click "Approve & Publish" → writes to `pages` + logs to `page_edits`
- "Request Revision" loop with conversational context
- Full history of all AI edits in `page_edits` (audit log with before/after snapshots, user, timestamp)
- Undo: revert to any previous version from the edit history

### 8.2 CRM
- `contacts` table with name, email, phone, tags (text[]), notes, activity timeline (JSONB)
- Form submission API endpoint (`/api/webhooks/form`) — accepts POST with org API key for auth
- Lead pipeline views (kanban-style: New → Contacted → Qualified → Won/Lost)
- Contact detail page with timeline of interactions

### 8.3 AI Tools
- **Chatbot** (self-hosted): Configuration page in the dashboard (system prompt, welcome message, knowledge base upload). The chatbot itself is served via an API route in this project (`/api/chatbot/[orgSlug]`). Clients embed a `<script>` tag on their website that loads a chat widget connecting to this endpoint. Uses `@ai-sdk/gateway` with the org's knowledge base context. Chatbot conversations are stored in a `chatbot_messages` table for analytics.
- **Content Generation**: One-click generation of blog posts, social posts, email sequences from a prompt or uploaded notes. Uses `@ai-sdk/gateway`. Output stored in `blog_posts`, `email_sequences` tables.
- **Usage Tracking**: Token/credit consumption tracked per org in `ai_usage` table. Displayed in dashboard with daily/monthly charts.

### 8.4 Automations Dashboard
- List of active automations with status (running, paused, failed) from `automations` table
- Approval queue for human-in-the-loop steps (`approvals` table)
- Logs and performance metrics per automation run (`automation_runs`)

### 8.5 Transactional Email System
Built with `react-email` for templates and `nodemailer` for delivery.

**Email Templates**:
- Welcome (post-signup)
- Onboarding complete
- Edit request received
- Edit published (with before/after summary)
- Payment confirmation
- Subscription renewal reminder
- Weekly usage digest (optional)

---

## 9. Technical Architecture

### Two-Project Architecture

| Project | Repo | Vercel Project | Domains | Purpose |
|---------|------|----------------|---------|--------|
| **Augenix Dashboard** | `app.augenix.ai` (this repo) | 1 Vercel project | `app.augenix.ai` + `*.augenix.ai` | Client dashboards, admin panel, AI processing, API |
| **Augenix Sites** | `sites.augenix.ai` (separate repo) | 1 Vercel project | Client custom domains (e.g. `acmeplumbing.com`) | Lightweight website renderer |

Both projects connect to the **same Supabase instance** (`mfpechdtvbmuykstzyxg`). No data sync needed.

### Dashboard Stack (This Project)

| Layer          | Technology                                                                 |
|----------------|---------------------------------------------------------------------------|
| **Framework**  | Next.js 16 (App Router, React 19, Turbopack dev)                         |
| **Styling**    | Tailwind CSS 3.x + `tailwindcss-animate` + `@tailwindcss/typography`     |
| **Components** | shadcn/ui (New York style, RSC-enabled) + Radix UI primitives            |
| **Icons**      | Lucide React + React Icons (Ionicons)                                    |
| **Backend**    | Supabase (Postgres 17 + Auth + Storage + Edge Functions + Realtime)      |
| **AI**         | `@ai-sdk/gateway` (Vercel AI SDK Gateway) + `ai` SDK + Zod schemas      |
| **Payments**   | Stripe (subscriptions + Checkout + webhooks)                             |
| **Email**      | `react-email` templates + `nodemailer` transport                         |
| **Validation** | Zod (API inputs, AI structured output, form data)                        |
| **Analytics**  | `@vercel/analytics`                                                       |
| **Hosting**    | Vercel (single project for dashboard)                                     |
| **Testing**    | Vitest (unit/integration) + Playwright (E2E)                             |
| **Linting**    | ESLint + Prettier + `eslint-plugin-tailwindcss`                          |

### Augenix Sites Stack (Separate Project)

| Layer          | Technology                                                                 |
|----------------|---------------------------------------------------------------------------|
| **Framework**  | Next.js 16 (App Router, React 19)                                        |
| **Styling**    | Tailwind CSS 3.x — per-client brand theming via CSS variables            |
| **Backend**    | Supabase JS client (read-only: `pages`, `organizations`, `media`)        |
| **Rendering**  | ISR with on-demand revalidation (triggered by dashboard on publish)       |
| **Hosting**    | Vercel (single project, all client domains)                               |

The Sites project is intentionally minimal (~20 files). Its only job:
1. Middleware maps incoming domain → `org_id` (via `organizations.custom_domain` column).
2. A catch-all `[...slug]/page.tsx` fetches the page content from Supabase `pages` table.
3. A section renderer iterates the freeform `sections` array and renders each with a matched component (or a generic fallback for unknown types).
4. Brand colors/fonts are injected as CSS custom properties from the org's `brand_colors` settings.

### Design System

See `DESIGN.md` for the full design system specification ("The Digital Atelier").

**Key Design Tokens**:
- **Fonts**: Newsreader (serif — display/headlines) + Inter (sans — UI/body/labels)
- **Primary Surface**: `#f7f9fb` — consistent gallery-like base canvas
- **Surface Hierarchy**: 3-tier tonal layering (surface → container-low → container-lowest)
- **No-Line Rule**: No 1px solid borders for section containment; use white space and tonal transitions
- **Elevation**: Tonal layering instead of drop shadows; ambient shadows (32-64px blur, 4-6% opacity) for floating elements only
- **Glass Effects**: Semi-transparent surfaces with `backdrop-blur` (12-20px) for modals/hover menus
- **Dark Mode**: Full dark mode support via CSS variables and `class` strategy

**shadcn/ui Configuration** (`components.json`):
- Style: `new-york`
- RSC: enabled
- Base color: `slate`
- CSS variables: enabled
- Path aliases: `@/components`, `@/utils/cn`

### Domains

| Domain                     | Vercel Project | Purpose                              |
|----------------------------|----------------|--------------------------------------|
| `augenix.ai`              | Dashboard      | Marketing site                       |
| `app.augenix.ai`          | Dashboard      | Admin panel + Auth hub               |
| `*.augenix.ai` (wildcard) | Dashboard      | Client dashboards (e.g. `acme.augenix.ai`) |
| Client custom domains      | Sites          | Public-facing client websites (e.g. `acmeplumbing.com`) |

The Dashboard and Sites are two separate Vercel projects. Client custom domains are added to the Sites Vercel project.

### Multi-Tenancy Strategy

- **Row Level Security (RLS)**: Every tenant-scoped table includes an `org_id` column. RLS policies enforce `org_id = auth.uid()'s org`
- **Middleware**: Detects subdomain → resolves `org_id` → injects into request context.
- **Feature Flags**: `org_features` table stores per-org boolean flags. Checked at the page/component level to show/hide modules.

### "Push Live" Mechanism

The Dashboard and Sites projects work together for instant content delivery:

1. **Dashboard writes**: When a user approves an AI edit, the Dashboard writes the new content to the `pages` table in Supabase and logs the edit in `page_edits`.
2. **Revalidation trigger**: The Dashboard then calls the Sites project's revalidation endpoint (`POST /api/revalidate`) with the `org_id` and `page_slug`. This uses Next.js on-demand ISR revalidation.
3. **Sites serves fresh content**: The next visitor to the client's website gets the updated page. Typical latency: 1–3 seconds from "Approve & Publish" to live.
4. **Fallback — Supabase Realtime**: For real-time preview (e.g. while the client is viewing their site during editing), the Sites project can optionally subscribe to Supabase Realtime changes on the `pages` table and hot-swap content without a full page reload.
5. **No rebuild, no redeploy**. Content updates are live in seconds. The Sites project never needs to be redeployed for content changes.

**Revalidation API** (on the Sites project):
```
POST /api/revalidate
Headers: { "x-revalidate-secret": "<shared secret>" }
Body: { "orgId": "uuid", "pageSlug": "homepage" }
```
This calls `revalidatePath(`/${pageSlug}`)` for the matching org's domain.

### App Route Structure

```
src/app/
├── (auth)/              # Login, signup, auth callback
│   ├── login/
│   ├── signup/
│   └── auth/callback/
├── (marketing)/         # Public marketing pages
│   ├── page.tsx         # Landing page
│   └── support/
├── (account)/           # User account settings
│   └── account/
├── admin/               # Admin panel (protected by is_admin)
│   ├── page.tsx         # Overview dashboard
│   ├── tabs/            # Tab components (customers, edits, analytics, etc.)
│   ├── settings/
│   └── ...
├── dashboard/           # Client dashboard (subdomain-scoped)
│   ├── page.tsx         # Client overview
│   ├── command-center/  # AI Website Command Center
│   ├── crm/             # CRM module
│   ├── content/         # AI Content Generation
│   ├── automations/     # Automations dashboard
│   ├── chatbot/         # Chatbot configuration
│   └── settings/        # Org settings & branding
├── api/
│   ├── admin/           # Admin API routes
│   ├── ai/              # AI processing endpoints
│   ├── user/            # User-facing API routes
│   └── webhooks/        # Stripe + form submission webhooks
└── layout.tsx           # Root layout
```

---

## 10. Data Model (Supabase Tables)

> **Note**: Any existing tables with the `aa_demo_` prefix are part of a separate demo application sharing this Supabase project. They must not be modified or removed.

### Core Tables

**`users`** (synced from `auth.users` via trigger)
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK, references `auth.users` |
| `full_name` | text | |
| `avatar_url` | text | |
| `billing_address` | jsonb | |
| `payment_method` | jsonb | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | auto-updated via trigger |

**`organizations`**
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `name` | text | Business/org display name |
| `slug` | text | Unique, used for dashboard subdomain (e.g. `acme`) |
| `custom_domain` | text | Client's public website domain (e.g. `acmeplumbing.com`). Used by Sites project for domain→org mapping. |
| `logo_url` | text | Supabase Storage URL |
| `brand_colors` | jsonb | `{ primary, secondary, accent, background, text }` |
| `brand_voice` | text | AI prompt fragment for maintaining tone |
| `industry` | text | |
| `plan` | text | `free`, `website_pro`, `automation_pro` |
| `stripe_customer_id` | text | |
| `stripe_subscription_id` | text | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

**`org_members`**
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `org_id` | uuid | FK → `organizations` |
| `user_id` | uuid | FK → `users` |
| `role` | text | `owner`, `admin`, `member` |
| `created_at` | timestamptz | |

**`org_features`** (feature flags per org)
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `org_id` | uuid | FK → `organizations`, unique |
| `cms_enabled` | boolean | AI Command Center access |
| `crm_enabled` | boolean | CRM module access |
| `chatbot_enabled` | boolean | AI Chatbot access |
| `email_ai_enabled` | boolean | Email sequence generator |
| `social_enabled` | boolean | Social posting |
| `automations_enabled` | boolean | Automations dashboard |

**`admin_users`**
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `user_id` | uuid | FK → `users`, unique |
| `created_at` | timestamptz | |

### Website / CMS Tables

**`pages`** (client website pages — structured content for AI)
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `org_id` | uuid | FK → `organizations` |
| `slug` | text | `homepage`, `about`, `services`, etc. |
| `title` | text | Page title |
| `content` | jsonb | Freeform section-based JSON (see §7.1) — array of `{ id, type, content }` objects |
| `meta_description` | text | SEO meta |
| `is_published` | boolean | |
| `published_at` | timestamptz | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

RLS: `org_id = auth.uid()'s org`

**`page_edits`** (audit log of AI changes)
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `page_id` | uuid | FK → `pages` |
| `org_id` | uuid | FK → `organizations` |
| `user_id` | uuid | FK → `users` (who requested) |
| `instruction` | text | The natural language request |
| `content_before` | jsonb | Snapshot before edit |
| `content_after` | jsonb | Snapshot after edit |
| `ai_model` | text | Model used (e.g. `gpt-4o`) |
| `ai_tokens_used` | integer | Token count for billing |
| `status` | text | `pending`, `approved`, `rejected`, `reverted` |
| `created_at` | timestamptz | |

### CRM Tables

**`contacts`**
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `org_id` | uuid | FK → `organizations` |
| `name` | text | |
| `email` | text | |
| `phone` | text | |
| `tags` | text[] | |
| `notes` | text | |
| `pipeline_stage` | text | `new`, `contacted`, `qualified`, `won`, `lost` |
| `source` | text | `form`, `manual`, `import` |
| `activity` | jsonb | Timeline of interactions |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

### Content Tables

**`media`** (uploaded images/files)
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `org_id` | uuid | FK → `organizations` |
| `storage_url` | text | Supabase Storage public URL |
| `filename` | text | |
| `content_type` | text | MIME type |
| `tags` | text[] | |
| `uploaded_by` | uuid | FK → `users` |
| `created_at` | timestamptz | |

**`blog_posts`**, **`email_sequences`** — similar structure with `org_id`, `title`, `content` (jsonb), `status`, `created_at`, `published_at`.

**`faqs`**
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `org_id` | uuid | FK → `organizations` |
| `page_id` | uuid | FK → `pages` (optional, if page-specific) |
| `question` | text | |
| `answer` | text | |
| `sort_order` | integer | |
| `created_at` | timestamptz | |

### Automation Tables

**`automations`**
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `org_id` | uuid | FK → `organizations` |
| `name` | text | |
| `description` | text | |
| `config` | jsonb | Workflow definition |
| `status` | text | `active`, `paused`, `failed` |
| `created_at` | timestamptz | |

**`automation_runs`**
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `automation_id` | uuid | FK → `automations` |
| `org_id` | uuid | FK → `organizations` |
| `status` | text | `running`, `completed`, `failed`, `awaiting_approval` |
| `output` | jsonb | Result data |
| `started_at` | timestamptz | |
| `completed_at` | timestamptz | |

**`approvals`** (human-in-the-loop queue)
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `automation_run_id` | uuid | FK → `automation_runs` |
| `org_id` | uuid | FK → `organizations` |
| `description` | text | What needs approval |
| `proposed_action` | jsonb | AI's proposed action |
| `status` | text | `pending`, `approved`, `rejected` |
| `decided_by` | uuid | FK → `users` |
| `decided_at` | timestamptz | |
| `created_at` | timestamptz | |

### Billing & Usage Tables

**`ai_usage`** (token/credit tracking per org)
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `org_id` | uuid | FK → `organizations` |
| `date` | date | Daily aggregation |
| `model` | text | AI model used |
| `tokens_in` | integer | Input tokens |
| `tokens_out` | integer | Output tokens |
| `credits_used` | numeric | Normalized credit cost |
| `feature` | text | `command_center`, `chatbot`, `content_gen`, etc. |

### Key Database Functions

- **`is_admin(user_uuid uuid) → boolean`**: Checks if user exists in `admin_users`.
- **`get_user_org(user_uuid uuid) → uuid`**: Returns the primary `org_id` for a user from `org_members`.
- **`get_admin_stats() → jsonb`**: Aggregates dashboard stats (total orgs, MRR, active websites, etc.).
- **`handle_new_user()`**: Trigger function on `auth.users` insert → creates a row in `users`.
- **`update_updated_at_column()`**: Trigger function to auto-set `updated_at` on row update.

### RLS Strategy

All tenant-scoped tables enforce RLS:
```sql
-- Example policy for pages
CREATE POLICY "Users can view pages in their org" ON pages
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );
```

Admin users bypass RLS via `supabase-admin` service-role client on the server side.

### Supabase Storage Buckets

| Bucket | Purpose | Access |
|--------|---------|--------|
| `media` | Client-uploaded images (website, CRM) | Public read, authenticated write (scoped by org) |
| `logos` | Organization logos | Public read, admin write |
| `email-assets` | Email template images | Public read |

### Chatbot Table

**`chatbot_configs`** (per-org chatbot settings)
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `org_id` | uuid | FK → `organizations`, unique |
| `system_prompt` | text | Custom system prompt for the chatbot |
| `welcome_message` | text | Greeting shown when widget opens |
| `knowledge_base` | jsonb | Uploaded docs/FAQ content for RAG context |
| `is_enabled` | boolean | Whether chatbot is active |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

**`chatbot_messages`** (conversation log)
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `org_id` | uuid | FK → `organizations` |
| `session_id` | text | Groups messages in a conversation |
| `role` | text | `user`, `assistant` |
| `content` | text | Message text |
| `tokens_used` | integer | For billing |
| `created_at` | timestamptz | |

---

## 11. Admin Panel (`app.augenix.ai`) — Your Command Center

### Navigation
- **Overview**: Dashboard stats (total clients, MRR, active websites, pending edits)
- **Customers**: Client list with search, filter by plan/status
- **Edit Requests**: Queue of pending AI edit approvals (admin override)
- **Analytics**: Revenue charts, AI usage, client growth
- **Pipeline**: Sales pipeline / onboarding status
- **Settings**: Global platform settings

### Per-Client Detail Page
- Feature toggles (CMS, CRM, Chatbot, Email AI, Social, Automations)
- Branding controls (logo, colors, brand voice prompt)
- Usage & billing (current plan, AI credits used, invoices)
- Impersonate button (opens their dashboard as them)
- Notes & internal tags
- Edit history timeline

### Client Creation Wizard
1. Enter business info (name, industry, slug).
2. Set initial plan and feature flags.
3. Optionally upload logo and set brand colors.
4. System creates `organization`, `org_features`, seeds default pages.
5. Sends welcome email to the client.

---

## 12. Monetization

**Pricing Tiers** (suggested):

| Tier | Price | Includes |
|------|-------|----------|
| **Free / Starter** | $0/mo | Basic dashboard + CRM (limited contacts) |
| **Website Pro** | $99–149/mo | AI Command Center + CMS + Chatbot + 50 AI credits/mo |
| **Automation Pro** | $79–129/mo | Automations dashboard + advanced workflows + 30 AI credits/mo |
| **Enterprise** | Custom | Unlimited AI credits, priority support, custom integrations |

**Add-ons**:
- Extra AI credits (e.g. 100 credits = $20)
- Priority support ($25/mo)
- Advanced email sequences ($15/mo)

**AI Credit System**:
- 1 credit = ~1,000 AI tokens (input + output combined)
- AI Command Center edit ≈ 2–5 credits
- Blog post generation ≈ 3–8 credits
- Chatbot response ≈ 0.5–1 credit
- Credits tracked in `ai_usage` table, aggregated daily per org
- Dashboard widget shows remaining credits + usage chart

Feature flags in `org_features` table control module access. Stripe webhooks update `organizations.plan` and `org_features` on subscription changes.

---

## 13. Success Metrics & KPIs

- **Adoption**: % of website edits done via AI (target: >85%)
- **Time-to-value**: Average time from signup to first published AI edit (target: < 15 min)
- **Retention**: Monthly churn < 5%
- **Support load**: < 1 hour per client per month
- **Revenue**: MRR growth, ARPU, expansion revenue from add-ons
- **AI Quality**: % of AI edits approved on first attempt (target: >80%)
- **NPS**: Client satisfaction with AI edits (target: >50)

---

## 14. Phased Roadmap

### Phase 1 — Foundation (4–6 weeks)
- [ ] Clean up template codebase (remove unused libs: stitch, canva-connect, stability, wp-migration, puppeteer, vercel domains/purchase; update branding to Augenix; remove all FWD/freewebsite.deal references)
- [ ] Supabase schema: `users`, `organizations`, `org_members`, `org_features`, `admin_users`, `pages`, `page_edits`
- [ ] RLS policies for all tables
- [ ] Authentication flow: login, signup, session management, cross-subdomain cookies on `.augenix.ai`
- [ ] Middleware: subdomain detection, org resolution, auth guards, admin check
- [ ] Admin panel: client list, client detail page, feature toggles, impersonation
- [ ] Basic AI Command Center: page selector, natural language input (text only), AI processing via `@ai-sdk/gateway`, diff view, approve/publish
- [ ] **Augenix Sites project**: scaffold the separate repo — middleware (domain→org mapping), catch-all page renderer, section component library (8–10 core types + generic fallback), brand theming via CSS variables
- [ ] "Push Live" mechanism: on-demand ISR revalidation from Dashboard → Sites via `/api/revalidate`
- [ ] Feature flag system (`org_features`)
- [ ] Stripe integration: subscription plans, webhooks, plan enforcement
- [ ] Transactional emails: welcome, edit request received, edit published

### Phase 2 — CRM + Content (8–10 weeks)
- [ ] CRM: contacts table, form submission webhook, lead pipeline views, contact detail page
- [ ] Image upload in AI Command Center (Supabase Storage + AI image placement)
- [ ] Full diff/review UI with visual preview
- [ ] AI Content Generation: blog posts, social posts, email drafts
- [ ] AI Chatbot: self-hosted API (`/api/chatbot/[orgSlug]`), configuration page, embeddable widget script, `chatbot_messages` logging
- [ ] Email sequence builder + sending
- [ ] Client onboarding wizard (self-serve signup flow)
- [ ] Admin analytics dashboard (revenue, usage charts)
- [ ] Custom domain provisioning (automated via Vercel API from admin panel → adds domain to Sites Vercel project)

### Phase 3 — Automations + Scale (Ongoing)
- [ ] Automations dashboard: workflow list, status, logs
- [ ] Human-in-the-loop approval queue
- [ ] Custom workflow builder (prompt-based)
- [ ] Social posting scheduler
- [ ] Advanced AI credit management + usage alerts
- [ ] Cron jobs: usage digest emails, subscription renewal reminders
- [ ] Mobile-responsive polish
- [ ] Sites performance optimization (edge caching, expanded section component library)
- [ ] Chatbot analytics dashboard (conversations, common questions, escalation rate)

---

## 15. Environment Variables

### Dashboard Project (`app.augenix.ai`)

| Variable | Purpose |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable/anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase admin client (server-side only) |
| `AI_GATEWAY_API_KEY` | Vercel AI SDK Gateway key |
| `STRIPE_SECRET_KEY` | Stripe server-side key |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe client-side key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signature verification |
| `EMAIL_HOST` / `EMAIL_PORT` / `EMAIL_USER` / `EMAIL_PASS` | SMTP credentials for nodemailer |
| `IMPERSONATION_SECRET` | Secret for signing impersonation JWT cookies |
| `SITES_REVALIDATE_SECRET` | Shared secret for calling the Sites revalidation API |
| `SITES_REVALIDATE_URL` | URL of the Sites project's revalidation endpoint |

### Sites Project (`sites.augenix.ai`)

| Variable | Purpose |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Same Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Same Supabase publishable key |
| `REVALIDATE_SECRET` | Must match Dashboard's `SITES_REVALIDATE_SECRET` |

---

## 16. Testing Strategy

- **Unit Tests** (Vitest): Business logic, utility functions, AI prompt construction, Zod schema validation.
- **Integration Tests** (Vitest): API route handlers, Supabase queries (against test database).
- **E2E Tests** (Playwright): Login flow, AI Command Center flow, admin panel, CRM interactions.
- **Test Scripts**: `npm test` (unit), `npm run test:e2e` (Playwright).

---

## 17. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| **AI misinterprets edit request** | Bad content published | Mandatory review/diff step before publish; one-click undo to any previous version |
| **Cross-subdomain cookie issues** | Auth breaks between subdomains | Extensive testing; fallback to redirect-based auth flow; cookie set on `.augenix.ai` parent domain |
| **AI cost overruns** | Margin erosion | Credit system with per-org caps; model routing (cheaper models for simple tasks); token monitoring in `ai_usage` |
| **Supabase Realtime latency** | Stale content on client websites | Edge caching with Realtime-triggered revalidation; fallback to polling |
| **Brand voice inconsistency** | Off-brand AI outputs | Per-org `brand_voice` prompt fragment injected into all AI calls; few-shot examples from approved edits |
| **Multi-tenant data leaks** | Security breach | RLS on all tables; integration tests verifying tenant isolation; service-role client only on server |
| **Scaling beyond 100 clients** | Performance degradation | Connection pooling; indexed `org_id` columns; Supabase read replicas if needed |

### Resolved Decisions
- **Structured content schema**: Freeform. No fixed section types. AI can create any section structure. Sites renderer uses a component map with a generic fallback for unknown types.
- **Client website rendering**: Option C — a separate lightweight "Augenix Sites" project (own repo, own Vercel project) that reads from the same Supabase instance. See §9 for full architecture.
- **Chatbot infrastructure**: Self-hosted. Chatbot API lives in this Dashboard project (`/api/chatbot/[orgSlug]`). Uses `@ai-sdk/gateway` with per-org knowledge base context.

### Open Questions
- **Section component library**: How many pre-built section renderers should the Sites project ship with at launch? Minimum viable set: hero, text block, image + text, multi-column grid, FAQ accordion, CTA banner, testimonials, contact form. Unknown types render as raw content blocks.
- **Chatbot widget delivery**: Should the embeddable `<script>` tag load from a CDN, or from the Dashboard project directly? CDN is faster but adds a build step.
- **Custom domain provisioning**: How are client custom domains added to the Sites Vercel project? Options: (a) manually via Vercel dashboard, (b) automated via Vercel API from the admin panel. Recommendation: (b) for scale, using the Vercel Domains API.

---

*End of Document*