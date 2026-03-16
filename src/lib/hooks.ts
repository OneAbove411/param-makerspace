import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import { useAuth } from './auth';
import type {
    Project, Challenge, Event, Badge, StoreProduct,
    MakerProfile, Reaction, ChallengeCompletion,
    EventRegistration, ProjectImage, ProjectVideo,
    ChallengeStep, ChallengeMaterial, ChallengeSkill,
    ChallengeVocabulary, ChallengeLevel, UserBadge,
    Tag, EntityTag, ReactionType, TargetType, Comment
} from './database.types';

// ─── Generic fetch hook ───

function useSupabaseQuery<T>(
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

export function useProjects(domainFilter?: string) {
    return useSupabaseQuery<Project[]>(async () => {
        let q = supabase
            .from('project')
            .select('*')
            .eq('status', 'active')
            .eq('visibility', 'public')
            .order('created_at', { ascending: false });

        if (domainFilter && domainFilter !== 'All') {
            q = q.eq('domain', domainFilter);
        }
        return q as any;
    }, [domainFilter]);
}

export function useMyProjects() {
    const { user } = useAuth();
    return useSupabaseQuery<Project[]>(async () => {
        if (!user) return { data: [], error: null };
        return supabase
            .from('project')
            .select('*')
            .eq('owner_id', user.id)
            .order('created_at', { ascending: false }) as any;
    }, [user?.id]);
}

interface ProjectWithRelations extends Project {
    images: ProjectImage[];
    videos: ProjectVideo[];
    tags: string[];
    reactionCounts: { likes: number; upvotes: number; bookmarks: number };
    ownerName: string;
}

export function useProject(id: string | undefined) {
    return useSupabaseQuery<ProjectWithRelations | null>(async () => {
        if (!id) return { data: null, error: null };

        const { data: project, error } = await supabase
            .from('project')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !project) return { data: null, error };

        // Fetch related data in parallel
        const [imagesRes, videosRes, tagsRes, ownerRes] = await Promise.all([
            supabase.from('project_image').select('*').eq('project_id', id).order('display_order'),
            supabase.from('project_video').select('*').eq('project_id', id).order('display_order'),
            supabase.from('entity_tag').select('tag_id, tag:tag(name)').eq('target_type', 'project').eq('target_id', id),
            supabase.from('app_user').select('name').eq('id', project.owner_id).single(),
        ]);

        // Get reaction counts
        const [likesRes, upvotesRes, bookmarksRes] = await Promise.all([
            supabase.from('reaction').select('id', { count: 'exact', head: true }).eq('target_type', 'project').eq('target_id', id).eq('reaction_type', 'like'),
            supabase.from('reaction').select('id', { count: 'exact', head: true }).eq('target_type', 'project').eq('target_id', id).eq('reaction_type', 'upvote'),
            supabase.from('reaction').select('id', { count: 'exact', head: true }).eq('target_type', 'project').eq('target_id', id).eq('reaction_type', 'bookmark'),
        ]);

        const enriched: ProjectWithRelations = {
            ...project as Project,
            images: (imagesRes.data || []) as ProjectImage[],
            videos: (videosRes.data || []) as ProjectVideo[],
            tags: (tagsRes.data || []).map((t: any) => t.tag?.name).filter(Boolean),
            reactionCounts: {
                likes: likesRes.count || 0,
                upvotes: upvotesRes.count || 0,
                bookmarks: bookmarksRes.count || 0,
            },
            ownerName: (ownerRes.data as any)?.name || 'Unknown',
        };

        return { data: enriched, error: null };
    }, [id]);
}

// ─── CHALLENGES ───

export function useChallenges(tierFilter?: string) {
    return useSupabaseQuery<Challenge[]>(async () => {
        let q = supabase
            .from('challenge')
            .select('*')
            .eq('status', 'published')
            .order('created_at', { ascending: false });

        if (tierFilter && tierFilter !== 'All') {
            q = q.eq('tier', tierFilter);
        }
        return q as any;
    }, [tierFilter]);
}

interface ChallengeWithRelations extends Challenge {
    steps: string[];
    materials: string[];
    skills: string[];
    vocabulary: string[];
    levels: string;
    tags: string[];
    reactionCounts: { likes: number; upvotes: number; bookmarks: number };
}

