import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import { useAuth } from './auth';
import type {
    Project, Challenge, Event, Badge, StoreProduct,
    MakerProfile, Reaction, ChallengeCompletion,
    EventRegistration, ProjectImage, ProjectVideo, ProjectFile,
    ChallengeStep, ChallengeMaterial, ChallengeSkill,
    ChallengeVocabulary, ChallengeLevel, UserBadge,
    Tag, EntityTag, ReactionType, TargetType, Comment,
    AppUser, Equipment, Inventory, Role, EventType, XPEvent
} from './database.types';

// ─── Generic fetch hook ───

export function useSupabaseQuery<T>(
    queryFn: () => Promise<{ data: T | null; error: any }>,
    deps: any[] = []
) {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refetch = useCallback(async () => {
        setLoading(true);
        const { data, error } = await queryFn();
        setData(data);
        setError(error?.message || null);
        setLoading(false);
    }, deps);

    useEffect(() => { refetch(); }, [refetch]);

    return { data, loading, error, refetch };
}

// ─── PROJECTS ───

export function useProjects(domainFilter?: string, sortBy?: 'newest' | 'oldest') {
    return useSupabaseQuery<Project[]>(async () => {
        let q = supabase
            .from('project')
            .select('id, title, summary, domain, tier, status, visibility, created_at, owner_id')
            .eq('status', 'active')
            .eq('visibility', 'public');

        if (sortBy === 'oldest') {
            q = q.order('created_at', { ascending: true });
        } else {
            q = q.order('created_at', { ascending: false });
        }

        if (domainFilter && domainFilter !== 'All') {
            q = q.eq('domain', domainFilter);
        }
        return q as any;
    }, [domainFilter, sortBy]);
}

export function useMyProjects() {
    const { user } = useAuth();
    return useSupabaseQuery<Project[]>(async () => {
        if (!user) return { data: [], error: null };
        return supabase
            .from('project')
            .select('id, title, summary, description, domain, tier, github_url, duration, status, visibility, created_at, updated_at, owner_id')
            .eq('owner_id', user.id)
            .order('created_at', { ascending: false }) as any;
    }, [user?.id]);
}

interface ProjectWithRelations extends Project {
    images: ProjectImage[];
    videos: ProjectVideo[];
    files: ProjectFile[];
    tags: string[];
    reactionCounts: { likes: number; upvotes: number; bookmarks: number };
    ownerName: string;
    milestones: { id: string; title: string; description: string | null; is_complete: boolean; display_order: number }[];
    members: { id: string; user_id: string; role: string; name: string }[];
}

export function useProject(id: string | undefined) {
    return useSupabaseQuery<ProjectWithRelations | null>(async () => {
        if (!id) return { data: null, error: null };

        const { data: project, error } = await supabase
            .from('project')
            .select('id, title, summary, description, domain, tier, github_url, duration, status, visibility, created_at, updated_at, owner_id')
            .eq('id', id)
            .single();

        if (error || !project) return { data: null, error };

        // Fetch ALL related data in a single Promise.all batch
        const [imagesRes, videosRes, tagsRes, ownerRes, filesRes, likesRes, upvotesRes, bookmarksRes, milestonesRes, membersRes] = await Promise.all([
            supabase.from('project_image').select('id, image_url, caption, display_order').eq('project_id', id).order('display_order'),
            supabase.from('project_video').select('id, title, video_url, display_order').eq('project_id', id).order('display_order'),
            supabase.from('entity_tag').select('tag_id, tag:tag(name)').eq('target_type', 'project').eq('target_id', id),
            supabase.from('app_user').select('name').eq('id', project.owner_id).single(),
            supabase.from('project_file').select('id, file_url, file_name, file_size').eq('project_id', id).order('created_at'),
            supabase.from('reaction').select('id', { count: 'exact', head: true }).eq('target_type', 'project').eq('target_id', id).eq('reaction_type', 'like'),
            supabase.from('reaction').select('id', { count: 'exact', head: true }).eq('target_type', 'project').eq('target_id', id).eq('reaction_type', 'upvote'),
            supabase.from('reaction').select('id', { count: 'exact', head: true }).eq('target_type', 'project').eq('target_id', id).eq('reaction_type', 'bookmark'),
            supabase.from('project_milestone').select('id, title, description, is_complete, display_order').eq('project_id', id).order('display_order'),
            supabase.from('project_member').select('id, user_id, role, joined_at, app_user:app_user!user_id(name, email)').eq('project_id', id)
        ]);

        const enriched: ProjectWithRelations = {
            ...project as Project,
            images: (imagesRes.data || []) as ProjectImage[],
            videos: (videosRes.data || []) as ProjectVideo[],
            files: (filesRes.data || []) as ProjectFile[],
            tags: (tagsRes.data || []).map((t: any) => t.tag?.name).filter(Boolean),
            reactionCounts: {
                likes: likesRes.count || 0,
                upvotes: upvotesRes.count || 0,
                bookmarks: bookmarksRes.count || 0,
            },
            ownerName: (ownerRes.data as any)?.name || 'Unknown',
            milestones: (milestonesRes.data || []),
            members: (membersRes.data || []).map((m: any) => ({
                id: m.id,
                user_id: m.user_id,
                role: m.role,
                name: m.app_user?.name || 'Unknown',
            })),
        };

        return { data: enriched, error: null };
    }, [id]);
}

// ─── CHALLENGES ───

