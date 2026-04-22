'use client';

import { useMemo, useState } from 'react';
import { IoCheckmarkCircle, IoShield, IoCheckmark, IoLockClosed } from 'react-icons/io5';

import { Container } from '@/components/container';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn';

interface PriceOption {
  id: string;
  unitAmount: number;
  currency: string;
  type: string;
  interval: string | null;
  intervalCount: number | null;
  productName: string;
  productDescription: string | null;
}

interface PaymentPageProps {
  prices: PriceOption[];
  oneMoId?: string;
  sixMoId?: string;
  twelveId?: string;
  lifetimeId?: string;
}

function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
  }).format(amount / 100);
}

function getPlanLabel(price: PriceOption, oneMoId?: string, sixMoId?: string, twelveId?: string, lifetimeId?: string): string {
  if (price.id === lifetimeId) return 'Lifetime Hosting';
  if (price.id === twelveId) return '12 Months';
  if (price.id === sixMoId) return '6 Months';
  if (price.id === oneMoId) return 'Monthly';
  return price.productName;
}

function getMonthlyRate(price: PriceOption, oneMoId?: string, sixMoId?: string, twelveId?: string): string | null {
  if (price.id === oneMoId) return null;
  if (price.id === sixMoId) return `$${Math.round(price.unitAmount / 100 / 6)}/month`;
  if (price.id === twelveId) {
    const perMonth = (price.unitAmount / 100 / 12).toFixed(2).replace(/\.00$/, '');
    return `$${perMonth}/month`;
  }
  return null;
}

function sortOrderIndex(price: PriceOption, lifetimeId?: string, twelveId?: string, sixMoId?: string, oneMoId?: string): number {
  if (price.id === lifetimeId) return 0;
  if (price.id === twelveId) return 1;
  if (price.id === sixMoId) return 2;
  if (price.id === oneMoId) return 3;
  return 999;
}

