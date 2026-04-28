/**
 * Project domain hooks — queries and mutations for projects, BOM, makes, pins, merge requests.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../auth';
import { toast } from '../toast';
import {
    useSupabaseQuery,
    projectCache, PROJECT_CACHE_TTL_MS,
    projectListCache, projectListCacheKey, PROJECT_LIST_CACHE_TTL_MS,
    projectBomCache, projectMakesCache, PROJECT_BOM_CACHE_TTL_MS,
    invalidateProjectCache, patchProjectCache,
} from './cache';
import type {
    Project, ProjectImage, ProjectVideo, ProjectFile,
    ProjectBomLine, ProjectMake, ProjectCommentPin, ProjectMergeRequest,
    Comment,
} from '../database.types';

// ─── Types ───

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

// ─── List ───

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

        if (sortBy === 'oldest') {
            q = q.order('created_at', { ascending: true });
        } else {
            q = q.order('created_at', { ascending: false });
        }

        if (domainFilter && domainFilter !== 'All') {
            q = q.eq('domain', domainFilter);
        }

        q = q.limit(200);

        const { data: rows, error } = (await (q as any)) as { data: any[] | null; error: any };
        if (error) return { data: null, error };
        if (!rows || rows.length === 0) return { data: [], error: null };

        const ids = rows.map((r) => r.id);
        const ownerIds = Array.from(new Set(rows.map((r) => r.owner_id).filter(Boolean)));

        // Enrichment queries run in parallel with limits.
        const [reactionsRes, tagsRes, usersRes, profilesRes] = await Promise.all([
            supabase
                .from('reaction')
                .select('target_id, reaction_type')
                .eq('target_type', 'project')
                .in('target_id', ids)
                .limit(2000),
            supabase
                .from('entity_tag')
                .select('target_id, tag:tag(name)')
                .eq('target_type', 'project')
                .in('target_id', ids)
                .limit(500),
            ownerIds.length > 0
                ? supabase.from('app_user').select('id, name').in('id', ownerIds).limit(200)
                : Promise.resolve({ data: [], error: null } as any),
            ownerIds.length > 0
                ? supabase.from('maker_profile').select('user_id, avatar_url').in('user_id', ownerIds).limit(200)
                : Promise.resolve({ data: [], error: null } as any),
        ]);

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

        const enriched: ProjectListItem[] = rows.map((p: any) => {
            const imgs = Array.isArray(p.project_image) ? [...p.project_image] : [];
            imgs.sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0));
            const cover = imgs[0]?.image_url || null;
            const milestones = Array.isArray(p.project_milestone) ? p.project_milestone : [];
            const counts = reactionMap.get(p.id) || { likes: 0, bookmarks: 0 };

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

        if (sortBy === 'trending') {
            enriched.sort((a, b) => {
                if (b.likes !== a.likes) return b.likes - a.likes;
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            });
        }

        projectListCache.set(projectListCacheKey(domainFilter, sortBy), { data: enriched, at: Date.now() });
        return { data: enriched, error: null };
    }, [domainFilter, sortBy], {
        getInitialData: () => {
            const cached = projectListCache.get(projectListCacheKey(domainFilter, sortBy));
            if (cached && Date.now() - cached.at < PROJECT_LIST_CACHE_TTL_MS) return cached.data;
            return null;
        },
    });

    const refetchRef = useRef(query.refetch);
    useEffect(() => {
        refetchRef.current = query.refetch;
    }, [query.refetch]);

    // Real-time project inserts — debounced to prevent thundering herd.
    // Instead of refetching immediately on every INSERT (which at 10K users
    // would cause 10K simultaneous refetch queries), we debounce with a 5s
    // window. Multiple rapid inserts coalesce into a single refetch.
    // Only refetches if the new project would be visible (active + public).
    useEffect(() => {
        let cancelled = false;
        let debounceTimer: ReturnType<typeof setTimeout> | null = null;

        const channel = supabase
            .channel('projects_list_realtime')
            .on(
                'postgres_changes' as any,
                { event: 'INSERT', schema: 'public', table: 'project' },
                (payload: any) => {
                    if (cancelled) return;
                    // Only refetch for projects that would appear in the public list
                    const newRow = payload?.new;
                    if (newRow?.status !== 'active' || newRow?.visibility !== 'public') return;

                    // Debounce: coalesce rapid inserts into one refetch
                    if (debounceTimer) clearTimeout(debounceTimer);
                    debounceTimer = setTimeout(() => {
                        if (!cancelled) refetchRef.current();
                    }, 5000);
                }
            )
            .subscribe((status, err) => {
                if (status === 'CHANNEL_ERROR') {
                    console.warn('[realtime] projects_list_realtime subscription error:', err ?? 'unknown reason — ensure Realtime is enabled for the project table and RLS permits access');
                }
            });
        return () => {
            cancelled = true;
            if (debounceTimer) clearTimeout(debounceTimer);
            supabase.removeChannel(channel);
        };
    }, []);

    return query;
}

// ─── Bookmarks ───

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

// ─── My Projects ───

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

// ─── Detail ───

export function useProject(id: string | undefined) {
    return useSupabaseQuery<ProjectWithRelations | null>(async (signal: AbortSignal) => {
        if (!id) return { data: null, error: null };

        const cached = projectCache.get(id);
        if (cached && Date.now() - cached.at < PROJECT_CACHE_TTL_MS) {
            return { data: cached.data, error: null };
        }

        const { data: project, error } = await supabase
            .from('project')
            .select(`
                id, title, summary, description, domain, tier, github_url, duration, status, visibility, created_at, updated_at, owner_id, remixed_from_id, is_hardware,
                owner:app_user!owner_id(name),
                project_image(id, image_url, caption, display_order),
                project_video(id, title, video_url, display_order),
                project_file(id, file_url, file_name, file_size),
                project_milestone(id, title, description, is_complete, display_order),
                project_member(id, user_id, role, joined_at, app_user:app_user!user_id(name, email))
            `)
            .eq('id', id)
            .abortSignal(signal)
            .single();

        if (error || !project) return { data: null, error };

        // Use head:true counts instead of fetching every reaction row.
        // At scale, a popular project could have 10K+ reactions — we only need the count.
        const [tagsRes, likesRes, bookmarksRes] = await Promise.all([
            supabase.from('entity_tag').select('tag_id, tag:tag(name)').eq('target_type', 'project').eq('target_id', id).limit(30),
            supabase.from('reaction').select('id', { count: 'exact', head: true }).eq('target_type', 'project').eq('target_id', id).eq('reaction_type', 'like'),
            supabase.from('reaction').select('id', { count: 'exact', head: true }).eq('target_type', 'project').eq('target_id', id).eq('reaction_type', 'bookmark'),
        ]);

        const likes = likesRes.count ?? 0;
        const bookmarks = bookmarksRes.count ?? 0;

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

        // Extract and sort joined data
        const images = (Array.isArray((project as any).project_image) ? (project as any).project_image : []) as ProjectImage[];
        images.sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0));

        const videos = (Array.isArray((project as any).project_video) ? (project as any).project_video : []) as ProjectVideo[];
        videos.sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0));

        const milestones = (Array.isArray((project as any).project_milestone) ? (project as any).project_milestone : []);
        milestones.sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0));

        const enriched: ProjectWithRelations = {
            ...project as Project,
            images,
            videos,
            files: (Array.isArray((project as any).project_file) ? (project as any).project_file : []) as ProjectFile[],
            tags: (tagsRes.data || []).map((t: any) => t.tag?.name).filter(Boolean),
            reactionCounts: { likes, bookmarks },
            ownerName: (project as any).owner?.name || 'Unknown',
            milestones,
            members: (Array.isArray((project as any).project_member) ? (project as any).project_member : []).map((m: any) => ({
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
        getInitialData: () => {
            if (!id) return null;
            const cached = projectCache.get(id);
            if (cached && Date.now() - cached.at < PROJECT_CACHE_TTL_MS) return cached.data;
            return null;
        },
    });
}

// ─── Mutations ───

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

// ─── Images / Files ───

export function useProjectImageMutations() {
    const addImage = async (projectId: string, imageUrl: string, caption?: string, order?: number) => {
        const { data, error } = await supabase.from('project_image').insert({
            project_id: projectId,
            image_url: imageUrl,
            caption: caption || null,
            display_order: order || 0,
        }).select('id, project_id, image_url, caption, display_order, created_at').single();
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
        }).select('id, project_id, file_url, file_name, file_size, created_at').single();
        return { data: data as ProjectFile | null, error: error?.message || null };
    };

    const removeFile = async (fileId: string) => {
        const { error } = await supabase.from('project_file').delete().eq('id', fileId);
        return { error: error?.message || null };
    };

    return { addFile, removeFile };
}

// ─── Remix ───

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
                const { data: originData, error: originError } = await supabase
                    .from('project')
                    .select('id')
                    .eq('id', originId)
                    .single();

                if (originError || !originData) {
                    return { data: null, error: originError || new Error('Origin project not found') };
                }

                const { data: milestonesData } = await supabase
                    .from('project_milestone')
                    .select('title, description, display_order')
                    .eq('project_id', originId);

                const { data: entityTagsData } = await supabase
                    .from('entity_tag')
                    .select('tag_id')
                    .eq('target_type', 'project')
                    .eq('target_id', originId);

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

                if (entityTagsData && entityTagsData.length > 0) {
                    const tagsToInsert = entityTagsData.map((t: any) => ({
                        target_type: 'project' as const,
                        target_id: newProjectId,
                        tag_id: t.tag_id,
                    }));
                    await supabase.from('entity_tag').insert(tagsToInsert);
                }

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

// ─── BOM ───

export function useProjectBom(projectId: string | undefined) {
    return useSupabaseQuery<ProjectBomLine[]>(async (signal: AbortSignal) => {
        if (!projectId) return { data: null, error: null };
        const cached = projectBomCache.get(projectId);
        if (cached && Date.now() - cached.at < PROJECT_BOM_CACHE_TTL_MS) {
            return { data: cached.data, error: null };
        }
        const { data, error } = await supabase
            .from('project_bom_line')
            .select('id, project_id, reference, part, quantity, source_url, cost_cents, notes, image_url, display_order, created_at')
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
            .select('id, project_id, reference, part, quantity, source_url, cost_cents, notes, image_url, display_order, created_at')
            .single();
        if (!error) invalidateProjectCache(projectId);
        return { data, error };
    }, []);

    const updateLine = useCallback(async (projectId: string, id: string, updates: Partial<ProjectBomLine>) => {
        const { data, error } = await supabase
            .from('project_bom_line')
            .update(updates)
            .eq('id', id)
            .select('id, project_id, reference, part, quantity, source_url, cost_cents, notes, image_url, display_order, created_at')
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
        // allSettled: if one row update fails, the rest should still reorder
        await Promise.allSettled(
            lines.map((line) =>
                supabase.from('project_bom_line').update({ display_order: line.display_order }).eq('id', line.id)
            )
        );
        invalidateProjectCache(projectId);
    }, []);

    return { addLine, updateLine, deleteLine, reorderLines };
}

// ─── Makes ───

export function useProjectMakes(projectId: string | undefined) {
    return useSupabaseQuery<(ProjectMake & { user_name: string; user_avatar_url: string | null })[]>(
        async (signal: AbortSignal) => {
            if (!projectId) return { data: null, error: null };
            const cached = projectMakesCache.get(projectId);
            if (cached && Date.now() - cached.at < PROJECT_BOM_CACHE_TTL_MS) {
                return { data: cached.data, error: null };
            }
            // Fetch makes with owner name via FK embed. Avatar comes from
            // a separate query because maker_profile has no FK from
            // project_make (only app_user does), so PostgREST can't join it.
            const { data, error } = await supabase
                .from('project_make')
                .select(`
                    id, project_id, user_id, image_url, caption, build_notes, created_at,
                    app_user!project_make_user_id_fkey ( name )
                `)
                .eq('project_id', projectId)
                .order('created_at', { ascending: false })
                .abortSignal(signal);

            if (error) return { data: null, error };

            // Fetch avatars separately via user_id
            const userIds = Array.from(new Set((data || []).map((m: any) => m.user_id).filter(Boolean)));
            const avatarMap = new Map<string, string | null>();
            if (userIds.length > 0) {
                const { data: profiles } = await supabase
                    .from('maker_profile')
                    .select('user_id, avatar_url')
                    .in('user_id', userIds)
                    .limit(50);
                for (const p of (profiles || []) as any[]) {
                    avatarMap.set(p.user_id, p.avatar_url || null);
                }
            }

            const enriched = (data || []).map((make: any) => ({
                ...make,
                user_name: make.app_user?.name || 'Unknown',
                user_avatar_url: avatarMap.get(make.user_id) || null,
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
                .select('id, project_id, user_id, image_url, caption, build_notes, created_at')
                .single();
            if (!error) invalidateProjectCache(projectId);
            return { data, error };
        },
        [user]
    );
    return { createMake };
}

// ─── Pins ───

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
                .select('id, target_type, target_id, user_id, content, created_at, updated_at')
                .single();

            if (commentError || !commentData) return { data: null, error: commentError };

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
                .select('id, project_id, target_type, target_id, x_pct, y_pct, comment_id, created_at')
                .single();

            if (!pinError) invalidateProjectCache(params.projectId);
            return { data: pinData, error: pinError };
        },
        [user]
    );
    return { createPin };
}

// ─── Merge Requests ───

export function useProjectMergeRequests(projectId: string | undefined) {
    return useSupabaseQuery<ProjectMergeRequest[]>(async (signal: AbortSignal) => {
        if (!projectId) return { data: null, error: null };
        const { data, error } = await supabase
            .from('project_merge_request')
            .select('id, source_project_id, target_project_id, submitter_id, title, body, status, diff_snapshot, created_at, resolved_at')
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
                .select('id, source_project_id, target_project_id, submitter_id, title, body, status, diff_snapshot, created_at, resolved_at')
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
            .select('id, source_project_id, target_project_id, submitter_id, title, body, status, diff_snapshot, created_at, resolved_at')
            .single();
        if (!error && targetProjectId) invalidateProjectCache(targetProjectId);
        return { data, error };
    }, []);

    return { create, resolve };
}
