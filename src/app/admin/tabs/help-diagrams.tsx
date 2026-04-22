// Inline SVG diagrams for the Help tab — theme-matched, no external dependencies

// ─── Shared primitives ────────────────────────────────────────────────────────
const BOX_H = 52;
const BOX_R = 10;
const ARROW_COLOR = '#52525b'; // zinc-600
const LABEL_COLOR = '#a1a1aa'; // zinc-400
const TEXT_COLOR  = '#e4e4e7'; // zinc-200
const BG_COLOR    = '#18181b'; // zinc-900
const BORDER      = '#3f3f46'; // zinc-700
const GREEN       = '#10b981'; // emerald-500
const GREEN_DIM   = '#064e3b'; // emerald-900
const BLUE_DIM    = '#1e3a5f';
const BLUE        = '#60a5fa';

function Box({ x, y, w, label, sublabel, accent = false }: {
  x: number; y: number; w: number; label: string; sublabel?: string; accent?: boolean;
}) {
  const h = sublabel ? 64 : BOX_H;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={BOX_R} fill={accent ? GREEN_DIM : '#27272a'} stroke={accent ? GREEN : BORDER} strokeWidth={1.5} />
      <text x={x + w / 2} y={y + (sublabel ? 22 : h / 2 + 6)} textAnchor='middle' fill={accent ? GREEN : TEXT_COLOR} fontSize={14} fontWeight={600} fontFamily='ui-sans-serif,system-ui,sans-serif'>
        {label}
      </text>
      {sublabel && (
        <text x={x + w / 2} y={y + 44} textAnchor='middle' fill={LABEL_COLOR} fontSize={11} fontFamily='ui-monospace,monospace'>
          {sublabel}
        </text>
      )}
    </g>
  );
}

function Arrow({ x1, y1, x2, y2, label }: { x1: number; y1: number; x2: number; y2: number; label?: string }) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  return (
    <g>
      <defs>
        <marker id='ah' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'>
          <path d='M0,0 L0,6 L8,3 z' fill={ARROW_COLOR} />
        </marker>
      </defs>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={ARROW_COLOR} strokeWidth={1.5} markerEnd='url(#ah)' />
      {label && (
        <text x={mx + 4} y={my - 4} fill={LABEL_COLOR} fontSize={10} fontFamily='ui-sans-serif,system-ui,sans-serif'>{label}</text>
      )}
    </g>
  );
}

function VArrow({ x, y1, y2, label }: { x: number; y1: number; y2: number; label?: string }) {
  return <Arrow x1={x} y1={y1} x2={x} y2={y2 - 6} label={label} />;
}

function HArrow({ y, x1, x2, label }: { y: number; x1: number; x2: number; label?: string }) {
  return <Arrow x1={x1} y1={y} x2={x2 - 6} y2={y} label={label} />;
}

function HArrowLeft({ y, x1, x2 }: { y: number; x1: number; x2: number }) {
  return <Arrow x1={x1} y1={y} x2={x2 + 6} y2={y} />;
}

function SvgWrap({ width, height, children }: { width: number; height: number; children: React.ReactNode }) {
  return (
    <div className='my-2 overflow-x-auto rounded-xl border border-zinc-700 bg-zinc-950 p-6'>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', margin: '0 auto' }}>
        {children}
      </svg>
    </div>
  );
}

// ─── 1. Deployment Flow ───────────────────────────────────────────────────────
export function DeploymentFlowDiagram() {
  const W = 680; const bw = 320; const cx = W / 2 - bw / 2;
  const steps = [
    { label: 'Admin clicks Provision Site', sub: 'Admin Dashboard' },
    { label: 'provision-site API', sub: 'Creates GitHub repo + Vercel project' },
    { label: 'GitHub Repo Created', sub: 'freewebsite-deal/{slug}' },
    { label: 'Vercel Project Created', sub: '{slug}.freewebsite.deal' },
    { label: 'Supabase Record Inserted', sub: 'status: building' },
    { label: 'Vercel Builds & Deploys', sub: 'auto from main branch' },
    { label: 'Webhook fires → status: deployed', sub: 'Customer sees live URL', accent: true },
  ];
  const gap = 90; const H = 20 + steps.length * gap + 20;
  return (
    <SvgWrap width={W} height={H}>
      {steps.map((s, i) => {
        const y = 10 + i * gap;
        return (
          <g key={i}>
            <Box x={cx} y={y} w={bw} label={s.label} sublabel={s.sub} accent={s.accent} />
            {i < steps.length - 1 && <VArrow x={cx + bw / 2} y1={y + (s.sub ? 64 : BOX_H)} y2={y + gap} />}
          </g>
        );
      })}
    </SvgWrap>
  );
}

