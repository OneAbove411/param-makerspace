import React, { useState } from 'react';
import { Heart, Trash2, MessageCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface Comment {
    id: string;
    user_id: string;
    userName?: string;
    content: string;
    created_at: string;
}

interface LogEntryProps {
    id: string;
    title: string;
    date?: string;
    author?: string;
    anchorId: string;
    description?: string;
    kind: 'overview' | 'milestone';
    images?: Array<{ image_url: string; caption?: string }>;
    comments?: Comment[];
    user?: { id: string; email?: string };
    onAddComment?: (text: string) => Promise<{ error?: any }>;
    onDeleteComment?: (commentId: string) => Promise<{ error?: any }>;
}

export function ProjectLogEntry({
    id,
    title,
    date,
    author,
    anchorId,
    description,
    kind,
    images,
    comments = [],
    user,
    onAddComment,
    onDeleteComment,
}: LogEntryProps) {
    const [commentText, setCommentText] = useState('');
    const [submittingComment, setSubmittingComment] = useState(false);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const MAX_COMMENT = 500;

    const handleComment = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = commentText.trim();
        if (!trimmed || trimmed.length > MAX_COMMENT || !onAddComment) return;
        setSubmittingComment(true);
        const { error } = await onAddComment(trimmed);
        setSubmittingComment(false);
        if (!error) setCommentText('');
    };

    const handleDelete = async (commentId: string) => {
        if (!onDeleteComment) return;
        const { error } = await onDeleteComment(commentId);
        if (!error) setConfirmDeleteId(null);
    };

    return (
        <div id={`entry-${anchorId}`} className="mb-16 scroll-mt-32">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-baseline gap-2 mb-2">
                    <h2 className="font-drama italic text-3xl md:text-4xl text-brutal-dark">
                        {title}
                    </h2>
                    <span className="text-sm text-brutal-dark/40 font-data uppercase tracking-wider">
                        #{anchorId}
                    </span>
                </div>
                {(author || date) && (
                    <div className="flex items-center gap-3 mt-3">
                        {author && (
                            <>
                                <div className="w-6 h-6 rounded-full bg-brutal-dark text-brutal-bg font-heading font-bold
                                                flex items-center justify-center text-xs flex-shrink-0">
                                    {author.charAt(0)}
                                </div>
                                <span className="font-data text-xs font-bold text-brutal-dark/60">
                                    {author}
                                </span>
                            </>
                        )}
                        {date && (
                            <>
                                {author && <span className="w-1 h-1 rounded-full bg-brutal-dark/20" />}
                                <span className="font-data text-xs text-brutal-dark/40">
                                    {date}
                                </span>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Description */}
            {description && (
                <div className="font-data text-base text-brutal-dark/75 leading-relaxed whitespace-pre-wrap mb-8">
                    {description}
                </div>
            )}

            {/* Images */}
            {images && images.length > 0 && (
                <div className="grid grid-cols-1 gap-4 mb-8">
                    {images.map((img, i) => (
                        <div key={i} className="rounded-2xl overflow-hidden border border-brutal-dark/10">
                            <img
                                src={img.image_url}
                                alt={img.caption || 'Log entry image'}
                                className="w-full h-auto object-cover"
                            />
                        </div>
                    ))}
                </div>
            )}

            {/* Inline Discussion */}
            {kind === 'overview' ? (
                <div className="mt-12 pt-8 border-t border-brutal-dark/10">
                    <h3 className="font-heading font-bold text-lg uppercase tracking-tight-heading mb-6">
                        Discussion ({comments.length})
                    </h3>

                    {/* Comment composer */}
                    {user ? (
                        <form onSubmit={handleComment} className="flex items-start gap-3 mb-8">
                            <div className="w-8 h-8 rounded-full bg-brutal-dark text-brutal-bg font-heading font-bold
                                            flex items-center justify-center text-xs flex-shrink-0 mt-0.5"
                                 aria-hidden="true">
                                {user.email?.charAt(0).toUpperCase() || '?'}
                            </div>
                            <div className="flex-1">
                                <label htmlFor="log-comment-input" className="sr-only">
                                    Write a comment
                                </label>
                                <input
                                    id="log-comment-input"
                                    type="text"
                                    value={commentText}
                                    maxLength={MAX_COMMENT}
                                    onChange={(e) => setCommentText(e.target.value)}
                                    placeholder="Add a comment..."
                                    className="w-full bg-transparent text-brutal-dark border-b-2 border-brutal-dark/10 px-0 py-2
                                               font-data text-sm placeholder:text-brutal-dark/30
                                               focus:outline-none focus:border-brutal-red/50 transition-all duration-300"
                                />
                                <div className="flex items-center justify-between mt-2">
                                    <span className="font-data text-[10px] font-bold tracking-widest uppercase
                                        ${commentText.length > MAX_COMMENT - 50 ? 'text-brutal-red' : 'text-brutal-dark/30'}">
                                        {commentText.length}/{MAX_COMMENT}
                                    </span>
                                    {commentText.trim() && (
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setCommentText('')}
                                                className="font-data text-xs font-bold uppercase tracking-wider text-brutal-dark/40
                                                           hover:text-brutal-dark transition-colors px-3 py-1.5 rounded"
                                            >
                                                Cancel
                                            </button>
                                            <Button
                                                type="submit"
                                                size="sm"
                                                disabled={submittingComment || commentText.trim().length === 0}
                                                className="px-4 py-1.5 text-xs"
                                            >
                                                {submittingComment ? 'Posting…' : 'Comment'}
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </form>
                    ) : (
                        <div className="flex items-center gap-3 mb-8 p-4 rounded-xl bg-brutal-dark/[0.03] border border-brutal-dark/8">
                            <div className="w-8 h-8 rounded-full bg-brutal-dark/10 flex items-center justify-center flex-shrink-0">
                                <span className="font-data text-xs text-brutal-dark/30">?</span>
                            </div>
                            <p className="font-data text-sm text-brutal-dark/50">
                                <a href="/login" className="text-brutal-red font-bold hover:underline">Log in</a>
                                {' '}to join the discussion.
                            </p>
                        </div>
                    )}

                    {/* Comments list */}
                    <div className="space-y-1">
                        {comments.map(c => {
                            const timeAgo = (() => {
                                const diff = Date.now() - new Date(c.created_at).getTime();
                                const mins = Math.floor(diff / 60000);
                                if (mins < 1) return 'just now';
                                if (mins < 60) return `${mins}m ago`;
                                const hrs = Math.floor(mins / 60);
                                if (hrs < 24) return `${hrs}h ago`;
                                const days = Math.floor(hrs / 24);
                                if (days < 7) return `${days}d ago`;
                                return new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                            })();

                            return (
                                <div key={c.id} className="flex items-start gap-3 py-3 group">
                                    <div className="w-8 h-8 rounded-full bg-brutal-dark text-brutal-bg font-heading font-bold
                                                    flex items-center justify-center text-xs flex-shrink-0">
                                        {c.userName?.charAt(0) || '?'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-data text-xs font-bold text-brutal-dark">
                                                {c.userName || 'Anonymous'}
                                            </span>
                                            <span className="font-data text-[10px] text-brutal-dark/30">
                                                {timeAgo}
                                            </span>
                                        </div>
                                        <p className="font-data text-sm text-brutal-dark/70 leading-relaxed mt-0.5">
                                            {c.content}
                                        </p>
                                        {user && c.user_id === user.id && (
                                            confirmDeleteId === c.id ? (
                                                <div className="mt-2 inline-flex items-center gap-2 rounded-lg border border-brutal-red/30 bg-brutal-red/5 p-2">
                                                    <span className="font-data text-[11px] font-bold text-brutal-dark">
                                                        Delete comment?
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setConfirmDeleteId(null)}
                                                        className="font-data text-[10px] font-bold uppercase tracking-wider text-brutal-dark/60
                                                                   hover:text-brutal-dark px-2 rounded"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDelete(c.id)}
                                                        className="font-data text-[10px] font-bold uppercase tracking-wider text-brutal-bg
                                                                   bg-brutal-red px-2 rounded"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => setConfirmDeleteId(c.id)}
                                                    className="inline-flex items-center gap-1 mt-1 font-data text-[10px] font-bold
                                                               text-brutal-dark/35 uppercase tracking-wider hover:text-brutal-red transition-colors px-2 rounded"
                                                >
                                                    <Trash2 size={11} aria-hidden="true" /> Delete
                                                </button>
                                            )
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        {comments.length === 0 && (
                            <p className="font-data text-sm text-brutal-dark/30 py-6 text-center">
                                No comments yet. Be the first to share your thoughts.
                            </p>
                        )}
                    </div>
                </div>
            ) : (
                <div className="mt-12 pt-8 border-t border-brutal-dark/10 text-center">
                    <p className="font-data text-sm text-brutal-dark/40">
                        Discussion coming soon
                    </p>
                </div>
            )}
        </div>
    );
}
