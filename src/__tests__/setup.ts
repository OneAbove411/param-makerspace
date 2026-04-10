/**
 * Vitest global test setup.
 *
 * - Extends matchers with @testing-library/jest-dom (toBeInTheDocument, etc.)
 * - Auto-mocks the Supabase client so no network calls leak in unit tests.
 */
import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// ─── Global Supabase mock ────────────────────────────────────
// Every `import { supabase } from './supabase'` in the source code gets
// this mock. Individual tests can override specific methods via
// `vi.mocked(supabase.from).mockReturnValue(...)`.
vi.mock('../lib/supabase', () => {
  const createQueryBuilder = () => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: vi.fn(),
  })

  return {
    supabase: {
      from: vi.fn(() => createQueryBuilder()),
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        signInWithPassword: vi.fn().mockResolvedValue({ data: null, error: null }),
        signUp: vi.fn().mockResolvedValue({ data: null, error: null }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
        onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      },
      storage: {
        from: vi.fn(() => ({
          upload: vi.fn().mockResolvedValue({ data: null, error: null }),
          getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://example.com/test.png' } })),
        })),
      },
    },
  }
})
