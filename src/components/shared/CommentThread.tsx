/**
 * CommentThread — shared threaded discussion component.
 *
 * Features:
 *  - Threaded replies (one level deep, YouTube-style)
 *  - Like on individual comments
 *  - @mentions (type @name)
 *  - Pin/unpin (owner or admin)
 *  - Edit/delete (comment author)
 *  - Report (any logged-in user)
 *  - Sort toggle (oldest / newest)
 *  - (edited) indicator
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router';
import {
    MoreHorizontal,
    Pencil,
    Trash2,
    Pin,
    Flag,
    Heart,
    MessageCircle,
    ChevronDown,
    ChevronUp,
    Send,
    ArrowDownUp,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { EnrichedComment, CommentSortMode } from '../../lib/hooks/useComments';

// ─── Types ───

interface CommentThreadProps {
    comments: EnrichedComment[];
    totalCount: number;
    loading: boolean;
    user: any;
    sortMode: CommentSortMode;
    setSortMode: (mode: CommentSortMode) => void;
    addComment: (content: string, parentId?: string) => Promise<{ error: string | null }>;
    editComment: (commentId: string, newContent: string) => Promise<{ error: string | null }>;
    deleteComment: (commentId: string) => Promise<{ error: string | null }>;
    toggleCommentLike: (commentId: string) => void;
    togglePin: (commentId: string) => Promise<{ error: string | null }>;
    reportComment: (commentId: string, reason: string, details?: string) => Promise<{ error: string | null }>;
    /** Is current user the owner of this target (project owner, event creator, etc.)? */
    isTargetOwner?: boolean;
    /** Max character length for comments */
    maxLength?: number;
}

