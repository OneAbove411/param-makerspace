import React, { useState, useEffect, useRef, memo, useMemo } from 'react';
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
    Image as ImageIcon,
    Video as VideoIcon,
    Users,
    CheckCircle2,
    ExternalLink,
    Zap,
    Sparkles,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Download,
    Package,
    Target,
    FileText,
} from 'lucide-react';
import { getEmbedUrl, getYoutubeThumbnail } from '../lib/videoUtils';
import { ProjectBomTab } from '../components/project/ProjectBomTab';
import { ProjectFilesTab } from '../components/project/ProjectFilesTab';
import { ProjectMakesTab } from '../components/project/ProjectMakesTab';
import CommentThread from '../components/shared/CommentThread';
import { cn } from '../lib/utils';
import { XpRewardBadge } from '../components/ui/XpRewardBadge';
import { XP_REWARDS, RANK_THRESHOLDS, RANK_ORDER } from '../lib/constants';
import { XPProgressStrip } from '../components/shared/XPProgressStrip';
import { WhatsNextClosure } from '../components/shared/WhatsNextClosure';
import { zeroCTA } from '../lib/zeroCTA';

gsap.registerPlugin(ScrollTrigger);

// ─────────────────────────────────────────────────────────────────────────────
// §9 Project Cockpit — "Scrolling Story" redesign v2
//
// Inspired by reference UI: full-width hero with accent-color title,
// tabbed content area (Visual BOM / Build Steps / Overview & Files),
// bottom section with Project Stats (contribution meter) + Community Remixes
// carousel. Scroll-triggered animations throughout.
// ─────────────────────────────────────────────────────────────────────────────

type ContentTab = 'bom' | 'milestones' | 'overview';

// ─── Skeleton ──────────────────────────────────────────────────────────────

