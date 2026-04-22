'use client';

import { useRouter } from 'next/navigation';
import { useOnboarding } from '../context';
import { 
  INDUSTRIES, 
  STYLE_PREFERENCES, 
  WEBSITE_FEATURES, 
  COLOR_SUGGESTIONS,
  TONE_OF_VOICE,
  PRIMARY_CTA_OPTIONS,
  PAYMENT_METHODS,
  LANGUAGES,
} from '../types';
import { Button } from '@/components/ui/button';
import { IoCheckmarkCircle } from 'react-icons/io5';

function ReviewSection({ 
  title, 
  step, 
  onEdit, 
  children 
}: { 
  title: string; 
  step: number; 
  onEdit: () => void; 
  children: React.ReactNode;
}) {
  return (
    <div className='rounded-lg border border-border p-5'>
      <div className='mb-4 flex items-center justify-between'>
        <h3 className='font-semibold'>{title}</h3>
        <button
          onClick={onEdit}
          className='text-sm text-emerald-400 hover:underline'
        >
          Edit
        </button>
      </div>
      <div className='space-y-2 text-sm'>{children}</div>
    </div>
  );
}

function ReviewItem({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value || (typeof value === 'string' && !value.trim()) || (Array.isArray(value) && value.length === 0)) {
    return null;
  }
  return (
    <div className='flex justify-between gap-4'>
      <span className='text-muted-foreground'>{label}</span>
      <span className='text-right'>{value}</span>
    </div>
  );
}

