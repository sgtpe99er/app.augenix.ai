'use client';

import { useState } from 'react';
import { useOnboarding } from '../context';
import { INDUSTRIES, DAYS_OF_WEEK } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { IoInformationCircle, IoChevronDown, IoChevronUp } from 'react-icons/io5';

function HelperText({ children }: { children: React.ReactNode }) {
  return <p className='mt-1 text-xs text-muted-foreground'>{children}</p>;
}

export function Step1Business() {
  const { data, updateStep1, setCurrentStep, saveStep, saving, saveError } = useOnboarding();
  const { step1 } = data;
  const [showHours, setShowHours] = useState(false);

  const isValid =
    step1.businessName.trim() !== '' &&
    step1.industry !== '' &&
    (step1.industry !== 'other' || step1.industryOther.trim() !== '') &&
    step1.addressCity.trim() !== '' &&
    step1.addressCountry.trim() !== '';

  const handleNext = async () => {
    if (!isValid) return;
    await saveStep('step1');
    setCurrentStep(2);
    window.scrollTo(0, 0);
  };

  const updateHours = (day: string, value: string) => {
    const parts = value.split('-').map(s => s.trim());
    const newHours = {
      ...step1.hours,
      [day]: value.trim() ? { open: parts[0] || '', close: parts[1] || '' } : null,
    };
    updateStep1({ hours: newHours });
  };

  const getHoursDisplay = (day: string) => {
    const h = step1.hours?.[day];
    if (!h) return '';
    return h.open && h.close ? `${h.open} - ${h.close}` : h.open || '';
  };

  return (
    <div className='space-y-6'>
      {/* Header with explanation */}
      <div>
        <h2 className='text-2xl font-bold'>Tell us about your business</h2>
        <p className='mt-2 text-muted-foreground'>
          This helps us create the perfect website for you.
        </p>
        <div className='mt-4 flex gap-3 rounded-lg border border-blue-500/20 bg-blue-500/10 p-4'>
          <IoInformationCircle className='mt-0.5 h-5 w-5 shrink-0 text-blue-400' />
          <p className='text-sm text-muted-foreground'>
            <strong className='text-blue-300'>You don&apos;t need to fill out everything.</strong> Just provide what you can — the more information you share, the better we can tailor your website to your needs. Fields marked with * are required.
          </p>
        </div>
      </div>

      <div className='space-y-5'>
        {/* Business Name & Industry */}
        <div className='grid gap-4 sm:grid-cols-2'>
          <div>
            <Label htmlFor='businessName'>Business Name *</Label>
            <Input
              id='businessName'
              placeholder="e.g., Joe's Coffee Shop"
              value={step1.businessName}
              onChange={(e) => updateStep1({ businessName: e.target.value })}
              className='mt-2'
            />
            <HelperText>Your official business name as you want it displayed.</HelperText>
          </div>

          <div>
            <Label htmlFor='industry'>Industry *</Label>
            <Select
              value={step1.industry}
              onValueChange={(value) => updateStep1({ industry: value })}
            >
              <SelectTrigger className='mt-2'>
                <SelectValue placeholder='Select your industry' />
              </SelectTrigger>
              <SelectContent>
                {INDUSTRIES.map((industry) => (
                  <SelectItem key={industry.value} value={industry.value}>
                    {industry.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <HelperText>Helps us use the right design style and terminology.</HelperText>
          </div>
        </div>

        {step1.industry === 'other' && (
          <div>
            <Label htmlFor='industryOther'>Please specify your industry *</Label>
            <Input
              id='industryOther'
              placeholder='e.g., Pet Grooming'
              value={step1.industryOther}
              onChange={(e) => updateStep1({ industryOther: e.target.value })}
              className='mt-2'
            />
          </div>
        )}

        {/* Tagline & Year */}
        <div className='grid gap-4 sm:grid-cols-2'>
          <div>
            <Label htmlFor='tagline'>Tagline</Label>
            <Input
              id='tagline'
              placeholder='e.g., Quality coffee since 1995'
              value={step1.tagline}
              onChange={(e) => updateStep1({ tagline: e.target.value })}
              className='mt-2'
            />
            <HelperText>A short phrase that captures what makes you special.</HelperText>
          </div>
          <div>
            <Label htmlFor='yearEstablished'>Year Established</Label>
            <Input
              id='yearEstablished'
              type='number'
              placeholder='e.g., 2015'
              value={step1.yearEstablished ?? ''}
              onChange={(e) => updateStep1({ yearEstablished: e.target.value ? parseInt(e.target.value) : null })}
              className='mt-2'
            />
            <HelperText>Shows customers how long you&apos;ve been in business.</HelperText>
          </div>
        </div>

        {/* Description */}
        <div>
          <Label htmlFor='description'>Business Description</Label>
          <Textarea
            id='description'
            placeholder='Tell us about your business, what you do, and what makes you unique...'
            value={step1.description}
            onChange={(e) => updateStep1({ description: e.target.value })}
            className='mt-2 min-h-[100px]'
          />
          <HelperText>A brief overview of your business. This may appear on your About page.</HelperText>
        </div>

        {/* Address Section */}
        <div className='space-y-4'>
          <h3 className='text-sm font-medium text-muted-foreground'>Business Address</h3>
          <div>
            <Label htmlFor='addressStreet'>Street Address</Label>
            <Input
              id='addressStreet'
              placeholder='e.g., 123 Main Street'
              value={step1.addressStreet}
              onChange={(e) => updateStep1({ addressStreet: e.target.value })}
              className='mt-2'
            />
          </div>
          <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
            <div>
              <Label htmlFor='addressCity'>City *</Label>
              <Input
                id='addressCity'
                placeholder='e.g., Austin'
                value={step1.addressCity}
                onChange={(e) => updateStep1({ addressCity: e.target.value })}
                className='mt-2'
              />
            </div>
            <div>
              <Label htmlFor='addressState'>State/Province</Label>
              <Input
                id='addressState'
                placeholder='e.g., TX'
                value={step1.addressState}
                onChange={(e) => updateStep1({ addressState: e.target.value })}
                className='mt-2'
              />
            </div>
            <div>
              <Label htmlFor='addressZip'>ZIP/Postal Code</Label>
              <Input
                id='addressZip'
                placeholder='e.g., 78701'
                value={step1.addressZip}
                onChange={(e) => updateStep1({ addressZip: e.target.value })}
                className='mt-2'
              />
            </div>
            <div>
              <Label htmlFor='addressCountry'>Country *</Label>
              <Input
                id='addressCountry'
                placeholder='e.g., USA'
                value={step1.addressCountry}
                onChange={(e) => updateStep1({ addressCountry: e.target.value })}
                className='mt-2'
              />
            </div>
          </div>
          <HelperText>Your business location helps with local SEO and shows customers where you&apos;re based.</HelperText>
        </div>

        {/* Contact Info */}
        <div className='space-y-4'>
          <h3 className='text-sm font-medium text-muted-foreground'>Contact Information</h3>
          <div className='grid gap-4 sm:grid-cols-3'>
            <div>
              <Label htmlFor='phonePrimary'>Primary Phone</Label>
              <Input
                id='phonePrimary'
                type='tel'
                placeholder='e.g., (512) 555-1234'
                value={step1.phonePrimary}
                onChange={(e) => updateStep1({ phonePrimary: e.target.value })}
                className='mt-2'
              />
            </div>
            <div>
              <Label htmlFor='phoneSecondary'>Secondary Phone</Label>
              <Input
                id='phoneSecondary'
                type='tel'
                placeholder='e.g., (512) 555-5678'
                value={step1.phoneSecondary}
                onChange={(e) => updateStep1({ phoneSecondary: e.target.value })}
                className='mt-2'
              />
            </div>
            <div>
              <Label htmlFor='emailPublic'>Public Email</Label>
              <Input
                id='emailPublic'
                type='email'
                placeholder='e.g., info@yourbusiness.com'
                value={step1.emailPublic}
                onChange={(e) => updateStep1({ emailPublic: e.target.value })}
                className='mt-2'
              />
            </div>
          </div>
          <HelperText>Contact info displayed on your website for customers to reach you.</HelperText>
        </div>

        {/* Business Hours (collapsible) */}
        <div className='space-y-3'>
          <button
            type='button'
            onClick={() => setShowHours(!showHours)}
            className='flex w-full items-center justify-between rounded-lg border border-border bg-muted/50 px-4 py-3 text-left transition-colors hover:bg-muted'
          >
            <span className='text-sm font-medium'>Business Hours</span>
            {showHours ? <IoChevronUp className='h-4 w-4' /> : <IoChevronDown className='h-4 w-4' />}
          </button>
          {showHours && (
            <div className='space-y-2 rounded-lg border border-border p-4'>
              <p className='mb-3 text-xs text-muted-foreground'>Enter hours like &quot;9:00 AM - 5:00 PM&quot; or leave blank if closed.</p>
              {DAYS_OF_WEEK.map((day) => (
                <div key={day.value} className='flex items-center gap-3'>
                  <span className='w-24 text-sm'>{day.label}</span>
                  <Input
                    placeholder='e.g., 9:00 AM - 5:00 PM'
                    value={getHoursDisplay(day.value)}
                    onChange={(e) => updateHours(day.value, e.target.value)}
                    className='flex-1'
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {saveError && <p className='text-sm text-red-400'>{saveError}</p>}
      <div className='flex justify-end pt-4'>
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
