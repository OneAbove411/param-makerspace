import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../lib/auth';

/**
 * §1.5 — OAuth landing page.
 *
 * Supabase JS auto-detects the URL hash on import and exchanges it for a
 * session, so by the time this component mounts the AuthProvider's
 * onAuthStateChange handler is already running. Our job here is just to
 * (a) honor the `?next=` query param the OAuth start put on the callback URL,
 * (b) validate it (open-redirect guard), and (c) navigate once auth is ready.
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

    const next = safeNext(params.get('next'));

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
