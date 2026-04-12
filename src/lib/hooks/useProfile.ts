/**
 * Profile domain hooks — makers listing, maker detail, my profile, stats, XP.
 */

import { useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../auth';
import { useSupabaseQuery } from './cache';
import type {
    MakerProfile, Badge, Project, Role, XPEvent,
} from '../database.types';

// ─── Makers List ───

export function useMakers(tagFilter?: string, roleFilter?: string) {
    return useSupabaseQuery<(MakerProfile & { skills: string[]; tags: string[]; badgeIds: string[]; userRole?: string; userRank: string; userXP: number })[]>(async () => {
        const { data: profiles, error } = await supabase
            .from('maker_profile')
            .select('id, user_id, display_name, bio, avatar_url, is_public')
            .eq('is_public', true)
            .order('display_name');

        if (error || !profiles) return { data: [], error };

        const profileIds = (profiles as MakerProfile[]).map(p => p.id);
        const userIds = (profiles as MakerProfile[]).map(p => p.user_id);

        const [allTagsRes, allBadgesRes, userRolesRes] = await Promise.all([
            supabase.from('entity_tag').select('target_id, tag:tag(name)').eq('target_type', 'maker_profile').in('target_id', profileIds),
            supabase.from('user_badge').select('user_id, badge_id').in('user_id', userIds),
            supabase.from('app_user').select('id, role, xp, rank').in('id', userIds),
        ]);

        const tagsByProfile: Record<string, string[]> = {};
        (allTagsRes.data || []).forEach((t: any) => {
            const name = t.tag?.name;
            if (name) {
                (tagsByProfile[t.target_id] = tagsByProfile[t.target_id] || []).push(name);
            }
        });

        const badgesByUser: Record<string, string[]> = {};
        (allBadgesRes.data || []).forEach((b: any) => {
            (badgesByUser[b.user_id] = badgesByUser[b.user_id] || []).push(b.badge_id);
        });

        const userInfoMap: Record<string, any> = {};
        (userRolesRes.data || []).forEach((u: any) => { userInfoMap[u.id] = u; });

        let enriched = (profiles as MakerProfile[]).map(p => {
            const tags = tagsByProfile[p.id] || [];
            if (tagFilter && tagFilter !== 'All' && !tags.includes(tagFilter)) return null;
            const uInfo = userInfoMap[p.user_id] || {};
            return {
                ...p,
                skills: tags,
                tags,
                badgeIds: badgesByUser[p.user_id] || [],
                userRole: uInfo.role || 'maker',
                userRank: uInfo.rank || 'Curious',
                userXP: uInfo.xp || 0,
            };
        }).filter(Boolean);

        if (roleFilter && roleFilter !== 'All') {
            enriched = enriched.filter((p: any) => p.userRole === roleFilter.toLowerCase());
        }

        return { data: enriched as any, error: null };
    }, [tagFilter, roleFilter], {
        cacheKey: `makers:${tagFilter ?? 'all'}:${roleFilter ?? 'all'}`,
    });
}

// ─── Maker Detail ───

export function useMaker(id: string | undefined) {
    return useSupabaseQuery<(MakerProfile & {
        skills: string[];
        tags: string[];
        badges: Badge[];
        projects: Project[];
        appUser: { name: string; email: string; role: string; xp: number; rank: string; rank_override: boolean } | null;
        domainLevels: { domain: string; tier: string }[];
        eventsAttended: { id: string; title: string; event_type: string; date: string }[];
        mentoredProjects: { id: string; title: string; domain: string | null }[];
        x_url?: string | null;
        bluesky_url?: string | null;
        discord_username?: string | null;
        mentor_domains?: string | null;
        approval_domains?: string | null;
        show_email?: boolean;
    }) | null>(async () => {
        if (!id) return { data: null, error: null };

        const profileSelect = 'id, user_id, display_name, pronouns, bio, aspirations, avatar_url, github_url, linkedin_url, website_url, is_public, created_at, updated_at, x_url, bluesky_url, discord_username, mentor_domains, approval_domains, show_email';

        let { data: profile, error } = await supabase
            .from('maker_profile')
            .select(profileSelect)
            .or(`id.eq.${id},user_id.eq.${id}`)
            .limit(1)
            .single();

        if (error || !profile) return { data: null, error };
        const p = profile as any;

        const [tagsRes, badgesRes, projectsRes, appUserRes, completionsRes, eventsRes, mentoredRes] = await Promise.all([
            supabase.from('entity_tag').select('tag:tag(name)').eq('target_type', 'maker_profile').eq('target_id', p.id),
            supabase.from('user_badge').select('badge:badge(id, name, description, tier, domain, badge_type, image_url)').eq('user_id', p.user_id),
            supabase.from('project').select('id, title, summary, domain, tier, status, created_at').eq('owner_id', p.user_id).eq('status', 'active').eq('visibility', 'public'),
            supabase.from('app_user').select('name, email, role, xp, rank, rank_override').eq('id', p.user_id).single(),
            supabase.from('challenge_completion').select('challenge:challenge!challenge_id(domain, tier)').eq('user_id', p.user_id).eq('status', 'verified'),
            supabase.from('event_registration').select('event:event!event_id(id, title, event_type, date)').eq('user_id', p.user_id).order('registered_at', { ascending: false }).limit(10),
            supabase.from('project_member').select('project:project!project_id(id, title, domain, status)').eq('user_id', p.user_id).eq('role', 'mentor'),
        ]);

        const tierOrder: Record<string, number> = { 'Tier 1': 1, 'Tier 2': 2, 'Tier 3': 3 };
        const domainMap: Record<string, string> = {};
        (completionsRes.data || []).forEach((c: any) => {
            const domain = c.challenge?.domain;
            const tier = c.challenge?.tier;
            if (!domain || !tier) return;
            const current = domainMap[domain];
            if (!current || (tierOrder[tier] || 0) > (tierOrder[current] || 0)) {
                domainMap[domain] = tier;
            }
        });
        const domainLevels = Object.entries(domainMap).map(([domain, tier]) => ({ domain, tier }));

        return {
            data: {
                ...p,
                skills: (tagsRes.data || []).map((t: any) => t.tag?.name).filter(Boolean),
                tags: (tagsRes.data || []).map((t: any) => t.tag?.name).filter(Boolean),
                badges: (badgesRes.data || []).map((b: any) => b.badge).filter(Boolean) as Badge[],
                projects: (projectsRes.data || []) as Project[],
                appUser: appUserRes.data as any,
                domainLevels,
                eventsAttended: (eventsRes.data || []).map((e: any) => e.event).filter(Boolean),
                mentoredProjects: (mentoredRes.data || []).map((m: any) => m.project).filter(Boolean),
            },
            error: null,
        };
    }, [id]);
}

// ─── My Profile ───

export function useMyProfile() {
    const { user } = useAuth();
    return useSupabaseQuery<MakerProfile | null>(async () => {
        if (!user) return { data: null, error: null };
        return supabase
            .from('maker_profile')
            .select('id, user_id, display_name, pronouns, bio, aspirations, avatar_url, github_url, linkedin_url, website_url, x_url, bluesky_url, discord_username, mentor_domains, approval_domains, show_email, is_public, declared_intent, created_at, updated_at')
            .eq('user_id', user.id)
            .single() as any;
    }, [user?.id]);
}

export function useProfileMutation() {
    const { user, refreshUser } = useAuth();

    const saveProfile = async (data: {
        display_name: string;
        pronouns?: string;
        bio?: string;
        aspirations?: string;
        github_url?: string;
        linkedin_url?: string;
        website_url?: string;
        avatar_url?: string;
        x_url?: string;
        bluesky_url?: string;
        discord_username?: string;
        mentor_domains?: string;
        approval_domains?: string;
        show_email?: boolean;
        skills?: string[];
        declared_intent?: string | null;
    }) => {
        if (!user) return { error: 'Not authenticated' };

        const { skills, ...profileData } = data;

        const [profileRes] = await Promise.all([
            supabase
                .from('maker_profile')
                .upsert({
                    user_id: user.id,
                    ...profileData,
                    is_public: true,
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'user_id' })
                .select('id')
                .single(),
            supabase.from('app_user').update({ name: data.display_name }).eq('id', user.id),
        ]);

        if (profileRes.error) return { error: profileRes.error.message };
        const profileId = (profileRes.data as any)?.id;

        if (skills && skills.length > 0 && profileId) {
            const trimmed = skills.map(s => s.trim()).filter(Boolean);

            await supabase.from('entity_tag').delete().eq('target_type', 'maker_profile').eq('target_id', profileId);

            const { data: tags } = await supabase
                .from('tag')
                .upsert(trimmed.map(name => ({ name })), { onConflict: 'name' })
                .select('id, name');

            if (tags && tags.length > 0) {
                await supabase.from('entity_tag').insert(
                    (tags as any[]).map(t => ({
                        target_type: 'maker_profile' as const,
                        target_id: profileId,
                        tag_id: t.id,
                    }))
                );
            }
        }

        await refreshUser();
        return { error: null };
    };

    return { saveProfile };
}

// ─── Dashboard Stats ───

export function useMyStats() {
    const { user } = useAuth();
    return useSupabaseQuery<{
        activeProjects: number;
        upcomingEvents: number;
        completedChallenges: number;
    }>(async () => {
        if (!user) return { data: { activeProjects: 0, upcomingEvents: 0, completedChallenges: 0 }, error: null };

        const [projectsRes, eventsRes, challengesRes] = await Promise.all([
            supabase.from('project').select('id').eq('owner_id', user.id).in('status', ['active', 'draft', 'pending_review']),
            supabase.from('event_registration').select('event:event(date)').eq('user_id', user.id),
            supabase.from('challenge_completion').select('id').eq('user_id', user.id).eq('status', 'verified'),
        ]);

        const upcomingEvents = (eventsRes.data || []).filter((r: any) =>
            r.event?.date && new Date(r.event.date) > new Date()
        ).length;

        return {
            data: {
                activeProjects: (projectsRes.data || []).length,
                upcomingEvents,
                completedChallenges: (challengesRes.data || []).length,
            },
            error: null,
        };
    }, [user?.id]);
}

// ─── Rank & XP (singleton realtime channel) ───

// Module-level singleton to avoid duplicate channels when useRankAccess()
// is called from Navbar + Dashboard + Projects simultaneously.
const rankChannelRegistry = new Map<string, {
    channel: ReturnType<typeof supabase.channel>;
    listeners: Set<() => void>;
    refCount: number;
}>();

export function useRankAccess() {
    const { user } = useAuth();
    const query = useSupabaseQuery<{ xp: number; rank: string; role: Role } | null>(async () => {
        if (!user) return { data: null, error: null };
        const { data, error } = await supabase
            .from('app_user')
            .select('xp, rank, role')
            .eq('id', user.id)
            .single();
        return { data: data as any, error };
    }, [user?.id]);

    const refetchRef = useRef(query.refetch);
    useEffect(() => { refetchRef.current = query.refetch; }, [query.refetch]);

    useEffect(() => {
        if (!user?.id) return;
        const key = user.id;
        const listener = () => { refetchRef.current(); };
        let entry = rankChannelRegistry.get(key);
        if (!entry) {
            const channel = supabase
                .channel(`app_user_rank_${key}`)
                .on(
                    'postgres_changes' as any,
                    { event: 'UPDATE', schema: 'public', table: 'app_user', filter: `id=eq.${key}` },
                    () => { entry!.listeners.forEach((l) => l()); }
                )
                .subscribe((status, err) => {
                    if (status === 'CHANNEL_ERROR') {
                        console.warn('[realtime] app_user_rank subscription error:', err ?? 'unknown reason — ensure Realtime is enabled for the app_user table and RLS permits access');
                    }
                });
            entry = { channel, listeners: new Set(), refCount: 0 };
            rankChannelRegistry.set(key, entry);
        }
        entry.listeners.add(listener);
        entry.refCount++;

        return () => {
            const e = rankChannelRegistry.get(key);
            if (!e) return;
            e.listeners.delete(listener);
            e.refCount--;
            if (e.refCount <= 0) {
                supabase.removeChannel(e.channel);
                rankChannelRegistry.delete(key);
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]);

    return query;
}

// Module-level singleton for XP event channel (same pattern as rank).
const xpChannelRegistry = new Map<string, {
    channel: ReturnType<typeof supabase.channel>;
    listeners: Set<() => void>;
    refCount: number;
}>();

export function useMyXPHistory() {
    const { user } = useAuth();
    const query = useSupabaseQuery<XPEvent[]>(async () => {
        if (!user) return { data: [], error: null };
        const { data, error } = await supabase
            .from('xp_event')
            .select('id, amount, reason, created_at, reference_id, reference_type')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
        return { data: data as any, error };
    }, [user?.id]);

    const refetchRef = useRef(query.refetch);
    useEffect(() => { refetchRef.current = query.refetch; }, [query.refetch]);

    useEffect(() => {
        if (!user?.id) return;
        const key = user.id;
        const listener = () => { refetchRef.current(); };
        let entry = xpChannelRegistry.get(key);
        if (!entry) {
            const channel = supabase
                .channel(`xp_event_${key}`)
                .on(
                    'postgres_changes' as any,
                    { event: 'INSERT', schema: 'public', table: 'xp_event', filter: `user_id=eq.${key}` },
                    () => { entry!.listeners.forEach((l) => l()); }
                )
                .subscribe((status, err) => {
                    if (status === 'CHANNEL_ERROR') {
                        console.warn('[realtime] xp_event subscription error:', err ?? 'unknown reason — ensure Realtime is enabled for the xp_event table and RLS permits access');
                    }
                });
            entry = { channel, listeners: new Set(), refCount: 0 };
            xpChannelRegistry.set(key, entry);
        }
        entry.listeners.add(listener);
        entry.refCount++;

        return () => {
            const e = xpChannelRegistry.get(key);
            if (!e) return;
            e.listeners.delete(listener);
            e.refCount--;
            if (e.refCount <= 0) {
                supabase.removeChannel(e.channel);
                xpChannelRegistry.delete(key);
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]);

    return query;
}
