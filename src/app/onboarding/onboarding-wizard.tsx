'use client';

import { Container } from '@/components/container';
import {
  OnboardingProvider,
  useOnboarding,
  ProgressBar,
  Step1Business,
  Step2OnlinePresence,
  Step3Seo,
  Step4Brand,
  Step5Content,
  Step6Features,
  Step7Review,
} from '@/features/onboarding';

function OnboardingContent() {
  const { currentStep, setCurrentStep, loadingDiscovery } = useOnboarding();

  const handleStepClick = (step: number) => {
    setCurrentStep(step);
    window.scrollTo(0, 0);
  };

  if (loadingDiscovery) {
    return (
      <Container className='max-w-3xl'>
        <div className='flex items-center justify-center py-20'>
          <div className='text-center'>
            <div className='mx-auto h-8 w-8 animate-spin rounded-full border-2 border-border border-t-emerald-400' />
            <p className='mt-4 text-muted-foreground'>Loading your information...</p>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container className='max-w-3xl'>
      <ProgressBar currentStep={currentStep} totalSteps={7} onStepClick={handleStepClick} />
      
      <div className='rounded-xl bg-card border border-border p-6 lg:p-8'>
        {currentStep === 1 && <Step1Business />}
        {currentStep === 2 && <Step2OnlinePresence />}
        {currentStep === 3 && <Step3Seo />}
        {currentStep === 4 && <Step5Content />}
        {currentStep === 5 && <Step4Brand />}
        {currentStep === 6 && <Step6Features />}
        {currentStep === 7 && <Step7Review />}
      </div>
    </Container>
  );
}

export function OnboardingWizard() {
  return (
    <OnboardingProvider>
      <OnboardingContent />
    </OnboardingProvider>
  );
}
