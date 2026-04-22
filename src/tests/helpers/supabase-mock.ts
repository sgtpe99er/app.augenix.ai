import { vi } from 'vitest';

/**
 * Creates a mock Supabase client where each table can return different data.
 * Handles the fluent builder pattern: .from(table).select().eq().single()
 *
 * Usage:
 *   const mock = createSupabaseMock({
 *     customers: { data: { id: 'user-1' }, error: null },
 *     businesses: { data: { id: 'biz-1', business_name: 'Acme' }, error: null },
 *   });
 *   vi.mocked(supabaseAdminClient).from = mock.from;
 */
export function createSupabaseMock(tableReturns: Record<string, { data: unknown; error: unknown }> = {}) {
  const defaultReturn = { data: null, error: null };

  function makeChain(resolved: { data: unknown; error: unknown }) {
    const terminal = vi.fn().mockResolvedValue(resolved);
    const chain: Record<string, unknown> = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      single: terminal,
      maybeSingle: terminal,
      insert: terminal,
      upsert: terminal,
      // update() returns a sub-chain whose eq() resolves
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue(resolved),
      }),
    };
    return chain;
  }

  const from = vi.fn().mockImplementation((table: string) => {
    return makeChain(tableReturns[table] ?? defaultReturn);
  });

  const client = {
    from,
    auth: {
      admin: {
        getUserById: vi.fn().mockResolvedValue({
          data: { user: { email: 'user@example.com' } },
          error: null,
        }),
      },
    },
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn().mockReturnValue({
          data: { publicUrl: 'https://storage.example.com/file.png' },
        }),
      }),
    },
  };

  return client;
}
