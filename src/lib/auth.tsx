import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    useRef,
} from 'react';
import { supabase, clearAppAuth, handleAuthError } from './supabase';
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
    signInWithGoogle: () => Promise<{ error: string | null }>;
    signOut: () => Promise<void>;
    resetPassword: (email: string) => Promise<{ error: string | null }>;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── AUTH-ONLY fetch: only hits app_user table ───
async function fetchAppUser(authId: string): Promise<User | null> {
    const { data, error, status } = await supabase
        .from('app_user')
        .select('id, auth_id, email, name, role')
        .eq('auth_id', authId)
        .maybeSingle();

    if (error) {
        handleAuthError(status);
        return null;
    }
    if (!data) return null;

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
    name: string
): Promise<void> {
    const { data } = await supabase
        .from('maker_profile')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

    if (data) return; // already exists

    await supabase.from('maker_profile').insert({
        user_id: userId,
        display_name: name,
        is_public: true,
    });

    try { await onUserJoined(userId); } catch { /* non-critical */ }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const initDone = useRef(false);

    useEffect(() => {
        let mounted = true;

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

            // 2. Verify the token is still valid server-side
            const { error: userError } = await supabase.auth.getUser();
            if (userError) {
                // Token is expired/revoked — wipe and bail
                clearAppAuth();
                supabase.auth.signOut().catch(() => {});
                if (mounted) {
                    setUser(null);
                    setSession(null);
                    setIsLoading(false);
                }
                initDone.current = true;
                return;
            }

            // 3. Token is valid — load app user
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
                    // Fire-and-forget profile ensure
                    ensureMakerProfile(appUser.id, appUser.name).catch(console.error);
                }
            }
            initDone.current = true;
        }

        init();

        // ─── Auth state listener (handles sign-in, sign-out, token refresh) ───
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, s) => {
            if (!mounted) return;

            // Skip events during init to avoid double-loading
            if (!initDone.current && event !== 'SIGNED_IN' && event !== 'SIGNED_OUT') return;

            setSession(s);

            if (s?.user) {
                const appUser = await fetchAppUser(s.user.id);
                if (mounted) {
                    setUser(appUser);
                    if (appUser) {
                        fetchAvatar(appUser.id).then((avatar) => {
                            if (mounted && avatar)
                                setUser((prev) => (prev ? { ...prev, avatar } : prev));
                        });
                        if (event === 'SIGNED_IN') {
                            ensureMakerProfile(appUser.id, appUser.name).catch(console.error);
                        }
                    }
                    setIsLoading(false);
                }
            } else {
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

    const signInWithGoogle = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/dashboard`,
            },
        });
        return { error: error?.message || null };
    };

    const signOut = async () => {
        clearAppAuth();
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
                signInWithGoogle,
                signOut,
                resetPassword,
                refreshUser,
            }}
        >
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
