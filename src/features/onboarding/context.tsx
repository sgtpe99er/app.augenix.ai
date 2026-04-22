'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { OnboardingFormData, initialOnboardingData } from './types';

interface DiscoveryItem {
  field_type: string;
  field_value: string | Record<string, unknown> | string[];
  status: string;
}

interface OnboardingContextType {
  data: OnboardingFormData;
  currentStep: number;
  setCurrentStep: (step: number) => void;
  updateStep1: (data: Partial<OnboardingFormData['step1']>) => void;
  updateStep2: (data: Partial<OnboardingFormData['step2']>) => void;
  updateStep3: (data: Partial<OnboardingFormData['step3']>) => void;
  updateStep4: (data: Partial<OnboardingFormData['step4']>) => void;
  updateStep5: (data: Partial<OnboardingFormData['step5']>) => void;
  updateStep6: (data: Partial<OnboardingFormData['step6']>) => void;
  resetData: () => void;
  saveStep: (stepKey: 'step1' | 'step2' | 'step3' | 'step4' | 'step5' | 'step6') => Promise<void>;
  saving: boolean;
  saveError: string;
  loadingDiscovery: boolean;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<OnboardingFormData>(initialOnboardingData);
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [loadingDiscovery, setLoadingDiscovery] = useState(true);

