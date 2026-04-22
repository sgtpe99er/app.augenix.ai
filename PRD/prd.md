# Ardent Advisors AI – Vendor Statement Reconciliation Dashboard
**Product Requirements Document (PRD)**  
**Version 1.1** | April 22, 2026  
**Prepared for:** Nathan Glass – Lampasas Marketing / Augenix.ai  

## 1. Executive Summary
[Same ultra-corporate summary as before – the transformation for Office Managers, <15-minute demo success metric, 5-year profit goal, inbound marketing focus]

## 2. Business Objectives & User Profile
[Unchanged – $1M+ collision shops, teaching-led approach, 4-6 hours/day]

## 3. Scope & Screens
[Unchanged – 6 must-have screens]

## 4. Technical Stack & Setup
- Supabase Project: augenix.ai (existing)
- All demo tables prefixed `aa_demo_`
- Vercel: Separate project (`ardent-advisors-ai-recon-demo`)
- Next.js 15 App Router + Tailwind CSS + Vercel AI SDK

## 5. Demo Data & Seeding Instructions

**File:** `aa_demo_seed.sql`

**How to use the seed script:**
1. Open your Supabase project **augenix.ai**.
2. Go to the **SQL Editor**.
3. Copy the entire content of `aa_demo_seed.sql`.
4. Paste and run the script once.
5. Verify by running these queries in the SQL Editor:
   ```sql
   SELECT * FROM aa_demo_vendors;
   SELECT COUNT(*) FROM aa_demo_invoices;  -- Should show ~20+ rows for demo
   SELECT * FROM aa_demo_statements;
   SELECT * FROM aa_demo_reconciliation_batches;

6. The script includes realistic $10M collision shop data with built-in discrepancies ($247 mismatch, missing credit, duplicate invoice, wrong LK, + clean match).

7. You can re-run the script safely (it truncates first) if you want to reset demo data.

This gives you immediate, realistic data for testing the reconciliation flow.

## 6. AI Prompt Files & Usage Instructions
Folder: Create /prompts/ in the root of your Next.js project.
Files:

prompts/system-prompt.md
prompts/user-prompt-template.md
prompts/consensus-prompt.md

How to use the 3 prompt files (3 parallel runs + consensus):

In your reconciliation logic (e.g., a Server Action or API route /api/reconcile):
Load the system prompt once (read as string).
For each of the 3 parallel calls:
Fill user-prompt-template.md with actual data using string replacement or a simple template function:
{{vendor_name}}, {{period_start}}, {{period_end}}, {{statement_total}}
{{system_invoices_json}} (stringified array from Supabase)
{{statement_text}} (from aa_demo_statements)

Call Vercel AI SDK (generateText or streamText) via AI Gateway with:
System: content from system-prompt.md
User: filled template


Collect the 3 JSON responses.
Feed all 3 into consensus-prompt.md (using placeholders {{run1_json}}, etc.) to generate the final audited result.

Store individual runs + final consensus in aa_demo_audit_logs for full traceability.
On the Results page, display flags, confidence, reasoning, and allow “Re-Run AI” on specific lines (re-triggers 3 parallel + consensus for that row only).

These prompts enforce Nexsyis rules, corporate tone, and high accuracy with built-in oddity detection.
## 7. Implementation / Build Plan (6-Hour Timeline)
[Same as before, now with references to the seed and prompts]
Quick Start After Downloading Files:

Create new Vercel/Next.js project.
Add Supabase env vars.
Run the seed script in augenix.ai.
Add the 3 prompt files to /prompts/.
Build screens starting with auth → home → select → run (call AI) → results (display consensus + audit log) → export.
Use Tailwind for ultra-corporate styling with Ardent Advisors logo in header.

## 8. Audit Features, AI Layer, Success Metrics
[Unchanged – human-in-the-loop, 3-run consensus, <15 min “holy shit” demo]
This PRD is now fully self-contained. You can hand it (plus the three files) to a developer or use it yourself without needing external context.