export function useChallenge(id: string | undefined) {
    return useSupabaseQuery<ChallengeWithRelations | null>(async () => {
        if (!id) return { data: null, error: null };

        const { data: challenge, error } = await supabase
            .from('challenge')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !challenge) return { data: null, error };

        const [stepsRes, matsRes, skillsRes, vocabRes, levelsRes, tagsRes] = await Promise.all([
            supabase.from('challenge_step').select('*').eq('challenge_id', id).order('display_order'),
            supabase.from('challenge_material').select('*').eq('challenge_id', id).order('display_order'),
            supabase.from('challenge_skill').select('*').eq('challenge_id', id),
            supabase.from('challenge_vocabulary').select('*').eq('challenge_id', id),
            supabase.from('challenge_level').select('*').eq('challenge_id', id),
            supabase.from('entity_tag').select('tag_id, tag:tag(name)').eq('target_type', 'challenge').eq('target_id', id),
        ]);

        const [likesRes, upvotesRes, bookmarksRes] = await Promise.all([
            supabase.from('reaction').select('id', { count: 'exact', head: true }).eq('target_type', 'challenge').eq('target_id', id).eq('reaction_type', 'like'),
            supabase.from('reaction').select('id', { count: 'exact', head: true }).eq('target_type', 'challenge').eq('target_id', id).eq('reaction_type', 'upvote'),
            supabase.from('reaction').select('id', { count: 'exact', head: true }).eq('target_type', 'challenge').eq('target_id', id).eq('reaction_type', 'bookmark'),
        ]);

        const enriched: ChallengeWithRelations = {
            ...challenge as Challenge,
            steps: (stepsRes.data || []).map((s: any) => s.step_text),
            materials: (matsRes.data || []).map((m: any) => m.name),
            skills: (skillsRes.data || []).map((s: any) => s.skill_name),
            vocabulary: (vocabRes.data || []).map((v: any) => v.term),
            levels: (levelsRes.data || []).map((l: any) => l.level_name).join(', ') || '',
            tags: (tagsRes.data || []).map((t: any) => t.tag?.name).filter(Boolean),
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
            .select('*')
            .order('date', { ascending: true });

        if (typeFilter && typeFilter !== 'All') {
            q = q.eq('event_type', typeFilter as any);
        }
        const { data: events, error } = await q;
        if (error || !events) return { data: [], error };

        // Fetch registration counts
        const enriched = await Promise.all(
            (events as Event[]).map(async (evt) => {
                const { count } = await supabase
                    .from('event_registration')
                    .select('id', { count: 'exact', head: true })
                    .eq('event_id', evt.id);
                return { ...evt, registration_count: count || 0 };
            })
        );

        return { data: enriched, error: null };
    }, [typeFilter]);
}

