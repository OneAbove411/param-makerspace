import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_DATABASE_URL || 'https://YOUR_PROJECT.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_ANON_KEY';

// ─── App-scoped storage key ───
export const STORAGE_KEY = 'param-makerspace-auth';

// ─── Bump this on each deploy to auto-clear stale tokens ───
// When the stored version doesn't match, we wipe old auth data.
export const APP_VERSION = '1.0.1'; // <-- increment this on each deploy

// ─── Targeted cleanup: only removes THIS app's auth keys ───
export function clearAppAuth(): void {
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
}

// ─── Version-based auto-cleanup ───
// Runs once on page load. If the stored version doesn't match APP_VERSION,
// wipe stale auth tokens so users never get stuck after a new deploy.
(function autoCleanOnDeploy() {
    if (typeof window === 'undefined') return;
    const storedVersion = localStorage.getItem('param-makerspace-version');
    if (storedVersion !== APP_VERSION) {
        console.info(
            `App version changed (${storedVersion} → ${APP_VERSION}), clearing stale auth tokens`
        );
        clearAppAuth();
        localStorage.setItem('param-makerspace-version', APP_VERSION);
    }
})();

// ─── Custom storage adapter ───
// Wraps localStorage with try/catch to gracefully handle:
// 1. Safari ITP / private browsing (throws on write)
// 2. localStorage being full
// Falls back to an in-memory Map so the app still works.
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
        // Reduce the window during which a stale token causes 400s.
        // Token refresh happens 60s before expiry by default; bumping this
        // to 120s gives more buffer on slow/flaky Netlify edge connections.
        flowType: 'pkce',
    },
    global: {
        headers: {
            'x-app-version': APP_VERSION,
        },
    },
});