'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from '@/components/ui/use-toast';
import { 
  IoServer, 
  IoPlay, 
  IoCheckmark, 
  IoEye, 
  IoCheckmarkCircle, 
  IoCloseCircle, 
  IoColorPalette, 
  IoCube,
  IoImages,
  IoDocumentText,
  IoRefresh,
  IoArrowForward,
  IoDownload,
  IoHome,
  IoMenu,
  IoLayers,
  IoSearch,
  IoChevronDown,
  IoChevronUp,
  IoPricetag,
  IoClose,
  IoSettings,
  IoCode,
  IoShield,
  IoRocket,
  IoGlobe,
} from 'react-icons/io5';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/button';

interface MigrationJob {
  id: string;
  target_url: string;
  wp_admin_username: string | null;
  wp_application_password: string | null;
  migration_version: string | null;
  build_status: any;
  metadata: any;
  brand_guide_url: string | null;
  component_library_url: string | null;
  asset_manifest_url: string | null;
}

interface MigrationPage {
  id: string;
  url: string;
  status: string;
  original_screenshot_url?: string | null;
  page_label?: string | null;
  metadata?: any;
}

interface MigrationV2Props {
  job: MigrationJob | null;
  customerId: string;
  pages: MigrationPage[];
  onRefresh: () => void;
  wpCredentials: {
    wpUrl: string;
    setWpUrl: (v: string) => void;
    wpUsername: string;
    setWpUsername: (v: string) => void;
    wpPassword: string;
    setWpPassword: (v: string) => void;
    isTestingWp: boolean;
    isStartingMigration: boolean;
    wpTestResult: { success: boolean; message: string } | null;
    handleTestWpConnection: () => void;
    handleStartMigration: () => void;
  };
}

type PhaseId = 'discovery' | 'home_page' | 'main_menu' | 'remaining';
type StepId = 'homepage_capture' | 'brand_guide' | 'components' | 'assets' | 'generate_config' | 'generate_page' | 'code_qa' | 'deploy_preview' | 'visual_qa';

const PHASES: { id: PhaseId; label: string; description: string; icon: React.ElementType }[] = [
  { id: 'discovery', label: 'Phase 1', description: 'Discovery', icon: IoSearch },
  { id: 'home_page', label: 'Phase 2', description: 'Home Page', icon: IoHome },
  { id: 'main_menu', label: 'Phase 3', description: 'Main Menu', icon: IoMenu },
  { id: 'remaining', label: 'Phase 4', description: 'Remaining', icon: IoLayers },
];

type Step = {
  id: StepId;
  name: string;
  description: string;
  automation: 'scripted' | 'ai-assisted';
  status: 'pending' | 'in_progress' | 'complete' | 'error';
  endpoint: string;
  canRun: boolean;
  result?: any;
  error?: string;
};

const LABEL_OPTIONS: { value: string | null; label: string; color: string }[] = [
  { value: 'home', label: 'Home', color: 'bg-amber-500/20 text-amber-400 ring-amber-500/30' },
  { value: 'main_menu', label: 'Main Menu', color: 'bg-blue-500/20 text-blue-400 ring-blue-500/30' },
  { value: 'remaining', label: 'Remaining', color: 'bg-purple-500/20 text-purple-400 ring-purple-500/30' },
  { value: null, label: 'None', color: 'bg-zinc-700/50 text-zinc-400 ring-zinc-600' },
];

function getLabelBadge(label: string | null | undefined) {
  const opt = LABEL_OPTIONS.find(o => o.value === label);
  if (!opt || !opt.value) return null;
  return (
    <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full ring-1 font-medium', opt.color)}>
      {opt.label}
    </span>
  );
}

// ─── Pages Table with Editable Labels ──────────────────────────────────────────