// ─── Helpers ───

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d`;
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Render comment content with @mentions highlighted.
 *  Splits on @word sequences (handles multi-word names like "@Hari S Kumar"). */
function renderContent(content: string) {
    // Match @followed-by-word-characters, allowing spaces between words
    // Stop at double-space, newline, or common punctuation that isn't part of a name
    const parts = content.split(/(@\w+(?:\s\w+)*)/g);
    return parts.map((part, i) =>
        part.startsWith('@') ? (
            <span key={i} className="text-brutal-red font-bold">{part}</span>
        ) : (
            <span key={i}>{part}</span>
        )
    );
}

// ─── Mention Input (YouTube-style autocomplete) ───

/** Cached user list for mention suggestions — shared across all MentionInput instances. */
let cachedUsers: { id: string; name: string }[] | null = null;
let cachePromise: Promise<void> | null = null;

function ensureUsersLoaded(): Promise<void> {
    if (cachedUsers) return Promise.resolve();
    if (cachePromise) return cachePromise;
    cachePromise = (async () => {
        try {
            const { data } = await supabase.from('app_user').select('id, name');
            cachedUsers = data || [];
        } catch {
            cachedUsers = [];
        }
    })();
    return cachePromise;
}

interface MentionInputProps {
    value: string;
    onChange: (value: string) => void;
    onSubmit: () => void;
    onCancel?: () => void;
    placeholder: string;
    maxLength: number;
    autoFocus?: boolean;
    className?: string;
    currentUserId?: string;
}

function MentionInput({ value, onChange, onSubmit, onCancel, placeholder, maxLength, autoFocus, className, currentUserId }: MentionInputProps) {
    const [suggestions, setSuggestions] = useState<{ id: string; name: string }[]>([]);
    const [selectedIdx, setSelectedIdx] = useState(0);
    const [mentionQuery, setMentionQuery] = useState<{ start: number; query: string } | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const hasAutoFocused = useRef(false);

    // Load users on mount
    useEffect(() => { ensureUsersLoaded(); }, []);

    // Auto-place cursor at end when value is prefilled with @mention (e.g. reply)
    useEffect(() => {
        if (autoFocus && !hasAutoFocused.current && inputRef.current && value) {
            hasAutoFocused.current = true;
            const el = inputRef.current;
            setTimeout(() => {
                el.focus();
                el.setSelectionRange(value.length, value.length);
            }, 0);
        }
    }, [autoFocus, value]);

    const updateSuggestions = useCallback((text: string, cursorPos: number) => {
        // Find the last @ before cursor that doesn't have a space before the @
        // (or is at position 0)
        const before = text.slice(0, cursorPos);
        const atIdx = before.lastIndexOf('@');
        if (atIdx === -1 || (atIdx > 0 && before[atIdx - 1] !== ' ' && before[atIdx - 1] !== '\n')) {
            setSuggestions([]);
            setMentionQuery(null);
            return;
        }

        const query = before.slice(atIdx + 1).toLowerCase();
        // Don't show suggestions if there's a space followed by another space (mention completed)
        if (query.includes('  ')) {
            setSuggestions([]);
            setMentionQuery(null);
            return;
        }

        if (!cachedUsers || query.length === 0) {
            setSuggestions([]);
            setMentionQuery(query.length === 0 ? { start: atIdx, query: '' } : null);
            return;
        }

        const filtered = cachedUsers
            .filter(u => u.id !== currentUserId && u.name.toLowerCase().includes(query))
            .slice(0, 6);

        setSuggestions(filtered);
        setMentionQuery({ start: atIdx, query });
        setSelectedIdx(0);
    }, [currentUserId]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        onChange(newValue);
        updateSuggestions(newValue, e.target.selectionStart || newValue.length);
    };

    const insertMention = (userName: string) => {
        if (!mentionQuery) return;
        const before = value.slice(0, mentionQuery.start);
        const after = value.slice(mentionQuery.start + 1 + mentionQuery.query.length);
        const newValue = before + '@' + userName + ' ' + after;
        onChange(newValue);
        setSuggestions([]);
        setMentionQuery(null);
        // Re-focus input and place cursor after the mention
        setTimeout(() => {
            if (inputRef.current) {
                inputRef.current.focus();
                const cursorPos = before.length + userName.length + 2;
                inputRef.current.setSelectionRange(cursorPos, cursorPos);
            }
        }, 0);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (suggestions.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIdx(i => (i + 1) % suggestions.length);
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIdx(i => (i - 1 + suggestions.length) % suggestions.length);
                return;
            }
            if (e.key === 'Tab' || e.key === 'Enter') {
                e.preventDefault();
                insertMention(suggestions[selectedIdx].name);
                return;
            }
            if (e.key === 'Escape') {
                setSuggestions([]);
                setMentionQuery(null);
                return;
            }
        }
        if (e.key === 'Enter' && value.trim()) { e.preventDefault(); onSubmit(); }
        if (e.key === 'Escape' && onCancel) onCancel();
    };

    // Check if value contains any @mentions (for the overlay)
    const hasMentions = /@\w+/.test(value);

    // Render highlight overlay — shows @mentions in red over the input text
    const renderHighlight = () => {
        const parts = value.split(/(@\w+(?:\s\w+)*)/g);
        return parts.map((part, i) =>
            part.startsWith('@') ? (
                <span key={i} className="text-brutal-red font-bold">{part}</span>
            ) : (
                <span key={i} style={{ visibility: 'hidden' }}>{part || '\u200b'}</span>
            )
        );
    };

    return (
        <div className="relative">
            {/* Highlight overlay — shows @mentions in red */}
            {hasMentions && (
                <div
                    aria-hidden
                    className={`${className || ''} absolute inset-0 pointer-events-none whitespace-pre overflow-hidden`}
                    style={{ color: 'transparent', background: 'transparent', borderColor: 'transparent' }}
                >
                    {renderHighlight()}
                </div>
            )}
            <input
                ref={inputRef}
                type="text"
                value={value}
                maxLength={maxLength}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onClick={(e) => updateSuggestions(value, (e.target as HTMLInputElement).selectionStart || value.length)}
                placeholder={placeholder}
                className={className}
                autoFocus={autoFocus && !value}
            />
            {/* Mention autocomplete dropdown */}
            {suggestions.length > 0 && (
                <div
                    ref={dropdownRef}
                    className="absolute left-0 bottom-full mb-1 w-56 max-h-48 overflow-y-auto bg-brutal-bg border-2 border-brutal-dark/10 rounded-xl shadow-xl z-50"
                >
                    {suggestions.map((u, i) => (
                        <button
                            key={u.id}
                            onMouseDown={(e) => { e.preventDefault(); insertMention(u.name); }}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 text-left font-data text-[11px] transition-colors ${
                                i === selectedIdx
                                    ? 'bg-brutal-red/10 text-brutal-dark'
                                    : 'text-brutal-dark/70 hover:bg-brutal-dark/5'
                            }`}
                        >
                            <span className="w-5 h-5 rounded-full bg-brutal-dark text-brutal-bg font-heading font-bold flex items-center justify-center text-[8px] flex-shrink-0">
                                {u.name.charAt(0).toUpperCase()}
                            </span>
                            <span className="truncate font-bold">{u.name}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Report Modal ───

