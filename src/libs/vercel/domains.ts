const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID;

const BASE = 'https://api.vercel.com';

export const DOMAIN_MARKUP_USD = 7;

function vercelHeaders(): HeadersInit {
  if (!VERCEL_TOKEN) throw new Error('VERCEL_TOKEN env var is not set');
  return {
    Authorization: `Bearer ${VERCEL_TOKEN}`,
    'Content-Type': 'application/json',
  };
}

function teamParam(prefix: '?' | '&' = '?'): string {
  return VERCEL_TEAM_ID ? `${prefix}teamId=${VERCEL_TEAM_ID}` : '';
}

async function vercelFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { ...vercelHeaders(), ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Vercel Domains API error ${res.status} on ${path}: ${body}`);
  }
  return res.json() as Promise<T>;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DomainAvailabilityResult {
  domain: string;
  available: boolean;
}

export interface DomainPriceResult {
  years: number;
  purchasePrice: number;
  renewalPrice: number;
  transferPrice: number;
}

export interface DomainSearchResult {
  domain: string;
  available: boolean;
  vercelPrice: number;
  ourPrice: number;
  renewalPrice: number;
}

export interface DomainOrderResult {
  orderId: string;
}

export interface DomainRegistrantContact {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address1: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

// ─── API Wrappers ─────────────────────────────────────────────────────────────

/**
 * Check availability for up to 50 domains in one request.
 */
export async function checkBulkAvailability(
  domains: string[],
): Promise<DomainAvailabilityResult[]> {
  const sep = VERCEL_TEAM_ID ? '?' : '';
  const data = await vercelFetch<{ results: DomainAvailabilityResult[] }>(
    `/v1/registrar/domains/availability${teamParam('?')}`,
    {
      method: 'POST',
      body: JSON.stringify({ domains }),
    },
  );
  return data.results ?? [];
}

/**
 * Get purchase and renewal price for a specific domain (1-year default).
 */
export async function getDomainPrice(domain: string): Promise<DomainPriceResult> {
  const sep = VERCEL_TEAM_ID ? '&' : '?';
  return vercelFetch<DomainPriceResult>(
    `/v1/registrar/domains/${encodeURIComponent(domain)}/price?years=1${teamParam('&')}`,
  );
}

/**
 * Search for a domain name: checks availability for common TLD variants,
 * fetches prices for available ones, and returns results sorted .com-first then by price.
 * Prices include the $7 markup.
 */
export async function searchDomains(query: string): Promise<DomainSearchResult[]> {
  const tlds = ['.com', '.net', '.org', '.co', '.io', '.biz', '.us'];
  const candidates = tlds.map((tld) => `${query}${tld}`);

  const availability = await checkBulkAvailability(candidates);
  const available = availability.filter((r) => r.available);

  if (available.length === 0) return [];

  const priceResults = await Promise.allSettled(
    available.map((r) => getDomainPrice(r.domain)),
  );

  const results: DomainSearchResult[] = [];
  available.forEach((avail, i) => {
    const priceResult = priceResults[i];
    if (priceResult.status === 'fulfilled') {
      const p = priceResult.value;
      results.push({
        domain: avail.domain,
        available: true,
        vercelPrice: p.purchasePrice,
        ourPrice: p.purchasePrice + DOMAIN_MARKUP_USD,
        renewalPrice: p.renewalPrice,
      });
    }
  });

  // Sort: .com first, then by ourPrice ascending
  results.sort((a, b) => {
    const aIsCom = a.domain.endsWith('.com') ? 0 : 1;
    const bIsCom = b.domain.endsWith('.com') ? 0 : 1;
    if (aIsCom !== bIsCom) return aIsCom - bIsCom;
    return a.ourPrice - b.ourPrice;
  });

  return results;
}

/**
 * Purchase a domain via Vercel Registrar.
 * expectedPriceUsd is Vercel's raw price (without markup) — used for price-lock verification.
 */
export async function buyDomain(
  domain: string,
  expectedPriceUsd: number,
  contact: DomainRegistrantContact,
): Promise<DomainOrderResult> {
  return vercelFetch<DomainOrderResult>(
    `/v1/registrar/domains/${encodeURIComponent(domain)}/buy${teamParam('?')}`,
    {
      method: 'POST',
      body: JSON.stringify({
        autoRenew: true,
        years: 1,
        expectedPrice: expectedPriceUsd,
        contactInformation: contact,
      }),
    },
  );
}

