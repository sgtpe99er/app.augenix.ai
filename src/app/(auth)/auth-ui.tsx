'use client';

import { FormEvent, useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { ActionResponse } from '@/types/action-response';

export function AuthUI({
  signInWithPassword,
}: {
  signInWithPassword: (email: string, password: string) => Promise<ActionResponse>;
}) {
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const form = event.target as HTMLFormElement;
    const email = form['email'].value;
    const password = form['password'].value;

    const response = await signInWithPassword(email, password);
    if (response?.error) {
      toast({
        variant: 'destructive',
        description: response.error.message || 'An error occurred. Please try again.',
      });
      setPending(false);
    }
    // On success the server redirects
  }

  return (
    <section className='flex w-full max-w-md flex-col gap-8 rounded-sm bg-white p-12 text-center' style={{ backgroundColor: '#ffffff' }}>
      <div className='flex justify-center'>
        <Image
          src='/ARD_LogoRed_LTypeBlack.png'
          alt='Logo'
          width={200}
          height={60}
          className='h-auto w-auto max-h-16'
          priority
        />
      </div>
      <h1 className='text-2xl font-medium' style={{ color: '#191c1e' }}>Sign In</h1>
      <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
        <input
          type='email'
          name='email'
          placeholder='Email'
          autoComplete='email'
          required
          autoFocus
          className='w-full rounded-sm border bg-transparent px-4 py-3 text-sm placeholder:text-gray-500 focus:border-black focus:outline-none'
          style={{ borderColor: 'rgba(25, 28, 30, 0.2)' }}
        />
        <input
          type='password'
          name='password'
          placeholder='Password'
          autoComplete='current-password'
          required
          className='w-full rounded-sm border bg-transparent px-4 py-3 text-sm placeholder:text-gray-500 focus:border-black focus:outline-none'
          style={{ borderColor: 'rgba(25, 28, 30, 0.2)' }}
        />
        <button
          type='submit'
          disabled={pending}
          className='w-full rounded-sm py-4 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50'
          style={{ backgroundColor: '#000000' }}
        >
          {pending ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
    </section>
  );
}
