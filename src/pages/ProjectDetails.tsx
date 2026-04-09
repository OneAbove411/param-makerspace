import React, { useState, useEffect, useRef, memo, useMemo } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useProject, useReaction, useComments } from '../lib/hooks';
import { useAuth } from '../lib/auth';
import { toast } from '../lib/toast';
import { RemixModal } from '../components/project/RemixModal';
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
    Calendar,
    CheckCircle2,
    Circle,
    ExternalLink,
} from 'lucide-react';
import { getEmbedUrl, getYoutubeThumbnail } from '../lib/videoUtils';
import { ProjectBomTab } from '../components/project/ProjectBomTab';
import { ProjectFilesTab } from '../components/project/ProjectFilesTab';
import { ProjectMakesTab } from '../components/project/ProjectMakesTab';
import { cn } from '../lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// §9 Project Cockpit — single-screen bento redesign.
//
// Replaces the prior 3-column long-scroll layout that produced:
//   • duplicate cover images
//   • oversized headings
//   • "broken" timeline (only ever 1 entry: Overview)
//   • BOM/Files/Makes that lived in a tab strip the user couldn't reach
//   • non-snappy scroll because every section was a giant block
//
// New layout (≥ lg):
//
//   ┌─────────── 12 col grid ─────────────────────────────────┐
//   │ IDENTITY (3) │ HERO COVER + OVERVIEW (6) │ SIDE (3)     │
//   │              │                            │ BOM/FILES/   │
//   │              │                            │ MAKES tabs   │
//   └──────────────────────────────────────────────────────────┘
//
// Everything fits in one viewport on a 1440×900 screen.
// Content panes scroll internally — the page itself does not.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Skeleton ──────────────────────────────────────────────────────────────

function DetailsSkeleton() {
    return (
        <div className="flex-1 w-full bg-brutal-bg min-h-screen pt-24 px-6 md:px-10">
            <div className="max-w-[1480px] mx-auto grid grid-cols-12 gap-6 animate-pulse">
                <div className="col-span-3 h-[520px] rounded-2xl bg-brutal-dark/5" />
                <div className="col-span-6 h-[520px] rounded-2xl bg-brutal-dark/5" />
                <div className="col-span-3 h-[520px] rounded-2xl bg-brutal-dark/5" />
            </div>
        </div>
    );
}

// ─── LazyVideo (kept compact) ──────────────────────────────────────────────

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
                <div className="w-12 h-12 rounded-full bg-brutal-red flex items-center justify-center
                                shadow-[0_0_24px_rgba(196,41,30,0.4)] group-hover:scale-110 transition-transform">
                    <Play size={20} className="text-brutal-bg fill-brutal-bg ml-0.5" />
                </div>
            </div>
        </button>
    );
});

// ─── Main ──────────────────────────────────────────────────────────────────

