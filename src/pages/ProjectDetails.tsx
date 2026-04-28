import React, { useState, useEffect, useRef, memo, useMemo, useCallback } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router';
import { useProject, useReaction, useComments, useProjectMakes } from '../lib/hooks';
import { useAuth } from '../lib/auth';
import { toast } from '../lib/toast';
import { RemixModal } from '../components/project/RemixModal';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
    ArrowLeft,
    Play,
    Loader2,
    Heart,
    Bookmark,
    Share2,
    GitFork,
    MessageCircle,
    CheckCircle2,
    ExternalLink,
    Sparkles,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Download,
    Package,
    Target,
    FileText,
    Info,
    Clock,
    Layers,
    Tag as TagIcon,
    Users as UsersIcon,
} from 'lucide-react';
import { getEmbedUrl, getYoutubeThumbnail } from '../lib/videoUtils';
import { ProjectBomTab } from '../components/project/ProjectBomTab';
import { ProjectFilesTab } from '../components/project/ProjectFilesTab';
import { ProjectMakesTab } from '../components/project/ProjectMakesTab';
import CommentThread from '../components/shared/CommentThread';
import { cn } from '../lib/utils';
import { WhatsNextClosure } from '../components/shared/WhatsNextClosure';
import { zeroCTA } from '../lib/zeroCTA';

gsap.registerPlugin(ScrollTrigger);

// ─────────────────────────────────────────────────────────────────────────────
// §9 Project Details — Refined Experience (v3)
//
// Research-backed layout (sources cited in UI_UX audit):
//  • Content-first tab order: Overview → Build Steps → Visual BOM → Files
//  • WCAG AA hero overlay (W3C SC 1.4.3; WebAIM 83.6% of sites fail contrast)
//  • Single primary CTA per screen (SubUX button hierarchy)
//  • Scroll-spy section nav replaces duplicated social-action sidebar
//  • 3-font system: Space Grotesk / Inter / Space Mono (2026 dev-tool default)
//  • Progressive disclosure (accordions) for dense content (Mobbin / IxDF)
//  • Mobile sticky bottom action bar in thumb zone (UX Movement)
//  • prefers-reduced-motion respected on all scroll animations
// ─────────────────────────────────────────────────────────────────────────────

type ContentTab = 'overview' | 'steps' | 'bom' | 'files';

// ─── Skeleton ──────────────────────────────────────────────────────────────

function DetailsSkeleton() {
    return (
        <div className="flex-1 w-full bg-brutal-bg min-h-screen">
            <div className="h-[48vh] bg-brutal-dark/5 animate-pulse" />
            <div className="max-w-6xl mx-auto px-6 md:px-10 py-10">
                <div className="h-12 w-64 bg-brutal-dark/5 rounded animate-pulse mb-6" />
                <div className="h-[400px] bg-brutal-dark/5 rounded-2xl animate-pulse" />
            </div>
        </div>
    );
}

// ─── LazyVideo ────────────────────────────────────────────────────────────

const LazyVideo = memo(function LazyVideo({
    vid,
    playing,
    onPlay,
}: {
    vid: { id: string; title: string | null; video_url: string };
    playing: boolean;
    onPlay: () => void;
}) {
    const [iframeLoading, setIframeLoading] = useState(false);
    const thumb = getYoutubeThumbnail(vid.video_url);

    if (playing) {
        return (
            <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-brutal-dark/10 bg-brutal-dark">
                {iframeLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-brutal-dark/60 z-10">
                        <Loader2 className="w-8 h-8 animate-spin text-brutal-bg" />
                    </div>
                )}
                <iframe
                    title={vid.title || 'Project video'}
                    src={getEmbedUrl(vid.video_url)}
                    onLoad={() => setIframeLoading(false)}
                    className="absolute inset-0 w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                />
            </div>
        );
    }

    return (
        <button
            type="button"
            onClick={() => { setIframeLoading(true); onPlay(); }}
            aria-label={`Play video: ${vid.title || 'Project video'}`}
            className="relative w-full aspect-video rounded-xl overflow-hidden border border-brutal-dark/10 bg-brutal-dark group block"
        >
            {thumb && (
                <img
                    src={thumb}
                    alt={vid.title || ''}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                />
            )}
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-brutal-red flex items-center justify-center
                                shadow-[3px_3px_0_0_rgba(196,41,30,0.12)] group-hover:scale-110 transition-transform">
                    <Play size={22} className="text-brutal-bg fill-brutal-bg ml-0.5" />
                </div>
            </div>
        </button>
    );
});

// ─── StorySection — scroll-triggered reveal wrapper ──────────────────────

function StorySection({
    children,
    className,
    id,
}: {
    children: React.ReactNode;
    className?: string;
    id?: string;
}) {
    return (
        <section id={id} className={cn('story-section', className)}>
            {children}
        </section>
    );
}

// ─── Accordion — progressive disclosure (Mobbin / IxDF) ──────────────────