function ReportModal({ onSubmit, onClose }: { onSubmit: (reason: string, details?: string) => void; onClose: () => void }) {
    const [reason, setReason] = useState('');
    const [details, setDetails] = useState('');
    const reasons = [
        { value: 'spam', label: 'Spam' },
        { value: 'harassment', label: 'Harassment' },
        { value: 'inappropriate', label: 'Inappropriate content' },
        { value: 'other', label: 'Other' },
    ];
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brutal-dark/30 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-xl border-2 border-brutal-dark/10 p-5 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
                <h3 className="font-heading text-sm font-bold mb-3">Report Comment</h3>
                <div className="space-y-2 mb-3">
                    {reasons.map(r => (
                        <label key={r.value} className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="reason" value={r.value} checked={reason === r.value} onChange={() => setReason(r.value)} className="accent-brutal-red" />
                            <span className="font-data text-xs">{r.label}</span>
                        </label>
                    ))}
                </div>
                {reason === 'other' && (
                    <textarea
                        value={details}
                        onChange={e => setDetails(e.target.value)}
                        placeholder="Please describe the issue..."
                        className="w-full border border-brutal-dark/20 rounded-lg p-2 font-data text-xs mb-3 focus:outline-none focus:border-brutal-red/50 resize-none"
                        rows={3}
                    />
                )}
                <div className="flex gap-2 justify-end">
                    <button onClick={onClose} className="font-data text-[10px] font-bold uppercase tracking-wider text-brutal-dark/40 hover:text-brutal-dark px-3 py-1.5">Cancel</button>
                    <button
                        onClick={() => { if (reason) onSubmit(reason, details || undefined); }}
                        disabled={!reason}
                        className="font-data text-[10px] font-bold uppercase tracking-wider bg-brutal-red text-brutal-bg px-4 py-1.5 rounded-lg disabled:opacity-50 hover:bg-brutal-dark transition-colors"
                    >
                        Report
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Single Comment ───

interface SingleCommentProps {
    comment: EnrichedComment;
    user: any;
    isTargetOwner: boolean;
    depth: number;
    onReply: (commentId: string, userName: string) => void;
    onEdit: (comment: EnrichedComment) => void;
    onDelete: (commentId: string) => void;
    onLike: (commentId: string) => void;
    onPin: (commentId: string) => void;
    onReport: (commentId: string) => void;
    editingId: string | null;
    editText: string;
    setEditText: (text: string) => void;
    onEditSubmit: (commentId: string) => void;
    onEditCancel: () => void;
    replyingTo: string | null;
    replyText: string;
    setReplyText: (text: string) => void;
    onReplySubmit: (parentId: string) => void;
    onReplyCancel: () => void;
    maxLength: number;
}

function SingleComment({
    comment: c, user, isTargetOwner, depth,
    onReply, onEdit, onDelete, onLike, onPin, onReport,
    editingId, editText, setEditText, onEditSubmit, onEditCancel,
    replyingTo, replyText, setReplyText, onReplySubmit, onReplyCancel,
    maxLength,
}: SingleCommentProps) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [showReplies, setShowReplies] = useState(true);
    const menuRef = useRef<HTMLDivElement>(null);

    const isOwner = user && c.user_id === user.id;
    const isEdited = c.updated_at && c.created_at && c.updated_at !== c.created_at;
    const canPin = isTargetOwner || (user && ['admin', 'mentor'].includes(user.role || ''));

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
        };
        if (menuOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [menuOpen]);

    return (
        <div className={depth > 0 ? 'ml-8 border-l-2 border-brutal-dark/5 pl-4' : ''}>
            <div className="py-3 group">
                <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="w-7 h-7 rounded-full bg-brutal-dark text-brutal-bg font-heading font-bold flex items-center justify-center text-[10px] flex-shrink-0">
                        {c.userName?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                        {/* Header: name, time, badges */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-data text-[11px] font-bold text-brutal-dark">{c.userName || 'Anonymous'}</span>
                            <span className="font-data text-[10px] text-brutal-dark/30">{timeAgo(c.created_at)}</span>
                            {isEdited && <span className="font-data text-[9px] italic text-brutal-dark/25">(edited)</span>}
                            {c.is_pinned && (
                                <span className="inline-flex items-center gap-0.5 font-data text-[9px] font-bold text-brutal-red/70 bg-brutal-red/5 px-1.5 py-0.5 rounded">
                                    <Pin className="w-2.5 h-2.5" /> Pinned
                                </span>
                            )}
                        </div>

                        {/* Content or edit form */}
                        {editingId === c.id ? (
                            <div className="mt-1.5 space-y-2">
                                <input
                                    type="text"
                                    value={editText}
                                    maxLength={maxLength}
                                    onChange={e => setEditText(e.target.value)}
                                    className="w-full bg-white border-b-2 border-brutal-dark/20 px-0 py-1.5 font-data text-[12px] text-brutal-dark focus:outline-none focus:border-brutal-red/50 transition-colors"
                                    autoFocus
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') { e.preventDefault(); onEditSubmit(c.id); }
                                        if (e.key === 'Escape') onEditCancel();
                                    }}
                                />
                                <div className="flex items-center gap-2 justify-end">
                                    <button onClick={onEditCancel} className="font-data text-[10px] font-bold uppercase tracking-wider text-brutal-dark/40 hover:text-brutal-dark px-2 py-1">Cancel</button>
                                    <button
                                        onClick={() => onEditSubmit(c.id)}
                                        disabled={!editText.trim()}
                                        className="font-data text-[10px] font-bold uppercase tracking-wider bg-brutal-red text-brutal-bg px-3 py-1 rounded disabled:opacity-50 hover:bg-brutal-dark transition-colors"
                                    >Save</button>
                                </div>
                            </div>
                        ) : (
                            <p className="font-data text-[12px] text-brutal-dark/75 leading-relaxed mt-0.5 whitespace-pre-wrap">
                                {renderContent(c.content)}
                            </p>
                        )}

                        {/* Action bar: like, reply, menu */}
                        {editingId !== c.id && (
                            <div className="flex items-center gap-3 mt-1.5">
                                {/* Like */}
                                <button
                                    onClick={() => onLike(c.id)}
                                    disabled={!user}
                                    className={`flex items-center gap-1 font-data text-[10px] transition-colors ${
                                        c.myLike ? 'text-brutal-red font-bold' : 'text-brutal-dark/30 hover:text-brutal-red'
                                    } ${!user ? 'opacity-30 cursor-not-allowed' : ''}`}
                                >
                                    <Heart className={`w-3 h-3 ${c.myLike ? 'fill-brutal-red' : ''}`} />
                                    {c.likeCount > 0 && c.likeCount}
                                </button>

                                {/* Reply */}
                                {user && depth === 0 && (
                                    <button
                                        onClick={() => onReply(c.id, c.userName)}
                                        className="flex items-center gap-1 font-data text-[10px] text-brutal-dark/30 hover:text-brutal-dark transition-colors"
                                    >
                                        <MessageCircle className="w-3 h-3" /> Reply
                                    </button>
                                )}

                                {/* Three-dot menu */}
                                {user && (
                                    <div className="relative ml-auto opacity-0 group-hover:opacity-100 transition-opacity" ref={menuOpen ? menuRef : null}>
                                        <button
                                            onClick={() => setMenuOpen(!menuOpen)}
                                            className="flex items-center px-1.5 py-0.5 rounded hover:bg-brutal-dark/5 transition-colors text-brutal-dark/30 hover:text-brutal-dark/60"
                                        >
                                            <MoreHorizontal className="w-4 h-4" />
                                        </button>
                                        {menuOpen && (
                                            <div className="absolute right-0 top-full mt-1 z-20 bg-white border-2 border-brutal-dark/10 rounded-lg shadow-lg py-1 min-w-[140px]">
                                                {isOwner && (
                                                    <button onClick={() => { onEdit(c); setMenuOpen(false); }}
                                                        className="w-full flex items-center gap-2.5 px-3 py-2 text-left font-data text-[11px] text-brutal-dark/70 hover:bg-brutal-dark/5 transition-colors">
                                                        <Pencil className="w-3 h-3" /> Edit
                                                    </button>
                                                )}
                                                {isOwner && (
                                                    <button onClick={() => { onDelete(c.id); setMenuOpen(false); }}
                                                        className="w-full flex items-center gap-2.5 px-3 py-2 text-left font-data text-[11px] text-brutal-red hover:bg-brutal-red/5 transition-colors">
                                                        <Trash2 className="w-3 h-3" /> Delete
                                                    </button>
                                                )}
                                                {canPin && depth === 0 && (
                                                    <button onClick={() => { onPin(c.id); setMenuOpen(false); }}
                                                        className="w-full flex items-center gap-2.5 px-3 py-2 text-left font-data text-[11px] text-brutal-dark/70 hover:bg-brutal-dark/5 transition-colors">
                                                        <Pin className="w-3 h-3" /> {c.is_pinned ? 'Unpin' : 'Pin'}
                                                    </button>
                                                )}
                                                {!isOwner && (
                                                    <button onClick={() => { onReport(c.id); setMenuOpen(false); }}
                                                        className="w-full flex items-center gap-2.5 px-3 py-2 text-left font-data text-[11px] text-brutal-dark/50 hover:bg-brutal-dark/5 transition-colors">
                                                        <Flag className="w-3 h-3" /> Report
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Reply composer (inline, below the comment) */}
                        {replyingTo === c.id && (
                            <div className="mt-2 flex items-start gap-2">
                                <div className="w-5 h-5 rounded-full bg-brutal-dark text-brutal-bg font-heading font-bold flex items-center justify-center text-[8px] flex-shrink-0 mt-0.5">
                                    {user?.email?.charAt(0)?.toUpperCase() || '?'}
                                </div>
                                <div className="flex-1">
                                    <MentionInput
                                        value={replyText}
                                        onChange={setReplyText}
                                        onSubmit={() => onReplySubmit(c.id)}
                                        onCancel={onReplyCancel}
                                        placeholder={`Reply to ${c.userName}...`}
                                        maxLength={maxLength}
                                        autoFocus
                                        currentUserId={user?.id}
                                        className="w-full bg-transparent border-b border-brutal-dark/15 px-0 py-1.5 font-data text-[11px] text-brutal-dark placeholder:text-brutal-dark/30 focus:outline-none focus:border-brutal-red/50 transition-colors"
                                    />
                                    {replyText.trim() && (
                                        <div className="flex items-center gap-2 justify-end mt-1.5">
                                            <button onClick={onReplyCancel} className="font-data text-[9px] font-bold uppercase tracking-wider text-brutal-dark/40 hover:text-brutal-dark px-2 py-1">Cancel</button>
                                            <button
                                                onClick={() => onReplySubmit(c.id)}
                                                className="font-data text-[9px] font-bold uppercase tracking-wider bg-brutal-red text-brutal-bg px-3 py-1 rounded hover:bg-brutal-dark transition-colors"
                                            >Reply</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Replies */}
            {c.replies.length > 0 && depth === 0 && (
                <div>
                    <button
                        onClick={() => setShowReplies(!showReplies)}
                        className="flex items-center gap-1 font-data text-[10px] font-bold text-brutal-red/70 hover:text-brutal-red ml-10 mb-1 transition-colors"
                    >
                        {showReplies ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        {c.replies.length} {c.replies.length === 1 ? 'reply' : 'replies'}
                    </button>
                    {showReplies && c.replies.map(reply => (
                        <SingleComment
                            key={reply.id}
                            comment={reply}
                            user={user}
                            isTargetOwner={isTargetOwner}
                            depth={1}
                            onReply={onReply}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onLike={onLike}
                            onPin={onPin}
                            onReport={onReport}
                            editingId={editingId}
                            editText={editText}
                            setEditText={setEditText}
                            onEditSubmit={onEditSubmit}
                            onEditCancel={onEditCancel}
                            replyingTo={replyingTo}
                            replyText={replyText}
                            setReplyText={setReplyText}
                            onReplySubmit={onReplySubmit}
                            onReplyCancel={onReplyCancel}
                            maxLength={maxLength}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Main Component ───

export default function CommentThread({
    comments, totalCount, loading, user,
    sortMode, setSortMode,
    addComment, editComment, deleteComment,
    toggleCommentLike, togglePin, reportComment,
    isTargetOwner = false,
    maxLength = 500,
}: CommentThreadProps) {
    const [commentText, setCommentText] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editText, setEditText] = useState('');
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [replyText, setReplyText] = useState('');
    const [reportingId, setReportingId] = useState<string | null>(null);

    const handleComment = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = commentText.trim();
        if (!trimmed || submitting) return;
        setSubmitting(true);
        const { error } = await addComment(trimmed);
        if (!error) setCommentText('');
        setSubmitting(false);
    };

    const handleEditSubmit = async (commentId: string) => {
        const trimmed = editText.trim();
        if (!trimmed) return;
        const { error } = await editComment(commentId, trimmed);
        if (!error) { setEditingId(null); setEditText(''); }
    };

    const handleReplySubmit = async (parentId: string) => {
        const trimmed = replyText.trim();
        if (!trimmed) return;
        const { error } = await addComment(trimmed, parentId);
        if (!error) { setReplyingTo(null); setReplyText(''); }
    };

    const handleReport = async (reason: string, details?: string) => {
        if (!reportingId) return;
        await reportComment(reportingId, reason, details);
        setReportingId(null);
    };

    return (
        <div>
            {/* Header: count + sort */}
            <div className="flex items-center justify-between mb-4">
                <span className="font-data text-xs font-bold text-brutal-dark">
                    {totalCount} {totalCount === 1 ? 'Comment' : 'Comments'}
                </span>
                <button
                    onClick={() => setSortMode(sortMode === 'oldest' ? 'newest' : 'oldest')}
                    className="flex items-center gap-1 font-data text-[10px] font-bold uppercase tracking-wider text-brutal-dark/40 hover:text-brutal-dark transition-colors"
                >
                    <ArrowDownUp className="w-3 h-3" />
                    {sortMode === 'oldest' ? 'Oldest first' : 'Newest first'}
                </button>
            </div>

            {/* Composer */}
            {user ? (
                <form onSubmit={handleComment} className="flex items-start gap-3 mb-5">
                    <div className="w-7 h-7 rounded-full bg-brutal-dark text-brutal-bg font-heading font-bold flex items-center justify-center text-[10px] flex-shrink-0">
                        {user.email?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1">
                        <MentionInput
                            value={commentText}
                            onChange={setCommentText}
                            onSubmit={() => handleComment({ preventDefault: () => {} } as React.FormEvent)}
                            placeholder="Add a comment... (type @ to mention someone)"
                            maxLength={maxLength}
                            currentUserId={user?.id}
                            className="w-full bg-transparent text-brutal-dark border-b-2 border-brutal-dark/10 px-0 py-2 font-data text-sm placeholder:text-brutal-dark/30 focus:outline-none focus:border-brutal-red/50 transition-colors"
                        />
                        {commentText.trim() && (
                            <div className="flex items-center justify-end gap-2 mt-2">
                                <button type="button" onClick={() => setCommentText('')}
                                    className="font-data text-[11px] font-bold uppercase tracking-wider text-brutal-dark/40 hover:text-brutal-dark px-3 py-1.5">
                                    Cancel
                                </button>
                                <button type="submit" disabled={submitting}
                                    className="font-data text-[11px] font-bold uppercase tracking-wider bg-brutal-red text-brutal-bg px-4 py-1.5 rounded-lg disabled:opacity-50 hover:bg-brutal-dark transition-colors">
                                    {submitting ? 'Posting...' : 'Post'}
                                </button>
                            </div>
                        )}
                    </div>
                </form>
            ) : (
                <p className="font-data text-sm text-brutal-dark/50 mb-5">
                    <Link to="/login" className="text-brutal-red font-bold hover:underline">Log in</Link> to join the discussion.
                </p>
            )}

            {/* Comment list */}
            <div className="divide-y divide-brutal-dark/5">
                {comments.map(c => (
                    <SingleComment
                        key={c.id}
                        comment={c}
                        user={user}
                        isTargetOwner={isTargetOwner}
                        depth={0}
                        onReply={(id, userName) => { setReplyingTo(id); setReplyText('@' + userName + ' '); }}
                        onEdit={(comment) => { setEditingId(comment.id); setEditText(comment.content); }}
                        onDelete={deleteComment}
                        onLike={toggleCommentLike}
                        onPin={togglePin}
                        onReport={(id) => setReportingId(id)}
                        editingId={editingId}
                        editText={editText}
                        setEditText={setEditText}
                        onEditSubmit={handleEditSubmit}
                        onEditCancel={() => { setEditingId(null); setEditText(''); }}
                        replyingTo={replyingTo}
                        replyText={replyText}
                        setReplyText={setReplyText}
                        onReplySubmit={handleReplySubmit}
                        onReplyCancel={() => { setReplyingTo(null); setReplyText(''); }}
                        maxLength={maxLength}
                    />
                ))}
            </div>

            {/* Report modal */}
            {reportingId && (
                <ReportModal
                    onSubmit={handleReport}
                    onClose={() => setReportingId(null)}
                />
            )}
        </div>
    );
}
