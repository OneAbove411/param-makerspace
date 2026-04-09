import React from 'react';
import { ArrowLeft, Heart, Share2, Trash2, MessageCircle, GitFork } from 'lucide-react';
import { Button } from '../ui/Button';
import { ProjectLogTimeline } from './ProjectLogTimeline';
import { RemixFamily } from './RemixFamily';

interface TimelineEntry {
    id: string;
    title: string;
    anchorId: string;
}

interface ProjectIdentityPaneProps {
    project: any;
    likes: number;
    commentCount: number;
    timelineEntries: TimelineEntry[];
    activeEntryId: string;
    onTimelineClick: (anchorId: string) => void;
    onBack: () => void;
    onLike?: () => void;
    onShare?: () => void;
    onRemix?: () => void;
    isLiked?: boolean;
}

export function ProjectIdentityPane({
    project,
    likes,
    commentCount,
    timelineEntries,
    activeEntryId,
    onTimelineClick,
    onBack,
    onLike,
    onShare,
    onRemix,
    isLiked = false,
}: ProjectIdentityPaneProps) {
    return (
        <div className="flex flex-col h-full">
            {/* Top sticky section */}
            <div className="flex-shrink-0 pb-6 border-b border-brutal-dark/10">
                {/* Breadcrumbs */}
                <div className="font-data text-[10px] text-brutal-dark/40 uppercase tracking-wider mb-4 truncate">
                    Projects
                    {project.domain && ` › ${project.domain}`}
                    {' › '}
                    <span className="text-brutal-dark/60 font-bold">{project.title}</span>
                </div>

                {/* Title */}
                <h1 className="font-heading font-bold text-base uppercase tracking-tight-heading line-clamp-2 mb-3">
                    {project.title}
                </h1>

                {/* Status chip */}
                {project.status && (
                    <div className="inline-block">
                        <span className={`px-2 py-1 font-data text-[9px] font-bold uppercase tracking-widest rounded-full
                            ${project.status === 'active' ? 'bg-green-700/10 text-green-700' :
                                project.status === 'pending_review' ? 'bg-yellow-700/10 text-yellow-700' :
                                    project.status === 'rejected' ? 'bg-brutal-red/10 text-brutal-red' :
                                        'bg-brutal-dark/5 text-brutal-dark/60'}`}>
                            {project.status.replace('_', ' ')}
                        </span>
                    </div>
                )}

                {/* Domain tag */}
                {project.domain && (
                    <div className="mt-3">
                        <span className="inline-block border border-brutal-dark/15 px-2.5 py-1 font-data text-[9px] font-bold rounded-full uppercase tracking-wider text-brutal-dark/60">
                            {project.domain}
                        </span>
                    </div>
                )}
            </div>

            {/* Owner info */}
            <div className="flex-shrink-0 py-5 border-b border-brutal-dark/10">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-brutal-dark text-brutal-bg font-heading font-bold
                                    flex items-center justify-center text-sm flex-shrink-0">
                        {project.ownerName?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="font-data text-xs font-bold text-brutal-dark truncate">
                            {project.ownerName}
                        </div>
                        <div className="font-data text-[10px] text-brutal-red font-bold uppercase tracking-widest">
                            Owner
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats row */}
            <div className="flex-shrink-0 py-5 border-b border-brutal-dark/10">
                <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                        <div className="font-data text-xs font-bold text-brutal-dark">
                            {likes}
                        </div>
                        <div className="font-data text-[9px] text-brutal-dark/40 uppercase tracking-wider mt-1">
                            Likes
                        </div>
                    </div>
                    <div>
                        <div className="font-data text-xs font-bold text-brutal-dark">
                            {commentCount}
                        </div>
                        <div className="font-data text-[9px] text-brutal-dark/40 uppercase tracking-wider mt-1">
                            Comments
                        </div>
                    </div>
                    <div>
                        <div className="font-data text-xs font-bold text-brutal-dark">
                            —
                        </div>
                        <div className="font-data text-[9px] text-brutal-dark/40 uppercase tracking-wider mt-1">
                            Remixes
                        </div>
                    </div>
                </div>
            </div>

            {/* Remix Family (if applicable) */}
            {(project?.remixed_from_id || project?.remix_origin_title) && (
                <RemixFamily projectId={project.id} originId={project.remixed_from_id} />
            )}

            {/* Timeline */}
            <div className="flex-1 overflow-y-auto py-6 border-b border-brutal-dark/10">
                <h3 className="font-heading font-bold text-xs uppercase tracking-tight-heading mb-4 px-1">
                    Timeline
                </h3>
                <ProjectLogTimeline
                    entries={timelineEntries}
                    activeId={activeEntryId}
                    onEntryClick={onTimelineClick}
                />
            </div>

            {/* Action buttons */}
            <div className="flex-shrink-0 pt-5 space-y-2">
                <button
                    type="button"
                    onClick={onLike}
                    className={`w-full py-2 px-3 rounded-lg font-data text-xs font-bold uppercase tracking-wider
                        transition-all duration-300 flex items-center justify-center gap-2
                        ${isLiked
                            ? 'bg-brutal-red text-brutal-bg'
                            : 'border-2 border-brutal-dark/10 text-brutal-dark/60 hover:border-brutal-red/40'}`}>
                    <Heart size={12} className={isLiked ? 'fill-current' : ''} />
                    {isLiked ? 'Liked' : 'Like'}
                </button>
                <button
                    type="button"
                    onClick={onRemix}
                    className="w-full py-2 px-3 rounded-lg font-data text-xs font-bold uppercase tracking-wider
                        transition-all duration-300 bg-brutal-red text-brutal-bg hover:bg-brutal-red/90
                        flex items-center justify-center gap-2">
                    <GitFork size={12} />
                    Remix
                </button>
                <button
                    type="button"
                    onClick={onShare}
                    className="w-full py-2 px-3 rounded-lg font-data text-xs font-bold uppercase tracking-wider
                        transition-all duration-300 border-2 border-brutal-dark/10 text-brutal-dark/60
                        hover:border-brutal-dark/40 flex items-center justify-center gap-2">
                    <Share2 size={12} />
                    Share
                </button>
            </div>

            {/* Back button */}
            <div className="flex-shrink-0 pt-4 border-t border-brutal-dark/10">
                <button
                    type="button"
                    onClick={onBack}
                    className="w-full py-2 px-3 rounded-lg font-data text-xs font-bold uppercase tracking-wider
                        transition-all duration-300 text-brutal-dark/60 hover:text-brutal-dark
                        flex items-center justify-center gap-2">
                    <ArrowLeft size={12} />
                    Back
                </button>
            </div>
        </div>
    );
}