export function PaymentPage({
  prices,
  oneMoId,
  sixMoId,
  twelveId,
  lifetimeId,
}: PaymentPageProps) {
  const sortedPrices = useMemo(() => {
    return [...prices].sort((a, b) => {
      const ai = sortOrderIndex(a, lifetimeId, twelveId, sixMoId, oneMoId);
      const bi = sortOrderIndex(b, lifetimeId, twelveId, sixMoId, oneMoId);
      return ai - bi;
    });
  }, [prices, lifetimeId, twelveId, sixMoId, oneMoId]);

  // Default to Lifetime plan
  const defaultPriceId = lifetimeId ?? sortedPrices[0]?.id ?? '';
  const [selectedId, setSelectedId] = useState<string>(defaultPriceId);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [showMorePlans, setShowMorePlans] = useState(false);

  const selectedPrice = sortedPrices.find((p) => p.id === selectedId) ?? sortedPrices[0];
  const hostingPrice = selectedPrice ? selectedPrice.unitAmount / 100 : 0;
  
  // Calculate savings vs monthly over 2 years
  const monthlyPrice = sortedPrices.find((p) => p.id === oneMoId);
  const lifetimePrice = sortedPrices.find((p) => p.id === lifetimeId);
  const monthlyCostOver2Years = monthlyPrice ? (monthlyPrice.unitAmount / 100) * 24 : 0;
  const lifetimeSavings = lifetimePrice ? monthlyCostOver2Years - (lifetimePrice.unitAmount / 100) : 0;

  const handleCheckout = async () => {
    setError('');
    setProcessing(true);
    try {
      const body: Record<string, unknown> = { priceId: selectedId };
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.');
        return;
      }
      window.location.href = data.url;
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const includedItems = [
    { name: '🎨 Professional Custom Logo Design', description: 'Stand out instantly and build brand trust', originalPrice: '$100' },
    { name: '🌈 Brand Color Palette', description: 'Colors that convert visitors into customers', originalPrice: '$50' },
    { name: '✍️ Typography Selection', description: 'Professional fonts that make your site look premium', originalPrice: '$50' },
    { name: '📘 Full Branding Guide PDF', description: 'Step-by-step guide to consistent branding', originalPrice: '$1,000' },
    { name: '🖼️ Website Design (3 Custom Options)', description: 'Choose the look that fits your business', originalPrice: '$500' },
    { name: '💻 Full Website Development', description: 'Modern, fast-loading site built for you', originalPrice: '$2,500' },
    { name: '📱 Mobile Optimization', description: 'Looks perfect on phones & tablets', originalPrice: '$300' },
    { name: '✏️ 5 Monthly Edits', description: 'Keep your site fresh without extra cost', originalPrice: '$200/mo' },
    { name: '🔍 On-Page SEO Optimization', description: 'Rank higher on Google from day one', originalPrice: '$1,000' },
    { name: '🤖 AI/LLM Optimization', description: 'Make your site ready for future AI search', originalPrice: '$500' },
    { name: '🛡️ Anti-GoDaddy Creed: Lifetime Free Upgrades', description: 'Never pay for updates again', originalPrice: '$500' },
    { name: '💬 Lifetime Human Customer Support', description: 'Real people help you anytime', originalPrice: 'Invaluable' },
  ];

  const selectedPlanLabel = selectedPrice 
    ? getPlanLabel(selectedPrice, oneMoId, sixMoId, twelveId, lifetimeId) 
    : 'Hosting';
  
  const isLifetimeSelected = selectedId === lifetimeId;

  return (
    <div className='min-h-screen'>
      <div className='py-8'>
        <Container className='max-w-5xl'>
          {/* Main Headline */}
          <div className='mb-8 text-center'>
            <h1 className='text-3xl font-bold lg:text-4xl'>Choose Your Hosting Plan</h1>
          </div>

          {/* What's Included - Value Section (hidden for now) */}
          <div className='mb-8 rounded-xl border border-border bg-card p-6 lg:p-8 hidden'>
            <div className='mb-6 text-center'>
              <h2 className='text-2xl font-bold lg:text-3xl'>
                Total Value Delivered: <span className='text-emerald-500'>$6,700</span> – You Pay <span className='text-emerald-500'>$0</span> for All of This!
              </h2>
            </div>
            <div className='mx-auto w-full space-y-2 lg:w-3/4'>
              {includedItems.map((item, index) => (
                <div key={index} className='flex flex-col gap-1 rounded-lg bg-muted px-4 py-3 sm:flex-row sm:items-center sm:justify-between'>
                  <div className='flex items-start gap-3'>
                    <IoCheckmarkCircle className='mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-500' />
                    <div>
                      <p className='font-semibold'>{item.name}</p>
                      <p className='text-sm text-muted-foreground'>{item.description}</p>
                    </div>
                  </div>
                  <p className='flex items-center gap-2 pl-8 text-muted-foreground sm:pl-0'>
                    <span className='text-base'>Value:</span>
                    <span className='text-lg line-through'>{item.originalPrice}</span>
                    <span className='text-xl font-bold text-emerald-500'>FREE!</span>
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className='grid gap-8 lg:grid-cols-3'>
            {/* Main Content */}
            <div className='lg:col-span-2 space-y-6'>
              {/* Hosting Plans */}
              <div className='rounded-xl bg-card border border-border p-6'>
                <h2 className='mb-4 text-xl font-semibold'>Select Your Hosting Plan</h2>
                <div className='space-y-4'>
                  {sortedPrices
                    .filter((price) => {
                      const isMonthly = price.id === oneMoId;
                      return !isMonthly || showMorePlans;
                    })
                    .map((price) => {
                    const selected = price.id === selectedId;
                    const planLabel = getPlanLabel(price, oneMoId, sixMoId, twelveId, lifetimeId);
                    const monthlyRate = getMonthlyRate(price, oneMoId, sixMoId, twelveId);
                    const isLifetime = price.id === lifetimeId;
                    
                    return (
                      <button
                        key={price.id}
                        onClick={() => setSelectedId(price.id)}
                        className={cn(
                          'relative w-full rounded-xl border-2 px-6 py-6 text-left transition-all',
                          isLifetime && 'ring-2 ring-emerald-500/50',
                          selected
                            ? 'border-emerald-500 bg-emerald-500/10'
                            : 'border-border hover:border-muted-foreground',
                          isLifetime && !selected && 'border-emerald-500/50'
                        )}
                      >
                        {isLifetime && (
                          <span className='absolute -top-3 left-4 rounded-full bg-emerald-500 px-4 py-1 text-sm font-bold text-black'>
                            🏆 Best Value – Most Popular
                          </span>
                        )}
                        <div className='flex items-start justify-between gap-4'>
                          <div className='flex-1'>
                            <p className={cn('text-lg font-bold', isLifetime && 'text-xl')}>{planLabel}</p>
                            <p className={cn('mt-2 font-bold', selected ? 'text-emerald-400' : '', isLifetime ? 'text-4xl' : 'text-3xl')}>
                              {formatAmount(price.unitAmount, price.currency)}
                            </p>
                            {isLifetime && (
                              <div className='mt-3 space-y-2'>
                                <p className='text-base font-semibold text-emerald-400'>
                                  Pay Once, Host Forever! 🔥 Only 98 spots left!
                                </p>
                                <p className='text-sm text-muted-foreground'>
                                  $16.65/month over 5 years (even cheaper the longer you go!)
                                </p>
                              </div>
                            )}
                            {monthlyRate && (
                              <p className='mt-1 text-sm text-muted-foreground'>{monthlyRate}</p>
                            )}
                          </div>
                          <div className={cn(
                            'mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                            selected ? 'border-emerald-500 bg-emerald-500' : 'border-muted-foreground'
                          )}>
                            {selected && <IoCheckmark className='h-4 w-4 text-black' />}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                
                {/* See More Toggle */}
                {!showMorePlans && (
                  <button
                    onClick={() => setShowMorePlans(true)}
                    className='mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors'
                  >
                    See More Options ▼
                  </button>
                )}
              </div>

            </div>

            {/* Order Summary - Sticky */}
            <div className='lg:col-span-1'>
              <div className='sticky top-4 rounded-xl bg-card border border-border p-6'>
                <h2 className='mb-4 text-xl font-semibold'>Order Summary</h2>
                
                <div className='space-y-3 border-b border-border pb-4'>
                  <div className='flex justify-between'>
                    <span className='font-medium'>{selectedPlanLabel}</span>
                    <span className='font-bold'>${hostingPrice.toFixed(0)}</span>
                  </div>
                </div>

                <div className='mt-4 flex justify-between text-xl font-bold'>
                  <span>Total Due Today</span>
                  <span className='text-emerald-400'>${hostingPrice.toFixed(2)}</span>
                </div>

                {error && (
                  <p className='mt-4 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400'>{error}</p>
                )}

                <Button
                  onClick={handleCheckout}
                  disabled={processing}
                  className='mt-6 w-full h-16 bg-emerald-500 text-xl font-bold text-black hover:bg-emerald-400 transition-all hover:scale-[1.02]'
                >
                  {processing ? 'Redirecting to checkout…' : 'Start Risk-Free Today'}
                </Button>

                {/* Trust Signals */}
                <div className='mt-4 flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground'>
                  <span className='flex items-center gap-1.5'>
                    <IoLockClosed className='h-5 w-5' />
                    Secure Payment
                  </span>
                  <span className='flex items-center gap-1.5'>
                    <IoShield className='h-5 w-5' />
                    Stripe Protected
                  </span>
                </div>

                <p className='mt-3 text-center text-sm text-muted-foreground'>
                  ✅ No Risk • 30-Day Money-Back Guarantee
                </p>
              </div>
            </div>
          </div>

          {/* Mobile Floating CTA */}
          <div className='fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card p-4 lg:hidden'>
            <div className='flex items-center justify-between gap-4'>
              <div>
                <p className='text-sm text-muted-foreground'>{selectedPlanLabel}</p>
                <p className='text-xl font-bold text-emerald-400'>${hostingPrice.toFixed(2)}</p>
              </div>
              <Button
                onClick={handleCheckout}
                disabled={processing}
                className='h-12 flex-1 bg-emerald-500 text-base font-bold text-black hover:bg-emerald-400'
              >
                {processing ? 'Loading…' : 'Get My Free Website!'}
              </Button>
            </div>
          </div>

          {/* Spacer for mobile floating CTA */}
          <div className='h-24 lg:hidden' />
        </Container>
      </div>
    </div>
  );
}
