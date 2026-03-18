import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    useRef,
} from 'react';
import { supabase, clearAppAuth } from './supabase';
import type { Session } from '@supabase/supabase-js';
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
    signUp: (
        email: string,
        password: string,
        name: string
    ) => Promise<{ error: string | null }>;
    signIn: (
        email: string,
        password: string
    ) => Promise<{ error: string | null }>;
    signOut: () => Promise<void>;
    resetPassword: (email: string) => Promise<{ error: string | null }>;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── AUTH-ONLY fetch: only hits app_user table ───
// Uses maybeSingle() instead of single() to avoid 406 errors when row
// doesn't exist yet (e.g. during signup before trigger fires).
async function fetchAppUser(authId: string): Promise<User | null> {
    const { data, error } = await supabase
        .from('app_user')
        .select('id, auth_id, email, name, role')
        .eq('auth_id', authId)
        .maybeSingle(); // ← was .single(), which causes 406 when row is missing

    if (error || !data) return null;

    const u = data as any;
    return {
        id: u.id,
        authId: u.auth_id,
        email: u.email,
        name: u.name,
        role: u.role as Role,
    };
}

// ─── Lazy avatar loader: runs AFTER auth is resolved ───
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
    name: string
): Promise<void> {
    const { data } = await supabase
        .from('maker_profile')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

    if (!data) {
        await supabase.from('maker_profile').insert({
            user_id: userId,
            display_name: name,
            is_public: true,
        });

        try {
            await onUserJoined(userId);
        } catch (err) {
            console.error('Failed to award Curious badge', err);
        }
    }
}

// ─── Toast notification for stale session cleanup ───
function SessionToast({ onDismiss }: { onDismiss: () => void }) {
    useEffect(() => {
        const timer = setTimeout(onDismiss, 5000);
        return () => clearTimeout(timer);
    }, [onDismiss]);

    return (
        <div
            style={{
                position: 'fixed',
                top: 16,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 9999,
                padding: '12px 24px',
                borderRadius: 12,
                background: '#1a1a2e',
                color: '#fff',
                fontFamily: 'system-ui, sans-serif',
                fontSize: 14,
                boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                maxWidth: '90vw',
            }}
        >
            <span style={{ fontSize: 18 }}>🔄</span>
            <span>
                Your session expired. Please{' '}
                <strong>log in again</strong>.
            </span>
            <button
                onClick={onDismiss}
                style={{
                    background: 'none',
                    border: 'none',
                    color: '#888',
                    cursor: 'pointer',
                    fontSize: 18,
                    padding: '0 4px',
                }}
            >
                ×
            </button>
        </div>
    );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const hasStoredSession =
        typeof window !== 'undefined' &&
        Object.keys(localStorage).some(
            (k) => k.startsWith('sb-') || k === 'param-makerspace-auth'
        );

    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(hasStoredSession);
    const [sessionCleared, setSessionCleared] = useState(false);

    // ─── Mutex: prevents the onAuthStateChange listener from firing
    // while checkInitialSession is still running (the race condition
    // that causes 400 errors — listener fires with stale token, makes
    // DB queries, Supabase rejects with 400).
    const isCleaningUp = useRef(false);

    useEffect(() => {
        let mounted = true;

        const checkInitialSession = async () => {
            try {
                const {
                    data: { session: localSession },
                    error: sessionError,
                } = await supabase.auth.getSession();

                let isBadToken = false;

                if (sessionError) {
                    isBadToken = true;
                } else if (localSession) {
                    // Proactively verify the token is still valid on the server.
                    // getSession() only checks localStorage; getUser() hits the API.
                    const { error: userError } = await supabase.auth.getUser();
                    if (userError) {
                        isBadToken = true;
                    }
                }

                if (isBadToken) {
                    console.warn('Bad or expired token detected — wiping it completely.');
                    // ↓ Set mutex BEFORE clearing so the listener doesn't fire mid-cleanup
                    isCleaningUp.current = true;
                    clearAppAuth();
                    supabase.auth.signOut().catch(() => { });

                    if (mounted) {
                        setUser(null);
                        setSession(null);
                        setIsLoading(false);
                        setSessionCleared(true);
                    }
                    // Give signOut a tick to finish, then release mutex
                    setTimeout(() => {
                        isCleaningUp.current = false;
                    }, 500);
                }
            } catch (err) {
                console.error('Session check failed', err);
                if (mounted) setIsLoading(false);
            }
        };

        checkInitialSession();

        // ─── Primary auth listener ───
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, s) => {
            if (!mounted) return;

            // Block listener while cleanup is in progress to avoid 400 errors
            if (isCleaningUp.current) return;

            setSession(s);

            if (s?.user) {
                try {
                    const appUser = await fetchAppUser(s.user.id);
                    if (mounted) {
                        setUser(appUser);
                        if (appUser) {
                            // Load avatar lazily — don't block auth resolution
                            fetchAvatar(appUser.id).then((avatar) => {
                                if (mounted && avatar)
                                    setUser((prev) => (prev ? { ...prev, avatar } : prev));
                            });
                            if (event === 'SIGNED_IN') {
                                // Fire-and-forget — don't block loading state
                                ensureMakerProfile(appUser.id, appUser.name).catch(
                                    console.error
                                );
                            }
                        }
                    }
                } catch (err) {
                    console.error('Error fetching app user:', err);
                    if (mounted) setUser(null);
                } finally {
                    if (mounted) setIsLoading(false);
                }
            } else {
                setUser(null);
                if (mounted) setIsLoading(false);
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const signUp = async (email: string, password: string, name: string) => {
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { name } },
        });
        return { error: error?.message || null };
    };

    const signIn = async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        return { error: error?.message || null };
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);
    };

    const resetPassword = async (email: string) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/login`,
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

    return (
        <AuthContext.Provider
            value={{
                user,
                session,
                role: user?.role || 'viewer',
                isLoading,
                signUp,
                signIn,
                signOut,
                resetPassword,
                refreshUser,
            }}
        >
            {sessionCleared && (
                <SessionToast onDismiss={() => setSessionCleared(false)} />
            )}
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