import React, { memo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Heart, Bookmark, Video, Users, Flame, Eye, GitFork } from 'lucide-react';
import { Card } from '../ui/Card';
import { MagneticCard } from '../ui/MagneticCard';
import { cn } from '../../lib/utils';
import type { ProjectListItem } from '../../lib/hooks';

/**
 * §8 Archive Cockpit — Unified Project Card.
 *
 * Merges ProjectArchiveCard (vertical layout) + FeaturedProjectCard
 * (horizontal split) into one component with a `variant` prop.
 *
 * variant='archive': Dense vertical card (16:9 cover, body below)
 * variant='featured': Horizontal split (cover left, body right on md+)
 *
 * Both preserve their original visual design and typography.
 */

export interface ProjectCardProps {
    project: ProjectListItem;
    /** Which card layout to render. Defaults to 'archive'. */
    variant?: 'archive' | 'featured';
    /** Optional bookmarked-by-me flag. Used to pre-fill the bookmark icon. */
    isBookmarked?: boolean;
    /** Opens the Quick Peek drawer for this project. */
    onQuickPeek: (project: ProjectListItem) => void;
    /** Opens the Remix modal for this project. */
    onRemix?: (project: ProjectListItem) => void;
    /** Toggles the bookmark for this project. Returns the new state so the
     *  card can sync its optimistic UI. If omitted, the Save button is hidden. */
    onToggleBookmark?: (project: ProjectListItem, currentlyBookmarked: boolean) => Promise<boolean>;
    /** Extra className (e.g. GSAP animation hooks). */
    className?: string;
}

