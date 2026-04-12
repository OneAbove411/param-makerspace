import React from 'react';
import { Send } from 'lucide-react';
import { SectionAnchor } from './SectionAnchor';
import CommentThread from '../../components/shared/CommentThread';
import type { EnrichedComment, CommentSortMode } from '../../lib/hooks/useComments';

interface DiscussionSectionProps {
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
    isTargetOwner?: boolean;
    sectionId?: string;
    sectionNum?: string;
}

const DiscussionSection = ({
    comments, totalCount, loading, user,
    sortMode, setSortMode,
    addComment, editComment, deleteComment,
    toggleCommentLike, togglePin, reportComment,
    isTargetOwner = false,
    sectionId = 'discussion',
    sectionNum,
}: DiscussionSectionProps) => {
    return (
        <section id={sectionId}>
            {sectionNum && (
                <SectionAnchor id={`${sectionId}-anchor`} number={sectionNum} title="Discussion" icon={<Send className="w-4 h-4 text-brutal-red" />} />
            )}

            <CommentThread
                comments={comments}
                totalCount={totalCount}
                loading={loading}
                user={user}
                sortMode={sortMode}
                setSortMode={setSortMode}
                addComment={addComment}
                editComment={editComment}
                deleteComment={deleteComment}
                toggleCommentLike={toggleCommentLike}
                togglePin={togglePin}
                reportComment={reportComment}
                isTargetOwner={isTargetOwner}
            />
        </section>
    );
};

export default DiscussionSection;
export { DiscussionSection };
