import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from './supabase';
import { useAuth } from './auth';
import { toast } from './toast';

// ─── In-memory cache for useProject (30s TTL) ──────────────────────
// Makes back-navigation from Edit → Details instant by skipping the
// 10-query batch if the same project was loaded in the last 30 seconds.
// Any mutation in useProjectMutations / project_* tables calls
// `invalidateProjectCache(id)` so stale data never sticks.
// Bumped from 30s → 5min: snappier back-nav from Edit/Details, and any
// mutation already calls invalidateProjectCache() so freshness is preserved.
const PROJECT_CACHE_TTL_MS = 5 * 60_000;
const projectCache = new Map<string, { data: any; at: number }>();

// List-level cache for `useProjects()`. Same TTL as the detail cache so the
// /projects archive renders instantly on back-nav from a project page.
const PROJECT_LIST_CACHE_TTL_MS = 5 * 60_000;
const projectListCache = new Map<string, { data: any; at: number }>();
function projectListCacheKey(domainFilter?: string, sortBy?: string) {
    return `${domainFilter || 'All'}|${sortBy || 'newest'}`;
}
export function invalidateProjectListCache() {
    projectListCache.clear();
}

// Per-project sub-resource caches for BOM/Makes — same TTL story as above.
// Mutation hooks invalidate the relevant entry by projectId.
const PROJECT_BOM_CACHE_TTL_MS = 5 * 60_000;
const projectBomCache = new Map<string, { data: any; at: number }>();
const projectMakesCache = new Map<string, { data: any; at: number }>();

export function invalidateProjectCache(id?: string) {
    if (id) {
        projectCache.delete(id);
        projectBomCache.delete(id);
        projectMakesCache.delete(id);
    } else {
        projectCache.clear();
        projectBomCache.clear();
        projectMakesCache.clear();
    }
    // Any single-project mutation also invalidates the list view because
    // counts/cover/title may have changed.
    projectListCache.clear();
}

export function patchProjectCache(id: string, patch: Partial<any>) {
    const entry = projectCache.get(id);
    if (entry && entry.data) {
        entry.data = { ...entry.data, ...patch };
        entry.at = Date.now();
    }
}

// ─── Shared realtime channel registry ──────────────────────────────
// useReaction + useComments used to open two separate channels per
// target (one for `reaction` table, one for `comment` table). We now
// open ONE channel per (targetType, targetId) and multiplex listeners.
// Reference-counted so the channel is torn down only when the last
// consumer unmounts.
type RTListener = (payload: any, table: 'reaction' | 'comment') => void;
interface SharedChannel {
    channel: ReturnType<typeof supabase.channel>;
    listeners: Set<RTListener>;
    refCount: number;
}
const sharedRealtime = new Map<string, SharedChannel>();

