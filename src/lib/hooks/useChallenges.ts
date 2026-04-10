/**
 * Challenge domain hooks — queries, bookmarks, completions, and mutations.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../auth';
import { toast } from '../toast';
import { useSupabaseQuery } from './cache';
import type { Challenge, ChallengeCompletion } from '../database.types';

// ─── List ───

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

// ─── Bookmarks ───

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

// ─── Completion Status ───

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

// ─── Detail ───

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
            .select(`
                id, title, tier, domain, time_estimate, cover_image_url, mystery, core_idea, mission, success_criteria, status, created_by, created_at, updated_at,
                challenge_step(step_text, display_order),
                challenge_material(name, display_order),
                challenge_skill(skill_name),
                challenge_vocabulary(term, definition),
                challenge_level(level_name, description),
                challenge_image(image_url, caption, display_order),
                challenge_video(title, video_url)
            `)
            .eq('id', id)
            .single();

        if (error || !challenge) return { data: null, error };

        const [tagsRes, likesRes, bookmarksRes] = await Promise.all([
            supabase.from('entity_tag').select('tag_id, tag:tag(name)').eq('target_type', 'challenge').eq('target_id', id),
            supabase.from('reaction').select('id', { count: 'exact', head: true }).eq('target_type', 'challenge').eq('target_id', id).eq('reaction_type', 'like'),
            supabase.from('reaction').select('id', { count: 'exact', head: true }).eq('target_type', 'challenge').eq('target_id', id).eq('reaction_type', 'bookmark'),
        ]);

        // Extract and sort joined data
        const steps = (Array.isArray((challenge as any).challenge_step) ? (challenge as any).challenge_step : []) as any[];
        steps.sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0));

        const materials = (Array.isArray((challenge as any).challenge_material) ? (challenge as any).challenge_material : []) as any[];
        materials.sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0));

        const images = (Array.isArray((challenge as any).challenge_image) ? (challenge as any).challenge_image : []) as any[];
        images.sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0));

        const videos = (Array.isArray((challenge as any).challenge_video) ? (challenge as any).challenge_video : []) as any[];
        videos.sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0));

        const enriched: ChallengeWithRelations = {
            ...challenge as Challenge,
            steps: steps.map((s: any) => s.step_text),
            materials: materials.map((m: any) => m.name),
            skills: (Array.isArray((challenge as any).challenge_skill) ? (challenge as any).challenge_skill : []).map((s: any) => s.skill_name),
            vocabulary: (Array.isArray((challenge as any).challenge_vocabulary) ? (challenge as any).challenge_vocabulary : []).map((v: any) => ({ term: v.term, definition: v.definition })),
            levels: (Array.isArray((challenge as any).challenge_level) ? (challenge as any).challenge_level : []).map((l: any) => ({ level_name: l.level_name, description: l.description })),
            tags: (tagsRes.data || []).map((t: any) => t.tag?.name).filter(Boolean),
            images,
            videos,
            reactionCounts: {
                likes: likesRes.count || 0,
                bookmarks: bookmarksRes.count || 0,
            },
        };

        return { data: enriched, error: null };
    }, [id]);
}

// ─── Single challenge completion ───

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
        }).select('id, challenge_id, user_id, status, evidence_url, notes, verified_by, created_at, updated_at').single();
        setCompletion(data as ChallengeCompletion | null);
    };

    return { completion, loading, markComplete };
}
