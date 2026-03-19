import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase, clearAppAuth } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';

// Check session health every 5 minutes (not 2 — less aggressive)
const CHECK_INTERVAL_MS = 5 * 60 * 1000;

export function SessionGuard() {
    const { user, isLoading } = useAuth();
    const [showPopup, setShowPopup] = useState(false);
    const lastActivityRef = useRef(Date.now());

    // Track user activity
    useEffect(() => {
        const onActivity = () => { lastActivityRef.current = Date.now(); };
        window.addEventListener('mousemove', onActivity, { passive: true });
        window.addEventListener('keydown', onActivity, { passive: true });
        return () => {
            window.removeEventListener('mousemove', onActivity);
            window.removeEventListener('keydown', onActivity);
        };
    }, []);

    const checkSession = useCallback(async () => {
        // Don't check while auth is still loading, or if user isn't logged in
        if (isLoading || !user) return;

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                // No session found — but only show popup if user WAS logged in
                setShowPopup(true);
                return;
            }

            // Check if token expires within 2 minutes
            const expiresAt = session.expires_at;
            if (expiresAt) {
                const timeLeft = expiresAt - Math.floor(Date.now() / 1000);
                if (timeLeft < 120) {
                    const { error } = await supabase.auth.refreshSession();
                    if (error) {
                        setShowPopup(true);
                    }
                }
            }
        } catch {
            // Network error — don't logout, just ignore
        }
    }, [user, isLoading]);

    // Periodic check — only when user is logged in and auth is done loading
    useEffect(() => {
        if (isLoading || !user) return;
        const interval = setInterval(checkSession, CHECK_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [user, isLoading, checkSession]);

    // Check when tab becomes visible again
    useEffect(() => {
        const onVisible = () => {
            if (document.visibilityState === 'visible' && user && !isLoading) {
                checkSession();
            }
        };
        document.addEventListener('visibilitychange', onVisible);
        return () => document.removeEventListener('visibilitychange', onVisible);
    }, [user, isLoading, checkSession]);

    const handleRelogin = () => {
        clearAppAuth();
        supabase.auth.signOut().catch(() => {});
        window.location.replace('/login');
    };

    if (!showPopup) return null;

    return (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8 text-center border-2 border-brutal-dark/10">
                <div className="w-12 h-12 bg-brutal-red/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-brutal-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                </div>
                <h3 className="font-heading font-bold text-xl uppercase mb-2">Session Expired</h3>
                <p className="font-data text-sm text-brutal-dark/70 mb-6">
                    Your session has timed out. Please log in again to continue.
                </p>
                <button
                    onClick={handleRelogin}
                    className="w-full bg-brutal-red text-white font-heading font-bold py-3 px-6 rounded-full hover:bg-brutal-dark transition-colors uppercase text-sm tracking-widest"
                >
                    Log In Again
                </button>
            </div>
        </div>
    );
}
