import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabase';
import type { Session, User as SupaUser } from '@supabase/supabase-js';
import type { Role, AppUser } from './database.types';

export type { Role };

export interface User {
    id: string;         // app_user.id
    authId: string;     // auth.users.id
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
    signUp: (email: string, password: string, name: string) => Promise<{ error: string | null }>;
    signIn: (email: string, password: string) => Promise<{ error: string | null }>;
    signOut: () => Promise<void>;
    resetPassword: (email: string) => Promise<{ error: string | null }>;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function fetchAppUser(authId: string): Promise<User | null> {
    console.log('[Auth] fetchAppUser called for authId:', authId);
    try {
        const { data, error } = await supabase
            .from('app_user')
            .select('*')
            .eq('auth_id', authId)
            .single();

        if (error) {
            console.error('[Auth] Error fetching app_user:', error.message, error.details);
            return null;
        }
        if (!data) {
            console.warn('[Auth] No app_user found for authId:', authId);
            return null;
        }

        const appUser = data as AppUser;
        console.log('[Auth] app_user found:', appUser.id, appUser.name, 'role:', appUser.role);

        // Try to get avatar from maker_profile (non-blocking, don't let it stall login)
        let avatarUrl: string | undefined;
        try {
            const { data: profile } = await supabase
                .from('maker_profile')
                .select('avatar_url')
                .eq('user_id', appUser.id)
                .single();

            if (profile) {
                avatarUrl = profile.avatar_url || undefined;
            } else {
                // If no maker profile exists yet, create a basic one
                console.log('[Auth] No maker_profile found, creating one...');
                const { data: newProfile, error: insertErr } = await supabase.from('maker_profile').insert({
                    user_id: appUser.id,
                    display_name: appUser.name,
                    is_public: true
                }).select('avatar_url').single();
                if (insertErr) {
                    console.warn('[Auth] Could not create maker_profile:', insertErr.message);
                } else {
                    avatarUrl = newProfile?.avatar_url || undefined;
                }
            }
        } catch (profileErr) {
            console.warn('[Auth] Error fetching/creating maker_profile, skipping:', profileErr);
        }

        return {
            id: appUser.id,
            authId: appUser.auth_id,
            email: appUser.email,
            name: appUser.name,
            role: appUser.role as Role,
            avatar: avatarUrl,
        };
    } catch (err) {
        console.error('[Auth] Unexpected error in fetchAppUser:', err);
        return null;
    }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        async function getInitialSession() {
            try {
                const { data: { session: s }, error } = await supabase.auth.getSession();
                if (error) throw error;

                if (mounted) {
                    setSession(s);
                    if (s?.user) {
                        const appUser = await fetchAppUser(s.user.id);
                        if (mounted) setUser(appUser);
                    } else {
                        if (mounted) setUser(null);
                    }
                }
            } catch (error) {
                console.error("Error getting session:", error);
                if (mounted) setUser(null);
            } finally {
                if (mounted) setIsLoading(false);
            }
        }

        getInitialSession();

        // Listen for auth changes (login, logout, token refresh)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, s) => {
                if (!mounted) return;

                if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
                    setSession(s);

                    if (s?.user) {
                        const appUser = await fetchAppUser(s.user.id);
                        if (mounted) setUser(appUser);
                    } else {
                        if (mounted) setUser(null);
                    }
                    if (mounted) setIsLoading(false);
                }
            }
        );

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const signUp = async (email: string, password: string, name: string) => {
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { name } }
        });
        return { error: error?.message || null };
    };

    const signIn = async (email: string, password: string) => {
        console.log('[Auth] signIn called for:', email);
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            console.error('[Auth] signIn error:', error.message);
            return { error: error.message };
        }

        // Wait for the app user to be fetched so the caller can safely navigate
        if (data.user) {
            console.log('[Auth] signIn success, fetching app user...');
            const appUser = await fetchAppUser(data.user.id);
            setUser(appUser);
            setSession(data.session);
            setIsLoading(false);
            if (!appUser) {
                console.error('[Auth] signIn succeeded but no app_user found — user may not exist in app_user table');
                return { error: 'Account not found in the system. Please contact an admin.' };
            }
        }

        return { error: null };
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

    const refreshUser = async () => {
        if (session?.user) {
            const appUser = await fetchAppUser(session.user.id);
            setUser(appUser);
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            session,
            role: user?.role || 'viewer',
            isLoading,
            signUp,
            signIn,
            signOut,
            resetPassword,
            refreshUser,
        }}>
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
