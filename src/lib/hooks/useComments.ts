/**
 * Community hooks — reactions and comments with realtime.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../auth';
import { toast } from '../toast';
import { acquireSharedChannel } from './cache';
import { sendNotificationEmail } from '../notifications';
import type { ReactionType, TargetType, Comment } from '../database.types';

// ─── Reactions ───

export function useReaction(targetType: TargetType, targetId: string | undefined) {
    const { user } = useAuth();
    const [myReactions, setMyReactions] = useState<ReactionType[]>([]);
    const [counts, setCounts] = useState({ likes: 0, bookmarks: 0 });
    const hasFetchedOnce = useRef(false);

    const fetchReactions = useCallback(async () => {
        if (!targetId) return;

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
                sendNotificationEmail('new_reaction', {
                    target_type: targetType,
                    target_id: targetId,
                    reactor_id: user.id,
                    reaction_type: reactionType,
                });
            }
            fetchReactions().catch(() => {});
        } catch (err: any) {
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

    const stableCounts = useMemo(() => counts, [counts.likes, counts.bookmarks]);
    const stableMyReactions = useMemo(() => myReactions, [myReactions.join(',')]);

    return { counts: stableCounts, myReactions: stableMyReactions, toggle, refetch: fetchReactions };
}

// ─── Comments ───

export function useComments(targetType: TargetType, targetId: string | undefined) {
    const [comments, setComments] = useState<(Comment & { userName: string })[]>([]);
    const [loading, setLoading] = useState(true);
    const hasFetchedOnce = useRef(false);
    const { user } = useAuth();

    const fetchComments = useCallback(async () => {
        if (!targetId) return;
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
            const { data, error } = await supabase.from('comment').insert({
                target_type: targetType,
                target_id: targetId,
                user_id: user.id,
                content,
            }).select('*, app_user:app_user(name)').single();
            if (error) throw error;

            // Optimistically add the comment to local state immediately
            if (data) {
                const enriched = { ...(data as any), userName: (data as any).app_user?.name || user.name || 'You' };
                setComments((prev) =>
                    prev.some((c) => c.id === enriched.id) ? prev : [...prev, enriched],
                );
            }

            sendNotificationEmail('new_comment', {
                target_type: targetType,
                target_id: targetId,
                commenter_id: user.id,
                comment_content: content,
            });
            return { error: null };
        } catch (err: any) {
            const msg = String(err?.message || '').toLowerCase();
            if (msg.includes('rate') || msg.includes('too many') || err?.code === 'P0001') {
                toast.error("You're commenting too fast — wait a moment and try again.");
                return { error: 'rate_limited' };
            }
            toast.error("Couldn't post your comment.");
            return { error: err?.message || 'unknown' };
        }
    };

    const deleteComment = async (commentId: string): Promise<{ error: string | null }> => {
        // Optimistically remove the comment from local state immediately
        const prev = comments;
        setComments((c) => c.filter((x) => x.id !== commentId));
        try {
            const { error } = await supabase.from('comment').delete().eq('id', commentId);
            if (error) throw error;
            return { error: null };
        } catch (err: any) {
            // Rollback on failure
            setComments(prev);
            toast.error("Couldn't delete that comment.");
            return { error: err?.message || 'unknown' };
        }
    };

    const editComment = async (commentId: string, newContent: string): Promise<{ error: string | null }> => {
        if (!user) return { error: 'Not signed in' };
        // Optimistically update the comment in local state
        const prev = comments;
        const now = new Date().toISOString();
        setComments((c) =>
            c.map((x) => (x.id === commentId ? { ...x, content: newContent, updated_at: now } : x)),
        );
        try {
            const { data, error } = await supabase
                .from('comment')
                .update({ content: newContent, updated_at: now })
                .eq('id', commentId)
                .eq('user_id', user.id)
                .select()
                .single();
            if (error) throw error;
            if (!data) throw new Error('Update returned no rows — you may not have permission.');
            return { error: null };
        } catch (err: any) {
            // Rollback on failure
            setComments(prev);
            toast.error("Couldn't edit that comment.");
            return { error: err?.message || 'unknown' };
        }
    };

    return { comments, loading, addComment, deleteComment, editComment };
}