export function useChallenges(tierFilter?: string, domainFilter?: string) {
    return useSupabaseQuery<Challenge[]>(async () => {
        let q = supabase
            .from('challenge')
            .select('id, title, tier, domain, time_estimate, cover_image_url, mystery, status, created_at')
            .eq('status', 'published')
            .order('created_at', { ascending: false });

        if (tierFilter && tierFilter !== 'All') {
            q = q.ilike('tier', tierFilter);
        }
        if (domainFilter && domainFilter !== 'All') {
            console.log('useChallenges domainFilter (hook):', domainFilter);
            q = q.ilike('domain', domainFilter);
        }
        return q as any;
    }, [tierFilter, domainFilter]);
}

interface ChallengeWithRelations extends Challenge {
    steps: string[];
    materials: string[];
    skills: string[];
    vocabulary: { term: string; definition: string | null }[];
    levels: { level_name: string; description: string | null }[];
    tags: string[];
    images: { image_url: string; caption: string | null; display_order: number }[];
    videos: { title: string; video_url: string }[];
    reactionCounts: { likes: number; upvotes: number; bookmarks: number };
}

export function useChallenge(id: string | undefined) {
    return useSupabaseQuery<ChallengeWithRelations | null>(async () => {
        if (!id) return { data: null, error: null };

        const { data: challenge, error } = await supabase
            .from('challenge')
            .select('id, title, tier, domain, time_estimate, cover_image_url, mystery, core_idea, mission, success_criteria, status, created_by, created_at, updated_at')
            .eq('id', id)
            .single();

        if (error || !challenge) return { data: null, error };

        const [stepsRes, matsRes, skillsRes, vocabRes, levelsRes, tagsRes, imagesRes, videosRes, likesRes, upvotesRes, bookmarksRes] = await Promise.all([
            supabase.from('challenge_step').select('step_text, display_order').eq('challenge_id', id).order('display_order'),
            supabase.from('challenge_material').select('name, display_order').eq('challenge_id', id).order('display_order'),
            supabase.from('challenge_skill').select('skill_name').eq('challenge_id', id),
            supabase.from('challenge_vocabulary').select('term, definition').eq('challenge_id', id),
            supabase.from('challenge_level').select('level_name, description').eq('challenge_id', id),
            supabase.from('entity_tag').select('tag_id, tag:tag(name)').eq('target_type', 'challenge').eq('target_id', id),
            supabase.from('challenge_image').select('image_url, caption, display_order').eq('challenge_id', id).order('display_order'),
            supabase.from('challenge_video').select('title, video_url').eq('challenge_id', id).order('display_order'),
            supabase.from('reaction').select('id', { count: 'exact', head: true }).eq('target_type', 'challenge').eq('target_id', id).eq('reaction_type', 'like'),
            supabase.from('reaction').select('id', { count: 'exact', head: true }).eq('target_type', 'challenge').eq('target_id', id).eq('reaction_type', 'upvote'),
            supabase.from('reaction').select('id', { count: 'exact', head: true }).eq('target_type', 'challenge').eq('target_id', id).eq('reaction_type', 'bookmark'),
        ]);

        const enriched: ChallengeWithRelations = {
            ...challenge as Challenge,
            steps: (stepsRes.data || []).map((s: any) => s.step_text),
            materials: (matsRes.data || []).map((m: any) => m.name),
            skills: (skillsRes.data || []).map((s: any) => s.skill_name),
            vocabulary: (vocabRes.data || []).map((v: any) => ({ term: v.term, definition: v.definition })),
            levels: (levelsRes.data || []).map((l: any) => ({ level_name: l.level_name, description: l.description })),
            tags: (tagsRes.data || []).map((t: any) => t.tag?.name).filter(Boolean),
            images: (imagesRes.data || []),
            videos: (videosRes.data || []),
            reactionCounts: {
                likes: likesRes.count || 0,
                upvotes: upvotesRes.count || 0,
                bookmarks: bookmarksRes.count || 0,
            },
        };

        return { data: enriched, error: null };
    }, [id]);
}

// ─── EVENTS ───

export function useEvents(typeFilter?: string) {
    return useSupabaseQuery<(Event & { registration_count: number })[]>(async () => {
        let q = supabase
            .from('event')
            .select('id, title, event_type, date, end_date, location, capacity, cover_image_url, registration_status, created_at')
            .order('date', { ascending: true });

        if (typeFilter && typeFilter !== 'All') {
            q = q.eq('event_type', typeFilter as any);
        }
        const { data: events, error } = await q;
        if (error || !events) return { data: [], error };

        // Batch fetch registration counts instead of N+1
        const eventIds = (events as Event[]).map(e => e.id);
        const { data: regData } = await supabase
            .from('event_registration')
            .select('event_id')
            .in('event_id', eventIds);

        // Count registrations per event
        const regCounts: Record<string, number> = {};
        (regData || []).forEach((r: any) => {
            regCounts[r.event_id] = (regCounts[r.event_id] || 0) + 1;
        });

        const enriched = (events as Event[]).map(evt => ({
            ...evt,
            registration_count: regCounts[evt.id] || 0,
        }));

        return { data: enriched, error: null };
    }, [typeFilter]);
}

export function useEvent(id: string | undefined) {
    return useSupabaseQuery<(Event & { registration_count: number }) | null>(async () => {
        if (!id) return { data: null, error: null };

        const { data: event, error } = await supabase
            .from('event')
            .select('id, title, description, event_type, date, end_date, location, capacity, cover_image_url, registration_status, auto_badge_id, created_by, created_at, updated_at')
            .eq('id', id)
            .single();

        if (error || !event) return { data: null, error };

        const { count } = await supabase
            .from('event_registration')
            .select('id', { count: 'exact', head: true })
            .eq('event_id', id);

        return {
            data: { ...(event as Event), registration_count: count || 0 },
            error: null,
        };
    }, [id]);
}

