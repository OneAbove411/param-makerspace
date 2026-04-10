import React, { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';

/**
 * §1.5 — OAuth / PKCE landing page.
 *
 * With PKCE flow, Supabase redirects back with a `?code=` query param
 * instead of a hash fragment. We call `exchangeCodeForSession` to convert
 * the auth code into a session. The AuthProvider's onAuthStateChange
 * listener then picks up the SIGNED_IN event.
 *
 * We also honor the `?next=` query param for post-auth redirect, validate
 * it (open-redirect guard), and navigate once auth is ready.
 */
function safeNext(raw: string | null): string {
    if (!raw) return '/dashboard';
    if (!raw.startsWith('/')) return '/dashboard';
    if (raw.startsWith('//')) return '/dashboard';
    return raw;
}

export function AuthCallback() {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const { user, isLoading } = useAuth();
    const exchanged = useRef(false);

    const next = safeNext(params.get('next'));
    const code = params.get('code');

    // PKCE: exchange the auth code for a session (once)
    useEffect(() => {
        if (!code || exchanged.current) return;
        exchanged.current = true;
        supabase.auth.exchangeCodeForSession(code).catch((err) => {
            console.error('[param] PKCE code exchange failed:', err);
        });
    }, [code]);

    useEffect(() => {
        if (isLoading) return;
        // If the OAuth round-trip failed, fall back to the login page with
        // the same redirect target so the user can retry.
        if (!user) {
            navigate(`/login?redirect=${encodeURIComponent(next)}`, { replace: true });
            return;
        }
        navigate(next, { replace: true });
    }, [isLoading, user, navigate, next]);

    return (
        <div className="flex-1 w-full bg-brutal-bg min-h-screen flex items-center justify-center pt-32 px-6">
            <div className="text-center space-y-3">
                <p className="font-drama italic text-brutal-dark/70 text-base">One moment.</p>
                <p
                    className="font-data text-sm text-brutal-dark/60"
                    role="status"
                    aria-live="polite"
                >
                    Redirecting…
                </p>
            </div>
        </div>
    );
}
