'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { IoMail, IoKey } from 'react-icons/io5';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { ActionResponse } from '@/types/action-response';

const titleMap = {
  login: 'Welcome back',
  signup: 'Create your account',
} as const;

const subtitleMap = {
  login: 'Sign in to your account',
  signup: 'Enter your email to get your dashboard sign-in link',
} as const;

type AuthMethod = 'select' | 'password' | 'magic-link';

export function AuthUI({
  mode,
  signInWithMagicLink,
  signUpWithPassword,
  signInWithPassword,
  resetPassword,
}: {
  mode: 'login' | 'signup';
  signInWithMagicLink: (email: string) => Promise<ActionResponse>;
  signUpWithPassword: (email: string, password: string) => Promise<ActionResponse>;
  signInWithPassword: (email: string, password: string) => Promise<ActionResponse>;
  resetPassword: (email: string) => Promise<ActionResponse>;
}) {
  const [pending, setPending] = useState(false);
  const [authMethod, setAuthMethod] = useState<AuthMethod>('select');
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  async function handleMagicLinkSubmit(event: FormEvent<HTMLFormElement>) {
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

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const form = event.target as HTMLFormElement;
    const email = form['email'].value;
    const password = form['password'].value;

    if (mode === 'signup') {
      const response = await signUpWithPassword(email, password);
      if (response && !response.error) {
        toast({
          description: 'Account created! Check your email to confirm your account.',
        });
      } else if (response?.error) {
        toast({
          variant: 'destructive',
          description: response.error.message || 'An error occurred. Please try again.',
        });
      }
      setPending(false);
      return;
    }

    // Login: signInWithPassword redirects server-side on success.
    // If the await resolves, it's an error response.
    const response = await signInWithPassword(email, password);
    if (response?.error) {
      toast({
        variant: 'destructive',
        description: response.error.message || 'An error occurred. Please try again.',
      });
      setPending(false);
    }
    // On success the server redirects — no client navigation needed.
  }

  async function handleForgotPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const form = event.target as HTMLFormElement;
    const email = form['email'].value;
    const response = await resetPassword(email);

    if (response?.error) {
      toast({
        variant: 'destructive',
        description: 'An error occurred. Please try again.',
      });
    } else {
      toast({
        description: 'Password reset email sent! Check your inbox.',
      });
      setShowForgotPassword(false);
    }

    form.reset();
    setPending(false);
  }

  if (showForgotPassword) {
    return (
      <section className='mt-8 flex w-full flex-col gap-8 rounded-lg bg-card p-8 text-center'>
        <div className='flex flex-col gap-2'>
          <h1 className='text-2xl font-bold'>Reset Password</h1>
          <p className='text-muted-foreground'>Enter your email to receive a reset link</p>
        </div>
        <form onSubmit={handleForgotPassword} className='flex flex-col gap-4'>
          <Input
            type='email'
            name='email'
            placeholder='Enter your email…'
            aria-label='Enter your email'
            autoComplete='email'
            required
            autoFocus
          />
          <Button type='submit' disabled={pending} className='w-full py-6 bg-emerald-600 text-white hover:bg-emerald-500 disabled:bg-neutral-400'>
            {pending ? 'Sending…' : 'Send Reset Link'}
          </Button>
          <Button
            type='button'
            variant='ghost'
            onClick={() => setShowForgotPassword(false)}
            className='text-neutral-400'
          >
            Back to login
          </Button>
        </form>
      </section>
    );
  }

  return (
    <section className='mt-8 flex w-full flex-col gap-8 rounded-lg bg-card p-8 text-center'>
      <div className='flex flex-col gap-2'>
        <h1 className='text-2xl font-bold'>{titleMap[mode]}</h1>
        <p className='text-muted-foreground'>{subtitleMap[mode]}</p>
      </div>

      {authMethod === 'select' && (
        <div className='flex flex-col gap-4'>
          <p className='text-sm text-muted-foreground'>Choose how you want to {mode === 'login' ? 'sign in' : 'sign up'}:</p>
          
          <button
            className='flex items-center justify-center gap-3 rounded-md bg-emerald-600 py-4 font-medium text-white transition-all hover:bg-emerald-500 disabled:bg-neutral-700'
            onClick={() => setAuthMethod('password')}
            disabled={pending}
          >
            <IoKey size={20} aria-hidden='true' />
            {mode === 'login' ? 'Sign in with Email & Password' : 'Sign up with Email & Password'}
          </button>

          <div className='flex items-center gap-4'>
            <div className='h-px flex-1 bg-zinc-700' />
            <span className='text-sm text-muted-foreground'>or</span>
            <div className='h-px flex-1 bg-zinc-700' />
          </div>

          <button
            className='flex items-center justify-center gap-3 rounded-md bg-blue-600 py-4 font-medium text-white transition-all hover:bg-blue-500 disabled:bg-neutral-700'
            onClick={() => setAuthMethod('magic-link')}
            disabled={pending}
          >
            <IoMail size={20} aria-hidden='true' />
            {mode === 'login' ? 'Sign in with Magic Link' : 'Sign up with Magic Link'}
          </button>

          <p className='mt-2 text-xs text-muted-foreground'>
            Magic link: We&apos;ll email you a link to sign in instantly and go straight to your dashboard - no password needed.
          </p>
        </div>
      )}

      {authMethod === 'password' && (
        <form onSubmit={handlePasswordSubmit} className='flex flex-col gap-4'>
          <Input
            type='email'
            name='email'
            placeholder='Enter your email…'
            aria-label='Enter your email'
            autoComplete='email'
            spellCheck={false}
            required
            autoFocus
          />
          <Input
            type='password'
            name='password'
            placeholder={mode === 'signup' ? 'Create a password (min 6 characters)' : 'Enter your password'}
            aria-label='Enter your password'
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            required
            minLength={6}
          />
          <Button type='submit' disabled={pending} className='w-full py-6 bg-emerald-600 text-white hover:bg-emerald-500 disabled:bg-neutral-400'>
            {pending ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </Button>
          
          {mode === 'login' && (
            <button
              type='button'
              onClick={() => setShowForgotPassword(true)}
              className='text-sm text-muted-foreground hover:text-foreground'
            >
              Forgot your password?
            </button>
          )}
          
          <Button
            type='button'
            variant='ghost'
            onClick={() => setAuthMethod('select')}
            className='text-muted-foreground'
          >
            ← Choose a different method
          </Button>
        </form>
      )}

      {authMethod === 'magic-link' && (
        <form onSubmit={handleMagicLinkSubmit} className='flex flex-col gap-4'>
          <p className='text-sm text-muted-foreground'>
            Enter your email and we&apos;ll send you a magic link to sign in and open your dashboard.
          </p>
          <Input
            type='email'
            name='email'
            placeholder='Enter your email…'
            aria-label='Enter your email'
            autoComplete='email'
            spellCheck={false}
            required
            autoFocus
          />
          <Button type='submit' disabled={pending} className='w-full py-6 bg-blue-600 text-white hover:bg-blue-500 disabled:bg-neutral-400'>
            {pending ? 'Sending…' : 'Send Magic Link'}
          </Button>
          <Button
            type='button'
            variant='ghost'
            onClick={() => setAuthMethod('select')}
            className='text-muted-foreground'
          >
            ← Choose a different method
          </Button>
        </form>
      )}

      <div className='border-t border-border pt-6'>
        {mode === 'signup' ? (
          <p className='text-sm text-muted-foreground'>
            Already have an account?{' '}
            <Link href='/login' className='text-foreground underline hover:text-emerald-400'>
              Sign in
            </Link>
          </p>
        ) : (
          <p className='text-sm text-muted-foreground'>
            Don&apos;t have an account?{' '}
            <Link href='/signup' className='text-foreground underline hover:text-emerald-400'>
              Sign up for free
            </Link>
          </p>
        )}
      </div>

      {mode === 'signup' && (
        <span className='text-xs text-muted-foreground'>
          By signing up, you agree to our{' '}
          <Link href='/terms' className='underline'>
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href='/privacy' className='underline'>
            Privacy Policy
          </Link>
          .
        </span>
      )}
    </section>
  );
}
