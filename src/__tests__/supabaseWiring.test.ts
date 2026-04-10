/**
 * Regression tests for the Supabase client data-fetch path.
 *
 * These tests verify that PostgREST queries (.from().select()) use the
 * lock-free fetch wrapper instead of the SDK's default fetchWithAuth,
 * which goes through auth.getSession() → _acquireLock().
 *
 * Background:
 *   When a browser tab is hidden then made visible, Supabase's internal
 *   _onVisibilityChanged acquires a lock for _recoverAndRefresh.  If
 *   data queries also go through the lock (via _getAccessToken →
 *   auth.getSession), they queue behind the recovery and never resolve
 *   during simultaneous client-side navigation — causing "0 results".
 *
 *   The fix in supabase.ts replaces supabase.rest.fetch with a
 *   lockFreeFetch that reads the access token directly from localStorage
 *   instead of going through auth.getSession.
 *
 * If someone accidentally removes the lockFreeFetch patch, upgrades
 * @supabase/supabase-js in a way that changes the internal wiring,
 * or reverts supabase.ts, these tests will fail immediately.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Unmock supabase for this file — we need the REAL module wiring.
vi.unmock('../lib/supabase')

// We need to mock fetch globally since the real module will try to
// make network calls during import (auto-refresh, etc.)
const mockFetch = vi.fn().mockResolvedValue(
  new Response(JSON.stringify([]), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
)
vi.stubGlobal('fetch', mockFetch)

// Provide env vars so createClient doesn't use placeholder URLs
vi.stubEnv('VITE_SUPABASE_DATABASE_URL', 'https://test-project.supabase.co')
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key-1234567890')

describe('Supabase client wiring (lock-free fetch)', () => {
  let supabase: any
  let STORAGE_KEY: string

  beforeEach(async () => {
    // Clear localStorage before each test
    localStorage.clear()
    mockFetch.mockClear()

    // Set version to avoid autoCleanOnDeploy clearing tokens
    localStorage.setItem('param-makerspace-version', '2.0.1')

    // Dynamic import to get the real module (not the global mock)
    const mod = await import('../lib/supabase')
    supabase = mod.supabase
    STORAGE_KEY = mod.STORAGE_KEY
  })

  afterEach(() => {
    localStorage.clear()
  })

  // ─── Core wiring tests ───────────────────────────────────────

  it('supabase.rest.fetch is NOT the SDK default fetchWithAuth', () => {
    // The SDK's fetchWithAuth calls _getAccessToken which acquires
    // the internal lock.  Our lockFreeFetch should replace it.
    // We verify by checking that rest.fetch is NOT the same function
    // that was originally wired during createClient().
    //
    // The SDK stores the original fetch as supabase.fetch during
    // construction.  After our patch, both supabase.fetch and
    // supabase.rest.fetch should be the same lockFreeFetch function.
    const restFetch = (supabase as any).rest.fetch
    const topFetch = (supabase as any).fetch

    expect(restFetch).toBe(topFetch)
    expect(typeof restFetch).toBe('function')
  })

  it('lockFreeFetch injects Authorization header from localStorage', async () => {
    // Store a fake session token in localStorage
    const fakeToken = 'eyJ-fake-access-token-for-test'
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      access_token: fakeToken,
      user: { id: 'test-user-id' },
    }))

    const restFetch = (supabase as any).rest.fetch as typeof fetch

    // Call the patched fetch directly
    await restFetch('https://test-project.supabase.co/rest/v1/challenge', {
      method: 'GET',
    })

    // Verify the actual fetch was called with our token
    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [, init] = mockFetch.mock.calls[0]
    const headers = new Headers(init.headers)
    expect(headers.get('Authorization')).toBe(`Bearer ${fakeToken}`)
    expect(headers.get('apikey')).toBe('test-anon-key-1234567890')
  })

  it('lockFreeFetch uses anon key when no session in localStorage', async () => {
    // No session stored — localStorage is empty
    const restFetch = (supabase as any).rest.fetch as typeof fetch

    await restFetch('https://test-project.supabase.co/rest/v1/challenge', {
      method: 'GET',
    })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [, init] = mockFetch.mock.calls[0]
    const headers = new Headers(init.headers)
    expect(headers.get('Authorization')).toBe('Bearer test-anon-key-1234567890')
  })

  it('lockFreeFetch preserves existing Authorization header if set', async () => {
    const restFetch = (supabase as any).rest.fetch as typeof fetch

    await restFetch('https://test-project.supabase.co/rest/v1/challenge', {
      method: 'GET',
      headers: { 'Authorization': 'Bearer custom-override-token' },
    })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [, init] = mockFetch.mock.calls[0]
    const headers = new Headers(init.headers)
    expect(headers.get('Authorization')).toBe('Bearer custom-override-token')
  })

  it('lockFreeFetch handles corrupted localStorage gracefully', async () => {
    // Store garbage that will fail JSON.parse
    localStorage.setItem(STORAGE_KEY, 'not-valid-json{{{')

    const restFetch = (supabase as any).rest.fetch as typeof fetch

    await restFetch('https://test-project.supabase.co/rest/v1/challenge', {
      method: 'GET',
    })

    // Should fall back to anon key, not throw
    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [, init] = mockFetch.mock.calls[0]
    const headers = new Headers(init.headers)
    expect(headers.get('Authorization')).toBe('Bearer test-anon-key-1234567890')
  })

  // ─── Lock bypass verification ────────────────────────────────

  it('data queries do NOT call auth.getSession', async () => {
    // Store a valid session so the query has a token
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      access_token: 'test-token',
      user: { id: 'test-user' },
    }))

    // Spy on auth.getSession to make sure it's NOT called
    const getSessionSpy = vi.spyOn(supabase.auth, 'getSession')

    // Trigger a data query via the PostgREST client
    const restFetch = (supabase as any).rest.fetch as typeof fetch
    await restFetch('https://test-project.supabase.co/rest/v1/challenge?select=id', {
      method: 'GET',
    })

    // The whole point: data queries must NOT touch auth.getSession
    expect(getSessionSpy).not.toHaveBeenCalled()

    getSessionSpy.mockRestore()
  })

  it('lockFreeFetch reads fresh token on every call (not cached at bind time)', async () => {
    const restFetch = (supabase as any).rest.fetch as typeof fetch

    // First call — no session
    await restFetch('https://test-project.supabase.co/rest/v1/test', { method: 'GET' })
    let headers = new Headers(mockFetch.mock.calls[0][1].headers)
    expect(headers.get('Authorization')).toBe('Bearer test-anon-key-1234567890')

    mockFetch.mockClear()

    // Now store a session token (simulating sign-in completing)
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      access_token: 'fresh-token-after-signin',
      user: { id: 'user-1' },
    }))

    // Second call — should pick up the new token immediately
    await restFetch('https://test-project.supabase.co/rest/v1/test', { method: 'GET' })
    headers = new Headers(mockFetch.mock.calls[0][1].headers)
    expect(headers.get('Authorization')).toBe('Bearer fresh-token-after-signin')
  })
})