function DetailsSkeleton() {
    return (
        <div className="flex-1 w-full bg-brutal-bg min-h-screen">
            <div className="h-[55vh] bg-brutal-dark/5 animate-pulse" />
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

// ─── Section wrapper — scroll-triggered reveal ──────────────────────────

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

    if (loading) return <div className="py-8 text-center text-brutal-dark/30 font-data text-sm">Loading remixes...</div>;
    if (!makes || makes.length === 0) return null;

    return (
        <div className="relative">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading font-bold text-sm uppercase tracking-widest text-brutal-dark/70">
                    Community Remixes
                </h3>
                <div className="flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={() => scroll('left')}
                        disabled={!canScrollLeft}
                        className={cn(
                            'w-8 h-8 rounded-full border-2 border-brutal-dark/10 flex items-center justify-center transition-all',
                            canScrollLeft ? 'hover:border-brutal-red hover:text-brutal-red text-brutal-dark/40' : 'opacity-30 cursor-default',
                        )}
                    >
                        <ChevronLeft size={14} />
                    </button>
                    <button
                        type="button"
                        onClick={() => scroll('right')}
                        disabled={!canScrollRight}
                        className={cn(
                            'w-8 h-8 rounded-full border-2 border-brutal-dark/10 flex items-center justify-center transition-all',
                            canScrollRight ? 'hover:border-brutal-red hover:text-brutal-red text-brutal-dark/40' : 'opacity-30 cursor-default',
                        )}
                    >
                        <ChevronRight size={14} />
                    </button>
                </div>
            </div>

            {/* Scrollable row */}
            <div
                ref={scrollRef}
                className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {makes.map((make) => (
                    <div
                        key={make.id}
                        className="flex-shrink-0 w-[180px] snap-start rounded-2xl border-2 border-brutal-dark/20 bg-brutal-bg overflow-hidden
                                   hover:border-brutal-red/30 hover:shadow-[8px_8px_0_0_rgba(196,41,30,0.24)] transition-all group"
                    >
                        {make.image_url ? (
                            <img
                                src={make.image_url}
                                alt={make.caption}
                                loading="lazy"
                                className="w-full h-[130px] object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                        ) : (
                            <div className="w-full h-[130px] bg-brutal-dark/5 flex items-center justify-center">
                                <Package size={24} className="text-brutal-dark/15" />
                            </div>
                        )}
                        <div className="p-2.5">
                            <div className="flex items-center gap-2 mb-1.5">
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
                            <p className="font-data text-[10px] text-brutal-dark/50 line-clamp-2 leading-relaxed">
                                {make.caption || 'Built this project'}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

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
    const [activeTab, setActiveTab] = useState<ContentTab>('bom');

    const pageRef = useRef<HTMLDivElement>(null);
    const heroImageRef = useRef<HTMLImageElement>(null);

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

    // ── XP contribution meter calculation ────────────────────────
    const xpEarned = useMemo(() => {
        if (!project) return 0;
        let xp = 0;
        if (project.status === 'active') xp += XP_REWARDS.project_active;
        else if (project.status !== 'draft') xp += XP_REWARDS.project_approved;
        return xp;
    }, [project]);

    const xpPotential = XP_REWARDS.project_active; // max possible for a project

    // ── GSAP ScrollTrigger animations ────────────────────────────
    useEffect(() => {
        if (loading || !project) return;

        const prefersReduced = typeof window !== 'undefined'
            && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        if (prefersReduced) return;

        const ctx = gsap.context(() => {
            // Hero parallax — image moves slower than scroll
            if (heroImageRef.current) {
                gsap.to(heroImageRef.current, {
                    yPercent: 20,
                    ease: 'none',
                    scrollTrigger: {
                        trigger: '.project-hero',
                        start: 'top top',
                        end: 'bottom top',
                        scrub: true,
                    },
                });
            }

            // Scroll indicator bounce
            gsap.to('.scroll-indicator', {
                y: 8,
                duration: 1.2,
                repeat: -1,
                yoyo: true,
                ease: 'power1.inOut',
            });

            // Fade-in + slide-up for each story section
            gsap.utils.toArray<HTMLElement>('.story-section').forEach((_section) => {
                gsap.fromTo(
                    _section,
                    { y: 40, opacity: 0 },
                    {
                        y: 0,
                        opacity: 1,
                        duration: 0.8,
                        ease: 'power3.out',
                        scrollTrigger: {
                            trigger: _section,
                            start: 'top 85%',
                            toggleActions: 'play none none none',
                        },
                    },
                );
            });

            // Tab content card entrance
            gsap.fromTo('.tab-content-area', { opacity: 0, y: 20 }, {
                opacity: 1, y: 0, duration: 0.5, ease: 'power2.out',
                scrollTrigger: { trigger: '.tab-content-area', start: 'top 90%' },
            });
        }, pageRef);

        return () => ctx.revert();
    }, [loading, project]);

    if (loading) return <DetailsSkeleton />;

    if (!project) {
        const canGoBack = typeof window !== 'undefined' && window.history.length > 1;
        return (
            <div className="flex-1 w-full bg-brutal-bg pt-32 px-12 min-h-screen">
                <div className="max-w-2xl mx-auto text-center py-32">
                    <h1 className="font-heading font-bold text-5xl uppercase tracking-tight-heading text-brutal-dark/20">
                        Project Not Found
                    </h1>
                    <p className="font-data text-sm text-brutal-dark/40 mt-4">
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

    // ─── Tab definitions ─────────────────────────────────────────
    const tabs: { key: ContentTab; label: string; icon: React.ReactNode }[] = [
        { key: 'bom', label: 'Visual BOM', icon: <Package size={14} /> },
        { key: 'milestones', label: 'Build Steps', icon: <Target size={14} /> },
        { key: 'overview', label: 'Overview & Files', icon: <FileText size={14} /> },
    ];

    return (
        <div ref={pageRef} className="flex-1 w-full bg-brutal-bg min-h-screen">

            {/* ═══════════════════════════════════════════════════════
                HERO — Full-width cover with overlaid identity
            ═══════════════════════════════════════════════════════ */}
            <div className="project-hero relative w-full h-[40vh] md:h-[45vh] overflow-hidden bg-brutal-dark">
                {/* Parallax cover image */}
                {coverImage ? (
                    <img
                        ref={heroImageRef}
                        src={coverImage}
                        alt={`${project.title} cover`}
                        className="absolute inset-0 w-full h-[120%] object-cover opacity-60"
                    />
                ) : (
                    <div
                        className="absolute inset-0"
                        style={{
                            backgroundImage: 'radial-gradient(circle, rgba(245,243,238,0.06) 1px, transparent 1px)',
                            backgroundSize: '28px 28px',
                        }}
                    />
                )}

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-brutal-dark via-brutal-dark/50 to-transparent" />


                {/* Hero content (bottom) */}
                <div className="absolute bottom-0 inset-x-0 px-6 md:px-10 lg:px-16 pb-10 z-10">
                    <div className="max-w-6xl mx-auto">
                        {/* Title — clean uppercase, matches projects listing */}
                        <h1 className="font-heading font-bold text-3xl md:text-4xl lg:text-5xl uppercase tracking-tight leading-[1.05] text-brutal-bg max-w-3xl">
                            {project.title}
                        </h1>

                        {/* Owner + status row */}
                        <div className="flex flex-wrap items-center gap-3 mt-4">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-brutal-bg text-brutal-dark font-heading font-bold flex items-center justify-center text-sm border-2 border-brutal-bg/30">
                                    {project.ownerName?.charAt(0) || '?'}
                                </div>
                                <span className="font-data text-[12px] font-bold text-brutal-bg">
                                    {project.ownerName}
                                </span>
                            </div>
                            {project.status && (
                                <span className={cn(
                                    'inline-flex px-2.5 py-1 font-data text-[10px] font-bold uppercase tracking-widest rounded-full',
                                    project.status === 'active' ? 'bg-green-500/20 text-green-300' :
                                        project.status === 'pending_review' ? 'bg-yellow-500/20 text-yellow-300' :
                                            'bg-brutal-bg/20 text-brutal-bg/70',
                                )}>
                                    {project.status.replace('_', ' ')}
                                </span>
                            )}
                        </div>

                        {/* XP Progress Strip */}
                        <div className="mt-3">
                            <XPProgressStrip />
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 mt-5 flex-wrap overflow-x-auto no-scrollbar pb-1">
                            {(project.files?.length || 0) > 0 && (
                                <button
                                    type="button"
                                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl
                                               bg-brutal-red text-brutal-bg font-data text-[11px] font-bold uppercase tracking-wider
                                               border-2 border-brutal-red hover:bg-brutal-bg hover:text-brutal-dark hover:border-brutal-bg transition-all"
                                >
                                    <Download size={13} /> Download Files
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => setRemixModalOpen(true)}
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl
                                           font-data text-[11px] font-bold uppercase tracking-wider
                                           border-2 border-brutal-bg/40 text-brutal-bg/90 hover:border-brutal-bg hover:text-brutal-bg
                                           backdrop-blur-sm transition-all"
                            >
                                <GitFork size={13} /> Remix
                            </button>
                            <button
                                type="button"
                                onClick={() => handleReaction('like')}
                                className={cn(
                                    'inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl font-data text-[11px] font-bold uppercase tracking-wider border-2 transition-all backdrop-blur-sm',
                                    isLiked
                                        ? 'bg-brutal-red text-brutal-bg border-brutal-red'
                                        : 'border-brutal-bg/30 text-brutal-bg/80 hover:border-brutal-bg',
                                )}
                            >
                                <Heart size={12} className={isLiked ? 'fill-current' : ''} />
                                {(() => {
                                    const lCTA = zeroCTA('likes', counts.likes);
                                    return lCTA.isZero ? null : counts.likes;
                                })()}
                            </button>
                            <button
                                type="button"
                                onClick={() => handleReaction('bookmark')}
                                className={cn(
                                    'inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl font-data text-[11px] font-bold uppercase tracking-wider border-2 transition-all backdrop-blur-sm',
                                    isBookmarked
                                        ? 'bg-brutal-red text-brutal-bg border-brutal-red'
                                        : 'border-brutal-bg/30 text-brutal-bg/80 hover:border-brutal-bg',
                                )}
                            >
                                <Bookmark size={12} className={isBookmarked ? 'fill-current' : ''} />
                            </button>
                            <button
                                type="button"
                                onClick={handleShare}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl font-data text-[11px] font-bold uppercase tracking-wider border-2 border-brutal-bg/30 text-brutal-bg/80 hover:border-brutal-bg transition-all backdrop-blur-sm"
                            >
                                <Share2 size={12} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Scroll indicator */}
                <div className="scroll-indicator absolute bottom-3 left-1/2 -translate-x-1/2 z-10">
                    <ChevronDown size={18} className="text-brutal-bg/30" />
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════
                MOBILE INFO STRIP — shown below hero on <lg screens
                Surfaces sidebar content that is hidden on mobile.
            ═══════════════════════════════════════════════════════ */}
            <div className="lg:hidden bg-brutal-bg border-b-2 border-brutal-dark/10">
                <div className="px-4 py-4 space-y-3">
                    {/* Owner + contribution XP */}
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-brutal-dark text-brutal-bg font-heading font-bold flex items-center justify-center text-xs border-2 border-brutal-dark flex-shrink-0">
                                {project.ownerName?.charAt(0) || '?'}
                            </div>
                            <div>
                                <span className="font-data text-[11px] font-bold text-brutal-dark block leading-tight">{project.ownerName}</span>
                                {project.domain && (
                                    <span className="font-data text-[9px] text-brutal-dark/40 uppercase tracking-wider">{project.domain}</span>
                                )}
                            </div>
                        </div>
                        <div className="rounded-xl border border-brutal-dark/10 bg-brutal-dark/[0.02] px-3 py-2 text-right flex-shrink-0">
                            <span className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-dark/40 block">Contribution</span>
                            <span className="font-heading font-bold text-sm text-brutal-red">+{xpEarned} XP</span>
                        </div>
                    </div>

                    {/* Progress bar (if milestones exist) */}
                    {milestones.length > 0 && (
                        <div className="rounded-xl border border-brutal-dark/10 bg-brutal-dark/[0.02] px-3 py-2.5 space-y-1.5">
                            <div className="flex items-center justify-between">
                                <span className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-dark/40">Build Progress</span>
                                <span className="font-heading font-bold text-xs text-brutal-red tabular-nums">{milestonePct}%</span>
                            </div>
                            <div className="h-1.5 bg-brutal-dark/10 rounded-full overflow-hidden border border-brutal-dark/15">
                                <div className="h-full bg-brutal-red rounded-full transition-all duration-700" style={{ width: `${milestonePct}%` }} />
                            </div>
                        </div>
                    )}

                    {/* Stats row */}
                    <div className="grid grid-cols-4 gap-2">
                        <div className="rounded-xl border border-brutal-dark/10 bg-brutal-dark/[0.02] p-2 text-center">
                            <Heart size={11} className="mx-auto text-brutal-red mb-0.5" />
                            <span className="font-heading font-bold text-sm tabular-nums text-brutal-dark block leading-none">{counts.likes}</span>
                            <span className="font-data text-[8px] font-bold uppercase tracking-widest text-brutal-dark/40">Likes</span>
                        </div>
                        <div className="rounded-xl border border-brutal-dark/10 bg-brutal-dark/[0.02] p-2 text-center">
                            <MessageCircle size={11} className="mx-auto text-brutal-red mb-0.5" />
                            <span className="font-heading font-bold text-sm tabular-nums text-brutal-dark block leading-none">{totalCount}</span>
                            <span className="font-data text-[8px] font-bold uppercase tracking-widest text-brutal-dark/40">Comments</span>
                        </div>
                        <div className="rounded-xl border border-brutal-dark/10 bg-brutal-dark/[0.02] p-2 text-center">
                            <ImageIcon size={11} className="mx-auto text-brutal-red mb-0.5" />
                            <span className="font-heading font-bold text-sm tabular-nums text-brutal-dark block leading-none">{project.images?.length || 0}</span>
                            <span className="font-data text-[8px] font-bold uppercase tracking-widest text-brutal-dark/40">Photos</span>
                        </div>
                        <div className="rounded-xl border border-brutal-dark/10 bg-brutal-dark/[0.02] p-2 text-center">
                            <VideoIcon size={11} className="mx-auto text-brutal-red mb-0.5" />
                            <span className="font-heading font-bold text-sm tabular-nums text-brutal-dark block leading-none">{videos.length}</span>
                            <span className="font-data text-[8px] font-bold uppercase tracking-widest text-brutal-dark/40">Videos</span>
                        </div>
                    </div>

                    {/* Remix CTA */}
                    <button
                        type="button"
                        onClick={() => setRemixModalOpen(true)}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border-2 border-brutal-dark/15 bg-transparent font-data text-[10px] font-bold uppercase tracking-wider text-brutal-dark/60 hover:border-brutal-red hover:text-brutal-red hover:bg-brutal-red/[0.03] transition-all"
                    >
                        <GitFork size={12} /> Remix This Project
                    </button>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════
                TWO-COLUMN LAYOUT — Sidebar + Tabbed Content
                Mirrors the Projects listing page structure.
            ═══════════════════════════════════════════════════════ */}
            <div className="flex min-h-[60vh]">

                {/* ── LEFT SIDEBAR (sticky, hidden <lg) ─────────────── */}
                <aside className="hidden lg:block w-64 flex-shrink-0 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto bg-brutal-bg px-4 py-5 space-y-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">

                    {/* Sidebar card container — mirrors dashboard cockpit */}
                    <div className="rounded-2xl border-2 border-brutal-dark/15 bg-brutal-bg p-4 shadow-[6px_6px_0_0_rgba(20,20,20,0.08)] space-y-4">

                    {/* Owner identity */}
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-brutal-dark text-brutal-bg font-heading font-bold flex items-center justify-center text-xs border-2 border-brutal-dark">
                            {project.ownerName?.charAt(0) || '?'}
                        </div>
                        <div>
                            <span className="font-data text-[11px] font-bold text-brutal-dark block leading-tight">{project.ownerName}</span>
                            {project.domain && (
                                <span className="font-data text-[9px] text-brutal-dark/40 uppercase tracking-wider">{project.domain}</span>
                            )}
                        </div>
                    </div>

                    {/* Contribution Meter */}
                    <div className="rounded-xl border border-brutal-dark/10 bg-brutal-dark/[0.02] p-3 space-y-2.5">
                        <div className="flex items-center justify-between">
                            <span className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-dark/40">
                                Contribution
                            </span>
                            <span className="font-heading font-bold text-xs text-brutal-red">+{xpEarned} XP</span>
                        </div>
                        <div className="h-2 bg-brutal-dark/10 rounded-full overflow-hidden border border-brutal-dark/15">
                            <div
                                className="h-full bg-brutal-red rounded-full transition-all duration-1000"
                                style={{ width: `${Math.min((xpEarned / xpPotential) * 100, 100)}%` }}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="font-data text-[9px] text-brutal-dark/30">{xpEarned} XP</span>
                            <span className="font-data text-[9px] text-brutal-dark/30">+{xpPotential} XP</span>
                        </div>
                    </div>

                    {/* Quick stats */}
                    <div className="grid grid-cols-2 gap-2">
                        <StatCard
                            label="Likes"
                            value={counts.likes}
                            icon={<Heart size={12} />}
                            onClick={() => handleReaction('like')}
                        />
                        <StatCard
                            label="Comments"
                            value={totalCount}
                            icon={<MessageCircle size={12} />}
                        />
                        <StatCard label="Photos" value={project.images?.length || 0} icon={<ImageIcon size={12} />} />
                        <StatCard label="Videos" value={videos.length} icon={<VideoIcon size={12} />} />
                        {(project.members?.length || 0) > 0 && (
                            <StatCard label="Team" value={(project.members?.length || 0) + 1} icon={<Users size={12} />} />
                        )}
                        {milestones.length > 0 && (
                            <StatCard label="Progress" value={`${milestonePct}%`} icon={<CheckCircle2 size={12} />} />
                        )}
                    </div>

                    {/* Remix CTA */}
                    <button
                        type="button"
                        onClick={() => setRemixModalOpen(true)}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl
                                   border-2 border-brutal-dark/15 bg-transparent font-data text-[10px] font-bold uppercase tracking-wider
                                   text-brutal-dark/60 hover:border-brutal-red hover:text-brutal-red hover:bg-brutal-red/[0.03] transition-all"
                    >
                        <GitFork size={12} /> Remix This Project
                    </button>

                    </div>{/* end sidebar card container */}

                    {/* Community Remixes (compact) */}
                    <RemixesCarousel projectId={project.id} />
                </aside>

                {/* ── RIGHT CONTENT (tabs + discussion) ─────────────── */}
                <main className="flex-1 min-w-0">

                    {/* Tab bar */}
                    <div className="sticky top-16 z-20 bg-brutal-bg/95 backdrop-blur-sm border-b-2 border-brutal-dark/15">
                        <nav className="flex items-center overflow-x-auto no-scrollbar px-4 md:px-6 lg:px-8">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.key}
                                    type="button"
                                    onClick={() => setActiveTab(tab.key)}
                                    className={cn(
                                        'flex items-center gap-2 px-4 py-3.5 font-data text-[11px] font-bold uppercase tracking-wider transition-all relative whitespace-nowrap flex-shrink-0',
                                        activeTab === tab.key
                                            ? 'text-brutal-red'
                                            : 'text-brutal-dark/40 hover:text-brutal-dark/70',
                                    )}
                                >
                                    {tab.icon}
                                    {tab.label}
                                    {activeTab === tab.key && (
                                        <span className="absolute bottom-0 left-2 right-2 h-[3px] bg-brutal-red rounded-t-full" />
                                    )}
                                </button>
                            ))}
                        </nav>
                    </div>

                    {/* Tab content */}
                    <div className="tab-content-area px-4 md:px-6 lg:px-8 py-6 space-y-8">

                        {/* ── VISUAL BOM TAB ── */}
                        {activeTab === 'bom' && (
                            <StorySection>
                                <div className="rounded-2xl border-2 border-brutal-dark/20 bg-brutal-bg p-4 md:p-5 shadow-[6px_6px_0_0_rgba(196,41,30,0.14)]">
                                    <ProjectBomTab projectId={project.id} isOwner={isOwner} variant="grid" />
                                </div>
                            </StorySection>
                        )}

                        {/* ── BUILD STEPS TAB ── */}
                        {activeTab === 'milestones' && (
                            <StorySection>
                                {milestones.length > 0 ? (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-4 mb-2">
                                            <div className="flex-1 h-2 bg-brutal-dark/10 rounded-full overflow-hidden border border-brutal-dark/15">
                                                <div
                                                    className="h-full bg-brutal-red transition-all duration-700 rounded-full"
                                                    style={{ width: `${milestonePct}%` }}
                                                />
                                            </div>
                                            <span className="font-heading font-bold text-sm tabular-nums text-brutal-red">
                                                {milestonePct}%
                                            </span>
                                        </div>
                                        {milestones.map((m: any, i: number) => (
                                            <div key={m.id} className="rounded-2xl border-2 border-brutal-dark/20 bg-brutal-bg p-4 hover:border-brutal-red/30 hover:shadow-[4px_4px_0_0_rgba(196,41,30,0.14)] transition-all">
                                                <div className="flex items-start gap-3">
                                                    <div className={cn(
                                                        'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 font-heading font-bold text-xs',
                                                        m.is_complete
                                                            ? 'bg-brutal-red text-brutal-bg'
                                                            : 'bg-brutal-dark/[0.06] text-brutal-dark/40',
                                                    )}>
                                                        {m.is_complete ? <CheckCircle2 size={14} /> : i + 1}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className={cn(
                                                            'font-heading font-bold text-xs uppercase tracking-tight',
                                                            m.is_complete ? 'text-brutal-dark/40 line-through' : 'text-brutal-dark',
                                                        )}>
                                                            {m.title}
                                                        </h4>
                                                        {m.description && (
                                                            <p className="font-data text-xs text-brutal-dark/60 leading-relaxed mt-1.5 whitespace-pre-wrap">
                                                                {m.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12">
                                        <Target size={32} className="mx-auto text-brutal-dark/12 mb-3" />
                                        <p className="font-data text-sm text-brutal-dark/30">No build steps documented yet.</p>
                                        {isOwner && (
                                            <Link
                                                to={`/projects/${project.id}/edit`}
                                                className="inline-flex items-center gap-1.5 mt-4 font-data text-[11px] font-bold text-brutal-red hover:text-brutal-dark transition-colors"
                                            >
                                                <CheckCircle2 size={12} />
                                                Add build steps <span className="text-brutal-red/60">(+50 XP)</span>
                                            </Link>
                                        )}
                                    </div>
                                )}
                            </StorySection>
                        )}

                        {/* ── OVERVIEW & FILES TAB ── */}
                        {activeTab === 'overview' && (
                            <div className="space-y-6">
                                <StorySection>
                                    <SectionLabel>About This Project</SectionLabel>
                                    {project.description ? (
                                        <p className="font-data text-[13px] text-brutal-dark/80 leading-[1.75] whitespace-pre-wrap">
                                            {project.description}
                                        </p>
                                    ) : project.summary ? (
                                        <p className="font-data text-[13px] text-brutal-dark/80 leading-[1.75]">
                                            {project.summary}
                                        </p>
                                    ) : (
                                        <p className="font-data text-sm text-brutal-dark/35">
                                            No description yet.
                                        </p>
                                    )}
                                    {isOwner && project.description && project.description.split(/\s+/).length < 100 && (
                                        <div className="mt-3 rounded-xl border border-dashed border-brutal-red/20 bg-brutal-red/[0.03] p-3">
                                            <p className="font-data text-[11px] text-brutal-dark/50">
                                                <Sparkles size={11} className="inline text-brutal-red mr-1.5" />
                                                Add more details — <span className="font-bold text-brutal-red">earn +50 XP</span>
                                            </p>
                                        </div>
                                    )}
                                </StorySection>

                                <StorySection>
                                    <SectionLabel>Files & Source Code</SectionLabel>
                                    <div className="rounded-2xl border-2 border-brutal-dark/20 bg-brutal-bg p-4 shadow-[4px_4px_0_0_rgba(196,41,30,0.10)]">
                                        <ProjectFilesTab githubUrl={project.github_url} />
                                    </div>
                                </StorySection>

                                {(videos.length > 0 || galleryImages.length > 0) && (
                                    <StorySection>
                                        <SectionLabel>Media</SectionLabel>
                                        <div className="space-y-3">
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

                                {project.tags && project.tags.length > 0 && (
                                    <StorySection>
                                        <div className="flex flex-wrap gap-2">
                                            {project.tags.map((t: string) => (
                                                <span
                                                    key={t}
                                                    className="font-data text-[10px] font-bold uppercase tracking-wider text-brutal-dark/50
                                                               bg-brutal-dark/[0.04] border border-brutal-dark/10 px-2.5 py-1 rounded-full"
                                                >
                                                    #{t}
                                                </span>
                                            ))}
                                        </div>
                                    </StorySection>
                                )}

                                {project.github_url && (
                                    <StorySection>
                                        <a
                                            href={project.github_url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-2 rounded-lg border-2 border-brutal-dark/10 bg-white px-4 py-2.5
                                                       font-data text-[11px] font-bold uppercase tracking-widest text-brutal-dark/70
                                                       hover:border-brutal-red hover:text-brutal-red transition-all"
                                        >
                                            <ExternalLink size={12} /> View on GitHub
                                        </a>
                                    </StorySection>
                                )}

                                {/* Makes inline on overview tab */}
                                <StorySection>
                                    <SectionLabel>Community Makes</SectionLabel>
                                    <ProjectMakesTab projectId={project.id} />
                                </StorySection>
                            </div>
                        )}
                    </div>

                    {/* ── DISCUSSION (below tabs, inside right column) ── */}
                    <div className="border-t-2 border-brutal-dark/15 px-4 md:px-6 lg:px-8 py-6">
                        <StorySection id="discussion">
                            <SectionLabel>
                                Discussion
                                {totalCount > 0 && (
                                    <span className="ml-2 tabular-nums text-brutal-dark/35">{totalCount}</span>
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

                    {/* ── What's Next (compact, inside right column) ── */}
                    <div className="border-t-2 border-brutal-dark/15 px-4 md:px-6 lg:px-8 py-6">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <button
                                type="button"
                                onClick={() => setRemixModalOpen(true)}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-2xl border-2 border-brutal-dark/20 bg-brutal-bg hover:border-brutal-red/40 hover:shadow-[4px_4px_0_0_rgba(196,41,30,0.14)] transition-all group/cta text-left"
                            >
                                <GitFork size={14} className="text-brutal-dark/25 group-hover/cta:text-brutal-red transition-colors flex-shrink-0" />
                                <div>
                                    <div className="font-heading font-bold text-[10px] uppercase text-brutal-dark/70 group-hover/cta:text-brutal-red transition-colors">Remix it</div>
                                    <div className="font-data text-[9px] text-brutal-dark/40">Fork and build your version</div>
                                </div>
                            </button>
                            <Link
                                to="/dashboard"
                                className="flex items-center gap-3 px-3 py-2.5 rounded-2xl border-2 border-brutal-dark/20 bg-brutal-bg hover:border-brutal-red/40 hover:shadow-[4px_4px_0_0_rgba(196,41,30,0.14)] transition-all group/cta"
                            >
                                <Sparkles size={14} className="text-brutal-dark/25 group-hover/cta:text-brutal-red transition-colors flex-shrink-0" />
                                <div>
                                    <div className="font-heading font-bold text-[10px] uppercase text-brutal-dark/70 group-hover/cta:text-brutal-red transition-colors">Start your own</div>
                                    <div className="font-data text-[9px] text-brutal-dark/40">Post a project, earn XP</div>
                                </div>
                            </Link>
                            <Link
                                to="/projects"
                                className="flex items-center gap-3 px-3 py-2.5 rounded-2xl border-2 border-brutal-dark/20 bg-brutal-bg hover:border-brutal-dark/40 hover:shadow-[4px_4px_0_0_rgba(17,17,17,0.08)] transition-all group/cta"
                            >
                                <ArrowLeft size={14} className="text-brutal-dark/25 group-hover/cta:text-brutal-dark/60 transition-colors flex-shrink-0" />
                                <div>
                                    <div className="font-heading font-bold text-[10px] uppercase text-brutal-dark/70 transition-colors">Browse more</div>
                                    <div className="font-data text-[9px] text-brutal-dark/40">Explore other builds</div>
                                </div>
                            </Link>
                        </div>
                    </div>

                    {/* Maker flywheel closure */}
                    <div className="px-4 md:px-6 lg:px-8 pb-8">
                        <WhatsNextClosure variant="project" />
                    </div>
                </main>
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
        <div className="flex items-center gap-3 mb-4">
            <h2 className="font-heading font-bold text-xs uppercase tracking-widest text-brutal-dark/50">
                {children}
            </h2>
            <div className="flex-1 h-px bg-brutal-dark/15" />
        </div>
    );
}

function StatCard({ label, value, icon, onClick }: {
    label: string;
    value: React.ReactNode;
    icon: React.ReactNode;
    onClick?: () => void;
}) {
    const Tag = onClick ? 'button' : 'div';
    return (
        <Tag
            type={onClick ? 'button' : undefined}
            onClick={onClick}
            className={cn(
                'rounded-xl border border-brutal-dark/10 bg-brutal-dark/[0.02] p-2.5 text-left transition-all',
                onClick && 'hover:border-brutal-red/30 hover:bg-brutal-red/[0.03] cursor-pointer',
            )}
        >
            <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-brutal-red">{icon}</span>
                <span className="font-data text-[8px] font-bold uppercase tracking-widest text-brutal-dark/45">
                    {label}
                </span>
            </div>
            <span className="font-heading font-bold text-lg tabular-nums text-brutal-dark leading-none">
                {value}
            </span>
        </Tag>
    );
}
