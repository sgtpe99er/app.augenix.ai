'use client';

import { FormEvent, useState } from 'react';

import { signInWithMagicLink } from '@/app/(auth)/auth-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';

export function HeroEmailSignup() {
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const form = event.target as HTMLFormElement;
    const email = form['email'].value;
    const response = await signInWithMagicLink(email);

    if (response?.error) {
      toast({
        variant: 'destructive',
        description: 'An error occurred. Please try again.',
      });
    } else {
      toast({
        description: `Check your email for your sign-in link to access your dashboard: ${email}`,
      });
    }

    form.reset();
    setPending(false);
  }

  return (
    <form onSubmit={handleSubmit} className='flex flex-col items-center gap-4'>
      <Input
        type='email'
        name='email'
        placeholder='Enter your email'
        aria-label='Enter your email'
        required
        className='h-12 w-80 border-2 border-white/30 bg-white/20 px-4 text-base text-white placeholder:text-white/70 focus:border-white focus:ring-white'
      />
      <Button
        type='submit'
        disabled={pending}
        size='lg'
        className='bg-white px-8 py-6 text-lg font-semibold text-emerald-700 hover:bg-emerald-50 disabled:bg-gray-300'
      >
        {pending ? 'Sending...' : 'Get Started for Free →'}
      </Button>
    </form>
  );
}
