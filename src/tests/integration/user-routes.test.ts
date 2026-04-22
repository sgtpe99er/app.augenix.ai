/**
 * Integration tests for user-facing routes:
 * - POST /api/user/change-password
 * - PATCH /api/user/update-business
 * - POST /api/user/select-design
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Mock external modules ────────────────────────────────────────────────────

const mockGetSession = vi.fn();
vi.mock('@/features/account/controllers/get-session', () => ({
  getSession: mockGetSession,
}));

const mockUpdateUserById = vi.fn();
const mockSupabaseFrom = vi.fn();

vi.mock('@/libs/supabase/supabase-admin', () => ({
  supabaseAdminClient: {
    auth: {
      admin: {
        updateUserById: mockUpdateUserById,
      },
    },
    get from() { return mockSupabaseFrom; },
  },
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(url: string, method: string, body: Record<string, unknown>) {
  return new NextRequest(url, {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ─── change-password ──────────────────────────────────────────────────────────

describe('POST /api/user/change-password', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockUpdateUserById.mockResolvedValue({ error: null });
  });

  it('returns 401 when unauthenticated', async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const { POST } = await import('@/app/api/user/change-password/route');
    const res = await POST(makeRequest('http://localhost/api/user/change-password', 'POST', { password: 'longenough', confirmPassword: 'longenough' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when password is fewer than 8 characters', async () => {
    const { POST } = await import('@/app/api/user/change-password/route');
    const res = await POST(makeRequest('http://localhost/api/user/change-password', 'POST', { password: 'short', confirmPassword: 'short' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/8 characters/i);
  });

  it('returns 400 when passwords do not match', async () => {
    const { POST } = await import('@/app/api/user/change-password/route');
    const res = await POST(makeRequest('http://localhost/api/user/change-password', 'POST', { password: 'securepass1', confirmPassword: 'different1' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/do not match/i);
  });

  it('returns 500 when Supabase update fails', async () => {
    mockUpdateUserById.mockResolvedValueOnce({ error: { message: 'Auth error' } });
    const { POST } = await import('@/app/api/user/change-password/route');
    const res = await POST(makeRequest('http://localhost/api/user/change-password', 'POST', { password: 'securepass1', confirmPassword: 'securepass1' }));
    expect(res.status).toBe(500);
  });

  it('returns 200 with { success: true } on valid input', async () => {
    const { POST } = await import('@/app/api/user/change-password/route');
    const res = await POST(makeRequest('http://localhost/api/user/change-password', 'POST', { password: 'securepass1', confirmPassword: 'securepass1' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(mockUpdateUserById).toHaveBeenCalledWith('user-1', { password: 'securepass1' });
  });
});

// ─── update-business ──────────────────────────────────────────────────────────

describe('PATCH /api/user/update-business', () => {
  const mockUpdateEq = vi.fn().mockResolvedValue({ error: null });
  const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq });

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockSupabaseFrom.mockReturnValue({ update: mockUpdate });
  });

  it('returns 401 when unauthenticated', async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const { PATCH } = await import('@/app/api/user/update-business/route');
    const res = await PATCH(makeRequest('http://localhost/api/user/update-business', 'PATCH', { business_name: 'Acme' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when business_name is missing', async () => {
    const { PATCH } = await import('@/app/api/user/update-business/route');
    const res = await PATCH(makeRequest('http://localhost/api/user/update-business', 'PATCH', {}));
    expect(res.status).toBe(400);
  });

  it('returns 400 when business_name exceeds 100 characters', async () => {
    const { PATCH } = await import('@/app/api/user/update-business/route');
    const res = await PATCH(makeRequest('http://localhost/api/user/update-business', 'PATCH', { business_name: 'A'.repeat(101) }));
    expect(res.status).toBe(400);
  });

  it('returns 500 when DB update fails', async () => {
    mockUpdateEq.mockResolvedValueOnce({ error: { message: 'DB error' } });
    const { PATCH } = await import('@/app/api/user/update-business/route');
    const res = await PATCH(makeRequest('http://localhost/api/user/update-business', 'PATCH', { business_name: 'Acme' }));
    expect(res.status).toBe(500);
  });

  it('returns 200 with { success: true } and updates businesses table', async () => {
    const { PATCH } = await import('@/app/api/user/update-business/route');
    const res = await PATCH(makeRequest('http://localhost/api/user/update-business', 'PATCH', {
      business_name: 'Acme Plumbing',
      location_city: 'Austin',
    }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ business_name: 'Acme Plumbing', location_city: 'Austin' })
    );
    expect(mockUpdateEq).toHaveBeenCalledWith('user_id', 'user-1');
  });
});

// ─── select-design ────────────────────────────────────────────────────────────

describe('POST /api/user/select-design', () => {
  // Build a thenable chain: every .eq() returns a new thenable that also has .eq()
  // This handles both single-eq (.update().eq()) and double-eq (.update().eq().eq())
  function makeThenableChain(result = { error: null }): Record<string, unknown> {
    const p = Promise.resolve(result);
    return {
      eq: vi.fn().mockImplementation(() => makeThenableChain(result)),
      then: p.then.bind(p),
      catch: p.catch.bind(p),
      finally: p.finally.bind(p),
    };
  }

  const mockSingle = vi.fn().mockResolvedValue({
    data: { id: 'asset-1', asset_type: 'website_mockup', user_id: 'user-1' },
    error: null,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockSingle.mockResolvedValue({
      data: { id: 'asset-1', asset_type: 'website_mockup', user_id: 'user-1' },
      error: null,
    });

    mockSupabaseFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: mockSingle }), single: mockSingle }),
      }),
      update: vi.fn().mockImplementation(() => makeThenableChain({ error: null })),
    }));
  });

  it('returns 401 when unauthenticated', async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const { POST } = await import('@/app/api/user/select-design/route');
    const res = await POST(makeRequest('http://localhost/api/user/select-design', 'POST', { asset_id: 'asset-1' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when asset_id is missing', async () => {
    const { POST } = await import('@/app/api/user/select-design/route');
    const res = await POST(makeRequest('http://localhost/api/user/select-design', 'POST', {}));
    expect(res.status).toBe(400);
  });

  it('returns 400 when asset_id is not a string', async () => {
    const { POST } = await import('@/app/api/user/select-design/route');
    const res = await POST(makeRequest('http://localhost/api/user/select-design', 'POST', { asset_id: 123 }));
    expect(res.status).toBe(400);
  });

  it('returns 404 when asset not found or belongs to another user', async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'not found' } });
    const { POST } = await import('@/app/api/user/select-design/route');
    const res = await POST(makeRequest('http://localhost/api/user/select-design', 'POST', { asset_id: 'other-asset' }));
    expect(res.status).toBe(404);
  });

  it('returns 400 when asset is not a website_mockup', async () => {
    mockSingle.mockResolvedValueOnce({
      data: { id: 'asset-1', asset_type: 'logo', user_id: 'user-1' },
      error: null,
    });
    const { POST } = await import('@/app/api/user/select-design/route');
    const res = await POST(makeRequest('http://localhost/api/user/select-design', 'POST', { asset_id: 'asset-1' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/website mockup/i);
  });

  it('returns 200 with { success: true } for a valid mockup selection', async () => {
    const { POST } = await import('@/app/api/user/select-design/route');
    const res = await POST(makeRequest('http://localhost/api/user/select-design', 'POST', { asset_id: 'asset-1' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
  });
});