// ─── 2. Code Edit Flow ────────────────────────────────────────────────────────
export function CodeEditFlowDiagram() {
  const W = 680; const H = 300;
  const bw = 240; const bh = 64;
  // 2x2 grid: col0=left, col1=right
  const col0 = 60; const col1 = W - 60 - bw;
  const row0 = 40; const row1 = 200;
  const midX1 = col1 + bw / 2;
  const boxes = [
    { label: 'Push Branch',  sub: 'git push origin branch',            x: col0, y: row0, n: 1 },
    { label: 'Preview URL',  sub: 'Vercel auto-generates preview',      x: col1, y: row0, n: 2 },
    { label: 'Approve PR',   sub: 'Admin Dashboard → Approve Changes',  x: col0, y: row1, n: 3 },
    { label: 'Live on main', sub: '{slug}.freewebsite.deal',            x: col1, y: row1, n: 4, accent: true },
  ];
  return (
    <SvgWrap width={W} height={H}>
      <defs>
        <marker id='cef-arrow' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'>
          <path d='M0,0 L0,6 L8,3 z' fill={ARROW_COLOR} />
        </marker>
      </defs>
      {/* Step numbers */}
      {boxes.map((b) => (
        <g key={`n${b.n}`}>
          <circle cx={b.x + bw / 2} cy={b.y - 18} r={13} fill={GREEN_DIM} stroke={GREEN} strokeWidth={1.5} />
          <text x={b.x + bw / 2} y={b.y - 13} textAnchor='middle' fill={GREEN} fontSize={12} fontWeight={700} fontFamily='ui-sans-serif,system-ui,sans-serif'>{b.n}</text>
        </g>
      ))}
      {/* Boxes */}
      {boxes.map((b) => (
        <Box key={b.n} x={b.x} y={b.y} w={bw} label={b.label} sublabel={b.sub} accent={b.accent} />
      ))}
    </SvgWrap>
  );
}

// ─── 3. Vercel Webhook Flow ───────────────────────────────────────────────────
export function WebhookFlowDiagram() {
  const W = 680; const H = 320;
  const events = [
    { event: 'deployment.created',   status: 'building',  color: '#f59e0b' },
    { event: 'deployment.succeeded', status: 'deployed',  color: GREEN },
    { event: 'deployment.error',     status: 'failed',    color: '#ef4444' },
    { event: 'deployment.canceled',  status: 'failed',    color: '#ef4444' },
  ];
  const rowH = 68; const startY = 40;
  const vercelX = 20; const arrowX1 = 200; const arrowX2 = 280; const supaX = 280; const supaW = 160; const statusX = 480;
  return (
    <SvgWrap width={W} height={H}>
      {/* Vercel column header */}
      <text x={110} y={18} textAnchor='middle' fill={LABEL_COLOR} fontSize={11} fontWeight={600} fontFamily='ui-sans-serif,system-ui,sans-serif'>Vercel Event</text>
      <text x={360} y={18} textAnchor='middle' fill={LABEL_COLOR} fontSize={11} fontWeight={600} fontFamily='ui-sans-serif,system-ui,sans-serif'>Webhook API</text>
      <text x={560} y={18} textAnchor='middle' fill={LABEL_COLOR} fontSize={11} fontWeight={600} fontFamily='ui-sans-serif,system-ui,sans-serif'>Supabase Status</text>

      {events.map((e, i) => {
        const y = startY + i * rowH;
        return (
          <g key={i}>
            {/* Event box */}
            <rect x={vercelX} y={y} width={180} height={BOX_H} rx={BOX_R} fill='#1c1c1e' stroke={BORDER} strokeWidth={1.5} />
            <text x={vercelX + 90} y={y + BOX_H / 2 + 5} textAnchor='middle' fill={TEXT_COLOR} fontSize={11} fontFamily='ui-monospace,monospace'>{e.event}</text>
            {/* Arrow to webhook */}
            <HArrow y={y + BOX_H / 2} x1={vercelX + 180} x2={supaX} />
            {/* Webhook box */}
            <rect x={supaX} y={y} width={supaW} height={BOX_H} rx={BOX_R} fill={BLUE_DIM} stroke={BLUE} strokeWidth={1.5} />
            <text x={supaX + supaW / 2} y={y + BOX_H / 2 + 5} textAnchor='middle' fill={BLUE} fontSize={11} fontFamily='ui-sans-serif,system-ui,sans-serif'>/api/webhooks/vercel</text>
            {/* Arrow to status */}
            <HArrow y={y + BOX_H / 2} x1={supaX + supaW} x2={statusX} />
            {/* Status pill */}
            <rect x={statusX} y={y + 6} width={80} height={24} rx={12} fill={e.color + '22'} stroke={e.color} strokeWidth={1.5} />
            <text x={statusX + 40} y={y + 22} textAnchor='middle' fill={e.color} fontSize={11} fontWeight={600} fontFamily='ui-sans-serif,system-ui,sans-serif'>{e.status}</text>
          </g>
        );
      })}
    </SvgWrap>
  );
}

