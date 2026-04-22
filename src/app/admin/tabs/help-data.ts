export type CalloutVariant = 'info' | 'warning' | 'tip';

export interface ParagraphBlock { type: 'paragraph'; text: string }
export interface CodeBlock      { type: 'code';      language: string; code: string }
export interface ListBlock       { type: 'list';      items: string[] }
export interface StepsBlock      { type: 'steps';     items: string[] }
export interface CalloutBlock    { type: 'callout';   variant: CalloutVariant; text: string }
export interface TableBlock      { type: 'table';     headers: string[]; rows: string[][] }
export interface SubheadingBlock { type: 'subheading'; id: string; text: string }
export interface DiagramBlock    { type: 'diagram';    diagramId: string }

export type ContentBlock =
  | ParagraphBlock
  | CodeBlock
  | ListBlock
  | StepsBlock
  | CalloutBlock
  | TableBlock
  | SubheadingBlock
  | DiagramBlock;

export interface DocSection {
  id: string;
  title: string;
  content: ContentBlock[];
}

export const HELP_DOCS: DocSection[] = [
  {
    id: 'system-overview',
    title: 'System Overview',
    content: [
      {
        type: 'paragraph',
        text: 'Each customer gets a fully isolated deployment stack. Everything is provisioned automatically from the admin dashboard.',
      },
      {
        type: 'list',
        items: [
          '**Private GitHub repo** under the `freewebsite-deal` org — one repo per customer',
          '**Vercel project** linked to that repo, auto-deployed on every push to `main`',
          '**Subdomain** on `freewebsite.deal` (e.g. `rhythmandbrew.freewebsite.deal`) — always live',
          '**Custom domain** (e.g. `www.rhythmandbrew.coffee`) — optional, points to same Vercel project',
          '**Supabase Storage** folder for their images: `customer-media/customers/{user_id}/images/`',
        ],
      },
      { type: 'subheading', id: 'deployment-flow', text: 'Deployment Flow' },
      { type: 'diagram', diagramId: 'deployment-flow' },
      {
        type: 'steps',
        items: [
          'Admin clicks **Provision Site** in the Sites tab and fills in the customer + slug',
          '`provision-site` API creates the GitHub repo from the template',
          '`provision-site` API creates the Vercel project linked to that repo',
          '`provision-site` API assigns `{slug}.freewebsite.deal` as the subdomain',
          'Supabase `deployed_websites` record inserted with `status: building`',
          'Vercel builds and deploys automatically from the new repo',
          'Vercel webhook fires → status updated to `deployed` in Supabase',
          'Customer sees their live URL in the user dashboard',
        ],
      },
      { type: 'subheading', id: 'code-edit-flow', text: 'Code Edit Flow (Manual)' },
      { type: 'diagram', diagramId: 'code-edit-flow' },
      {
        type: 'steps',
        items: [
          'Admin edits code locally in the customer\'s cloned repo',
          'Push changes to a branch (not `main`) — Vercel auto-generates a preview URL',
          'Admin reviews the preview, then clicks **Approve Changes** in the Sites tab',
          '`approve-changes` API merges the branch PR into `main`',
          'Vercel redeploys — site is live within ~1 minute',
        ],
      },
    ],
  },

  {
    id: 'environment-variables',
    title: 'Environment Variables',
    content: [
      {
        type: 'paragraph',
        text: 'All secrets must be set in `.env.local` at the project root. This file is gitignored and never committed.',
      },
      {
        type: 'table',
        headers: ['Variable', 'Description'],
        rows: [
          ['`GITHUB_TOKEN`', 'GitHub PAT with `repo` + `admin:org` scopes on the `freewebsite-deal` org'],
          ['`GITHUB_ORG`', 'GitHub org name — `freewebsite-deal`'],
          ['`GITHUB_TEMPLATE_REPO`', 'Template repo name — `template`'],
          ['`VERCEL_TOKEN`', 'Vercel API token (Account Settings → Tokens)'],
          ['`VERCEL_TEAM_ID`', 'Vercel team ID for the FWD Team'],
          ['`VERCEL_WEBHOOK_SECRET`', 'Signing secret for the Vercel webhook'],
          ['`ROOT_DOMAIN`', 'Root domain — `freewebsite.deal`'],
          ['`NEXT_PUBLIC_SUPABASE_URL`', 'Supabase project URL'],
          ['`NEXT_PUBLIC_SUPABASE_ANON_KEY`', 'Supabase anon/publishable key'],
          ['`SUPABASE_SERVICE_ROLE_KEY`', 'Supabase service role key — server-only, never expose to client'],
          ['`FORWARDEMAIL_API_KEY`', 'Forward Email API key — used to manage domains, aliases, and send transactional email'],
          ['`FORWARDEMAIL_FROM`', 'Default "from" address for system emails — e.g. `noreply@freewebsite.deal`'],
          ['`FORWARDEMAIL_SMTP_USER`', 'SMTP username for `mailer.ts` (nodemailer) — typically same as `FORWARDEMAIL_FROM`'],
          ['`FORWARDEMAIL_SMTP_PASS`', 'SMTP password / app password from Forward Email dashboard — server-only'],
          ['`CRON_SECRET`', 'Bearer token that Vercel sends with cron job requests to authenticate them'],
        ],
      },
      { type: 'subheading', id: 'github-pat-setup', text: 'GitHub PAT Setup' },
      {
        type: 'steps',
        items: [
          'Go to `github.com` → Settings → Developer Settings → Personal Access Tokens → Fine-grained tokens',
          'Set resource owner to `freewebsite-deal` org',
          'Grant: `repo` (full) + `admin:org` (read) scopes',
          'Copy the token → add to `.env.local` as `GITHUB_TOKEN`',
        ],
      },
      { type: 'subheading', id: 'vercel-token-setup', text: 'Vercel Token + Team ID Setup' },
      {
        type: 'steps',
        items: [
          'Go to Vercel → Account Settings → Tokens → Create token',
          'Add to `.env.local` as `VERCEL_TOKEN`',
          'Team ID is in the URL when viewing team settings: `vercel.com/teams/{team-id}/settings`',
          'Add to `.env.local` as `VERCEL_TEAM_ID`',
        ],
      },
    ],
  },

  {
    id: 'provisioning',
    title: 'Provisioning a New Site',
    content: [
      { type: 'subheading', id: 'provisioning-prerequisites', text: 'Prerequisites' },
      {
        type: 'list',
        items: [
          'Customer must already exist (created via Users tab)',
          'Customer must have a business record',
        ],
      },
      { type: 'subheading', id: 'provisioning-steps', text: 'Steps' },
      {
        type: 'steps',
        items: [
          'Go to **Admin Dashboard → Sites tab**',
          'Click **Provision Site**',
          'Select the customer from the dropdown (shows email + business name)',
          'Enter a **Site Slug** — this becomes the GitHub repo name AND subdomain',
          'Click **Provision** — the API runs automatically',
          'Vercel builds and deploys. The webhook updates status to `deployed` when done.',
        ],
      },
      { type: 'subheading', id: 'slug-rules', text: 'Slug Rules (enforced server-side)' },
      {
        type: 'callout',
        variant: 'warning',
        text: 'The slug becomes the GitHub repo name and subdomain. It cannot be changed after provisioning without manual intervention.',
      },
      {
        type: 'list',
        items: [
          'Lowercase letters, numbers, and hyphens **only**',
          'Must start and end with a letter or number (no leading/trailing hyphens)',
          '3–50 characters',
          '✅ Valid: `rhythm-brew`, `johns-plumbing-co`, `abc123`',
          '❌ Invalid: `-mybiz`, `my_biz`, `a`, `MY-BIZ`',
        ],
      },
    ],
  },

  {
    id: 'migration',
    title: 'Migrating an Existing Site',
    content: [
      {
        type: 'paragraph',
        text: 'Use this process when a customer already has a GitHub repo and Vercel project outside the `freewebsite-deal` org.',
      },
      {
        type: 'callout',
        variant: 'tip',
        text: 'The site stays live throughout the migration — there is no downtime at any step.',
      },
      { type: 'subheading', id: 'migration-step1', text: 'Step 1 — Fork the GitHub Repo' },
      {
        type: 'steps',
        items: [
          'Go to the existing repo on GitHub',
          'Click **Fork** → select `freewebsite-deal` as the destination org',
          'Rename to a slug-friendly name (no dots — e.g. `rhythmandbrew` not `rhythmandbrew.coffee`)',
          'Result: `github.com/freewebsite-deal/{slug}`',
        ],
      },
      { type: 'subheading', id: 'migration-step2', text: 'Step 2 — Transfer the Vercel Project' },
      {
        type: 'steps',
        items: [
          'Go to Vercel → existing project → **Settings** → **General**',
          'Scroll to **Transfer Project** → select `FWD Team`',
        ],
      },
      { type: 'subheading', id: 'migration-step3', text: 'Step 3 — Reconnect the Git Link' },
      {
        type: 'callout',
        variant: 'info',
        text: 'After transfer, the Vercel project still points to the old repo. You must reconnect it manually.',
      },
      {
        type: 'steps',
        items: [
          'Vercel → project → **Settings** → **Git**',
          'Click **Disconnect**',
          'Click **Connect Git Repository** → select `freewebsite-deal` org → select the forked repo',
        ],
      },
      { type: 'subheading', id: 'migration-step4', text: 'Step 4 — Insert the DB Record' },
      {
        type: 'paragraph',
        text: 'Insert a row directly in the Supabase `deployed_websites` table (SQL editor or script):',
      },
      {
        type: 'code',
        language: 'javascript',
        code: `{
  user_id:          '{customer-user-id}',
  business_id:      '{customer-business-id}',
  site_slug:        '{slug}',
  subdomain:        '{slug}.freewebsite.deal',
  custom_domain:    'www.{their-domain}.com',
  github_repo_name: '{slug}',
  github_repo_url:  'https://github.com/freewebsite-deal/{slug}',
  vercel_project_id: '{vercel-project-id}',
  live_url:         'https://www.{their-domain}.com',
  status:           'deployed',
  approval_status:  'approved',
}`,
      },
      { type: 'subheading', id: 'migration-step5', text: 'Step 5 — Add the Subdomain on Vercel' },
      {
        type: 'paragraph',
        text: 'Via the Vercel dashboard, add `{slug}.freewebsite.deal` to the project\'s domains. The wildcard DNS (`*.freewebsite.deal → cname.vercel-dns.com`) handles routing automatically.',
      },
      { type: 'subheading', id: 'migration-step6', text: 'Step 6 — Migrate Images to Supabase Storage' },
      {
        type: 'paragraph',
        text: 'Images in the repo\'s `/public` folder should be uploaded to the `customer-media` bucket.',
      },
      {
        type: 'list',
        items: [
          'Storage path: `customers/{user_id}/images/{filename}`',
          'Public URL: `https://{supabase-project}.supabase.co/storage/v1/object/public/customer-media/customers/{user_id}/images/{filename}`',
        ],
      },
    ],
  },

  {
    id: 'approving-changes',
    title: 'Approving Changes',
    content: [
      {
        type: 'paragraph',
        text: 'When a code edit has been pushed to a branch and a PR is open on GitHub:',
      },
      {
        type: 'steps',
        items: [
          'Go to **Admin Dashboard → Sites tab**',
          'Find the customer\'s site → click **Approve Changes**',
          'Enter the PR number from GitHub',
          'Click **Approve** — the API merges the PR into `main`',
          'Vercel automatically redeploys from `main`',
          'Customer\'s site is live within ~1 minute of approval',
        ],
      },
      {
        type: 'callout',
        variant: 'tip',
        text: 'Always review the Vercel preview URL before approving. The preview is auto-generated when the branch is pushed.',
      },
    ],
  },

  {
    id: 'vercel-webhook',
    title: 'Vercel Webhook',
    content: [
      {
        type: 'paragraph',
        text: 'The webhook keeps `deployed_websites.status` in sync with actual Vercel deployment state in real time.',
      },
      { type: 'subheading', id: 'webhook-setup', text: 'Setup' },
      {
        type: 'steps',
        items: [
          'Go to Vercel → Team Settings → Webhooks',
          'Add webhook URL: `https://{your-domain}/api/webhooks/vercel`',
          'Select events: `deployment.created`, `deployment.succeeded`, `deployment.error`, `deployment.canceled`',
          'Copy the signing secret → add to `.env.local` as `VERCEL_WEBHOOK_SECRET`',
        ],
      },
      { type: 'subheading', id: 'webhook-events', text: 'Event Handling' },
      { type: 'diagram', diagramId: 'webhook-flow' },
      {
        type: 'table',
        headers: ['Vercel Event', 'Effect in Supabase'],
        rows: [
          ['`deployment.created`', 'Sets `status = building`'],
          ['`deployment.succeeded`', 'Sets `status = deployed`, stores `live_url`'],
          ['`deployment.error`', 'Sets `status = failed`'],
          ['`deployment.canceled`', 'Sets `status = failed`'],
        ],
      },
      {
        type: 'callout',
        variant: 'info',
        text: 'The webhook endpoint verifies HMAC-SHA1 signatures on every request. Requests without a valid signature are rejected with 401.',
      },
    ],
  },

  {
    id: 'supabase-storage',
    title: 'Supabase Storage',
    content: [
      {
        type: 'table',
        headers: ['Bucket', 'Purpose', 'Public'],
        rows: [
          ['`generated-assets`', 'AI-generated logos, mockups, branding guides', 'Yes'],
          ['`brand-assets`', 'Customer-uploaded brand files', 'Yes'],
          ['`customer-media`', 'Customer site images migrated from repos', 'Yes'],
        ],
      },
      { type: 'subheading', id: 'storage-structure', text: 'customer-media Structure' },
      { type: 'diagram', diagramId: 'storage-structure' },
      {
        type: 'code',
        language: 'text',
        code: `customer-media/
  customers/
    {user_id}/
      images/
        logo.webp
        hero-image.webp
        ...`,
      },
      { type: 'subheading', id: 'storage-urls', text: 'Public URL Format' },
      {
        type: 'code',
        language: 'text',
        code: `https://{supabase-project}.supabase.co/storage/v1/object/public/customer-media/customers/{user_id}/images/{filename}`,
      },
    ],
  },

  {
    id: 'email-system',
    title: 'Email System',
    content: [
      {
        type: 'paragraph',
        text: 'The email system has two distinct responsibilities: **outbound notification emails** (site deployed, edit request received, etc.) sent from `noreply@freewebsite.deal`, and **per-customer domain email** which gives each customer a working `noreply@theirdomain.com` and `support@theirdomain.com` once their custom domain is connected. Both are powered by **Forward Email** — an open-source, privacy-first email service.',
      },
      { type: 'subheading', id: 'email-architecture', text: 'Architecture Overview' },
      { type: 'diagram', diagramId: 'email-architecture' },
      {
        type: 'table',
        headers: ['Layer', 'What it does', 'Key file / route'],
        rows: [
          ['`mailer.ts`', 'Single nodemailer abstraction for all outbound SMTP email', '`src/libs/email/mailer.ts`'],
          ['`send-notification.ts`', 'Loads email templates from DB (`app_settings`), interpolates variables, calls `sendEmail()`', '`src/features/emails/send-notification.ts`'],
          ['`provision-email-dns`', 'Admin API — registers customer domain with FE, writes DNS records to Vercel, creates aliases', '`src/app/api/admin/provision-email-dns/route.ts`'],
          ['`check-email-approval`', 'Vercel Cron (every 5 min) — polls FE `has_smtp` flag; marks domain approved and notifies customer', '`src/app/api/cron/check-email-approval/route.ts`'],
          ['`send-test-email`', 'Admin API — sends a one-off test email via FE API to verify a domain is working', '`src/app/api/admin/send-test-email/route.ts`'],
          ['`provision-email-dns.mjs`', 'Standalone CLI script — same logic as the API route, for manual/one-off use from terminal', '`provision-email-dns.mjs`'],
        ],
      },
      { type: 'subheading', id: 'email-outbound', text: 'Outbound Notification Emails (mailer.ts)' },
      {
        type: 'paragraph',
        text: '`mailer.ts` creates a single nodemailer transporter pointed at `smtp.forwardemail.net:465` (TLS). All system notification emails go through this — site deployed, edit request submitted, onboarding welcome, etc.',
      },
      {
        type: 'list',
        items: [
          'SMTP host: `smtp.forwardemail.net`, port `465`, `secure: true`',
          'Auth: `FORWARDEMAIL_SMTP_USER` / `FORWARDEMAIL_SMTP_PASS` (from Forward Email dashboard → Domains → SMTP credentials)',
          'Default from: `FORWARDEMAIL_SMTP_USER` env var (e.g. `noreply@freewebsite.deal`)',
          'All templates are stored in Supabase `app_settings.email_templates` and editable from **Admin → Settings → Email Templates**',
        ],
      },
      {
        type: 'callout',
        variant: 'tip',
        text: 'To get SMTP credentials: Forward Email dashboard → your domain → **SMTP** tab → generate an app password. Use the full email address as the username.',
      },
      { type: 'subheading', id: 'email-dns-provisioning', text: 'Per-Customer Domain Email (DNS Provisioning)' },
      {
        type: 'paragraph',
        text: 'When a customer has a custom domain, you can provision outbound email for that domain so their site\'s contact form sends from `noreply@theirdomain.com`. This is triggered from the **Sites tab → Setup Email** button.',
      },
      { type: 'diagram', diagramId: 'email-dns-flow' },
      {
        type: 'steps',
        items: [
          'Admin clicks **Setup Email** on a site with a custom domain in the Sites tab',
          '`POST /api/admin/provision-email-dns` is called with `website_id` + `domain`',
          'API calls Forward Email: **get or create** the domain in FE (`/v1/domains`)',
          'API fetches `smtp_dns_records` from FE — includes DKIM TXT, return-path CNAME, DMARC TXT, and SPF TXT',
          'API reads existing Vercel DNS records for the domain to avoid duplicates (SPF is merged, not duplicated)',
          'API writes any missing records to Vercel DNS (`/v4/domains/{domain}/records`)',
          'API creates `noreply@` and `support@` aliases in FE — both forward to the customer\'s registered email',
          'API triggers FE SMTP verification (`/v1/domains/{id}/verify-smtp`) — status becomes `provisioned` or `verified`',
          'Vercel Cron (`check-email-approval`) polls every 5 minutes — when `has_smtp: true`, sets `email_dns_status = approved` in Supabase and emails the customer',
        ],
      },
      { type: 'subheading', id: 'email-dns-records', text: 'DNS Records Written to Vercel' },
      {
        type: 'table',
        headers: ['Record Type', 'Name', 'Purpose'],
        rows: [
          ['`TXT`', '`fe-verify=...` (subdomain)', 'Forward Email domain ownership verification'],
          ['`TXT`', '`{selector}._domainkey`', 'DKIM — proves emails are signed by FE'],
          ['`CNAME`', '`pm-bounces` (or similar)', 'Return-path — handles bounce tracking'],
          ['`TXT`', '`_dmarc`', 'DMARC policy — instructs receivers how to handle failures'],
          ['`TXT`', '`@`', 'SPF — `v=spf1 include:spf.forwardemail.net -all`'],
        ],
      },
      {
        type: 'callout',
        variant: 'warning',
        text: 'SPF records are merged, not duplicated. If an SPF record already exists at `@`, the script checks if `include:spf.forwardemail.net` is already present before adding. Only one SPF record is allowed per domain.',
      },
      { type: 'subheading', id: 'email-dns-status', text: 'email_dns_status Field' },
      {
        type: 'table',
        headers: ['Status', 'Meaning'],
        rows: [
          ['`null`', 'Email not yet provisioned for this domain'],
          ['`provisioning`', 'API call in progress'],
          ['`provisioned`', 'DNS records written; FE verification not yet confirmed (DNS may still be propagating)'],
          ['`verified`', 'FE confirmed DNS records are valid; awaiting SMTP approval from FE'],
          ['`approved`', 'FE has fully approved SMTP — email is live and working'],
          ['`error`', 'Something failed — check `email_dns_error` column for the message'],
        ],
      },
      { type: 'subheading', id: 'email-cron', text: 'Vercel Cron — check-email-approval' },
      {
        type: 'paragraph',
        text: 'Defined in `vercel.json` as a cron running every 5 minutes. It queries Supabase for all sites with `email_dns_status IN (provisioned, verified)` and checks each domain\'s `has_smtp` flag via the Forward Email API.',
      },
      {
        type: 'list',
        items: [
          'Authenticated via `Authorization: Bearer {CRON_SECRET}` header — set `CRON_SECRET` in both `.env.local` and Vercel project env vars',
          'When `has_smtp: true` and `is_smtp_suspended: false` → updates DB to `approved` and sends customer a notification email via FE API',
          'Once all domains are approved the cron becomes a no-op (no sites in `provisioned`/`verified` state)',
        ],
      },
      {
        type: 'code',
        language: 'json',
        code: `// vercel.json — cron schedule
{
  "crons": [
    {
      "path": "/api/cron/check-email-approval",
      "schedule": "*/5 * * * *"
    }
  ]
}`,
      },
      { type: 'subheading', id: 'email-aliases', text: 'Email Aliases' },
      {
        type: 'paragraph',
        text: 'Two aliases are created in Forward Email for every provisioned domain. Both forward inbound mail to the customer\'s registered account email.',
      },
      {
        type: 'table',
        headers: ['Alias', 'Used for'],
        rows: [
          ['`noreply@{domain}`', 'Outbound from address for the customer\'s contact form and site notifications'],
          ['`support@{domain}`', 'Customer-facing support address — forwards to their inbox'],
        ],
      },
      { type: 'subheading', id: 'email-provision-script', text: 'Manual Provisioning Script' },
      {
        type: 'paragraph',
        text: 'For one-off or manual provisioning outside the dashboard, use the CLI script:',
      },
      {
        type: 'code',
        language: 'bash',
        code: `node provision-email-dns.mjs <domain>
# Example:
node provision-email-dns.mjs rhythmandbrew.coffee`,
      },
      {
        type: 'callout',
        variant: 'info',
        text: 'The script reads `FORWARDEMAIL_API_KEY`, `VERCEL_TOKEN`, and `VERCEL_TEAM_ID` from `.env.local`. It performs the same steps as the API route but outputs verbose logs to the terminal.',
      },
      { type: 'subheading', id: 'email-test', text: 'Sending a Test Email' },
      {
        type: 'paragraph',
        text: 'From the Sites tab, click **Send Test Email** on any site with an approved domain. This calls `POST /api/admin/send-test-email` which sends a test message via the Forward Email API directly to the customer\'s registered email address.',
      },
      {
        type: 'callout',
        variant: 'tip',
        text: 'Use the test email to confirm end-to-end delivery after DNS propagation. If it fails, check the `email_dns_error` column in Supabase and re-run provisioning.',
      },
    ],
  },

  {
    id: 'domain-registration',
    title: 'Domain Registration',
    content: [
      {
        type: 'paragraph',
        text: 'Customers can purchase a domain during onboarding or at checkout. Domains are registered via the **Vercel Domains Registrar API** — no third-party registrar account needed. The customer is the legal registrant (ICANN owner) of their domain.',
      },
      { type: 'subheading', id: 'domain-onboarding-flow', text: 'Customer Onboarding Flow' },
      {
        type: 'steps',
        items: [
          '**Step 4 — Domain Name:** Customer chooses "I need a new domain" or "I already have a domain"',
          'If they need a domain: a search box appears, pre-filled with their business name. Results show availability + price across multiple TLDs (.com, .net, .co, .io, .app, .dev, .biz)',
          'Once a domain is selected, a **Registrant Contact form** appears inline',
          'Customer fills in their legal contact info (name, email, phone, address) — required by ICANN for every domain registration',
          'An info banner explains why the data is needed, how it is used, and that WHOIS privacy is included free',
          '"Review Summary →" is disabled until all required registrant fields are complete',
          'On save, `domain_name` and `domain_registrant_contact` are stored on the `businesses` record in Supabase',
        ],
      },
      { type: 'subheading', id: 'domain-checkout-flow', text: 'Checkout & Purchase Flow' },
      {
        type: 'steps',
        items: [
          'On the payment page, customers can also add or change their domain selection via the **Domain Add-On** section',
          'The domain is added as a one-time line item in the Stripe checkout session using inline `price_data`',
          'Domain price is re-verified server-side at checkout (prevents stale prices from being charged)',
          'After `checkout.session.completed` fires, the Stripe webhook calls `purchaseDomain()` asynchronously',
          '`purchaseDomain()` re-fetches the current Vercel price (allows up to $2 drift), reads the registrant contact from `businesses.domain_registrant_contact`, calls the Vercel Registrar API to buy the domain, then attaches it to the customer\'s Vercel project',
          'DB is updated: `domain_status = active`, `vercel_order_id`, `domain_registered_at`, `domain_renewal_price_usd`',
          'If purchase fails, `domain_status = failed` — visible in the admin customer detail panel',
        ],
      },
      { type: 'subheading', id: 'domain-pricing', text: 'Pricing & Markup' },
      {
        type: 'list',
        items: [
          'Vercel\'s raw domain price is fetched live from the Registrar API at search time',
          'A **$7 USD markup** is added on top of Vercel\'s price — this is your margin',
          'Renewal price (Vercel\'s rate, no markup) is stored in `domain_renewal_price_usd` for reference',
          'Price is re-verified at both checkout and purchase time to guard against price changes',
        ],
      },
      { type: 'subheading', id: 'domain-registrant', text: 'ICANN Registrant Contact' },
      {
        type: 'paragraph',
        text: 'The customer is the legal registrant (owner) of their domain — not FreeWebsite.Deal. Their contact info is collected during onboarding step 4 and stored as `domain_registrant_contact` (JSONB) on the `businesses` table.',
      },
      {
        type: 'table',
        headers: ['Field', 'Required'],
        rows: [
          ['`firstName`, `lastName`', 'Yes'],
          ['`email`', 'Yes'],
          ['`phone`', 'Yes'],
          ['`address1`', 'Yes'],
          ['`city`', 'Yes'],
          ['`state`', 'No (optional for some countries)'],
          ['`zip`', 'Yes'],
          ['`country`', 'Yes (2-letter ISO code, e.g. `US`)'],
        ],
      },
      {
        type: 'callout',
        variant: 'info',
        text: 'WHOIS privacy is enabled by default (`autoRenew: true`, 1-year registration). The customer\'s contact info is submitted to ICANN but shielded from public WHOIS lookups via Vercel\'s privacy protection.',
      },
      { type: 'subheading', id: 'domain-status', text: 'Domain Status Values' },
      {
        type: 'table',
        headers: ['Status', 'Meaning'],
        rows: [
          ['`null` / `none`', 'No domain purchased — customer using free subdomain'],
          ['`purchasing`', 'Stripe payment received; Vercel purchase in progress'],
          ['`active`', 'Domain successfully registered and attached to Vercel project'],
          ['`failed`', 'Purchase failed — check admin customer detail panel for details'],
        ],
      },
      {
        type: 'callout',
        variant: 'warning',
        text: 'If a domain purchase fails (`domain_status = failed`), the customer was still charged. You must manually purchase the domain via the Vercel dashboard and update `domain_status` to `active` in Supabase, or issue a refund.',
      },
      { type: 'subheading', id: 'domain-env-vars', text: 'Required Environment Variables' },
      {
        type: 'table',
        headers: ['Variable', 'Description'],
        rows: [
          ['`VERCEL_TOKEN`', 'Vercel API token scoped to **FWD Team** — must have full team access to call the Registrar API'],
          ['`VERCEL_TEAM_ID`', 'Vercel team ID — required for all Registrar API calls'],
          ['`STRIPE_DOMAIN_PRODUCT_ID`', 'Optional — Stripe product ID for domain line items (for reporting). If unset, inline `price_data` is used.'],
        ],
      },
      {
        type: 'callout',
        variant: 'tip',
        text: 'When creating the Vercel token, select **FWD Team** as the scope (not Full Account). The Registrar API operates at the team level.',
      },
      { type: 'subheading', id: 'domain-admin-view', text: 'Admin — Viewing Domain Info' },
      {
        type: 'paragraph',
        text: 'The **Domain Registration** card in the customer detail panel (Overview tab) shows: domain name, status badge, registered date, renewal price, and Vercel order ID. The customer\'s dashboard also shows a Domain card when `domain_status` is not null/none.',
      },
    ],
  },

  {
    id: 'security',
    title: 'Security Model',
    content: [
      { type: 'subheading', id: 'security-auth', text: 'Admin Authentication' },
      {
        type: 'list',
        items: [
          'All `/admin` routes are protected by **middleware**: requires a valid Supabase session AND the user must be in the `admin_users` table (checked via `is_admin()` RPC)',
          'All `/api/admin/*` routes **independently verify** session + `is_admin()` on every request — middleware alone is not trusted',
          'No shared secrets or API keys are ever passed to the browser',
        ],
      },
      {
        type: 'callout',
        variant: 'warning',
        text: 'Never remove the `is_admin()` check from individual API routes. Middleware can be bypassed in certain edge cases — API routes must always self-verify.',
      },
      { type: 'subheading', id: 'security-add-admin', text: 'Adding an Admin User' },
      {
        type: 'code',
        language: 'bash',
        code: `node add-admin.js`,
      },
      {
        type: 'paragraph',
        text: 'This script lists all users and adds the most recent one as admin. Alternatively, run `add-admin.sql` directly in the Supabase SQL editor.',
      },
      { type: 'subheading', id: 'security-slugs', text: 'Slug Validation' },
      {
        type: 'paragraph',
        text: 'The `site_slug` is validated server-side before any GitHub or Vercel API call. Client-side validation is UI-only and never trusted.',
      },
      {
        type: 'code',
        language: 'javascript',
        code: `/^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/`,
      },
      { type: 'subheading', id: 'security-env', text: 'Secret Environment Variables' },
      {
        type: 'list',
        items: [
          '`SUPABASE_SERVICE_ROLE_KEY` — server-only, never passed to client',
          '`VERCEL_TOKEN`, `GITHUB_TOKEN` — server-only',
          '`VERCEL_WEBHOOK_SECRET` — used to verify webhook signatures, server-only',
        ],
      },
    ],
  },
];
