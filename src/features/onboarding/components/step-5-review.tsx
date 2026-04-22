'use client';

import { useRouter } from 'next/navigation';
import { useOnboarding } from '../context';
import { INDUSTRIES, STYLE_PREFERENCES, WEBSITE_FEATURES, COLOR_SUGGESTIONS } from '../types';
import { Button } from '@/components/ui/button';

export function Step5Review() {
  const router = useRouter();
  const { data, setCurrentStep, saveStep, saving, saveError } = useOnboarding();
  const { step1, step2, step3, step4 } = data;

  const handleBack = () => setCurrentStep(4);

  const handleContinueToPayment = async () => {
    await Promise.all([
      saveStep('step1'),
      saveStep('step2'),
      saveStep('step3'),
      saveStep('step4'),
    ]);
    router.push('/dashboard');
  };

  const getIndustryLabel = (value: string) => {
    if (value === 'other') return step1.industryOther;
    return INDUSTRIES.find((i) => i.value === value)?.label || value;
  };

  const getStyleLabel = (value: string) => {
    return STYLE_PREFERENCES.find((s) => s.value === value)?.label || value;
  };

  const getColorLabel = (value: string) => {
    return COLOR_SUGGESTIONS.find((c) => c.value === value)?.label || value;
  };

  const getFeatureLabels = (values: string[]) => {
    return values
      .map((v) => WEBSITE_FEATURES.find((f) => f.value === v)?.label || v)
      .join(', ');
  };

  return (
    <div className='space-y-6'>
      <div>
        <h2 className='text-2xl font-bold'>Review Your Information</h2>
        <p className='mt-2 text-muted-foreground'>
          Make sure everything looks correct before proceeding to payment.
        </p>
      </div>

      <div className='space-y-4'>
        {/* Business Info */}
        <div className='rounded-lg border border-border p-6'>
          <div className='mb-4 flex items-center justify-between'>
            <h3 className='font-semibold'>Business Information</h3>
            <button
              onClick={() => setCurrentStep(1)}
              className='text-sm text-emerald-400 hover:underline'
            >
              Edit
            </button>
          </div>
          <div className='grid gap-3 text-sm'>
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>Business Name</span>
              <span>{step1.businessName}</span>
            </div>
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>Industry</span>
              <span>{getIndustryLabel(step1.industry)}</span>
            </div>
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>Location</span>
              <span>
                {[step1.addressCity, step1.addressState, step1.addressCountry]
                  .filter(Boolean)
                  .join(', ')}
              </span>
            </div>
          </div>
        </div>

        {/* Brand Assets */}
        <div className='rounded-lg border border-border p-6'>
          <div className='mb-4 flex items-center justify-between'>
            <h3 className='font-semibold'>Brand Assets</h3>
            <button
              onClick={() => setCurrentStep(2)}
              className='text-sm text-emerald-400 hover:underline'
            >
              Edit
            </button>
          </div>
          <div className='grid gap-3 text-sm'>
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>Existing Website</span>
              <span>{step2.hasExistingWebsite ? step2.existingWebsiteUrl : 'No'}</span>
            </div>
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>Existing Logo</span>
              <span>{step2.hasExistingLogo ? 'Yes (will upload later)' : 'No - will create new'}</span>
            </div>
            {!step2.hasExistingLogo && step2.stylePreference && (
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Style Preference</span>
                <span>{getStyleLabel(step2.stylePreference)}</span>
              </div>
            )}
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>Colors</span>
              <span>
                {step2.hasBrandColors
                  ? (step2.brandColors ?? []).join(', ')
                  : step2.colorPreference
                  ? getColorLabel(step2.colorPreference)
                  : 'Not specified'}
              </span>
            </div>
          </div>
        </div>

        {/* Website Details */}
        <div className='rounded-lg border border-border p-6'>
          <div className='mb-4 flex items-center justify-between'>
            <h3 className='font-semibold'>Website Details</h3>
            <button
              onClick={() => setCurrentStep(3)}
              className='text-sm text-emerald-400 hover:underline'
            >
              Edit
            </button>
          </div>
          <div className='grid gap-3 text-sm'>
            <div>
              <span className='text-muted-foreground'>Target Audience</span>
              <p className='mt-1'>{step3.targetAudience}</p>
            </div>
            <div>
              <span className='text-muted-foreground'>Services/Products</span>
              <p className='mt-1'>{step3.servicesProducts}</p>
            </div>
            <div>
              <span className='text-muted-foreground'>Website Features</span>
              <p className='mt-1'>{getFeatureLabels(step3.websiteFeatures ?? [])}</p>
            </div>
          </div>
        </div>

        {/* Domain */}
        <div className='rounded-lg border border-border p-6'>
          <div className='mb-4 flex items-center justify-between'>
            <h3 className='font-semibold'>Domain</h3>
            <button
              onClick={() => setCurrentStep(4)}
              className='text-sm text-emerald-400 hover:underline'
            >
              Edit
            </button>
          </div>
          <div className='text-sm'>
            {step4.needsDomain && step4.requestedDomain ? (
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>New Domain</span>
                <span>
                  {step4.requestedDomain} (${((step4.domainPrice || 0) + 5).toFixed(2)})
                </span>
              </div>
            ) : (
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Domain</span>
                <span>Free subdomain included</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* What's Next */}
      <div className='rounded-lg bg-emerald-500/10 p-6'>
        <h3 className='font-semibold text-emerald-400'>What happens next?</h3>
        <ol className='mt-3 list-inside list-decimal space-y-2 text-sm text-muted-foreground'>
          <li>Choose your hosting plan (6 or 12 months)</li>
          <li>Complete payment</li>
          <li>Our AI generates your logo, branding guide, and website mockups</li>
          <li>Our team reviews everything to ensure quality</li>
          <li>You review and approve your favorite designs</li>
          <li>We build and launch your website!</li>
        </ol>
      </div>

      {saveError && <p className='text-sm text-red-400'>{saveError}</p>}
      <div className='flex justify-between pt-4'>
        <Button variant='outline' onClick={handleBack}>
          ← Back
        </Button>
        <Button
          onClick={handleContinueToPayment}
          disabled={saving}
          className='bg-emerald-500 px-8 text-black hover:bg-emerald-400'
        >
          {saving ? 'Saving…' : 'Continue to Payment →'}
        </Button>
      </div>
    </div>
  );
}