function PagesTable({
  pages,
  onLabelsUpdated,
  filterLabel,
}: {
  pages: MigrationPage[];
  onLabelsUpdated: () => void;
  filterLabel?: string | null; // if set, show only pages with this label
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingLabels, setUpdatingLabels] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = pages.filter(p => {
    if (filterLabel !== undefined) {
      if (filterLabel === null && p.page_label) return false;
      if (filterLabel !== null && p.page_label !== filterLabel) return false;
    }
    if (searchQuery && !p.url.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(p => p.id)));
    }
  };

  const updateLabels = async (label: string | null) => {
    if (selectedIds.size === 0) return;
    setUpdatingLabels(true);
    try {
      const res = await fetch('/api/admin/wp-migration/v2/pages/update-labels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageIds: Array.from(selectedIds), label }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: 'Labels Updated', description: data.message });
        setSelectedIds(new Set());
        onLabelsUpdated();
      } else {
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setUpdatingLabels(false);
    }
  };

  return (
    <div className="rounded-lg border border-zinc-800 bg-black">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-zinc-800 p-4 md:flex-row md:items-center md:justify-between">
        <h4 className="text-sm font-medium text-neutral-400">
          Pages ({filtered.length}{filterLabel !== undefined ? ` of ${pages.length}` : ''})
        </h4>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <IoSearch className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by URL..."
              className="h-7 w-40 rounded-md border border-zinc-700 bg-zinc-900 pl-8 pr-3 text-xs text-white placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Bulk label actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 border-b border-zinc-800 bg-zinc-900/50 px-4 py-2">
          <span className="text-xs text-neutral-400">{selectedIds.size} selected</span>
          <span className="text-xs text-zinc-600">|</span>
          <span className="text-[10px] text-zinc-500 uppercase">Set label:</span>
          {LABEL_OPTIONS.map(opt => (
            <button
              key={opt.value ?? 'none'}
              type="button"
              disabled={updatingLabels}
              onClick={() => updateLabels(opt.value)}
              className={cn(
                'rounded-md px-2 py-1 text-[11px] font-medium ring-1 transition-colors hover:brightness-125 disabled:opacity-50',
                opt.color
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Table body */}
      <div className="max-h-[400px] overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-neutral-500">
            {pages.length === 0 ? 'No pages discovered yet.' : 'No pages match the current filter.'}
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/50">
            {/* Select all row */}
            <div className="flex items-center gap-3 px-4 py-2 bg-zinc-900/30">
              <input
                type="checkbox"
                checked={selectedIds.size === filtered.length && filtered.length > 0}
                onChange={toggleSelectAll}
                className="h-3.5 w-3.5 rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-500/30"
              />
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Select All</span>
            </div>
            {filtered.map((page) => {
              const isExpanded = expandedId === page.id;
              let displayPath = page.url;
              try { displayPath = new URL(page.url).pathname || '/'; } catch {}

              return (
                <div key={page.id}>
                  <div className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-zinc-900/50">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(page.id)}
                      onChange={() => toggleSelect(page.id)}
                      className="h-3.5 w-3.5 rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-500/30"
                    />
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : page.id)}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-neutral-200">{displayPath}</p>
                        {(page.metadata as any)?.wp_title && (
                          <p className="truncate text-xs text-neutral-500">{(page.metadata as any).wp_title}</p>
                        )}
                      </div>
                      {getLabelBadge(page.page_label)}
                      {isExpanded ? <IoChevronUp className="h-3 w-3 text-zinc-500" /> : <IoChevronDown className="h-3 w-3 text-zinc-500" />}
                    </button>
                  </div>
                  {isExpanded && (
                    <div className="border-t border-zinc-800/30 bg-zinc-900/30 px-4 py-3">
                      <div className="grid grid-cols-2 gap-3 text-xs md:grid-cols-4">
                        <div>
                          <span className="text-neutral-500">Full URL</span>
                          <p className="mt-0.5 break-all text-neutral-300">{page.url}</p>
                        </div>
                        <div>
                          <span className="text-neutral-500">Status</span>
                          <p className="mt-0.5 text-neutral-300">{page.status}</p>
                        </div>
                        <div>
                          <span className="text-neutral-500">Label</span>
                          <p className="mt-0.5 text-neutral-300">{page.page_label || 'None'}</p>
                        </div>
                        <div>
                          <span className="text-neutral-500">WP Type</span>
                          <p className="mt-0.5 text-neutral-300">{(page.metadata as any)?.wp_type || '—'}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Pipeline Steps for Phases 2/3/4 ────────────────────────────────────────────

function PhaseSteps({
  job,
  customerId,
  phase,
  pages,
  onRefresh,
}: {
  job: MigrationJob;
  customerId: string;
  phase: PhaseId;
  pages: MigrationPage[];
  onRefresh: () => void;
}) {
  const [activeStep, setActiveStep] = useState<StepId>('homepage_capture');
  const [loading, setLoading] = useState<StepId | null>(null);
  const [stepResults, setStepResults] = useState<Record<string, any>>({});
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});
  const [activity, setActivity] = useState<any[]>([]);
  const [brandGuide, setBrandGuide] = useState<any>(null);
  const [componentLibrary, setComponentLibrary] = useState<any[]>([]);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // Determine page scope based on phase
  const pageLabel = phase === 'home_page' ? 'home' : phase === 'main_menu' ? 'main_menu' : 'remaining';
  const scopedPages = pages.filter(p => p.page_label === pageLabel);

  const metadata = (job.metadata || {}) as Record<string, any>;
  const phaseKey = `phase_${phase}`;
  const phaseMeta = metadata[phaseKey] || {};

  const hasCapture = phase === 'home_page'
    ? scopedPages.some(p => !!p.original_screenshot_url)
    : !!phaseMeta.capture_complete;
  const hasBrandGuide = phase === 'home_page' ? !!job.brand_guide_url : !!phaseMeta.brand_guide;
  const hasComponents = phase === 'home_page'
    ? (!!job.component_library_url || !!metadata.component_library)
    : !!phaseMeta.components;
  const hasAssets = phase === 'home_page' ? !!metadata.asset_manifest : !!phaseMeta.assets;
  const hasConfig = !!metadata.generated_site_config;
  const hasPageCode = !!metadata.generated_page_code;
  const hasCodeQA = !!metadata.code_qa_report;
  const hasDeploy = !!metadata.deploy_preview?.url;
  const hasVisualQA = !!metadata.visual_qa_report;

  const steps: Step[] = [
    {
      id: 'homepage_capture',
      name: 'Capture',
      description: `Screenshots & HTML for ${phase === 'home_page' ? 'home page' : phase === 'main_menu' ? 'menu pages' : 'remaining pages'}`,
      automation: 'scripted',
      status: hasCapture ? 'complete' : 'pending',
      endpoint: '/api/admin/wp-migration/v2/homepage/capture',
      canRun: scopedPages.length > 0 && !hasCapture,
    },
    {
      id: 'brand_guide',
      name: 'Brand Guide',
      description: 'AI extracts colors, fonts, patterns',
      automation: 'ai-assisted',
      status: hasBrandGuide ? 'complete' : 'pending',
      endpoint: '/api/admin/wp-migration/v2/homepage/extract-brand',
      canRun: hasCapture && !hasBrandGuide,
    },
    {
      id: 'components',
      name: 'Components',
      description: 'AI identifies reusable React components',
      automation: 'ai-assisted',
      status: hasComponents ? 'complete' : 'pending',
      endpoint: '/api/admin/wp-migration/v2/homepage/create-components',
      canRun: hasBrandGuide && !hasComponents,
    },
    {
      id: 'assets',
      name: 'Assets',
      description: `Download images & files for ${phase === 'home_page' ? 'home page' : phase === 'main_menu' ? 'menu pages' : 'remaining pages'}`,
      automation: 'scripted',
      status: hasAssets ? 'complete' : 'pending',
      endpoint: '/api/admin/wp-migration/v2/assets/download',
      canRun: hasCapture && !hasAssets,
    },
    {
      id: 'generate_config',
      name: 'Site Config',
      description: 'AI generates site.config.ts from extracted data',
      automation: 'ai-assisted',
      status: hasConfig ? 'complete' : 'pending',
      endpoint: '/api/admin/wp-migration/v2/homepage/generate-config',
      canRun: hasBrandGuide && hasComponents,
    },
    {
      id: 'generate_page',
      name: 'Page Code',
      description: 'AI generates Next.js page.tsx',
      automation: 'ai-assisted',
      status: hasPageCode ? 'complete' : 'pending',
      endpoint: '/api/admin/wp-migration/v2/homepage/generate-page',
      canRun: hasConfig,
    },
    {
      id: 'code_qa',
      name: 'Code QA',
      description: 'AI reviews generated code quality',
      automation: 'ai-assisted',
      status: hasCodeQA ? 'complete' : 'pending',
      endpoint: '/api/admin/wp-migration/v2/homepage/code-qa',
      canRun: hasPageCode,
    },
    {
      id: 'deploy_preview',
      name: 'Deploy',
      description: 'Push to repo & deploy to Vercel',
      automation: 'scripted',
      status: hasDeploy ? 'complete' : 'pending',
      endpoint: '/api/admin/wp-migration/v2/homepage/deploy-preview',
      canRun: hasPageCode,
    },
    {
      id: 'visual_qa',
      name: 'Visual QA',
      description: 'Screenshot comparison old vs new',
      automation: 'ai-assisted',
      status: hasVisualQA ? 'complete' : 'pending',
      endpoint: '/api/admin/wp-migration/v2/homepage/visual-qa',
      canRun: hasDeploy,
    },
  ];

  // Poll activity
  const pollActivity = useCallback(async () => {
    if (!job) return;
    try {
      const res = await fetch(`/api/admin/wp-migration/v2/status?jobId=${job.id}`);
      const data = await res.json();
      if (res.ok && data.activity) setActivity(data.activity);
    } catch {}
  }, [job]);

  useEffect(() => {
    if (loading) {
      pollActivity();
      pollRef.current = setInterval(pollActivity, 2000);
    } else {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [loading, pollActivity]);

  // Load existing data
  useEffect(() => {
    const buildStatus = (job.build_status || {}) as Record<string, any>;
    setActivity(buildStatus.recent_activity || []);

    if (hasBrandGuide && !brandGuide && phase === 'home_page') {
      fetchBrandGuide(job.id);
    }
    if (hasComponents && componentLibrary.length === 0 && phase === 'home_page') {
      const lib = metadata.component_library;
      if (lib?.components) setComponentLibrary(Array.isArray(lib.components) ? lib.components : []);
    }
  }, [job]);

  const fetchBrandGuide = async (jobId: string) => {
    try {
      const res = await fetch('/api/admin/wp-migration/v2/homepage/extract-brand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      });
      const data = await res.json();
      if (res.ok && data.brandGuide) setBrandGuide(data.brandGuide);
    } catch {}
  };

  const runStep = async (step: Step) => {
    if (!job) return;
    setLoading(step.id);
    setStepErrors(prev => { const n = { ...prev }; delete n[step.id]; return n; });

    try {
      const response = await fetch(step.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: job.id, customerId, phase, pageLabel }),
      });
      const data = await response.json();

      if (response.ok) {
        setStepResults(prev => ({ ...prev, [step.id]: data }));
        if (step.id === 'brand_guide' && data.brandGuide) setBrandGuide(data.brandGuide);
        if (step.id === 'components' && data.components) {
          setComponentLibrary(Array.isArray(data.components) ? data.components : []);
        }
        toast({ title: 'Success', description: step.name + ' completed' });
        setTimeout(onRefresh, 1000);
      } else {
        throw new Error(data.error || 'Step failed');
      }
    } catch (error: any) {
      setStepErrors(prev => ({ ...prev, [step.id]: error.message }));
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(null);
    }
  };

  const getStepIcon = (id: StepId) => {
    switch (id) {
      case 'homepage_capture': return <IoEye className="h-4 w-4" />;
      case 'brand_guide': return <IoColorPalette className="h-4 w-4" />;
      case 'components': return <IoCube className="h-4 w-4" />;
      case 'assets': return <IoImages className="h-4 w-4" />;
      case 'generate_config': return <IoSettings className="h-4 w-4" />;
      case 'generate_page': return <IoCode className="h-4 w-4" />;
      case 'code_qa': return <IoShield className="h-4 w-4" />;
      case 'deploy_preview': return <IoRocket className="h-4 w-4" />;
      case 'visual_qa': return <IoGlobe className="h-4 w-4" />;
    }
  };

  if (scopedPages.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-black p-6 text-center">
        <IoPricetag className="mx-auto h-8 w-8 text-zinc-600 mb-3" />
        <p className="text-sm text-neutral-400">
          No pages labeled as <span className="text-white font-medium">{pageLabel === 'home' ? 'Home' : pageLabel === 'main_menu' ? 'Main Menu' : 'Remaining'}</span>
        </p>
        <p className="text-xs text-zinc-500 mt-1">Go to Phase 1 to label pages, then come back here.</p>
      </div>
    );
  }

  const activeStepData = steps.find(s => s.id === activeStep)!;
  const stepStatus = (id: StepId) => {
    if (loading === id) return 'in_progress';
    if (stepErrors[id]) return 'error';
    return steps.find(s => s.id === id)!.status;
  };

  return (
    <div className="space-y-4">
      {/* Scoped page count */}
      <div className="rounded-lg border border-zinc-800 bg-black px-4 py-3 flex items-center justify-between">
        <span className="text-xs text-neutral-400">
          Processing <span className="text-white font-medium">{scopedPages.length}</span> page{scopedPages.length !== 1 ? 's' : ''} labeled{' '}
          {getLabelBadge(pageLabel)}
        </span>
      </div>

      {/* Step circles */}
      <div className="rounded-lg border border-zinc-800 bg-black p-5">
        <h4 className="mb-6 text-xs font-medium uppercase tracking-wider text-white">Pipeline Steps</h4>
        <div className="relative">
          <div className="flex justify-between relative">
            {steps.map((step, index) => {
              const status = stepStatus(step.id);
              return (
                <React.Fragment key={step.id}>
                  <div className="flex flex-col items-center">
                    <button
                      onClick={() => setActiveStep(step.id)}
                      className={cn(
                        'relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all',
                        activeStep === step.id && status === 'complete' ? 'border-emerald-500 bg-emerald-500 text-black ring-2 ring-emerald-400/60 ring-offset-2 ring-offset-black shadow-[0_0_12px_rgba(16,185,129,0.3)]' :
                        activeStep === step.id ? 'border-emerald-500 bg-zinc-900 text-emerald-400' :
                        status === 'complete' ? 'border-emerald-500 bg-emerald-500 text-black' :
                        status === 'in_progress' ? 'border-blue-500 bg-blue-500 text-white animate-pulse' :
                        status === 'error' ? 'border-red-500 bg-red-500 text-white' :
                        'border-zinc-600 bg-zinc-800 text-zinc-400 hover:border-zinc-500'
                      )}
                    >
                      {status === 'complete' ? <IoCheckmark className="h-5 w-5" /> :
                       status === 'error' ? <IoCloseCircle className="h-5 w-5" /> :
                       status === 'in_progress' ? <IoPlay className="h-4 w-4" /> :
                       getStepIcon(step.id)}
                    </button>
                    <div className="mt-3 text-center">
                      <h5 className={cn('text-xs font-medium', activeStep === step.id || status === 'complete' ? 'text-white' : 'text-zinc-400')}>
                        {step.name}
                      </h5>
                      <p className="mt-1 text-[10px] text-zinc-500 max-w-[80px]">{step.description}</p>
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className="absolute top-5 left-10 right-0 h-0.5 bg-zinc-700" style={{ width: 'calc(100% - 40px)' }} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* Active step detail + run button */}
      <div className="rounded-lg border border-zinc-800 bg-black p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
              stepStatus(activeStep) === 'complete' ? 'bg-emerald-500/20 text-emerald-400' :
              stepStatus(activeStep) === 'in_progress' ? 'bg-blue-500/20 text-blue-400' :
              stepStatus(activeStep) === 'error' ? 'bg-red-500/20 text-red-400' :
              'bg-zinc-800 text-zinc-500'
            )}>
              {stepStatus(activeStep) === 'complete' ? <IoCheckmarkCircle className="h-5 w-5" /> :
               stepStatus(activeStep) === 'in_progress' ? <IoPlay className="h-4 w-4" /> :
               stepStatus(activeStep) === 'error' ? <IoCloseCircle className="h-5 w-5" /> :
               getStepIcon(activeStep)}
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">{activeStepData.name}</h4>
              <p className="text-xs text-zinc-400">{activeStepData.description}</p>
              <p className="text-xs text-zinc-500 mt-1">{activeStepData.automation === 'scripted' ? 'Scripted' : 'AI-Assisted'}</p>
              {stepErrors[activeStep] && <p className="mt-1 text-[10px] text-red-400">{stepErrors[activeStep]}</p>}
              {stepResults[activeStep] && <p className="mt-1 text-[10px] text-emerald-400">{stepResults[activeStep].message || 'Completed'}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {activeStepData.canRun && stepStatus(activeStep) === 'in_progress' && (
              <div className="flex items-center gap-2 rounded-lg bg-zinc-800 px-3 py-1.5">
                <svg className="h-4 w-4 animate-spin text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-xs font-medium text-blue-400">Running…</span>
              </div>
            )}
            {activeStepData.canRun && stepStatus(activeStep) !== 'in_progress' && (
              <button
                onClick={() => runStep(activeStepData)}
                disabled={loading !== null}
                className="rounded-lg px-3 py-1.5 text-xs font-medium transition-all bg-emerald-500 text-black hover:bg-emerald-400 disabled:opacity-50"
              >
                {stepStatus(activeStep) === 'complete' ? 'Re-run' : 'Run'}
              </button>
            )}
            {stepStatus(activeStep) === 'error' && (
              <button
                onClick={() => runStep(activeStepData)}
                disabled={loading !== null}
                className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-neutral-300 hover:border-zinc-500 hover:text-white disabled:opacity-50"
              >
                Retry
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Activity Log */}
      <div className="rounded-lg border border-zinc-800 bg-black">
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2">
          <div className="flex items-center gap-2">
            <div className={cn('h-2 w-2 rounded-full', activity.length > 0 ? 'bg-emerald-500' : 'bg-zinc-600')} />
            <h4 className="text-xs font-medium uppercase tracking-wider text-white">Activity Log</h4>
          </div>
          <div className="text-xs text-zinc-500">{activity.length} {activity.length === 1 ? 'entry' : 'entries'}</div>
        </div>
        <div className="max-h-60 overflow-y-auto p-4">
          {activity.length > 0 ? (
            <div className="space-y-2">
              {activity.slice(-10).reverse().map((act, i) => (
                <div key={i} className="flex items-start gap-3 text-sm">
                  <div className="h-2 w-2 rounded-full bg-emerald-400 mt-1.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-xs text-neutral-500 mb-0.5">
                      <span>{new Date(act.timestamp).toLocaleTimeString()}</span>
                      <span>•</span>
                      <span className="capitalize">{act.action.replace('_', ' ')}</span>
                    </div>
                    <span className="text-neutral-200">{act.message}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-neutral-500">No activity yet</p>
          )}
        </div>
      </div>

      {/* Brand Guide & Components displays */}
      {brandGuide && activeStep === 'brand_guide' && <BrandGuideDisplay brandGuide={brandGuide} />}
      {componentLibrary.length > 0 && activeStep === 'components' && <ComponentsDisplay components={componentLibrary} />}

      {/* Site Config display */}
      {activeStep === 'generate_config' && metadata.generated_site_config && (
        <SiteConfigDisplay config={metadata.generated_site_config} />
      )}

      {/* Page Code display */}
      {activeStep === 'generate_page' && metadata.generated_page_code && (
        <PageCodeDisplay code={metadata.generated_page_code} />
      )}

      {/* Code QA Report display + Fix Issues button */}
      {activeStep === 'code_qa' && metadata.code_qa_report && (
        <CodeQAPanel
          report={metadata.code_qa_report}
          fixHistory={metadata.fix_history || []}
          jobId={job.id}
          loading={loading}
          onFixStart={() => setLoading('code_qa')}
          onFixEnd={(data) => {
            setLoading(null);
            if (data) setStepResults(prev => ({ ...prev, code_qa: data }));
            setTimeout(onRefresh, 1000);
          }}
        />
      )}

      {/* Deploy Preview display */}
      {activeStep === 'deploy_preview' && metadata.deploy_preview && (
        <DeployPreviewDisplay deploy={metadata.deploy_preview} />
      )}

      {/* Visual QA display: report + screenshot comparison */}
      {activeStep === 'visual_qa' && (
        <>
          {metadata.visual_qa_report && (
            <QAReportDisplay
              report={metadata.visual_qa_report}
              title="Visual QA Report"
              jobId={job.id}
              isFixing={loading === 'visual_qa'}
              onFixStart={() => setLoading('visual_qa')}
              onFixEnd={() => {
                setLoading(null);
                setTimeout(onRefresh, 1000);
              }}
            />
          )}
          {metadata.visual_qa_screenshots && (
            <ScreenshotComparison screenshots={metadata.visual_qa_screenshots} />
          )}
        </>
      )}
    </div>
  );
}

// ─── Site Config Display ─────────────────────────────────────────────────────────

function SiteConfigDisplay({ config }: { config: string }) {
  const [expanded, setExpanded] = useState(false);
  const lines = config.split('\n');
  const preview = lines.slice(0, expanded ? lines.length : 30).join('\n');

  return (
    <div className="rounded-lg border border-zinc-800 bg-black">
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2">
        <div className="flex items-center gap-2">
          <IoSettings className="h-4 w-4 text-emerald-400" />
          <h4 className="text-xs font-medium uppercase tracking-wider text-white">Generated site.config.ts</h4>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-500">{lines.length} lines</span>
          <button
            onClick={() => navigator.clipboard.writeText(config)}
            className="text-[10px] text-zinc-400 hover:text-white transition-colors"
          >
            Copy
          </button>
        </div>
      </div>
      <div className="p-4">
        <pre className="text-[11px] text-zinc-300 overflow-x-auto whitespace-pre font-mono leading-relaxed max-h-[400px] overflow-y-auto">
          {preview}
        </pre>
        {lines.length > 30 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-2 text-[10px] text-emerald-400 hover:text-emerald-300"
          >
            {expanded ? 'Show less' : `Show all ${lines.length} lines`}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Page Code Display ───────────────────────────────────────────────────────────

function PageCodeDisplay({ code }: { code: string }) {
  const [expanded, setExpanded] = useState(false);
  const lines = code.split('\n');
  const preview = lines.slice(0, expanded ? lines.length : 30).join('\n');

  return (
    <div className="rounded-lg border border-zinc-800 bg-black">
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2">
        <div className="flex items-center gap-2">
          <IoCode className="h-4 w-4 text-blue-400" />
          <h4 className="text-xs font-medium uppercase tracking-wider text-white">Generated page.tsx</h4>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-500">{lines.length} lines</span>
          <button
            onClick={() => navigator.clipboard.writeText(code)}
            className="text-[10px] text-zinc-400 hover:text-white transition-colors"
          >
            Copy
          </button>
        </div>
      </div>
      <div className="p-4">
        <pre className="text-[11px] text-zinc-300 overflow-x-auto whitespace-pre font-mono leading-relaxed max-h-[400px] overflow-y-auto">
          {preview}
        </pre>
        {lines.length > 30 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-2 text-[10px] text-emerald-400 hover:text-emerald-300"
          >
            {expanded ? 'Show less' : `Show all ${lines.length} lines`}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Code QA Panel (report + fix button + iteration history) ─────────────────────

function CodeQAPanel({
  report,
  fixHistory,
  jobId,
  loading,
  onFixStart,
  onFixEnd,
}: {
  report: any;
  fixHistory: any[];
  jobId: string;
  loading: StepId | null;
  onFixStart: () => void;
  onFixEnd: (data: any) => void;
}) {
  const score = report.overall_score || 0;
  const needsFix = score < 8;
  const maxReached = fixHistory.length >= 3;
  const isFixing = loading === 'code_qa';

  const handleFix = async () => {
    onFixStart();
    try {
      const res = await fetch('/api/admin/wp-migration/v2/homepage/fix-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fix failed');
      onFixEnd(data);
    } catch (error: any) {
      onFixEnd(null);
    }
  };

  return (
    <div className="space-y-3">
      <QAReportDisplay report={report} title="Code QA Report" />

      {/* Fix Issues button */}
      {needsFix && (
        <div className="rounded-lg border border-zinc-800 bg-black p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/20">
                <IoRefresh className={cn('h-4 w-4 text-amber-400', isFixing && 'animate-spin')} />
              </div>
              <div>
                <p className="text-xs font-medium text-white">
                  {maxReached
                    ? `Max fix iterations reached (${fixHistory.length}/3)`
                    : `Score ${score}/10 — below threshold (8/10)`}
                </p>
                <p className="text-[10px] text-zinc-500">
                  {maxReached
                    ? 'You may still manually adjust and re-run steps'
                    : `Auto-fix will regenerate code and re-QA (up to ${3 - fixHistory.length} more iteration${3 - fixHistory.length !== 1 ? 's' : ''})`}
                </p>
              </div>
            </div>
            {!maxReached && (
              <button
                onClick={handleFix}
                disabled={isFixing || loading !== null}
                className={cn(
                  'rounded-lg px-4 py-1.5 text-xs font-medium transition-all',
                  isFixing
                    ? 'bg-zinc-700 text-zinc-400 cursor-wait'
                    : 'bg-amber-500 text-black hover:bg-amber-400'
                )}
              >
                {isFixing ? 'Fixing...' : 'Fix Issues'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Iteration history */}
      {fixHistory.length > 0 && (
        <div className="rounded-lg border border-zinc-800 bg-black p-4">
          <h4 className="text-[10px] font-medium uppercase tracking-wider text-zinc-400 mb-3">Fix Iteration History</h4>
          <div className="space-y-2">
            {fixHistory.map((h: any, i: number) => (
              <div key={i} className="flex items-center gap-3 text-xs">
                <span className="text-zinc-500 w-16 shrink-0">Round {h.iteration}</span>
                <div className="flex items-center gap-1.5">
                  <span className={cn(
                    'rounded px-1.5 py-0.5 text-[10px] font-medium',
                    h.previousScore >= 8 ? 'bg-emerald-500/20 text-emerald-400' :
                    h.previousScore >= 6 ? 'bg-amber-500/20 text-amber-400' :
                    'bg-red-500/20 text-red-400'
                  )}>
                    {h.previousScore}
                  </span>
                  <IoArrowForward className="h-3 w-3 text-zinc-500" />
                  <span className={cn(
                    'rounded px-1.5 py-0.5 text-[10px] font-medium',
                    h.newScore >= 8 ? 'bg-emerald-500/20 text-emerald-400' :
                    h.newScore >= 6 ? 'bg-amber-500/20 text-amber-400' :
                    'bg-red-500/20 text-red-400'
                  )}>
                    {h.newScore}
                  </span>
                </div>
                <span className="text-zinc-500">
                  {h.newScore > h.previousScore ? `+${(h.newScore - h.previousScore).toFixed(1)}` :
                   h.newScore < h.previousScore ? `${(h.newScore - h.previousScore).toFixed(1)}` :
                   'no change'}
                </span>
                {h.newScore >= 8 && (
                  <span className="text-[10px] text-emerald-400 font-medium">PASSED</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── QA Report Display ───────────────────────────────────────────────────────────

function QAReportDisplay({
  report,
  title = 'QA Report',
  jobId,
  isFixing,
  onFixStart,
  onFixEnd,
}: {
  report: any;
  title?: string;
  jobId?: string;
  isFixing?: boolean;
  onFixStart?: () => void;
  onFixEnd?: () => void;
}) {
  const [fixingKey, setFixingKey] = useState<string | null>(null);
  const scores = report.scores || {};
  const scoreEntries = Object.entries(scores) as [string, { score: number; notes: string }][];
  const overallScore = report.overall_score || 0;

  const scoreColor = (score: number) => {
    if (score >= 8) return 'text-emerald-400 bg-emerald-500/20';
    if (score >= 6) return 'text-amber-400 bg-amber-500/20';
    return 'text-red-400 bg-red-500/20';
  };

  const handleFixIssue = async (issueKey: string, issueNotes: string) => {
    if (!jobId || !onFixStart || !onFixEnd) return;
    setFixingKey(issueKey);
    onFixStart();
    try {
      const res = await fetch('/api/admin/wp-migration/v2/homepage/fix-visual-issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, issueKey, issueNotes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fix failed');
      const label = issueKey.replace(/_/g, ' ');
      if (data.newScore !== null && data.newScore !== undefined) {
        const improvement = data.newScore - (data.previousScore || 0);
        toast({
          title: data.improved ? 'Issue Improved!' : 'Fix Applied',
          description: `"${label}": ${data.previousScore || '?'}/10 → ${data.newScore}/10 (${improvement >= 0 ? '+' : ''}${improvement})`,
        });
      } else {
        toast({
          title: 'Fix Applied',
          description: `Fixed "${label}", redeployed, and re-evaluated.`,
        });
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setFixingKey(null);
      onFixEnd();
    }
  };

  const canFix = !!jobId && !!onFixStart && !!onFixEnd;

  return (
    <div className="space-y-3">
      {/* Overall Score */}
      <div className="rounded-lg border border-zinc-800 bg-black p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <IoShield className="h-5 w-5 text-emerald-400" />
            <h4 className="text-sm font-semibold text-white">{title}</h4>
          </div>
          <div className={cn('rounded-lg px-3 py-1.5 text-lg font-bold', scoreColor(overallScore))}>
            {overallScore}/10
          </div>
        </div>
        <p className="text-sm text-zinc-300 mb-4">{report.summary}</p>
        <div className="flex items-center gap-2">
          <span className={cn(
            'text-[10px] px-2 py-0.5 rounded-full font-medium',
            report.ready_for_deployment ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
          )}>
            {report.ready_for_deployment ? 'Ready for deployment' : 'Needs work'}
          </span>
        </div>
      </div>

      {/* Score Breakdown */}
      <div className="rounded-lg border border-zinc-800 bg-black">
        <div className="border-b border-zinc-800 px-4 py-2">
          <h4 className="text-xs font-medium uppercase tracking-wider text-white">Score Breakdown</h4>
        </div>
        <div className="p-4 space-y-2">
          {scoreEntries.map(([key, val]) => (
            <div key={key} className="flex items-start gap-3">
              <div className={cn('shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold tabular-nums', scoreColor(val.score))}>
                {val.score}/10
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-zinc-300 capitalize">{key.replace(/_/g, ' ')}</p>
                <p className="text-[10px] text-zinc-500 mt-0.5">{val.notes}</p>
              </div>
              {canFix && val.score < 8 && (
                <button
                  onClick={() => handleFixIssue(key, val.notes)}
                  disabled={isFixing || fixingKey !== null}
                  className={cn(
                    'shrink-0 rounded-md px-2 py-1 text-[10px] font-medium transition-all',
                    fixingKey === key
                      ? 'bg-zinc-700 text-zinc-400 cursor-wait'
                      : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 disabled:opacity-50'
                  )}
                >
                  {fixingKey === key ? 'Fixing...' : 'Fix'}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Top Issues & Recommendations */}
      {(report.top_issues?.length > 0 || report.recommendations?.length > 0) && (
        <div className="grid grid-cols-2 gap-3">
          {report.top_issues?.length > 0 && (
            <div className="rounded-lg border border-zinc-800 bg-black p-4">
              <h4 className="text-xs font-medium uppercase tracking-wider text-red-400 mb-3">Top Issues</h4>
              <ul className="space-y-2">
                {report.top_issues.map((issue: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-[11px] text-zinc-300">
                    <IoCloseCircle className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />
                    <span>{issue}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {report.recommendations?.length > 0 && (
            <div className="rounded-lg border border-zinc-800 bg-black p-4">
              <h4 className="text-xs font-medium uppercase tracking-wider text-emerald-400 mb-3">Recommendations</h4>
              <ul className="space-y-2">
                {report.recommendations.map((rec: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-[11px] text-zinc-300">
                    <IoCheckmarkCircle className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Deploy Preview Display ──────────────────────────────────────────────────────

function DeployPreviewDisplay({ deploy }: { deploy: any }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-black p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <IoRocket className="h-5 w-5 text-emerald-400" />
          <h4 className="text-sm font-semibold text-white">Deploy Preview</h4>
        </div>
        <span className={cn(
          'text-[10px] px-2 py-0.5 rounded-full font-medium',
          deploy.ready ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
        )}>
          {deploy.ready ? 'Live' : 'Building'}
        </span>
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-500 w-20 shrink-0">URL</span>
          <a
            href={deploy.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-emerald-400 hover:text-emerald-300 underline underline-offset-2 truncate"
          >
            {deploy.url}
          </a>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-500 w-20 shrink-0">Domain</span>
          <span className="text-xs text-zinc-300">{deploy.customDomain}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-500 w-20 shrink-0">Repo</span>
          <span className="text-xs text-zinc-300">{deploy.repoName}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-500 w-20 shrink-0">Deployed</span>
          <span className="text-xs text-zinc-300">{new Date(deploy.deployedAt).toLocaleString()}</span>
        </div>
      </div>
      <div className="mt-4">
        <a
          href={deploy.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-black hover:bg-emerald-400 transition-colors"
        >
          <IoGlobe className="h-3.5 w-3.5" />
          Open Preview Site
        </a>
      </div>
    </div>
  );
}

// ─── Screenshot Comparison ───────────────────────────────────────────────────────

function ScreenshotComparison({ screenshots }: {
  screenshots: {
    old_desktop: string | null;
    old_mobile: string | null;
    new_desktop: string | null;
    new_mobile: string | null;
  };
}) {
  const [viewport, setViewport] = useState<'desktop' | 'mobile'>('desktop');

  const oldUrl = viewport === 'desktop' ? screenshots.old_desktop : screenshots.old_mobile;
  const newUrl = viewport === 'desktop' ? screenshots.new_desktop : screenshots.new_mobile;

  return (
    <div className="rounded-lg border border-zinc-800 bg-black">
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <IoImages className="h-4 w-4 text-emerald-400" />
          <h4 className="text-xs font-medium uppercase tracking-wider text-white">Screenshot Comparison</h4>
        </div>
        <div className="flex items-center rounded-lg bg-zinc-800 p-0.5">
          <button
            onClick={() => setViewport('desktop')}
            className={cn(
              'rounded-md px-3 py-1 text-[10px] font-medium transition-colors',
              viewport === 'desktop'
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'text-zinc-400 hover:text-white'
            )}
          >
            Desktop
          </button>
          <button
            onClick={() => setViewport('mobile')}
            className={cn(
              'rounded-md px-3 py-1 text-[10px] font-medium transition-colors',
              viewport === 'mobile'
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'text-zinc-400 hover:text-white'
            )}
          >
            Mobile
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 p-4">
        {/* Old Site */}
        <div>
          <div className="mb-2 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-red-400" />
            <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">Original WordPress</span>
          </div>
          <div className="rounded-lg border border-zinc-700 bg-zinc-900 overflow-hidden">
            {oldUrl ? (
              <img
                src={oldUrl}
                alt={`Original ${viewport} screenshot`}
                className="w-full h-auto"
                loading="lazy"
              />
            ) : (
              <div className="flex items-center justify-center h-48 text-xs text-zinc-500">
                No {viewport} screenshot available
              </div>
            )}
          </div>
        </div>

        {/* New Site */}
        <div>
          <div className="mb-2 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">New Next.js Site</span>
          </div>
          <div className="rounded-lg border border-zinc-700 bg-zinc-900 overflow-hidden">
            {newUrl ? (
              <img
                src={newUrl}
                alt={`New ${viewport} screenshot`}
                className="w-full h-auto"
                loading="lazy"
              />
            ) : (
              <div className="flex items-center justify-center h-48 text-xs text-zinc-500">
                No {viewport} screenshot available
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Export ─────────────────────────────────────────────────────────────────

export function MigrationV2({ job, customerId, pages, onRefresh, wpCredentials }: MigrationV2Props) {
  const {
    wpUrl, setWpUrl,
    wpUsername, setWpUsername,
    wpPassword, setWpPassword,
    isTestingWp, isStartingMigration, wpTestResult,
    handleTestWpConnection, handleStartMigration,
  } = wpCredentials;
  const [activePhase, setActivePhase] = useState<PhaseId>('discovery');
  const [labelFilter, setLabelFilter] = useState<string | null | undefined>(undefined); // undefined = show all

  // Discovery step state
  const [discoveryLoading, setDiscoveryLoading] = useState(false);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);

  const hasDiscovery = pages.length > 0 || ((job as any)?.total_pages ?? 0) > 0;

  // Auto-advance to Phase 2 if discovery is done
  useEffect(() => {
    if (hasDiscovery && activePhase === 'discovery') {
      // Stay on discovery so user can see/edit labels
    }
  }, [hasDiscovery]);

  const runDiscovery = async () => {
    if (!job) return;
    setDiscoveryLoading(true);
    setDiscoveryError(null);
    try {
      const res = await fetch('/api/admin/wp-migration/v2/discovery/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: job.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Discovery failed');
      toast({ title: 'Discovery Complete', description: `Found ${data.total} pages` });
      setTimeout(onRefresh, 500);
    } catch (e: any) {
      setDiscoveryError(e.message);
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setDiscoveryLoading(false);
    }
  };

  // Count pages per label
  const labelCounts = {
    home: pages.filter(p => p.page_label === 'home').length,
    main_menu: pages.filter(p => p.page_label === 'main_menu').length,
    remaining: pages.filter(p => p.page_label === 'remaining').length,
    unlabeled: pages.filter(p => !p.page_label).length,
  };

  if (!job) {
    return (
      <div className="rounded-xl bg-zinc-900 p-6">
        <div className="text-center text-neutral-400">
          <IoServer className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <p>No migration job found</p>
          <p className="text-sm mt-2">Please create a migration job first</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Phase Tabs */}
      <div className="rounded-lg border border-zinc-800 bg-black">
        <div className="flex">
          {PHASES.map((phase) => {
            const Icon = phase.icon;
            const isActive = activePhase === phase.id;
            const count = phase.id === 'discovery' ? pages.length
              : phase.id === 'home_page' ? labelCounts.home
              : phase.id === 'main_menu' ? labelCounts.main_menu
              : labelCounts.remaining;

            return (
              <button
                key={phase.id}
                type="button"
                onClick={() => setActivePhase(phase.id)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2',
                  isActive
                    ? 'border-emerald-500 bg-emerald-500/5 text-emerald-400'
                    : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50'
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{phase.label}:</span>
                <span>{phase.description}</span>
                {count > 0 && (
                  <span className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded-full',
                    isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-500'
                  )}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Phase Content */}
      {activePhase === 'discovery' && (
        <div className="space-y-4">
          {/* Discovery action */}
          <div className="rounded-lg border border-zinc-800 bg-black p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                  hasDiscovery ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-500'
                )}>
                  {hasDiscovery ? <IoCheckmarkCircle className="h-5 w-5" /> : <IoSearch className="h-4 w-4" />}
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">Discover Pages</h4>
                  <p className="text-xs text-zinc-400">Fetch all pages and posts from WordPress REST API</p>
                  {hasDiscovery && (
                    <p className="text-[10px] text-emerald-400 mt-1">
                      {pages.length} pages discovered • {labelCounts.home} home • {labelCounts.main_menu} main menu • {labelCounts.unlabeled} unlabeled
                    </p>
                  )}
                  {discoveryError && <p className="text-[10px] text-red-400 mt-1">{discoveryError}</p>}
                </div>
              </div>
              {!hasDiscovery && (
                <button
                  onClick={runDiscovery}
                  disabled={discoveryLoading}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
                    discoveryLoading ? 'bg-zinc-700 text-zinc-400 cursor-wait' : 'bg-emerald-500 text-black hover:bg-emerald-400'
                  )}
                >
                  {discoveryLoading ? 'Discovering...' : 'Run Discovery'}
                </button>
              )}
            </div>
          </div>

          {/* WordPress Credentials */}
          <div className="rounded-lg border border-zinc-800 bg-black p-5">
            <p className="mb-4 text-sm text-neutral-400">
              Enter the WordPress credentials below to initiate the migration. The site must be publicly accessible and the user must have Administrator privileges.
            </p>
            <form className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Target WP URL</label>
                  <input
                    type="url"
                    value={wpUrl}
                    onChange={(e) => setWpUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">WP Admin Username</label>
                  <input
                    type="text"
                    value={wpUsername}
                    onChange={(e) => setWpUsername(e.target.value)}
                    placeholder="admin"
                    className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    WP Application Password
                    <a href="https://make.wordpress.org/core/2020/11/05/application-passwords-integration-guide/" target="_blank" rel="noreferrer" className="text-xs text-emerald-500 hover:underline">
                      (How to get this)
                    </a>
                  </label>
                  <input
                    type="password"
                    value={wpPassword}
                    onChange={(e) => setWpPassword(e.target.value)}
                    placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
                    className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="pt-4 flex flex-col gap-3">
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleTestWpConnection}
                    disabled={isTestingWp}
                  >
                    {isTestingWp ? 'Testing...' : 'Test Connection'}
                  </Button>
                  <Button
                    type="button"
                    className="bg-emerald-500 text-black hover:bg-emerald-400"
                    onClick={handleStartMigration}
                    disabled={isStartingMigration}
                  >
                    {isStartingMigration ? 'Starting...' : 'Start Migration'}
                  </Button>
                </div>

                {wpTestResult && (
                  <div className={`mt-2 p-3 text-sm rounded-md ${wpTestResult.success ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                    {wpTestResult.message}
                  </div>
                )}
              </div>
            </form>
          </div>

          {/* Label summary */}
          {hasDiscovery && (
            <div className="flex gap-3">
              {[
                { label: 'Home', filterValue: 'home' as string | null, count: labelCounts.home, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', activeBorder: 'border-amber-400' },
                { label: 'Main Menu', filterValue: 'main_menu' as string | null, count: labelCounts.main_menu, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', activeBorder: 'border-blue-400' },
                { label: 'Remaining', filterValue: 'remaining' as string | null, count: labelCounts.remaining, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20', activeBorder: 'border-purple-400' },
                { label: 'Unlabeled', filterValue: null as string | null, count: labelCounts.unlabeled, color: 'text-zinc-400', bg: 'bg-zinc-800 border-zinc-700', activeBorder: 'border-zinc-400' },
              ].map(item => {
                const isActive = labelFilter === item.filterValue;
                return (
                  <button
                    key={item.label}
                    onClick={() => setLabelFilter(isActive ? undefined : item.filterValue)}
                    className={cn(
                      'flex-1 rounded-lg border p-3 text-center transition-all cursor-pointer',
                      item.bg,
                      isActive ? `${item.activeBorder} ring-1 ring-offset-0` : 'hover:opacity-80'
                    )}
                  >
                    <p className={cn('text-lg font-bold', item.color)}>{item.count}</p>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{item.label}</p>
                  </button>
                );
              })}
            </div>
          )}

          {/* Pages table */}
          {hasDiscovery && (
            <PagesTable pages={pages} onLabelsUpdated={onRefresh} filterLabel={labelFilter} />
          )}
        </div>
      )}

      {activePhase === 'home_page' && (
        <PhaseSteps job={job} customerId={customerId} phase="home_page" pages={pages} onRefresh={onRefresh} />
      )}

      {activePhase === 'main_menu' && (
        <PhaseSteps job={job} customerId={customerId} phase="main_menu" pages={pages} onRefresh={onRefresh} />
      )}

      {activePhase === 'remaining' && (
        <div className="space-y-4">
          <div className="rounded-lg border border-zinc-800 bg-black p-5">
            <div className="flex items-start gap-3">
              <IoLayers className="h-5 w-5 text-purple-400 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-white">Remaining Pages</h4>
                <p className="text-xs text-zinc-400 mt-1">
                  Select pages in Phase 1, label them as <span className="text-purple-400 font-medium">Remaining</span>, then run the pipeline here.
                  Only pages with the Remaining label will be processed.
                </p>
                {labelCounts.remaining > 0 && (
                  <p className="text-[10px] text-purple-400 mt-2">{labelCounts.remaining} page{labelCounts.remaining !== 1 ? 's' : ''} ready to process</p>
                )}
              </div>
            </div>
          </div>
          <PhaseSteps job={job} customerId={customerId} phase="remaining" pages={pages} onRefresh={onRefresh} />
        </div>
      )}
    </div>
  );
}

function ColorSwatch({ color, label }: { color: string; label?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="h-8 w-8 shrink-0 rounded-md ring-1 ring-zinc-700"
        style={{ backgroundColor: color }}
      />
      <div>
        <span className="text-xs font-mono text-neutral-200">{color}</span>
        {label && <span className="text-[10px] text-zinc-500 ml-1">({label})</span>}
      </div>
    </div>
  );
}

function BrandGuideDisplay({ brandGuide }: { brandGuide: any }) {
  const colors = brandGuide.colors || {};
  const typography = brandGuide.typography || {};
  const spacing = brandGuide.spacing || {};
  const borderRadius = brandGuide.border_radius || brandGuide.borderRadius || {};
  const shadows = brandGuide.shadows || {};
  const uiPatterns = brandGuide.ui_patterns || {};

  return (
    <div className="rounded-lg border border-zinc-800 bg-black">
      <div className="border-b border-zinc-800 px-5 py-3">
        <h4 className="text-xs font-medium uppercase tracking-wider text-white flex items-center gap-2">
          <IoColorPalette className="h-4 w-4 text-purple-400" />
          Extracted Brand Guide
        </h4>
      </div>

      <div className="p-5 space-y-6">
        {/* Colors */}
        {colors && Object.keys(colors).length > 0 && (
          <div>
            <h5 className="text-xs font-semibold text-white mb-3 uppercase tracking-wide">Colors</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Primary Colors */}
              {colors.primary && (
                <div className="rounded-lg bg-zinc-900 p-3">
                  <p className="text-[10px] text-zinc-400 uppercase tracking-wider mb-2">Primary</p>
                  <div className="flex gap-2 flex-wrap">
                    {(Array.isArray(colors.primary) ? colors.primary : [colors.primary]).map((c: string, i: number) => (
                      <div key={i} className="text-center">
                        <div className="h-12 w-12 rounded-lg ring-1 ring-zinc-700" style={{ backgroundColor: c }} />
                        <span className="text-[10px] font-mono text-zinc-400 mt-1 block">{c}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Secondary Colors */}
              {colors.secondary && (
                <div className="rounded-lg bg-zinc-900 p-3">
                  <p className="text-[10px] text-zinc-400 uppercase tracking-wider mb-2">Secondary</p>
                  <div className="flex gap-2 flex-wrap">
                    {(Array.isArray(colors.secondary) ? colors.secondary : [colors.secondary]).map((c: string, i: number) => (
                      <div key={i} className="text-center">
                        <div className="h-12 w-12 rounded-lg ring-1 ring-zinc-700" style={{ backgroundColor: c }} />
                        <span className="text-[10px] font-mono text-zinc-400 mt-1 block">{c}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Accent Colors */}
              {colors.accent && (
                <div className="rounded-lg bg-zinc-900 p-3">
                  <p className="text-[10px] text-zinc-400 uppercase tracking-wider mb-2">Accent</p>
                  <div className="flex gap-2 flex-wrap">
                    {(Array.isArray(colors.accent) ? colors.accent : [colors.accent]).map((c: string, i: number) => (
                      <div key={i} className="text-center">
                        <div className="h-12 w-12 rounded-lg ring-1 ring-zinc-700" style={{ backgroundColor: c }} />
                        <span className="text-[10px] font-mono text-zinc-400 mt-1 block">{c}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Text Colors */}
              {colors.text && typeof colors.text === 'object' && (
                <div className="rounded-lg bg-zinc-900 p-3">
                  <p className="text-[10px] text-zinc-400 uppercase tracking-wider mb-2">Text</p>
                  <div className="space-y-1.5">
                    {Object.entries(colors.text).map(([key, val]) => (
                      <ColorSwatch key={key} color={val as string} label={key} />
                    ))}
                  </div>
                </div>
              )}

              {/* Background Colors */}
              {colors.background && typeof colors.background === 'object' && (
                <div className="rounded-lg bg-zinc-900 p-3">
                  <p className="text-[10px] text-zinc-400 uppercase tracking-wider mb-2">Background</p>
                  <div className="space-y-1.5">
                    {Object.entries(colors.background).map(([key, val]) => (
                      <ColorSwatch key={key} color={val as string} label={key} />
                    ))}
                  </div>
                </div>
              )}

              {/* Border Color */}
              {colors.border && (
                <div className="rounded-lg bg-zinc-900 p-3">
                  <p className="text-[10px] text-zinc-400 uppercase tracking-wider mb-2">Border</p>
                  <ColorSwatch color={typeof colors.border === 'string' ? colors.border : colors.border.default || '#ccc'} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Typography */}
        {typography && Object.keys(typography).length > 0 && (
          <div>
            <h5 className="text-xs font-semibold text-white mb-3 uppercase tracking-wide">Typography</h5>
            <div className="space-y-3">
              {/* Font Families */}
              {typography.fontFamily && (
                <div className="rounded-lg bg-zinc-900 p-4">
                  <p className="text-[10px] text-zinc-400 uppercase tracking-wider mb-3">Font Families</p>
                  <div className="space-y-4">
                    {Object.entries(typography.fontFamily).map(([role, fontName]) => (
                      <div key={role}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] text-zinc-500 uppercase w-16">{role}</span>
                          <span className="text-xs text-emerald-400 font-mono">{fontName as string}</span>
                        </div>
                        <p
                          className="text-lg text-neutral-200"
                          style={{ fontFamily: `${fontName}, system-ui, sans-serif` }}
                        >
                          The quick brown fox jumps over the lazy dog
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Font Sizes */}
              {typography.fontSizes && (
                <div className="rounded-lg bg-zinc-900 p-4">
                  <p className="text-[10px] text-zinc-400 uppercase tracking-wider mb-3">Font Sizes</p>
                  <div className="space-y-2">
                    {Object.entries(typography.fontSizes).map(([level, size]) => (
                      <div key={level} className="flex items-baseline gap-3">
                        <span className="text-[10px] text-zinc-500 uppercase w-12 shrink-0">{level}</span>
                        <span
                          className="text-neutral-200"
                          style={{
                            fontSize: size as string,
                            fontFamily: typography.fontFamily?.primary
                              ? `${typography.fontFamily.primary}, system-ui`
                              : 'system-ui',
                          }}
                        >
                          Sample Text
                        </span>
                        <span className="text-[10px] font-mono text-zinc-500 ml-auto shrink-0">{size as string}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Font Weights */}
              {typography.fontWeights && (
                <div className="rounded-lg bg-zinc-900 p-4">
                  <p className="text-[10px] text-zinc-400 uppercase tracking-wider mb-3">Font Weights</p>
                  <div className="flex flex-wrap gap-4">
                    {Object.entries(typography.fontWeights).map(([name, weight]) => (
                      <div key={name} className="text-center">
                        <p
                          className="text-sm text-neutral-200"
                          style={{ fontWeight: weight as number }}
                        >
                          Aa
                        </p>
                        <span className="text-[10px] text-zinc-500">{name}</span>
                        <span className="text-[10px] font-mono text-zinc-600 block">{weight as number}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Line Heights */}
              {typography.lineHeights && (
                <div className="rounded-lg bg-zinc-900 p-4">
                  <p className="text-[10px] text-zinc-400 uppercase tracking-wider mb-3">Line Heights</p>
                  <div className="grid grid-cols-3 gap-3">
                    {Object.entries(typography.lineHeights).map(([name, lh]) => (
                      <div key={name} className="rounded-md bg-zinc-800 p-2">
                        <p className="text-[10px] text-zinc-500 uppercase mb-1">{name}</p>
                        <p
                          className="text-xs text-neutral-300"
                          style={{ lineHeight: lh as number }}
                        >
                          Line height example text that wraps to show spacing.
                        </p>
                        <span className="text-[10px] font-mono text-zinc-600">{lh as string}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Spacing */}
        {spacing && Object.keys(spacing).length > 0 && (
          <div>
            <h5 className="text-xs font-semibold text-white mb-3 uppercase tracking-wide">Spacing</h5>
            <div className="rounded-lg bg-zinc-900 p-4">
              <div className="space-y-2">
                {Object.entries(spacing).map(([name, value]) => (
                  <div key={name} className="flex items-center gap-3">
                    <span className="text-[10px] text-zinc-500 uppercase w-10 shrink-0">{name}</span>
                    <div className="flex items-center gap-2 flex-1">
                      <div
                        className="h-4 rounded bg-purple-500/40"
                        style={{ width: value as string }}
                      />
                      <span className="text-[10px] font-mono text-zinc-400">{value as string}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Border Radius */}
        {borderRadius && Object.keys(borderRadius).length > 0 && (
          <div>
            <h5 className="text-xs font-semibold text-white mb-3 uppercase tracking-wide">Border Radius</h5>
            <div className="rounded-lg bg-zinc-900 p-4">
              <div className="flex flex-wrap gap-4">
                {Object.entries(borderRadius).map(([name, value]) => (
                  <div key={name} className="text-center">
                    <div
                      className="h-14 w-14 bg-emerald-500/20 ring-1 ring-emerald-500/40 mx-auto"
                      style={{ borderRadius: value as string }}
                    />
                    <span className="text-[10px] text-zinc-500 block mt-1">{name}</span>
                    <span className="text-[10px] font-mono text-zinc-600">{value as string}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Shadows */}
        {shadows && Object.keys(shadows).length > 0 && (
          <div>
            <h5 className="text-xs font-semibold text-white mb-3 uppercase tracking-wide">Shadows</h5>
            <div className="rounded-lg bg-zinc-900 p-4">
              <div className="flex flex-wrap gap-6">
                {Object.entries(shadows).map(([name, value]) => (
                  <div key={name} className="text-center">
                    <div
                      className="h-16 w-24 rounded-lg bg-zinc-800"
                      style={{ boxShadow: value as string }}
                    />
                    <span className="text-[10px] text-zinc-500 block mt-2">{name}</span>
                    <span className="text-[10px] font-mono text-zinc-600 break-all max-w-[120px] block">{value as string}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* UI Patterns */}
        {uiPatterns && Object.keys(uiPatterns).length > 0 && (
          <div>
            <h5 className="text-xs font-semibold text-white mb-3 uppercase tracking-wide">UI Patterns</h5>
            <div className="rounded-lg bg-zinc-900 p-4 space-y-3">
              {Object.entries(uiPatterns).map(([name, value]) => (
                <div key={name}>
                  <p className="text-[10px] text-zinc-400 uppercase tracking-wider mb-1">{name}</p>
                  {typeof value === 'object' ? (
                    <div className="space-y-1">
                      {Object.entries(value as Record<string, string>).map(([subKey, subVal]) => (
                        <div key={subKey} className="flex items-center gap-2">
                          <span className="text-[10px] text-zinc-500 w-16">{subKey}</span>
                          <code className="text-[10px] font-mono text-emerald-400 bg-zinc-800 px-2 py-0.5 rounded">{subVal}</code>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <code className="text-[10px] font-mono text-emerald-400 bg-zinc-800 px-2 py-0.5 rounded">{value as string}</code>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ComponentsDisplay({ components }: { components: any[] }) {
  const typeColors: Record<string, string> = {
    layout: 'bg-blue-500/20 text-blue-400 ring-blue-500/30',
    section: 'bg-purple-500/20 text-purple-400 ring-purple-500/30',
    ui: 'bg-emerald-500/20 text-emerald-400 ring-emerald-500/30',
    form: 'bg-amber-500/20 text-amber-400 ring-amber-500/30',
  };

  return (
    <div className="rounded-lg border border-zinc-800 bg-black">
      <div className="border-b border-zinc-800 px-5 py-3 flex items-center justify-between">
        <h4 className="text-xs font-medium uppercase tracking-wider text-white flex items-center gap-2">
          <IoCube className="h-4 w-4 text-emerald-400" />
          Extracted Components
        </h4>
        <span className="text-[10px] text-zinc-500">{components.length} components</span>
      </div>

      <div className="p-4 space-y-3">
        {components.map((comp, index) => (
          <div key={index} className="rounded-lg bg-zinc-900 p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white font-mono">{comp.name}</span>
                <span className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded-full ring-1',
                  typeColors[comp.type] || 'bg-zinc-700/50 text-zinc-400 ring-zinc-600'
                )}>
                  {comp.type}
                </span>
              </div>
            </div>

            <p className="text-xs text-zinc-400 mb-3">{comp.description}</p>

            {/* Props */}
            {comp.props && comp.props.length > 0 && (
              <div className="mb-3">
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5">Props</p>
                <div className="flex flex-wrap gap-1.5">
                  {comp.props.map((prop: any, i: number) => (
                    <div key={i} className="flex items-center gap-1 bg-zinc-800 rounded px-2 py-1">
                      <span className="text-[10px] font-mono text-emerald-400">{prop.name}</span>
                      <span className="text-[10px] text-zinc-600">:</span>
                      <span className="text-[10px] font-mono text-zinc-500">{prop.type}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CSS Classes */}
            {comp.cssClasses && comp.cssClasses.length > 0 && (
              <div className="mb-3">
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5">CSS Classes</p>
                <div className="flex flex-wrap gap-1">
                  {comp.cssClasses.map((cls: string, i: number) => (
                    <code key={i} className="text-[10px] font-mono text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded">.{cls}</code>
                  ))}
                </div>
              </div>
            )}

            {/* Variations */}
            {comp.variations && comp.variations.length > 0 && (
              <div>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5">Variations</p>
                <div className="flex flex-wrap gap-1.5">
                  {comp.variations.map((v: string, i: number) => (
                    <span key={i} className="text-[10px] text-zinc-400 bg-zinc-800 rounded px-2 py-0.5">{v}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