// ─── MAKERS ───

export function useMakers(tagFilter?: string, roleFilter?: string) {
    return useSupabaseQuery<(MakerProfile & { skills: string[]; tags: string[]; badgeIds: string[]; userRole?: string; userRank: string; userXP: number })[]>(async () => {
        const { data: profiles, error } = await supabase
            .from('maker_profile')
            .select('id, user_id, display_name, bio, avatar_url, is_public')
            .eq('is_public', true)
            .order('display_name');

        if (error || !profiles) return { data: [], error };

        // Batch fetch tags and badges for ALL profiles in 2 queries (not N+1)
        const profileIds = (profiles as MakerProfile[]).map(p => p.id);
        const userIds = (profiles as MakerProfile[]).map(p => p.user_id);

        const [allTagsRes, allBadgesRes, userRolesRes] = await Promise.all([
            supabase.from('entity_tag').select('target_id, tag:tag(name)').eq('target_type', 'maker_profile').in('target_id', profileIds),
            supabase.from('user_badge').select('user_id, badge_id').in('user_id', userIds),
            supabase.from('app_user').select('id, role, xp, rank').in('id', userIds),
        ]);

        // Group tags by profile id
        const tagsByProfile: Record<string, string[]> = {};
        (allTagsRes.data || []).forEach((t: any) => {
            const name = t.tag?.name;
            if (name) {
                (tagsByProfile[t.target_id] = tagsByProfile[t.target_id] || []).push(name);
            }
        });

        // Group badge ids by user id
        const badgesByUser: Record<string, string[]> = {};
        (allBadgesRes.data || []).forEach((b: any) => {
            (badgesByUser[b.user_id] = badgesByUser[b.user_id] || []).push(b.badge_id);
        });

        // Map user info (role, xp, rank)
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

        // Apply role filter
        if (roleFilter && roleFilter !== 'All') {
            enriched = enriched.filter((p: any) => p.userRole === roleFilter.toLowerCase());
        }

        return { data: enriched as any, error: null };
    }, [tagFilter, roleFilter]);
}

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
        // New social fields (nullable — columns may not exist yet)
        x_url?: string | null;
        bluesky_url?: string | null;
        discord_username?: string | null;
        mentor_domains?: string | null;
        approval_domains?: string | null;
        show_email?: boolean;
    }) | null>(async () => {
        if (!id) return { data: null, error: null };

        const profileSelect = 'id, user_id, display_name, pronouns, bio, aspirations, avatar_url, github_url, linkedin_url, website_url, is_public, created_at, updated_at, x_url, bluesky_url, discord_username, mentor_domains, approval_domains, show_email';

        // id could be maker_profile.id or user_id — try both
        let { data: profile, error } = await supabase
            .from('maker_profile')
            .select(profileSelect)
            .eq('id', id)
            .single();

        if (!profile) {
            const res = await supabase
                .from('maker_profile')
                .select(profileSelect)
                .eq('user_id', id)
                .single();
            profile = res.data;
            error = res.error;
        }

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

        // Derive domain levels from verified challenge completions
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

// ─── BADGES ───

export function useBadges() {
    return useSupabaseQuery<Badge[]>(async () => {
        return supabase
            .from('badge')
            .select('id, name, description, tier, domain, badge_type, criteria, image_url, created_at')
            .order('tier')
            .order('name') as any;
    }, []);
}

export function useUserBadges(userId?: string) {
    return useSupabaseQuery<(UserBadge & { badge: Badge })[]>(async () => {
        if (!userId) return { data: [], error: null };
        const { data, error } = await supabase
            .from('user_badge')
            .select('id, user_id, badge_id, awarded_at, awarded_by, badge:badge(id, name, description, tier, domain, badge_type, image_url)')
            .eq('user_id', userId);
        return { data: data as any, error };
    }, [userId]);
}

// ─── STORE ───

export function useProducts() {
    return useSupabaseQuery<(StoreProduct & { requiredBadge: Badge | null })[]>(async () => {
        // Use FK relation join to fetch required badge in same query (no N+1)
        const { data: products, error } = await supabase
            .from('store_product')
            .select('id, name, description, price, category, image_url, is_active, required_badge_id, created_at, required_badge:badge!required_badge_id(id, name, tier, image_url)')
            .eq('is_active', true)
            .order('name');

        if (error || !products) return { data: [], error };

        const enriched = (products as any[]).map(p => ({
            ...p,
            requiredBadge: p.required_badge || null,
        }));

        return { data: enriched, error: null };
    }, []);
}

// ─── MY PROFILE ───

export function useMyProfile() {
    const { user } = useAuth();
    return useSupabaseQuery<MakerProfile | null>(async () => {
        if (!user) return { data: null, error: null };
        return supabase
            .from('maker_profile')
            .select('id, user_id, display_name, pronouns, bio, aspirations, avatar_url, github_url, linkedin_url, website_url, x_url, bluesky_url, discord_username, mentor_domains, approval_domains, show_email, is_public, created_at, updated_at')
            .eq('user_id', user.id)
            .single() as any;
    }, [user?.id]);
}

// ─── DASHBOARD STATS ───

export function useMyStats() {
    const { user } = useAuth();
    return useSupabaseQuery<{
        activeProjects: number;
        upcomingEvents: number;
        completedChallenges: number;
    }>(async () => {
        if (!user) return { data: { activeProjects: 0, upcomingEvents: 0, completedChallenges: 0 }, error: null };

        const [projectsRes, eventsRes, challengesRes] = await Promise.all([
            supabase.from('project').select('id', { count: 'exact', head: true }).eq('owner_id', user.id).in('status', ['active', 'draft', 'pending_review']),
            supabase.from('event_registration').select('event:event(date)', { count: 'exact' }).eq('user_id', user.id),
            supabase.from('challenge_completion').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'verified'),
        ]);

        // Count upcoming events (date in future)
        const upcomingEvents = (eventsRes.data || []).filter((r: any) =>
            r.event?.date && new Date(r.event.date) > new Date()
        ).length;

        return {
            data: {
                activeProjects: projectsRes.count || 0,
                upcomingEvents,
                completedChallenges: challengesRes.count || 0,
            },
            error: null,
        };
    }, [user?.id]);
}

// ─── REACTIONS (Toggle) ───

export function useReaction(targetType: TargetType, targetId: string | undefined) {
    const { user } = useAuth();
    const [myReactions, setMyReactions] = useState<ReactionType[]>([]);
    const [counts, setCounts] = useState({ likes: 0, upvotes: 0, bookmarks: 0 });

    const fetchReactions = useCallback(async () => {
        if (!targetId) return;

        // Get counts
        const [likesRes, upvotesRes, bookmarksRes] = await Promise.all([
            supabase.from('reaction').select('id', { count: 'exact', head: true }).eq('target_type', targetType).eq('target_id', targetId).eq('reaction_type', 'like'),
            supabase.from('reaction').select('id', { count: 'exact', head: true }).eq('target_type', targetType).eq('target_id', targetId).eq('reaction_type', 'upvote'),
            supabase.from('reaction').select('id', { count: 'exact', head: true }).eq('target_type', targetType).eq('target_id', targetId).eq('reaction_type', 'bookmark'),
        ]);
        setCounts({ likes: likesRes.count || 0, upvotes: upvotesRes.count || 0, bookmarks: bookmarksRes.count || 0 });

        // Get user's own reactions
        if (user) {
            const { data } = await supabase
                .from('reaction')
                .select('reaction_type')
                .eq('target_type', targetType)
                .eq('target_id', targetId)
                .eq('user_id', user.id);
            setMyReactions((data || []).map((r: any) => r.reaction_type));
        }
    }, [targetType, targetId, user?.id]);

    useEffect(() => { fetchReactions(); }, [fetchReactions]);

    const toggle = async (reactionType: ReactionType) => {
        if (!user || !targetId) return;

        if (myReactions.includes(reactionType)) {
            await supabase
                .from('reaction')
                .delete()
                .eq('target_type', targetType)
                .eq('target_id', targetId)
                .eq('user_id', user.id)
                .eq('reaction_type', reactionType);
        } else {
            await supabase.from('reaction').insert({
                target_type: targetType,
                target_id: targetId,
                user_id: user.id,
                reaction_type: reactionType,
            });
        }
        await fetchReactions();
    };

    return { counts, myReactions, toggle, refetch: fetchReactions };
}

// ─── COMMENTS (with realtime) ───

export function useComments(targetType: TargetType, targetId: string | undefined) {
    const [comments, setComments] = useState<(Comment & { userName: string })[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    const fetchComments = useCallback(async () => {
        if (!targetId) return;
        setLoading(true);
        const { data } = await supabase
            .from('comment')
            .select('*, app_user:app_user(name)')
            .eq('target_type', targetType)
            .eq('target_id', targetId)
            .order('created_at', { ascending: true });

        setComments(
            (data || []).map((c: any) => ({
                ...c,
                userName: c.app_user?.name || 'Unknown',
            }))
        );
        setLoading(false);
    }, [targetType, targetId]);

    useEffect(() => { fetchComments(); }, [fetchComments]);

    // Realtime subscription
    useEffect(() => {
        if (!targetId) return;

        const channel = supabase
            .channel(`comments:${targetType}:${targetId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'comment',
                    filter: `target_id=eq.${targetId}`,
                },
                () => { fetchComments(); }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [targetType, targetId, fetchComments]);

    const addComment = async (content: string) => {
        if (!user || !targetId) return;
        await supabase.from('comment').insert({
            target_type: targetType,
            target_id: targetId,
            user_id: user.id,
            content,
        });
    };

    const deleteComment = async (commentId: string) => {
        await supabase.from('comment').delete().eq('id', commentId);
    };

    return { comments, loading, addComment, deleteComment };
}

// ─── EVENT REGISTRATION ───

export function useEventRegistration(eventId: string | undefined) {
    const { user } = useAuth();
    const [isRegistered, setIsRegistered] = useState(false);
    const [loading, setLoading] = useState(true);

    const check = useCallback(async () => {
        if (!user || !eventId) { setLoading(false); return; }
        const { data } = await supabase
            .from('event_registration')
            .select('id')
            .eq('event_id', eventId)
            .eq('user_id', user.id)
            .maybeSingle();
        setIsRegistered(!!data);
        setLoading(false);
    }, [user?.id, eventId]);

    useEffect(() => { check(); }, [check]);

    const register = async () => {
        if (!user || !eventId) return;
        await supabase.from('event_registration').insert({ event_id: eventId, user_id: user.id });
        setIsRegistered(true);
    };

    const unregister = async () => {
        if (!user || !eventId) return;
        await supabase.from('event_registration').delete().eq('event_id', eventId).eq('user_id', user.id);
        setIsRegistered(false);
    };

    return { isRegistered, loading, register, unregister };
}

// ─── CHALLENGE COMPLETION ───

export function useChallengeCompletion(challengeId: string | undefined) {
    const { user } = useAuth();
    const [completion, setCompletion] = useState<ChallengeCompletion | null>(null);
    const [loading, setLoading] = useState(true);

    const check = useCallback(async () => {
        if (!user || !challengeId) { setLoading(false); return; }
        const { data } = await supabase
            .from('challenge_completion')
            .select('id, challenge_id, user_id, status, evidence_url, notes, verified_by, created_at, updated_at')
            .eq('challenge_id', challengeId)
            .eq('user_id', user.id)
            .maybeSingle();
        setCompletion(data as ChallengeCompletion | null);
        setLoading(false);
    }, [user?.id, challengeId]);

    useEffect(() => { check(); }, [check]);

    const markComplete = async (notes?: string, evidenceUrl?: string) => {
        if (!user || !challengeId) return;
        const { data } = await supabase.from('challenge_completion').insert({
            challenge_id: challengeId,
            user_id: user.id,
            status: 'pending',
            notes: notes || null,
            evidence_url: evidenceUrl || null,
        }).select().single();
        setCompletion(data as ChallengeCompletion | null);
    };

    return { completion, loading, markComplete };
}

// ─── PROJECT MUTATIONS ───

export function useProjectMutations() {
    const { user } = useAuth();

    const createProject = async (input: {
        title: string;
        summary: string;
        description: string;
        domain?: string;
        tier?: string;
        github_url?: string;
        duration?: string;
    }) => {
        if (!user) return { data: null, error: 'Not authenticated' };

        const { data: inserted, error: insertError } = await supabase
            .from('project')
            .insert({
                title: input.title,
                summary: input.summary || input.title,
                description: input.description || '',
                domain: input.domain || null,
                tier: input.tier || null,
                github_url: input.github_url || null,
                duration: input.duration || null,
                owner_id: user.id,
                status: 'draft',
                visibility: 'private',
            })
            .select()
            .single();

        return {
            data: (inserted ?? null) as Project | null,
            error: insertError?.message || null,
        };
    };

    const updateProject = async (id: string, updates: Partial<Project>) => {
        const { error } = await supabase.from('project').update(updates).eq('id', id);
        return { error: error?.message || null };
    };

    const deleteProject = async (id: string) => {
        const { error } = await supabase.from('project').delete().eq('id', id).eq('status', 'draft');
        return { error: error?.message || null };
    };

    const submitForReview = async (id: string) => {
        const { error } = await supabase.from('project').update({ status: 'pending_review' }).eq('id', id);
        return { error: error?.message || null };
    };

    return { createProject, updateProject, deleteProject, submitForReview };
}

// ─── STORE ORDER ───

export function useStoreOrder() {
    const { user } = useAuth();

    const placeOrder = async (productId: string, price: number, quantity: number = 1) => {
        if (!user) return { error: 'Not authenticated' };

        const total = price * quantity;
        const { data: order, error: orderErr } = await supabase
            .from('store_order')
            .insert({ user_id: user.id, total, status: 'pending' })
            .select()
            .single();

        if (orderErr || !order) return { error: orderErr?.message || 'Failed to create order' };

        const { error: itemErr } = await supabase
            .from('store_order_item')
            .insert({
                order_id: (order as any).id,
                product_id: productId,
                quantity,
                unit_price: price,
            });

        return { error: itemErr?.message || null };
    };

    return { placeOrder };
}

// ─── PROFILE UPSERT ───

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
    }) => {
        if (!user) return { error: 'Not authenticated' };

        const { skills, ...profileData } = data;

        // Upsert profile + update app_user name in parallel
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

        // Handle skills as tags — BATCHED instead of sequential loop
        if (skills && skills.length > 0 && profileId) {
            const trimmed = skills.map(s => s.trim()).filter(Boolean);

            // Clear old tags
            await supabase.from('entity_tag').delete().eq('target_type', 'maker_profile').eq('target_id', profileId);

            // Batch upsert all tags in one call
            const { data: tags } = await supabase
                .from('tag')
                .upsert(trimmed.map(name => ({ name })), { onConflict: 'name' })
                .select('id, name');

            // Batch insert all entity_tag links in one call
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

// ══════════════════════════════════════════════════════════════════
// ─── ADMIN: ALL USERS ───
// ══════════════════════════════════════════════════════════════════

export function useAllUsers() {
    return useSupabaseQuery<(AppUser & { profile: MakerProfile | null })[]>(async () => {
        // Single query with FK join — no separate profile fetch needed
        const { data, error } = await supabase
            .from('app_user')
            .select('id, auth_id, email, name, role, xp, rank, rank_override, is_active, created_at, updated_at, profile:maker_profile(id, user_id, display_name, avatar_url, is_public)')
            .order('created_at', { ascending: false });

        if (error || !data) return { data: [], error };

        const enriched = (data as any[]).map(u => {
            const profile = Array.isArray(u.profile) ? u.profile[0] || null : u.profile || null;
            return { ...u, profile };
        });

        return { data: enriched, error: null };
    }, []);
}

export function useUserMutations() {
    const updateRole = async (userId: string, role: Role) => {
        const { error } = await supabase.from('app_user').update({ role }).eq('id', userId);
        return { error: error?.message || null };
    };

    const toggleActive = async (userId: string, isActive: boolean) => {
        const { error } = await supabase.from('app_user').update({ is_active: isActive }).eq('id', userId);
        return { error: error?.message || null };
    };

    const updateXPAndRank = async (userId: string, xp: number, rank: string, rankOverride: boolean) => {
        const { error } = await supabase.from('app_user').update({ xp, rank, rank_override: rankOverride }).eq('id', userId);
        return { error: error?.message || null };
    };

    return { updateRole, toggleActive, updateXPAndRank };
}

// ══════════════════════════════════════════════════════════════════
// ─── ADMIN: ALL CHALLENGES (incl. drafts) ───
// ══════════════════════════════════════════════════════════════════

export function useAllChallenges() {
    return useSupabaseQuery<Challenge[]>(async () => {
        return supabase
            .from('challenge')
            .select('id, title, tier, domain, time_estimate, cover_image_url, mystery, core_idea, mission, success_criteria, status, created_by, created_at, updated_at')
            .order('created_at', { ascending: false }) as any;
    }, []);
}

export function useChallengeMutations() {
    const createChallenge = async (data: {
        title: string;
        tier?: string;
        domain?: string;
        time_estimate?: string;
        cover_image_url?: string;
        mystery?: string;
        core_idea?: string;
        mission?: string;
        success_criteria?: string;
        status?: string;
        created_by?: string;
    }) => {
        const { data: challenge, error } = await supabase
            .from('challenge')
            .insert({ ...data, status: data.status || 'draft' })
            .select()
            .single();
        return { data: challenge as Challenge | null, error: error?.message || null };
    };

    const updateChallenge = async (id: string, updates: Partial<Challenge>) => {
        const { error } = await supabase.from('challenge').update(updates).eq('id', id);
        return { error: error?.message || null };
    };

    const deleteChallenge = async (id: string) => {
        // Delete child rows first
        await Promise.all([
            supabase.from('challenge_step').delete().eq('challenge_id', id),
            supabase.from('challenge_material').delete().eq('challenge_id', id),
            supabase.from('challenge_skill').delete().eq('challenge_id', id),
            supabase.from('challenge_vocabulary').delete().eq('challenge_id', id),
            supabase.from('challenge_level').delete().eq('challenge_id', id),
            supabase.from('challenge_image').delete().eq('challenge_id', id),
            supabase.from('challenge_video').delete().eq('challenge_id', id),
            supabase.from('challenge_completion').delete().eq('challenge_id', id),
        ]);
        const { error } = await supabase.from('challenge').delete().eq('id', id);
        return { error: error?.message || null };
    };

    return { createChallenge, updateChallenge, deleteChallenge };
}

// ══════════════════════════════════════════════════════════════════
// ─── ADMIN: ALL EVENTS ───
// ══════════════════════════════════════════════════════════════════

export function useAllEvents() {
    return useSupabaseQuery<Event[]>(async () => {
        return supabase
            .from('event')
            .select('id, title, description, event_type, date, end_date, location, capacity, cover_image_url, registration_status, auto_badge_id, created_by, created_at, updated_at')
            .order('date', { ascending: false }) as any;
    }, []);
}

export function useEventMutations() {
    const createEvent = async (data: {
        title: string;
        event_type: EventType;
        date: string;
        end_date?: string;
        description?: string;
        location?: string;
        capacity?: number;
        cover_image_url?: string;
        registration_status?: string;
        created_by?: string;
    }) => {
        const { data: event, error } = await supabase
            .from('event')
            .insert({ ...data, registration_status: data.registration_status || 'open' })
            .select()
            .single();
        return { data: event as Event | null, error: error?.message || null };
    };

    const updateEvent = async (id: string, updates: Partial<Event>) => {
        const { error } = await supabase.from('event').update(updates).eq('id', id);
        return { error: error?.message || null };
    };

    const deleteEvent = async (id: string) => {
        await Promise.all([
            supabase.from('event_registration').delete().eq('event_id', id),
            supabase.from('event_checkin').delete().eq('event_id', id),
            supabase.from('event_team_member').delete().eq('team_id', id),
            supabase.from('event_submission').delete().eq('event_id', id),
            supabase.from('showcase_slot').delete().eq('event_id', id),
        ]);
        await supabase.from('event_team').delete().eq('event_id', id);
        const { error } = await supabase.from('event').delete().eq('id', id);
        return { error: error?.message || null };
    };

    return { createEvent, updateEvent, deleteEvent };
}

// ══════════════════════════════════════════════════════════════════
// ─── ADMIN: BADGES ───
// ══════════════════════════════════════════════════════════════════

export function useBadgeMutations() {
    const createBadge = async (data: {
        name: string;
        description: string;
        tier: string;
        domain: string;
        badge_type: string;
        criteria: string;
        image_url?: string;
    }) => {
        const { data: badge, error } = await supabase
            .from('badge')
            .insert(data)
            .select()
            .single();
        return { data: badge as Badge | null, error: error?.message || null };
    };

    const updateBadge = async (id: string, updates: Partial<Badge>) => {
        const { error } = await supabase.from('badge').update(updates).eq('id', id);
        return { error: error?.message || null };
    };

    const deleteBadge = async (id: string) => {
        await supabase.from('user_badge').delete().eq('badge_id', id);
        const { error } = await supabase.from('badge').delete().eq('id', id);
        return { error: error?.message || null };
    };

    const awardBadge = async (userId: string, badgeId: string, awardedBy?: string) => {
        const { error } = await supabase.from('user_badge').insert({
            user_id: userId,
            badge_id: badgeId,
            awarded_by: awardedBy || null,
        });
        return { error: error?.message || null };
    };

    const revokeBadge = async (userId: string, badgeId: string) => {
        const { error } = await supabase.from('user_badge').delete()
            .eq('user_id', userId)
            .eq('badge_id', badgeId);
        return { error: error?.message || null };
    };

    return { createBadge, updateBadge, deleteBadge, awardBadge, revokeBadge };
}

// ══════════════════════════════════════════════════════════════════
// ─── ADMIN: STORE PRODUCTS ───
// ══════════════════════════════════════════════════════════════════

export function useAllProducts() {
    return useSupabaseQuery<StoreProduct[]>(async () => {
        return supabase
            .from('store_product')
            .select('id, name, description, price, category, image_url, is_active, required_badge_id, created_at')
            .order('name') as any;
    }, []);
}

export function useProductMutations() {
    const createProduct = async (data: {
        name: string;
        description: string;
        price: number;
        category?: string;
        image_url?: string;
        is_active?: boolean;
        required_badge_id?: string;
    }) => {
        const { data: product, error } = await supabase
            .from('store_product')
            .insert({ ...data, is_active: data.is_active !== false })
            .select()
            .single();
        return { data: product as StoreProduct | null, error: error?.message || null };
    };

    const updateProduct = async (id: string, updates: Partial<StoreProduct>) => {
        const { error } = await supabase.from('store_product').update(updates).eq('id', id);
        return { error: error?.message || null };
    };

    const deleteProduct = async (id: string) => {
        const { error } = await supabase.from('store_product').delete().eq('id', id);
        return { error: error?.message || null };
    };

    return { createProduct, updateProduct, deleteProduct };
}

// ══════════════════════════════════════════════════════════════════
// ─── ADMIN: EQUIPMENT ───
// ══════════════════════════════════════════════════════════════════

export function useEquipment() {
    return useSupabaseQuery<Equipment[]>(async () => {
        return supabase
            .from('equipment')
            .select('id, name, description, image_url, is_active, requires_induction, created_at')
            .order('name') as any;
    }, []);
}

export function useEquipmentMutations() {
    const createEquipment = async (data: {
        name: string;
        description?: string;
        image_url?: string;
        requires_induction?: boolean;
    }) => {
        const { data: equip, error } = await supabase
            .from('equipment')
            .insert(data)
            .select()
            .single();
        return { data: equip as Equipment | null, error: error?.message || null };
    };

    const updateEquipment = async (id: string, updates: Partial<Equipment>) => {
        const { error } = await supabase.from('equipment').update(updates).eq('id', id);
        return { error: error?.message || null };
    };

    const deleteEquipment = async (id: string) => {
        await Promise.all([
            supabase.from('equipment_induction').delete().eq('equipment_id', id),
            supabase.from('equipment_booking').delete().eq('equipment_id', id),
        ]);
        const { error } = await supabase.from('equipment').delete().eq('id', id);
        return { error: error?.message || null };
    };

    return { createEquipment, updateEquipment, deleteEquipment };
}

// ══════════════════════════════════════════════════════════════════
// ─── ADMIN: INVENTORY ───
// ══════════════════════════════════════════════════════════════════

export function useInventory() {
    return useSupabaseQuery<Inventory[]>(async () => {
        return supabase
            .from('inventory')
            .select('id, name, description, quantity, unit, location, created_at, updated_at')
            .order('name') as any;
    }, []);
}

export function useInventoryMutations() {
    const createItem = async (data: {
        name: string;
        description?: string;
        quantity: number;
        unit?: string;
        location?: string;
    }) => {
        const { data: item, error } = await supabase
            .from('inventory')
            .insert(data)
            .select()
            .single();
        return { data: item as Inventory | null, error: error?.message || null };
    };

    const updateItem = async (id: string, updates: Partial<Inventory>) => {
        const { error } = await supabase.from('inventory').update(updates).eq('id', id);
        return { error: error?.message || null };
    };

    const deleteItem = async (id: string) => {
        const { error } = await supabase.from('inventory').delete().eq('id', id);
        return { error: error?.message || null };
    };

    return { createItem, updateItem, deleteItem };
}

// ══════════════════════════════════════════════════════════════════
// ─── MENTOR/ADMIN: PENDING PROJECTS REVIEW ───
// ══════════════════════════════════════════════════════════════════

export function usePendingProjects() {
    return useSupabaseQuery<(Project & { ownerName: string; ownerEmail: string })[]>(async () => {
        // Single query with FK join — owner info fetched inline
        const { data, error } = await supabase
            .from('project')
            .select('id, title, summary, description, domain, tier, status, visibility, owner_id, created_at, updated_at, owner:app_user!owner_id(name, email)')
            .eq('status', 'pending_review')
            .order('updated_at', { ascending: false });

        if (error || !data) return { data: [], error };

        const enriched = (data as any[]).map(p => ({
            ...p,
            ownerName: p.owner?.name || 'Unknown',
            ownerEmail: p.owner?.email || '',
        }));

        return { data: enriched, error: null };
    }, []);
}

export function useAllProjectsAdmin() {
    return useSupabaseQuery<(Project & { ownerName: string })[]>(async () => {
        // Single query with FK join
        const { data, error } = await supabase
            .from('project')
            .select('id, title, summary, domain, tier, status, visibility, owner_id, created_at, updated_at, owner:app_user!owner_id(name)')
            .order('created_at', { ascending: false });

        if (error || !data) return { data: [], error };

        const enriched = (data as any[]).map(p => ({
            ...p,
            ownerName: p.owner?.name || 'Unknown',
        }));

        return { data: enriched, error: null };
    }, []);
}

export function useProjectReviewMutations() {
    const approveProject = async (id: string) => {
        const { error } = await supabase.from('project').update({
            status: 'active',
            visibility: 'public',
        }).eq('id', id);
        return { error: error?.message || null };
    };

    const rejectProject = async (id: string) => {
        const { error } = await supabase.from('project').update({
            status: 'rejected',
        }).eq('id', id);
        return { error: error?.message || null };
    };

    return { approveProject, rejectProject };
}

export function useAdminProjectMutations() {
    const adminDeleteProject = async (id: string) => {
        // Delete child records first (no FK cascade assumed)
        await Promise.all([
            supabase.from('project_video').delete().eq('project_id', id),
            supabase.from('project_image').delete().eq('project_id', id),
            supabase.from('project_file').delete().eq('project_id', id),
            supabase.from('project_milestone').delete().eq('project_id', id),
            supabase.from('project_member').delete().eq('project_id', id),
            supabase.from('reaction').delete().eq('target_type', 'project').eq('target_id', id),
            supabase.from('comment').delete().eq('target_type', 'project').eq('target_id', id),
            supabase.from('entity_tag').delete().eq('target_type', 'project').eq('target_id', id),
        ]);
        const { error } = await supabase.from('project').delete().eq('id', id);
        return { error: error?.message || null };
    };

    const adminUpdateStatus = async (id: string, status: string, visibility?: string) => {
        const updates: any = { status };
        if (visibility) updates.visibility = visibility;
        const { error } = await supabase.from('project').update(updates).eq('id', id);
        return { error: error?.message || null };
    };

    return { adminDeleteProject, adminUpdateStatus };
}

// ══════════════════════════════════════════════════════════════════
// ─── MENTOR/ADMIN: CHALLENGE COMPLETION REVIEW ───
// ══════════════════════════════════════════════════════════════════

export function usePendingCompletions() {
    return useSupabaseQuery<(ChallengeCompletion & {
        challengeTitle: string;
        userName: string;
    })[]>(async () => {
        // Single query with FK joins — challenge title + user name inline
        const { data, error } = await supabase
            .from('challenge_completion')
            .select('id, challenge_id, user_id, status, evidence_url, notes, verified_by, created_at, updated_at, challenge:challenge!challenge_id(title), user:app_user!user_id(name)')
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        if (error || !data) return { data: [], error };

        const enriched = (data as any[]).map(c => ({
            ...c,
            challengeTitle: c.challenge?.title || 'Unknown',
            userName: c.user?.name || 'Unknown',
        }));

        return { data: enriched, error: null };
    }, []);
}

export function useCompletionReviewMutations() {
    const verifyCompletion = async (id: string, verifiedBy: string) => {
        const { error } = await supabase.from('challenge_completion').update({
            status: 'verified',
            verified_by: verifiedBy,
        }).eq('id', id);
        return { error: error?.message || null };
    };

    const rejectCompletion = async (id: string) => {
        const { error } = await supabase.from('challenge_completion').update({
            status: 'rejected',
        }).eq('id', id);
        return { error: error?.message || null };
    };

    return { verifyCompletion, rejectCompletion };
}

// ══════════════════════════════════════════════════════════════════
// ─── MAKER: PROJECT IMAGES / FILES MUTATIONS ───
// ══════════════════════════════════════════════════════════════════

export function useProjectImageMutations() {
    const addImage = async (projectId: string, imageUrl: string, caption?: string, order?: number) => {
        const { data, error } = await supabase.from('project_image').insert({
            project_id: projectId,
            image_url: imageUrl,
            caption: caption || null,
            display_order: order || 0,
        }).select().single();
        return { data: data as ProjectImage | null, error: error?.message || null };
    };

    const removeImage = async (imageId: string) => {
        const { error } = await supabase.from('project_image').delete().eq('id', imageId);
        return { error: error?.message || null };
    };

    return { addImage, removeImage };
}

export function useProjectFileMutations() {
    const addFile = async (projectId: string, fileUrl: string, fileName: string, fileSize?: number) => {
        const { data, error } = await supabase.from('project_file').insert({
            project_id: projectId,
            file_url: fileUrl,
            file_name: fileName,
            file_size: fileSize || null,
        }).select().single();
        return { data: data as ProjectFile | null, error: error?.message || null };
    };

    const removeFile = async (fileId: string) => {
        const { error } = await supabase.from('project_file').delete().eq('id', fileId);
        return { error: error?.message || null };
    };

    return { addFile, removeFile };
}

// ─── RANK & XP ───

export function useRankAccess() {
    const { user } = useAuth();
    return useSupabaseQuery<{ xp: number; rank: string; role: Role } | null>(async () => {
        if (!user) return { data: null, error: null };
        const { data, error } = await supabase
            .from('app_user')
            .select('xp, rank, role')
            .eq('id', user.id)
            .single();
        return { data: data as any, error };
    }, [user?.id]);
}

export function useMyXPHistory() {
    const { user } = useAuth();
    return useSupabaseQuery<XPEvent[]>(async () => {
        if (!user) return { data: [], error: null };
        const { data, error } = await supabase
            .from('xp_event')
            .select('id, amount, reason, created_at, reference_id, reference_type')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
        return { data: data as any, error };
    }, [user?.id]);
}
