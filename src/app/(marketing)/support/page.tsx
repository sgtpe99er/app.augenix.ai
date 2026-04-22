'use client';

import { useState } from 'react';
import { IoMail, IoSend, IoCheckmarkCircle, IoAlertCircle } from 'react-icons/io5';

import { Container } from '@/components/container';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function SupportPage() {
  const [formState, setFormState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormState('loading');
    setErrorMessage('');

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      subject: formData.get('subject') as string,
      message: formData.get('message') as string,
    };

    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Failed to send message');
      }

      setFormState('success');
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      setFormState('error');
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong');
    }
  }

  return (
    <div className='py-16 lg:py-24'>
      <Container className='max-w-2xl'>
        <div className='mb-12 text-center'>
          <div className='mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100'>
            <IoMail className='h-8 w-8 text-emerald-600' />
          </div>
          <h1 className='mb-4 text-3xl font-bold text-gray-900 lg:text-4xl'>Get Support</h1>
          <p className='text-lg text-gray-600'>
            Have a question or need help? Fill out the form below and we&apos;ll get back to you as soon as possible.
          </p>
        </div>

        {formState === 'success' ? (
          <div className='rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center'>
            <IoCheckmarkCircle className='mx-auto mb-4 h-12 w-12 text-emerald-500' />
            <h2 className='mb-2 text-xl font-semibold text-gray-900'>Message Sent!</h2>
            <p className='text-gray-600'>
              Thank you for reaching out. We&apos;ll get back to you soon!
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className='space-y-6'>
            <div className='grid gap-6 sm:grid-cols-2'>
              <div className='space-y-2'>
                <Label htmlFor='name'>Name</Label>
                <Input
                  id='name'
                  name='name'
                  type='text'
                  placeholder='Your name'
                  required
                  disabled={formState === 'loading'}
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='email'>Email</Label>
                <Input
                  id='email'
                  name='email'
                  type='email'
                  placeholder='you@example.com'
                  required
                  disabled={formState === 'loading'}
                />
              </div>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='subject'>Subject</Label>
              <Input
                id='subject'
                name='subject'
                type='text'
                placeholder='How can we help?'
                required
                disabled={formState === 'loading'}
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='message'>Message</Label>
              <Textarea
                id='message'
                name='message'
                placeholder='Tell us more about your question or issue...'
                rows={6}
                required
                disabled={formState === 'loading'}
              />
            </div>

            {formState === 'error' && (
              <div className='flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700'>
                <IoAlertCircle className='h-5 w-5 flex-shrink-0' />
                <span>{errorMessage}</span>
              </div>
            )}

            <Button
              type='submit'
              size='lg'
              className='w-full bg-emerald-500 hover:bg-emerald-600'
              disabled={formState === 'loading'}
            >
              {formState === 'loading' ? (
                'Sending...'
              ) : (
                <>
                  <IoSend className='mr-2 h-5 w-5' />
                  Send Message
                </>
              )}
            </Button>
          </form>
        )}
      </Container>
    </div>
  );
}
