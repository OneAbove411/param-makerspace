import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    useMemo,
    useRef,
} from 'react';
import { supabase, clearAppAuth, handleAuthError } from './supabase';
import type { Session, AuthChangeEvent } from '@supabase/supabase-js';
import type { Role } from './database.types';
import { onUserJoined } from './badgeEngine';

export type { Role };

export interface User {
    id: string; // app_user.id
    authId: string; // auth.users.id
    email: string;
    name: string;
    role: Role;
    avatar?: string;
}

interface AuthContextType {
    user: User | null;
    session: Session | null;
    role: Role;
    isLoading: boolean;
    isRecovery: boolean;
    signUp: (
        email: string,
        password: string,
        name: string,
        declaredIntent?: string | null
    ) => Promise<{ error: string | null }>;
    signIn: (
        email: string,
        password: string
    ) => Promise<{ error: string | null }>;
    signInWithGoogle: (
        redirectPath?: string | null
    ) => Promise<{ error: string | null }>;
    signOut: () => Promise<void>;
    resetPassword: (email: string) => Promise<{ error: string | null }>;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── AUTH-ONLY fetch: only hits app_user table ───
// Returns `null` for missing rows. If the matching row has `is_active=false`
// (admin-suspended), forcibly clears the session and redirects to /login so
// the suspended user can NEVER reach an authenticated screen, even on hard
// refresh or back-nav.
async function fetchAppUser(authId: string): Promise<User | null> {
    const { data, error, status } = await supabase
        .from('app_user')
        .select('id, auth_id, email, name, role, is_active')
        .eq('auth_id', authId)
        .maybeSingle();

    if (error) {
        handleAuthError(status);
        return null;
    }
    if (!data) return null;

    // Suspended accounts are evicted from the app even if they already
    // have a valid Supabase access token in localStorage.
    if ((data as any).is_active === false) {
        clearAppAuth();
        supabase.auth.signOut().catch(() => {});
        try {
            sessionStorage.setItem(
                'auth_suspended_message',
                'This account has been suspended. Please contact an administrator.'
            );
        } catch { /* ignore */ }
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
            window.location.replace('/login');
        }
        return null;
    }

    return {
        id: data.id,
        authId: data.auth_id,
        email: data.email,
        name: data.name,
        role: data.role as Role,
    };
}

// ─── Lazy avatar loader ───
async function fetchAvatar(userId: string): Promise<string | undefined> {
    const { data } = await supabase
        .from('maker_profile')
        .select('avatar_url')
        .eq('user_id', userId)
        .maybeSingle();

    return (data as any)?.avatar_url || undefined;
}

// ─── Ensure maker_profile exists (first login) ───
async function ensureMakerProfile(
    userId: string,
    name: string,
    declaredIntent?: string | null
): Promise<void> {
    const { data } = await supabase
        .from('maker_profile')
        .select('id, declared_intent')
        .eq('user_id', userId)
        .maybeSingle();

    if (data) {
        // Backfill declared_intent if we have one and the row is missing it.
        // Idempotent — never overwrites an existing value.
        if (declaredIntent && !(data as any).declared_intent) {
            await supabase
                .from('maker_profile')
                .update({ declared_intent: declaredIntent })
                .eq('user_id', userId);
        }
        return;
    }

    await supabase.from('maker_profile').insert({
        user_id: userId,
        display_name: name,
        is_public: true,
        ...(declaredIntent ? { declared_intent: declaredIntent } : {}),
    });

    try { await onUserJoined(userId); } catch { /* non-critical */ }
}