function ProjectCardImpl({
    project,
    variant = 'archive',
    isBookmarked,
    onQuickPeek,
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

    // Optimistic local bookmark state — keeps the icon snappy without
    // waiting for the parent's `useMyBookmarkedProjectIds` to refetch.
    const [bookmarkedLocal, setBookmarkedLocal] = useState<boolean>(!!isBookmarked);
    const [bookmarkCount, setBookmarkCount] = useState<number>(bookmarks);
    useEffect(() => { setBookmarkedLocal(!!isBookmarked); }, [isBookmarked]);
    useEffect(() => { setBookmarkCount(bookmarks); }, [bookmarks]);

    const handleSaveClick = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!onToggleBookmark) return;
        const wasBookmarked = bookmarkedLocal;
        // Optimistic flip
        setBookmarkedLocal(!wasBookmarked);
        setBookmarkCount((c) => Math.max(0, c + (wasBookmarked ? -1 : 1)));
        const next = await onToggleBookmark(project, wasBookmarked);
        // Reconcile with the server's truth (handles errors / not-logged-in)
        setBookmarkedLocal(next);
        if (next === wasBookmarked) {
            // The toggle was rejected — undo the count flip
            setBookmarkCount((c) => Math.max(0, c + (wasBookmarked ? 1 : -1)));
        }
    };

    const progressPct =
        milestone_total > 0 ? Math.round((milestone_done / milestone_total) * 100) : 0;

    const visibleTags = tags.slice(0, variant === 'featured' ? 4 : 3);
    const extraTagCount = Math.max(0, tags.length - visibleTags.length);

    if (variant === 'featured') {
        return (
            <MagneticCard intensity={3} glowOnHover className={cn('h-full', className)}>
                <Card
                    className={cn(
                        'group h-full overflow-hidden relative',
                        'border-2 border-brutal-red/40',
                        'shadow-[10px_10px_0_0_rgba(196,41,30,0.22)]',
                        'transition-all duration-300',
                        'hover:shadow-[12px_12px_0_0_rgba(196,41,30,0.32)] hover:border-brutal-red/60',
                        'flex flex-col md:flex-row',
                    )}
                >
                    {/* ── COVER (left on md+, top on mobile) ────────────── */}
                    <div className="relative md:w-[46%] md:flex-shrink-0 md:min-h-[360px] overflow-hidden bg-brutal-dark group/cover">
                        <Link
                            to={`/projects/${id}`}
                            aria-label={`Open featured project: ${title}`}
                            className={cn(
                                'block absolute inset-0',
                                'focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-brutal-red',
                            )}
                        >
                            {cover_image_url ? (
                                <img
                                    src={cover_image_url}
                                    alt={title}
                                    loading="lazy"
                                    width={960}
                                    height={640}
                                    className={cn(
                                        'w-full h-full object-cover opacity-85',
                                        'group-hover/cover:opacity-100 group-hover/cover:scale-105',
                                        'transition-all duration-700 ease-out',
                                    )}
                                />
                            ) : (
                                <div
                                    className="w-full h-full"
                                    style={{
                                        backgroundImage:
                                            'radial-gradient(circle, rgba(245,243,238,0.08) 1px, transparent 1px)',
                                        backgroundSize: '24px 24px',
                                    }}
                                />
                            )}
                            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-brutal-dark/60 to-transparent pointer-events-none" />
                        </Link>

                        {/* Featured ribbon (top-left) */}
                        <span
                            className={cn(
                                'absolute top-4 left-4 inline-flex items-center gap-1.5',
                                'bg-brutal-red text-brutal-bg',
                                'font-data text-[10px] font-bold uppercase tracking-widest',
                                'px-3 py-1.5 rounded-full shadow-[2px_2px_0_0_rgba(0,0,0,0.15)]',
                            )}
                        >
                            <Flame size={11} aria-hidden /> Featured
                        </span>

                        {/* Save button (top-right) — always visible, clickable */}
                        {onToggleBookmark && (
                            <button
                                type="button"
                                onClick={handleSaveClick}
                                aria-pressed={bookmarkedLocal}
                                aria-label={bookmarkedLocal ? `Unsave ${title}` : `Save ${title}`}
                                title={bookmarkedLocal ? 'Saved' : 'Save'}
                                className={cn(
                                    'absolute top-4 right-4 inline-flex items-center gap-1',
                                    'backdrop-blur-sm font-data text-[10px] font-bold tabular-nums',
                                    'px-2.5 py-1.5 rounded-full border-2 transition-all',
                                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brutal-red',
                                    bookmarkedLocal
                                        ? 'bg-brutal-red text-brutal-bg border-brutal-red shadow-[2px_2px_0_0_rgba(0,0,0,0.18)]'
                                        : 'bg-brutal-bg/90 text-brutal-dark border-brutal-dark/20 hover:border-brutal-red hover:text-brutal-red',
                                )}
                            >
                                <Bookmark
                                    size={11}
                                    className={bookmarkedLocal ? 'fill-current' : ''}
                                    aria-hidden
                                />
                                {bookmarkCount > 0 && bookmarkCount}
                            </button>
                        )}

                        {/* Quick peek button (bottom-right) */}
                        <div className="absolute bottom-4 right-4 flex items-center gap-2">
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onRemix?.(project);
                                }}
                                aria-label={`Remix: ${title}`}
                                className={cn(
                                    'inline-flex items-center gap-1.5',
                                    'bg-brutal-red text-brutal-bg font-data text-[9px] font-bold uppercase tracking-widest',
                                    'px-2.5 py-1.5 rounded-full',
                                    'transition-all duration-200',
                                    'hover:bg-brutal-red/90',
                                    'md:opacity-0 md:translate-y-1 md:group-hover/cover:opacity-100 md:group-hover/cover:translate-y-0',
                                    'motion-reduce:transition-none motion-reduce:md:opacity-100 motion-reduce:md:translate-y-0',
                                    'min-h-[32px] min-w-[36px]',
                                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brutal-red',
                                )}
                            >
                                <GitFork size={10} aria-hidden />
                            </button>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onQuickPeek(project);
                                }}
                                aria-label={`Quick peek: ${title}`}
                                className={cn(
                                    'inline-flex items-center gap-1.5',
                                    'bg-brutal-bg text-brutal-dark font-data text-[10px] font-bold uppercase tracking-widest',
                                    'px-3 py-2 rounded-full border-2 border-brutal-dark',
                                    'shadow-[3px_3px_0_0_rgba(196,41,30,0.7)]',
                                    'transition-all duration-200',
                                    'hover:bg-brutal-dark hover:text-brutal-bg',
                                    'md:opacity-0 md:translate-y-1 md:group-hover/cover:opacity-100 md:group-hover/cover:translate-y-0',
                                    'motion-reduce:transition-none motion-reduce:md:opacity-100 motion-reduce:md:translate-y-0',
                                    'min-h-[36px] min-w-[44px]',
                                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brutal-red',
                                )}
                            >
                                <Eye size={12} aria-hidden /> Peek
                            </button>
                        </div>

                        {/* Spacer so the left pane has intrinsic aspect on mobile */}
                        <div className="block md:hidden pb-[56%]" aria-hidden />
                    </div>

                    {/* ── BODY (right on md+, bottom on mobile) ─────────── */}
                    <div className="flex-1 p-6 md:p-8 flex flex-col gap-4 min-w-0">
                        {/* Domain line */}
                        {domain && (
                            <div className="flex items-center gap-3">
                                <span className="font-data text-[10px] font-bold uppercase tracking-widest text-brutal-red">
                                    #{domain}
                                </span>
                            </div>
                        )}

                        {/* Title + summary */}
                        <Link
                            to={`/projects/${id}`}
                            className="block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brutal-red rounded"
                        >
                            <h3
                                className={cn(
                                    'font-drama italic text-3xl md:text-4xl lg:text-[2.75rem] leading-[0.95]',
                                    'text-brutal-dark tracking-tight-heading',
                                    'line-clamp-2 group-hover:text-brutal-red transition-colors duration-300',
                                )}
                            >
                                {title}
                            </h3>
                        </Link>

                        <p className="font-data text-[13px] md:text-sm text-brutal-dark/60 leading-relaxed line-clamp-3 md:line-clamp-4">
                            {summary || 'No summary yet.'}
                        </p>

                        {/* Tags */}
                        {visibleTags.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5" aria-label="Tags">
                                {visibleTags.map((t) => (
                                    <span
                                        key={t}
                                        className={cn(
                                            'inline-flex items-center font-data text-[10px] font-bold uppercase tracking-wider',
                                            'text-brutal-dark/60 bg-brutal-dark/[0.04] border border-brutal-dark/10',
                                            'px-2 py-0.5 rounded-full',
                                        )}
                                    >
                                        #{t}
                                    </span>
                                ))}
                                {extraTagCount > 0 && (
                                    <span className="font-data text-[10px] font-bold uppercase tracking-wider text-brutal-dark/35">
                                        +{extraTagCount}
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Milestone progress */}
                        {milestone_total > 0 && (
                            <div>
                                <div className="flex items-baseline justify-between mb-1">
                                    <span className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-dark/45">
                                        Milestones
                                    </span>
                                    <span className="font-data text-[10px] font-bold tabular-nums text-brutal-red">
                                        {milestone_done}/{milestone_total}
                                    </span>
                                </div>
                                <div
                                    className="h-1.5 bg-brutal-dark/8 rounded-full overflow-hidden"
                                    role="progressbar"
                                    aria-valuenow={progressPct}
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                    aria-label="Milestone progress"
                                >
                                    <div
                                        className="h-full bg-brutal-red transition-all duration-700 motion-reduce:transition-none"
                                        style={{ width: `${progressPct}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Footer: maker + stats */}
                        <div className="flex items-center justify-between gap-3 pt-4 mt-auto border-t border-brutal-dark/10">
                            <div className="flex items-center gap-2 min-w-0">
                                <div
                                    className={cn(
                                        'w-7 h-7 rounded-full bg-brutal-dark/10 border border-brutal-dark/15',
                                        'flex-shrink-0 overflow-hidden flex items-center justify-center',
                                    )}
                                    aria-hidden
                                >
                                    {owner_avatar_url ? (
                                        <img src={owner_avatar_url} alt="" loading="lazy" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="font-data text-[10px] font-bold text-brutal-dark/50">
                                            {(owner_name || '?').slice(0, 1).toUpperCase()}
                                        </span>
                                    )}
                                </div>
                                <span className="font-data text-xs font-bold text-brutal-dark/70 truncate">
                                    {owner_name}
                                </span>
                            </div>

                            <div className="flex items-center gap-3 flex-shrink-0 font-data text-[11px] font-bold tabular-nums text-brutal-dark/55">
                                <span className="inline-flex items-center gap-1" aria-label={`${likes} likes`}>
                                    <Heart size={12} aria-hidden /> {likes}
                                </span>
                                {video_count > 0 && (
                                    <span className="inline-flex items-center gap-1" aria-label={`${video_count} videos`}>
                                        <Video size={12} aria-hidden /> {video_count}
                                    </span>
                                )}
                                {member_count > 0 && (
                                    <span className="inline-flex items-center gap-1" aria-label={`${member_count} collaborators`}>
                                        <Users size={12} aria-hidden /> {member_count}
                                    </span>
                                )}
                                <Link
                                    to={`/projects/${id}`}
                                    aria-label={`Open project: ${title}`}
                                    className={cn(
                                        'inline-flex items-center gap-1 pl-2 ml-1 border-l border-brutal-dark/15',
                                        'text-brutal-red hover:text-brutal-dark transition-colors',
                                        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brutal-red rounded',
                                    )}
                                >
                                    Open <ArrowRight size={12} aria-hidden />
                                </Link>
                            </div>
                        </div>
                    </div>
                </Card>
            </MagneticCard>
        );
    }

    // Archive variant (vertical)
    return (
        <MagneticCard intensity={4} glowOnHover className={cn('project-card-animated', className)}>
            <Card
                className={cn(
                    'h-full flex flex-col overflow-hidden',
                    'border-2 border-brutal-dark/15',
                    'shadow-[6px_6px_0_0_rgba(196,41,30,0.18)]',
                    'transition-all duration-300',
                    'hover:shadow-[8px_8px_0_0_rgba(196,41,30,0.28)] hover:border-brutal-red/40'
                )}
            >
                {/* ── COVER ─────────────────────────────────────────── */}
                <div className="relative h-48 w-full overflow-hidden bg-brutal-dark group/cover">
                    <Link
                        to={`/projects/${id}`}
                        aria-label={`Open project: ${title}`}
                        className="absolute inset-0 block rounded-t-2xl
                                   focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-brutal-red"
                    >
                        {cover_image_url ? (
                            <img
                                src={cover_image_url}
                                alt={title}
                                loading="lazy"
                                width={600}
                                height={400}
                                className="w-full h-full object-cover opacity-80
                                           group-hover/cover:opacity-100 group-hover/cover:scale-105
                                           transition-all duration-700 ease-out"
                            />
                        ) : (
                            <div
                                className="w-full h-full flex items-center justify-center"
                                style={{
                                    backgroundImage:
                                        'radial-gradient(circle, rgba(245,243,238,0.08) 1px, transparent 1px)',
                                    backgroundSize: '20px 20px',
                                }}
                            >
                                <span className="font-data text-brutal-bg/15 text-xs uppercase tracking-widest">
                                    No Preview
                                </span>
                            </div>
                        )}

                        {/* Gradient for chip legibility */}
                        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-brutal-dark/60 to-transparent pointer-events-none" />
                    </Link>

                    {/* Domain chip (top-left) */}
                    {domain && (
                        <span
                            className="absolute top-3 left-3 inline-flex items-center gap-1
                                       bg-brutal-bg/95 backdrop-blur-sm
                                       text-brutal-red font-data text-[10px] font-bold uppercase tracking-widest
                                       px-2.5 py-1 rounded-full border border-brutal-red/20"
                        >
                            #{domain}
                        </span>
                    )}

                    {/* Save button (top-right) — always visible, clickable */}
                    {onToggleBookmark && (
                        <button
                            type="button"
                            onClick={handleSaveClick}
                            aria-pressed={bookmarkedLocal}
                            aria-label={bookmarkedLocal ? `Unsave ${title}` : `Save ${title}`}
                            title={bookmarkedLocal ? 'Saved' : 'Save'}
                            className={cn(
                                'absolute top-3 right-3 inline-flex items-center gap-1',
                                'backdrop-blur-sm font-data text-[10px] font-bold tabular-nums',
                                'px-2.5 py-1.5 rounded-full border-2 transition-all',
                                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brutal-red',
                                bookmarkedLocal
                                    ? 'bg-brutal-red text-brutal-bg border-brutal-red shadow-[2px_2px_0_0_rgba(0,0,0,0.18)]'
                                    : 'bg-brutal-bg/90 text-brutal-dark border-brutal-dark/20 hover:border-brutal-red hover:text-brutal-red'
                            )}
                        >
                            <Bookmark
                                size={11}
                                className={bookmarkedLocal ? 'fill-current' : ''}
                                aria-hidden
                            />
                            {bookmarkCount > 0 && bookmarkCount}
                        </button>
                    )}

                    {/* Remix + Quick Peek buttons (bottom-right) */}
                    <div className="absolute bottom-3 right-3 flex items-center gap-2">
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onRemix?.(project);
                            }}
                            aria-label={`Remix: ${title}`}
                            className={cn(
                                'inline-flex items-center gap-1.5',
                                'bg-brutal-red text-brutal-bg font-data text-[9px] font-bold uppercase tracking-widest',
                                'px-2.5 py-1.5 rounded-full',
                                'transition-all duration-200',
                                'hover:bg-brutal-red/90',
                                'md:opacity-0 md:translate-y-1 md:group-hover/cover:opacity-100 md:group-hover/cover:translate-y-0',
                                'motion-reduce:transition-none motion-reduce:md:translate-y-0 motion-reduce:md:opacity-100',
                                'min-h-[28px] min-w-[32px]',
                                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brutal-red'
                            )}
                        >
                            <GitFork size={10} aria-hidden />
                        </button>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onQuickPeek(project);
                            }}
                            aria-label={`Quick peek: ${title}`}
                            className={cn(
                                'inline-flex items-center gap-1.5',
                                'bg-brutal-bg text-brutal-dark font-data text-[10px] font-bold uppercase tracking-widest',
                                'px-3 py-2 rounded-full border-2 border-brutal-dark',
                                'shadow-[3px_3px_0_0_rgba(196,41,30,0.7)]',
                                'transition-all duration-200',
                                'hover:bg-brutal-dark hover:text-brutal-bg hover:border-brutal-dark',
                                'md:opacity-0 md:translate-y-1 md:group-hover/cover:opacity-100 md:group-hover/cover:translate-y-0',
                                'motion-reduce:transition-none motion-reduce:md:translate-y-0 motion-reduce:md:opacity-100',
                                'min-h-[32px] min-w-[44px]',
                                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brutal-red'
                            )}
                        >
                            <Eye size={12} aria-hidden />
                            Peek
                        </button>
                    </div>
                </div>

                {/* ── BODY ──────────────────────────────────────────── */}
                <div className="p-5 flex-1 flex flex-col gap-3">
                    {/* Title + summary (clickable via overlay link) */}
                    <div className="relative">
                        <Link
                            to={`/projects/${id}`}
                            className="block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brutal-red rounded"
                        >
                            <h3
                                className="font-heading font-bold text-lg leading-tight tracking-tight-heading
                                           line-clamp-2 group-hover:text-brutal-red transition-colors duration-300"
                            >
                                {title}
                            </h3>
                        </Link>
                        <p className="font-data text-[13px] text-brutal-dark/55 line-clamp-2 mt-1.5 leading-relaxed">
                            {summary || 'No summary yet.'}
                        </p>
                    </div>

                    {/* Tags */}
                    {visibleTags.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5" aria-label="Tags">
                            {visibleTags.map((t) => (
                                <span
                                    key={t}
                                    className="inline-flex items-center font-data text-[10px] font-bold uppercase tracking-wider
                                               text-brutal-dark/60 bg-brutal-dark/[0.04] border border-brutal-dark/10
                                               px-2 py-0.5 rounded-full"
                                >
                                    {t}
                                </span>
                            ))}
                            {extraTagCount > 0 && (
                                <span className="font-data text-[10px] font-bold uppercase tracking-wider text-brutal-dark/35">
                                    +{extraTagCount}
                                </span>
                            )}
                        </div>
                    )}

                    {/* Milestone progress */}
                    {milestone_total > 0 && (
                        <div className="mt-1">
                            <div className="flex items-baseline justify-between mb-1">
                                <span className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-dark/45">
                                    Milestones
                                </span>
                                <span className="font-data text-[10px] font-bold tabular-nums text-brutal-red">
                                    {milestone_done}/{milestone_total}
                                </span>
                            </div>
                            <div
                                className="h-1.5 bg-brutal-dark/8 rounded-full overflow-hidden"
                                role="progressbar"
                                aria-valuenow={progressPct}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-label="Milestone progress"
                            >
                                <div
                                    className="h-full bg-brutal-red transition-all duration-700 motion-reduce:transition-none"
                                    style={{ width: `${progressPct}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Footer — maker + stats */}
                    <div className="flex items-center justify-between gap-2 pt-3 mt-auto border-t border-brutal-dark/10">
                        <div className="flex items-center gap-2 min-w-0">
                            <div
                                className="w-6 h-6 rounded-full bg-brutal-dark/10 border border-brutal-dark/15
                                           flex-shrink-0 overflow-hidden flex items-center justify-center"
                                aria-hidden
                            >
                                {owner_avatar_url ? (
                                    <img
                                        src={owner_avatar_url}
                                        alt=""
                                        loading="lazy"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <span className="font-data text-[9px] font-bold text-brutal-dark/50">
                                        {(owner_name || '?').slice(0, 1).toUpperCase()}
                                    </span>
                                )}
                            </div>
                            <span className="font-data text-[11px] font-bold text-brutal-dark/70 truncate">
                                {owner_name}
                            </span>
                        </div>

                        <div className="flex items-center gap-2.5 flex-shrink-0 font-data text-[10px] font-bold tabular-nums text-brutal-dark/50">
                            <span className="inline-flex items-center gap-1" aria-label={`${likes} likes`}>
                                <Heart size={11} aria-hidden /> {likes}
                            </span>
                            {video_count > 0 && (
                                <span className="inline-flex items-center gap-1" aria-label={`${video_count} videos`}>
                                    <Video size={11} aria-hidden /> {video_count}
                                </span>
                            )}
                            {member_count > 0 && (
                                <span className="inline-flex items-center gap-1" aria-label={`${member_count} collaborators`}>
                                    <Users size={11} aria-hidden /> {member_count}
                                </span>
                            )}
                            <ArrowRight size={11} className="text-brutal-dark/25" aria-hidden />
                        </div>
                    </div>
                </div>
            </Card>
        </MagneticCard>
    );
}

export const ProjectCard = memo(ProjectCardImpl);
