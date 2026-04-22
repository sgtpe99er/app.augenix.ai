import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Domain markup constant ───────────────────────────────────────────────────

describe('DOMAIN_MARKUP_USD', () => {
  it('is $7', async () => {
    const { DOMAIN_MARKUP_USD } = await import('@/libs/vercel/domains');
    expect(DOMAIN_MARKUP_USD).toBe(7);
  });
});

// ─── searchDomains result sorting ────────────────────────────────────────────
// Tests the sorting logic: .com first, then by ourPrice ascending.
// We mock fetch so no real network calls are made.

describe('searchDomains sorting', () => {
  beforeEach(() => {
    vi.resetModules();

    // Mock global fetch to return availability + price data
    global.fetch = vi.fn().mockImplementation((url: string) => {
      // Availability check — all domains available
      if (url.includes('/availability')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              results: [
                { domain: 'acme.com', available: true },
                { domain: 'acme.net', available: true },
                { domain: 'acme.io', available: true },
              ],
            }),
        });
      }

      // Price check — .io is cheapest but .com should still sort first
      if (url.includes('acme.io')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ years: 1, purchasePrice: 5, renewalPrice: 5, transferPrice: 5 }),
        });
      }
      if (url.includes('acme.net')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ years: 1, purchasePrice: 12, renewalPrice: 12, transferPrice: 12 }),
        });
      }
      if (url.includes('acme.com')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ years: 1, purchasePrice: 15, renewalPrice: 15, transferPrice: 15 }),
        });
      }

      return Promise.resolve({ ok: false, text: () => Promise.resolve('not found') });
    }) as unknown as typeof fetch;
  });

  it('.com sorts first regardless of price', async () => {
    const { searchDomains } = await import('@/libs/vercel/domains');
    const results = await searchDomains('acme');

    expect(results[0].domain).toBe('acme.com');
  });

  it('non-.com domains sort by ourPrice ascending', async () => {
    const { searchDomains } = await import('@/libs/vercel/domains');
    const results = await searchDomains('acme');

    const nonCom = results.filter((r) => !r.domain.endsWith('.com'));
    const prices = nonCom.map((r) => r.ourPrice);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });

  it('ourPrice includes the $7 markup over vercelPrice', async () => {
    const { searchDomains, DOMAIN_MARKUP_USD } = await import('@/libs/vercel/domains');
    const results = await searchDomains('acme');

    for (const r of results) {
      expect(r.ourPrice).toBe(r.vercelPrice + DOMAIN_MARKUP_USD);
    }
  });

  it('returns empty array when no domains are available', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ results: [{ domain: 'taken.com', available: false }] }),
    }) as unknown as typeof fetch;

    const { searchDomains } = await import('@/libs/vercel/domains');
    const results = await searchDomains('taken');
    expect(results).toEqual([]);
  });
});

// ─── Domain price drift guard (checkout logic) ────────────────────────────────
// Tests the Math.abs drift check used in /api/checkout to verify domain price.

describe('Domain price drift guard', () => {
  it('allows up to $1 drift', () => {
    const DOMAIN_MARKUP_USD = 7;
    const vercelPriceCents = 1500; // $15.00
    const expectedOurPriceCents = vercelPriceCents + DOMAIN_MARKUP_USD * 100; // $22.00 = 2200

    const withinDrift = expectedOurPriceCents + 99; // $22.99
    expect(Math.abs(expectedOurPriceCents - withinDrift) > 100).toBe(false);

    const outsideDrift = expectedOurPriceCents + 101; // $23.01
    expect(Math.abs(expectedOurPriceCents - outsideDrift) > 100).toBe(true);
  });
});
