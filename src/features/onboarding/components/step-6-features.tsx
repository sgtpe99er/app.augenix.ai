'use client';

import { useState } from 'react';
import { useOnboarding } from '../context';
import { WEBSITE_FEATURES, PRIMARY_CTA_OPTIONS, PAYMENT_METHODS, LANGUAGES } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { IoInformationCircle, IoAdd, IoClose } from 'react-icons/io5';
import { cn } from '@/utils/cn';

function HelperText({ children }: { children: React.ReactNode }) {
  return <p className='mt-1 text-xs text-muted-foreground'>{children}</p>;
}

function TagInput({ 
  label, 
  value, 
  onChange, 
  placeholder,
  helperText 
}: { 
  label: string; 
  value: string[]; 
  onChange: (val: string[]) => void; 
  placeholder: string;
  helperText: string;
}) {
  const [inputValue, setInputValue] = useState('');

  const addTag = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
      setInputValue('');
    }
  };

  const removeTag = (tag: string) => {
    onChange(value.filter(t => t !== tag));
  };

  return (
    <div>
      <Label>{label}</Label>
      {value.length > 0 && (
        <div className='mt-2 flex flex-wrap gap-2'>
          {value.map((tag) => (
            <span key={tag} className='flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-sm'>
              {tag}
              <button type='button' onClick={() => removeTag(tag)} className='ml-1 text-muted-foreground hover:text-foreground'>
                <IoClose className='h-3 w-3' />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className='mt-2 flex gap-2'>
        <Input
          placeholder={placeholder}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
          className='flex-1'
        />
        <Button type='button' variant='outline' onClick={addTag} className='shrink-0'>
          <IoAdd className='h-4 w-4' />
        </Button>
      </div>
      <HelperText>{helperText}</HelperText>
    </div>
  );
}

export function Step6Features() {
  const { data, updateStep6, setCurrentStep, saveStep, saving, saveError } = useOnboarding();
  const { step6 } = data;

  const isValid = (step6.websiteFeatures ?? []).length > 0;

  const handleNext = async () => {
    if (!isValid) return;
    await saveStep('step6');
    setCurrentStep(7); // Go to review
    window.scrollTo(0, 0);
  };

  const handleBack = () => setCurrentStep(5);

  const toggleFeature = (feature: string) => {
    const current = step6.websiteFeatures ?? [];
    if (current.includes(feature)) {
      updateStep6({ websiteFeatures: current.filter((f) => f !== feature) });
    } else {
      updateStep6({ websiteFeatures: [...current, feature] });
    }
  };

  const togglePayment = (method: string) => {
    const current = step6.paymentMethods ?? [];
    if (current.includes(method)) {
      updateStep6({ paymentMethods: current.filter((m) => m !== method) });
    } else {
      updateStep6({ paymentMethods: [...current, method] });
    }
  };

  const toggleLanguage = (lang: string) => {
    const current = step6.languagesServed ?? [];
    if (current.includes(lang)) {
      updateStep6({ languagesServed: current.filter((l) => l !== lang) });
    } else {
      updateStep6({ languagesServed: [...current, lang] });
    }
  };

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div>
        <h2 className='text-2xl font-bold'>Website Features & Preferences</h2>
        <p className='mt-2 text-muted-foreground'>
          Tell us what you want your website to do and include.
        </p>
        <div className='mt-4 flex gap-3 rounded-lg border border-blue-500/20 bg-blue-500/10 p-4'>
          <IoInformationCircle className='mt-0.5 h-5 w-5 shrink-0 text-blue-400' />
          <p className='text-sm text-muted-foreground'>
            <strong className='text-blue-300'>Select at least one feature.</strong> The more details you provide, the better we can customize your website to meet your business needs.
          </p>
        </div>
      </div>

      <div className='space-y-6'>
        {/* Website Features */}
        <div>
          <Label className='mb-3 block'>What features do you need? * (Select all that apply)</Label>
          <div className='grid gap-3 sm:grid-cols-2'>
            {WEBSITE_FEATURES.map((feature) => (
              <button
                key={feature.value}
                type='button'
                onClick={() => toggleFeature(feature.value)}
                className={cn(
                  'flex items-center gap-3 rounded-lg border p-4 text-left transition-colors',
                  (step6.websiteFeatures ?? []).includes(feature.value)
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-border hover:border-muted-foreground'
                )}
              >
                <div
                  className={cn(
                    'flex h-5 w-5 items-center justify-center rounded border',
                    (step6.websiteFeatures ?? []).includes(feature.value)
                      ? 'border-emerald-500 bg-emerald-500'
                      : 'border-border'
                  )}
                >
                  {(step6.websiteFeatures ?? []).includes(feature.value) && (
                    <span className='text-xs text-black'>✓</span>
                  )}
                </div>
                <span>{feature.label}</span>
              </button>
            ))}
          </div>
          <HelperText>These determine what pages and functionality your website will have.</HelperText>
        </div>

        {/* Primary CTA */}
        <div>
          <Label className='mb-3 block'>What&apos;s the main action you want visitors to take?</Label>
          <div className='grid gap-3 sm:grid-cols-3'>
            {PRIMARY_CTA_OPTIONS.map((cta) => (
              <button
                key={cta.value}
                type='button'
                onClick={() => updateStep6({ primaryCta: cta.value })}
                className={cn(
                  'rounded-lg border p-4 text-left transition-colors',
                  step6.primaryCta === cta.value
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-border hover:border-muted-foreground'
                )}
              >
                <span className='font-medium'>{cta.label}</span>
              </button>
            ))}
          </div>
          <HelperText>This will be the main button/call-to-action on your website.</HelperText>
        </div>

        {/* Trust Signals Section */}
        <div className='space-y-4 rounded-lg border border-border p-4'>
          <h3 className='font-medium'>Trust Signals</h3>
          <p className='text-xs text-muted-foreground'>
            These help build credibility with potential customers.
          </p>

          <div>
            <Label htmlFor='insuranceInfo'>Insurance Information</Label>
            <Input
              id='insuranceInfo'
              placeholder='e.g., Fully insured and bonded, $1M liability coverage'
              value={step6.insuranceInfo}
              onChange={(e) => updateStep6({ insuranceInfo: e.target.value })}
              className='mt-2'
            />
            <HelperText>If applicable, mention your insurance coverage.</HelperText>
          </div>

          <TagInput
            label='Professional Associations'
            value={step6.associations || []}
            onChange={(val) => updateStep6({ associations: val })}
            placeholder='e.g., BBB, Chamber of Commerce'
            helperText='Organizations or associations you belong to.'
          />

          <div>
            <Label className='mb-3 block'>Payment Methods Accepted</Label>
            <div className='flex flex-wrap gap-2'>
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method.value}
                  type='button'
                  onClick={() => togglePayment(method.value)}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-sm transition-colors',
                    (step6.paymentMethods ?? []).includes(method.value)
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                      : 'border-border hover:border-muted-foreground'
                  )}
                >
                  {method.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* USPs */}
        <TagInput
          label='Unique Selling Points'
          value={step6.uniqueSellingPoints || []}
          onChange={(val) => updateStep6({ uniqueSellingPoints: val })}
          placeholder='e.g., Same-day service, Family-owned since 1985'
          helperText='What makes your business special? These will be highlighted on your website.'
        />

        {/* Languages */}
        <div>
          <Label className='mb-3 block'>Languages You Serve</Label>
          <div className='flex flex-wrap gap-2'>
            {LANGUAGES.map((lang) => (
              <button
                key={lang.value}
                type='button'
                onClick={() => toggleLanguage(lang.value)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-sm transition-colors',
                  (step6.languagesServed ?? []).includes(lang.value)
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                    : 'border-border hover:border-muted-foreground'
                )}
              >
                {lang.label}
              </button>
            ))}
          </div>
          <HelperText>Select all languages your business can serve customers in.</HelperText>
        </div>
      </div>

      {saveError && <p className='text-sm text-red-400'>{saveError}</p>}
      <div className='flex justify-between pt-4'>
        <Button variant='outline' onClick={handleBack}>
          ← Back
        </Button>
        <Button
          onClick={handleNext}
          disabled={!isValid || saving}
          className='bg-emerald-500 px-8 text-black hover:bg-emerald-400'
        >
          {saving ? 'Saving…' : 'Review Summary →'}
        </Button>
      </div>
    </div>
  );
}