export function Step7Review() {
  const router = useRouter();
  const { data, setCurrentStep, saveStep, saving, saveError } = useOnboarding();
  const { step1, step2, step3, step4, step5, step6 } = data;

  const handleBack = () => setCurrentStep(6);

  const handleContinueToPayment = async () => {
    await Promise.all([
      saveStep('step1'),
      saveStep('step2'),
      saveStep('step3'),
      saveStep('step4'),
      saveStep('step5'),
      saveStep('step6'),
    ]);
    router.push('/dashboard');
  };

  const getLabel = (options: { value: string; label: string }[], value: string) => {
    return options.find((o) => o.value === value)?.label || value;
  };

  const getLabels = (options: { value: string; label: string }[], values: string[]) => {
    return values.map((v) => getLabel(options, v)).join(', ');
  };

  const formatLocation = () => {
    return [step1.addressCity, step1.addressState, step1.addressCountry]
      .filter(Boolean)
      .join(', ');
  };

  const countUploads = () => {
    return step5.uploadedAssets?.length || 0;
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
        {/* Step 1: Business Basics */}
        <ReviewSection title='Business Basics' step={1} onEdit={() => setCurrentStep(1)}>
          <ReviewItem label='Business Name' value={step1.businessName} />
          <ReviewItem label='Industry' value={getLabel(INDUSTRIES, step1.industry)} />
          <ReviewItem label='Tagline' value={step1.tagline} />
          <ReviewItem label='Location' value={formatLocation()} />
          <ReviewItem label='Phone' value={step1.phonePrimary} />
          <ReviewItem label='Email' value={step1.emailPublic} />
        </ReviewSection>

        {/* Step 2: Online Presence */}
        <ReviewSection title='Online Presence' step={2} onEdit={() => setCurrentStep(2)}>
          <ReviewItem 
            label='Domain' 
            value={step2.ownsDomain ? step2.existingDomain || 'Has existing domain' : 'Needs new domain'} 
          />
          <ReviewItem label='Existing Website' value={step2.existingWebsiteUrl} />
          <ReviewItem label='Facebook' value={step2.socialFacebook} />
          <ReviewItem label='Instagram' value={step2.socialInstagram} />
          <ReviewItem label='Google Business' value={step2.socialGoogleBusiness} />
        </ReviewSection>

        {/* Step 3: SEO & Target Market */}
        <ReviewSection title='SEO & Target Market' step={3} onEdit={() => setCurrentStep(3)}>
          <div>
            <span className='text-muted-foreground'>Target Audience</span>
            <p className='mt-1'>{step3.targetAudience}</p>
          </div>
          <div>
            <span className='text-muted-foreground'>Services/Products</span>
            <p className='mt-1'>{step3.servicesProducts}</p>
          </div>
          <ReviewItem label='Target Locations' value={step3.targetLocations?.join(', ')} />
          <ReviewItem label='Service Area' value={step3.serviceAreaRadius} />
        </ReviewSection>

        {/* Step 4: Brand & Style */}
        <ReviewSection title='Brand & Content Intake' step={4} onEdit={() => setCurrentStep(4)}>
          <ReviewItem label='Assets Added' value={countUploads() > 0 ? `${countUploads()} items` : 'None yet'} />
          <ReviewItem
            label='Current Website'
            value={step2.existingWebsiteUrl ? 'Included automatically in brand analysis' : 'None captured yet'}
          />
          <ReviewItem
            label='Inspiration URLs'
            value={step5.websiteInspirationUrls?.length ? step5.websiteInspirationUrls.join(', ') : null}
          />
          <ReviewItem label='Intake Notes' value={step5.intakeNotes} />
        </ReviewSection>

        {/* Step 5: Content & Media */}
        <ReviewSection title='Brand Guide Review' step={5} onEdit={() => setCurrentStep(5)}>
          <ReviewItem label='Has Logo' value={step4.hasExistingLogo ? 'Yes' : 'No - will create'} />
          <ReviewItem label='Brand Guide Status' value={step4.brandGuideStatus} />
          <ReviewItem label='Style' value={getLabel(STYLE_PREFERENCES, step4.stylePreference)} />
          <ReviewItem label='Tone' value={getLabel(TONE_OF_VOICE, step4.toneOfVoice)} />
          <ReviewItem label='Selected Logo Variant' value={step4.brandGuideSelections.selectedLogoVariant} />
          <ReviewItem label='Selected Palette' value={step4.brandGuideSelections.selectedPaletteId} />
          <ReviewItem label='Selected Heading Font' value={step4.brandGuideSelections.selectedHeadingFont} />
          <ReviewItem label='Selected Body Font' value={step4.brandGuideSelections.selectedBodyFont} />
          <ReviewItem label='Selected CTA Color' value={step4.brandGuideSelections.selectedCtaColor} />
          <ReviewItem label='Brand Guide Notes' value={step4.brandGuideSelections.notes} />
          <ReviewItem 
            label='Colors' 
            value={
              step4.hasBrandColors 
                ? step4.brandColors?.map((color) => color.label || color.hex).join(', ')
                : step4.colorPreference 
                  ? getLabel(COLOR_SUGGESTIONS, step4.colorPreference)
                  : null
            } 
          />
          <ReviewItem label='Fonts' value={step4.brandFonts?.join(', ')} />
        </ReviewSection>

        {/* Step 6: Website Features */}
        <ReviewSection title='Website Features' step={6} onEdit={() => setCurrentStep(6)}>
          <ReviewItem label='Features' value={getLabels(WEBSITE_FEATURES, step6.websiteFeatures || [])} />
          <ReviewItem label='Primary CTA' value={getLabel(PRIMARY_CTA_OPTIONS, step6.primaryCta)} />
          <ReviewItem label='Payment Methods' value={getLabels(PAYMENT_METHODS, step6.paymentMethods || [])} />
          <ReviewItem label='Languages' value={getLabels(LANGUAGES, step6.languagesServed || [])} />
          <ReviewItem label='USPs' value={step6.uniqueSellingPoints?.join(', ')} />
        </ReviewSection>
      </div>

      {/* What's Next */}
      <div className='rounded-lg bg-emerald-500/10 p-6'>
        <h3 className='flex items-center gap-2 font-semibold text-emerald-400'>
          <IoCheckmarkCircle className='h-5 w-5' />
          What happens next?
        </h3>
        <ol className='mt-3 list-inside list-decimal space-y-2 text-sm text-muted-foreground'>
          <li>Choose your hosting plan and pay</li>
          <li>We generate your logo, branding guide, and website mockups</li>
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
          {saving ? 'Saving…' : 'Choose Hosting Plan →'}
        </Button>
      </div>
    </div>
  );
}
