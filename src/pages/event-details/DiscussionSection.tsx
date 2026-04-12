import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router';
import { Send, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { SectionAnchor } from './SectionAnchor';

const DiscussionSection = ({ comments, user, deleteComment, editComment, handleComment, commentText, setCommentText, sectionId, sectionNum }: any) => {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editText, setEditText] = useState('');
    const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpenId(null);
            }
        };
        if (menuOpenId) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [menuOpenId]);

    const startEdit = (comment: any) => {
        setEditingId(comment.id);
        setEditText(comment.content);
        setMenuOpenId(null);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditText('');
    };

    const submitEdit = async (commentId: string) => {
        const trimmed = editText.trim();
        if (!trimmed) return;
        const { error } = await editComment(commentId, trimmed);
        if (!error) cancelEdit();
    };

    const handleDelete = (commentId: string) => {
        setMenuOpenId(null);
        deleteComment(commentId);
    };

    return (
        <section id={sectionId}>
            <SectionAnchor id={`${sectionId}-anchor`} number={sectionNum} title="Discussion" icon={<Send className="w-4 h-4 text-brutal-red" />} />

            {/* Composer */}
            {user ? (
                <form onSubmit={handleComment} className="mb-5 p-3 rounded-xl border-2 border-brutal-dark/10 bg-brutal-bg flex gap-2 items-center focus-within:border-brutal-dark/30 transition-colors">
                    <input
                        type="text"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Share a thought, ask a question…"
                        className="flex-1 bg-transparent px-2 py-1.5 font-data text-xs text-brutal-dark placeholder:text-brutal-dark/35 focus:outline-none"
                    />
                    <Button type="submit" size="sm" disabled={!commentText.trim()}>
                        <Send className="w-3 h-3 mr-1" /> Post
                    </Button>
                </form>
            ) : (
                <div className="mb-5 p-3 rounded-xl border-2 border-brutal-dark/10 bg-brutal-dark/[0.03] flex items-center justify-between gap-3">
                    <span className="font-data text-xs text-brutal-dark/55">Log in to join the discussion.</span>
                    <Link to="/login" className="font-data text-[10px] font-bold uppercase tracking-widest text-brutal-red hover:underline">Log in →</Link>
                </div>
            )}

            <div className="space-y-3">
                {comments.map((c: any) => {
                    const isEdited = c.updated_at && c.created_at && c.updated_at !== c.created_at;
                    const isOwner = user && c.user_id === user.id;
                    return (
                        <div key={c.id} className="p-3 bg-brutal-dark/[0.03] rounded-xl border border-brutal-dark/10">
                            <div className="flex items-center gap-2 mb-1.5">
                                <span className="font-data text-xs font-bold">{c.userName}</span>
                                <span className="font-data text-[9px] text-brutal-dark/50">
                                    {new Date(c.created_at).toLocaleDateString()}
                                </span>
                                {isEdited && <span className="font-data text-[9px] italic text-brutal-dark/35">(edited)</span>}
                            </div>
                            {editingId === c.id ? (
                                <div className="space-y-2">
                                    <input
                                        type="text"
                                        value={editText}
                                        onChange={(e) => setEditText(e.target.value)}
                                        className="w-full bg-white border border-brutal-dark/20 rounded px-2 py-1.5 font-data text-xs text-brutal-dark focus:outline-none focus:border-brutal-red/50"
                                        autoFocus
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') { e.preventDefault(); submitEdit(c.id); }
                                            if (e.key === 'Escape') cancelEdit();
                                        }}
                                    />
                                    <div className="flex gap-2 justify-end">
                                        <button onClick={cancelEdit} className="font-data text-[9px] font-bold uppercase tracking-wider text-brutal-dark/40 hover:text-brutal-dark px-2 py-1">Cancel</button>
                                        <button onClick={() => submitEdit(c.id)} disabled={!editText.trim()} className="font-data text-[9px] font-bold uppercase tracking-wider bg-brutal-red text-brutal-bg px-3 py-1 rounded disabled:opacity-50 hover:bg-brutal-dark transition-colors">Save</button>
                                    </div>
                                </div>
                            ) : (
                                <p className="font-data text-xs text-brutal-dark/80 whitespace-pre-wrap">{c.content}</p>
                            )}

                            {/* Action menu below comment — always visible to owner */}
                            {isOwner && editingId !== c.id && (
                                <div className="relative mt-2 flex items-center" ref={menuOpenId === c.id ? menuRef : null}>
                                    <button
                                        onClick={() => setMenuOpenId(menuOpenId === c.id ? null : c.id)}
                                        className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-brutal-dark/10 transition-colors text-brutal-dark/40 hover:text-brutal-dark/70"
                                        aria-label="Comment actions"
                                    >
                                        <MoreHorizontal className="w-4 h-4" />
                                    </button>
                                    {menuOpenId === c.id && (
                                        <div className="absolute left-0 top-full mt-1 z-20 bg-white border-2 border-brutal-dark/10 rounded-lg shadow-lg py-1 min-w-[130px]">
                                            <button
                                                onClick={() => startEdit(c)}
                                                className="w-full flex items-center gap-2.5 px-3 py-2 text-left font-data text-[11px] text-brutal-dark/70 hover:bg-brutal-dark/5 transition-colors"
                                            >
                                                <Pencil className="w-3.5 h-3.5" /> Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(c.id)}
                                                className="w-full flex items-center gap-2.5 px-3 py-2 text-left font-data text-[11px] text-brutal-red hover:bg-brutal-red/5 transition-colors"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" /> Delete
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
                {comments.length === 0 && (
                    <p className="font-data text-xs text-brutal-dark/40 text-center py-4">No comments yet. Be the first.</p>
                )}
            </div>
        </section>
    );
};

export default DiscussionSection;
export { DiscussionSection };
