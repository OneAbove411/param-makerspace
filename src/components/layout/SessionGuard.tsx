/**
 * SessionGuard — intentionally a no-op as of the post-demo pass.
 *
 * The previous implementation ran a `setInterval` every 5 minutes AND a
 * `visibilitychange` handler that called `supabase.auth.refreshSession()`
 * whenever the tab came back to the foreground, even though Supabase's JS
 * client already does `autoRefreshToken: true` on its own. This caused two
 * very visible bugs:
 *
 *   1. The "Session Expired" popup could appear while the user was still
 *      actively using the tab (any network blip during the pre-expire
 *      refresh flipped `setShowPopup(true)`).
 *   2. Every tab re-focus kicked off a refetch cascade because the auth
 *      state listener treated the TOKEN_REFRESHED event as a fresh
 *      sign-in and re-loaded the app user.
 *
 * The ground truth is now simply: Supabase refreshes the token silently,
 * and `handleAuthError(401)` in src/lib/supabase.ts redirects to /login
 * the moment a request actually comes back with a dead session. There is
 * no need for a second, client-side watchdog on top of that.
 *
 * The component is kept (rather than deleted outright) so that existing
 * imports in RootLayout continue to compile, and so that a future
 * session-health heuristic can be added here without re-plumbing.
 */
export function SessionGuard() {
    return null;
}