export function useEvent(id: string | undefined) {
    return useSupabaseQuery<(Event & { registration_count: number }) | null>(async () => {
        if (!id) return { data: null, error: null };

        const { data: event, error } = await supabase
            .from('event')
            .select('*')
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

export function useMakers(tagFilter?: string) {
    return useSupabaseQuery<(MakerProfile & { skills: string[]; tags: string[]; badgeIds: string[] })[]>(async () => {
        const { data: profiles, error } = await supabase
            .from('maker_profile')
            .select('*')
            .eq('is_public', true)
            .order('display_name');

        if (error || !profiles) return { data: [], error };

        const enriched = await Promise.all(
            (profiles as MakerProfile[]).map(async (p) => {
                const [tagsRes, badgesRes] = await Promise.all([
                    supabase.from('entity_tag').select('tag:tag(name)').eq('target_type', 'maker_profile').eq('target_id', p.id),
                    supabase.from('user_badge').select('badge_id').eq('user_id', p.user_id),
                ]);
                const tags = (tagsRes.data || []).map((t: any) => t.tag?.name).filter(Boolean);

                // Filter by tag if specified
                if (tagFilter && tagFilter !== 'All' && !tags.includes(tagFilter)) {
                    return null;
                }

                return {
                    ...p,
                    skills: tags, // skills are stored as tags on profiles
                    tags,
                    badgeIds: (badgesRes.data || []).map((b: any) => b.badge_id),
                };
            })
        );

        return { data: enriched.filter(Boolean) as any, error: null };
    }, [tagFilter]);
}

export function useMaker(id: string | undefined) {
    return useSupabaseQuery<(MakerProfile & {
        skills: string[];
        tags: string[];
        badges: Badge[];
        projects: Project[];
        appUser: { name: string; email: string } | null;
    }) | null>(async () => {
        if (!id) return { data: null, error: null };

        // id could be maker_profile.id or user_id — try both
        let { data: profile, error } = await supabase
            .from('maker_profile')
            .select('*')
            .eq('id', id)
            .single();

        if (!profile) {
            const res = await supabase
                .from('maker_profile')
                .select('*')
                .eq('user_id', id)
                .single();
            profile = res.data;
            error = res.error;
        }

        if (error || !profile) return { data: null, error };
        const p = profile as MakerProfile;

        const [tagsRes, badgesRes, projectsRes, appUserRes] = await Promise.all([
            supabase.from('entity_tag').select('tag:tag(name)').eq('target_type', 'maker_profile').eq('target_id', p.id),
            supabase.from('user_badge').select('badge:badge(*)').eq('user_id', p.user_id),
            supabase.from('project').select('*').eq('owner_id', p.user_id).eq('status', 'active').eq('visibility', 'public'),
            supabase.from('app_user').select('name, email').eq('id', p.user_id).single(),
        ]);

        return {
            data: {
                ...p,
                skills: (tagsRes.data || []).map((t: any) => t.tag?.name).filter(Boolean),
                tags: (tagsRes.data || []).map((t: any) => t.tag?.name).filter(Boolean),
                badges: (badgesRes.data || []).map((b: any) => b.badge).filter(Boolean) as Badge[],
                projects: (projectsRes.data || []) as Project[],
                appUser: appUserRes.data as any,
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
            .select('*')
            .order('tier')
            .order('name') as any;
    }, []);
}

export function useUserBadges(userId?: string) {
    return useSupabaseQuery<(UserBadge & { badge: Badge })[]>(async () => {
        if (!userId) return { data: [], error: null };
        const { data, error } = await supabase
            .from('user_badge')
            .select('*, badge:badge(*)')
            .eq('user_id', userId);
        return { data: data as any, error };
    }, [userId]);
}

// ─── STORE ───

export function useProducts() {
    return useSupabaseQuery<(StoreProduct & { requiredBadge: Badge | null })[]>(async () => {
        const { data: products, error } = await supabase
            .from('store_product')
            .select('*')
            .eq('is_active', true)
            .order('name');

        if (error || !products) return { data: [], error };

        const enriched = await Promise.all(
            (products as StoreProduct[]).map(async (p) => {
                let requiredBadge: Badge | null = null;
                if (p.required_badge_id) {
                    const { data } = await supabase.from('badge').select('*').eq('id', p.required_badge_id).single();
                    requiredBadge = data as Badge | null;
                }
                return { ...p, requiredBadge };
            })
        );

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
            .select('*')
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
            .select('*')
            .eq('challenge_id', challengeId)
            .eq('user_id', user.id)
            .maybeSingle();
        setCompletion(data as ChallengeCompletion | null);
        setLoading(false);
    }, [user?.id, challengeId]);

    useEffect(() => { check(); }, [check]);

    const markComplete = async (notes?: string) => {
        if (!user || !challengeId) return;
        const { data } = await supabase.from('challenge_completion').insert({
            challenge_id: challengeId,
            user_id: user.id,
            status: 'pending',
            notes: notes || null,
        }).select().single();
        setCompletion(data as ChallengeCompletion | null);
    };

    return { completion, loading, markComplete };
}

// ─── PROJECT MUTATIONS ───

export function useProjectMutations() {
    const { user } = useAuth();

    const createProject = async (data: {
        title: string;
        summary: string;
        description: string;
        domain?: string;
        tier?: string;
        github_url?: string;
        image_url?: string;
        video_url?: string;
        duration?: string;
    }) => {
        if (!user) return { data: null, error: 'Not authenticated' };
        const { data: project, error } = await supabase
            .from('project')
            .insert({
                ...data,
                owner_id: user.id,
                status: 'draft',
                visibility: 'private',
            })
            .select()
            .single();
        return { data: project as Project | null, error: error?.message || null };
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
        skills?: string[];
    }) => {
        if (!user) return { error: 'Not authenticated' };

        const { skills, ...profileData } = data;

        // Upsert profile
        const { error } = await supabase
            .from('maker_profile')
            .upsert({
                user_id: user.id,
                ...profileData,
                is_public: true,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id' });

        if (error) return { error: error.message };

        // Update name in app_user too
        await supabase.from('app_user').update({ name: data.display_name }).eq('id', user.id);

        // Handle skills as tags on the profile
        if (skills && skills.length > 0) {
            // Get the profile id
            const { data: profile } = await supabase
                .from('maker_profile')
                .select('id')
                .eq('user_id', user.id)
                .single();

            if (profile) {
                // Clear old tags
                await supabase.from('entity_tag').delete().eq('target_type', 'maker_profile').eq('target_id', (profile as any).id);

                // Upsert each skill as a tag, then link
                for (const skillName of skills) {
                    const trimmed = skillName.trim();
                    if (!trimmed) continue;

                    const { data: tag } = await supabase
                        .from('tag')
                        .upsert({ name: trimmed }, { onConflict: 'name' })
                        .select()
                        .single();

                    if (tag) {
                        await supabase.from('entity_tag').insert({
                            target_type: 'maker_profile',
                            target_id: (profile as any).id,
                            tag_id: (tag as any).id,
                        });
                    }
                }
            }
        }

        await refreshUser();
        return { error: null };
    };

    return { saveProfile };
}