  // Load existing business/brand data OR discovery data on mount
  useEffect(() => {
    async function loadData() {
      try {
        // Check URL for discovery session ID first
        const urlParams = new URLSearchParams(window.location.search);
        const sessionId = urlParams.get('discovery');
        
        if (sessionId) {
          // Load from discovery session
          await loadDiscoveryData(sessionId);
        } else {
          // Load from existing business/brand_assets tables
          await loadExistingData();
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoadingDiscovery(false);
      }
    }

    async function loadDiscoveryData(sessionId: string) {
      const res = await fetch(`/api/onboarding/discover/${sessionId}`);
      if (!res.ok) return;

      const { items } = await res.json();
      const confirmedItems = (items as DiscoveryItem[]).filter(
        (item) => item.status === 'confirmed'
      );

      if (confirmedItems.length === 0) return;

      const step1Updates: Partial<OnboardingFormData['step1']> = {};
      const step2Updates: Partial<OnboardingFormData['step2']> = {};
      const step3Updates: Partial<OnboardingFormData['step3']> = {};

      for (const item of confirmedItems) {
        const value = item.field_value;
        switch (item.field_type) {
          case 'business_name': step1Updates.businessName = value as string; break;
          case 'tagline': step1Updates.tagline = value as string; break;
          case 'description': step1Updates.description = value as string; break;
          case 'phone': step1Updates.phonePrimary = value as string; break;
          case 'email': step1Updates.emailPublic = value as string; break;
          case 'industry': step1Updates.industry = value as string; break;
          case 'address':
            if (typeof value === 'object' && value !== null) {
              const addr = value as Record<string, string>;
              if (addr.street) step1Updates.addressStreet = addr.street;
              if (addr.city) step1Updates.addressCity = addr.city;
              if (addr.state) step1Updates.addressState = addr.state;
              if (addr.zip) step1Updates.addressZip = addr.zip;
              if (addr.country) step1Updates.addressCountry = addr.country;
            }
            break;
          case 'hours':
            if (typeof value === 'object' && value !== null) {
              step1Updates.hours = value as Record<string, { open: string; close: string } | null>;
            }
            break;
          case 'website':
            step2Updates.existingWebsiteUrl = value as string;
            step2Updates.hasExistingWebsite = true;
            break;
          case 'social_facebook':
            step2Updates.socialFacebook = value as string;
            step2Updates.hasFacebookPage = true;
            step2Updates.facebookPageUrl = value as string;
            break;
          case 'social_instagram': step2Updates.socialInstagram = value as string; break;
          case 'social_youtube': step2Updates.socialYoutube = value as string; break;
          case 'social_linkedin': step2Updates.socialLinkedin = value as string; break;
          case 'social_x': step2Updates.socialX = value as string; break;
          case 'social_tiktok': step2Updates.socialTiktok = value as string; break;
          case 'social_gbp': step2Updates.socialGoogleBusiness = value as string; break;
          case 'services':
            if (Array.isArray(value)) {
              step3Updates.servicesProducts = value.join(', ');
              step3Updates.serviceKeywords = value;
            }
            break;
        }
      }

      setData((prev) => ({
        ...prev,
        step1: { ...prev.step1, ...step1Updates },
        step2: { ...prev.step2, ...step2Updates },
        step3: { ...prev.step3, ...step3Updates },
      }));
    }

    async function loadExistingData() {
      const res = await fetch('/api/onboarding/load');
      if (!res.ok) return;

      const { business, brandAssets, brandGuide, customerInputs } = await res.json();
      if (!business && !brandAssets && !brandGuide && (!customerInputs || customerInputs.length === 0)) return;

      const b = business || {};
      const ba = brandAssets || {};
      const bg = brandGuide || {};
      const inputs = Array.isArray(customerInputs) ? customerInputs : [];

      // Map database fields to form data
      const step1Updates: Partial<OnboardingFormData['step1']> = {};
      const step2Updates: Partial<OnboardingFormData['step2']> = {};
      const step3Updates: Partial<OnboardingFormData['step3']> = {};
      const step4Updates: Partial<OnboardingFormData['step4']> = {};
      const step5Updates: Partial<OnboardingFormData['step5']> = {};

      // Step 1: Business basics
      if (b.business_name) step1Updates.businessName = b.business_name;
      if (b.industry) step1Updates.industry = b.industry;
      if (b.year_established) step1Updates.yearEstablished = b.year_established;
      if (b.tagline) step1Updates.tagline = b.tagline;
      if (b.description) step1Updates.description = b.description;
      if (b.address_street) step1Updates.addressStreet = b.address_street;
      if (b.location_city) step1Updates.addressCity = b.location_city;
      if (b.location_state) step1Updates.addressState = b.location_state;
      if (b.address_zip) step1Updates.addressZip = b.address_zip;
      if (b.location_country) step1Updates.addressCountry = b.location_country;
      if (b.phone_primary) step1Updates.phonePrimary = b.phone_primary;
      if (b.phone_secondary) step1Updates.phoneSecondary = b.phone_secondary;
      if (b.email_public) step1Updates.emailPublic = b.email_public;
      if (b.hours) step1Updates.hours = b.hours;

      // Step 2: Brand assets & socials
      if (ba.existing_website_url) {
        step2Updates.hasExistingWebsite = true;
        step2Updates.existingWebsiteUrl = ba.existing_website_url;
      }
      if (ba.existing_logo_url) {
        step2Updates.hasExistingLogo = true;
        step2Updates.existingLogoUrl = ba.existing_logo_url;
      }
      if (ba.social_facebook) {
        step2Updates.hasFacebookPage = true;
        step2Updates.facebookPageUrl = ba.social_facebook;
        step2Updates.socialFacebook = ba.social_facebook;
      }
      if (ba.social_instagram) step2Updates.socialInstagram = ba.social_instagram;
      if (ba.social_youtube) step2Updates.socialYoutube = ba.social_youtube;
      if (ba.social_linkedin) step2Updates.socialLinkedin = ba.social_linkedin;
      if (ba.social_x) step2Updates.socialX = ba.social_x;
      if (ba.social_tiktok) step2Updates.socialTiktok = ba.social_tiktok;
      if (ba.social_google_business) step2Updates.socialGoogleBusiness = ba.social_google_business;
      if (ba.social_yelp) step2Updates.socialYelp = ba.social_yelp;
      if (ba.brand_colors && ba.brand_colors.length > 0) {
        step2Updates.hasBrandColors = true;
        step2Updates.brandColors = ba.brand_colors;
      }

      // Step 3: Services & SEO
      if (b.services_products) step3Updates.servicesProducts = b.services_products;
      if (b.target_audience) step3Updates.targetAudience = b.target_audience;
      if (b.target_locations) step3Updates.targetLocations = b.target_locations;
      if (b.service_area_radius) step3Updates.serviceAreaRadius = b.service_area_radius;
      if (b.service_keywords) step3Updates.serviceKeywords = b.service_keywords;
      if (b.competitor_urls) step3Updates.competitorUrls = b.competitor_urls;

      // Domain fields are in step2
      if (b.owns_domain !== undefined) step2Updates.ownsDomain = b.owns_domain;
      if (b.existing_domain) step2Updates.existingDomain = b.existing_domain;
      if (b.desired_domain) step2Updates.desiredDomain = b.desired_domain;

      // Step 4: Brand & Style
      if (ba.style_preference) step4Updates.stylePreference = ba.style_preference;
      if (ba.tone_of_voice) step4Updates.toneOfVoice = ba.tone_of_voice;
      if (ba.brand_fonts && ba.brand_fonts.length > 0) {
        step4Updates.hasBrandFonts = true;
        step4Updates.brandFonts = ba.brand_fonts;
      }
      if (ba.inspiration_urls) step4Updates.inspirationUrls = ba.inspiration_urls;
      if (ba.inspiration_notes) step4Updates.inspirationNotes = ba.inspiration_notes;
      if (ba.brand_guide_status) step4Updates.brandGuideStatus = ba.brand_guide_status;
      if (ba.brand_guide_id) step4Updates.brandGuideId = ba.brand_guide_id;
      if (ba.minimal_brand_guide) step4Updates.minimalBrandGuide = ba.minimal_brand_guide;
      if (ba.brand_guide_selections) step4Updates.brandGuideSelections = ba.brand_guide_selections;
      if (ba.brand_guide_prompt_template_key) step4Updates.brandGuidePromptTemplateKey = ba.brand_guide_prompt_template_key;

      if (bg.id && !step4Updates.brandGuideId) step4Updates.brandGuideId = bg.id;
      if (bg.status) step4Updates.brandGuideStatus = bg.status;
      if (bg.minimal_guide) step4Updates.minimalBrandGuide = bg.minimal_guide;
      if (bg.selected_config) step4Updates.brandGuideSelections = bg.selected_config;
      if (bg.prompt_template_key) step4Updates.brandGuidePromptTemplateKey = bg.prompt_template_key;

      if (ba.uploaded_assets) step5Updates.uploadedAssets = ba.uploaded_assets;
      if (ba.website_inspiration_urls) step5Updates.websiteInspirationUrls = ba.website_inspiration_urls;
      if (ba.intake_notes) step5Updates.intakeNotes = ba.intake_notes;
      if (ba.existing_website_scan_enabled !== undefined) {
        step5Updates.existingWebsiteScanEnabled = ba.existing_website_scan_enabled;
      }

      if (inputs.length > 0) {
        step5Updates.uploadedAssets = inputs.map((input) => ({
          id: input.id,
          inputType: input.input_type,
          title: input.title || '',
          notes: input.notes || '',
          tags: Array.isArray(input.asset_tags) ? input.asset_tags : [],
          sourceUrl: input.source_url || '',
          storageUrl: input.storage_url || '',
          storagePath: input.storage_path || '',
          fileName: input.file_name || '',
          mimeType: input.mime_type || '',
          metadata: input.metadata && typeof input.metadata === 'object' ? input.metadata : {},
        }));
      }

      setData((prev) => ({
        ...prev,
        step1: { ...prev.step1, ...step1Updates },
        step2: { ...prev.step2, ...step2Updates },
        step3: { ...prev.step3, ...step3Updates },
        step4: { ...prev.step4, ...step4Updates },
        step5: { ...prev.step5, ...step5Updates },
      }));
    }

    loadData();
  }, []);

  const updateStep1 = (newData: Partial<OnboardingFormData['step1']>) => {
    setData(prev => ({
      ...prev,
      step1: { ...prev.step1, ...newData },
    }));
  };

  const updateStep2 = (newData: Partial<OnboardingFormData['step2']>) => {
    setData(prev => ({
      ...prev,
      step2: { ...prev.step2, ...newData },
    }));
  };

  const updateStep3 = (newData: Partial<OnboardingFormData['step3']>) => {
    setData(prev => ({
      ...prev,
      step3: { ...prev.step3, ...newData },
    }));
  };

  const updateStep4 = (newData: Partial<OnboardingFormData['step4']>) => {
    setData(prev => ({
      ...prev,
      step4: { ...prev.step4, ...newData },
    }));
  };

  const updateStep5 = (newData: Partial<OnboardingFormData['step5']>) => {
    setData(prev => ({
      ...prev,
      step5: { ...prev.step5, ...newData },
    }));
  };

  const updateStep6 = (newData: Partial<OnboardingFormData['step6']>) => {
    setData(prev => ({
      ...prev,
      step6: { ...prev.step6, ...newData },
    }));
  };

  const resetData = () => {
    setData(initialOnboardingData);
    setCurrentStep(1);
  };

  const saveStep = async (stepKey: 'step1' | 'step2' | 'step3' | 'step4' | 'step5' | 'step6') => {
    setSaving(true);
    setSaveError('');
    try {
      const res = await fetch('/api/onboarding/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [stepKey]: data[stepKey] }),
      });
      if (!res.ok) {
        const json = await res.json();
        setSaveError(json.error ?? 'Failed to save');
      }
    } catch {
      setSaveError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <OnboardingContext.Provider
      value={{
        data,
        currentStep,
        setCurrentStep,
        updateStep1,
        updateStep2,
        updateStep3,
        updateStep4,
        updateStep5,
        updateStep6,
        resetData,
        saveStep,
        saving,
        saveError,
        loadingDiscovery,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}
