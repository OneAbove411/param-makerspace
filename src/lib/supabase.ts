import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_DATABASE_URL || 'https://YOUR_PROJECT.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_ANON_KEY';

// ─── App-scoped storage key ───
export const STORAGE_KEY = 'param-makerspace-auth';

// ─── Bump this on each deploy to auto-clear stale tokens ───
// When the stored version doesn't match, we wipe old auth data.
export const APP_VERSION = '1.0.0';

// ─── Targeted cleanup: only removes THIS app's auth keys ───
// Never touches other sites' localStorage data.
export function clearAppAuth(): void {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
            key === STORAGE_KEY ||
            key.startsWith('sb-') ||              // Supabase default keys
            key === 'param-makerspace-version'     // Our version marker
        )) {
            keysToRemove.push(key);
        }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
}

// ─── Version-based auto-cleanup ───
// Runs once on page load. If the stored version doesn't match APP_VERSION,
// wipe stale auth tokens so users never get stuck after a new deploy.
(function autoCleanOnDeploy() {
    if (typeof window === 'undefined') return;
    const storedVersion = localStorage.getItem('param-makerspace-version');
    if (storedVersion !== APP_VERSION) {
        console.info(`App version changed (${storedVersion} → ${APP_VERSION}), clearing stale auth tokens`);
        clearAppAuth();
        localStorage.setItem('param-makerspace-version', APP_VERSION);
    }
})();

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: globalThis.localStorage,
        storageKey: STORAGE_KEY,
    },
});
