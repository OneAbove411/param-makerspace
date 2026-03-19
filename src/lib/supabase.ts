import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_DATABASE_URL || 'https://YOUR_PROJECT.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_ANON_KEY';

// ─── App-scoped storage key ───
export const STORAGE_KEY = 'param-makerspace-auth';

// ─── Bump this on each deploy to auto-clear stale tokens ───
export const APP_VERSION = '1.0.2';

// ─── Targeted cleanup: only removes THIS app's auth keys ───
export function clearAppAuth(): void {
    try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (
                key &&
                (key === STORAGE_KEY ||
                    key.startsWith('sb-') ||
                    key === 'param-makerspace-version')
            ) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch {
        // Safari private mode — nothing to clear
    }
}

// ─── Version-based auto-cleanup ───
(function autoCleanOnDeploy() {
    if (typeof window === 'undefined') return;
    try {
        const storedVersion = localStorage.getItem('param-makerspace-version');
        if (storedVersion !== APP_VERSION) {
            clearAppAuth();
            localStorage.setItem('param-makerspace-version', APP_VERSION);
        }
    } catch {
        // ignore
    }
})();

// ─── Custom storage adapter ───
const memoryFallback = new Map<string, string>();

const robustStorage = {
    getItem: (key: string): string | null => {
        try {
            return localStorage.getItem(key);
        } catch {
            return memoryFallback.get(key) ?? null;
        }
    },
    setItem: (key: string, value: string): void => {
        try {
            localStorage.setItem(key, value);
        } catch {
            memoryFallback.set(key, value);
        }
    },
    removeItem: (key: string): void => {
        try {
            localStorage.removeItem(key);
        } catch {
            memoryFallback.delete(key);
        }
    },
};

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: robustStorage,
        storageKey: STORAGE_KEY,
        // Use implicit flow — avoids the navigator.locks issue in React Strict Mode
        // that causes "Lock was not released within 5000ms" warnings and stale sessions.
        // PKCE is only needed for server-side auth; for SPAs, implicit is simpler and reliable.
        flowType: 'implicit',
    },
    global: {
        headers: {
            'x-app-version': APP_VERSION,
        },
    },
});

// ─── Auth error handler ───
// ONLY react to 401 (Unauthorized) — that means the JWT is truly dead.
// Do NOT react to 400 (Bad Request) — that's a query/schema error, not auth.
// The old code treated 400 as auth failure which caused logout on every
// page that queried a missing/renamed table.
export function handleAuthError(status: number): void {
    if (status === 401) {
        console.warn('Got 401 from Supabase — session expired, clearing auth.');
        clearAppAuth();
        supabase.auth.signOut().catch(() => {});
        window.location.replace('/login');
    }
}
