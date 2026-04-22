/**
 * Integration tests for /api/domains/search.
 *
 * Tests:
 * - Auth guard
 * - Missing query → 400
 * - Query cleaning (strips https://, www., TLD, special chars, uppercases → lower)
 * - All-special-char query → 400 after cleaning
 * - searchDomains error → 500
 * - Happy path returns results
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Mock external modules ────────────────────────────────────────────────────

const mockGetSession = vi.fn();
vi.mock('@/features/account/controllers/get-session', () => ({
  getSession: mockGetSession,
}));

const mockSearchDomains = vi.fn();
vi.mock('@/libs/vercel/domains', () => ({
  searchDomains: mockSearchDomains,
  DOMAIN_MARKUP_USD: 7,
}));

// ─── Helper ───────────────────────────────────────────────────────────────────

function makeRequest(query?: string) {
  const url = query
    ? `http://localhost/api/domains/search?query=${encodeURIComponent(query)}`
    : 'http://localhost/api/domains/search';
  return new NextRequest(url);
}

const fakeResults = [
  { domain: 'acme.com', available: true, vercelPrice: 15, ourPrice: 22, renewalPrice: 15 },
];

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('GET /api/domains/search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockSearchDomains.mockResolvedValue(fakeResults);
  });

  // ─── Auth ──────────────────────────────────────────────────────────────────

  it('returns 401 when unauthenticated', async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const { GET } = await import('@/app/api/domains/search/route');
    const res = await GET(makeRequest('acme'));
    expect(res.status).toBe(401);
  });

  // ─── Input validation ──────────────────────────────────────────────────────

  it('returns 400 when query param is missing', async () => {
    const { GET } = await import('@/app/api/domains/search/route');
    const res = await GET(makeRequest());
    expect(res.status).toBe(400);
  });

  it('returns 400 when query is whitespace only', async () => {
    const { GET } = await import('@/app/api/domains/search/route');
    const res = await GET(makeRequest('   '));
    expect(res.status).toBe(400);
  });

  it('returns 400 when cleaned query is empty (all special chars)', async () => {
    const { GET } = await import('@/app/api/domains/search/route');
    // After cleaning, only alphanumeric + hyphen remain — symbols produce empty string
    const res = await GET(makeRequest('!!! @@@'));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid query/i);
  });

  // ─── Query cleaning (verify searchDomains receives cleaned value) ──────────

  it('strips https:// and www. and TLD from query', async () => {
    const { GET } = await import('@/app/api/domains/search/route');
    await GET(makeRequest('https://www.acmeplumbing.com'));
    expect(mockSearchDomains).toHaveBeenCalledWith('acmeplumbing');
  });

  it('lowercases the query', async () => {
    const { GET } = await import('@/app/api/domains/search/route');
    await GET(makeRequest('ACME'));
    expect(mockSearchDomains).toHaveBeenCalledWith('acme');
  });

  it('strips spaces from the query', async () => {
    const { GET } = await import('@/app/api/domains/search/route');
    await GET(makeRequest('acme plumbing'));
    expect(mockSearchDomains).toHaveBeenCalledWith('acmeplumbing');
  });

  it('truncates query to 63 characters', async () => {
    const { GET } = await import('@/app/api/domains/search/route');
    const longQuery = 'a'.repeat(100);
    await GET(makeRequest(longQuery));
    const calledWith = mockSearchDomains.mock.calls[0][0] as string;
    expect(calledWith.length).toBeLessThanOrEqual(63);
  });

  // ─── Error handling ────────────────────────────────────────────────────────

  it('returns 500 when searchDomains throws', async () => {
    mockSearchDomains.mockRejectedValueOnce(new Error('Vercel API down'));
    const { GET } = await import('@/app/api/domains/search/route');
    const res = await GET(makeRequest('acme'));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/domain search failed/i);
  });

  // ─── Happy path ────────────────────────────────────────────────────────────

  it('returns 200 with search results', async () => {
    const { GET } = await import('@/app/api/domains/search/route');
    const res = await GET(makeRequest('acme'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results).toEqual(fakeResults);
  });

  it('returns empty results array when no domains available', async () => {
    mockSearchDomains.mockResolvedValueOnce([]);
    const { GET } = await import('@/app/api/domains/search/route');
    const res = await GET(makeRequest('thistotallytakendomain'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results).toEqual([]);
  });
});