function Accordion({
    title,
    subtitle,
    badge,
    defaultOpen = false,
    index,
    complete,
    children,
}: {
    title: React.ReactNode;
    subtitle?: React.ReactNode;
    badge?: React.ReactNode;
    defaultOpen?: boolean;
    index?: number;
    complete?: boolean;
    children: React.ReactNode;
}) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div
            className={cn(
                'rounded-2xl border-2 bg-brutal-bg transition-colors',
                open ? 'border-brutal-red/40 shadow-[4px_4px_0_0_rgba(196,41,30,0.12)]' : 'border-brutal-dark/15 hover:border-brutal-dark/30',
            )}
        >
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                className="w-full flex items-center gap-3 px-4 py-3 text-left"
            >
                {typeof index === 'number' && (
                    <div
                        className={cn(
                            'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 font-heading font-bold text-xs',
                            complete ? 'bg-brutal-red text-brutal-bg' : 'bg-brutal-dark/[0.06] text-brutal-dark/50',
                        )}
                    >
                        {complete ? <CheckCircle2 size={14} /> : index + 1}
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <div className={cn(
                        'font-heading font-bold text-[13px] uppercase tracking-tight leading-snug',
                        complete ? 'text-brutal-dark/45 line-through' : 'text-brutal-dark',
                    )}>
                        {title}
                    </div>
                    {subtitle && (
                        <div className="font-body text-[11px] text-brutal-dark/50 mt-0.5 truncate">
                            {subtitle}
                        </div>
                    )}
                </div>
                {badge}
                <ChevronDown
                    size={16}
                    className={cn(
                        'text-brutal-dark/40 flex-shrink-0 transition-transform duration-300',
                        open && 'rotate-180 text-brutal-red',
                    )}
                />
            </button>
            {open && (
                <div className="pd-accordion-panel px-4 pb-4 pt-1 border-t border-brutal-dark/10">
                    {children}
                </div>
            )}
        </div>
    );
}

// ─── Community Remixes Carousel ─────────────────────────────────────────

