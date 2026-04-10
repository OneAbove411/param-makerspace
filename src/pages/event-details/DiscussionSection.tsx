import React from 'react';
import { Link } from 'react-router';
import { Send } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { SectionAnchor } from './SectionAnchor';

const DiscussionSection = ({ comments, user, deleteComment, handleComment, commentText, setCommentText, sectionId, sectionNum }: any) => (
    <section id={sectionId}>
        <SectionAnchor id={`${sectionId}-anchor`} number={sectionNum} title="Discussion" icon={<Send className="w-4 h-4 text-brutal-red" />} />

        {/* Composer — visible before the list so logged-in users always see it */}
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
            {comments.map((c: any) => (
                <div key={c.id} className="p-3 bg-brutal-dark/[0.03] rounded-xl border border-brutal-dark/10">
                    <div className="flex justify-between items-start mb-2">
                        <span className="font-data text-xs font-bold">{c.userName}</span>
                        <div className="flex items-center gap-2">
                            <span className="font-data text-[9px] text-brutal-dark/50">{new Date(c.created_at).toLocaleDateString()}</span>
                            {user && c.user_id === user.id && (
                                <button onClick={() => deleteComment(c.id)} className="text-brutal-red text-[9px] font-bold hover:underline">Delete</button>
                            )}
                        </div>
                    </div>
                    <p className="font-data text-xs text-brutal-dark/80 whitespace-pre-wrap">{c.content}</p>
                </div>
            ))}
            {comments.length === 0 && (
                <p className="font-data text-xs text-brutal-dark/40 text-center py-4">No comments yet. Be the first.</p>
            )}
        </div>
    </section>
);

export default DiscussionSection;
export { DiscussionSection };
