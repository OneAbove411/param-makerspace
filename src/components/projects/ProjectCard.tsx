import React, { memo, useState, useEffect } from 'react';
import { Link } from 'react-router';
import { ArrowRight, Heart, Bookmark, Video, Users, GitFork } from 'lucide-react';
import { cn } from '../../lib/utils';
import { zeroCTA } from '../../lib/zeroCTA';
import type { ProjectListItem } from '../../lib/hooks';

/**
 * §8 Archive Cockpit — Project Card.
 *
 * X.company-inspired hover: image fills card at rest; on hover a dark
 * panel slides up from the bottom covering the full card, revealing
 * title (large), description, tags, and stats. Image stays visible
 * underneath, slightly scaled and dimmed.
 */

export interface ProjectCardProps {
    project: ProjectListItem;
    variant?: 'archive' | 'featured';
    isBookmarked?: boolean;
    isNew?: boolean;
    onRemix?: (project: ProjectListItem) => void;
    onToggleBookmark?: (project: ProjectListItem, currentlyBookmarked: boolean) => Promise<boolean>;
    className?: string;
}

function ProjectCardImpl({
    project,
    variant = 'archive',
    isBookmarked,
    isNew = false,
    onRemix,
    onToggleBookmark,
    className,
}: ProjectCardProps) {
    const {
        id,
        title,
        summary,
        domain,
        cover_image_url,
        tags,
        milestone_total,
        milestone_done,
        likes,
        bookmarks,
        video_count,
        member_count,
        owner_name,
        owner_avatar_url,
    } = project;

    const [bookmarkedLocal, setBookmarkedLocal] = useState<boolean>(!!isBookmarked);
    const [bookmarkCount, setBookmarkCount] = useState<number>(bookmarks);
    useEffect(() => { setBookmarkedLocal(!!isBookmarked); }, [isBookmarked]);
    useEffect(() => { setBookmarkCount(bookmarks); }, [bookmarks]);

    const handleSaveClick = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!onToggleBookmark) return;
        const wasBookmarked = bookmarkedLocal;
        setBookmarkedLocal(!wasBookmarked);
        setBookmarkCount((c) => Math.max(0, c + (wasBookmarked ? -1 : 1)));
        const next = await onToggleBookmark(project, wasBookmarked);
        setBookmarkedLocal(next);
        if (next === wasBookmarked) {
            setBookmarkCount((c) => Math.max(0, c + (wasBookmarked ? 1 : -1)));
        }
    };

    const progressPct =
        milestone_total > 0 ? Math.round((milestone_done / milestone_total) * 100) : 0;

    const visibleTags = tags.slice(0, 4);
    const extraTagCount = Math.max(0, tags.length - visibleTags.length);

    return (
        <Link
            to={`/projects/${id}`}
            className={cn(
                'project-card-animated block group',
                'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brutal-red',
                className,
            )}
        >
            <div
                className={cn(
                    'relative overflow-hidden rounded-lg',
                    variant === 'featured' ? 'aspect-[4/3]' : 'aspect-[3/4]',
                    'bg-brutal-dark',
                )}
            >
                {/* ── Image layer ── */}
                {cover_image_url ? (
                    <img
                        src={cover_image_url}
                        alt={title}
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                    />
                ) : (
                    <div
                        className="absolute inset-0 w-full h-full"
                        style={{
                            backgroundImage: 'radial-gradient(circle, rgba(245,243,238,0.08) 1px, transparent 1px)',
                            backgroundSize: '24px 24px',
                        }}
                    />
                )}

                {/* ── Resting gradient: title always legible ── */}
                <div className="absolute inset-0 bg-gradient-to-t from-brutal-dark/80 via-brutal-dark/20 to-transparent transition-opacity duration-500 group-hover:opacity-0" />

                {/* ── Top badges (visible at rest, fade on hover) ── */}
                <div className="absolute top-3 left-3 z-20 flex flex-col items-start gap-1.5 transition-opacity duration-400 group-hover:opacity-0">
                    {isNew && (
                        <span className="bg-brutal-red text-white font-data text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full">
                            New
                        </span>
                    )}
                    {domain && (
                        <span className="bg-black/50 backdrop-blur-md text-white font-data text-[10px] font-medium px-2.5 py-1 rounded-full border border-white/20">
                            {domain}
                        </span>
                    )}
                </div>

                {/* ── Action buttons top-right (fade in on hover) ── */}
                <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-400 delay-100">
                    <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemix?.(project); }}
                        aria-label={`Remix: ${title}`}
                        className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-white/15 backdrop-blur-md text-white border border-white/20 hover:bg-white/30 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brutal-red"
                    >
                        <GitFork size={12} aria-hidden />
                    </button>
                    {onToggleBookmark && (
                        <button
                            type="button"
                            onClick={handleSaveClick}
                            aria-pressed={bookmarkedLocal}
                            aria-label={bookmarkedLocal ? `Unsave ${title}` : `Save ${title}`}
                            className={cn(
                                'inline-flex items-center justify-center h-7 w-7 rounded-full transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brutal-red',
                                bookmarkedLocal
                                    ? 'bg-brutal-red text-white'
                                    : 'bg-white/15 backdrop-blur-md text-white border border-white/20 hover:bg-white/30',
                            )}
                        >
                            <Bookmark size={12} className={bookmarkedLocal ? 'fill-current' : ''} aria-hidden />
                        </button>
                    )}
                </div>

                {/* ── Resting state: title at bottom ── */}
                <div className="absolute inset-x-0 bottom-0 z-20 p-4 transition-opacity duration-400 group-hover:opacity-0">
                    <h3 className="font-heading font-bold text-base md:text-lg uppercase tracking-tight-heading leading-tight text-white line-clamp-2">
                        {title}
                    </h3>
                    <div className="flex items-center justify-between mt-2">
                        <span className="font-data text-[9px] font-bold uppercase tracking-widest text-white/40">
                            Project
                        </span>
                        <span className="font-data text-[10px] font-bold uppercase tracking-wider text-brutal-red flex items-center gap-1">
                            Open <ArrowRight size={10} />
                        </span>
                    </div>
                </div>

                {/* ── Hover panel: crossfade over image ── */}
                <div
                    className="absolute inset-0 z-20 bg-brutal-dark flex flex-col justify-end p-5 gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-in-out"
                >
                    {/* Domain pill */}
                    {domain && (
                        <span className="self-start font-data text-[9px] font-bold uppercase tracking-widest text-brutal-red/80">
                            {domain}
                        </span>
                    )}

                    {/* Title — large */}
                    <h3 className="font-heading font-bold text-xl md:text-2xl uppercase tracking-tight-heading leading-[1.05] text-white">
                        {title}
                    </h3>

                    {/* Description */}
                    {summary && (
                        <p className="font-data text-[12px] text-white/65 leading-relaxed line-clamp-4">
                            {summary}
                        </p>
                    )}

                    {/* Tags */}
                    {visibleTags.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5">
                            {visibleTags.map((t) => (
                                <span key={t} className="font-data text-[9px] font-medium text-white/50 bg-white/8 border border-white/10 px-2 py-0.5 rounded-full">
                                    {t}
                                </span>
                            ))}
                            {extraTagCount > 0 && (
                                <span className="font-data text-[9px] text-white/30">+{extraTagCount}</span>
                            )}
                        </div>
                    )}

                    {/* Progress bar */}
                    {milestone_total > 0 && (
                        <div className="flex items-center gap-2">
                            <div className="flex-1 h-px bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-brutal-red rounded-full" style={{ width: `${progressPct}%` }} />
                            </div>
                            <span className="font-data text-[9px] text-white/40 tabular-nums">{milestone_done}/{milestone_total}</span>
                        </div>
                    )}

                    {/* Footer: owner + stats + CTA */}
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/8">
                        <div className="flex items-center gap-1.5 min-w-0">
                            <div className="w-5 h-5 rounded-full bg-white/15 flex-shrink-0 overflow-hidden flex items-center justify-center">
                                {owner_avatar_url ? (
                                    <img src={owner_avatar_url} alt="" loading="lazy" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="font-data text-[7px] font-bold text-white/60">{(owner_name || '?').slice(0, 1).toUpperCase()}</span>
                                )}
                            </div>
                            <span className="font-data text-[10px] text-white/50 truncate">{owner_name}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <div className="flex items-center gap-2 font-data text-[10px] text-white/35 tabular-nums">
                                {likes > 0 && (
                                    <span className="inline-flex items-center gap-0.5">
                                        <Heart size={10} aria-hidden /> {likes}
                                    </span>
                                )}
                                {video_count > 0 && <span className="inline-flex items-center gap-0.5"><Video size={10} aria-hidden /> {video_count}</span>}
                                {member_count > 0 && <span className="inline-flex items-center gap-0.5"><Users size={10} aria-hidden /> {member_count}</span>}
                            </div>
                            <span className="font-data text-[10px] font-bold uppercase tracking-wider text-brutal-red flex items-center gap-1">
                                Open <ArrowRight size={10} />
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
}

export const ProjectCard = memo(ProjectCardImpl);