function RemixesCarousel({ projectId }: { projectId: string }) {
    const { data: makes, loading } = useProjectMakes(projectId);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const updateScrollButtons = () => {
        const el = scrollRef.current;
        if (!el) return;
        setCanScrollLeft(el.scrollLeft > 4);
        setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    };

    useEffect(() => {
        updateScrollButtons();
        const el = scrollRef.current;
        if (el) el.addEventListener('scroll', updateScrollButtons, { passive: true });
        return () => { el?.removeEventListener('scroll', updateScrollButtons); };
    }, [makes]);

    const scroll = (dir: 'left' | 'right') => {
        const el = scrollRef.current;
        if (!el) return;
        const amount = el.clientWidth * 0.7;
        el.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
    };

    if (loading) return <div className="py-6 text-center text-brutal-dark/30 font-data text-xs">Loading remixes…</div>;
    if (!makes || makes.length === 0) return null;

    return (
        <div className="relative">
            <div className="flex items-center justify-between mb-3">
                <h3 className="font-heading font-bold text-xs uppercase tracking-widest text-brutal-dark/60">
                    Community Remixes
                </h3>
                <div className="flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={() => scroll('left')}
                        disabled={!canScrollLeft}
                        aria-label="Scroll left"
                        className={cn(
                            'w-8 h-8 rounded-full border border-brutal-dark/15 flex items-center justify-center transition-all',
                            canScrollLeft ? 'hover:border-brutal-red hover:text-brutal-red text-brutal-dark/45' : 'opacity-30 cursor-default',
                        )}
                    >
                        <ChevronLeft size={14} />
                    </button>
                    <button
                        type="button"
                        onClick={() => scroll('right')}
                        disabled={!canScrollRight}
                        aria-label="Scroll right"
                        className={cn(
                            'w-8 h-8 rounded-full border border-brutal-dark/15 flex items-center justify-center transition-all',
                            canScrollRight ? 'hover:border-brutal-red hover:text-brutal-red text-brutal-dark/45' : 'opacity-30 cursor-default',
                        )}
                    >
                        <ChevronRight size={14} />
                    </button>
                </div>
            </div>

            <div
                ref={scrollRef}
                className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {makes.map((make) => (
                    <div
                        key={make.id}
                        className="flex-shrink-0 w-[180px] snap-start rounded-2xl border border-brutal-dark/15 bg-brutal-bg overflow-hidden
                                   hover:border-brutal-red/30 hover:shadow-[6px_6px_0_0_rgba(196,41,30,0.18)] transition-all group"
                    >
                        {make.image_url ? (
                            <img
                                src={make.image_url}
                                alt={make.caption}
                                loading="lazy"
                                className="w-full h-[120px] object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                        ) : (
                            <div className="w-full h-[120px] bg-brutal-dark/5 flex items-center justify-center">
                                <Package size={24} className="text-brutal-dark/15" />
                            </div>
                        )}
                        <div className="p-2.5">
                            <div className="flex items-center gap-2 mb-1">
                                {make.user_avatar_url ? (
                                    <img src={make.user_avatar_url} alt={make.user_name} className="w-5 h-5 rounded-full" />
                                ) : (
                                    <div className="w-5 h-5 rounded-full bg-brutal-dark text-brutal-bg font-data text-[8px] font-bold flex items-center justify-center">
                                        {make.user_name?.charAt(0) || '?'}
                                    </div>
                                )}
                                <span className="font-data text-[10px] font-bold text-brutal-dark truncate">
                                    {make.user_name}
                                </span>
                            </div>
                            <p className="font-body text-[11px] text-brutal-dark/55 line-clamp-2 leading-snug">
                                {make.caption || 'Built this project'}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

type NavItem = { key: ContentTab; label: string; icon: React.ReactNode; count?: number };

// ─── Main ──────────────────────────────────────────────────────────────────

export function ProjectDetails() {
    const { id } = useParams();
    const { data: project, loading } = useProject(id);
    const { user } = useAuth();
    const { counts, myReactions, toggle } = useReaction('project', id);
    const {
        comments, totalCount, loading: commentsLoading, sortMode, setSortMode,
        addComment, editComment, deleteComment, toggleCommentLike, togglePin, reportComment,
    } = useComments('project', id);
    const navigate = useNavigate();
    const location = useLocation();
    const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
    const [remixModalOpen, setRemixModalOpen] = useState(false);
    // Content-first default: Overview tab (not Visual BOM).
    const [activeTab, setActiveTab] = useState<ContentTab>('overview');

    const pageRef = useRef<HTMLDivElement>(null);
    const heroImageRef = useRef<HTMLImageElement>(null);
    const contentTopRef = useRef<HTMLDivElement>(null);

    const handleTab = useCallback((k: ContentTab) => {
        setActiveTab(k);
        // Scroll the content top into view (below sticky tab bar)
        if (contentTopRef.current) {
            const rect = contentTopRef.current.getBoundingClientRect();
            const y = window.scrollY + rect.top - 120; // navbar + tab bar offset
            window.scrollTo({ top: y, behavior: 'smooth' });
        }
    }, []);

    const goBack = () => {
        const from = (location.state as any)?.from;
        if (from) navigate(from);
        else if (typeof window !== 'undefined' && window.history.length > 1) navigate(-1);
        else navigate('/projects');
    };

    const handleShare = async () => {
        const url = typeof window !== 'undefined' ? window.location.href : '';
        const title = project?.title || 'Project';
        try {
            if (typeof navigator !== 'undefined' && (navigator as any).share) {
                await (navigator as any).share({ title, url });
                return;
            }
        } catch { /* user cancelled */ }
        try {
            await navigator.clipboard.writeText(url);
            toast.success('Link copied to clipboard.');
        } catch {
            toast.error("Couldn't copy the link.");
        }
    };

    const handleReaction = (type: 'like' | 'bookmark') => {
        if (!user) { navigate('/login'); return; }
        toggle(type);
    };

    const coverImage = useMemo(() => {
        if (!project) return null;
        return project.images?.[0]?.image_url || (project as any).cover_image_url || null;
    }, [project]);

    const milestones = (project?.milestones || []) as any[];
    const milestonesDone = milestones.filter((m: any) => m.is_complete).length;
    const milestonePct = milestones.length > 0
        ? Math.round((milestonesDone / milestones.length) * 100)
        : 0;
    const galleryImages = (project?.images || []).slice(1);
    const videos = project?.videos || [];

    const isLiked = myReactions.includes('like');
    const isBookmarked = myReactions.includes('bookmark');
    const hasFiles = (project?.files?.length || 0) > 0 || !!project?.github_url;

    // ── GSAP: Hero parallax (scroll-based, runs once) ──
    const heroAnimatedRef = useRef(false);
    useEffect(() => {
        if (loading || !project || heroAnimatedRef.current) return;
        heroAnimatedRef.current = true;

        const prefersReduced = typeof window !== 'undefined'
            && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        if (prefersReduced) return;

        // Right pane image parallax — subtle zoom-out + drift on scroll
        if (heroImageRef.current) {
            gsap.fromTo(
                heroImageRef.current,
                { scale: 1.08 },
                {
                    scale: 1,
                    ease: 'none',
                    scrollTrigger: {
                        trigger: '.project-hero',
                        start: 'top top',
                        end: 'bottom top',
                        scrub: 1.2,
                    },
                },
            );
            gsap.to(heroImageRef.current, {
                yPercent: 8,
                ease: 'none',
                scrollTrigger: {
                    trigger: '.project-hero',
                    start: 'top top',
                    end: 'bottom top',
                    scrub: true,
                },
            });
        }
    }, [loading, project]);

    // ── GSAP: Scroll-triggered reveals (re-runs on tab change) ──
    useEffect(() => {
        if (loading || !project) return;

        const prefersReduced = typeof window !== 'undefined'
            && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        if (prefersReduced) {
            gsap.set('.pd-scroll-reveal', { opacity: 1, y: 0 });
            return;
        }

        const ctx = gsap.context(() => {
            // Story section reveals
            gsap.utils.toArray<HTMLElement>('.story-section').forEach((_section) => {
                gsap.fromTo(
                    _section,
                    { y: 24, opacity: 0 },
                    {
                        y: 0,
                        opacity: 1,
                        duration: 0.7,
                        ease: 'power3.out',
                        scrollTrigger: {
                            trigger: _section,
                            start: 'top 85%',
                            toggleActions: 'play none none none',
                        },
                    },
                );
            });

            // Tab content body reveal
            const tabBody = document.querySelector('.pd-tab-fade');
            if (tabBody) {
                gsap.fromTo(
                    tabBody,
                    { y: 16, opacity: 0 },
                    {
                        y: 0,
                        opacity: 1,
                        duration: 0.45,
                        ease: 'power2.out',
                        delay: 0.05,
                    },
                );
            }
        }, pageRef);

        return () => ctx.revert();
    }, [loading, project, activeTab]);

    if (loading) return <DetailsSkeleton />;

    if (!project) {
        const canGoBack = typeof window !== 'undefined' && window.history.length > 1;
        return (
            <div className="flex-1 w-full bg-brutal-bg pt-32 px-12 min-h-screen">
                <div className="max-w-2xl mx-auto text-center py-32">
                    <h1 className="font-heading font-bold text-5xl uppercase tracking-tight-heading text-brutal-dark/20">
                        Project Not Found
                    </h1>
                    <p className="font-body text-sm text-brutal-dark/50 mt-4">
                        This project may have been removed or doesn't exist.
                    </p>
                    <button
                        type="button"
                        onClick={goBack}
                        className="inline-flex items-center gap-2 mt-8 font-heading font-bold text-sm
                                   uppercase text-brutal-dark hover:text-brutal-red transition-colors"
                    >
                        <ArrowLeft size={16} /> {canGoBack ? 'Back' : 'Browse all projects'}
                    </button>
                </div>
            </div>
        );
    }

    const isOwner = user?.id === project.owner_id;

    // ─── Content-first tab order with count badges ────
    const fileCount = (project.files?.length || 0) + (project.github_url ? 1 : 0);
    const tabs: NavItem[] = [
        { key: 'overview', label: 'Overview', icon: <Info size={14} /> },
        { key: 'steps', label: 'Build Steps', icon: <Target size={14} />, count: milestones.length || undefined },
        { key: 'bom', label: 'Visual BOM', icon: <Package size={14} /> },
        { key: 'files', label: 'Files & Code', icon: <FileText size={14} />, count: fileCount || undefined },
    ];

    const shortSummary = project.summary
        || (project.description && project.description.length > 200
            ? project.description.slice(0, 200).trim() + '…'
            : project.description)
        || null;

    return (
        <div ref={pageRef} className="flex-1 w-full bg-brutal-bg min-h-screen pb-24 lg:pb-0">

            {/* Skip to content — visible on focus for keyboard users */}
            <a
                href="#project-content"
                className="sr-only focus:not-sr-only focus:absolute focus:top-20 focus:left-4 focus:z-50
                           focus:px-4 focus:py-2 focus:rounded-lg focus:bg-brutal-red focus:text-brutal-bg
                           focus:font-heading focus:font-bold focus:text-sm focus:uppercase focus:tracking-wider"
            >
                Skip to content
            </a>

            {/* ═══════════════════════════════════════════════════════
                SPLIT HERO — Oryzo-style: Text left (60%) + Image right (40%)
                Content-forward layout with GSAP scroll reveals
            ═══════════════════════════════════════════════════════ */}
            <header className="project-hero relative w-full bg-brutal-dark overflow-hidden">
                <div className="max-w-[1400px] mx-auto flex flex-col lg:flex-row min-h-[60vh] lg:min-h-[75vh]">

                    {/* ── LEFT PANE: Content (60%) ── */}
                    <div className="relative z-10 flex-1 lg:w-[60%] flex flex-col justify-center px-6 md:px-12 lg:px-16 pt-24 pb-10 lg:pb-14">

                        {/* Domain tag */}
                        {project.domain && (
                            <div className="pd-hero-reveal mb-6">
                                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brutal-bg/10 border border-brutal-bg/15">
                                    <span className={cn(
                                        'w-2 h-2 rounded-full',
                                        project.status === 'active' ? 'bg-green-400 animate-pulse' : 'bg-brutal-bg/40',
                                    )} />
                                    <span className="font-data text-[11px] font-bold uppercase tracking-wider text-brutal-bg/80">
                                        {project.domain}
                                    </span>
                                </span>
                            </div>
                        )}

                        {/* Title — large, editorial */}
                        <h1 className="pd-hero-reveal font-heading font-bold text-[clamp(2.2rem,5vw,4.5rem)] uppercase tracking-tight leading-[0.95] text-brutal-bg max-w-2xl">
                            {project.title}
                        </h1>

                        {/* Summary */}
                        {shortSummary && (
                            <p className="pd-hero-reveal mt-5 font-body text-[16px] md:text-[17px] text-brutal-bg/70 leading-relaxed max-w-xl">
                                {shortSummary}
                            </p>
                        )}

                        {/* Metadata grid — replaces old chips */}
                        <div className="pd-hero-reveal mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-xl">
                            {project.tier && (
                                <div>
                                    <div className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-bg/35 mb-0.5">Tier</div>
                                    <div className="font-heading font-bold text-[15px] text-brutal-bg">{project.tier}</div>
                                </div>
                            )}
                            {project.duration && (
                                <div>
                                    <div className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-bg/35 mb-0.5">Duration</div>
                                    <div className="font-heading font-bold text-[15px] text-brutal-bg">{project.duration}</div>
                                </div>
                            )}
                            {project.status && (
                                <div>
                                    <div className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-bg/35 mb-0.5">Status</div>
                                    <div className="font-heading font-bold text-[15px] text-brutal-bg capitalize">{project.status.replace('_', ' ')}</div>
                                </div>
                            )}
                            {milestones.length > 0 && (
                                <div>
                                    <div className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-bg/35 mb-0.5">Progress</div>
                                    <div className="font-heading font-bold text-[15px] text-brutal-bg">{milestonePct}%</div>
                                </div>
                            )}
                        </div>

                        {/* Author + Actions row */}
                        <div className="pd-hero-reveal flex flex-wrap items-center gap-5 mt-8">
                            <Link
                                to={`/makers/${project.owner_id}`}
                                className="flex items-center gap-2.5 group"
                            >
                                <div className="w-10 h-10 rounded-full bg-brutal-bg text-brutal-dark font-heading font-bold flex items-center justify-center text-sm border-2 border-brutal-bg/30 group-hover:border-brutal-bg transition-colors">
                                    {project.ownerName?.charAt(0) || '?'}
                                </div>
                                <div className="leading-tight">
                                    <div className="font-body font-semibold text-sm text-brutal-bg group-hover:text-brutal-red transition-colors">
                                        {project.ownerName}
                                    </div>
                                    <div className="font-data text-[10px] uppercase tracking-widest text-brutal-bg/40">
                                        Maker
                                    </div>
                                </div>
                            </Link>

                            <div className="flex items-center gap-3 text-brutal-bg/60">
                                {(() => {
                                    const c = zeroCTA('likes', counts.likes);
                                    return c.isZero ? null : (
                                        <span className="inline-flex items-center gap-1.5 font-data text-[11px] font-bold tabular-nums">
                                            <Heart size={12} /> {counts.likes}
                                        </span>
                                    );
                                })()}
                                {totalCount > 0 && (
                                    <span className="inline-flex items-center gap-1.5 font-data text-[11px] font-bold tabular-nums">
                                        <MessageCircle size={12} /> {totalCount}
                                    </span>
                                )}
                            </div>

                            {/* Action buttons */}
                            <div className="hidden md:flex items-center gap-2 ml-auto">
                                <button type="button" onClick={() => handleReaction('like')}
                                    className={cn('pd-iconbtn', isLiked && 'pd-iconbtn--active')}
                                    aria-label={isLiked ? 'Unlike' : 'Like'} aria-pressed={isLiked}>
                                    <Heart size={16} className={isLiked ? 'fill-current' : ''} />
                                </button>
                                <button type="button" onClick={() => handleReaction('bookmark')}
                                    className={cn('pd-iconbtn', isBookmarked && 'pd-iconbtn--active')}
                                    aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark'} aria-pressed={isBookmarked}>
                                    <Bookmark size={16} className={isBookmarked ? 'fill-current' : ''} />
                                </button>
                                <button type="button" onClick={handleShare} className="pd-iconbtn" aria-label="Share">
                                    <Share2 size={16} />
                                </button>
                            </div>
                        </div>

                        {/* CTA buttons */}
                        <div className="pd-hero-reveal hidden md:flex items-center gap-3 mt-8">
                            <button
                                type="button"
                                onClick={() => setRemixModalOpen(true)}
                                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl
                                           bg-brutal-red text-brutal-bg font-heading font-bold text-sm uppercase tracking-wider
                                           border-2 border-brutal-red hover:bg-brutal-bg hover:text-brutal-dark hover:border-brutal-bg transition-all
                                           shadow-[4px_4px_0_0_rgba(245,243,238,0.08)]"
                            >
                                <GitFork size={15} /> Remix this project
                            </button>
                            {hasFiles && (
                                <button
                                    type="button"
                                    onClick={() => handleTab('files')}
                                    className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl
                                               font-data text-[11px] font-bold uppercase tracking-wider
                                               border-2 border-brutal-bg/25 text-brutal-bg/80 hover:border-brutal-bg hover:bg-brutal-bg/10
                                               backdrop-blur-sm transition-all"
                                >
                                    <Download size={13} /> Files &amp; Code
                                </button>
                            )}
                        </div>
                    </div>

                    {/* ── RIGHT PANE: Sticky image (40%) ── */}
                    <div className="relative lg:w-[40%] h-[45vh] lg:h-auto lg:sticky lg:top-0 lg:self-stretch overflow-hidden">
                        {coverImage ? (
                            <img
                                ref={heroImageRef}
                                src={coverImage}
                                alt={`${project.title} cover`}
                                className="absolute inset-0 w-full h-full object-cover pd-image-reveal"
                            />
                        ) : (
                            <div
                                className="absolute inset-0 bg-brutal-dark"
                                style={{
                                    backgroundImage: 'radial-gradient(circle, rgba(245,243,238,0.06) 1px, transparent 1px)',
                                    backgroundSize: '28px 28px',
                                }}
                            />
                        )}
                        {/* Subtle left-edge gradient for text legibility on mobile */}
                        <div className="absolute inset-0 bg-gradient-to-r from-brutal-dark/40 via-transparent to-transparent lg:from-brutal-dark/20 pointer-events-none" />
                    </div>
                </div>
            </header>

            {/* ═══════════════════════════════════════════════════════
                STICKY TAB BAR
            ═══════════════════════════════════════════════════════ */}
            <div
                ref={contentTopRef}
                className="sticky top-16 z-30 bg-brutal-bg/95 backdrop-blur-md border-b border-brutal-dark/10"
            >
                <div className="max-w-[1200px] mx-auto px-6 md:px-10">
                    <nav className="pd-tab-scroll flex items-center gap-1 overflow-x-auto no-scrollbar -mx-1 px-1">
                        {tabs.map((tab) => {
                            const isActive = activeTab === tab.key;
                            return (
                                <button
                                    key={tab.key}
                                    type="button"
                                    onClick={() => handleTab(tab.key)}
                                    aria-current={isActive ? 'page' : undefined}
                                    className={cn(
                                        'flex items-center gap-2 px-4 py-3.5 font-data text-[11px] font-bold uppercase tracking-wider',
                                        'transition-colors relative whitespace-nowrap flex-shrink-0',
                                        isActive
                                            ? 'text-brutal-red'
                                            : 'text-brutal-dark/40 hover:text-brutal-dark/70',
                                    )}
                                >
                                    {tab.icon}
                                    {tab.label}
                                    {tab.count != null && (
                                        <span className={cn(
                                            'ml-0.5 font-data text-[9px] font-bold tabular-nums rounded-full px-1.5 py-0.5 min-w-[18px] text-center',
                                            isActive ? 'bg-brutal-red/15 text-brutal-red' : 'bg-brutal-dark/[0.06] text-brutal-dark/40',
                                        )}>
                                            {tab.count}
                                        </span>
                                    )}
                                    <span
                                        className={cn(
                                            'absolute bottom-0 left-2 right-2 h-[2px] rounded-t-full transition-transform duration-300 origin-center',
                                            isActive ? 'bg-brutal-red scale-x-100' : 'bg-transparent scale-x-0',
                                        )}
                                    />
                                </button>
                            );
                        })}
                    </nav>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════
                BODY — Full-width content area
            ═══════════════════════════════════════════════════════ */}
            <div className="max-w-[1200px] mx-auto px-6 md:px-10 min-h-[50vh]">
                <main id="project-content" className="py-10">
                    <div key={activeTab} className="pd-tab-fade">

                    {/* ── OVERVIEW TAB (default) ── */}
                    {activeTab === 'overview' && (
                        <div className="space-y-8">
                            <StorySection id="about">
                                <SectionLabel>About this project</SectionLabel>
                                {project.description ? (
                                    <div className="pd-prose whitespace-pre-wrap max-w-4xl">
                                        {project.description}
                                    </div>
                                ) : project.summary ? (
                                    <div className="pd-prose max-w-4xl">
                                        {project.summary}
                                    </div>
                                ) : (
                                    <p className="font-body text-sm text-brutal-dark/40 italic">
                                        No description yet.
                                    </p>
                                )}
                                {isOwner && project.description && project.description.split(/\s+/).length < 100 && (
                                    <div className="mt-5 inline-flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-brutal-red/[0.05] max-w-4xl">
                                        <Sparkles size={14} className="text-brutal-red flex-shrink-0" />
                                        <p className="font-body text-[13px] text-brutal-dark/60">
                                            Expand your description to help others understand this project —{' '}
                                            <Link to={`/projects/${project.id}/edit`} className="font-semibold text-brutal-red hover:underline">
                                                earn +50 XP
                                            </Link>
                                        </p>
                                    </div>
                                )}
                            </StorySection>

                            {/* ── Built With / Tech Stack (derived from tags) ── */}
                            {project.tags && project.tags.length > 0 && (
                                <StorySection id="built-with">
                                    <SectionLabel>Built with</SectionLabel>
                                    <div className="flex flex-wrap gap-2">
                                        {project.tags.map((t: string) => (
                                            <span
                                                key={t}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                                                           bg-brutal-dark/[0.04] border border-brutal-dark/8
                                                           font-data text-[11px] font-bold text-brutal-dark/70
                                                           hover:border-brutal-red/30 hover:text-brutal-red transition-colors cursor-default"
                                            >
                                                {t}
                                            </span>
                                        ))}
                                    </div>
                                </StorySection>
                            )}

                            {(videos.length > 0 || galleryImages.length > 0) && (
                                <StorySection id="media">
                                    <SectionLabel>Media</SectionLabel>
                                    <div className="space-y-3 max-w-4xl">
                                        {videos.map((vid: any) => (
                                            <LazyVideo
                                                key={vid.id}
                                                vid={vid}
                                                playing={playingVideoId === vid.id}
                                                onPlay={() => setPlayingVideoId(vid.id)}
                                            />
                                        ))}
                                        {galleryImages.length > 0 && (
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                                {galleryImages.map((img: any, i: number) => (
                                                    <div key={i} className="rounded-lg overflow-hidden border border-brutal-dark/10 bg-brutal-dark/5 aspect-[4/3]">
                                                        <img
                                                            src={img.image_url}
                                                            alt={img.caption || 'Gallery'}
                                                            loading="lazy"
                                                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </StorySection>
                            )}

                            {/* Tags section consolidated into "Built With" above */}

                            <StorySection id="makes">
                                <SectionLabel>Community remixes</SectionLabel>
                                <ProjectMakesTab projectId={project.id} />
                            </StorySection>

                            {/* Discussion is part of overview narrative (replaces separate section) */}
                            <StorySection id="discussion">
                                <SectionLabel>
                                    Discussion
                                    {totalCount > 0 && (
                                        <span className="ml-2 tabular-nums font-data text-brutal-dark/40">{totalCount}</span>
                                    )}
                                </SectionLabel>
                                <CommentThread
                                    comments={comments}
                                    totalCount={totalCount}
                                    loading={commentsLoading}
                                    user={user}
                                    sortMode={sortMode}
                                    setSortMode={setSortMode}
                                    addComment={addComment}
                                    editComment={editComment}
                                    deleteComment={deleteComment}
                                    toggleCommentLike={toggleCommentLike}
                                    togglePin={togglePin}
                                    reportComment={reportComment}
                                    isTargetOwner={!!(user && project && (project as any).user_id === user.id)}
                                />
                            </StorySection>
                        </div>
                    )}

                    {/* ── BUILD STEPS TAB ── */}
                    {activeTab === 'steps' && (
                        <StorySection>
                            <SectionLabel>
                                Build steps
                                {milestones.length > 0 && (
                                    <span className="ml-2 tabular-nums font-data text-brutal-dark/40">
                                        {milestonesDone}/{milestones.length}
                                    </span>
                                )}
                            </SectionLabel>

                            {milestones.length > 0 ? (
                                <div className="max-w-3xl space-y-3">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="flex-1 h-1.5 bg-brutal-dark/08 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-brutal-red rounded-full transition-all duration-700"
                                                style={{ width: `${milestonePct}%` }}
                                            />
                                        </div>
                                        <span className="font-heading font-bold text-sm tabular-nums text-brutal-red">
                                            {milestonePct}%
                                        </span>
                                    </div>

                                    {/* Progressive disclosure: each step collapses. First step open by default on desktop. */}
                                    {milestones.map((m: any, i: number) => (
                                        <Accordion
                                            key={m.id}
                                            index={i}
                                            complete={m.is_complete}
                                            defaultOpen={i === 0 && !m.is_complete}
                                            title={m.title}
                                            subtitle={m.description ? m.description.slice(0, 80) + (m.description.length > 80 ? '…' : '') : undefined}
                                        >
                                            {m.description ? (
                                                <div className="pd-prose whitespace-pre-wrap">
                                                    {m.description}
                                                </div>
                                            ) : (
                                                <p className="font-body text-sm text-brutal-dark/40 italic">
                                                    No details for this step yet.
                                                </p>
                                            )}
                                        </Accordion>
                                    ))}
                                </div>
                            ) : (
                                <EmptyState
                                    icon={<Target size={28} className="text-brutal-dark/20" />}
                                    title="No build steps documented yet."
                                    cta={isOwner ? {
                                        label: 'Add build steps',
                                        to: `/projects/${project.id}/edit`,
                                        xp: 50,
                                    } : undefined}
                                />
                            )}
                        </StorySection>
                    )}

                    {/* ── VISUAL BOM TAB ── */}
                    {activeTab === 'bom' && (
                        <StorySection>
                            <SectionLabel>Visual bill of materials</SectionLabel>
                            <div className="rounded-2xl border border-brutal-dark/15 bg-brutal-bg p-4 md:p-5">
                                <ProjectBomTab projectId={project.id} isOwner={isOwner} variant="grid" />
                            </div>
                        </StorySection>
                    )}

                    {/* ── FILES & CODE TAB ── */}
                    {activeTab === 'files' && (
                        <StorySection>
                            <SectionLabel>Files &amp; source code</SectionLabel>
                            <div className="max-w-3xl space-y-4">
                                <div className="rounded-2xl border border-brutal-dark/15 bg-brutal-bg p-4 md:p-5">
                                    <ProjectFilesTab githubUrl={project.github_url} />
                                </div>
                                {project.github_url && (
                                    <a
                                        href={project.github_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-2 rounded-xl border border-brutal-dark/15 bg-brutal-bg px-4 py-2.5
                                                   font-data text-[11px] font-bold uppercase tracking-widest text-brutal-dark/75
                                                   hover:border-brutal-red hover:text-brutal-red transition-all"
                                    >
                                        <ExternalLink size={12} /> View on GitHub
                                    </a>
                                )}
                            </div>
                        </StorySection>
                    )}

                    </div>{/* end pd-tab-fade */}

                    {/* ── REMIXES RAIL + closure (Overview only) ── */}
                    {activeTab === 'overview' && (
                        <>
                            <div className="mt-16 pt-8 border-t border-brutal-dark/10">
                                <RemixesCarousel projectId={project.id} />
                            </div>
                            <div className="mt-12">
                                <WhatsNextClosure variant="project" />
                            </div>
                        </>
                    )}
                </main>
            </div>

            {/* ═══════════════════════════════════════════════════════
                MOBILE STICKY BOTTOM ACTION BAR (thumb zone)
            ═══════════════════════════════════════════════════════ */}
            <div className="pd-mobile-bar">
                <button
                    type="button"
                    onClick={() => setRemixModalOpen(true)}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                               bg-brutal-red text-brutal-bg font-heading font-bold text-[13px] uppercase tracking-wider
                               shadow-[2px_2px_0_0_rgba(17,17,17,0.1)] active:scale-[0.98] transition-transform"
                >
                    <GitFork size={14} /> Remix
                </button>
                <button
                    type="button"
                    onClick={() => handleReaction('like')}
                    className={cn('pd-iconbtn pd-iconbtn--light', isLiked && 'pd-iconbtn--active')}
                    aria-label={isLiked ? 'Unlike' : 'Like'}
                    aria-pressed={isLiked}
                >
                    <Heart size={16} className={isLiked ? 'fill-current' : ''} />
                </button>
                <button
                    type="button"
                    onClick={() => handleReaction('bookmark')}
                    className={cn('pd-iconbtn pd-iconbtn--light', isBookmarked && 'pd-iconbtn--active')}
                    aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
                    aria-pressed={isBookmarked}
                >
                    <Bookmark size={16} className={isBookmarked ? 'fill-current' : ''} />
                </button>
                <button
                    type="button"
                    onClick={handleShare}
                    className="pd-iconbtn pd-iconbtn--light"
                    aria-label="Share"
                >
                    <Share2 size={16} />
                </button>
            </div>

            {/* ═══════════════════════════════════════════════════════
                MODALS
            ═══════════════════════════════════════════════════════ */}
            <RemixModal
                open={remixModalOpen}
                origin={project ? {
                    ...project,
                    cover_image_url: coverImage,
                    owner_name: project.ownerName,
                    tags: project.tags,
                    milestone_total: milestones.length,
                    milestone_done: milestonesDone,
                    likes: counts.likes,
                    bookmarks: counts.bookmarks || 0,
                    video_count: videos.length,
                    member_count: project.members?.length || 0,
                } as any : null}
                onClose={() => setRemixModalOpen(false)}
            />
        </div>
    );
}

// ─── Helper components ────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <h2 className="font-heading font-bold text-[15px] uppercase tracking-tight text-brutal-dark/75 mb-5">
            {children}
        </h2>
    );
}

function EmptyState({
    icon,
    title,
    cta,
}: {
    icon: React.ReactNode;
    title: string;
    cta?: { label: string; to: string; xp?: number };
}) {
    return (
        <div className="text-center py-14 rounded-2xl border border-dashed border-brutal-dark/15 bg-brutal-bg/50">
            <div className="mx-auto mb-3 flex justify-center">{icon}</div>
            <p className="font-body text-sm text-brutal-dark/45">{title}</p>
            {cta && (
                <Link
                    to={cta.to}
                    className="inline-flex items-center gap-1.5 mt-4 font-data text-[11px] font-bold uppercase tracking-wider text-brutal-red hover:text-brutal-dark transition-colors"
                >
                    <CheckCircle2 size={12} />
                    {cta.label} {cta.xp && <span className="text-brutal-red/60">(+{cta.xp} XP)</span>}
                </Link>
            )}
        </div>
    );
}
