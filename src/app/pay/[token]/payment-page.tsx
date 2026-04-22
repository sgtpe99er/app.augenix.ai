
'use client';

import { useEffect, useMemo, useState } from 'react';
import { IoCard, IoCheckmark, IoLockClosed } from 'react-icons/io5';
import { cn } from '@/utils/cn';

interface PriceOption {
  id: string;
  unitAmount: number;
  currency: string;
  type: string;
  interval: string | null;
  productName: string;
  productDescription: string | null;
}

interface PaymentPageProps {
  token: string;
  email: string;
  businessName: string | null;
  note: string | null;
  prices: PriceOption[];
}

function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
  }).format(amount / 100);
}

const INTERVAL_LABELS: Record<string, string> = {
  month: 'month',
  year: 'year',
  // Stripe uses 'month' with interval_count for multi-month — we override by price ID below
};


function billingLabel(price: PriceOption, sixMoId?: string): string {
  const amt = formatAmount(price.unitAmount, price.currency);
  if (price.type !== 'recurring' || !price.interval) return `${amt} one-time`;
  if (price.id === sixMoId) return `${amt} / 6 Months`;
  const label = INTERVAL_LABELS[price.interval] ?? price.interval;
  return `${amt} / ${label}`;
}

// Display name overrides keyed by env-var price ID (passed as props)
function getPlanLabel(priceId: string, oneMoId?: string, sixMoId?: string, twelveId?: string): string {
  if (priceId === oneMoId) return 'Monthly Website Hosting Package';
  if (priceId === sixMoId) return '6 Months of Website Hosting Package';
  if (priceId === twelveId) return '12 Months of Website Hosting Package';
  return 'Website Hosting Package';
}

function getMonthlyRate(unitAmount: number, priceId: string, sixMoId?: string, twelveId?: string): string | null {
  if (priceId === sixMoId) return `$${Math.round(unitAmount / 100 / 6)}/month`;
  if (priceId === twelveId) {
    const perMonth = (unitAmount / 100 / 12).toFixed(2).replace(/\.00$/, '');
    return `$${perMonth}/month`;
  }
  return null;
}

function getPlanSubtext(unitAmount: number): string | null {
  if (unitAmount === 99900) {
    return 'Pay once, host the website for life! Limited time deal. First 100 customers only. Likely never run this deal again.';
  }
  return null;
}

function sortOrderIndex(unitAmount: number): number {
  if (unitAmount === 99900) return 0;
  if (unitAmount === 49900) return 1;
  if (unitAmount === 29900 || unitAmount === 29700) return 2;
  if (unitAmount === 4900) return 3;
  return 999;
}

