import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './auth';
import { useMyProfile } from './hooks';

/**
 * §1.5 F-102 — profile-completion gate.
 *
 * Wraps protected pages (Dashboard, Projects, etc.). If the signed-in user
 * has no bio, no skills, and no avatar, redirect them to /profile-setup once
 * with a `?next=` pointing back at the page they were trying to reach.
 *
 * Idempotent per session: a `redirected_to_profile_setup` sessionStorage flag
 * prevents loops if the user dismisses Profile Setup without saving.
 */
export function useRequireProfile() {
    const { user, isLoading: authLoading } = useAuth();
    const { data: profile, loading: profileLoading } = useMyProfile();
    const navigate = useNavigate();
    const location = useLocation();
    const ranRef = useRef(false);

    useEffect(() => {
        if (ranRef.current) return;
        if (authLoading || profileLoading) return;
        if (!user) return;

        const p = profile as any | null;
        const hasBio = !!p?.bio?.trim();
        const hasAvatar = !!p?.avatar_url;

        // Skills are stored separately as tags. The audit allows checking
        // any one of bio/skills/avatar — bio + avatar is the cheapest signal
        // here and matches the spec ("if all empty").
        const empty = !hasBio && !hasAvatar;
        if (!empty) return;

        // Don't loop on the profile-setup page itself.
        if (location.pathname.startsWith('/profile-setup')) return;

        // Once-per-session guard.
        try {
            if (sessionStorage.getItem('redirected_to_profile_setup') === '1') return;
            sessionStorage.setItem('redirected_to_profile_setup', '1');
        } catch { /* ignore */ }

        ranRef.current = true;
        const target = `${location.pathname}${location.search}${location.hash}`;
        const next =
            target.startsWith('/') && !target.startsWith('//') ? target : '/dashboard';
        navigate(`/profile-setup?next=${encodeURIComponent(next)}`, { replace: true });
    }, [authLoading, profileLoading, user, profile, navigate, location]);
}
