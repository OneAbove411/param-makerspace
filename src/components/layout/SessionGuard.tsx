import { useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { refetchAllActiveQueries } from '../../lib/hooks';

// Only kick a refetch cascade if the tab was hidden for at least this
// long.  Brief alt-tabs don't need to invalidate every query.
const MIN_HIDDEN_FOR_REFETCH_MS = 30_000;

/**
 * SessionGuard — lightweight visibility-aware recovery.
 *
 * Supabase JS (with `autoRefreshToken: true`) already installs its own
 * `visibilitychange` listener that calls `startAutoRefresh()` when the
 * tab becomes visible and `stopAutoRefresh()` when it's hidden.  That
 * internal handler takes care of token refresh and session management.
 *
 * **This component must NOT call `stopAutoRefresh`, `startAutoRefresh`,
 * `refreshSession`, or `getSession` inside a visibilitychange handler.**
 * Doing so fights the built-in handler, introduces blocking awaits that
 * stall data queries, and causes the "0 results until hard refresh" bug.
 *
 * What this component does:
 *   1. After a long absence (≥ 30s), update the realtime socket's JWT
 *      so channels don't silently fail RLS checks.
 *   2. After a long absence, kick `refetchAllActiveQueries()` so stale
 *      useSupabaseQuery hooks re-fetch.
 *
 * That's it.  Everything else is Supabase's job.
 */
export function SessionGuard() {
    useEffect(() => {
        if (typeof document === 'undefined') return;

        let hiddenAt: number | null = null;

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                hiddenAt = Date.now();
                return;
            }

            // Tab became visible
            const hiddenDurationMs = hiddenAt != null ? Date.now() - hiddenAt : 0;
            hiddenAt = null;

            // Brief switch — do nothing.  Token is still valid,
            // websocket is still alive, auto-refresh timer is fine.
            if (hiddenDurationMs < MIN_HIDDEN_FOR_REFETCH_MS) return;

            // Extended absence — update realtime auth and refetch data.
            // We read the token from localStorage (where Supabase's own
            // auto-refresh already wrote the latest JWT) instead of
            // making a blocking network call.
            try {
                const raw = localStorage.getItem('param-makerspace-auth');
                if (raw) {
                    const token = JSON.parse(raw)?.access_token;
                    if (token) supabase.realtime.setAuth(token);
                }
            } catch { /* ignore */ }

            try { refetchAllActiveQueries(); } catch { /* ignore */ }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    return null;
}
