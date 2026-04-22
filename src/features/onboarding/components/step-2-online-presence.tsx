'use client';

import { useOnboarding } from '../context';
import { SOCIAL_PLATFORMS } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { IoInformationCircle, IoGlobeOutline } from 'react-icons/io5';
import { cn } from '@/utils/cn';

function HelperText({ children }: { children: React.ReactNode }) {
  return <p className='mt-1 text-xs text-muted-foreground'>{children}</p>;
}

export function Step2OnlinePresence() {
  const { data, updateStep2, setCurrentStep, saveStep, saving, saveError } = useOnboarding();
  const { step2 } = data;

  const handleNext = async () => {
    await saveStep('step2');
    setCurrentStep(3);
    window.scrollTo(0, 0);
  };

  const handleBack = () => setCurrentStep(1);

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div>
        <h2 className='text-2xl font-bold'>Domain & Online Presence</h2>
        <p className='mt-2 text-muted-foreground'>
          Tell us about your existing online presence so we can integrate everything seamlessly.
        </p>
        <div className='mt-4 flex gap-3 rounded-lg border border-blue-500/20 bg-blue-500/10 p-4'>
          <IoInformationCircle className='mt-0.5 h-5 w-5 shrink-0 text-blue-400' />
          <p className='text-sm text-muted-foreground'>
            <strong className='text-blue-300'>All fields are optional.</strong> If you have existing social media pages or a website, adding them helps us match your branding and link everything together.
          </p>
        </div>
      </div>

      <div className='space-y-6'>
        {/* Domain Section */}
        <div className='space-y-4'>
          <h3 className='flex items-center gap-2 text-sm font-medium'>
            <IoGlobeOutline className='h-4 w-4' />
            Domain Name
          </h3>
          
          <div className='grid gap-4 sm:grid-cols-2'>
            <button
              type='button'
              onClick={() => updateStep2({ ownsDomain: false })}
              className={cn(
                'rounded-xl border p-5 text-left transition-colors',
                !step2.ownsDomain
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : 'border-border hover:border-muted-foreground'
              )}
            >
              <h4 className='font-medium'>I need a domain</h4>
              <p className='mt-1 text-sm text-muted-foreground'>
                Help me find and register a new domain
              </p>
            </button>

            <button
              type='button'
              onClick={() => updateStep2({ ownsDomain: true })}
              className={cn(
                'rounded-xl border p-5 text-left transition-colors',
                step2.ownsDomain
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : 'border-border hover:border-muted-foreground'
              )}
            >
              <h4 className='font-medium'>I already have a domain</h4>
              <p className='mt-1 text-sm text-muted-foreground'>
                I own a domain I want to use
              </p>
            </button>
          </div>

          {step2.ownsDomain && (
            <div className='space-y-4'>
              <div className='rounded-lg border border-border p-4'>
                <Label htmlFor='existingDomain'>Your Domain</Label>
                <Input
                  id='existingDomain'
                  placeholder='e.g., mybusiness.com'
                  value={step2.existingDomain}
                  onChange={(e) => updateStep2({ existingDomain: e.target.value })}
                  className='mt-2'
                />
                <HelperText>Enter your domain without https:// (e.g., mybusiness.com)</HelperText>
              </div>
              <div className='rounded-lg border border-border p-4'>
                <Label htmlFor='domainRegistrar'>Who did you purchase the domain from?</Label>
                <Input
                  id='domainRegistrar'
                  placeholder='e.g., GoDaddy, Namecheap, Google Domains'
                  value={step2.domainRegistrar}
                  onChange={(e) => updateStep2({ domainRegistrar: e.target.value })}
                  className='mt-2'
                />
                <HelperText>Common options include GoDaddy, Namecheap, Google Domains, or Cloudflare.</HelperText>
              </div>
            </div>
          )}

          {!step2.ownsDomain && (
            <div className='space-y-4'>
              <div className='rounded-lg border border-border bg-muted/30 p-4'>
                <p className='text-sm text-muted-foreground'>
                  <strong className='text-foreground'>No worries!</strong> You&apos;ll get a free subdomain like <span className='text-emerald-400'>yourbusiness.freewebsite.deal</span>, and you can search for a custom domain later in the process.
                </p>
              </div>
              <div>
                <Label htmlFor='desiredDomain'>Desired Domain (optional)</Label>
                <Input
                  id='desiredDomain'
                  placeholder='e.g., mybusiness.com'
                  value={step2.desiredDomain}
                  onChange={(e) => updateStep2({ desiredDomain: e.target.value })}
                  className='mt-2'
                />
                <HelperText>If you have a domain name in mind, enter it here and we&apos;ll check availability.</HelperText>
              </div>
            </div>
          )}
        </div>

        {/* Social Media Links */}
        <div className='space-y-4'>
          <div>
            <h3 className='text-sm font-medium'>Social Media Profiles</h3>
            <p className='mt-1 text-xs text-muted-foreground'>
              Add your social media links so we can display them on your website and match your brand voice.
            </p>
          </div>
          
          <div className='grid gap-4 sm:grid-cols-2'>
            {SOCIAL_PLATFORMS.map((platform) => {
              const fieldKey = platform.field as keyof typeof step2;
              const value = (step2[fieldKey] as string) || '';
              return (
                <div key={platform.value}>
                  <Label htmlFor={platform.field}>{platform.label}</Label>
                  <Input
                    id={platform.field}
                    placeholder={`https://${platform.value === 'google_business' ? 'g.page' : platform.value + '.com'}/yourbusiness`}
                    value={value}
                    onChange={(e) => updateStep2({ [platform.field]: e.target.value })}
                    className='mt-2'
                  />
                </div>
              );
            })}
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
          disabled={saving}
          className='bg-emerald-500 px-8 text-black hover:bg-emerald-400'
        >
          {saving ? 'Saving…' : 'Continue →'}
        </Button>
      </div>
    </div>
  );
}