// ─── 4. Storage Structure ─────────────────────────────────────────────────────
export function StorageStructureDiagram() {
  const W = 680;
  const indent = 32;
  const items: { label: string; depth: number; isFile?: boolean; accent?: boolean }[] = [
    { label: 'customer-media  (bucket)', depth: 0 },
    { label: 'customers/', depth: 1 },
    { label: '{user_id}/', depth: 2, accent: true },
    { label: 'images/', depth: 3 },
    { label: 'logo.webp', depth: 4, isFile: true },
    { label: 'hero-image.webp', depth: 4, isFile: true },
    { label: '...', depth: 4, isFile: true },
    { label: 'generated-assets  (bucket)', depth: 0 },
    { label: 'brand-assets  (bucket)', depth: 0 },
  ];
  const rowH = 38; const startY = 24; const startX = 40;
  const H = startY + items.length * rowH + 20;
  return (
    <SvgWrap width={W} height={H}>
      {items.map((item, i) => {
        const x = startX + item.depth * indent;
        const y = startY + i * rowH;
        const isRoot = item.depth === 0;
        const color = item.accent ? GREEN : isRoot ? TEXT_COLOR : LABEL_COLOR;
        const weight = isRoot ? 700 : item.depth <= 2 ? 600 : 400;
        return (
          <g key={i}>
            {/* connector line */}
            {item.depth > 0 && (
              <line x1={x - 14} y1={y + 10} x2={x} y2={y + 10} stroke={BORDER} strokeWidth={1} />
            )}
            {/* icon */}
            {item.isFile ? (
              <text x={x} y={y + 14} fill={LABEL_COLOR} fontSize={12} fontFamily='ui-monospace,monospace'>📄</text>
            ) : (
              <text x={x} y={y + 14} fill={item.accent ? GREEN : '#f59e0b'} fontSize={12}>📁</text>
            )}
            <text x={x + 20} y={y + 14} fill={color} fontSize={12} fontWeight={weight} fontFamily='ui-monospace,monospace'>
              {item.label}
            </text>
          </g>
        );
      })}
    </SvgWrap>
  );
}

