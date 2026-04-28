# PRD: Augenix Dashboard Platform

**Version**: 1.1  
**Date**: April 28, 2026  
**Owner**: [Your Name]  
**Status**: Draft for Review

---

## 1. Executive Summary

**Augenix** is building a multi-tenant SaaS platform that provides local businesses with:
- A modern dashboard to manage their AI-powered website and marketing automations.
- An **AI-first CMS** that replaces traditional page editors with natural language commands.
- A full suite of AI tools (chatbot, content generation, email sequences, social posting, automations).

Clients access their dedicated dashboard at `clientname.augenix.ai` (or their own custom domain). You manage everything centrally from `app.augenix.ai`.

The core innovation is the **AI Website Command Center** — users simply describe changes in plain English, optionally upload an image, review the AI’s proposal, and approve. Changes go live instantly. No traditional CMS or page builder required.

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
- < 2 minutes from “describe change” to live
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

**Single multi-tenant Next.js application** deployed on Vercel, powered by Supabase.

### Core Shared Modules (All Clients)
- Authentication (Supabase Auth)
- Organization / Workspace management
- Billing & Subscriptions (Stripe)
- Usage analytics & AI credit tracking
- Settings & Branding (logo, colors, custom domain)

### Website Client Modules (Paid Tier)
- **AI Website Command Center** (Core CMS replacement — see detailed flow below)
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
- Impersonation mode
- Global usage & revenue dashboard
- Client onboarding wizard

---

## 6. Authentication & Login Flow (New)

### Overview
All authentication is handled centrally in the main dashboard application at `app.augenix.ai`. The marketing site (`augenix.ai`) simply links to the login page.

### Login Experience

| Entry Point                        | Behavior                                                                 | Post-Login Destination                  |
|------------------------------------|--------------------------------------------------------------------------|-----------------------------------------|
| Login button on **augenix.ai**     | Redirects to `app.augenix.ai/login`                                      | User's subdomain (e.g. `iod.augenix.ai`) |
| Direct visit to `iod.augenix.ai`   | Shows branded login page for that client                                 | Stays on `iod.augenix.ai`               |
| Already logged in                  | Auto-redirected to correct dashboard                                     | Their subdomain                         |

### Key Requirements
- **Single Auth Source**: All Supabase authentication occurs inside the `app.augenix.ai` project.
- **Smart Redirect**: After successful login, the system automatically redirects the user to their primary organization’s subdomain.
- **Branded Login on Subdomains**: The login page on `client.augenix.ai/login` pulls the organization’s logo, colors, and name from Supabase for a native feel.
- **Admin Access**: You log in at `app.augenix.ai` and remain in the admin panel (with ability to impersonate clients).

### Technical Implementation Notes
- Middleware on the dashboard app handles subdomain detection, auth checks, and redirects.
- Post-login logic queries the user’s organization and performs the subdomain redirect.
- Supabase session cookies are configured to work across `augenix.ai` subdomains.

---

## 7. Key User Flows

### Primary Flow: AI Website Command Center (The Star Feature)

1. User logs into `iod.augenix.ai`
2. Navigates to **AI Command Center**
3. Selects a **page** from a dropdown (Homepage, About, Services, Contact, Blog, etc. — predefined per client)
4. Types natural language instruction, e.g.:
   - “Update the hero section to say we now offer same-day delivery”
   - “Add a new FAQ about our warranty policy to the bottom of this page”
   - “Replace the team photo with this new image and update the caption”
5. Optionally uploads an image (AI decides: add new or replace existing)
6. Clicks **“Generate Changes”**
7. AI returns a **clear diff view**:
   - Before / After preview (text + visual)
   - List of exact changes (sections updated, new content, image handling)
8. User reviews and can request revisions (“Make the tone more friendly”)
9. User clicks **“Approve & Publish”**
10. Changes are saved to Supabase → instantly live on their website

**AI Capabilities**:
- Understands page context (fetches current content)
- Handles image upload intelligently
- Maintains brand voice (learned from client settings)
- Suggests related improvements

### Other Important Flows
- **CRM**: Website forms submit directly to Supabase → appear in dashboard with lead scoring.
- **Content Generation**: From Command Center or dedicated “Quick Create” → generate blog post / social posts / email from a prompt or uploaded notes.
- **Automation Monitoring** (for automation clients): See running workflows, approve/reject AI-suggested actions.
- **Admin**: Toggle features for any client instantly.

---

## 8. Feature Specifications (High Level)

