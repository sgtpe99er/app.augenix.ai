'use client';

import { useOnboarding } from '../context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DomainSearch } from '@/features/domains/components/domain-search';
import { cn } from '@/utils/cn';
import type { DomainRegistrantContact } from '../types';
import { IoShieldCheckmark, IoInformationCircle } from 'react-icons/io5';

const EMPTY_CONTACT: DomainRegistrantContact = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  address1: '',
  city: '',
  state: '',
  zip: '',
  country: 'US',
};

export function Step4Domain() {
  const { data, updateStep4, setCurrentStep, saveStep, saving, saveError } = useOnboarding();
  const { step4 } = data;

  const contact = step4.registrantContact ?? EMPTY_CONTACT;
  const needsRegistrant = step4.needsDomain && !!step4.selectedDomain;

  const updateContact = (fields: Partial<DomainRegistrantContact>) => {
    updateStep4({ registrantContact: { ...contact, ...fields } });
  };

  const isRegistrantComplete = !needsRegistrant || (
    contact.firstName.trim() &&
    contact.lastName.trim() &&
    contact.email.trim() &&
    contact.phone.trim() &&
    contact.address1.trim() &&
    contact.city.trim() &&
    contact.zip.trim() &&
    contact.country.trim()
  );

  const handleNext = async () => {
    if (!isRegistrantComplete) return;
    await saveStep('step4');
    setCurrentStep(5);
  };

  const handleBack = () => setCurrentStep(3);

  const handleDomainSelect = (domain: string, ourPrice: number, vercelPrice: number) => {
    updateStep4({
      selectedDomain: domain,
      selectedDomainOurPrice: ourPrice,
      selectedDomainVercelPrice: vercelPrice,
      requestedDomain: domain,
      domainPrice: ourPrice,
    });
  };

  const handleDomainClear = () => {
    updateStep4({
      selectedDomain: null,
      selectedDomainOurPrice: null,
      selectedDomainVercelPrice: null,
      requestedDomain: '',
      domainPrice: null,
    });
  };

  const businessName = data.step1.businessName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 63);

  return (
    <div className='space-y-6'>
      <div>
        <h2 className='text-2xl font-bold'>Domain Name</h2>
        <p className='mt-2 text-muted-foreground'>
          Do you need a custom domain for your website?
        </p>
      </div>

      <div className='space-y-6'>
        <div className='grid gap-4 sm:grid-cols-2'>
          <button
            type='button'
            onClick={() => {
              updateStep4({ needsDomain: false });
              handleDomainClear();
            }}
            className={cn(
              'rounded-xl border p-6 text-left transition-colors',
              !step4.needsDomain
                ? 'border-emerald-500 bg-emerald-500/10'
                : 'border-border hover:border-muted-foreground'
            )}
          >
            <h3 className='font-semibold'>I already have a domain</h3>
            <p className='mt-2 text-sm text-muted-foreground'>
              I&apos;ll connect my existing domain or use a free subdomain
            </p>
          </button>

          <button
            type='button'
            onClick={() => updateStep4({ needsDomain: true })}
            className={cn(
              'rounded-xl border p-6 text-left transition-colors',
              step4.needsDomain
                ? 'border-emerald-500 bg-emerald-500/10'
                : 'border-border hover:border-muted-foreground'
            )}
          >
            <h3 className='font-semibold'>I need a new domain</h3>
            <p className='mt-2 text-sm text-muted-foreground'>
              Help me register a new domain name
            </p>
          </button>
        </div>

        {step4.needsDomain && (
          <div className='rounded-xl border border-border bg-card p-6'>
            <p className='mb-4 text-sm font-medium text-muted-foreground'>Search for your domain</p>
            <DomainSearch
              selectedDomain={step4.selectedDomain ?? null}
              selectedDomainOurPrice={step4.selectedDomainOurPrice ?? null}
              selectedDomainVercelPrice={step4.selectedDomainVercelPrice ?? null}
              onSelect={handleDomainSelect}
              onClear={handleDomainClear}
              initialQuery={businessName}
            />
          </div>
        )}

        {/* Registrant contact — only shown after a domain is selected */}
        {needsRegistrant && (
          <div className='rounded-xl border border-border bg-card p-6 space-y-5'>
            {/* ICANN explanation */}
            <div className='flex gap-3 rounded-xl border border-blue-500/20 bg-blue-500/10 p-4'>
              <IoShieldCheckmark className='mt-0.5 h-5 w-5 shrink-0 text-blue-400' />
              <div className='space-y-1'>
                <p className='text-sm font-medium text-blue-300'>Why we need this information</p>
                <p className='text-sm text-muted-foreground'>
                  ICANN — the international organization that oversees all domain names — requires verified contact information for every domain registration. This is a legal requirement, not optional.
                </p>
                <p className='text-sm text-muted-foreground'>
                  Your details will be submitted as the official registrant (legal owner) of <strong className='text-foreground'>{step4.selectedDomain}</strong>. They are stored securely and used only for domain registration and any required ICANN communications.
                </p>
              </div>
            </div>

            <div>
              <h3 className='mb-4 font-semibold'>Domain Registrant Contact</h3>

              <div className='grid gap-4 sm:grid-cols-2'>
                <div className='space-y-1.5'>
                  <Label htmlFor='reg-first'>First Name <span className='text-red-400'>*</span></Label>
                  <Input
                    id='reg-first'
                    value={contact.firstName}
                    onChange={(e) => updateContact({ firstName: e.target.value })}
                    placeholder='Jane'
                  />
                </div>
                <div className='space-y-1.5'>
                  <Label htmlFor='reg-last'>Last Name <span className='text-red-400'>*</span></Label>
                  <Input
                    id='reg-last'
                    value={contact.lastName}
                    onChange={(e) => updateContact({ lastName: e.target.value })}
                    placeholder='Smith'
                  />
                </div>
                <div className='space-y-1.5'>
                  <Label htmlFor='reg-email'>Email Address <span className='text-red-400'>*</span></Label>
                  <Input
                    id='reg-email'
                    type='email'
                    value={contact.email}
                    onChange={(e) => updateContact({ email: e.target.value })}
                    placeholder='jane@yourbusiness.com'
                  />
                </div>
                <div className='space-y-1.5'>
                  <Label htmlFor='reg-phone'>Phone Number <span className='text-red-400'>*</span></Label>
                  <Input
                    id='reg-phone'
                    type='tel'
                    value={contact.phone}
                    onChange={(e) => updateContact({ phone: e.target.value })}
                    placeholder='+1 555 000 0000'
                  />
                </div>
                <div className='space-y-1.5 sm:col-span-2'>
                  <Label htmlFor='reg-address'>Street Address <span className='text-red-400'>*</span></Label>
                  <Input
                    id='reg-address'
                    value={contact.address1}
                    onChange={(e) => updateContact({ address1: e.target.value })}
                    placeholder='123 Main St'
                  />
                </div>
                <div className='space-y-1.5'>
                  <Label htmlFor='reg-city'>City <span className='text-red-400'>*</span></Label>
                  <Input
                    id='reg-city'
                    value={contact.city}
                    onChange={(e) => updateContact({ city: e.target.value })}
                    placeholder='Austin'
                  />
                </div>
                <div className='space-y-1.5'>
                  <Label htmlFor='reg-state'>State / Province</Label>
                  <Input
                    id='reg-state'
                    value={contact.state}
                    onChange={(e) => updateContact({ state: e.target.value })}
                    placeholder='TX'
                  />
                </div>
                <div className='space-y-1.5'>
                  <Label htmlFor='reg-zip'>ZIP / Postal Code <span className='text-red-400'>*</span></Label>
                  <Input
                    id='reg-zip'
                    value={contact.zip}
                    onChange={(e) => updateContact({ zip: e.target.value })}
                    placeholder='78701'
                  />
                </div>
                <div className='space-y-1.5'>
                  <Label htmlFor='reg-country'>Country <span className='text-red-400'>*</span></Label>
                  <Input
                    id='reg-country'
                    value={contact.country}
                    onChange={(e) => updateContact({ country: e.target.value })}
                    placeholder='US'
                  />
                </div>
              </div>

              <div className='mt-4 flex items-start gap-2 text-xs text-muted-foreground'>
                <IoInformationCircle className='mt-0.5 h-4 w-4 shrink-0' />
                <p>
                  This information is submitted to ICANN and the domain registry. It will appear in the public WHOIS record unless you opt into WHOIS privacy (included free with your registration).
                </p>
              </div>
            </div>
          </div>
        )}

        {!step4.needsDomain && (
          <div className='rounded-xl bg-muted/50 p-4'>
            <p className='text-sm text-muted-foreground'>
              <strong className='text-foreground'>Free subdomain included:</strong> Your website will be available at{' '}
              <span className='text-emerald-400'>yourbusiness.freewebsite.deal</span>
            </p>
            <p className='mt-2 text-xs text-muted-foreground'>
              You can connect your own domain later if you have one.
            </p>
          </div>
        )}
      </div>

      {saveError && <p className='text-sm text-red-400'>{saveError}</p>}
      {needsRegistrant && !isRegistrantComplete && (
        <p className='text-sm text-amber-400'>Please fill in all required registrant fields above to continue.</p>
      )}
      <div className='flex justify-between pt-4'>
        <Button variant='outline' onClick={handleBack}>
          ← Back
        </Button>
        <Button
          onClick={handleNext}
          disabled={saving || !isRegistrantComplete}
          className='bg-emerald-500 px-8 text-black hover:bg-emerald-400 disabled:opacity-50'
        >
          {saving ? 'Saving…' : 'Review Summary →'}
        </Button>
      </div>
    </div>
  );
}
