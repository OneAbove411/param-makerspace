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

// No-op lock: navigator.locks deadlocks in dev (HMR) and custom mutexes
// can also deadlock if the internal Supabase promise chain stalls.
// The safest option: skip locking entirely. The Supabase client handles
// concurrent session access internally via _useSession deduplication.
// The only downside is a harmless "Lock broken" console warning on HMR.
const noopLock = (_name: string, _acquireTimeout: number, fn: () => Promise<any>) => fn();

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: robustStorage,
        storageKey: STORAGE_KEY,
        flowType: 'implicit',
        lock: noopLock,
    },
    global: {
        headers: { 'x-app-version': APP_VERSION },
    },
});

// ─── Auth error handler (used by auth.tsx) ───
export function handleAuthError(status: number): void {
    if (status === 401) {
        console.warn('[param] 401 from Supabase — session dead, clearing auth');
        clearAppAuth();
        supabase.auth.signOut().catch(() => {});
        window.location.replace('/login');
    }
}
