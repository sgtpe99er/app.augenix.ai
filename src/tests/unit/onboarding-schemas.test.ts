import { describe, it, expect } from 'vitest';
import { Step1Schema, Step2Schema, Step3Schema, Step4Schema } from '@/features/onboarding/types';

// ─── Step 1 ──────────────────────────────────────────────────────────────────

describe('Step1Schema', () => {
  const valid = {
    businessName: 'Acme Plumbing',
    industry: 'construction',
    locationCity: 'Austin',
    locationCountry: 'US',
  };

  it('passes with all required fields', () => {
    expect(Step1Schema.safeParse(valid).success).toBe(true);
  });

  it('fails when businessName is empty', () => {
    const result = Step1Schema.safeParse({ ...valid, businessName: '' });
    expect(result.success).toBe(false);
    expect(JSON.stringify(result)).toMatch(/businessName/);
  });

  it('fails when industry is empty', () => {
    const result = Step1Schema.safeParse({ ...valid, industry: '' });
    expect(result.success).toBe(false);
  });

  it('fails when locationCity is empty', () => {
    const result = Step1Schema.safeParse({ ...valid, locationCity: '' });
    expect(result.success).toBe(false);
  });

  it('fails when locationCountry is empty', () => {
    const result = Step1Schema.safeParse({ ...valid, locationCountry: '' });
    expect(result.success).toBe(false);
  });

  it('fails when industry is "other" but industryOther is blank', () => {
    const result = Step1Schema.safeParse({
      ...valid,
      industry: 'other',
      industryOther: '',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'));
      expect(paths).toContain('industryOther');
    }
  });

  it('passes when industry is "other" and industryOther is filled', () => {
    const result = Step1Schema.safeParse({
      ...valid,
      industry: 'other',
      industryOther: 'Landscaping',
    });
    expect(result.success).toBe(true);
  });

  it('locationState is optional', () => {
    const result = Step1Schema.safeParse({ ...valid, locationState: undefined });
    expect(result.success).toBe(true);
  });
});

// ─── Step 2 ──────────────────────────────────────────────────────────────────

describe('Step2Schema', () => {
  const validWithLogo = {
    hasExistingWebsite: false,
    hasExistingLogo: true,    // existing logo → stylePreference not required
    hasBusinessCard: false,
    hasFacebookPage: false,
    hasBrandColors: false,
    hasBrandFonts: false,
  };

  const validWithStyle = {
    ...validWithLogo,
    hasExistingLogo: false,
    stylePreference: 'modern',
  };

  it('passes when hasExistingLogo is true (stylePreference not required)', () => {
    expect(Step2Schema.safeParse(validWithLogo).success).toBe(true);
  });

  it('passes when stylePreference is provided', () => {
    expect(Step2Schema.safeParse(validWithStyle).success).toBe(true);
  });

  it('fails when no existing logo and stylePreference is missing', () => {
    const result = Step2Schema.safeParse({
      ...validWithLogo,
      hasExistingLogo: false,
      stylePreference: '',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'));
      expect(paths).toContain('stylePreference');
    }
  });

  it('accepts optional array fields as empty arrays', () => {
    const result = Step2Schema.safeParse({
      ...validWithStyle,
      brandColors: [],
      brandFonts: [],
    });
    expect(result.success).toBe(true);
  });
});

// ─── Step 3 ──────────────────────────────────────────────────────────────────

describe('Step3Schema', () => {
  const valid = {
    targetAudience: 'Homeowners aged 30-55',
    servicesProducts: 'Plumbing, HVAC, Electrical',
    websiteFeatures: ['contact_form', 'services_page'],
  };

  it('passes with all required fields', () => {
    expect(Step3Schema.safeParse(valid).success).toBe(true);
  });

  it('fails when targetAudience is empty', () => {
    const result = Step3Schema.safeParse({ ...valid, targetAudience: '' });
    expect(result.success).toBe(false);
  });

  it('fails when servicesProducts is empty', () => {
    const result = Step3Schema.safeParse({ ...valid, servicesProducts: '' });
    expect(result.success).toBe(false);
  });

  it('fails when websiteFeatures is empty array', () => {
    const result = Step3Schema.safeParse({ ...valid, websiteFeatures: [] });
    expect(result.success).toBe(false);
  });

  it('passes with a single feature', () => {
    const result = Step3Schema.safeParse({ ...valid, websiteFeatures: ['contact_form'] });
    expect(result.success).toBe(true);
  });
});

// ─── Step 4 ──────────────────────────────────────────────────────────────────

describe('Step4Schema', () => {
  it('passes when needsDomain is false with no other fields', () => {
    const result = Step4Schema.safeParse({ needsDomain: false });
    expect(result.success).toBe(true);
  });

  it('passes when needsDomain is true with a domain', () => {
    const result = Step4Schema.safeParse({
      needsDomain: true,
      requestedDomain: 'acmeplumbing.com',
      domainPrice: 12,
    });
    expect(result.success).toBe(true);
  });

  it('allows domainPrice to be null', () => {
    const result = Step4Schema.safeParse({ needsDomain: true, domainPrice: null });
    expect(result.success).toBe(true);
  });
});
