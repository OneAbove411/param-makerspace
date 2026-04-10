import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { X, ArrowRight, Heart, Bookmark, Video, Users, Target } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { ProjectListItem } from '../../lib/hooks';

/**
 * §8 Archive Cockpit — Quick Peek drawer.
 *
 * A right-anchored modal that gives makers an "information at a glance"
 * view of a project without leaving the archive grid. Keeps them in the
 * browsing flow (Nielsen H3: user control) while honoring H6 (recognition
 * rather than recall) by surfacing everything the card couldn't fit:
 *   • Full summary (unclipped)
 *   • Milestone progress (done/total + bar)
 *   • All tags
 *   • Reaction breakdown (likes / bookmarks / videos / members)
 *   • "Open full page" CTA → /projects/:id
 *
 * Accessibility:
 *   - `role="dialog"` + `aria-modal` + `aria-labelledby` on the heading.
 *   - Focus is moved into the drawer on open; the close button gets
 *     first focus. Previous activeElement is restored on close.
 *   - `Escape` closes. Backdrop click closes. Body scroll is locked.
 *   - `prefers-reduced-motion` disables the slide transition.
 */

export interface ProjectQuickPeekProps {
    project: ProjectListItem | null;
    open: boolean;
    onClose: () => void;
}

export function ProjectQuickPeek({ project, open, onClose }: ProjectQuickPeekProps) {
    const panelRef = useRef<HTMLDivElement>(null);
    const closeBtnRef = useRef<HTMLButtonElement>(null);
    const prevFocusRef = useRef<HTMLElement | null>(null);

    // Lock body scroll + capture/restore focus
    useEffect(() => {
        if (!open) return;
        prevFocusRef.current = document.activeElement as HTMLElement | null;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const t = setTimeout(() => closeBtnRef.current?.focus(), 0);
        return () => {
            document.body.style.overflow = prev;
            clearTimeout(t);
            prevFocusRef.current?.focus?.();
        };
    }, [open]);

    // Escape to close — store onClose in ref to avoid stale closure
    const onCloseRef = useRef(onClose);
    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onCloseRef.current();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open]);

    if (!open || !project) return null;

    const progressPct =
        project.milestone_total > 0
            ? Math.round((project.milestone_done / project.milestone_total) * 100)
            : 0;

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-peek-title"
            className="fixed inset-0 z-[90]"
        >
            {/* Backdrop */}
            <button
                type="button"
                aria-label="Close quick peek"
                onClick={onClose}
                className="absolute inset-0 bg-brutal-dark/50 backdrop-blur-sm motion-reduce:backdrop-blur-none"
            />

            {/* Drawer panel */}
            <div
                ref={panelRef}
                className={cn(
                    'absolute right-0 top-0 bottom-0 w-full sm:w-[440px] max-w-full',
                    'bg-brutal-bg border-l-2 border-brutal-dark',
                    'shadow-[-8px_0_0_0_rgba(196,41,30,0.85)]',
                    'flex flex-col overflow-hidden',
                    'motion-safe:animate-[slideInFromRight_220ms_ease-out]'
                )}
            >
                {/* Header bar */}
                <div className="flex items-center justify-between px-5 py-4 border-b-2 border-brutal-dark/15 bg-brutal-dark/[0.02]">
                    <span className="font-data text-[10px] font-bold uppercase tracking-[0.18em] text-brutal-dark/45">
                        Quick Peek
                    </span>
                    <button
                        ref={closeBtnRef}
                        type="button"
                        onClick={onClose}
                        aria-label="Close quick peek"
                        className={cn(
                            'inline-flex items-center justify-center w-9 h-9 rounded-full',
                            'border-2 border-brutal-dark/15 bg-brutal-bg',
                            'hover:bg-brutal-dark hover:text-brutal-bg hover:border-brutal-dark',
                            'transition-colors duration-150',
                            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brutal-red'
                        )}
                    >
                        <X size={16} aria-hidden />
                    </button>
                </div>

                {/* Scrollable body */}
                <div className="flex-1 overflow-y-auto scrollbar-thin">
                    {/* Hero image */}
                    <div className="relative h-52 bg-brutal-dark overflow-hidden">
                        {project.cover_image_url ? (
                            <img
                                src={project.cover_image_url}
                                alt={project.title}
                                className="w-full h-full object-cover opacity-85"
                            />
                        ) : (
                            <div
                                className="w-full h-full"
                                style={{
                                    backgroundImage:
                                        'radial-gradient(circle, rgba(245,243,238,0.08) 1px, transparent 1px)',
                                    backgroundSize: '20px 20px',
                                }}
                            />
                        )}
                        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-brutal-dark to-transparent" />
                        {project.domain && (
                            <span className="absolute top-4 left-4 inline-flex items-center gap-1 bg-brutal-bg/95 text-brutal-red font-data text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border border-brutal-red/20">
                                #{project.domain}
                            </span>
                        )}
                    </div>

                    {/* Body content */}
                    <div className="p-5 space-y-5">
                        {/* Title + summary */}
                        <div>
                            <h2
                                id="quick-peek-title"
                                className="font-heading font-bold text-2xl leading-tight tracking-tight-heading text-brutal-dark"
                            >
                                {project.title}
                            </h2>
                            <p className="font-data text-[13px] text-brutal-dark/65 mt-2 leading-relaxed">
                                {project.summary || 'No summary yet.'}
                            </p>
                        </div>

                        {/* Owner */}
                        <div className="flex items-center gap-3 pt-1">
                            <div
                                className="w-8 h-8 rounded-full bg-brutal-dark/10 border border-brutal-dark/15 flex-shrink-0 overflow-hidden flex items-center justify-center"
                                aria-hidden
                            >
                                {project.owner_avatar_url ? (
                                    <img
                                        src={project.owner_avatar_url}
                                        alt=""
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <span className="font-data text-[10px] font-bold text-brutal-dark/50">
                                        {(project.owner_name || '?').slice(0, 1).toUpperCase()}
                                    </span>
                                )}
                            </div>
                            <div className="min-w-0">
                                <div className="font-data text-[11px] text-brutal-dark/45 uppercase tracking-widest font-bold">
                                    Maker
                                </div>
                                <div className="font-data text-sm font-bold text-brutal-dark truncate">
                                    {project.owner_name || 'Unknown'}
                                </div>
                            </div>
                        </div>

                        {/* Milestone progress */}
                        {project.milestone_total > 0 && (
                            <div className="rounded-xl border-2 border-brutal-dark/10 bg-brutal-dark/[0.02] p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="inline-flex items-center gap-1.5 font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/55">
                                        <Target size={12} aria-hidden className="text-brutal-red" />
                                        Milestones
                                    </span>
                                    <span className="font-data text-[11px] font-bold tabular-nums text-brutal-red">
                                        {project.milestone_done}/{project.milestone_total} · {progressPct}%
                                    </span>
                                </div>
                                <div
                                    className="h-2 bg-brutal-dark/10 rounded-full overflow-hidden"
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

                        {/* Tags */}
                        {project.tags.length > 0 && (
                            <div>
                                <div className="font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/45 mb-2">
                                    Tags
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {project.tags.map((t) => (
                                        <span
                                            key={t}
                                            className="font-data text-[10px] font-bold uppercase tracking-wider text-brutal-dark/60 bg-brutal-dark/[0.04] border border-brutal-dark/10 px-2 py-0.5 rounded-full"
                                        >
                                            {t}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Reaction stat tiles */}
                        <div className="grid grid-cols-2 gap-2">
                            <StatTile icon={Heart} label="Likes" value={project.likes} />
                            <StatTile icon={Bookmark} label="Bookmarks" value={project.bookmarks} />
                            <StatTile icon={Video} label="Videos" value={project.video_count} />
                            {project.member_count > 0 && (
                                <StatTile icon={Users} label="Collaborators" value={project.member_count} />
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer CTA */}
                <div className="border-t-2 border-brutal-dark/15 p-4 bg-brutal-dark/[0.02]">
                    <Link
                        to={`/projects/${project.id}`}
                        onClick={onClose}
                        className={cn(
                            'flex items-center justify-center gap-2 w-full',
                            'bg-brutal-dark text-brutal-bg font-heading font-bold uppercase tracking-widest text-sm',
                            'px-6 py-3 rounded-full border-2 border-brutal-dark min-h-[44px]',
                            'shadow-[4px_4px_0_0_rgba(196,41,30,0.85)]',
                            'hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[5px_5px_0_0_rgba(196,41,30,0.95)]',
                            'active:translate-x-[1px] active:translate-y-[1px] active:shadow-[3px_3px_0_0_rgba(196,41,30,0.7)]',
                            'transition-all duration-150 motion-reduce:transition-none motion-reduce:transform-none',
                            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brutal-red'
                        )}
                    >
                        Open Full Project
                        <ArrowRight size={16} aria-hidden />
                    </Link>
                </div>
            </div>
        </div>
    );
}

interface StatTileProps {
    icon: React.ComponentType<{ size?: number; className?: string; 'aria-hidden'?: boolean }>;
    label: string;
    value: number;
}

function StatTile({ icon: Icon, label, value }: StatTileProps) {
    return (
        <div
            className="rounded-xl border border-brutal-dark/10 bg-brutal-bg p-3 flex items-center justify-between"
            role="status"
            aria-label={`${label}: ${value}`}
        >
            <div className="flex items-center gap-2">
                <Icon size={14} className="text-brutal-red" aria-hidden />
                <span className="font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/55">
                    {label}
                </span>
            </div>
            <span className="font-heading font-bold text-lg tabular-nums text-brutal-dark">
                {value}
            </span>
        </div>
    );
}