// ─── 5. Email System Architecture ────────────────────────────────────────────
export function EmailArchitectureDiagram() {
  const W = 720; const H = 320;

  // Columns: App (left), ForwardEmail (center), Customer Domain (right)
  const col0 = 20;  const col1 = 260; const col2 = 500;
  const bw   = 200; const bh   = 52;

  const ORANGE     = '#f97316'; // orange-500
  const ORANGE_DIM = '#431407'; // orange-950

  return (
    <SvgWrap width={W} height={H}>
      {/* Column headers */}
      <text x={col0 + bw / 2} y={18} textAnchor='middle' fill={LABEL_COLOR} fontSize={11} fontWeight={600} fontFamily='ui-sans-serif,system-ui,sans-serif'>App (Next.js / Vercel)</text>
      <text x={col1 + bw / 2} y={18} textAnchor='middle' fill={LABEL_COLOR} fontSize={11} fontWeight={600} fontFamily='ui-sans-serif,system-ui,sans-serif'>Forward Email</text>
      <text x={col2 + bw / 2} y={18} textAnchor='middle' fill={LABEL_COLOR} fontSize={11} fontWeight={600} fontFamily='ui-sans-serif,system-ui,sans-serif'>Customer Domain DNS</text>

      {/* Row 1 — Outbound notification emails */}
      <rect x={col0} y={36} width={bw} height={bh} rx={BOX_R} fill='#27272a' stroke={BORDER} strokeWidth={1.5} />
      <text x={col0 + bw / 2} y={56} textAnchor='middle' fill={TEXT_COLOR} fontSize={13} fontWeight={600} fontFamily='ui-sans-serif,system-ui,sans-serif'>mailer.ts</text>
      <text x={col0 + bw / 2} y={74} textAnchor='middle' fill={LABEL_COLOR} fontSize={10} fontFamily='ui-monospace,monospace'>nodemailer → SMTP</text>

      <HArrow y={36 + bh / 2} x1={col0 + bw} x2={col1} label='port 465 / TLS' />

      <rect x={col1} y={36} width={bw} height={bh} rx={BOX_R} fill={ORANGE_DIM} stroke={ORANGE} strokeWidth={1.5} />
      <text x={col1 + bw / 2} y={56} textAnchor='middle' fill={ORANGE} fontSize={13} fontWeight={600} fontFamily='ui-sans-serif,system-ui,sans-serif'>smtp.forwardemail.net</text>
      <text x={col1 + bw / 2} y={74} textAnchor='middle' fill={LABEL_COLOR} fontSize={10} fontFamily='ui-monospace,monospace'>relays outbound mail</text>

      <HArrow y={36 + bh / 2} x1={col1 + bw} x2={col2} label='delivers' />

      <rect x={col2} y={36} width={bw} height={bh} rx={BOX_R} fill='#27272a' stroke={BORDER} strokeWidth={1.5} />
      <text x={col2 + bw / 2} y={56} textAnchor='middle' fill={TEXT_COLOR} fontSize={13} fontWeight={600} fontFamily='ui-sans-serif,system-ui,sans-serif'>Customer Inbox</text>
      <text x={col2 + bw / 2} y={74} textAnchor='middle' fill={LABEL_COLOR} fontSize={10} fontFamily='ui-monospace,monospace'>noreply@{'{domain}'}</text>

      {/* Row 2 — DNS provisioning */}
      <rect x={col0} y={140} width={bw} height={bh} rx={BOX_R} fill={GREEN_DIM} stroke={GREEN} strokeWidth={1.5} />
      <text x={col0 + bw / 2} y={160} textAnchor='middle' fill={GREEN} fontSize={13} fontWeight={600} fontFamily='ui-sans-serif,system-ui,sans-serif'>provision-email-dns</text>
      <text x={col0 + bw / 2} y={178} textAnchor='middle' fill={LABEL_COLOR} fontSize={10} fontFamily='ui-monospace,monospace'>Admin Dashboard API</text>

      <HArrow y={140 + bh / 2} x1={col0 + bw} x2={col1} label='create domain + aliases' />

      <rect x={col1} y={140} width={bw} height={bh} rx={BOX_R} fill={ORANGE_DIM} stroke={ORANGE} strokeWidth={1.5} />
      <text x={col1 + bw / 2} y={160} textAnchor='middle' fill={ORANGE} fontSize={13} fontWeight={600} fontFamily='ui-sans-serif,system-ui,sans-serif'>FE API</text>
      <text x={col1 + bw / 2} y={178} textAnchor='middle' fill={LABEL_COLOR} fontSize={10} fontFamily='ui-monospace,monospace'>returns smtp_dns_records</text>

      <HArrow y={140 + bh / 2} x1={col1 + bw} x2={col2} label='write DNS records' />

      <rect x={col2} y={140} width={bw} height={bh} rx={BOX_R} fill='#27272a' stroke={BORDER} strokeWidth={1.5} />
      <text x={col2 + bw / 2} y={160} textAnchor='middle' fill={TEXT_COLOR} fontSize={13} fontWeight={600} fontFamily='ui-sans-serif,system-ui,sans-serif'>Vercel DNS</text>
      <text x={col2 + bw / 2} y={178} textAnchor='middle' fill={LABEL_COLOR} fontSize={10} fontFamily='ui-monospace,monospace'>DKIM · SPF · DMARC · CNAME</text>

      {/* Row 3 — Cron approval check */}
      <rect x={col0} y={244} width={bw} height={bh} rx={BOX_R} fill={BLUE_DIM} stroke={BLUE} strokeWidth={1.5} />
      <text x={col0 + bw / 2} y={264} textAnchor='middle' fill={BLUE} fontSize={13} fontWeight={600} fontFamily='ui-sans-serif,system-ui,sans-serif'>Vercel Cron (5 min)</text>
      <text x={col0 + bw / 2} y={282} textAnchor='middle' fill={LABEL_COLOR} fontSize={10} fontFamily='ui-monospace,monospace'>check-email-approval</text>

      <HArrow y={244 + bh / 2} x1={col0 + bw} x2={col1} label='poll has_smtp' />

      <rect x={col1} y={244} width={bw} height={bh} rx={BOX_R} fill={ORANGE_DIM} stroke={ORANGE} strokeWidth={1.5} />
      <text x={col1 + bw / 2} y={264} textAnchor='middle' fill={ORANGE} fontSize={13} fontWeight={600} fontFamily='ui-sans-serif,system-ui,sans-serif'>FE Domain Status</text>
      <text x={col1 + bw / 2} y={282} textAnchor='middle' fill={LABEL_COLOR} fontSize={10} fontFamily='ui-monospace,monospace'>has_smtp: true → approved</text>

      <HArrow y={244 + bh / 2} x1={col1 + bw} x2={col2} label='notify customer' />

      <rect x={col2} y={244} width={bw} height={bh} rx={BOX_R} fill={GREEN_DIM} stroke={GREEN} strokeWidth={1.5} />
      <text x={col2 + bw / 2} y={264} textAnchor='middle' fill={GREEN} fontSize={13} fontWeight={600} fontFamily='ui-sans-serif,system-ui,sans-serif'>Email Active</text>
      <text x={col2 + bw / 2} y={282} textAnchor='middle' fill={LABEL_COLOR} fontSize={10} fontFamily='ui-monospace,monospace'>status → approved in DB</text>
    </SvgWrap>
  );
}

