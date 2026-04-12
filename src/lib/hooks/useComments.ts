/**
 * Community hooks — reactions, comments (threaded), mentions, pinning, reporting.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../auth';
import { toast } from '../toast';
import { acquireSharedChannel } from './cache';
import { sendNotificationEmail } from '../notifications';
import type { ReactionType, TargetType, Comment } from '../database.types';

// ─── Reactions (target-level: project, event, challenge, maker_profile) ───

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

// ─── Enriched Comment Type ───

export interface EnrichedComment extends Comment {
    userName: string;
    replies: EnrichedComment[];
    likeCount: number;
    myLike: boolean;
}

export type CommentSortMode = 'oldest' | 'newest';

// ─── @mention parser ───

/** Extract @mentioned names from comment content. Returns unique lowercase names. */
// extractMentions removed — mention matching now done against actual DB usernames
// in addComment() for reliable multi-word name matching.

// ─── Comments (threaded) ───

export function useComments(targetType: TargetType, targetId: string | undefined) {
    const [flatComments, setFlatComments] = useState<(Comment & { userName: string })[]>([]);
    const [commentLikes, setCommentLikes] = useState<Record<string, { count: number; mine: boolean }>>({});
    const [loading, setLoading] = useState(true);
    const [sortMode, setSortMode] = useState<CommentSortMode>('oldest');
    const hasFetchedOnce = useRef(false);
    const { user } = useAuth();

    // Fetch all comments for this target (flat — we nest client-side)
    const fetchComments = useCallback(async () => {
        if (!targetId) return;
        if (!hasFetchedOnce.current) setLoading(true);
        const { data } = await supabase
            .from('comment')
            .select('*, app_user:app_user(name)')
            .eq('target_type', targetType)
            .eq('target_id', targetId)
            .order('created_at', { ascending: true });

        const comments = (data || []).map((c: any) => ({
            ...c,
            userName: c.app_user?.name || 'Unknown',
        }));
        setFlatComments(comments);
        hasFetchedOnce.current = true;
        setLoading(false);

        // Fetch like counts for all comments in this target
        if (comments.length > 0) {
            const commentIds = comments.map((c: any) => c.id);
            const { data: likes } = await supabase
                .from('reaction')
                .select('target_id, user_id')
                .eq('target_type', 'comment')
                .eq('reaction_type', 'like')
                .in('target_id', commentIds);

            const likesMap: Record<string, { count: number; mine: boolean }> = {};
            for (const cid of commentIds) {
                likesMap[cid] = { count: 0, mine: false };
            }
            for (const l of (likes || []) as { target_id: string; user_id: string }[]) {
                if (!likesMap[l.target_id]) likesMap[l.target_id] = { count: 0, mine: false };
                likesMap[l.target_id].count++;
                if (user && l.user_id === user.id) likesMap[l.target_id].mine = true;
            }
            setCommentLikes(likesMap);
        }
    }, [targetType, targetId, user?.id]);

    useEffect(() => { fetchComments(); }, [fetchComments]);

    // Realtime subscriptions
    useEffect(() => {
        if (!targetId) return;
        const release = acquireSharedChannel(targetType, targetId, (payload, table) => {
            if (table !== 'comment') return;
            if (payload.eventType === 'DELETE') {
                const gone = payload.old as any;
                setFlatComments((prev) => prev.filter((c) => c.id !== gone?.id));
            } else if (payload.eventType === 'UPDATE') {
                const row = payload.new as any;
                setFlatComments((prev) => prev.map((c) => (c.id === row.id ? { ...c, ...row } : c)));
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
                        setFlatComments((prev) =>
                            prev.some((c) => c.id === enriched.id) ? prev : [...prev, enriched],
                        );
                    });
            }
        });
        return release;
    }, [targetType, targetId]);

    // Build threaded tree from flat comments
    const threadedComments = useMemo((): EnrichedComment[] => {
        const map = new Map<string, EnrichedComment>();
        const roots: EnrichedComment[] = [];

        // Create enriched nodes
        for (const c of flatComments) {
            map.set(c.id, {
                ...c,
                replies: [],
                likeCount: commentLikes[c.id]?.count || 0,
                myLike: commentLikes[c.id]?.mine || false,
            });
        }

        // Link parents
        for (const c of flatComments) {
            const node = map.get(c.id)!;
            if (c.parent_id && map.has(c.parent_id)) {
                map.get(c.parent_id)!.replies.push(node);
            } else {
                roots.push(node);
            }
        }

        // Sort roots: pinned first, then by sort mode
        const sorted = roots.sort((a, b) => {
            if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
            const dir = sortMode === 'newest' ? -1 : 1;
            return dir * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        });

        // Replies always oldest-first
        for (const node of map.values()) {
            node.replies.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        }

        return sorted;
    }, [flatComments, commentLikes, sortMode]);

    // ─── Add comment (top-level or reply) ───
    const addComment = async (content: string, parentId?: string): Promise<{ error: string | null }> => {
        if (!user || !targetId) return { error: 'Not signed in' };
        try {
            const { data, error } = await supabase.from('comment').insert({
                target_type: targetType,
                target_id: targetId,
                user_id: user.id,
                parent_id: parentId || null,
                content,
            }).select('*, app_user:app_user(name)').single();
            if (error) throw error;

            if (data) {
                const enriched = { ...(data as any), userName: (data as any).app_user?.name || user.name || 'You' };
                setFlatComments((prev) =>
                    prev.some((c) => c.id === enriched.id) ? prev : [...prev, enriched],
                );
            }

            // ── Deduplicated notification dispatch ──
            // Track which user IDs have been notified so nobody gets
            // multiple emails from the same comment (e.g. mentioned +
            // replied-to + target owner).
            const notifiedUserIds = new Set<string>();

            // 1. Process @mentions — match against actual usernames from DB
            if (content.includes('@') && data) {
                const { data: allUsers } = await supabase
                    .from('app_user')
                    .select('id, name');

                const lowerContent = content.toLowerCase();
                const matched = (allUsers || [])
                    .filter((u: any) => u.id !== user.id && u.name)
                    .sort((a: any, b: any) => b.name.length - a.name.length)
                    .filter((u: any) => lowerContent.includes('@' + u.name.toLowerCase()));

                if (matched.length > 0) {
                    await supabase.from('comment_mention').insert(
                        matched.map((u: any) => ({ comment_id: data.id, user_id: u.id }))
                    );
                    for (const u of matched) {
                        notifiedUserIds.add(u.id);
                        sendNotificationEmail('comment_mention', {
                            target_type: targetType,
                            target_id: targetId,
                            mentioner_id: user.id,
                            mentioned_user_id: u.id,
                            comment_content: content,
                        });
                    }
                }
            }

            // 2. Reply notification (skip if parent author was already mentioned)
            if (parentId) {
                const parentComment = flatComments.find(c => c.id === parentId);
                if (parentComment && parentComment.user_id !== user.id && !notifiedUserIds.has(parentComment.user_id)) {
                    notifiedUserIds.add(parentComment.user_id);
                    sendNotificationEmail('comment_reply', {
                        target_type: targetType,
                        target_id: targetId,
                        replier_id: user.id,
                        parent_comment_user_id: parentComment.user_id,
                        comment_content: content,
                    });
                }
            }

            // 3. New top-level comment notification to target owner
            //    (skip if owner was already notified via mention or reply)
            if (!parentId) {
                sendNotificationEmail('new_comment', {
                    target_type: targetType,
                    target_id: targetId,
                    commenter_id: user.id,
                    comment_content: content,
                    // Pass notified set so Edge Function can skip if owner already got an email
                    already_notified_ids: Array.from(notifiedUserIds),
                });
            }

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

    // ─── Edit comment ───
    const editComment = async (commentId: string, newContent: string): Promise<{ error: string | null }> => {
        if (!user) return { error: 'Not signed in' };
        const prev = flatComments;
        const now = new Date().toISOString();
        setFlatComments((c) =>
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
            setFlatComments(prev);
            toast.error("Couldn't edit that comment.");
            return { error: err?.message || 'unknown' };
        }
    };

    // ─── Delete comment ───
    const deleteComment = async (commentId: string): Promise<{ error: string | null }> => {
        const prev = flatComments;
        // Remove the comment and all its replies (cascade happens in DB, but optimistic in UI)
        const idsToRemove = new Set<string>();
        const collectChildren = (id: string) => {
            idsToRemove.add(id);
            for (const c of flatComments) {
                if (c.parent_id === id) collectChildren(c.id);
            }
        };
        collectChildren(commentId);
        setFlatComments((c) => c.filter((x) => !idsToRemove.has(x.id)));
        try {
            const { error } = await supabase.from('comment').delete().eq('id', commentId);
            if (error) throw error;
            return { error: null };
        } catch (err: any) {
            setFlatComments(prev);
            toast.error("Couldn't delete that comment.");
            return { error: err?.message || 'unknown' };
        }
    };

    // ─── Toggle like on a comment ───
    const toggleCommentLike = async (commentId: string) => {
        if (!user) return;
        const current = commentLikes[commentId] || { count: 0, mine: false };
        const isRemoving = current.mine;

        // Optimistic
        setCommentLikes(prev => ({
            ...prev,
            [commentId]: {
                count: current.count + (isRemoving ? -1 : 1),
                mine: !isRemoving,
            },
        }));

        try {
            if (isRemoving) {
                const { error } = await supabase.from('reaction').delete()
                    .eq('target_type', 'comment')
                    .eq('target_id', commentId)
                    .eq('user_id', user.id)
                    .eq('reaction_type', 'like');
                if (error) throw error;
            } else {
                const { error } = await supabase.from('reaction').insert({
                    target_type: 'comment' as any,
                    target_id: commentId,
                    user_id: user.id,
                    reaction_type: 'like',
                });
                if (error) throw error;
            }
        } catch {
            // Rollback
            setCommentLikes(prev => ({ ...prev, [commentId]: current }));
            toast.error("Couldn't update your reaction.");
        }
    };

    // ─── Pin/unpin a comment (owner or admin) ───
    const togglePin = async (commentId: string): Promise<{ error: string | null }> => {
        const comment = flatComments.find(c => c.id === commentId);
        if (!comment) return { error: 'Comment not found' };
        const newPinned = !comment.is_pinned;

        setFlatComments(prev => prev.map(c => c.id === commentId ? { ...c, is_pinned: newPinned } : c));
        try {
            const { error } = await supabase
                .from('comment')
                .update({ is_pinned: newPinned })
                .eq('id', commentId);
            if (error) throw error;
            toast.success(newPinned ? 'Comment pinned' : 'Comment unpinned');
            return { error: null };
        } catch (err: any) {
            setFlatComments(prev => prev.map(c => c.id === commentId ? { ...c, is_pinned: !newPinned } : c));
            toast.error("Couldn't pin that comment.");
            return { error: err?.message || 'unknown' };
        }
    };

    // ─── Report a comment ───
    const reportComment = async (commentId: string, reason: string, details?: string): Promise<{ error: string | null }> => {
        if (!user) return { error: 'Not signed in' };
        try {
            const { error } = await supabase.from('comment_report').insert({
                comment_id: commentId,
                reporter_id: user.id,
                reason: reason as 'spam' | 'harassment' | 'inappropriate' | 'other',
                details: details || null,
            });
            if (error) {
                if (error.code === '23505') {
                    toast.info("You've already reported this comment.");
                    return { error: 'already_reported' };
                }
                throw error;
            }
            toast.success('Comment reported — thanks for keeping the community safe.');
            return { error: null };
        } catch (err: any) {
            toast.error("Couldn't report that comment.");
            return { error: err?.message || 'unknown' };
        }
    };

    return {
        comments: threadedComments,
        totalCount: flatComments.length,
        loading,
        sortMode,
        setSortMode,
        addComment,
        editComment,
        deleteComment,
        toggleCommentLike,
        togglePin,
        reportComment,
    };
}