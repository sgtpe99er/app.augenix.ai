'use client';

import { Fragment, useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  IoGlobe,
  IoBusiness,
  IoColorPalette,
  IoCreate,
  IoCard,
  IoCloudUpload,
  IoDownload,
  IoEye,
  IoLink,
  IoCopy,
  IoCheckmark,
  IoKey,
  IoMail,
  IoChevronDown,
  IoServer,
  IoPencil,
  IoArrowForward,
  IoOpenOutline,
  IoRefresh,
  IoClose,
  IoPerson,
  IoText,
  IoImages,
  IoSparkles,
} from 'react-icons/io5';

import { toast } from '@/components/ui/use-toast';
import { DashboardShell } from '@/components/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/modal';
import { useAdminMobileMenu } from '@/app/admin/layout';
import { cn } from '@/utils/cn';
import type {
  Business,
  OnboardingResponse,
  BrandAsset,
  DomainRequest,
  GeneratedAsset,
  EditRequest,
  HostingPayment,
  DeployedWebsite,
  MigrationJob,
} from '@/types/database';
import { MigrationV2 } from './components/migration-v2';
import { AdminDiscoverTab } from './admin-discover-tab';
import {
  WebsiteGuideSidebar,
  WebsiteGuideMenuItem,
  WebsiteGuideContent,
  type WebsiteGuideSubTab,
} from '@/app/admin/tabs/website-guide/index';
import { GeneratedLogoReview } from '@/app/admin/tabs/branding-guide/sections/generated-logo-review';
import { LogoUploadsPanel } from './logo-uploads-panel';
import { InspirationSection } from '@/app/admin/tabs/branding-guide/sections/inspiration';
import { PalettePicker, CURATED_PALETTES, defaultAssignment } from '@/app/admin/tabs/branding-guide/sections/style-studio/index';
import type { BrandingGuideData } from '@/app/admin/tabs/branding-guide/types';
import { initialBrandingGuideData } from '@/app/admin/tabs/branding-guide/types';

function BreadcrumbUpdater({ name, status, section }: { name: string; status: string; section: string }) {
  useEffect(() => {
    const nameEl = document.getElementById('admin-breadcrumb-client');
    if (nameEl) nameEl.textContent = name;

    const contextEl = document.getElementById('admin-header-context');
    if (contextEl) contextEl.textContent = section;
    
    const statusEl = document.getElementById('admin-breadcrumb-status');
    if (statusEl) {
      const statusStyles: Record<string, string> = {
        pending: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400',
        in_progress: 'bg-blue-500/20 text-blue-700 dark:text-blue-400',
        completed: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400',
        generating: 'bg-purple-500/20 text-purple-700 dark:text-purple-400',
        active: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400',
        paid: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400',
        assets_generating: 'bg-purple-500/20 text-purple-700 dark:text-purple-400',
        assets_ready: 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-400',
        onboarding: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400',
        approved: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400',
        rejected: 'bg-red-500/20 text-red-700 dark:text-red-400',
        no_business: 'bg-zinc-500/20 text-zinc-600 dark:text-zinc-400',
      };
      const style = statusStyles[status] || 'bg-zinc-500/20 text-zinc-600 dark:text-zinc-400';
      const formattedStatus = status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      
      statusEl.className = `hidden rounded-full px-2 py-0.5 text-xs ml-2 lg:inline ${style}`;
      statusEl.textContent = formattedStatus;
    }
    return () => {
      if (contextEl) contextEl.textContent = '';
    };
  }, [name, status, section]);
  return null;
}