export function PaymentPage({ token, email, businessName, note, prices, sixMoId, oneMoId, twelveId }: PaymentPageProps & { sixMoId?: string; oneMoId?: string; twelveId?: string }) {
  const sortedPrices = useMemo(() => {
    return [...prices].sort((a, b) => {
      const ai = sortOrderIndex(a.unitAmount);
      const bi = sortOrderIndex(b.unitAmount);
      if (ai !== bi) return ai - bi;
      return b.unitAmount - a.unitAmount;
    });
  }, [prices]);

  const [selectedId, setSelectedId] = useState<string>(sortedPrices[0]?.id ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!sortedPrices.length) return;
    if (!selectedId || !sortedPrices.some((p) => p.id === selectedId)) {
      setSelectedId(sortedPrices[0]!.id);
    }
  }, [sortedPrices, selectedId]);

  const selectedPrice = sortedPrices.find((p) => p.id === selectedId) ?? sortedPrices[0];

  const handleCheckout = async () => {
    if (!selectedId) return;
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`/api/pay/${token}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId: selectedId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong');
        return;
      }
      window.location.href = data.url;
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='flex min-h-screen flex-col items-center justify-center bg-black px-4 py-16'>
      <div className='w-full max-w-md'>
        {/* Greeting */}
        <div className='mb-6 text-center'>
          <h1 className='text-2xl font-bold'>Complete your order</h1>
          {businessName && (
            <p className='mt-1 text-lg font-semibold text-neutral-200'>{businessName}</p>
          )}
          <p className='mt-1 text-sm text-neutral-400'>{email}</p>
          {note && (
            <p className='mt-3 rounded-lg bg-zinc-900 px-4 py-2 text-sm text-neutral-300'>{note}</p>
          )}
        </div>

        {/* Price selection */}
        {sortedPrices.length > 0 && (
          <div className='mb-4'>
            <p className='mb-3 text-sm text-neutral-400'>Choose a plan</p>
            <div className='space-y-3'>
              {sortedPrices.map((price) => {
                const selected = price.id === selectedId;
                const planLabel = price.unitAmount === 99900
                  ? 'Lifetime Website Hosting Package'
                  : price.unitAmount === 29700
                    ? '6 Months of Website Hosting Package'
                    : getPlanLabel(price.id, oneMoId, sixMoId, twelveId);
                const monthlyRate = getMonthlyRate(price.unitAmount, price.id, sixMoId, twelveId);
                const planSubtext = getPlanSubtext(price.unitAmount);
                const isBestValue = price.id === twelveId;
                return (
                  <button
                    key={price.id}
                    onClick={() => setSelectedId(price.id)}
                    className={cn(
                      'relative w-full rounded-xl border px-6 py-5 text-left transition-all',
                      selected
                        ? 'border-emerald-500/60 bg-emerald-500/10'
                        : 'border-zinc-700 bg-zinc-900 hover:border-zinc-600'
                    )}
                  >
                    {isBestValue && (
                      <span className='absolute -top-3 right-4 rounded-full bg-emerald-500 px-3 py-0.5 text-xs font-semibold text-black'>
                        Best Value
                      </span>
                    )}
                    <div className='flex items-start justify-between gap-4'>
                      <div className='flex-1'>
                        <p className='font-semibold text-white'>{planLabel}</p>
                        <p className={cn('mt-2 text-3xl font-bold', selected ? 'text-emerald-400' : 'text-white')}>
                          {formatAmount(price.unitAmount, price.currency)}
                        </p>
                        {planSubtext && (
                          <p className='mt-2 text-sm text-neutral-400'>
                            {planSubtext}
                          </p>
                        )}
                        {monthlyRate && (
                          <p className='mt-0.5 text-sm text-neutral-400'>{monthlyRate}</p>
                        )}
                      </div>
                      <div className={cn(
                        'mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                        selected ? 'border-emerald-500 bg-emerald-500' : 'border-zinc-600'
                      )}>
                        {selected && <IoCheckmark className='h-3.5 w-3.5 text-black' />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Product card */}
        <div className='rounded-xl bg-zinc-900 p-6 ring-1 ring-zinc-800'>
          {prices.length === 1 && selectedPrice && (
            <div className='mb-6 flex items-start justify-between'>
              <div>
                <h2 className='text-lg font-semibold'>{selectedPrice.productName}</h2>
                {selectedPrice.productDescription && (
                  <p className='mt-1 text-sm text-neutral-400'>{selectedPrice.productDescription}</p>
                )}
              </div>
              <span className='ml-4 shrink-0 text-right'>
                <span className='text-2xl font-bold text-emerald-400'>
                  {formatAmount(selectedPrice.unitAmount, selectedPrice.currency)}
                </span>
                {selectedPrice.type === 'recurring' && selectedPrice.interval && (
                  <span className='block text-xs text-neutral-400'>per {selectedPrice.id === sixMoId ? '6 months' : selectedPrice.interval}</span>
                )}
              </span>
            </div>
          )}

          {/* What's included */}
          <ul className='mb-6 space-y-2'>
            {[
              'Website hosting',
              'Custom logos',
              'Brand color palette & fonts',
              'Professional website design',
              'SEO & AI optimized content',
              'Includes 5 edits per month',
            ].map((item) => (
              <li key={item} className='flex items-center gap-2 text-sm text-neutral-300'>
                <IoCheckmark className='h-4 w-4 shrink-0 text-emerald-400' />
                {item}
              </li>
            ))}
          </ul>

          {error && (
            <p className='mb-4 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400'>{error}</p>
          )}

          <button
            onClick={handleCheckout}
            disabled={loading || !selectedId}
            className='flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-6 py-3 font-semibold text-black transition-colors hover:bg-emerald-400 disabled:opacity-60'
          >
            <IoCard className='h-5 w-5' />
            {loading ? 'Redirecting to checkout...' : `Pay ${selectedPrice ? billingLabel(selectedPrice, sixMoId) : ''}`}
          </button>

          <p className='mt-3 flex items-center justify-center gap-1 text-xs text-neutral-500'>
            <IoLockClosed className='h-3 w-3' />
            Secured by Stripe — we never store your card details
          </p>
        </div>
      </div>
    </div>
  );
}
