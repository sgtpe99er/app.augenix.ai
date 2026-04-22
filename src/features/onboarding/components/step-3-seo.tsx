'use client';

import { useState } from 'react';
import { useOnboarding } from '../context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { IoInformationCircle, IoAdd, IoClose } from 'react-icons/io5';

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  return (
    <div>
      <Label>{label}</Label>
      {value.length > 0 && (
        <div className='mt-2 flex flex-wrap gap-2'>
          {value.map((tag) => (
            <span
              key={tag}
              className='flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-sm'
            >
              {tag}
              <button
                type='button'
                onClick={() => removeTag(tag)}
                className='ml-1 text-muted-foreground hover:text-foreground'
              >
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
          onKeyDown={handleKeyDown}
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

export function Step3Seo() {
  const { data, updateStep3, setCurrentStep, saveStep, saving, saveError } = useOnboarding();
  const { step3 } = data;

  const isValid =
    step3.targetAudience.trim() !== '' &&
    step3.servicesProducts.trim() !== '';

  const handleNext = async () => {
    if (!isValid) return;
    await saveStep('step3');
    setCurrentStep(4);
    window.scrollTo(0, 0);
  };

  const handleBack = () => setCurrentStep(2);

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div>
        <h2 className='text-2xl font-bold'>SEO & Target Market</h2>
        <p className='mt-2 text-muted-foreground'>
          Help us understand who you serve and how customers find you.
        </p>
        <div className='mt-4 flex gap-3 rounded-lg border border-blue-500/20 bg-blue-500/10 p-4'>
          <IoInformationCircle className='mt-0.5 h-5 w-5 shrink-0 text-blue-400' />
          <p className='text-sm text-muted-foreground'>
            <strong className='text-blue-300'>This information improves your search rankings.</strong> The more specific you are about your services and target customers, the better your website will perform in Google searches.
          </p>
        </div>
      </div>

      <div className='space-y-5'>
        {/* Target Audience */}
        <div>
          <Label htmlFor='targetAudience'>Who are your ideal customers? *</Label>
          <Textarea
            id='targetAudience'
            placeholder='e.g., Homeowners in Austin aged 30-60 who need reliable plumbing services. Also serve property managers and small businesses.'
            value={step3.targetAudience}
            onChange={(e) => updateStep3({ targetAudience: e.target.value })}
            className='mt-2 min-h-[100px]'
          />
          <HelperText>Describe who typically buys from you. Include demographics, location, and needs.</HelperText>
        </div>

        {/* Services/Products */}
        <div>
          <Label htmlFor='servicesProducts'>What services or products do you offer? *</Label>
          <Textarea
            id='servicesProducts'
            placeholder='e.g., Emergency plumbing repairs, water heater installation and repair, drain cleaning, bathroom remodeling, pipe replacement, leak detection...'
            value={step3.servicesProducts}
            onChange={(e) => updateStep3({ servicesProducts: e.target.value })}
            className='mt-2 min-h-[100px]'
          />
          <HelperText>List everything you offer. Be specific — this helps with SEO.</HelperText>
        </div>

        {/* Target Locations */}
        <TagInput
          label='Target Locations'
          value={step3.targetLocations || []}
          onChange={(val) => updateStep3({ targetLocations: val })}
          placeholder='e.g., Austin, Round Rock, Cedar Park'
          helperText='Cities or areas you serve. Press Enter or click + to add each location.'
        />

        {/* Service Area */}
        <div className='grid gap-4 sm:grid-cols-2'>
          <div>
            <Label htmlFor='serviceAreaRadius'>Service Area Radius</Label>
            <Input
              id='serviceAreaRadius'
              placeholder='e.g., 30 miles'
              value={step3.serviceAreaRadius}
              onChange={(e) => updateStep3({ serviceAreaRadius: e.target.value })}
              className='mt-2'
            />
            <HelperText>How far do you travel for customers?</HelperText>
          </div>
          <div>
            <Label htmlFor='serviceAreaDescription'>Service Area Description</Label>
            <Input
              id='serviceAreaDescription'
              placeholder='e.g., Greater Austin area and Hill Country'
              value={step3.serviceAreaDescription}
              onChange={(e) => updateStep3({ serviceAreaDescription: e.target.value })}
              className='mt-2'
            />
            <HelperText>A brief description of your coverage area.</HelperText>
          </div>
        </div>

        {/* Service Keywords */}
        <TagInput
          label='SEO Keywords'
          value={step3.serviceKeywords || []}
          onChange={(val) => updateStep3({ serviceKeywords: val })}
          placeholder='e.g., plumber austin tx'
          helperText='Words people might search to find your business. Think about what you&apos;d type into Google.'
        />

        {/* Competitor URLs */}
        <TagInput
          label='Competitor Websites'
          value={step3.competitorUrls || []}
          onChange={(val) => updateStep3({ competitorUrls: val })}
          placeholder='e.g., https://competitor.com'
          helperText='Websites of competitors you admire or want to outrank. We&apos;ll analyze them for inspiration.'
        />
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
