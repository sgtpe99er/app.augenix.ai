'use client';

import { useOnboarding } from '../context';
import { WEBSITE_FEATURES } from '../types';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/utils/cn';

export function Step3Details() {
  const { data, updateStep3, setCurrentStep, saveStep, saving, saveError } = useOnboarding();
  const { step3 } = data;

  const isValid =
    step3.targetAudience.trim() !== '' &&
    step3.servicesProducts.trim() !== '' &&
    (step3.websiteFeatures ?? []).length > 0;

  const handleNext = async () => {
    if (!isValid) return;
    await saveStep('step3');
    setCurrentStep(4);
  };

  const handleBack = () => setCurrentStep(2);

  const toggleFeature = (feature: string) => {
    const current = step3.websiteFeatures ?? [];
    if (current.includes(feature)) {
      updateStep3({ websiteFeatures: current.filter((f) => f !== feature) });
    } else {
      updateStep3({ websiteFeatures: [...current, feature] });
    }
  };

  return (
    <div className='space-y-6'>
      <div>
        <h2 className='text-2xl font-bold'>Website Details</h2>
        <p className='mt-2 text-muted-foreground'>
          Help us understand what your website needs to do.
        </p>
      </div>

      <div className='space-y-6'>
        <div>
          <Label htmlFor='targetAudience'>Who are your customers? *</Label>
          <Textarea
            id='targetAudience'
            placeholder='e.g., Local families looking for home repair services, young professionals interested in fitness...'
            value={step3.targetAudience}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateStep3({ targetAudience: e.target.value })}
            className='mt-2 min-h-[100px]'
          />
        </div>

        <div>
          <Label htmlFor='servicesProducts'>What do you offer? *</Label>
          <Textarea
            id='servicesProducts'
            placeholder='e.g., Plumbing repairs, water heater installation, emergency services, bathroom remodeling...'
            value={step3.servicesProducts}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateStep3({ servicesProducts: e.target.value })}
            className='mt-2 min-h-[100px]'
          />
        </div>

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
                  (step3.websiteFeatures ?? []).includes(feature.value)
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-border hover:border-border'
                )}
              >
                <div
                  className={cn(
                    'flex h-5 w-5 items-center justify-center rounded border',
                    (step3.websiteFeatures ?? []).includes(feature.value)
                      ? 'border-emerald-500 bg-emerald-500'
                      : 'border-border'
                  )}
                >
                  {(step3.websiteFeatures ?? []).includes(feature.value) && (
                    <span className='text-xs text-black'>✓</span>
                  )}
                </div>
                <span>{feature.label}</span>
              </button>
            ))}
          </div>
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
          {saving ? 'Saving…' : 'Continue →'}
        </Button>
      </div>
    </div>
  );
}