function acquireSharedChannel(
    targetType: string,
    targetId: string,
    listener: RTListener,
): () => void {
    const key = `${targetType}:${targetId}`;
    let entry = sharedRealtime.get(key);
    if (!entry) {
        const listeners = new Set<RTListener>();
        const channel = supabase
            .channel(`rt:${key}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'reaction', filter: `target_id=eq.${targetId}` },
                (payload) => {
                    listeners.forEach((l) => l(payload, 'reaction'));
                },
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'comment', filter: `target_id=eq.${targetId}` },
                (payload) => {
                    listeners.forEach((l) => l(payload, 'comment'));
                },
            )
            .subscribe();
        entry = { channel, listeners, refCount: 0 };
        sharedRealtime.set(key, entry);
    }
    entry.listeners.add(listener);
    entry.refCount++;

    return () => {
        const e = sharedRealtime.get(key);
        if (!e) return;
        e.listeners.delete(listener);
        e.refCount--;
        if (e.refCount <= 0) {
            supabase.removeChannel(e.channel);
            sharedRealtime.delete(key);
        }
    };
}
import type {
    Project, Challenge, Event, Badge, StoreProduct,
    MakerProfile, Reaction, ChallengeCompletion,
    EventRegistration, ProjectImage, ProjectVideo, ProjectFile,
    ChallengeStep, ChallengeMaterial, ChallengeSkill,
    ChallengeVocabulary, ChallengeLevel, UserBadge,
    Tag, EntityTag, ReactionType, TargetType, Comment,
    AppUser, Equipment, Inventory, Role, EventType, XPEvent,
    EventWebsite, EventHost, ProjectBomLine, ProjectMake, ProjectCommentPin, ProjectMergeRequest
} from './database.types';

// ─── Generic fetch hook (with race condition protection + stale-while-revalidate) ───

/**
 * Global cross-mount cache for `useSupabaseQuery` callers that opt in via
 * the `cacheKey` option. When a component unmounts and later remounts
 * (e.g. navigating away and back), the second mount instantly seeds its
 * state from this cache so the user sees the previous data immediately
 * while a background refetch validates freshness. Without this, every
 * page change re-fetched from Supabase and flashed a loading skeleton.
 *
 * Exposed so that pages can surgically invalidate an entry after a
 * mutation instead of waiting for the TTL to expire.
 */
const GLOBAL_QUERY_CACHE = new Map<string, { at: number; data: any }>();
const DEFAULT_QUERY_CACHE_TTL_MS = 60_000;

export function invalidateQueryCache(cacheKey: string) {
    GLOBAL_QUERY_CACHE.delete(cacheKey);
}

export function useSupabaseQuery<T>(
    queryFn: (signal: AbortSignal) => Promise<{ data: T | null; error: any }>,
    deps: any[] = [],
    options?: {
        getInitialData?: () => T | null;
        /** Enables cross-mount caching for instant back-nav. */
        cacheKey?: string;
        /** Override the default 60s TTL. */
        cacheTtlMs?: number;
    }
) {
    const cacheKey = options?.cacheKey;
    const cacheTtlMs = options?.cacheTtlMs ?? DEFAULT_QUERY_CACHE_TTL_MS;

    // Synchronously seed from:
    //   1. explicit getInitialData() if caller provided one, else
    //   2. the global cache keyed by `cacheKey` (fresh entry), else
    //   3. null (cold start → show skeleton)
    // This is recomputed when deps change via useMemo upstream.
    const seed: T | null = (() => {
        if (options?.getInitialData) {
            const v = options.getInitialData();
            if (v != null) return v;
        }
        if (cacheKey) {
            const entry = GLOBAL_QUERY_CACHE.get(cacheKey);
            if (entry && Date.now() - entry.at < cacheTtlMs) {
                return entry.data as T;
            }
        }
        return null;
    })();

    const [data, setData] = useState<T | null>(seed);
    const [loading, setLoading] = useState(seed == null);
    const [error, setError] = useState<string | null>(null);
    const fetchId = useRef(0);
    const hasFetchedOnce = useRef(seed != null);

    const refetch = useCallback(async () => {
        const thisId = ++fetchId.current;
        const controller = new AbortController();

        // Stale-while-revalidate: only show loading spinner on first fetch
        // Subsequent refetches keep showing old data while new data loads
        if (!hasFetchedOnce.current) setLoading(true);
        try {
            const { data, error } = await queryFn(controller.signal);
            // Only apply result if this is still the latest fetch
            if (thisId !== fetchId.current) return;
            setData(data);
            setError(error?.message || null);
            hasFetchedOnce.current = true;
            // Write through to the cross-mount cache on success
            if (cacheKey && data != null && !error) {
                GLOBAL_QUERY_CACHE.set(cacheKey, { at: Date.now(), data });
            }
        } catch (err: any) {
            if (thisId !== fetchId.current) return;
            setError(err.message || 'Unknown error');
        } finally {
            if (thisId === fetchId.current) setLoading(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);

    useEffect(() => {
        refetch();
        // Invalidate any in-flight fetch on cleanup
        return () => { fetchId.current++; };
    }, [refetch]);

    return { data, loading, error, refetch };
}

// ─── PROJECTS ───

/**
 * Richer shape returned by `useProjects()` for the §8 archive rebuild.
 *
 * Everything here is what the new ProjectArchiveCard + ProjectQuickPeek
 * need in order to render without a second round-trip per card. All
 * counts are pre-aggregated client-side from a single batched fetch;
 * we never N+1-query.
 */
export interface ProjectListItem extends Project {
    cover_image_url: string | null;
    owner_name: string;
    owner_avatar_url: string | null;
    tags: string[];
    milestone_total: number;
    milestone_done: number;
    likes: number;
    bookmarks: number;
    video_count: number;
    member_count: number;
    remix_origin_title?: string | null;
    remix_origin_owner?: string | null;
}

/**
 * Projects list query — §8 archive rebuild.
 *
 * Strategy:
 *   1. Base select on `project` with LEFT JOINs for `project_image`,
 *      `project_video`, `project_member`, and `project_milestone`
 *      in one request. PostgREST returns them as nested arrays.
 *   2. Separate parallel fetches for entities whose per-row counts are
 *      cheaper to aggregate in JS than to nest:
 *        - `reaction` (grouped by target_id + type) → likes, bookmarks
 *        - `entity_tag` joined to `tag` (grouped by target_id) → tags[]
 *        - `maker_profile` (batch by user_id) → avatar_url
 *        - `app_user` (batch by id) → name
 *   3. Realtime subscription on `project` INSERT triggers a refetch so
 *      fresh rows appear without a page reload.
 *
 * Reaction semantics (documented for consistency across §8):
 *   - LIKE      → social warmth signal AND ranking signal; shown on every
 *                 card AND powers the `Trending` sort (likes desc). The old
 *                 Upvote reaction was removed in Phase 1.6 because it
 *                 duplicated Like's role; Like now carries both jobs.
 *   - BOOKMARK  → "save for later"; shown on every card AND powers the
 *                 "Bookmarks" view on the Projects page.
 */
export function useProjects(
    domainFilter?: string,
    sortBy?: 'newest' | 'oldest' | 'trending'
) {
    const query = useSupabaseQuery<ProjectListItem[]>(async (signal: AbortSignal) => {
        const cacheKey = projectListCacheKey(domainFilter, sortBy);
        const cachedList = projectListCache.get(cacheKey);
        if (cachedList && Date.now() - cachedList.at < PROJECT_LIST_CACHE_TTL_MS) {
            return { data: cachedList.data, error: null };
        }
        let q = supabase
            .from('project')
            .select(`
                id, title, summary, domain, tier, status, visibility, created_at, owner_id, remixed_from_id,
                project_image ( image_url, display_order ),
                project_video ( id ),
                project_member ( id ),
                project_milestone ( id, is_complete )
            `)
            .eq('status', 'active')
            .eq('visibility', 'public')
            .abortSignal(signal);

        // Server-side order for newest/oldest; 'trending' is client-sorted
        // below after we have the like counts.
        if (sortBy === 'oldest') {
            q = q.order('created_at', { ascending: true });
        } else {
            q = q.order('created_at', { ascending: false });
        }

        if (domainFilter && domainFilter !== 'All') {
            q = q.eq('domain', domainFilter);
        }

        const { data: rows, error } = (await (q as any)) as { data: any[] | null; error: any };
        if (error) return { data: null, error };
        if (!rows || rows.length === 0) return { data: [], error: null };

        const ids = rows.map((r) => r.id);
        const ownerIds = Array.from(new Set(rows.map((r) => r.owner_id).filter(Boolean)));

        // Parallel aggregate fetches — one round-trip each, not per-row.
        const [reactionsRes, tagsRes, usersRes, profilesRes] = await Promise.all([
            supabase
                .from('reaction')
                .select('target_id, reaction_type')
                .eq('target_type', 'project')
                .in('target_id', ids),
            supabase
                .from('entity_tag')
                .select('target_id, tag:tag(name)')
                .eq('target_type', 'project')
                .in('target_id', ids),
            ownerIds.length > 0
                ? supabase.from('app_user').select('id, name').in('id', ownerIds)
                : Promise.resolve({ data: [], error: null } as any),
            ownerIds.length > 0
                ? supabase.from('maker_profile').select('user_id, avatar_url').in('user_id', ownerIds)
                : Promise.resolve({ data: [], error: null } as any),
        ]);

        // Build lookup maps — O(n) each.
        // Historical 'upvote' rows (pre Phase 1.6) are intentionally ignored.
        const reactionMap = new Map<string, { likes: number; bookmarks: number }>();
        for (const r of (reactionsRes.data as any[] | null) || []) {
            const bucket = reactionMap.get(r.target_id) || { likes: 0, bookmarks: 0 };
            if (r.reaction_type === 'like') bucket.likes += 1;
            else if (r.reaction_type === 'bookmark') bucket.bookmarks += 1;
            reactionMap.set(r.target_id, bucket);
        }

        const tagMap = new Map<string, string[]>();
        for (const t of (tagsRes.data as any[] | null) || []) {
            const name = t.tag?.name;
            if (!name) continue;
            const arr = tagMap.get(t.target_id) || [];
            arr.push(name);
            tagMap.set(t.target_id, arr);
        }

        const nameMap = new Map<string, string>();
        for (const u of (usersRes.data as any[] | null) || []) {
            nameMap.set(u.id, u.name);
        }

        const avatarMap = new Map<string, string | null>();
        for (const p of (profilesRes.data as any[] | null) || []) {
            avatarMap.set(p.user_id, p.avatar_url || null);
        }

        // Assemble final list items.
        const enriched: ProjectListItem[] = rows.map((p: any) => {
            const imgs = Array.isArray(p.project_image) ? [...p.project_image] : [];
            imgs.sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0));
            const cover = imgs[0]?.image_url || null;
            const milestones = Array.isArray(p.project_milestone) ? p.project_milestone : [];
            const counts = reactionMap.get(p.id) || { likes: 0, bookmarks: 0 };

            // Strip nested relations before spreading.
            const {
                project_image: _pi,
                project_video: pv,
                project_member: pm,
                project_milestone: _pms,
                ...rest
            } = p;

            return {
                ...(rest as Project),
                cover_image_url: cover,
                owner_name: nameMap.get(p.owner_id) || 'Unknown',
                owner_avatar_url: avatarMap.get(p.owner_id) || null,
                tags: tagMap.get(p.id) || [],
                milestone_total: milestones.length,
                milestone_done: milestones.filter((m: any) => m.is_complete).length,
                likes: counts.likes,
                bookmarks: counts.bookmarks,
                video_count: Array.isArray(pv) ? pv.length : 0,
                member_count: Array.isArray(pm) ? pm.length : 0,
            };
        });

        // Client-side trending sort — likes desc, tiebreak on created_at.
        // Also drives the featured-slot selection on the Projects archive
        // (slot 1 of the grid = most-liked project in the filtered set).
        if (sortBy === 'trending') {
            enriched.sort((a, b) => {
                if (b.likes !== a.likes) return b.likes - a.likes;
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            });
        }

        projectListCache.set(projectListCacheKey(domainFilter, sortBy), { data: enriched, at: Date.now() });
        return { data: enriched, error: null };
    }, [domainFilter, sortBy], {
        // Synchronous cache hit avoids the loading skeleton flash on mount.
        getInitialData: () => {
            const cached = projectListCache.get(projectListCacheKey(domainFilter, sortBy));
            if (cached && Date.now() - cached.at < PROJECT_LIST_CACHE_TTL_MS) return cached.data;
            return null;
        },
    });

    // §8 [FLOW] — realtime INSERT subscription on project. Use a stable
    // refetch ref so subscription only mounts/unmounts once, preventing double-fetch in StrictMode.
    const refetchRef = useRef(query.refetch);
    useEffect(() => {
        refetchRef.current = query.refetch;
    }, [query.refetch]);

    useEffect(() => {
        let cancelled = false;
        const channel = supabase
            .channel('projects_list_realtime')
            .on(
                'postgres_changes' as any,
                { event: 'INSERT', schema: 'public', table: 'project' },
                (payload: any) => {
                    if (cancelled) return;
                    if (typeof console !== 'undefined') {
                        console.debug('[realtime] project insert', payload?.new?.id);
                    }
                    refetchRef.current();
                }
            )
            .subscribe();
        return () => {
            cancelled = true;
            supabase.removeChannel(channel);
        };
    }, []);

    return query;
}

/**
 * §8 — returns the set of project ids the current user has bookmarked.
 * Powers the "Bookmarks" view toggle on the Projects page. Returns an
 * empty Set for logged-out users.
 */
export function useMyBookmarkedProjectIds() {
    const { user } = useAuth();
    return useSupabaseQuery<Set<string>>(async () => {
        if (!user) return { data: new Set<string>(), error: null };
        const { data, error } = await supabase
            .from('reaction')
            .select('target_id')
            .eq('target_type', 'project')
            .eq('reaction_type', 'bookmark')
            .eq('user_id', user.id);
        if (error) return { data: new Set<string>(), error };
        return { data: new Set<string>((data || []).map((r: any) => r.target_id)), error: null };
    }, [user?.id]);
}

/**
 * Lightweight bookmark toggle for project cards. Inserts or deletes a single
 * `reaction` row of type 'bookmark' for the current user. Used by the card-
 * level Save button so the user can save without opening the project.
 */
export function useToggleProjectBookmark() {
    const { user } = useAuth();
    return useCallback(
        async (projectId: string, currentlyBookmarked: boolean): Promise<boolean> => {
            if (!user) return currentlyBookmarked;
            try {
                if (currentlyBookmarked) {
                    const { error } = await supabase
                        .from('reaction')
                        .delete()
                        .eq('target_type', 'project')
                        .eq('target_id', projectId)
                        .eq('user_id', user.id)
                        .eq('reaction_type', 'bookmark');
                    if (error) throw error;
                    return false;
                } else {
                    const { error } = await (supabase.from('reaction') as any).insert({
                        target_type: 'project',
                        target_id: projectId,
                        user_id: user.id,
                        reaction_type: 'bookmark',
                    });
                    if (error) throw error;
                    return true;
                }
            } catch (err: any) {
                const msg = String(err?.message || '').toLowerCase();
                if (msg.includes('rate') || msg.includes('too many') || err?.code === 'P0001') {
                    toast.error("You're going too fast — slow down a moment.");
                } else {
                    toast.error("Couldn't update your saved projects — try again.");
                }
                return currentlyBookmarked;
            }
        },
        [user?.id],
    );
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

export interface ProjectWithRelations extends Project {
    images: ProjectImage[];
    videos: ProjectVideo[];
    files: ProjectFile[];
    tags: string[];
    reactionCounts: { likes: number; bookmarks: number };
    ownerName: string;
    milestones: { id: string; title: string; description: string | null; is_complete: boolean; display_order: number }[];
    members: { id: string; user_id: string; role: string; name: string }[];
    remix_origin_title?: string | null;
    remix_origin_owner?: string | null;
}

export function useProject(id: string | undefined) {
    return useSupabaseQuery<ProjectWithRelations | null>(async (signal: AbortSignal) => {
        if (!id) return { data: null, error: null };

        // Cache hit: return instantly (back-nav from Edit → Details).
        const cached = projectCache.get(id);
        if (cached && Date.now() - cached.at < PROJECT_CACHE_TTL_MS) {
            return { data: cached.data, error: null };
        }

        const { data: project, error } = await supabase
            .from('project')
            .select('id, title, summary, description, domain, tier, github_url, duration, status, visibility, created_at, updated_at, owner_id, remixed_from_id')
            .eq('id', id)
            .abortSignal(signal)
            .single();

        if (error || !project) return { data: null, error };

        // Fetch ALL related data in a single Promise.all batch.
        // Reactions collapsed from 2 head-count queries to 1 rows query
        // that we tally client-side — fewer round trips on cold loads.
        const [imagesRes, videosRes, tagsRes, ownerRes, filesRes, reactionsRes, milestonesRes, membersRes] = await Promise.all([
            supabase.from('project_image').select('id, image_url, caption, display_order').eq('project_id', id).order('display_order'),
            supabase.from('project_video').select('id, title, video_url, display_order').eq('project_id', id).order('display_order'),
            supabase.from('entity_tag').select('tag_id, tag:tag(name)').eq('target_type', 'project').eq('target_id', id),
            supabase.from('app_user').select('name').eq('id', project.owner_id).single(),
            supabase.from('project_file').select('id, file_url, file_name, file_size').eq('project_id', id).order('created_at'),
            supabase.from('reaction').select('reaction_type').eq('target_type', 'project').eq('target_id', id),
            supabase.from('project_milestone').select('id, title, description, is_complete, display_order').eq('project_id', id).order('display_order'),
            supabase.from('project_member').select('id, user_id, role, joined_at, app_user:app_user!user_id(name, email)').eq('project_id', id)
        ]);

        let likes = 0, bookmarks = 0;
        for (const r of (reactionsRes.data || []) as { reaction_type: string }[]) {
            if (r.reaction_type === 'like') likes++;
            else if (r.reaction_type === 'bookmark') bookmarks++;
        }

        // Fetch remix origin data if remixed_from_id is set
        let remix_origin_title: string | null = null;
        let remix_origin_owner: string | null = null;
        if (project.remixed_from_id) {
            const originRes = await supabase
                .from('project')
                .select('id, title, owner_id, app_user:app_user!owner_id(name)')
                .eq('id', project.remixed_from_id)
                .single();
            if (originRes.data) {
                remix_origin_title = originRes.data.title;
                remix_origin_owner = (originRes.data as any).app_user?.name || null;
            }
        }

        const enriched: ProjectWithRelations = {
            ...project as Project,
            images: (imagesRes.data || []) as ProjectImage[],
            videos: (videosRes.data || []) as ProjectVideo[],
            files: (filesRes.data || []) as ProjectFile[],
            tags: (tagsRes.data || []).map((t: any) => t.tag?.name).filter(Boolean),
            reactionCounts: { likes, bookmarks },
            ownerName: (ownerRes.data as any)?.name || 'Unknown',
            milestones: (milestonesRes.data || []),
            members: (membersRes.data || []).map((m: any) => ({
                id: m.id,
                user_id: m.user_id,
                role: m.role,
                name: m.app_user?.name || 'Unknown',
            })),
            remix_origin_title,
            remix_origin_owner,
        };

        projectCache.set(id, { data: enriched, at: Date.now() });
        return { data: enriched, error: null };
    }, [id], {
        // Synchronous cache hit avoids the loading skeleton flash on mount
        getInitialData: () => {
            if (!id) return null;
            const cached = projectCache.get(id);
            if (cached && Date.now() - cached.at < PROJECT_CACHE_TTL_MS) return cached.data;
            return null;
        },
    });
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
            q = q.ilike('domain', domainFilter);
        }
        return q as any;
    }, [tierFilter, domainFilter], {
        cacheKey: `challenges:${tierFilter ?? 'all'}:${domainFilter ?? 'all'}`,
    });
}

// ─── Explorer Hub batched hooks ───
//
// The Explorer Hub renders dozens of challenge cards at once. Calling
// `useReaction('challenge', id)` or `useChallengeCompletion(id)` per card
// would fan out into N×1 queries + N realtime channels on first paint.
//
// These three hooks batch the per-user state into a single query each,
// returning primitives the card component can look up in O(1) without
// mounting its own subscription. Mirrors the `useMyBookmarkedProjectIds` /
// `useToggleProjectBookmark` pair that already exists above.

/**
 * Returns the set of challenge ids the current user has bookmarked.
 * One query per page mount. Empty set if logged out.
 */
export function useMyBookmarkedChallengeIds() {
    const { user } = useAuth();
    return useSupabaseQuery<Set<string>>(async () => {
        if (!user) return { data: new Set<string>(), error: null };
        const { data, error } = await supabase
            .from('reaction')
            .select('target_id')
            .eq('target_type', 'challenge')
            .eq('reaction_type', 'bookmark')
            .eq('user_id', user.id);
        if (error) return { data: new Set<string>(), error };
        return { data: new Set<string>((data || []).map((r: any) => r.target_id)), error: null };
    }, [user?.id]);
}

/**
 * Returns the current user's bookmarked challenge ids in the order they
 * were saved (most-recent first). Used by Explorer Hub's "Continue
 * browsing" strip to surface the last 3 things the user saved so the
 * page has a sense of memory across visits.
 *
 * Separate from `useMyBookmarkedChallengeIds` because callers that only
 * need existence checks (card bookmark fill) don't need ordering — and
 * Set-based lookups are O(1) vs O(N) array includes.
 */
export function useMyRecentlyBookmarkedChallengeIds(limit = 6) {
    const { user } = useAuth();
    return useSupabaseQuery<string[]>(async () => {
        if (!user) return { data: [], error: null };
        const { data, error } = await supabase
            .from('reaction')
            .select('target_id, created_at')
            .eq('target_type', 'challenge')
            .eq('reaction_type', 'bookmark')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(limit);
        if (error) return { data: [], error };
        return { data: (data || []).map((r: any) => r.target_id), error: null };
    }, [user?.id, limit]);
}

/**
 * Lightweight bookmark toggle for challenge cards. Inserts or deletes a
 * single `reaction` row of type 'bookmark' for the current user. Used by
 * the card-level Save button so users can save without opening the
 * blueprint.
 *
 * Returns the *new* bookmarked state so the caller can do an optimistic
 * update without waiting for the next fetch.
 */
export function useToggleChallengeBookmark() {
    const { user } = useAuth();
    return useCallback(
        async (challengeId: string, currentlyBookmarked: boolean): Promise<boolean> => {
            if (!user) return currentlyBookmarked;
            try {
                if (currentlyBookmarked) {
                    const { error } = await supabase
                        .from('reaction')
                        .delete()
                        .eq('target_type', 'challenge')
                        .eq('target_id', challengeId)
                        .eq('user_id', user.id)
                        .eq('reaction_type', 'bookmark');
                    if (error) throw error;
                    return false;
                } else {
                    const { error } = await (supabase.from('reaction') as any).insert({
                        target_type: 'challenge',
                        target_id: challengeId,
                        user_id: user.id,
                        reaction_type: 'bookmark',
                    });
                    if (error) throw error;
                    return true;
                }
            } catch (err: any) {
                const msg = String(err?.message || '').toLowerCase();
                if (msg.includes('rate') || msg.includes('too many') || err?.code === 'P0001') {
                    toast.error("You're going too fast — slow down a moment.");
                } else {
                    toast.error("Couldn't update your saved blueprints — try again.");
                }
                return currentlyBookmarked;
            }
        },
        [user?.id],
    );
}

/**
 * Returns a Map<challenge_id, status> of the current user's challenge
 * completions. `status` is the raw string from `challenge_completion.status`
 * (typically 'pending' | 'verified'). Empty map if logged out.
 *
 * One query per page mount. Used by the Explorer Hub card to render a
 * compact "Completed" / "In review" pill without mounting a subscription
 * per card.
 */
export function useMyChallengeCompletionStatus() {
    const { user } = useAuth();
    return useSupabaseQuery<Map<string, string>>(async () => {
        if (!user) return { data: new Map<string, string>(), error: null };
        const { data, error } = await supabase
            .from('challenge_completion')
            .select('challenge_id, status')
            .eq('user_id', user.id);
        if (error) return { data: new Map<string, string>(), error };
        const map = new Map<string, string>();
        for (const row of (data || []) as { challenge_id: string; status: string }[]) {
            map.set(row.challenge_id, row.status);
        }
        return { data: map, error: null };
    }, [user?.id]);
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
    reactionCounts: { likes: number; bookmarks: number };
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

        const [stepsRes, matsRes, skillsRes, vocabRes, levelsRes, tagsRes, imagesRes, videosRes, likesRes, bookmarksRes] = await Promise.all([
            supabase.from('challenge_step').select('step_text, display_order').eq('challenge_id', id).order('display_order'),
            supabase.from('challenge_material').select('name, display_order').eq('challenge_id', id).order('display_order'),
            supabase.from('challenge_skill').select('skill_name').eq('challenge_id', id),
            supabase.from('challenge_vocabulary').select('term, definition').eq('challenge_id', id),
            supabase.from('challenge_level').select('level_name, description').eq('challenge_id', id),
            supabase.from('entity_tag').select('tag_id, tag:tag(name)').eq('target_type', 'challenge').eq('target_id', id),
            supabase.from('challenge_image').select('image_url, caption, display_order').eq('challenge_id', id).order('display_order'),
            supabase.from('challenge_video').select('title, video_url').eq('challenge_id', id).order('display_order'),
            supabase.from('reaction').select('id', { count: 'exact', head: true }).eq('target_type', 'challenge').eq('target_id', id).eq('reaction_type', 'like'),
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
    }, [typeFilter], { cacheKey: `events:${typeFilter ?? 'all'}` });
}

export function useEvent(id: string | undefined) {
    return useSupabaseQuery<(Event & { registration_count: number }) | null>(async () => {
        if (!id) return { data: null, error: null };

        // Parallel: event + registration count in one batch
        const [eventRes, countRes] = await Promise.all([
            supabase
                .from('event')
                .select('id, title, description, event_type, date, end_date, location, capacity, cover_image_url, registration_status, auto_badge_id, created_by, created_at, updated_at')
                .eq('id', id)
                .single(),
            supabase
                .from('event_registration')
                .select('id', { count: 'exact', head: true })
                .eq('event_id', id),
        ]);

        if (eventRes.error || !eventRes.data) return { data: null, error: eventRes.error };

        return {
            data: { ...(eventRes.data as Event), registration_count: countRes.count || 0 },
            error: null,
        };
    }, [id]);
}

// ─── EVENT HOSTS ───

export function useEventHosts(eventId: string | undefined) {
    return useSupabaseQuery<{ id: string; user_id: string; name: string; avatar_url: string | null }[]>(async () => {
        if (!eventId) return { data: [], error: null };

        const { data: hosts, error } = await supabase
            .from('event_host')
            .select('id, user_id, event_id, created_at')
            .eq('event_id', eventId);

        // Swallow errors (e.g. table not yet migrated) — hosts are non-critical UI.
        if (error || !hosts || hosts.length === 0) return { data: [], error: null };

        const userIds = (hosts as EventHost[]).map(h => h.user_id);

        // Batch fetch mentor names and avatars
        const [usersRes, profilesRes] = await Promise.all([
            supabase.from('app_user').select('id, name').in('id', userIds),
            supabase.from('maker_profile').select('user_id, avatar_url').in('user_id', userIds),
        ]);

        const nameMap: Record<string, string> = {};
        (usersRes.data || []).forEach((u: any) => { nameMap[u.id] = u.name; });

        const avatarMap: Record<string, string | null> = {};
        (profilesRes.data || []).forEach((p: any) => { avatarMap[p.user_id] = p.avatar_url; });

        const enriched = (hosts as EventHost[]).map(h => ({
            id: h.id,
            user_id: h.user_id,
            name: nameMap[h.user_id] || 'Unknown Mentor',
            avatar_url: avatarMap[h.user_id] || null,
        }));

        return { data: enriched, error: null };
    }, [eventId]);
}

export function useEventHostMutations() {
    const addHost = async (eventId: string, userId: string) => {
        const { error } = await supabase.from('event_host').insert({ event_id: eventId, user_id: userId });
        return { error: error?.message || null };
    };

    const removeHost = async (hostId: string) => {
        const { error } = await supabase.from('event_host').delete().eq('id', hostId);
        return { error: error?.message || null };
    };

    return { addHost, removeHost };
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
    }, [tagFilter, roleFilter], {
        cacheKey: `makers:${tagFilter ?? 'all'}:${roleFilter ?? 'all'}`,
    });
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

        // id could be maker_profile.id or user_id — single query with or()
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
    }, [], { cacheKey: 'badges:all', cacheTtlMs: 5 * 60_000 });
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
            .select('id, user_id, display_name, pronouns, bio, aspirations, avatar_url, github_url, linkedin_url, website_url, x_url, bluesky_url, discord_username, mentor_domains, approval_domains, show_email, is_public, declared_intent, created_at, updated_at')
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

        // Use simple SELECT + .length instead of HEAD+count which causes 503 on free tier
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

// ─── REACTIONS (Toggle) ───

export function useReaction(targetType: TargetType, targetId: string | undefined) {
    const { user } = useAuth();
    const [myReactions, setMyReactions] = useState<ReactionType[]>([]);
    const [counts, setCounts] = useState({ likes: 0, bookmarks: 0 });
    const hasFetchedOnce = useRef(false);

    const fetchReactions = useCallback(async () => {
        if (!targetId) return;

        // Single query: fetch all reaction rows for this target, tally
        // counts + user's own reactions client-side. Drops from 3 round
        // trips (2 head-counts + 1 user list) to 1.
        const { data } = await supabase
            .from('reaction')
            .select('reaction_type, user_id')
            .eq('target_type', targetType)
            .eq('target_id', targetId);

        let likes = 0, bookmarks = 0;
        const mine: ReactionType[] = [];
        for (const r of (data || []) as { reaction_type: ReactionType; user_id: string }[]) {
            if (r.reaction_type === 'like') likes++;
            else if (r.reaction_type === 'bookmark') bookmarks++;
            if (user && r.user_id === user.id) mine.push(r.reaction_type);
        }
        setCounts({ likes, bookmarks });
        if (user) setMyReactions(mine);
        hasFetchedOnce.current = true;
    }, [targetType, targetId, user?.id]);

    useEffect(() => { fetchReactions(); }, [fetchReactions]);

    // Realtime delta listener — updates counts in place on INSERT/DELETE
    // without a full refetch. Uses the shared channel (multiplexed with
    // useComments) so at most one WS connection per target.
    useEffect(() => {
        if (!targetId) return;
        const release = acquireSharedChannel(targetType, targetId, (payload, table) => {
            if (table !== 'reaction') return;
            const row: any = payload.new || payload.old || {};
            const rtype: ReactionType | undefined = row.reaction_type;
            if (!rtype || (rtype !== 'like' && rtype !== 'bookmark')) return;
            const key = rtype === 'like' ? 'likes' : 'bookmarks';
            if (payload.eventType === 'INSERT') {
                setCounts((prev) => ({ ...prev, [key]: prev[key] + 1 }));
                if (user && row.user_id === user.id) {
                    setMyReactions((prev) => prev.includes(rtype) ? prev : [...prev, rtype]);
                }
            } else if (payload.eventType === 'DELETE') {
                setCounts((prev) => ({ ...prev, [key]: Math.max(0, prev[key] - 1) }));
                if (user && row.user_id === user.id) {
                    setMyReactions((prev) => prev.filter((r) => r !== rtype));
                }
            }
        });
        return release;
    }, [targetType, targetId, user?.id]);

    const toggle = async (reactionType: ReactionType) => {
        if (!user || !targetId) return;

        const isRemoving = myReactions.includes(reactionType);
        // Optimistic update
        const countKey = reactionType === 'like' ? 'likes' : 'bookmarks';
        const prevMyReactions = myReactions;
        const prevCounts = counts;
        setMyReactions(prev => isRemoving ? prev.filter(r => r !== reactionType) : [...prev, reactionType]);
        setCounts(prev => ({ ...prev, [countKey]: prev[countKey] + (isRemoving ? -1 : 1) }));

        try {
            if (isRemoving) {
                const { error } = await supabase
                    .from('reaction')
                    .delete()
                    .eq('target_type', targetType)
                    .eq('target_id', targetId)
                    .eq('user_id', user.id)
                    .eq('reaction_type', reactionType);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('reaction').insert({
                    target_type: targetType,
                    target_id: targetId,
                    user_id: user.id,
                    reaction_type: reactionType,
                });
                if (error) throw error;
            }
            // Background sync — don't block UI
            fetchReactions().catch(() => {});
        } catch (err: any) {
            // F-401: roll back optimistic state and toast
            setMyReactions(prevMyReactions);
            setCounts(prevCounts);
            const msg = String(err?.message || '').toLowerCase();
            if (msg.includes('rate') || msg.includes('too many') || err?.code === 'P0001') {
                toast.error("You're going too fast — slow down a moment.");
            } else {
                toast.error("Couldn't save your reaction — try again.");
            }
        }
    };

    // Stable identities so consuming components don't re-render on every
    // parent render. `counts` and `myReactions` are primitive/array state
    // already, so we memoize the return object shape only.
    const stableCounts = useMemo(() => counts, [counts.likes, counts.bookmarks]);
    const stableMyReactions = useMemo(() => myReactions, [myReactions.join(',')]);

    return { counts: stableCounts, myReactions: stableMyReactions, toggle, refetch: fetchReactions };
}

// ─── COMMENTS (with realtime) ───

export function useComments(targetType: TargetType, targetId: string | undefined) {
    const [comments, setComments] = useState<(Comment & { userName: string })[]>([]);
    const [loading, setLoading] = useState(true);
    const hasFetchedOnce = useRef(false);
    const { user } = useAuth();

    const fetchComments = useCallback(async () => {
        if (!targetId) return;
        // Only show loading on first fetch (stale-while-revalidate)
        if (!hasFetchedOnce.current) setLoading(true);
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
        hasFetchedOnce.current = true;
        setLoading(false);
    }, [targetType, targetId]);

    useEffect(() => { fetchComments(); }, [fetchComments]);

    // Realtime subscription — shared channel, applies deltas directly to
    // local state instead of full refetching. Only falls back to refetch
    // on INSERT (to hydrate the joined app_user.name).
    useEffect(() => {
        if (!targetId) return;
        const release = acquireSharedChannel(targetType, targetId, (payload, table) => {
            if (table !== 'comment') return;
            if (payload.eventType === 'DELETE') {
                const gone = payload.old as any;
                setComments((prev) => prev.filter((c) => c.id !== gone?.id));
            } else if (payload.eventType === 'UPDATE') {
                const row = payload.new as any;
                setComments((prev) => prev.map((c) => (c.id === row.id ? { ...c, ...row } : c)));
            } else if (payload.eventType === 'INSERT') {
                // Need joined user name — fetch the single row only.
                const row = payload.new as any;
                supabase
                    .from('comment')
                    .select('*, app_user:app_user(name)')
                    .eq('id', row.id)
                    .maybeSingle()
                    .then(({ data }) => {
                        if (!data) return;
                        const enriched = { ...(data as any), userName: (data as any).app_user?.name || 'Unknown' };
                        setComments((prev) =>
                            prev.some((c) => c.id === enriched.id) ? prev : [...prev, enriched],
                        );
                    });
            }
        });
        return release;
    }, [targetType, targetId]);

    const addComment = async (content: string): Promise<{ error: string | null }> => {
        if (!user || !targetId) return { error: 'Not signed in' };
        try {
            const { error } = await supabase.from('comment').insert({
                target_type: targetType,
                target_id: targetId,
                user_id: user.id,
                content,
            });
            if (error) throw error;
            return { error: null };
        } catch (err: any) {
            const msg = String(err?.message || '').toLowerCase();
            // F-405: rate-limit toast (Postgres trigger raises P0001 with 'rate limit')
            if (msg.includes('rate') || msg.includes('too many') || err?.code === 'P0001') {
                toast.error("You're commenting too fast — wait a moment and try again.");
                return { error: 'rate_limited' };
            }
            toast.error("Couldn't post your comment.");
            return { error: err?.message || 'unknown' };
        }
    };

    const deleteComment = async (commentId: string): Promise<{ error: string | null }> => {
        try {
            const { error } = await supabase.from('comment').delete().eq('id', commentId);
            if (error) throw error;
            return { error: null };
        } catch (err: any) {
            toast.error("Couldn't delete that comment.");
            return { error: err?.message || 'unknown' };
        }
    };

    const stableComments = useMemo(() => comments, [comments]);
    return { comments: stableComments, loading, addComment, deleteComment };
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
        // Optimistic update — set registered immediately, revert on error
        setIsRegistered(true);
        const { error } = await supabase.from('event_registration').insert({ event_id: eventId, user_id: user.id });
        if (error) setIsRegistered(false);
    };

    const unregister = async () => {
        if (!user || !eventId) return;
        // Optimistic update — set unregistered immediately, revert on error
        setIsRegistered(false);
        const { error } = await supabase.from('event_registration').delete().eq('event_id', eventId).eq('user_id', user.id);
        if (error) setIsRegistered(true);
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

        // Direct fetch bypasses Supabase JS client's internal session lock
        // which adds 10-20s overhead. Read token from localStorage directly.
        const supabaseUrl = import.meta.env.VITE_SUPABASE_DATABASE_URL;
        const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        let token: string | null = null;
        try {
            const raw = localStorage.getItem('param-makerspace-auth');
            if (raw) token = JSON.parse(raw)?.access_token;
        } catch { /* ignore */ }
        if (!token) return { data: null, error: 'No auth token' };

        const res = await fetch(`${supabaseUrl}/rest/v1/project?select=*`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': anonKey,
                'Authorization': `Bearer ${token}`,
                'Prefer': 'return=representation',
            },
            body: JSON.stringify({
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
            }),
        });

        if (!res.ok) {
            const err = await res.text();
            return { data: null, error: `Insert failed (${res.status}): ${err}` };
        }

        const rows = await res.json();
        return {
            data: (rows?.[0] ?? null) as Project | null,
            error: null,
        };
    };

    const updateProject = async (id: string, updates: Partial<Project>) => {
        const { error } = await supabase.from('project').update(updates).eq('id', id);
        // Patch cache in-place instead of invalidating for core fields
        // This preserves the cache and allows back-nav without spinner
        patchProjectCache(id, updates);
        return { error: error?.message || null };
    };

    const deleteProject = async (id: string) => {
        const { error } = await supabase.from('project').delete().eq('id', id).eq('status', 'draft');
        invalidateProjectCache(id);
        return { error: error?.message || null };
    };

    const submitForReview = async (id: string) => {
        const { error } = await supabase.from('project').update({ status: 'pending_review' }).eq('id', id);
        invalidateProjectCache(id);
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
        declared_intent?: string | null;
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
            supabase.from('event_host').delete().eq('event_id', id),
        ]);
        await supabase.from('event_team').delete().eq('event_id', id);
        const { error } = await supabase.from('event').delete().eq('id', id);
        return { error: error?.message || null };
    };

    return { createEvent, updateEvent, deleteEvent };
}

// ══════════════════════════════════════════════════════════════════
// ─── EVENT WEBSITES (Showcase) ───
// ══════════════════════════════════════════════════════════════════

/** Fetch all approved websites for an event (public showcase) */
export function useEventWebsites(eventId: string | undefined) {
    return useSupabaseQuery<(EventWebsite & { userName: string; avatarUrl: string | null })[]>(async () => {
        if (!eventId) return { data: [], error: null };

        // Single query with join for user name; avatar fetched separately to avoid inner-join filtering
        const { data, error } = await supabase
            .from('event_website')
            .select('id, event_id, user_id, title, description, html_content, file_url, thumbnail_url, host_names, status, created_at, updated_at, user:app_user!user_id(name)')
            .eq('event_id', eventId)
            .eq('status', 'approved')
            .order('created_at', { ascending: false });

        if (error || !data) return { data: [], error };

        // Batch fetch avatars in one query (left-join-safe)
        const userIds = [...new Set((data as any[]).map(d => d.user_id))];
        const avatarMap: Record<string, string | null> = {};
        if (userIds.length > 0) {
            const { data: profiles } = await supabase
                .from('maker_profile')
                .select('user_id, avatar_url')
                .in('user_id', userIds);
            (profiles || []).forEach((p: any) => { avatarMap[p.user_id] = p.avatar_url; });
        }

        const enriched = (data as any[]).map(w => ({
            ...w,
            userName: w.user?.name || 'Unknown',
            avatarUrl: avatarMap[w.user_id] || null,
        }));

        return { data: enriched, error: null };
    }, [eventId]);
}

/** Fetch the current user's website submission for an event */
export function useMyEventWebsite(eventId: string | undefined) {
    const { user } = useAuth();
    return useSupabaseQuery<EventWebsite | null>(async () => {
        if (!eventId || !user) return { data: null, error: null };
        const { data, error } = await supabase
            .from('event_website')
            .select('*')
            .eq('event_id', eventId)
            .eq('user_id', user.id)
            .maybeSingle();
        return { data: data as EventWebsite | null, error };
    }, [eventId, user?.id]);
}

/** Fetch ALL website submissions for an event (mentor review — includes pending) */
export function useEventWebsitesForReview(eventId?: string) {
    return useSupabaseQuery<(EventWebsite & { userName: string; userEmail: string })[]>(async () => {
        let q = supabase
            .from('event_website')
            .select('id, event_id, user_id, title, description, html_content, file_url, thumbnail_url, host_names, status, reviewed_by, reviewed_at, created_at, updated_at, user:app_user!user_id(name, email)')
            .order('created_at', { ascending: false });

        if (eventId) {
            q = q.eq('event_id', eventId);
        }

        const { data, error } = await q;
        if (error || !data) return { data: [], error };

        const enriched = (data as any[]).map(w => ({
            ...w,
            userName: w.user?.name || 'Unknown',
            userEmail: w.user?.email || '',
        }));

        return { data: enriched, error: null };
    }, [eventId]);
}

export function useEventWebsiteMutations() {
    const submitWebsite = async (data: {
        event_id: string;
        user_id: string;
        title: string;
        description?: string;
        html_content?: string;
        file_url?: string;
        thumbnail_url?: string;
        host_names?: string[];
    }) => {
        const { data: rows, error } = await supabase
            .from('event_website')
            .insert({
                ...data,
                host_names: data.host_names || [],
                status: 'pending',
            })
            .select();
        const website = rows?.[0] ?? null;
        return { data: website as EventWebsite | null, error: error?.message || null };
    };

    const updateWebsite = async (id: string, updates: Partial<EventWebsite>) => {
        const { error } = await supabase.from('event_website').update({
            ...updates,
            updated_at: new Date().toISOString(),
        }).eq('id', id);
        return { error: error?.message || null };
    };

    const deleteWebsite = async (id: string) => {
        const { error } = await supabase.from('event_website').delete().eq('id', id);
        return { error: error?.message || null };
    };

    const reviewWebsite = async (id: string, status: 'approved' | 'rejected', reviewerId: string) => {
        const { error } = await supabase.from('event_website').update({
            status,
            reviewed_by: reviewerId,
            reviewed_at: new Date().toISOString(),
        }).eq('id', id);
        return { error: error?.message || null };
    };

    return { submitWebsite, updateWebsite, deleteWebsite, reviewWebsite };
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
        // Delete referencing order items first (cascade is set at DB level too, but belt-and-suspenders)
        await supabase.from('store_order_item').delete().eq('product_id', id);
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
    const query = useSupabaseQuery<{ xp: number; rank: string; role: Role } | null>(async () => {
        if (!user) return { data: null, error: null };
        const { data, error } = await supabase
            .from('app_user')
            .select('xp, rank, role')
            .eq('id', user.id)
            .single();
        return { data: data as any, error };
    }, [user?.id]);

    // §7 F-306 — realtime subscription on app_user so XP / rank updates
    // from another tab or a server-side trigger (e.g. rank-up from
    // §15.5 notifications) propagate into the dashboard without a refetch.
    useEffect(() => {
        if (!user?.id) return;
        const channel = supabase
            .channel(`app_user_rank_${user.id}`)
            .on(
                'postgres_changes' as any,
                { event: 'UPDATE', schema: 'public', table: 'app_user', filter: `id=eq.${user.id}` },
                () => { query.refetch(); }
            )
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]);

    return query;
}

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

    // §7 F-306 — realtime subscription on xp_event inserts so the
    // "Recent Experience" list refreshes the instant a new award fires.
    useEffect(() => {
        if (!user?.id) return;
        const channel = supabase
            .channel(`xp_event_${user.id}`)
            .on(
                'postgres_changes' as any,
                { event: 'INSERT', schema: 'public', table: 'xp_event', filter: `user_id=eq.${user.id}` },
                () => { query.refetch(); }
            )
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]);

    return query;
}

// ─── REMIX MUTATION ───

export function useRemixProject() {
    const { user } = useAuth();

    const remix = useCallback(
        async (originId: string, newTitle: string) => {
            if (!user) {
                return { data: null, error: new Error('Not authenticated') };
            }
            if (!originId) {
                return { data: null, error: new Error('originId is required') };
            }

            try {
                // Fetch origin project to copy milestones and tags
                const { data: originData, error: originError } = await supabase
                    .from('project')
                    .select('id')
                    .eq('id', originId)
                    .single();

                if (originError || !originData) {
                    return { data: null, error: originError || new Error('Origin project not found') };
                }

                // Fetch milestones to copy
                const { data: milestonesData } = await supabase
                    .from('project_milestone')
                    .select('title, description, display_order')
                    .eq('project_id', originId);

                // Fetch entity_tag rows to copy
                const { data: entityTagsData } = await supabase
                    .from('entity_tag')
                    .select('tag_id')
                    .eq('target_type', 'project')
                    .eq('target_id', originId);

                // Insert new remix project
                const { data: newProject, error: insertError } = await supabase
                    .from('project')
                    .insert({
                        owner_id: user.id,
                        title: newTitle,
                        summary: '',
                        description: '',
                        remixed_from_id: originId,
                        status: 'draft',
                        visibility: 'private',
                    } as any)
                    .select('id')
                    .single();

                if (insertError || !newProject) {
                    return { data: null, error: insertError };
                }

                const newProjectId = newProject.id;

                // Copy milestones in batch
                if (milestonesData && milestonesData.length > 0) {
                    const milestonesToInsert = milestonesData.map((m: any) => ({
                        project_id: newProjectId,
                        title: m.title,
                        description: m.description,
                        display_order: m.display_order,
                        is_complete: false,
                    }));
                    await supabase.from('project_milestone').insert(milestonesToInsert);
                }

                // Copy entity_tags in batch
                if (entityTagsData && entityTagsData.length > 0) {
                    const tagsToInsert = entityTagsData.map((t: any) => ({
                        target_type: 'project' as const,
                        target_id: newProjectId,
                        tag_id: t.tag_id,
                    }));
                    await supabase.from('entity_tag').insert(tagsToInsert);
                }

                // TODO: Copy project_image, project_video, project_file on-demand later (copy-on-write)

                // Invalidate caches
                invalidateProjectCache();

                return { data: { id: newProjectId }, error: null };
            } catch (err: any) {
                return { data: null, error: err };
            }
        },
        [user],
    );

    return { remix };
}

// ─── SOCIAL LAYER: BOM, Makes, Pins, Merge Requests ───

export function useProjectBom(projectId: string | undefined) {
    return useSupabaseQuery<ProjectBomLine[]>(async (signal: AbortSignal) => {
        if (!projectId) return { data: null, error: null };
        const cached = projectBomCache.get(projectId);
        if (cached && Date.now() - cached.at < PROJECT_BOM_CACHE_TTL_MS) {
            return { data: cached.data, error: null };
        }
        const { data, error } = await supabase
            .from('project_bom_line')
            .select('*')
            .eq('project_id', projectId)
            .order('display_order', { ascending: true })
            .abortSignal(signal);
        if (!error && data) projectBomCache.set(projectId, { data, at: Date.now() });
        return { data, error };
    }, [projectId], {
        getInitialData: () => {
            if (!projectId) return null;
            const cached = projectBomCache.get(projectId);
            if (cached && Date.now() - cached.at < PROJECT_BOM_CACHE_TTL_MS) return cached.data;
            return null;
        },
    });
}

export function useProjectBomMutations() {
    const { user } = useAuth();
    const addLine = useCallback(async (projectId: string, line: Omit<ProjectBomLine, 'id' | 'created_at'>) => {
        const { data, error } = await supabase
            .from('project_bom_line')
            .insert([line])
            .select('*')
            .single();
        if (!error) invalidateProjectCache(projectId);
        return { data, error };
    }, []);

    const updateLine = useCallback(async (projectId: string, id: string, updates: Partial<ProjectBomLine>) => {
        const { data, error } = await supabase
            .from('project_bom_line')
            .update(updates)
            .eq('id', id)
            .select('*')
            .single();
        if (!error) invalidateProjectCache(projectId);
        return { data, error };
    }, []);

    const deleteLine = useCallback(async (projectId: string, id: string) => {
        const { error } = await supabase.from('project_bom_line').delete().eq('id', id);
        if (!error) invalidateProjectCache(projectId);
        return { error };
    }, []);

    const reorderLines = useCallback(async (projectId: string, lines: { id: string; display_order: number }[]) => {
        for (const line of lines) {
            await supabase.from('project_bom_line').update({ display_order: line.display_order }).eq('id', line.id);
        }
        invalidateProjectCache(projectId);
    }, []);

    return { addLine, updateLine, deleteLine, reorderLines };
}

export function useProjectMakes(projectId: string | undefined) {
    return useSupabaseQuery<(ProjectMake & { user_name: string; user_avatar_url: string | null })[]>(
        async (signal: AbortSignal) => {
            if (!projectId) return { data: null, error: null };
            const cached = projectMakesCache.get(projectId);
            if (cached && Date.now() - cached.at < PROJECT_BOM_CACHE_TTL_MS) {
                return { data: cached.data, error: null };
            }
            const { data, error } = await supabase
                .from('project_make')
                .select(`
                    id, project_id, user_id, image_url, caption, build_notes, created_at,
                    app_user!project_make_user_id_fkey ( name ),
                    maker_profile!project_make_user_id_fkey ( avatar_url )
                `)
                .eq('project_id', projectId)
                .order('created_at', { ascending: false })
                .abortSignal(signal);

            if (error) return { data: null, error };
            const enriched = (data || []).map((make: any) => ({
                ...make,
                user_name: make.app_user?.name || 'Unknown',
                user_avatar_url: make.maker_profile?.avatar_url || null,
            }));
            projectMakesCache.set(projectId, { data: enriched, at: Date.now() });
            return { data: enriched, error: null };
        },
        [projectId],
        {
            getInitialData: () => {
                if (!projectId) return null;
                const cached = projectMakesCache.get(projectId);
                if (cached && Date.now() - cached.at < PROJECT_BOM_CACHE_TTL_MS) return cached.data;
                return null;
            },
        }
    );
}

export function useProjectMakeMutations() {
    const { user } = useAuth();
    const createMake = useCallback(
        async (projectId: string, make: Omit<ProjectMake, 'id' | 'project_id' | 'user_id' | 'created_at'>) => {
            if (!projectId || !user) return { data: null, error: new Error('Missing projectId or user') };
            const { data, error } = await supabase
                .from('project_make')
                .insert([{ ...make, project_id: projectId, user_id: user.id }])
                .select('*')
                .single();
            if (!error) invalidateProjectCache(projectId);
            return { data, error };
        },
        [user]
    );
    return { createMake };
}

export function useProjectPins(
    projectId: string | undefined,
    targetType?: ProjectCommentPin['target_type'],
    targetId?: string
) {
    return useSupabaseQuery<(ProjectCommentPin & { comment?: Comment & { author_name: string } })[]>(
        async (signal: AbortSignal) => {
            if (!projectId) return { data: null, error: null };
            let q = supabase
                .from('project_comment_pin')
                .select(`
                    id, project_id, target_type, target_id, x_pct, y_pct, comment_id, created_at,
                    comment ( id, content, user_id, created_at, app_user!comment_user_id_fkey ( name ) )
                `)
                .eq('project_id', projectId);

            if (targetType) q = q.eq('target_type', targetType);
            if (targetId) q = q.eq('target_id', targetId);

            const { data, error } = await q.abortSignal(signal);
            if (error) return { data: null, error };

            const enriched = (data || []).map((pin: any) => ({
                ...pin,
                comment: pin.comment
                    ? {
                          ...pin.comment,
                          author_name: pin.comment.app_user?.name || 'Unknown',
                      }
                    : undefined,
            }));
            return { data: enriched, error: null };
        },
        [projectId, targetType, targetId]
    );
}

export function useProjectPinMutations() {
    const { user } = useAuth();
    const createPin = useCallback(
        async (params: {
            projectId: string;
            target_type: 'image' | 'log' | 'bom_row';
            target_id: string;
            x_pct?: number;
            y_pct?: number;
            body: string;
        }) => {
            if (!user) return { data: null, error: new Error('Not authenticated') };

            // First create comment
            const { data: commentData, error: commentError } = await supabase
                .from('comment')
                .insert([
                    {
                        target_type: 'project',
                        target_id: params.projectId,
                        user_id: user.id,
                        content: params.body,
                    },
                ])
                .select('*')
                .single();

            if (commentError || !commentData) return { data: null, error: commentError };

            // Then create pin
            const { data: pinData, error: pinError } = await supabase
                .from('project_comment_pin')
                .insert([
                    {
                        project_id: params.projectId,
                        target_type: params.target_type,
                        target_id: params.target_id,
                        x_pct: params.x_pct,
                        y_pct: params.y_pct,
                        comment_id: commentData.id,
                    },
                ])
                .select('*')
                .single();

            if (!pinError) invalidateProjectCache(params.projectId);
            return { data: pinData, error: pinError };
        },
        [user]
    );
    return { createPin };
}

export function useProjectMergeRequests(projectId: string | undefined) {
    return useSupabaseQuery<ProjectMergeRequest[]>(async (signal: AbortSignal) => {
        if (!projectId) return { data: null, error: null };
        const { data, error } = await supabase
            .from('project_merge_request')
            .select('*')
            .or(`target_project_id.eq.${projectId},source_project_id.eq.${projectId}`)
            .order('created_at', { ascending: false })
            .abortSignal(signal);
        return { data, error };
    }, [projectId]);
}

export function useMergeRequestMutations() {
    const { user } = useAuth();

    const create = useCallback(
        async (mr: Omit<ProjectMergeRequest, 'id' | 'created_at' | 'resolved_at'> & { submitter_id?: string }) => {
            const { data, error } = await supabase
                .from('project_merge_request')
                .insert([{ ...mr, submitter_id: user?.id || mr.submitter_id }])
                .select('*')
                .single();
            return { data, error };
        },
        [user]
    );

    const resolve = useCallback(async (id: string, status: 'accepted' | 'rejected' | 'withdrawn', targetProjectId?: string) => {
        const { data, error } = await supabase
            .from('project_merge_request')
            .update({ status, resolved_at: new Date().toISOString() })
            .eq('id', id)
            .select('*')
            .single();
        if (!error && targetProjectId) invalidateProjectCache(targetProjectId);
        return { data, error };
    }, []);

    return { create, resolve };
}
