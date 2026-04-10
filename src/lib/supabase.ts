import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_DATABASE_URL || 'https://YOUR_PROJECT.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_ANON_KEY';

export const STORAGE_KEY = 'param-makerspace-auth';

// ─── BUMP THIS on every deploy that changes DB schema or auth logic ───
// When the stored version doesn't match, ALL auth tokens are wiped
// automatically on page load. This is the "automatic localStorage.clear()"
// that works on Netlify, localhost, everywhere — no manual console needed.
export const APP_VERSION = '2.0.1';

// ─── Wipe all Supabase auth keys from localStorage ───
export function clearAppAuth(): void {
    try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key === STORAGE_KEY || key.startsWith('sb-') || key === 'param-makerspace-version')) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch { /* Safari private mode */ }
}

// ─── Auto-clear on deploy/version change ───
// Runs ONCE synchronously before any React renders.
// If version changed (new deploy), wipe stale tokens so the user
// gets a clean login instead of cryptic 401s.
(function autoCleanOnDeploy() {
    if (typeof window === 'undefined') return;
    try {
        const stored = localStorage.getItem('param-makerspace-version');
        if (stored !== APP_VERSION) {
            console.info(`[param] Version changed ${stored} → ${APP_VERSION}, clearing stale auth`);
            clearAppAuth();
            localStorage.setItem('param-makerspace-version', APP_VERSION);
        }
    } catch { /* ignore */ }
})();

// ─── Validate stored session shape ───
// If localStorage has a corrupted or old-format token, nuke it
// BEFORE Supabase tries to parse it (which would cause silent failures).
(function validateStoredSession() {
    if (typeof window === 'undefined') return;
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return; // no session stored, that's fine
        const parsed = JSON.parse(raw);
        // Must have access_token and user.id to be valid
        if (!parsed?.access_token || !parsed?.user?.id) {
            console.warn('[param] Corrupted session in storage, clearing');
            clearAppAuth();
        }
    } catch {
        // JSON parse failed = corrupted data
        console.warn('[param] Unparseable session in storage, clearing');
        clearAppAuth();
    }
})();

// ─── Storage adapter with fallback ───
const memoryFallback = new Map<string, string>();

const robustStorage = {
    getItem: (key: string): string | null => {
        try { return localStorage.getItem(key); }
        catch { return memoryFallback.get(key) ?? null; }
    },
    setItem: (key: string, value: string): void => {
        try { localStorage.setItem(key, value); }
        catch { memoryFallback.set(key, value); }
    },
    removeItem: (key: string): void => {
        try { localStorage.removeItem(key); }
        catch { memoryFallback.delete(key); }
    },
};

// navigator.locks can deadlock in dev (HMR disposes the old module while
// the lock callback is still awaiting, and the new module's lock waits on
// the now-orphaned previous holder).  Use a no-op lock in dev.
//
// This is safe because SessionGuard no longer calls refreshSession()
// manually — Supabase's built-in autoRefreshToken handles visibility
// changes internally.  The only "races" are concurrent _useSession
// calls from data hooks, which are idempotent (they just read the
// cached session or refresh once — duplicate refreshes are harmless,
// the server simply returns the same access_token for the same
// refresh_token within the reuse interval).
const noopLock = (_name: string, _acquireTimeout: number, fn: () => Promise<any>) => fn();

// ─── Fetch with hard timeout ──────────────────────────────────────
// Background-tab freeze + dead HTTP/2 connection pools can leave a
// raw `fetch()` hanging indefinitely — no rejection, no resolution.
// When that happens to a PostgREST query or a GoTrue refresh call,
// the awaiting hook is wedged and the UI sits on a skeleton forever.
// Wrapping every outbound Supabase fetch in an AbortController-based
// timeout guarantees that nothing can hang longer than FETCH_TIMEOUT_MS.
// On timeout, the promise rejects, the hook's catch branch surfaces an
// error (or a queued refetch fires a fresh request on a healthy
// connection), and the page recovers without a hard refresh.
//
// 20s is long enough to cover slow-but-alive networks and large joined
// selects, but short enough that a wedged tab recovers in seconds.
const FETCH_TIMEOUT_MS = 20_000;

const fetchWithTimeout: typeof fetch = (input, init) => {
    // If the caller already passed a signal, chain ours so aborting
    // either one aborts the fetch. This preserves useSupabaseQuery's
    // own AbortController plumbing.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
        controller.abort(new DOMException('Supabase fetch timed out', 'TimeoutError'));
    }, FETCH_TIMEOUT_MS);

    const callerSignal = init?.signal;
    if (callerSignal) {
        if (callerSignal.aborted) controller.abort(callerSignal.reason);
        else callerSignal.addEventListener('abort', () => controller.abort(callerSignal.reason), { once: true });
    }

    return fetch(input, { ...init, signal: controller.signal })
        .finally(() => clearTimeout(timeoutId));
};

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: robustStorage,
        storageKey: STORAGE_KEY,
        flowType: 'pkce',
        // In dev use a no-op lock to avoid HMR deadlocks.
        // Production uses the default navigator.locks.
        ...(import.meta.env.DEV ? { lock: noopLock } : {}),
    },
    global: {
        headers: { 'x-app-version': APP_VERSION },
        fetch: fetchWithTimeout,
    },
});

// ─── Bypass internal auth lock for data queries ──────────────────
// Supabase's _getAccessToken() calls auth.getSession() which acquires
// an internal lock (_acquireLock).  On visibility changes (tab switch),
// the auth module's _onVisibilityChanged fires _startAutoRefresh +
// _recoverAndRefresh — both hold that same lock.  Data queries that
// call _getAccessToken() are queued behind them, causing "0 results"
// until the lock chain resolves (or never resolves during navigation).
//
// The SDK wires up its fetch path at construction time via:
//   this.fetch = fetchWithAuth(key, this._getAccessToken.bind(this), ...)
// That `.bind()` captures the ORIGINAL _getAccessToken — monkey-patching
// the method after construction does NOT affect already-bound references.
//
// Fix: replace `supabase.fetch` (used by rest, storage, etc.) with a
// wrapper that injects the Authorization header directly from localStorage,
// skipping _getAccessToken / auth.getSession / _acquireLock entirely.
const lockFreeFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    // Only inject auth if not already set (e.g. by a manual override)
    if (!headers.has('Authorization')) {
        let token = supabaseAnonKey;
        try {
            const raw = robustStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed?.access_token) token = parsed.access_token;
            }
        } catch { /* use anon key */ }
        headers.set('Authorization', `Bearer ${token}`);
    }
    if (!headers.has('apikey')) {
        headers.set('apikey', supabaseAnonKey);
    }
    return fetchWithTimeout(input, { ...init, headers });
}) as typeof fetch;

// Patch both the top-level fetch and the PostgREST client's fetch.
// supabase.rest.from() reads this.fetch on every call, so replacing
// it here ensures all subsequent .from().select() queries use our
// lock-free fetch instead of the stale bound fetchWithAuth.
(supabase as any).fetch = lockFreeFetch;
(supabase as any).rest.fetch = lockFreeFetch;

// ─── Auth error handler (used by auth.tsx) ───
export function handleAuthError(status: number): void {
    if (status === 401) {
        console.warn('[param] 401 from Supabase — session dead, clearing auth');
        clearAppAuth();
        supabase.auth.signOut().catch(() => {});
        window.location.replace('/login');
    }
}