**AI Website Command Center**
- Page selector with live preview link
- Natural language input + optional image upload
- AI processing via Vercel AI Gateway (strong system prompt + tools for structured output)
- Review screen with diff + visual preview
- One-click approve/publish
- Full history of all AI edits (audit log)

**CRM**
- Contacts table with tags, notes, activity timeline
- Form submission webhook endpoint
- Lead pipeline views

**AI Tools**
- Chatbot configuration + embed code
- One-click generation of blog posts, social posts, email sequences from any prompt
- Usage tracking per organization

**Automations Dashboard**
- List of active automations with status
- Approval queue for human-in-the-loop steps
- Logs and performance metrics

---

## 9. Technical Architecture

- **Frontend**: Next.js 16 (App Router) + Tailwind + shadcn/ui
- **Backend**: Supabase (Postgres + Auth + Storage + Edge Functions)
- **Hosting**: Vercel (one project)
- **AI**: Vercel AI Gateway + your preferred models
- **Payments**: Stripe (subscriptions + usage-based AI credits)
- **Domains**:
  - Marketing: augenix.ai
  - Admin + Auth: app.augenix.ai
  - Clients: `client.augenix.ai` (wildcard) + custom domains supported
- **Multi-tenancy**: Row Level Security (RLS) + `org_id` on all tables + middleware for subdomain routing and auth

**“Push Live” Mechanism**:
Websites read content from Supabase in real-time (or via edge cache). No rebuild needed for most updates.

**Authentication Notes**:
- All auth flows route through `app.augenix.ai`
- Middleware enforces login state per subdomain
- Post-login redirect logic sends users to their correct subdomain

---

## 10. Data Model (Key Supabase Tables)

- `organizations`
- `org_members`
- `org_features` (feature flags per client)
- `contacts` (CRM)
- `media` (uploaded images with tags)
- `pages` (client’s website pages + current content snapshot for AI context)
- `page_edits` (history of AI changes)
- `faqs`, `blog_posts`, `email_sequences` (structured content)
- `automations` + `automation_runs` + `approvals`
- `ai_usage` (token tracking per org)

---

## 11. Admin Panel (`app.augenix.ai`) — Your Command Center

- Client overview table
- Per-client detail page with:
  - Feature toggles (Website CMS, CRM, AI Chatbot, Email AI, etc.)
  - Branding controls
  - Usage & billing
  - Impersonate button
  - Notes & tags
- Global analytics
- Client creation wizard

---

## 12. Monetization

**Pricing Tiers** (suggested):
- **Free / Starter**: Basic dashboard + CRM
- **Website Pro** ($99–149/mo): Full AI Command Center + CMS + Chatbot
- **Automation Pro** ($79–129/mo): Automations dashboard + advanced workflows
- **Add-ons**: Extra AI credits, custom domain, priority support, advanced email sequences

Feature flags in `org_features` table control access.

---

## 13. Success Metrics & KPIs

- **Adoption**: % of website edits done via AI (target: >85%)
- **Time-to-value**: Average time from signup to first published AI edit (< 15 min)
- **Retention**: Monthly churn < 5%
- **Support load**: < 1 hour per client per month
- **Revenue**: MRR growth, ARPU, expansion revenue from add-ons
- **NPS**: Client satisfaction with AI edits

---

## 14. Phased Roadmap

**Phase 1 (MVP – 4–6 weeks)**
- Multi-tenant foundation + auth + subdomains + login flow
- Admin panel at `app.augenix.ai`
- Basic AI Command Center (text only, 3–4 pages per client)
- CRM with form submissions
- Feature flag system

**Phase 2 (8–10 weeks)**
- Image upload support in AI Command Center
- Full review/approve + diff view
- AI Chatbot embed
- Email sequence generator
- Basic automations dashboard

**Phase 3 (Ongoing)**
- Social posting automation
- Advanced human-in-the-loop workflows
- Custom domain support
- Analytics dashboard
- Mobile-responsive improvements

---

## 15. Risks & Open Questions

- **AI Accuracy**: How to handle edge cases where AI misinterprets a request? (Mitigation: Strong review step + “Undo”)
- **Page Context**: How does AI get the latest content of a page? (Solution: Store structured content in Supabase + fetch on demand)
- **“Push Live” Reliability**: Confirm website integration method (Supabase-driven vs rebuild trigger)
- **Branding Consistency**: How to enforce client brand voice across all AI generations?
- **Cross-subdomain Cookies**: Ensure Supabase session works reliably across `*.augenix.ai`

---

**This PRD now includes the complete login and authentication flow** as discussed.

---

*End of Document*