type CustomerInput = {
  id: string;
  user_id: string;
  business_id: string | null;
  input_type: 'file' | 'url';
  title: string | null;
  notes: string;
  source_url: string | null;
  storage_path?: string | null;
  storage_url: string | null;
  file_name: string | null;
  mime_type: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

interface CustomerDetailProps {
  data: {
    userId: string;
    email: string;
    business: Business | null;
    onboardingResponses: OnboardingResponse[];
    brandAssets: BrandAsset | null;
    domainRequests: DomainRequest[];
    generatedAssets: GeneratedAsset[];
    customerInputs: CustomerInput[];
    editRequests: EditRequest[];
    hostingPayments: HostingPayment[];
    deployedWebsite: DeployedWebsite | null;
    migrationJobs: MigrationJob[];
  };
  isAdmin: boolean;
}

type Tab =
  | 'overview'
  | 'uploaded_assets'
  | 'logos'
  | 'colors'
  | 'fonts'
  | 'inspiration'
  | 'discover'
  | 'edits'
  | 'payments'
  | 'migration'
  | 'website-guide';

export function CustomerDetail({
  data,
  isAdmin,
}: CustomerDetailProps) {
  const router = useRouter();
  const latestMigrationJob = data.migrationJobs[0] ?? null;
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [websiteGuideSubTab, setWebsiteGuideSubTab] = useState<WebsiteGuideSubTab>('overview');
  const tabs = [
    { id: 'overview' as Tab, label: 'Overview', icon: IoBusiness },
    { id: 'uploaded_assets' as Tab, label: 'Uploaded Assets', icon: IoCloudUpload },
    { id: 'logos' as Tab, label: 'Brand Assets', icon: IoImages },
    { id: 'colors' as Tab, label: 'Colors', icon: IoColorPalette },
    { id: 'fonts' as Tab, label: 'Fonts', icon: IoText },
    { id: 'inspiration' as Tab, label: 'Inspiration', icon: IoSparkles },
    { id: 'discover' as Tab, label: 'Discover', icon: IoGlobe },
    { id: 'edits' as Tab, label: 'Edit Requests', icon: IoCreate },
    { id: 'payments' as Tab, label: 'Payments', icon: IoCard },
    { id: 'migration' as Tab, label: 'WP Migration', icon: IoServer },
  ];

  // Website Guide sidebar takeover
  const isWebsiteGuideActive = activeTab === 'website-guide';
  const handleEnterWebsiteGuide = () => {
    setActiveTab('website-guide');
    setWebsiteGuideSubTab('overview');
  };
  const handleExitWebsiteGuide = () => {
    setActiveTab('overview');
  };
  const currentSectionLabel =
    activeTab === 'website-guide'
      ? 'Website Guide'
      : tabs.find((tab) => tab.id === activeTab)?.label ?? 'Overview';
  const [, startTransition] = useTransition();

  // Branding guide data for Inspiration and Colors tabs
  const [brandingData, setBrandingData] = useState<BrandingGuideData>(initialBrandingGuideData);
  const [brandingLoading, setBrandingLoading] = useState(false);
  const [brandingLoaded, setBrandingLoaded] = useState(false);

  const fetchBrandingData = useCallback(async () => {
    if (!data.business?.id) return;
    setBrandingLoading(true);
    try {
      const res = await fetch(`/api/admin/branding-guide/${data.business.id}`);
      if (res.ok) {
        const json = await res.json();
        setBrandingData({ ...initialBrandingGuideData, ...json.data });
      }
    } catch (error) {
      console.error('Failed to fetch branding guide:', error);
    } finally {
      setBrandingLoading(false);
      setBrandingLoaded(true);
    }
  }, [data.business?.id]);

  useEffect(() => {
    if ((activeTab === 'inspiration' || activeTab === 'colors') && !brandingLoaded && data.business?.id) {
      fetchBrandingData();
    }
  }, [activeTab, brandingLoaded, data.business?.id, fetchBrandingData]);

  const handleBrandingSave = useCallback(async (updates: Partial<BrandingGuideData>) => {
    if (!data.business?.id) return false;
    const res = await fetch(`/api/admin/branding-guide/${data.business.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) return false;
    setBrandingData((prev) => ({ ...prev, ...updates }));
    return true;
  }, [data.business?.id]);

  // Palette picker state for Colors tab
  const [selectedPaletteId, setSelectedPaletteId] = useState<string | null>(null);
  const [colorAssignment, setColorAssignment] = useState<import('@/app/admin/tabs/branding-guide/sections/style-studio/types').ColorAssignment | null>(null);

  const handlePaletteSelect = useCallback((id: string) => {
    setSelectedPaletteId(id);
    const palette = CURATED_PALETTES.find((p) => p.id === id);
    if (palette) setColorAssignment(defaultAssignment(palette));
  }, []);

  // Customer inputs (uploaded assets)
  const [newUploadNotes, setNewUploadNotes] = useState('');
  const [uploadingInput, setUploadingInput] = useState(false);
  const [deletingInputId, setDeletingInputId] = useState<string | null>(null);
  const [isDragOverInput, setIsDragOverInput] = useState(false);
  const customerInputFileRef = useRef<HTMLInputElement | null>(null);
  const [previewInput, setPreviewInput] = useState<CustomerInput | null>(null);
  const [previewNotes, setPreviewNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  const openPreview = (input: CustomerInput) => {
    setPreviewInput(input);
    setPreviewNotes(input.notes || '');
  };

  // Payment link modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // WP Migration state
  const [wpUrl, setWpUrl] = useState(latestMigrationJob?.target_url ?? '');
  const [wpUsername, setWpUsername] = useState(latestMigrationJob?.wp_admin_username ?? '');
  const [wpPassword, setWpPassword] = useState(latestMigrationJob?.wp_application_password ?? '');
  const [isTestingWp, setIsTestingWp] = useState(false);
  const [isStartingMigration, setIsStartingMigration] = useState(false);
  const [wpTestResult, setWpTestResult] = useState<{success: boolean, message: string} | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(latestMigrationJob?.id ?? null);
  const [selectedJob, setSelectedJob] = useState<MigrationJob | null>(latestMigrationJob);
  const [jobPages, setJobPages] = useState<any[]>([]);

  const [websiteNotesEdit, setWebsiteNotesEdit] = useState(false);
  const [websiteNotesDraft, setWebsiteNotesDraft] = useState((data.business as any)?.website_notes ?? '');
  const [savingWebsiteNotes, setSavingWebsiteNotes] = useState(false);

  // Onboarding edit state
  const [onboardingEditStep, setOnboardingEditStep] = useState<number | null>(null);
  const [onboardingDraft, setOnboardingDraft] = useState<Record<string, unknown>>({});
  const [savingOnboarding, setSavingOnboarding] = useState(false);

  useEffect(() => {
    if (websiteNotesEdit) return;
    setWebsiteNotesDraft((data.business as any)?.website_notes ?? '');
  }, [data.business, websiteNotesEdit]);

  const handleTestWpConnection = async () => {
    if (!wpUrl || !wpUsername || !wpPassword) {
      toast({
        title: 'Missing Fields',
        description: 'Please enter URL, Username, and Password to test the connection.',
        variant: 'destructive',
      });
      return;
    }

    setIsTestingWp(true);
    setWpTestResult(null);

    try {
      const response = await fetch('/api/admin/wp-migration/preflight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUrl: wpUrl,
          username: wpUsername,
          password: wpPassword
        })
      });

      const resultData = await response.json();

      if (response.ok) {
        setWpTestResult({
          success: true,
          message: `Connected successfully! Found user: ${resultData.user.name}`
        });
        toast({
          title: 'Connection Successful',
          description: 'WordPress REST API is accessible with these credentials.',
        });
      } else {
        setWpTestResult({
          success: false,
          message: resultData.error || 'Connection failed'
        });
        toast({
          title: 'Connection Failed',
          description: resultData.error || 'Failed to connect to WordPress REST API',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      setWpTestResult({
        success: false,
        message: error.message || 'An unexpected error occurred'
      });
      toast({
        title: 'Error',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsTestingWp(false);
    }
  };

  const getPreviewType = (input: CustomerInput): 'image' | 'pdf' | 'unknown' => {
    const mime = (input.mime_type || '').toLowerCase();
    if (mime.startsWith('image/')) return 'image';
    if (mime === 'application/pdf') return 'pdf';

    const name = (input.file_name || '').toLowerCase();
    if (name.endsWith('.pdf')) return 'pdf';
    if (name.match(/\.(png|jpe?g|webp|gif|bmp)$/)) return 'image';

    return 'unknown';
  };

  const fetchJobDetails = useCallback(async (jobId: string) => {
    try {
      const response = await fetch(`/api/admin/wp-migration/jobs/${jobId}`);
      const result = await response.json();
      if (!response.ok) return;
      if (result.job) setSelectedJob(result.job);
      if (result.pages) setJobPages(result.pages);
    } catch {
      // no-op for polling failures
    }
  }, []);

  // Fetch job details when switching to migration tab
  useEffect(() => {
    if (!selectedJobId || activeTab !== 'migration') return;
    fetchJobDetails(selectedJobId);
  }, [selectedJobId, activeTab, fetchJobDetails]);

  const handleStartMigration = async () => {
    if (!wpUrl || !wpUsername || !wpPassword) {
      toast({
        title: 'Missing Fields',
        description: 'Please enter URL, Username, and Password to start the migration.',
        variant: 'destructive',
      });
      return;
    }

    setIsStartingMigration(true);
    setWpTestResult(null);

    try {
      const response = await fetch('/api/admin/wp-migration/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUrl: wpUrl,
          username: wpUsername,
          password: wpPassword,
          customerId: data.userId
        })
      });

      const resultData = await response.json();

      if (response.ok) {
        setWpTestResult({
          success: true,
          message: resultData.message
        });
        toast({
          title: 'Migration Started',
          description: `Successfully queued ${resultData.totalPages} pages.`,
        });
        if (resultData.jobId) {
          setSelectedJobId(resultData.jobId);
        }
        startTransition(() => {
          router.refresh();
        });
      } else {
        setWpTestResult({
          success: false,
          message: resultData.error || 'Failed to start migration'
        });
        toast({
          title: 'Migration Failed',
          description: resultData.error || 'Failed to start migration',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      setWpTestResult({
        success: false,
        message: error.message || 'An unexpected error occurred'
      });
      toast({
        title: 'Error',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsStartingMigration(false);
    }
  };

  const [loadingPaymentLink, setLoadingPaymentLink] = useState(false);
  const [products, setProducts] = useState<{ id: string; name: string; prices: { id: string; unit_amount: number; currency: string; type: string; recurring: { interval: string } | null }[] }[]>([]);
  const [selectedPriceIds, setSelectedPriceIds] = useState<Set<string>>(new Set());
  const [paymentNote, setPaymentNote] = useState('');
  const [generatingLink, setGeneratingLink] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [sendingOnboardingLink, setSendingOnboardingLink] = useState(false);
  const [onboardingLinkSent, setOnboardingLinkSent] = useState(false);
  const [emailDropdownOpen, setEmailDropdownOpen] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSentKey, setEmailSentKey] = useState<string | null>(null);
  const emailDropdownRef = useRef<HTMLDivElement>(null);
  const [emailEdit, setEmailEdit] = useState(false);
  const [emailDraft, setEmailDraft] = useState(data.email);
  const [savingEmail, setSavingEmail] = useState(false);

  // Strip protocol/slashes so we always store bare hostname (e.g. "www.rhythmandbrew.coffee")
  const normalizeDomain = (value: string) =>
    value.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '').trim();

  // Website workflow state
  const [websiteEdit, setWebsiteEdit] = useState(false);
  const [wSubdomain, setWSubdomain] = useState(data.deployedWebsite?.subdomain ?? '');
  const [wCustomDomain, setWCustomDomain] = useState(data.deployedWebsite?.custom_domain ?? '');
  const [savingWebsite, setSavingWebsite] = useState(false);
  const [websiteSaved, setWebsiteSaved] = useState(false);
  const [retryingDomain, setRetryingDomain] = useState(false);
  const [isReprovisioning, setIsReprovisioning] = useState(false);

  async function handleReprovision() {
    const website = data.deployedWebsite;
    if (!website) return;
    setIsReprovisioning(true);
    try {
      const res = await fetch('/api/admin/reprovision-site', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ website_id: website.id }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to provision site');
      toast({ description: 'Site re-provisioned. Vercel is building now.' });
      startTransition(() => router.refresh());
    } catch (err: any) {
      toast({ variant: 'destructive', description: err.message });
    } finally {
      setIsReprovisioning(false);
    }
  }

  async function handleRetryDomain() {
    if (!data.business?.id) return;
    setRetryingDomain(true);
    try {
      const res = await fetch('/api/admin/retry-domain-purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: data.business.id }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to retry domain purchase');
      toast({ description: 'Domain purchase retried successfully.' });
      router.refresh();
    } catch (err: any) {
      toast({ variant: 'destructive', description: err.message });
    } finally {
      setRetryingDomain(false);
    }
  }

  const handleSaveWebsite = async (overrides?: Record<string, string>) => {
    setSavingWebsite(true);
    try {
      await fetch(`/api/admin/customers/${data.userId}/website`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subdomain: wSubdomain,
          custom_domain: normalizeDomain(wCustomDomain),
          ...overrides,
        }),
      });
      setWebsiteEdit(false);
      setWebsiteSaved(true);
      setTimeout(() => setWebsiteSaved(false), 3000);
      startTransition(() => router.refresh());
    } finally {
      setSavingWebsite(false);
    }
  };

  const handleApprovalStatus = async (approval_status: string) => {
    setSavingWebsite(true);
    try {
      await fetch(`/api/admin/customers/${data.userId}/website`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approval_status }),
      });
      startTransition(() => router.refresh());
    } finally {
      setSavingWebsite(false);
    }
  };

  const handleSendPasswordReset = async () => {
    setSendingReset(true);
    try {
      await fetch(`/api/admin/users/${data.userId}/reset-password`, { method: 'POST' });
      setResetSent(true);
      setTimeout(() => setResetSent(false), 4000);
    } finally {
      setSendingReset(false);
    }
  };

  const handleSendOnboardingLink = async () => {
    setSendingOnboardingLink(true);
    try {
      const res = await fetch(`/api/admin/users/${data.userId}/send-onboarding-link`, { method: 'POST' });
      if (res.ok) {
        setOnboardingLinkSent(true);
        setTimeout(() => setOnboardingLinkSent(false), 4000);
        toast({ description: 'Onboarding link sent successfully!' });
      } else {
        const json = await res.json().catch(() => ({}));
        toast({ variant: 'destructive', description: json.error || 'Failed to send onboarding link' });
      }
    } catch (err: any) {
      toast({ variant: 'destructive', description: err.message || 'Failed to send onboarding link' });
    } finally {
      setSendingOnboardingLink(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (emailDropdownRef.current && !emailDropdownRef.current.contains(e.target as Node)) {
        setEmailDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const EMAIL_OPTIONS = [
    { key: 'passwordReset', label: 'Send Password Reset' },
    { key: 'welcome', label: 'Welcome' },
    { key: 'paymentConfirmation', label: 'Payment Confirmation' },
    { key: 'assetsReady', label: 'Assets Ready' },
    { key: 'editRequestReceived', label: 'Edit Request Received' },
    { key: 'editRequestCompleted', label: 'Edit Request Completed' },
    { key: 'websiteLive', label: 'Website Live' },
    { key: 'onboardingInvite', label: 'Onboarding Invite' },
    { key: 'paymentConfirmedWithLink', label: 'Payment Confirmed (with Link)' },
  ];

  const handleSendEmail = async (key: string) => {
    setEmailDropdownOpen(false);
    setSendingEmail(true);
    try {
      let res: Response;
      if (key === 'passwordReset') {
        res = await fetch(`/api/admin/users/${data.userId}/reset-password`, { method: 'POST' });
      } else {
        res = await fetch(`/api/admin/users/${data.userId}/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ templateKey: key }),
        });
      }
      if (res.ok) {
        setEmailSentKey(key);
        setTimeout(() => setEmailSentKey(null), 4000);
        toast({ description: 'Email sent successfully!' });
      } else {
        const json = await res.json().catch(() => ({}));
        toast({ variant: 'destructive', description: json.error || 'Failed to send email' });
      }
    } catch (err: any) {
      toast({ variant: 'destructive', description: err.message || 'Failed to send email' });
    } finally {
      setSendingEmail(false);
    }
  };

  const handleViewAsUser = () => {
    window.open(`/admin/view-as/${data.userId}`, '_blank');
    toast({ description: 'Opened user dashboard in a new tab.' });
  };

  const handleSaveWebsiteNotes = async () => {
    if (!data.business) return;
    setSavingWebsiteNotes(true);
    try {
      const res = await fetch(`/api/admin/users/${data.userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ websiteNotes: websiteNotesDraft }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error || 'Failed to save notes');
      }
      setWebsiteNotesEdit(false);
      startTransition(() => router.refresh());
    } catch (err: any) {
      toast({ variant: 'destructive', description: err.message || 'Failed to save notes' });
    } finally {
      setSavingWebsiteNotes(false);
    }
  };

  const handleSaveEmail = async () => {
    if (!emailDraft.trim()) return;
    setSavingEmail(true);
    try {
      const res = await fetch(`/api/admin/users/${data.userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailDraft.trim() }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error || 'Failed to update email');
      }
      setEmailEdit(false);
      toast({ description: 'Email updated successfully' });
      startTransition(() => router.refresh());
    } catch (err: any) {
      toast({ variant: 'destructive', description: err.message || 'Failed to update email' });
    } finally {
      setSavingEmail(false);
    }
  };

  const handleEditOnboardingStep = (step: number, responses: Record<string, unknown>) => {
    setOnboardingEditStep(step);
    setOnboardingDraft({ ...responses });
  };

  const handleCancelOnboardingEdit = () => {
    setOnboardingEditStep(null);
    setOnboardingDraft({});
  };

  const handleSaveOnboarding = async () => {
    if (onboardingEditStep === null) return;
    setSavingOnboarding(true);
    try {
      const res = await fetch(`/api/admin/customers/${data.userId}/onboarding`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: onboardingEditStep, responses: onboardingDraft }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error || 'Failed to save onboarding');
      }
      toast({ description: 'Onboarding data saved successfully' });
      setOnboardingEditStep(null);
      setOnboardingDraft({});
      startTransition(() => router.refresh());
    } catch (err: any) {
      toast({ variant: 'destructive', description: err.message || 'Failed to save onboarding' });
    } finally {
      setSavingOnboarding(false);
    }
  };

  const updateOnboardingField = (field: string, value: unknown) => {
    setOnboardingDraft(prev => ({ ...prev, [field]: value }));
  };

  const getOnboardingStepData = (step: number): Record<string, unknown> => {
    const response = data.onboardingResponses.find(r => r.step === step);
    if (response?.responses) {
      return response.responses as Record<string, unknown>;
    }
    // Fall back to businesses table data if onboarding_responses don't exist
    if (step === 1 && data.business) {
      return {
        businessName: data.business.business_name ?? '',
        industry: data.business.industry ?? '',
        industryOther: '',
        locationCity: data.business.location_city ?? '',
        locationState: data.business.location_state ?? '',
        locationCountry: data.business.location_country ?? '',
      };
    }
    if (step === 3 && data.business) {
      return {
        targetAudience: data.business.target_audience ?? '',
        servicesProducts: data.business.services_products ?? '',
        websiteFeatures: data.business.website_features ?? [],
      };
    }
    if (step === 2 && data.brandAssets) {
      return {
        hasExistingWebsite: data.brandAssets.has_existing_website ?? false,
        existingWebsiteUrl: data.brandAssets.existing_website_url ?? '',
        hasExistingLogo: data.brandAssets.has_existing_logo ?? false,
        existingLogoUrl: data.brandAssets.existing_logo_url ?? '',
        hasBusinessCard: false,
        businessCardFrontUrl: '',
        businessCardBackUrl: '',
        hasFacebookPage: false,
        facebookPageUrl: '',
        stylePreference: '',
        hasBrandColors: data.brandAssets.has_brand_colors ?? false,
        brandColors: data.brandAssets.brand_colors ?? [],
        colorPreference: '',
        hasBrandFonts: false,
        brandFonts: [],
        fontPreference: '',
      };
    }
    return {};
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400',
      in_progress: 'bg-blue-500/20 text-blue-700 dark:text-blue-400',
      completed: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400',
      generating: 'bg-purple-500/20 text-purple-700 dark:text-purple-400',
      active: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400',
      paid: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400',
      assets_generating: 'bg-purple-500/20 text-purple-700 dark:text-purple-400',
      assets_ready: 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-400',
      approved: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400',
      onboarding: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400',
      ready: 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-400',
      rejected: 'bg-red-500/20 text-red-700 dark:text-red-400',
      no_business: 'bg-zinc-500/20 text-zinc-600 dark:text-zinc-400',
    };
    return styles[status] || 'bg-zinc-500/20 text-zinc-600 dark:text-zinc-400';
  };

  const formatStatus = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };


  const handleOpenPaymentModal = async () => {
    setShowPaymentModal(true);
    setGeneratedUrl('');
    setSelectedPriceIds(new Set());
    setPaymentNote('');
    if (products.length > 0) return;
    setLoadingProducts(true);
    try {
      const res = await fetch('/api/admin/stripe-products');
      const json = await res.json();
      setProducts(Array.isArray(json) ? json : []);
    } catch {
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  const togglePriceId = (id: string) => {
    setSelectedPriceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleGenerateLink = async () => {
    if (selectedPriceIds.size === 0) return;
    setGeneratingLink(true);
    try {
      const res = await fetch('/api/admin/payment-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: data.userId, stripePriceIds: Array.from(selectedPriceIds), note: paymentNote || null }),
      });
      const result = await res.json();
      if (res.ok) setGeneratedUrl(result.url);
    } finally {
      setGeneratingLink(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };


  const handleUploadCustomerInput = async (file: File) => {
    setUploadingInput(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('notes', newUploadNotes.trim());

      const res = await fetch(`/api/admin/customers/${data.userId}/inputs`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'Upload failed');
      }
      setNewUploadNotes('');
      startTransition(() => router.refresh());
    } catch (err: any) {
      toast({ variant: 'destructive', description: err.message || 'Upload failed' });
    } finally {
      setUploadingInput(false);
    }
  };

  const handleDeleteInput = async (inputId: string) => {
    setDeletingInputId(inputId);
    try {
      const res = await fetch(`/api/admin/customers/${data.userId}/inputs/${inputId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'Delete failed');
      }
      startTransition(() => router.refresh());
    } catch (err: any) {
      toast({ variant: 'destructive', description: err.message || 'Delete failed' });
    } finally {
      setDeletingInputId(null);
    }
  };

  // Register customer tabs in admin layout's mobile menu
  const adminMobileMenu = useAdminMobileMenu();
  const customerMenuContent = useMemo(() => (
    <nav className="flex flex-col gap-1">
      {isWebsiteGuideActive ? (
        <button
          onClick={() => { handleExitWebsiteGuide(); adminMobileMenu?.closeMobileMenu(); }}
          className="mb-2 flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-neutral-400 hover:bg-zinc-200 hover:text-black transition-colors dark:hover:bg-zinc-800 dark:hover:text-white"
        >
          <IoArrowForward className="h-4 w-4 rotate-180" />
          <span>Back to Customer</span>
        </button>
      ) : (
        tabs.map((tab) => (
          <Fragment key={tab.id}>
            <button
              onClick={() => { setActiveTab(tab.id); adminMobileMenu?.closeMobileMenu(); }}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'text-neutral-500 hover:bg-zinc-200 hover:text-black dark:text-neutral-400 dark:hover:bg-zinc-900 dark:hover:text-white'
              )}
            >
              <tab.icon className="h-4 w-4 shrink-0" />
              <span>{tab.label}</span>
            </button>
            {tab.id === 'overview' && data.business && (
              <button
                onClick={() => { handleEnterWebsiteGuide(); adminMobileMenu?.closeMobileMenu(); }}
                className={cn(
                  'flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors',
                  isWebsiteGuideActive
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'text-neutral-500 hover:bg-zinc-200 hover:text-black dark:text-neutral-400 dark:hover:bg-zinc-900 dark:hover:text-white'
                )}
              >
                <span className="flex items-center gap-3">
                  <IoGlobe className="h-4 w-4 shrink-0" />
                  <span>Website Guide</span>
                </span>
                <IoChevronDown className="h-4 w-4 -rotate-90" />
              </button>
            )}
          </Fragment>
        ))
      )}
    </nav>
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [activeTab, isWebsiteGuideActive, data.business]);

  useEffect(() => {
    adminMobileMenu?.setCustomerMenu(customerMenuContent);
    return () => { adminMobileMenu?.setCustomerMenu(null); };
  }, [adminMobileMenu, customerMenuContent]);

  return (
    <>
      <BreadcrumbUpdater
        name={data.business?.business_name ?? data.email}
        status={data.business?.status ?? 'no_business'}
        section={currentSectionLabel}
      />
      <DashboardShell
        sidebar={
          isWebsiteGuideActive ? (
            <WebsiteGuideSidebar
              activeSubTab={websiteGuideSubTab}
              onSubTabChange={setWebsiteGuideSubTab}
              onBack={handleExitWebsiteGuide}
            />
          ) : (
            <nav className="flex flex-col gap-1">
              {tabs.map((tab) => (
                <Fragment key={tab.id}>
                  <button
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors',
                      activeTab === tab.id
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'text-neutral-500 hover:bg-zinc-200 hover:text-black dark:text-neutral-400 dark:hover:bg-zinc-900 dark:hover:text-white'
                    )}
                  >
                    <tab.icon className="h-4 w-4 shrink-0" />
                    <span>{tab.label}</span>
                  </button>
                  {tab.id === 'overview' && data.business && (
                    <WebsiteGuideMenuItem
                      onClick={handleEnterWebsiteGuide}
                      isActive={isWebsiteGuideActive}
                    />
                  )}
                </Fragment>
              ))}
            </nav>
          )
        }
      >
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div>
                <p className="text-sm text-neutral-400">Generated Assets</p>
                <p className="text-2xl font-bold">{data.generatedAssets.length}</p>
              </div>
              <div>
                <p className="text-sm text-neutral-400">Edit Requests</p>
                <p className="text-2xl font-bold">{data.editRequests.length}</p>
              </div>
              <div>
                <p className="text-sm text-neutral-400">Payments</p>
                <p className="text-2xl font-bold">{data.hostingPayments.length}</p>
              </div>
              <div>
                <p className="text-sm text-neutral-400">Website Guide</p>
                <p className="text-2xl font-bold">
                  {(data.business as any)?.website_guide_approved_at ? 'Approved' : 'Not Approved'}
                </p>
                <p className="mt-1 text-xs text-neutral-400">
                  {(data.business as any)?.website_guide_approved_at
                    ? new Date((data.business as any).website_guide_approved_at).toLocaleString([], {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })
                    : 'Awaiting approval'}
                </p>
              </div>
            </div>

            {/* User Card */}
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  <IoPerson className="h-5 w-5 text-purple-400" />
                  User
                </h3>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-2">
                    {/* Send Email dropdown */}
                    <div className="relative" ref={emailDropdownRef}>
                      <Button
                        onClick={() => setEmailDropdownOpen((v) => !v)}
                        disabled={sendingEmail}
                        variant="outline"
                        size="sm"
                      >
                        {emailSentKey
                          ? <><IoCheckmark className="mr-2 h-4 w-4 text-emerald-400" />Email Sent!</>
                          : <><IoMail className="mr-2 h-4 w-4" />{sendingEmail ? 'Sending...' : 'Send Email'}<IoChevronDown className="ml-1 h-3 w-3" /></>}
                      </Button>
                      {emailDropdownOpen && (
                        <div className="absolute right-0 top-full z-20 mt-1 w-56 overflow-hidden rounded-lg bg-zinc-800 shadow-xl ring-1 ring-zinc-700">
                          {EMAIL_OPTIONS.map(({ key, label }) => (
                            <button
                              key={key}
                              type="button"
                              onClick={() => handleSendEmail(key)}
                              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-neutral-200 hover:bg-zinc-700 hover:text-white transition-colors"
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!emailEdit) {
                          setEmailDraft(data.email);
                        }
                        setEmailEdit((v) => !v);
                      }}
                      className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-neutral-400 hover:bg-zinc-800 hover:text-white transition-colors"
                    >
                      <IoPencil className="h-3.5 w-3.5" />
                      {emailEdit ? 'Cancel' : 'Edit'}
                    </button>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-neutral-400 mb-1">Email</p>
                  {emailEdit ? (
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={emailDraft}
                        onChange={(e) => setEmailDraft(e.target.value)}
                        className="flex-1 rounded-lg bg-zinc-800 px-3 py-2 text-sm text-white outline-none ring-1 ring-zinc-700 focus:ring-1 focus:ring-zinc-500"
                        disabled={savingEmail}
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleSaveEmail}
                        disabled={savingEmail || !emailDraft.trim()}
                        variant="emerald"
                      >
                        {savingEmail ? 'Saving…' : 'Save'}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{data.email}</p>
                      <button
                        type="button"
                        onClick={handleViewAsUser}
                        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs text-neutral-400 hover:bg-zinc-800 hover:text-white transition-colors"
                        title="Opens the user's dashboard in a new tab"
                      >
                        <IoEye className="h-3.5 w-3.5" />
                        View as User
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  <IoServer className="h-5 w-5 text-emerald-400" />
                  Website
                </h3>
                <div className="flex items-center gap-2">
                  {websiteSaved && (
                    <span className="flex items-center gap-1 text-xs text-emerald-400">
                      <IoCheckmark className="h-3.5 w-3.5" />Saved
                    </span>
                  )}
                  <button
                    onClick={() => setWebsiteEdit((v) => !v)}
                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-neutral-400 hover:bg-zinc-800 hover:text-white transition-colors"
                  >
                    <IoPencil className="h-3.5 w-3.5" />
                    {websiteEdit ? 'Cancel' : 'Edit'}
                  </button>
                </div>
              </div>

              {data.deployedWebsite && (
                <div className="mb-4 flex items-center gap-1 overflow-x-auto">
                  {(['pending', 'dev_published', 'approved', 'prod_published'] as const).map((step, i, arr) => {
                    const labels: Record<string, string> = {
                      pending: 'Pending',
                      dev_published: 'Dev Published',
                      approved: 'Approved',
                      prod_published: 'Live on Prod',
                    };
                    const current = data.deployedWebsite!.approval_status ?? 'pending';
                    const stepIdx = arr.indexOf(step);
                    const currentIdx = arr.indexOf(current as typeof step);
                    const isDone = stepIdx <= currentIdx;
                    return (
                      <div key={step} className="flex items-center gap-1">
                        <span className={cn(
                          'whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium',
                          isDone ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-neutral-500'
                        )}>
                          {labels[step]}
                        </span>
                        {i < arr.length - 1 && <IoArrowForward className="h-3 w-3 shrink-0 text-neutral-600" />}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="space-y-3">
                <div className="rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-800">
                  <p className="mb-1 text-xs text-neutral-400">Dev Site (subdomain)</p>
                  {websiteEdit ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={wSubdomain}
                        onChange={(e) => setWSubdomain(e.target.value)}
                        placeholder="yoursite-xxxx"
                        className="flex-1 rounded bg-zinc-700 px-2 py-1 text-sm text-white outline-none focus:ring-1 focus:ring-zinc-500"
                      />
                      <span className="shrink-0 text-xs text-neutral-500">.freewebsite.deal</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-emerald-400">
                        {data.deployedWebsite?.subdomain
                          ? `https://${data.deployedWebsite.subdomain}.freewebsite.deal`
                          : <span className="text-neutral-500">Not set</span>}
                      </span>
                      {data.deployedWebsite?.subdomain && (
                        <a href={`https://${data.deployedWebsite.subdomain}.freewebsite.deal`} target="_blank" rel="noopener noreferrer"
                          className="shrink-0 text-neutral-400 hover:text-white">
                          <IoOpenOutline className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  )}
                </div>

                <div className="rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-800">
                  <p className="mb-1 text-xs text-neutral-400">Production / Custom Domain</p>
                  {websiteEdit ? (
                    <input
                      type="text"
                      value={wCustomDomain}
                      onChange={(e) => setWCustomDomain(e.target.value)}
                      placeholder="e.g. mybusiness.com"
                      className="w-full rounded bg-zinc-700 px-2 py-1 text-sm text-white outline-none focus:ring-1 focus:ring-zinc-500"
                    />
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">
                        {data.deployedWebsite?.custom_domain || <span className="text-neutral-500">Not set — customer can enter this in their dashboard</span>}
                      </span>
                      {data.deployedWebsite?.custom_domain && (() => {
                        const cleanDomain = data.deployedWebsite!.custom_domain!.replace(/^https?:\/\//i, '').replace(/\/+$/, '');
                        return (
                          <a href={`https://${cleanDomain}`} target="_blank" rel="noopener noreferrer"
                            className="shrink-0 text-neutral-400 hover:text-white">
                            <IoOpenOutline className="h-4 w-4" />
                          </a>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {websiteEdit ? (
                  <Button
                    onClick={() => handleSaveWebsite()}
                    disabled={savingWebsite}
                    variant="emerald"
                    size="sm"
                  >
                    <IoCheckmark className="mr-1.5 h-4 w-4" />
                    {savingWebsite ? 'Saving…' : 'Save Changes'}
                  </Button>
                ) : (
                  <>
                    {data.deployedWebsite && !data.deployedWebsite.vercel_project_id && (
                      <Button size="sm" variant="outline"
                        className="border-orange-500/40 text-orange-400 hover:bg-orange-500/10"
                        onClick={handleReprovision}
                        disabled={isReprovisioning}>
                        <IoRefresh className={cn('mr-1.5 h-4 w-4', isReprovisioning && 'animate-spin')} />
                        {isReprovisioning ? 'Provisioning…' : 'Re-provision Site'}
                      </Button>
                    )}
                    {data.deployedWebsite?.approval_status === 'pending' && data.deployedWebsite?.vercel_project_id && (
                      <Button size="sm" variant="outline"
                        onClick={() => handleApprovalStatus('dev_published')}
                        disabled={savingWebsite}>
                        Mark Dev Published
                      </Button>
                    )}
                    {data.deployedWebsite?.approval_status === 'dev_published' && (
                      <Button size="sm" variant="outline"
                        onClick={() => handleApprovalStatus('approved')}
                        disabled={savingWebsite}>
                        <IoCheckmark className="mr-1.5 h-4 w-4 text-emerald-400" />
                        Mark Approved
                      </Button>
                    )}
                    {data.deployedWebsite?.approval_status === 'approved' && (
                      <Button size="sm"
                        variant="emerald"
                        onClick={() => handleApprovalStatus('prod_published')}
                        disabled={savingWebsite || !data.deployedWebsite?.custom_domain}>
                        <IoArrowForward className="mr-1.5 h-4 w-4" />
                        Push to Production
                      </Button>
                    )}
                    {data.deployedWebsite?.approval_status === 'prod_published' && (
                      <Button size="sm" variant="outline"
                        onClick={() => handleApprovalStatus('dev_published')}
                        disabled={savingWebsite}>
                        New Change — Back to Dev
                      </Button>
                    )}
                    {!data.deployedWebsite && (
                      <p className="text-sm text-neutral-500">No website record yet — will be created automatically on next user creation.</p>
                    )}
                  </>
                )}
              </div>
            </div>

            <div>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  <IoCreate className="h-5 w-5 text-emerald-400" />
                  Website Notes
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!data.business) return;
                      if (!websiteNotesEdit) {
                        setWebsiteNotesDraft((data.business as any)?.website_notes ?? '');
                      }
                      setWebsiteNotesEdit((v) => !v);
                    }}
                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-neutral-400 hover:bg-zinc-800 hover:text-white transition-colors"
                    disabled={!data.business}
                  >
                    <IoPencil className="h-3.5 w-3.5" />
                    {websiteNotesEdit ? 'Cancel' : 'Edit'}
                  </button>
                </div>
              </div>

              {!data.business ? (
                <p className="text-sm text-neutral-500">No business record — admin or unregistered user.</p>
              ) : (
                <div className="space-y-3">
                  {websiteNotesEdit ? (
                    <textarea
                      value={websiteNotesDraft}
                      onChange={(e) => setWebsiteNotesDraft(e.target.value)}
                      placeholder="Add general notes from the customer about what they want in their website..."
                      className="min-h-[140px] w-full rounded-lg bg-zinc-800 px-3 py-2 text-sm text-white outline-none ring-1 ring-zinc-700 focus:ring-1 focus:ring-zinc-500 placeholder:text-neutral-500"
                      disabled={savingWebsiteNotes}
                    />
                  ) : (
                    <p className="whitespace-pre-wrap text-sm text-neutral-300">
                      {(data.business as any)?.website_notes?.trim()
                        ? (data.business as any).website_notes
                        : '—'}
                    </p>
                  )}

                  {websiteNotesEdit && (
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setWebsiteNotesDraft((data.business as any)?.website_notes ?? '');
                          setWebsiteNotesEdit(false);
                        }}
                        disabled={savingWebsiteNotes}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleSaveWebsiteNotes}
                        disabled={savingWebsiteNotes}
                        variant="emerald"
                      >
                        {savingWebsiteNotes ? 'Saving…' : 'Save'}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Payment Link Modal */}
            {showPaymentModal && (
              <Modal onClose={() => setShowPaymentModal(false)}>
                <ModalHeader
                  title="Send Payment Link"
                  subtitle={data.business?.business_name ?? data.email}
                  onClose={() => setShowPaymentModal(false)}
                />

                {!generatedUrl ? (
                  <>
                    <ModalBody className="space-y-4">
                      {/* Price checkboxes */}
                      <div>
                        <p className="mb-2 text-sm text-neutral-400">Select options to offer the customer</p>
                        {loadingProducts ? (
                          <p className="text-sm text-neutral-500">Loading products…</p>
                        ) : products.length === 0 ? (
                          <p className="text-sm text-neutral-500">No products found in Stripe.</p>
                        ) : (
                          <div className="space-y-2">
                            {products.map((product) =>
                              product.prices.map((price) => {
                                const checked = selectedPriceIds.has(price.id);
                                const label = `${new Intl.NumberFormat('en-US', { style: 'currency', currency: price.currency.toUpperCase(), minimumFractionDigits: 0 }).format((price.unit_amount ?? 0) / 100)}${price.type === 'recurring' && price.recurring ? ` / ${price.recurring.interval}` : ' one-time'}`;
                                return (
                                  <label
                                    key={price.id}
                                    className={cn(
                                      'flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-colors',
                                      checked
                                        ? 'border-emerald-500/50 bg-emerald-500/10'
                                        : 'border-zinc-700 bg-zinc-800 hover:border-zinc-600'
                                    )}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => togglePriceId(price.id)}
                                      className="h-4 w-4 accent-emerald-500"
                                    />
                                    <div className="min-w-0 flex-1">
                                      <p className="text-sm font-medium">{product.name}</p>
                                      <p className="text-xs text-neutral-400">{label}</p>
                                    </div>
                                    {checked && <IoCheckmark className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />}
                                  </label>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>

                      {/* Note */}
                      <div>
                        <label htmlFor="payment-note" className="mb-1.5 block text-sm text-neutral-400">
                          Note <span className="text-neutral-600">(optional — shown to customer)</span>
                        </label>
                        <input
                          id="payment-note"
                          type="text"
                          value={paymentNote}
                          onChange={(e) => setPaymentNote(e.target.value)}
                          placeholder="e.g. 6-month hosting package for your business"
                          className="w-full rounded-lg bg-zinc-800 px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-zinc-600 placeholder:text-neutral-600"
                        />
                      </div>
                    </ModalBody>

                    <ModalFooter>
                      <Button type="button" variant="outline" onClick={() => setShowPaymentModal(false)}>
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        onClick={handleGenerateLink}
                        disabled={selectedPriceIds.size === 0 || generatingLink}
                        variant="emerald"
                      >
                        {generatingLink
                          ? 'Generating…'
                          : `Generate Link${selectedPriceIds.size > 1 ? ` (${selectedPriceIds.size})` : ''}`}
                      </Button>
                    </ModalFooter>
                  </>
                ) : (
                  <>
                    <ModalBody className="space-y-4">
                      <div className="rounded-lg bg-emerald-500/10 p-4 text-center">
                        <IoCheckmark className="mx-auto mb-2 h-8 w-8 text-emerald-400" aria-hidden="true" />
                        <p className="font-semibold text-emerald-400">Payment link created!</p>
                        <p className="mt-1 text-xs text-neutral-400">Valid for 30 days</p>
                      </div>
                      <div className="flex items-center gap-2 rounded-lg bg-zinc-800 px-3 py-2">
                        <p className="flex-1 truncate text-sm text-neutral-300">{generatedUrl}</p>
                        <button onClick={handleCopy} className="shrink-0 text-neutral-400 hover:text-white" aria-label="Copy link">
                          {copied
                            ? <IoCheckmark className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                            : <IoCopy className="h-4 w-4" aria-hidden="true" />}
                        </button>
                      </div>
                    </ModalBody>

                    <ModalFooter>
                      <Button type="button" variant="outline" onClick={() => setShowPaymentModal(false)}>
                        Close
                      </Button>
                      <Button
                        type="button"
                        onClick={handleCopy}
                        variant="emerald"
                      >
                        {copied ? 'Copied!' : 'Copy Link'}
                      </Button>
                    </ModalFooter>
                  </>
                )}
              </Modal>
            )}
          </div>
        )}

        {/* Uploaded Assets Tab */}
        {activeTab === 'uploaded_assets' && (
          <div className="space-y-6">
            <div>
              <h3 className="mb-4 font-semibold">Add Images or PDFs</h3>

              <div>
                <p className="mb-2 text-sm font-medium">Upload Images or PDF</p>
                <div className="space-y-3">
                  <textarea
                    value={newUploadNotes}
                    onChange={(e) => setNewUploadNotes(e.target.value)}
                    placeholder="Notes (how should we use this?)"
                    className="min-h-[90px] w-full rounded-lg bg-zinc-700 px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-zinc-500 placeholder:text-neutral-400"
                    disabled={uploadingInput}
                  />
                  <input
                    ref={customerInputFileRef}
                    type="file"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadCustomerInput(file);
                      e.currentTarget.value = '';
                    }}
                    disabled={uploadingInput}
                    className="hidden"
                  />

                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => customerInputFileRef.current?.click()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        customerInputFileRef.current?.click();
                      }
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (!uploadingInput) setIsDragOverInput(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      setIsDragOverInput(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragOverInput(false);
                      if (uploadingInput) return;
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleUploadCustomerInput(file);
                    }}
                    aria-disabled={uploadingInput}
                    className={
                      `flex min-h-[92px] w-full flex-col items-center justify-center rounded-lg border border-dashed px-4 py-4 text-sm transition-colors ` +
                      (uploadingInput
                        ? 'cursor-not-allowed border-zinc-700 bg-zinc-900/40 text-neutral-500'
                        : isDragOverInput
                          ? 'cursor-pointer border-emerald-500 bg-emerald-500/10 text-emerald-200'
                          : 'cursor-pointer border-zinc-700 bg-zinc-900/40 text-neutral-300 hover:border-zinc-600')
                    }
                  >
                    <div className="font-medium">
                      {uploadingInput ? 'Uploading…' : 'Drag a file here, or click to upload'}
                    </div>
                    <div className="mt-1 text-xs text-neutral-400">
                      PNG, JPG, WEBP, PDF (max 50MB)
                    </div>
                  </div>
                  {uploadingInput && (
                    <p className="text-xs text-neutral-400">Uploading…</p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <h3 className="mb-4 font-semibold">Uploads</h3>
              {data.customerInputs.length === 0 ? (
                <p className="text-sm text-neutral-400">No uploaded inputs yet.</p>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                    {data.customerInputs
                      .filter((input) => input.input_type === 'file' && !!input.storage_url)
                      .map((input) => (
                        <div
                          key={input.id}
                          className="group relative overflow-hidden rounded-xl bg-zinc-800 ring-1 ring-zinc-700"
                        >
                          <button
                            type="button"
                            onClick={() => openPreview(input)}
                            className="block w-full"
                          >
                            <div className="flex aspect-[4/3] w-full items-center justify-center bg-black/40">
                              {getPreviewType(input) === 'image' ? (
                                <img
                                  src={input.storage_url as string}
                                  alt={input.file_name || 'Preview'}
                                  className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                                />
                              ) : getPreviewType(input) === 'pdf' ? (
                                <div className="text-center text-xs font-medium text-neutral-200">PDF</div>
                              ) : (
                                <div className="text-center text-xs font-medium text-neutral-200">FILE</div>
                              )}
                            </div>

                            <div className="space-y-1 p-3 text-left">
                              <div className="truncate text-sm font-medium text-white">
                                {input.file_name || 'File'}
                              </div>

                              {input.notes ? (
                                <div
                                  className="line-clamp-2 text-xs text-neutral-300"
                                  title={input.notes}
                                >
                                  {input.notes}
                                </div>
                              ) : (
                                <div className="text-xs text-neutral-500">No notes</div>
                              )}
                            </div>
                          </button>

                          <div className="absolute right-2 top-2 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-2"
                              onClick={() => openPreview(input)}
                            >
                              <IoEye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-2 border-red-500/30 text-red-400 hover:bg-red-500/10"
                              onClick={() => handleDeleteInput(input.id)}
                              disabled={deletingInputId === input.id}
                            >
                              {deletingInputId === input.id ? '…' : 'Del'}
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>

                  {data.customerInputs.some((input) => input.input_type === 'url' && !!input.source_url) && (
                    <div>
                      <h4 className="mb-3 text-sm font-medium text-neutral-200">URLs</h4>
                      <div className="space-y-2">
                        {data.customerInputs
                          .filter((input) => input.input_type === 'url' && !!input.source_url)
                          .map((input) => (
                            <div
                              key={input.id}
                              className="flex items-start justify-between gap-3 rounded-lg bg-zinc-900/40 p-3 ring-1 ring-zinc-700"
                            >
                              <div className="min-w-0">
                                <a
                                  href={input.source_url as string}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block truncate text-sm text-emerald-400 hover:underline"
                                >
                                  {input.source_url}
                                </a>
                                {input.notes ? (
                                  <div className="mt-1 line-clamp-2 text-xs text-neutral-300" title={input.notes}>
                                    {input.notes}
                                  </div>
                                ) : (
                                  <div className="mt-1 text-xs text-neutral-500">No notes</div>
                                )}
                              </div>
                              <div className="shrink-0 flex items-center gap-2">
                                <Button variant="outline" size="sm" asChild>
                                  <a href={input.source_url as string} target="_blank" rel="noopener noreferrer">
                                    <IoOpenOutline className="mr-1 h-3 w-3" />
                                    Open
                                  </a>
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                                  onClick={() => handleDeleteInput(input.id)}
                                  disabled={deletingInputId === input.id}
                                >
                                  {deletingInputId === input.id ? 'Deleting…' : 'Delete'}
                                </Button>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {previewInput && previewInput.storage_url && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                onClick={(e) => { if (e.target === e.currentTarget) setPreviewInput(null); }}
              >
                <div className="pointer-events-auto relative w-full max-w-2xl rounded-xl bg-zinc-900 shadow-2xl ring-1 ring-zinc-700">
                  <div className="flex items-center justify-between px-6 pt-5 pb-3">
                    <div>
                      <h2 className="text-lg font-bold">{previewInput.file_name || 'Preview'}</h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPreviewInput(null)}
                      className="rounded-lg p-1.5 text-neutral-400 hover:bg-zinc-800 hover:text-white"
                    >
                      <IoClose className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="px-6 pb-4">
                    {getPreviewType(previewInput) === 'image' && (
                      <img
                        src={previewInput.storage_url}
                        alt={previewInput.file_name || 'Preview'}
                        className="max-h-[50vh] w-full rounded-lg object-contain"
                      />
                    )}

                    {getPreviewType(previewInput) === 'pdf' && (
                      <div className="h-[50vh] w-full overflow-hidden rounded-lg">
                        <iframe
                          src={previewInput.storage_url}
                          title={previewInput.file_name || 'PDF Preview'}
                          className="h-full w-full"
                        />
                      </div>
                    )}

                    {getPreviewType(previewInput) === 'unknown' && (
                      <div className="text-sm text-neutral-400">
                        Preview not available for this file type.
                        <div className="mt-3">
                          <Button variant="outline" size="sm" asChild>
                            <a href={previewInput.storage_url} target="_blank" rel="noopener noreferrer">
                              <IoOpenOutline className="mr-2 h-4 w-4" />
                              Open in new tab
                            </a>
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="mt-4">
                      <label className="mb-1 block text-sm text-neutral-400">Notes</label>
                      <textarea
                        value={previewNotes}
                        onChange={(e) => setPreviewNotes(e.target.value)}
                        rows={2}
                        placeholder="Add notes about this file…"
                        className="w-full rounded-lg border border-zinc-200 bg-transparent px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-zinc-800"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 border-t border-zinc-800 px-6 py-4">
                    <Button type="button" variant="outline" onClick={() => setPreviewInput(null)}>
                      Close
                    </Button>
                    <Button
                      type="button"
                      disabled={savingNotes || previewNotes === (previewInput.notes || '')}
                      variant="emerald"
                      onClick={async () => {
                        setSavingNotes(true);
                        try {
                          const res = await fetch(`/api/admin/customers/${data.userId}/inputs/${previewInput.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ notes: previewNotes }),
                          });
                          if (!res.ok) throw new Error('Failed to save');
                          toast({ description: 'Notes saved' });
                          setPreviewInput(null);
                          startTransition(() => router.refresh());
                        } catch {
                          toast({ variant: 'destructive', description: 'Failed to save notes' });
                        } finally {
                          setSavingNotes(false);
                        }
                      }}
                    >
                      {savingNotes ? 'Saving…' : 'Save Notes'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Logos Tab */}
        {activeTab === 'logos' && data.business && (
          <div className="space-y-8">
            <LogoUploadsPanel customerId={data.userId} />
            <GeneratedLogoReview businessId={data.business.id} />
          </div>
        )}

        {/* Colors Tab */}
        {activeTab === 'colors' && (() => {
          const colorAssets = data.generatedAssets.filter((a) => a.asset_type === 'color_palette' || a.asset_type === 'branding_colors');
          const colorAsset = colorAssets[0] ?? null;
          const colors: Array<{ name?: string; hex?: string; usage?: string; role?: string; value?: string }> =
            (colorAsset?.metadata as any)?.colors ??
            (colorAsset?.metadata as any)?.palette ??
            [];

          // Fallback: pull from brand_assets if generated_assets has no color data
          const brandColorsFallback: string[] = (data.brandAssets as any)?.brand_colors ?? [];
          const hasFallbackColors = colors.length === 0 && brandColorsFallback.length > 0;
          const displayColors = colors.length > 0 ? colors : brandColorsFallback.map((hex, i) => ({
            hex,
            name: i === 0 ? 'Primary' : i === 1 ? 'Secondary' : i === 2 ? 'Accent' : `Color ${i + 1}`,
            usage: '',
          }));

          return (
            <div className="space-y-6">
              <PalettePicker
                allPalettes={CURATED_PALETTES}
                selectedPaletteId={selectedPaletteId}
                colorAssignment={colorAssignment}
                onPaletteSelect={handlePaletteSelect}
                onAssignmentChange={setColorAssignment}
              />
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-semibold flex items-center gap-2">
                    <IoColorPalette className="h-5 w-5 text-emerald-400" />
                    Brand Colors
                  </h3>
                  {colorAsset && (
                    <span className={cn('rounded-full px-2 py-0.5 text-xs', getStatusBadge(colorAsset.status))}>
                      {formatStatus(colorAsset.status)}
                    </span>
                  )}
                </div>
                {displayColors.length > 0 ? (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {displayColors.map((color, i) => {
                      const hex = color.hex ?? (color as any).value ?? '';
                      const label = color.name ?? (color as any).role ?? color.usage ?? `Color ${i + 1}`;
                      const usage = color.usage ?? (color as any).role ?? '';
                      return (
                        <div key={i} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                          <div
                            className="mb-3 h-24 w-full rounded-lg border border-zinc-700"
                            style={{ backgroundColor: hex || '#3f3f46' }}
                          />
                          <p className="font-medium text-sm">{label}</p>
                          {hex && (
                            <p className="text-xs text-neutral-400 font-mono mt-0.5">{hex.toUpperCase()}</p>
                          )}
                          {usage && usage !== label && (
                            <p className="mt-1 text-xs capitalize text-neutral-500">{usage}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : colorAsset?.storage_url ? (
                  <div className="space-y-3">
                    <img
                      src={colorAsset.storage_url}
                      alt="Color Palette"
                      className="w-full rounded-lg object-contain"
                    />
                    <Button variant="outline" size="sm" asChild>
                      <a href={colorAsset.storage_url} download>
                        <IoDownload className="mr-1 h-3 w-3" />
                        Download Palette
                      </a>
                    </Button>
                  </div>
                ) : (
                  <p className="text-neutral-400">No color palette generated yet.</p>
                )}
                {hasFallbackColors && (
                  <p className="mt-3 text-xs text-neutral-500">Colors sourced from brand assets</p>
                )}
              </div>
            </div>
          );
        })()}

        {/* Fonts Tab */}
        {activeTab === 'fonts' && (() => {
          const fontAssets = data.generatedAssets.filter((a) => a.asset_type === 'font_selection' || a.asset_type === 'branding_fonts');
          const fontAsset = fontAssets[0] ?? null;
          const fonts: Array<{ family?: string; name?: string; weight?: string | number; role?: string; size?: string; usage?: string }> =
            (fontAsset?.metadata as any)?.fonts ??
            (fontAsset?.metadata as any)?.selections ??
            [];

          // Fallback: pull from brand_assets if generated_assets has no font data
          const brandFontsFallback: string[] = (data.brandAssets as any)?.brand_fonts ?? [];
          const hasFallbackFonts = fonts.length === 0 && brandFontsFallback.length > 0;
          const displayFonts: Array<{ family?: string; name?: string; weight?: string | number; role?: string; size?: string; usage?: string }> = fonts.length > 0 ? fonts : brandFontsFallback.map((name, i) => ({
            family: name,
            name,
            role: i === 0 ? 'Headings' : i === 1 ? 'Body Text' : `Font ${i + 1}`,
          }));

          // Load Google Fonts for preview
          const fontFamilies = displayFonts.map(f => f.family ?? f.name ?? '').filter(Boolean);
          const googleFontsUrl = fontFamilies.length > 0
            ? `https://fonts.googleapis.com/css2?${fontFamilies.map(f => `family=${encodeURIComponent(f)}:wght@300;400;500;600;700`).join('&')}&display=swap`
            : null;

          return (
            <div className="space-y-6">
              {googleFontsUrl && (
                // eslint-disable-next-line @next/next/no-page-custom-font
                <link rel="stylesheet" href={googleFontsUrl} />
              )}
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-semibold flex items-center gap-2">
                    <IoText className="h-5 w-5 text-emerald-400" />
                    Brand Fonts
                  </h3>
                  {fontAsset && (
                    <span className={cn('rounded-full px-2 py-0.5 text-xs', getStatusBadge(fontAsset.status))}>
                      {formatStatus(fontAsset.status)}
                    </span>
                  )}
                </div>
                {displayFonts.length > 0 ? (
                  <div className="space-y-4">
                    {displayFonts.map((font, i) => {
                      const family = font.family ?? font.name ?? 'Unknown Font';
                      const role = font.role ?? font.usage ?? `Font ${i + 1}`;
                      const weight = font.weight;
                      const size = font.size;
                      return (
                        <div key={i} className="rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p
                                className="text-2xl font-medium leading-tight"
                                style={{ fontFamily: `'${family}', sans-serif` }}
                              >
                                {family}
                              </p>
                              <p className="mt-1 text-sm text-neutral-400">{role}</p>
                            </div>
                            <div className="text-right text-xs text-neutral-500 shrink-0">
                              {weight && <p>Weight: {weight}</p>}
                              {size && <p>Size: {size}</p>}
                            </div>
                          </div>
                          <div className="mt-4 space-y-3 border-t border-zinc-700 pt-4">
                            <p
                              className="text-3xl text-white"
                              style={{ fontFamily: `'${family}', sans-serif`, fontWeight: 700 }}
                            >
                              {data.business?.business_name ?? 'Your Business Name'}
                            </p>
                            <p
                              className="text-xl text-neutral-200"
                              style={{ fontFamily: `'${family}', sans-serif`, fontWeight: 600 }}
                            >
                              Quality steel products for every project
                            </p>
                            <p
                              className="text-base text-neutral-300 leading-relaxed"
                              style={{ fontFamily: `'${family}', sans-serif`, fontWeight: Number(weight) || 400 }}
                            >
                              The quick brown fox jumps over the lazy dog. ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789
                            </p>
                            <p
                              className="text-sm text-neutral-400"
                              style={{ fontFamily: `'${family}', sans-serif`, fontWeight: 300 }}
                            >
                              Light weight sample: Pack my box with five dozen liquor jugs.
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : fontAsset?.storage_url ? (
                  <div className="space-y-3">
                    <img
                      src={fontAsset.storage_url}
                      alt="Font Selection"
                      className="w-full rounded-lg object-contain"
                    />
                    <Button variant="outline" size="sm" asChild>
                      <a href={fontAsset.storage_url} download>
                        <IoDownload className="mr-1 h-3 w-3" />
                        Download
                      </a>
                    </Button>
                  </div>
                ) : (
                  <p className="text-neutral-400">No font selection generated yet.</p>
                )}
                {hasFallbackFonts && (
                  <p className="mt-3 text-xs text-neutral-500">Fonts sourced from brand assets</p>
                )}
              </div>
            </div>
          );
        })()}

        {/* Inspiration Tab */}
        {activeTab === 'inspiration' && data.business && (
          brandingLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-emerald-400" />
                <p className="mt-4 text-neutral-400">Loading...</p>
              </div>
            </div>
          ) : (
            <InspirationSection
              data={brandingData}
              onSave={handleBrandingSave}
            />
          )
        )}

        {/* Discover Tab */}
        <div className={activeTab === 'discover' ? '' : 'hidden'}>
          <AdminDiscoverTab
            userId={data.userId}
            business={data.business}
            brandAssets={data.brandAssets}
            onRefresh={() => startTransition(() => router.refresh())}
          />
        </div>

        {/* Edit Requests Tab */}
        {activeTab === 'edits' && (
          <div>
            <h3 className="mb-4 font-semibold">Edit Request History</h3>
            {data.editRequests.length === 0 ? (
              <p className="text-neutral-400">No edit requests found.</p>
            ) : (
              <div className="space-y-3">
                {data.editRequests.map((request) => (
                  <div key={request.id} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm text-neutral-400">
                        {new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(request.created_at))}
                      </span>
                      <span className={cn('rounded-full px-2 py-0.5 text-xs', getStatusBadge(request.status))}>
                        {formatStatus(request.status)}
                      </span>
                    </div>
                    <p className="font-medium">{request.request_description}</p>
                    {request.target_page && (
                      <p className="mt-1 text-sm text-neutral-400">Target: {request.target_page}</p>
                    )}
                    {request.admin_notes && (
                      <div className="mt-2 rounded bg-zinc-700 p-2 text-sm">
                        <span className="text-neutral-400">Admin Notes:</span> {request.admin_notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Payments Tab */}
        {activeTab === 'payments' && (
          <div className="space-y-6">
            {/* Send Payment Link */}
            <div className="flex flex-col items-end">
              <Button
                onClick={handleOpenPaymentModal}
                variant="outline"
              >
                <IoLink className="mr-2 h-4 w-4" />
                Send Payment Link
              </Button>
              {(data.business as any)?.payment_link_sent_at && (
                <span className="mt-1 text-xs text-neutral-500">
                  Last sent: {new Date((data.business as any).payment_link_sent_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              )}
            </div>

            <div>
              <h3 className="mb-4 font-semibold">Hosting Payments</h3>
              {data.hostingPayments.length === 0 ? (
                <p className="text-neutral-400">No payments found.</p>
              ) : (
                <div className="space-y-3">
                  {data.hostingPayments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                      <div>
                        <p className="font-medium">{payment.hosting_months} Month Hosting</p>
                        <p className="text-sm text-neutral-400">
                          {new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(payment.created_at))} · {payment.status}
                        </p>
                        {payment.hosting_start_date && payment.hosting_end_date && (
                          <p className="text-xs text-neutral-500">
                            Valid: {new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(payment.hosting_start_date))} – {new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(payment.hosting_end_date))}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">${payment.total_amount}</p>
                        {payment.domain_fee > 0 && (
                          <p className="text-xs text-neutral-400">Includes ${payment.domain_fee} domain fee</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        {/* WP Migration Tab */}
        {activeTab === 'migration' && (
          <div className="space-y-6">
            <div className="flex justify-end">
              <button
                onClick={() => selectedJobId && fetchJobDetails(selectedJobId)}
                className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-neutral-300 transition-colors hover:border-zinc-500 hover:text-white"
              >
                <IoRefresh className="h-3 w-3 mr-1 inline" />
                Refresh
              </button>
            </div>

            <MigrationV2
              job={selectedJob}
              customerId={data.userId}
              pages={jobPages}
              onRefresh={() => fetchJobDetails(selectedJobId!)}
              wpCredentials={{
                wpUrl,
                setWpUrl,
                wpUsername,
                setWpUsername,
                wpPassword,
                setWpPassword,
                isTestingWp,
                isStartingMigration,
                wpTestResult,
                handleTestWpConnection,
                handleStartMigration,
              }}
            />
          </div>
        )}

        {/* Website Guide Tab */}
        {activeTab === 'website-guide' && data.business && (
          <WebsiteGuideContent
            businessId={data.business.id}
            activeSubTab={websiteGuideSubTab}
            onSubTabChange={setWebsiteGuideSubTab}
          />
        )}

      </DashboardShell>
    </>
  );
}