export function ProjectDetails() {
    const { id } = useParams();
    const { data: project, loading } = useProject(id);
    const { user } = useAuth();
    const { counts, myReactions, toggle } = useReaction('project', id);
    const { comments, addComment, deleteComment } = useComments('project', id);
    const navigate = useNavigate();
    const location = useLocation();
    const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
    const [remixModalOpen, setRemixModalOpen] = useState(false);
    const [centerTab, setCenterTab] = useState<'overview' | 'milestones' | 'media'>('overview');
    const [sideTab, setSideTab] = useState<'bom' | 'files' | 'makes'>('bom');
    const [commentText, setCommentText] = useState('');
    const [submittingComment, setSubmittingComment] = useState(false);
    const MAX_COMMENT = 500;

    // Default the side tab to whatever section actually has content
    useEffect(() => {
        if (project?.github_url && !project?.files?.length) setSideTab('files');
    }, [project?.id]);

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

    const handleComment = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = commentText.trim();
        if (!trimmed || trimmed.length > MAX_COMMENT) return;
        setSubmittingComment(true);
        const { error } = await addComment(trimmed);
        setSubmittingComment(false);
        if (!error) setCommentText('');
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

    const isLiked = myReactions.includes('like');
    const isBookmarked = myReactions.includes('bookmark');

    return (
        <div className="flex-1 w-full bg-brutal-bg min-h-screen">
            <div className="pt-24 md:pt-24 pb-10 px-4 md:px-8 lg:px-10">
                <div className="max-w-[1480px] mx-auto">
                    {/* Compact breadcrumb + actions strip */}
                    <div className="flex items-center justify-between mb-4 gap-4">
                        <div className="flex items-center gap-2 min-w-0">
                            <button
                                type="button"
                                onClick={goBack}
                                className="inline-flex items-center gap-1.5 font-data text-[10px] font-bold uppercase tracking-widest
                                           text-brutal-dark/50 hover:text-brutal-red transition-colors"
                            >
                                <ArrowLeft size={12} /> Back
                            </button>
                            <span className="font-data text-[10px] text-brutal-dark/30">/</span>
                            <Link
                                to="/projects"
                                className="font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/50 hover:text-brutal-red transition-colors"
                            >
                                Projects
                            </Link>
                            {project.domain && (
                                <>
                                    <span className="font-data text-[10px] text-brutal-dark/30">/</span>
                                    <span className="font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/50 truncate">
                                        {project.domain}
                                    </span>
                                </>
                            )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                                type="button"
                                onClick={() => handleReaction('like')}
                                aria-label={isLiked ? 'Unlike' : 'Like'}
                                className={cn(
                                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-data text-[10px] font-bold uppercase tracking-wider',
                                    'border-2 transition-all',
                                    isLiked
                                        ? 'bg-brutal-red text-brutal-bg border-brutal-red'
                                        : 'border-brutal-dark/15 text-brutal-dark/60 hover:border-brutal-red hover:text-brutal-red',
                                )}
                            >
                                <Heart size={11} className={isLiked ? 'fill-current' : ''} />
                                {counts.likes}
                            </button>
                            <button
                                type="button"
                                onClick={() => handleReaction('bookmark')}
                                aria-pressed={isBookmarked}
                                aria-label={isBookmarked ? 'Unsave project' : 'Save project'}
                                title={isBookmarked ? 'Saved' : 'Save'}
                                className={cn(
                                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-data text-[10px] font-bold uppercase tracking-wider border-2 transition-all',
                                    isBookmarked
                                        ? 'bg-brutal-red text-brutal-bg border-brutal-red'
                                        : 'border-brutal-dark/15 text-brutal-dark/60 hover:border-brutal-red hover:text-brutal-red',
                                )}
                            >
                                <Bookmark size={11} className={isBookmarked ? 'fill-current' : ''} />
                                {isBookmarked ? 'Saved' : 'Save'}
                            </button>
                            <button
                                type="button"
                                onClick={handleShare}
                                aria-label="Share"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-data text-[10px] font-bold uppercase tracking-wider border-2 border-brutal-dark/15 text-brutal-dark/60 hover:border-brutal-dark hover:text-brutal-dark transition-all"
                            >
                                <Share2 size={11} /> Share
                            </button>
                            <button
                                type="button"
                                onClick={() => setRemixModalOpen(true)}
                                aria-label="Remix this project"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-data text-[10px] font-bold uppercase tracking-wider bg-brutal-dark text-brutal-bg border-2 border-brutal-dark hover:bg-brutal-red hover:border-brutal-red transition-all"
                            >
                                <GitFork size={11} /> Remix
                            </button>
                        </div>
                    </div>

                    {/* ─── Bento grid ─── */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5">
                        {/* ── Identity column ───────────────────────────── */}
                        <aside className="lg:col-span-3 lg:max-h-[calc(100vh-9rem)] flex flex-col gap-4">
                            {/* Title card */}
                            <div className="rounded-2xl border-2 border-brutal-dark/10 bg-brutal-bg p-5 shadow-[6px_6px_0_0_rgba(196,41,30,0.12)]">
                                {project.domain && (
                                    <span className="inline-block font-data text-[9px] font-bold uppercase tracking-widest text-brutal-red mb-2">
                                        #{project.domain}
                                    </span>
                                )}
                                <h1 className="font-drama italic text-2xl leading-[1.05] text-brutal-dark mb-3">
                                    {project.title}
                                </h1>
                                {project.status && (
                                    <span className={cn(
                                        'inline-block px-2 py-0.5 font-data text-[9px] font-bold uppercase tracking-widest rounded-full',
                                        project.status === 'active' ? 'bg-green-700/10 text-green-700' :
                                            project.status === 'pending_review' ? 'bg-yellow-700/10 text-yellow-700' :
                                                project.status === 'rejected' ? 'bg-brutal-red/10 text-brutal-red' :
                                                    'bg-brutal-dark/5 text-brutal-dark/60',
                                    )}>
                                        {project.status.replace('_', ' ')}
                                    </span>
                                )}

                                {/* Owner */}
                                <div className="mt-4 pt-4 border-t border-brutal-dark/10 flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-full bg-brutal-dark text-brutal-bg font-heading font-bold flex items-center justify-center text-xs">
                                        {project.ownerName?.charAt(0) || '?'}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="font-data text-[11px] font-bold text-brutal-dark truncate">
                                            {project.ownerName}
                                        </div>
                                        <div className="font-data text-[8px] text-brutal-red font-bold uppercase tracking-widest">
                                            Owner
                                        </div>
                                    </div>
                                </div>

                                {/* Tags */}
                                {project.tags && project.tags.length > 0 && (
                                    <div className="mt-4 flex flex-wrap gap-1">
                                        {project.tags.slice(0, 6).map((t: string) => (
                                            <span
                                                key={t}
                                                className="font-data text-[9px] font-bold uppercase tracking-wider text-brutal-dark/55 bg-brutal-dark/[0.04] border border-brutal-dark/10 px-1.5 py-0.5 rounded-full"
                                            >
                                                #{t}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Stats grid */}
                            <div className="rounded-2xl border-2 border-brutal-dark/10 bg-brutal-bg p-4 grid grid-cols-3 gap-2">
                                <Stat icon={<Heart size={11} />} label="Likes" value={counts.likes} />
                                <Stat icon={<MessageCircle size={11} />} label="Comments" value={comments.length} />
                                <Stat icon={<Users size={11} />} label="Members" value={(project.members?.length || 0) + 1} />
                                <Stat icon={<ImageIcon size={11} />} label="Photos" value={project.images?.length || 0} />
                                <Stat icon={<VideoIcon size={11} />} label="Videos" value={videos.length} />
                                <Stat icon={<CheckCircle2 size={11} />} label="Done" value={`${milestonesDone}/${milestones.length || 0}`} />
                            </div>

                            {/* Milestone progress (if any) */}
                            {milestones.length > 0 && (
                                <div className="rounded-2xl border-2 border-brutal-dark/10 bg-brutal-bg p-4 flex-1 min-h-0 flex flex-col">
                                    <div className="flex items-baseline justify-between mb-2">
                                        <span className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-dark/45">
                                            Milestones
                                        </span>
                                        <span className="font-data text-[10px] font-bold tabular-nums text-brutal-red">
                                            {milestonePct}%
                                        </span>
                                    </div>
                                    <div className="h-1.5 bg-brutal-dark/8 rounded-full overflow-hidden mb-3">
                                        <div className="h-full bg-brutal-red transition-all duration-700" style={{ width: `${milestonePct}%` }} />
                                    </div>
                                    <ul className="space-y-1.5 overflow-y-auto pr-1">
                                        {milestones.map((m: any) => (
                                            <li key={m.id} className="flex items-start gap-2">
                                                {m.is_complete ? (
                                                    <CheckCircle2 size={11} className="text-brutal-red mt-0.5 flex-shrink-0" />
                                                ) : (
                                                    <Circle size={11} className="text-brutal-dark/25 mt-0.5 flex-shrink-0" />
                                                )}
                                                <span className={cn(
                                                    'font-data text-[10px] leading-snug',
                                                    m.is_complete ? 'text-brutal-dark/60 line-through' : 'text-brutal-dark/80',
                                                )}>
                                                    {m.title}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </aside>

                        {/* ── Center column: hero + content tabs ────────── */}
                        <main className="lg:col-span-6 flex flex-col gap-4 lg:max-h-[calc(100vh-9rem)] min-h-0">
                            {/* Cover */}
                            {coverImage && (
                                <div className="relative rounded-2xl overflow-hidden border-2 border-brutal-dark/10 bg-brutal-dark/5 aspect-[16/8] flex-shrink-0">
                                    <img
                                        src={coverImage}
                                        alt={`${project.title} cover`}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            )}

                            {/* Tabs strip */}
                            <div className="rounded-2xl border-2 border-brutal-dark/10 bg-brutal-bg flex-1 min-h-0 flex flex-col">
                                <div className="flex border-b-2 border-brutal-dark/10 px-4 flex-shrink-0">
                                    {([
                                        { k: 'overview', label: 'Overview', count: comments.length },
                                        { k: 'milestones', label: 'Milestones', count: milestones.length },
                                        { k: 'media', label: 'Media', count: videos.length + galleryImages.length },
                                    ] as const).map((t) => (
                                        <button
                                            key={t.k}
                                            type="button"
                                            onClick={() => setCenterTab(t.k)}
                                            className={cn(
                                                'px-3 py-3 font-data text-[10px] font-bold uppercase tracking-widest transition-colors border-b-2 -mb-[2px]',
                                                centerTab === t.k
                                                    ? 'border-brutal-red text-brutal-red'
                                                    : 'border-transparent text-brutal-dark/40 hover:text-brutal-dark/70',
                                            )}
                                        >
                                            {t.label}
                                            {t.count > 0 && (
                                                <span className="ml-1.5 tabular-nums text-brutal-dark/35">{t.count}</span>
                                            )}
                                        </button>
                                    ))}
                                </div>

                                <div className="flex-1 min-h-0 overflow-y-auto p-5">
                                    {centerTab === 'overview' && (
                                        <div className="space-y-6">
                                            {/* Description */}
                                            {project.description ? (
                                                <p className="font-data text-[13px] text-brutal-dark/75 leading-relaxed whitespace-pre-wrap">
                                                    {project.description}
                                                </p>
                                            ) : project.summary ? (
                                                <p className="font-data text-[13px] text-brutal-dark/75 leading-relaxed">
                                                    {project.summary}
                                                </p>
                                            ) : (
                                                <p className="font-data text-xs text-brutal-dark/35 italic">
                                                    No description yet.
                                                </p>
                                            )}

                                            {/* Discussion */}
                                            <div className="pt-5 border-t border-brutal-dark/10">
                                                <h3 className="font-heading font-bold text-xs uppercase tracking-widest text-brutal-dark/70 mb-3">
                                                    Discussion · {comments.length}
                                                </h3>
                                                {user ? (
                                                    <form onSubmit={handleComment} className="flex items-start gap-2 mb-4">
                                                        <div className="w-7 h-7 rounded-full bg-brutal-dark text-brutal-bg font-heading font-bold flex items-center justify-center text-[10px] flex-shrink-0">
                                                            {user.email?.charAt(0).toUpperCase() || '?'}
                                                        </div>
                                                        <div className="flex-1">
                                                            <input
                                                                type="text"
                                                                value={commentText}
                                                                maxLength={MAX_COMMENT}
                                                                onChange={(e) => setCommentText(e.target.value)}
                                                                placeholder="Add a comment…"
                                                                className="w-full bg-transparent text-brutal-dark border-b-2 border-brutal-dark/10 px-0 py-1.5 font-data text-xs placeholder:text-brutal-dark/30 focus:outline-none focus:border-brutal-red/50"
                                                            />
                                                            {commentText.trim() && (
                                                                <div className="flex items-center justify-end gap-2 mt-2">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setCommentText('')}
                                                                        className="font-data text-[10px] font-bold uppercase tracking-wider text-brutal-dark/40 hover:text-brutal-dark px-2 py-1"
                                                                    >
                                                                        Cancel
                                                                    </button>
                                                                    <button
                                                                        type="submit"
                                                                        disabled={submittingComment}
                                                                        className="font-data text-[10px] font-bold uppercase tracking-wider bg-brutal-red text-brutal-bg px-3 py-1 rounded disabled:opacity-50"
                                                                    >
                                                                        {submittingComment ? 'Posting…' : 'Post'}
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </form>
                                                ) : (
                                                    <p className="font-data text-xs text-brutal-dark/50 mb-4">
                                                        <Link to="/login" className="text-brutal-red font-bold hover:underline">Log in</Link> to comment.
                                                    </p>
                                                )}

                                                <div className="space-y-2">
                                                    {comments.map((c: any) => {
                                                        const timeAgo = (() => {
                                                            const diff = Date.now() - new Date(c.created_at).getTime();
                                                            const mins = Math.floor(diff / 60000);
                                                            if (mins < 1) return 'just now';
                                                            if (mins < 60) return `${mins}m`;
                                                            const hrs = Math.floor(mins / 60);
                                                            if (hrs < 24) return `${hrs}h`;
                                                            const days = Math.floor(hrs / 24);
                                                            if (days < 7) return `${days}d`;
                                                            return new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                                        })();
                                                        return (
                                                            <div key={c.id} className="flex items-start gap-2 py-2 group">
                                                                <div className="w-6 h-6 rounded-full bg-brutal-dark text-brutal-bg font-heading font-bold flex items-center justify-center text-[10px] flex-shrink-0">
                                                                    {c.userName?.charAt(0) || '?'}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-data text-[11px] font-bold text-brutal-dark">{c.userName || 'Anonymous'}</span>
                                                                        <span className="font-data text-[9px] text-brutal-dark/30">{timeAgo}</span>
                                                                    </div>
                                                                    <p className="font-data text-[12px] text-brutal-dark/75 leading-snug mt-0.5">
                                                                        {c.content}
                                                                    </p>
                                                                    {user && c.user_id === user.id && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => deleteComment(c.id)}
                                                                            className="font-data text-[9px] font-bold uppercase tracking-wider text-brutal-dark/30 hover:text-brutal-red mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                        >
                                                                            Delete
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                    {comments.length === 0 && (
                                                        <p className="font-data text-xs text-brutal-dark/30 py-4 text-center">
                                                            No comments yet.
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {centerTab === 'milestones' && (
                                        <div className="space-y-3">
                                            {milestones.length === 0 ? (
                                                <p className="font-data text-xs text-brutal-dark/35 italic text-center py-8">
                                                    No milestones yet.
                                                </p>
                                            ) : (
                                                milestones.map((m: any, i: number) => (
                                                    <div key={m.id} className="rounded-xl border border-brutal-dark/10 bg-brutal-dark/[0.02] p-4">
                                                        <div className="flex items-start gap-3">
                                                            <div className={cn(
                                                                'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 font-data text-[10px] font-bold',
                                                                m.is_complete ? 'bg-brutal-red text-brutal-bg' : 'bg-brutal-dark/8 text-brutal-dark/50',
                                                            )}>
                                                                {i + 1}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <h4 className="font-heading font-bold text-sm uppercase tracking-tight text-brutal-dark">
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
                                                ))
                                            )}
                                        </div>
                                    )}

                                    {centerTab === 'media' && (
                                        <div className="space-y-4">
                                            {videos.length === 0 && galleryImages.length === 0 ? (
                                                <p className="font-data text-xs text-brutal-dark/35 italic text-center py-8">
                                                    No additional media.
                                                </p>
                                            ) : (
                                                <>
                                                    {videos.map((vid: any) => (
                                                        <LazyVideo
                                                            key={vid.id}
                                                            vid={vid}
                                                            playing={playingVideoId === vid.id}
                                                            onPlay={() => setPlayingVideoId(vid.id)}
                                                        />
                                                    ))}
                                                    {galleryImages.length > 0 && (
                                                        <div className="grid grid-cols-2 gap-3">
                                                            {galleryImages.map((img: any, i: number) => (
                                                                <div key={i} className="rounded-xl overflow-hidden border border-brutal-dark/10 bg-brutal-dark/5">
                                                                    <img
                                                                        src={img.image_url}
                                                                        alt={img.caption || 'Gallery'}
                                                                        loading="lazy"
                                                                        className="w-full h-32 object-cover hover:scale-105 transition-transform duration-500"
                                                                    />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </main>

                        {/* ── Side column: BOM/Files/Makes ──────────────── */}
                        <aside className="lg:col-span-3 lg:max-h-[calc(100vh-9rem)] flex flex-col">
                            <div className="rounded-2xl border-2 border-brutal-dark/10 bg-brutal-bg flex-1 min-h-0 flex flex-col">
                                <div className="flex border-b-2 border-brutal-dark/10 px-3 flex-shrink-0">
                                    {([
                                        { k: 'bom', label: 'BOM' },
                                        { k: 'files', label: 'Files' },
                                        { k: 'makes', label: 'Makes' },
                                    ] as const).map((t) => (
                                        <button
                                            key={t.k}
                                            type="button"
                                            onClick={() => setSideTab(t.k)}
                                            className={cn(
                                                'flex-1 px-2 py-3 font-data text-[10px] font-bold uppercase tracking-widest transition-colors border-b-2 -mb-[2px]',
                                                sideTab === t.k
                                                    ? 'border-brutal-red text-brutal-red'
                                                    : 'border-transparent text-brutal-dark/40 hover:text-brutal-dark/70',
                                            )}
                                        >
                                            {t.label}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex-1 min-h-0 overflow-y-auto p-4">
                                    {sideTab === 'bom' && (
                                        <>
                                            <TabBlurb>
                                                <strong className="text-brutal-dark/70">Bill of Materials.</strong>{' '}
                                                Every part, component, and consumable needed to build this project — quantities, sources, and cost.
                                            </TabBlurb>
                                            <ProjectBomTab projectId={project.id} isOwner={project.owner_id === user?.id} />
                                        </>
                                    )}
                                    {sideTab === 'files' && (
                                        <>
                                            <TabBlurb>
                                                <strong className="text-brutal-dark/70">Files & Source.</strong>{' '}
                                                Code, CAD, schematics, datasheets, and the GitHub repo. Everything you need to remix or fabricate this build.
                                            </TabBlurb>
                                            <ProjectFilesTab githubUrl={project.github_url} />
                                        </>
                                    )}
                                    {sideTab === 'makes' && (
                                        <>
                                            <TabBlurb>
                                                <strong className="text-brutal-dark/70">Makes.</strong>{' '}
                                                Builds the community has actually constructed from this project. Post yours once you've built it to earn XP.
                                            </TabBlurb>
                                            <ProjectMakesTab projectId={project.id} />
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* GitHub quick-link if present */}
                            {project.github_url && (
                                <a
                                    href={project.github_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-3 inline-flex items-center justify-center gap-2 rounded-xl border-2 border-brutal-dark/10 bg-brutal-bg px-4 py-2.5 font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/70 hover:border-brutal-red hover:text-brutal-red transition-all"
                                >
                                    <ExternalLink size={11} /> View on GitHub
                                </a>
                            )}
                        </aside>
                    </div>
                </div>
            </div>

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

// ─── Tiny stat tile ────────────────────────────────────────────────────────

// ─── Tab explainer blurb ──────────────────────────────────────────────────
// One-line "what is this tab?" hint shown above each side-tab's content.
// Keeps the panels self-explanatory for first-time visitors without taking
// up valuable vertical space.
function TabBlurb({ children }: { children: React.ReactNode }) {
    return (
        <p className="font-data text-[10px] leading-relaxed text-brutal-dark/45 mb-4 pb-3 border-b border-brutal-dark/8">
            {children}
        </p>
    );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
    return (
        <div className="text-center">
            <div className="flex items-center justify-center text-brutal-red mb-1">{icon}</div>
            <div className="font-heading font-bold text-sm tabular-nums text-brutal-dark leading-none">{value}</div>
            <div className="font-data text-[8px] font-bold uppercase tracking-widest text-brutal-dark/40 mt-1">
                {label}
            </div>
        </div>
    );
}