// ─── 6. Email DNS Provisioning Flow ──────────────────────────────────────────
export function EmailDnsFlowDiagram() {
  const W = 680; const bw = 340; const cx = W / 2 - bw / 2;
  const steps = [
    { label: 'Admin clicks "Setup Email" in Sites tab', sub: 'Admin Dashboard', accent: false },
    { label: 'provision-email-dns API', sub: 'POST /api/admin/provision-email-dns', accent: false },
    { label: 'Get/Create domain in Forward Email', sub: 'api.forwardemail.net/v1/domains', accent: false },
    { label: 'Fetch smtp_dns_records from FE API', sub: 'DKIM · SPF · DMARC · return-path CNAME', accent: false },
    { label: 'Write DNS records to Vercel', sub: 'api.vercel.com/v4/domains/{domain}/records', accent: false },
    { label: 'Create noreply@ + support@ aliases', sub: 'Both forward to customer\'s registered email', accent: false },
    { label: 'Trigger FE SMTP verification', sub: 'status → provisioned or verified', accent: false },
    { label: 'Cron polls every 5 min (has_smtp)', sub: 'check-email-approval route', accent: false },
    { label: 'Email fully approved — customer notified', sub: 'status → approved in Supabase', accent: true },
  ];
  const gap = 82; const H = 20 + steps.length * gap + 20;
  return (
    <SvgWrap width={W} height={H}>
      {steps.map((s, i) => {
        const y = 10 + i * gap;
        return (
          <g key={i}>
            <Box x={cx} y={y} w={bw} label={s.label} sublabel={s.sub} accent={s.accent} />
            {i < steps.length - 1 && <VArrow x={cx + bw / 2} y1={y + (s.sub ? 64 : BOX_H)} y2={y + gap} />}
          </g>
        );
      })}
    </SvgWrap>
  );
}

export const DIAGRAMS: Record<string, React.FC> = {
  'deployment-flow':    DeploymentFlowDiagram,
  'code-edit-flow':     CodeEditFlowDiagram,
  'webhook-flow':       WebhookFlowDiagram,
  'storage-structure':  StorageStructureDiagram,
  'email-architecture': EmailArchitectureDiagram,
  'email-dns-flow':     EmailDnsFlowDiagram,
};
