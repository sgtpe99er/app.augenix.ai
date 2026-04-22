'use client';

import { cn } from '@/utils/cn';

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  onStepClick?: (step: number) => void;
}

const stepLabels = ['Business', 'Online', 'SEO', 'Content', 'Brand', 'Features', 'Review'];

export function ProgressBar({ currentStep, totalSteps, onStepClick }: ProgressBarProps) {
  return (
    <div className='mb-8'>
      <div className='flex items-center justify-between'>
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
          <div key={step} className='flex flex-1 items-center'>
            <div className='flex flex-col items-center'>
              <button
                type='button'
                onClick={() => onStepClick?.(step)}
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition-colors cursor-pointer hover:ring-2 hover:ring-emerald-400/50',
                  step < currentStep
                    ? 'bg-emerald-500 text-black'
                    : step === currentStep
                    ? 'bg-emerald-500 text-black'
                    : 'bg-secondary text-secondary-foreground border border-border'
                )}
              >
                {step < currentStep ? '✓' : step}
              </button>
              <span
                className={cn(
                  'mt-2 hidden text-xs sm:block',
                  step <= currentStep ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {stepLabels[step - 1]}
              </span>
            </div>
            {step < totalSteps && (
              <div
                className={cn(
                  'mx-2 h-1 flex-1 rounded',
                  step < currentStep ? 'bg-emerald-500' : 'bg-muted'
                )}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