// ─── Read pending declared_intent from auth metadata or sessionStorage ───
function readPendingDeclaredIntent(authUser: any | null | undefined): string | null {
    const meta = authUser?.user_metadata?.declared_intent;
    if (typeof meta === 'string' && meta.trim()) return meta;
    try {
        const stash = sessionStorage.getItem('pending_declared_intent');
        if (stash && stash.trim()) return stash;
    } catch { /* ignore */ }
    return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRecovery, setIsRecovery] = useState(false);
    const isRecoveryRef = useRef(false);
    const initDone = useRef(false);
    const eventCounter = useRef(0); // Tracks latest event to discard stale async results
    const bufferedEvents = useRef<{ event: AuthChangeEvent; session: Session | null }[]>([]);

    useEffect(() => {
        let mounted = true;

        // With PKCE flow, recovery is detected via the PASSWORD_RECOVERY
        // event from onAuthStateChange (handled below). No hash-fragment
        // parsing needed — PKCE uses query params, not URL hash.

        async function init() {
            // 1. Try to get the session from storage
            const { data: { session: s }, error: sessionError } =
                await supabase.auth.getSession();

            if (sessionError || !s) {
                // No valid session in storage — that's fine, just not logged in
                if (sessionError) {
                    // Stale token in storage — wipe it silently
                    clearAppAuth();
                    supabase.auth.signOut().catch(() => {});
                }
                if (mounted) {
                    setUser(null);
                    setSession(null);
                    setIsLoading(false);
                }
                initDone.current = true;
                return;
            }

            // 2. If this is a recovery flow, store the session but do NOT
            //    load the app user — the user is NOT "logged in".
            if (isRecoveryRef.current) {
                if (mounted) {
                    setSession(s);
                    setUser(null);
                    setIsLoading(false);
                }
                initDone.current = true;
                return;
            }

            // 3. Skip the extra supabase.auth.getUser() server round-trip.
            //    It blocked initial paint on every cold load / back-nav.
            //    If the token is actually dead, the first data query below
            //    (fetchAppUser) will 401 and handleAuthError will clean up.

            // 4. Load app user
            setSession(s);
            const appUser = await fetchAppUser(s.user.id);
            if (mounted) {
                setUser(appUser);
                setIsLoading(false);
                if (appUser) {
                    // Fire-and-forget avatar load
                    fetchAvatar(appUser.id).then((avatar) => {
                        if (mounted && avatar)
                            setUser((prev) => (prev ? { ...prev, avatar } : prev));
                    });
                    // Fire-and-forget profile ensure (with optional intent backfill)
                    const pendingIntent = readPendingDeclaredIntent(s.user);
                    ensureMakerProfile(appUser.id, appUser.name, pendingIntent)
                        .then(() => {
                            if (pendingIntent) {
                                try { sessionStorage.removeItem('pending_declared_intent'); } catch { /* ignore */ }
                            }
                        })
                        .catch(console.error);
                }
            }
            initDone.current = true;

            // Replay any auth events that arrived while init was running.
            // This ensures TOKEN_REFRESHED events aren't silently dropped.
            if (bufferedEvents.current.length > 0) {
                const events = bufferedEvents.current.splice(0);
                // Only the latest TOKEN_REFRESHED matters — apply its session
                const lastRefresh = [...events].reverse().find(e => e.event === 'TOKEN_REFRESHED');
                if (lastRefresh?.session && mounted) {
                    setSession(lastRefresh.session);
                }
            }
        }

        init();

        // ─── Auth state listener (handles sign-in, sign-out, token refresh) ───
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, s) => {
            if (!mounted) return;

            // TOKEN_REFRESHED fires on every tab-return (Supabase's built-in
            // autoRefreshToken handler).  The user hasn't changed — only the
            // access_token rotated — so re-fetching the app_user is wasteful
            // and causes a visible loading flash / stale-data flicker.
            // Just update the session object silently.
            if (event === 'TOKEN_REFRESHED') {
                setSession(s);
                return;
            }

            // Buffer non-critical events during init to avoid double-loading,
            // but don't drop them — they'll be replayed after init completes.
            if (!initDone.current && event !== 'SIGNED_IN' && event !== 'SIGNED_OUT') {
                bufferedEvents.current.push({ event, session: s });
                return;
            }

            // Handle password recovery flow — set flag and skip normal user loading
            if (event === 'PASSWORD_RECOVERY') {
                isRecoveryRef.current = true;
                if (mounted) {
                    setIsRecovery(true);
                    setSession(s);
                    setIsLoading(false);
                }
                return;
            }

            // Skip ALL auth processing while in recovery mode.
            // This prevents SIGNED_IN, TOKEN_REFRESHED, USER_UPDATED etc.
            // from loading the app user and showing a "logged in" navbar.
            if (isRecoveryRef.current) {
                if (mounted) {
                    setSession(s);
                    setIsLoading(false);
                }
                return;
            }

            setSession(s);

            if (s?.user) {
                const thisEvent = ++eventCounter.current;
                const appUser = await fetchAppUser(s.user.id);
                // Discard result if a newer event has fired while we were awaiting
                if (!mounted || thisEvent !== eventCounter.current) return;
                setUser(appUser);
                if (appUser) {
                    fetchAvatar(appUser.id).then((avatar) => {
                        if (mounted && avatar && thisEvent === eventCounter.current)
                            setUser((prev) => (prev ? { ...prev, avatar } : prev));
                    });
                    if (event === 'SIGNED_IN') {
                        const pendingIntent = readPendingDeclaredIntent(s.user);
                        ensureMakerProfile(appUser.id, appUser.name, pendingIntent)
                            .then(() => {
                                if (pendingIntent) {
                                    try { sessionStorage.removeItem('pending_declared_intent'); } catch { /* ignore */ }
                                }
                            })
                            .catch(console.error);
                    }
                }
                setIsLoading(false);
            } else {
                eventCounter.current++;
                if (mounted) {
                    setUser(null);
                    setIsLoading(false);
                }
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const signUp = async (
        email: string,
        password: string,
        name: string,
        declaredIntent?: string | null
    ) => {
        try {
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        name,
                        // Persist into auth.users.raw_user_meta_data so it
                        // survives the email-verification round-trip and is
                        // available the very first time ensureMakerProfile()
                        // runs after sign-in.
                        ...(declaredIntent ? { declared_intent: declaredIntent } : {}),
                    },
                },
            });
            if (error) {
                return { error: error.message || JSON.stringify(error) };
            }
            // Stash locally too so the post-verify dashboard can backfill
            // the column even before the user re-opens this tab.
            if (declaredIntent) {
                try {
                    sessionStorage.setItem('pending_declared_intent', declaredIntent);
                } catch { /* storage may be unavailable in private mode */ }
            }
            return { error: null };
        } catch (e: any) {
            return { error: e?.message || 'An unexpected error occurred during signup.' };
        }
    };

    const signIn = async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) return { error: error.message || null };

        // Block suspended accounts at the sign-in gate. Without this check the
        // admin "Suspend" button only flipped a flag no one enforced — users
        // could keep logging in normally. Now a suspended login is rejected
        // with a clear error message and the session is immediately torn down.
        const authId = data?.session?.user?.id;
        if (authId) {
            const { data: row } = await supabase
                .from('app_user')
                .select('is_active')
                .eq('auth_id', authId)
                .maybeSingle();
            if (row && (row as any).is_active === false) {
                clearAppAuth();
                await supabase.auth.signOut().catch(() => {});
                return {
                    error:
                        'This account has been suspended. Please contact an administrator.',
                };
            }
        }
        return { error: null };
    };

    const signInWithGoogle = async (redirectPath?: string | null) => {
        // Validate the redirect target the same way Login/Register do —
        // open-redirect guard. Default to /auth/callback so we can run the
        // post-OAuth intent backfill + profile gate before sending the
        // user on to their final destination.
        const safeRedirect =
            redirectPath && redirectPath.startsWith('/') && !redirectPath.startsWith('//')
                ? redirectPath
                : '/dashboard';
        const callbackUrl = new URL(`${window.location.origin}/auth/callback`);
        callbackUrl.searchParams.set('next', safeRedirect);

        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: callbackUrl.toString(),
            },
        });
        return { error: error?.message || null };
    };

    const signOut = async () => {
        // Clear state immediately so UI updates instantly
        isRecoveryRef.current = false;
        setIsRecovery(false);
        setUser(null);
        setSession(null);
        clearAppAuth();
        await supabase.auth.signOut();
    };

    const resetPassword = async (email: string) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/update-password`,
        });
        return { error: error?.message || null };
    };

    const refreshUser = useCallback(async () => {
        const {
            data: { session: s },
        } = await supabase.auth.getSession();
        if (s?.user) {
            const appUser = await fetchAppUser(s.user.id);
            if (appUser) {
                const avatar = await fetchAvatar(appUser.id);
                setUser({ ...appUser, avatar });
            }
        }
    }, []);

    const value = useMemo(
        () => ({
            user,
            session,
            role: user?.role || 'viewer',
            isLoading,
            isRecovery,
            signUp,
            signIn,
            signInWithGoogle,
            signOut,
            resetPassword,
            refreshUser,
        }),
        [user, session, isLoading, isRecovery, signUp, signIn, signInWithGoogle, signOut, resetPassword, refreshUser]
    );

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

// Dispatch when rank advances — listened by RootLayout for celebration modal
export function dispatchRankUp(
    previousRank: string,
    newRank: string,
    newXP: number
) {
    window.dispatchEvent(
        new CustomEvent('rankup', {
            detail: { previousRank, newRank, newXP },
        })
    );
}
