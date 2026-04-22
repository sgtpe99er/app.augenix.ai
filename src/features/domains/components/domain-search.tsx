'use client';

import { useState, useRef, useCallback } from 'react';
import { IoSearch, IoCheckmarkCircle, IoCloseCircle, IoGlobe, IoClose } from 'react-icons/io5';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn';

export interface DomainResult {
  domain: string;
  available: boolean;
  vercelPrice: number;
  ourPrice: number;
  renewalPrice: number;
}

interface DomainSearchProps {
  selectedDomain: string | null;
  selectedDomainOurPrice: number | null;
  selectedDomainVercelPrice: number | null;
  onSelect: (domain: string, ourPrice: number, vercelPrice: number) => void;
  onClear: () => void;
  /** Pre-fill the search input (e.g. from business name) */
  initialQuery?: string;
}

export function DomainSearch({
  selectedDomain,
  selectedDomainOurPrice,
  onSelect,
  onClear,
  initialQuery = '',
}: DomainSearchProps) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<DomainResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/domains/search?query=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Search failed. Please try again.');
        setResults([]);
      } else {
        setResults(data.results ?? []);
        setSearched(true);
      }
    } catch {
      setError('Search failed. Please try again.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(val), 600);
  };

  const handleSearchClick = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    runSearch(query);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      runSearch(query);
    }
  };

  return (
    <div className='space-y-4'>
      {/* Selected domain banner */}
      {selectedDomain && (
        <div className='flex items-center justify-between rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3'>
          <div className='flex items-center gap-3'>
            <IoGlobe className='h-5 w-5 text-emerald-400' />
            <div>
              <p className='font-semibold text-emerald-400'>{selectedDomain}</p>
              <p className='text-xs text-neutral-400'>
                ${selectedDomainOurPrice?.toFixed(2)}/year · 1-year registration
              </p>
            </div>
          </div>
          <button
            type='button'
            onClick={onClear}
            className='rounded-full p-1 text-neutral-400 transition-colors hover:text-white'
            aria-label='Remove selected domain'
          >
            <IoClose className='h-5 w-5' />
          </button>
        </div>
      )}

      {/* Search input */}
      <div className='flex gap-2'>
        <div className='relative flex-1'>
          <IoSearch className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500' />
          <Input
            placeholder='yourbusiness'
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            className='pl-9'
          />
        </div>
        <Button
          type='button'
          variant='secondary'
          onClick={handleSearchClick}
          disabled={!query.trim() || loading}
          className='shrink-0'
        >
          {loading ? 'Searching…' : 'Search'}
        </Button>
      </div>

      {error && (
        <p className='text-sm text-red-400'>{error}</p>
      )}

      {/* Results */}
      {searched && !loading && results.length === 0 && !error && (
        <p className='text-sm text-neutral-400'>No available domains found. Try a different name.</p>
      )}

      {results.length > 0 && (
        <div className='space-y-2'>
          {results.map((r) => (
            <div
              key={r.domain}
              className={cn(
                'flex items-center justify-between rounded-xl border px-4 py-3 transition-colors',
                r.available
                  ? selectedDomain === r.domain
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
                  : 'border-zinc-800 bg-zinc-900/50 opacity-50',
              )}
            >
              <div className='flex items-center gap-3'>
                {r.available ? (
                  <IoCheckmarkCircle className='h-5 w-5 shrink-0 text-emerald-400' />
                ) : (
                  <IoCloseCircle className='h-5 w-5 shrink-0 text-zinc-600' />
                )}
                <div>
                  <p className={cn('font-medium', r.available ? 'text-white' : 'text-zinc-500')}>
                    {r.domain}
                  </p>
                  {r.available && (
                    <p className='text-xs text-neutral-400'>
                      Renews at ${r.renewalPrice.toFixed(2)}/yr
                    </p>
                  )}
                  {!r.available && (
                    <p className='text-xs text-zinc-600'>Unavailable</p>
                  )}
                </div>
              </div>

              {r.available && (
                <div className='flex items-center gap-3'>
                  <span className='text-lg font-semibold text-white'>
                    ${r.ourPrice.toFixed(2)}
                  </span>
                  {selectedDomain === r.domain ? (
                    <Button
                      type='button'
                      size='sm'
                      variant='secondary'
                      onClick={onClear}
                      className='shrink-0'
                    >
                      Remove
                    </Button>
                  ) : (
                    <Button
                      type='button'
                      size='sm'
                      onClick={() => onSelect(r.domain, r.ourPrice, r.vercelPrice)}
                      className='shrink-0 bg-emerald-500 text-black hover:bg-emerald-400'
                    >
                      Add
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <p className='text-xs text-neutral-500'>
        Prices shown are for 1-year registration. Domain is registered in your name after checkout.
      </p>
    </div>
  );
}
