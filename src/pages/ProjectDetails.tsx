import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useProject, useReaction, useComments } from '../lib/hooks';
import { useAuth } from '../lib/auth';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import {
    Heart, ArrowUpCircle, Bookmark, Github, ArrowLeft, Send, Play,
    Clock, Calendar, ArrowRight, ChevronRight,
} from 'lucide-react';
import { getEmbedUrl, getYoutubeThumbnail } from '../lib/videoUtils';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// ─── Skeleton Loader ───

function DetailsSkeleton() {
    return (
        <div className="flex-1 w-full bg-brutal-bg pt-24 min-h-screen animate-pulse">
            <div className="h-[38vh] bg-brutal-dark/5" />
            <div className="max-w-6xl mx-auto px-6 md:px-12 -mt-28 relative z-10">
                <div className="bg-brutal-bg rounded-2xl p-8 border border-brutal-dark/10 space-y-4">
                    <div className="h-4 w-24 bg-brutal-dark/8 rounded" />
                    <div className="h-12 w-2/3 bg-brutal-dark/8 rounded" />
                    <div className="h-4 w-1/2 bg-brutal-dark/5 rounded" />
                </div>
            </div>
        </div>
    );
}

// ─── Main Component ───

export function ProjectDetails() {
    const { id } = useParams();
    const { data: project, loading } = useProject(id);
    const { user } = useAuth();
    const { counts, myReactions, toggle } = useReaction('project', id);
    const { comments, addComment, deleteComment } = useComments('project', id);
    const navigate = useNavigate();
    const [commentText, setCommentText] = useState('');
    const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
    const pageRef = useRef<HTMLDivElement>(null);

    const handleReaction = (type: 'like' | 'upvote' | 'bookmark') => {
        if (!user) {
            navigate('/login');
            return;
        }
        toggle(type);
    };

    const handleComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!commentText.trim()) return;
        await addComment(commentText.trim());
        setCommentText('');
    };

    // GSAP entrance animations
    useEffect(() => {
        if (loading || !project) return;

        const ctx = gsap.context(() => {
            // Hero text stagger
            gsap.fromTo('.pd-hero-text',
                { y: 40, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.9, stagger: 0.1, ease: 'power3.out', delay: 0.15 }
            );

            // Reaction buttons entrance
            gsap.fromTo('.pd-reaction',
                { y: 20, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.6, stagger: 0.06, ease: 'power3.out', delay: 0.5 }
            );

            // Content sections stagger on scroll
            gsap.utils.toArray<HTMLElement>('.pd-section').forEach((section) => {
                gsap.fromTo(section,
                    { y: 50, opacity: 0 },
                    {
                        y: 0, opacity: 1,
                        duration: 0.8, ease: 'power3.out',
                        scrollTrigger: { trigger: section, start: 'top 85%' }
                    }
                );
            });

            // Sidebar cards
            gsap.fromTo('.pd-sidebar-card',
                { y: 40, opacity: 0 },
                {
                    y: 0, opacity: 1,
                    duration: 0.7, stagger: 0.12, ease: 'power3.out',
                    scrollTrigger: { trigger: '.pd-sidebar', start: 'top 80%' }
                }
            );

            // Milestone progress bar
            const bar = document.querySelector('.milestone-bar-fill');
            if (bar) {
                gsap.fromTo(bar,
                    { scaleX: 0 },
                    {
                        scaleX: 1, duration: 1.2, ease: 'power2.out',
                        scrollTrigger: { trigger: bar, start: 'top 90%' }
                    }
                );
            }
        }, pageRef);

        return () => ctx.revert();
    }, [loading, project?.id]);

    if (loading) return <DetailsSkeleton />;

    if (!project) {
        return (
            <div className="flex-1 w-full bg-brutal-bg pt-32 px-12 min-h-screen">
                <div className="max-w-2xl mx-auto text-center py-32">
                    <h1 className="font-heading font-bold text-5xl uppercase tracking-tight-heading text-brutal-dark/20">
                        Project Not Found
                    </h1>
                    <p className="font-data text-sm text-brutal-dark/40 mt-4">
                        This project may have been removed or doesn't exist.
                    </p>
                    <Link to="/projects" className="inline-flex items-center gap-2 mt-8 font-heading font-bold text-sm
                                                     uppercase text-brutal-dark hover:text-brutal-red transition-colors">
                        <ArrowLeft size={16} /> Back to Archive
                    </Link>
                </div>
            </div>
        );
    }

    const coverImage = project.images?.find((_, i) => i === 0)?.image_url || (project as any).cover_image_url;
    const completedMilestones = project.milestones?.filter((m: any) => m.is_complete).length || 0;
    const totalMilestones = project.milestones?.length || 0;
    const milestonePercent = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0;

    return (
        <div ref={pageRef} className="flex-1 w-full bg-brutal-bg min-h-screen">

            {/* ═══════════════════════════════════════════════════
                HERO — Full-width cover with project info overlay
            ═══════════════════════════════════════════════════ */}
            <div className="relative h-[38vh] min-h-[300px] w-full">
                {/* Cover image */}
                {coverImage ? (
                    <img
                        src={coverImage}
                        alt={project.title}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div
                        className="w-full h-full bg-brutal-dark"
                        style={{
                            backgroundImage: 'radial-gradient(circle, rgba(245,243,238,0.05) 1px, transparent 1px)',
                            backgroundSize: '24px 24px',
                        }}
                    />
                )}

                {/* Gradient overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-brutal-bg via-brutal-bg/30 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-brutal-dark/20 to-transparent" />
            </div>

            {/* ═══════════════════════════════════════════════════
                PROJECT INFO CARD — overlaps the hero
            ═══════════════════════════════════════════════════ */}
            <div className="max-w-6xl mx-auto px-6 md:px-12 -mt-28 relative z-10">
                {/* Back button */}
                <Link
                    to="/projects"
                    className="pd-hero-text inline-flex items-center gap-2 font-data text-[10px] font-bold uppercase tracking-widest
                               hover:text-brutal-red transition-colors mb-4 text-brutal-dark/60 interactive-lift"
                >
                    <ArrowLeft size={12} /> Back to Archive
                </Link>

                <div className="bg-brutal-bg border border-brutal-dark/10 rounded-2xl p-6 md:p-8
                                shadow-[0_12px_48px_rgba(0,0,0,0.05)]">
                    {/* Badges row */}
                    <div className="pd-hero-text flex flex-wrap gap-2 items-center mb-4">
                        <span className="font-data text-[9px] text-brutal-red font-bold uppercase tracking-[0.2em]">
                            Project_Code: {project.title.replace(/\s+/g, '_').substring(0, 12).toUpperCase()}
                        </span>
                        {project.domain && (
                            <span className="border border-brutal-dark/15 px-2.5 py-0.5 font-data text-[9px] font-bold rounded-full uppercase tracking-wider text-brutal-dark/60">
                                {project.domain}
                            </span>
                        )}
                    </div>

                    {/* Project title — dramatic but compact */}
                    <h1 className="pd-hero-text font-drama italic text-4xl md:text-5xl lg:text-6xl text-brutal-dark
                                   leading-[0.95] tracking-tight mb-3">
                        {project.title}
                    </h1>

                    {/* Summary */}
                    <p className="pd-hero-text font-heading text-base md:text-lg text-brutal-dark/60 max-w-3xl leading-relaxed">
                        {project.summary}
                    </p>

                    {/* Author + meta */}
                    <div className="pd-hero-text flex flex-wrap items-center gap-3 mt-4 text-brutal-dark/40">
                        <span className="font-data text-xs font-bold">By {project.ownerName}</span>
                        {project.duration && (
                            <>
                                <span className="w-1 h-1 rounded-full bg-brutal-dark/20" />
                                <span className="font-data text-xs flex items-center gap-1.5">
                                    <Clock size={12} /> {project.duration}
                                </span>
                            </>
                        )}
                        <span className="w-1 h-1 rounded-full bg-brutal-dark/20" />
                        <span className="font-data text-xs flex items-center gap-1.5">
                            <Calendar size={12} /> {new Date(project.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                        </span>
                    </div>

                    {/* Reaction buttons */}
                    <div className="flex gap-2.5 mt-5 flex-wrap">
                        <button
                            onClick={() => handleReaction('like')}
                            className={`pd-reaction flex items-center gap-2 px-4 py-2 rounded-full border-2 font-data text-xs font-bold
                                        transition-all duration-300 magnetic-btn
                                        ${myReactions.includes('like')
                                    ? 'bg-brutal-red text-brutal-bg border-brutal-red'
                                    : 'border-brutal-dark/15 text-brutal-dark/60 hover:border-brutal-red/40 hover:text-brutal-red'}`}
                        >
                            <Heart size={14} className={myReactions.includes('like') ? 'fill-current' : ''} />
                            {counts.likes}
                        </button>
                        <button
                            onClick={() => handleReaction('upvote')}
                            className={`pd-reaction flex items-center gap-2 px-4 py-2 rounded-full border-2 font-data text-xs font-bold
                                        transition-all duration-300 magnetic-btn
                                        ${myReactions.includes('upvote')
                                    ? 'bg-brutal-dark text-brutal-bg border-brutal-dark'
                                    : 'border-brutal-dark/15 text-brutal-dark/60 hover:border-brutal-dark/40'}`}
                        >
                            <ArrowUpCircle size={14} /> {counts.upvotes}
                        </button>
                        <button
                            onClick={() => handleReaction('bookmark')}
                            className={`pd-reaction flex items-center gap-2 px-4 py-2 rounded-full border-2 font-data text-xs font-bold
                                        transition-all duration-300 magnetic-btn
                                        ${myReactions.includes('bookmark')
                                    ? 'text-brutal-red border-brutal-red/30 bg-brutal-red/5'
                                    : 'border-brutal-dark/15 text-brutal-dark/60 hover:border-brutal-dark/40'}`}
                        >
                            <Bookmark size={14} className={myReactions.includes('bookmark') ? 'fill-current' : ''} />
                            Save
                        </button>
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════
                MAIN CONTENT + SIDEBAR GRID
            ═══════════════════════════════════════════════════ */}
            <div className="max-w-6xl mx-auto px-6 md:px-12 mt-12 pb-32 grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-14">

                {/* ─── LEFT: Main Content ─── */}
                <div className="lg:col-span-2 space-y-10">

                    {/* Description */}
                    <section className="pd-section">
                        <h2 className="font-heading font-bold text-lg uppercase tracking-tight-heading mb-1">
                            Description
                        </h2>
                        <div className="w-full h-px bg-brutal-dark/10 mb-5" />
                        <div className="font-data text-sm md:text-base text-brutal-dark/75 leading-relaxed whitespace-pre-wrap">
                            {project.description}
                        </div>
                    </section>

                    {/* Video Content */}
                    {project.videos && project.videos.length > 0 && (
                        <section className="pd-section">
                            <h2 className="font-heading font-bold text-lg uppercase tracking-tight-heading mb-1">
                                Video Content
                            </h2>
                            <div className="w-full h-px bg-brutal-dark/10 mb-5" />
                            {project.videos.map(vid => (
                                <div key={vid.id} className="mb-6">
                                    {playingVideoId === vid.id ? (
                                        <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-brutal-dark/10 bg-brutal-dark shadow-lg">
                                            <iframe
                                                src={getEmbedUrl(vid.video_url)}
                                                className="absolute inset-0 w-full h-full"
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                allowFullScreen
                                            />
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setPlayingVideoId(vid.id)}
                                            className="relative w-full aspect-video rounded-2xl overflow-hidden border border-brutal-dark/10
                                                       bg-brutal-dark group cursor-pointer block shadow-lg"
                                        >
                                            {getYoutubeThumbnail(vid.video_url) ? (
                                                <img
                                                    src={getYoutubeThumbnail(vid.video_url)!}
                                                    alt={vid.title}
                                                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100
                                                               group-hover:scale-[1.02] transition-all duration-700"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center"
                                                     style={{
                                                         backgroundImage: 'radial-gradient(circle, rgba(245,243,238,0.06) 1px, transparent 1px)',
                                                         backgroundSize: '24px 24px',
                                                     }}>
                                                </div>
                                            )}
                                            {/* Overlay */}
                                            <div className="absolute inset-0 bg-brutal-dark/20 group-hover:bg-brutal-dark/10 transition-colors duration-500" />
                                            {/* Play button */}
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <div className="w-16 h-16 rounded-full bg-brutal-red flex items-center justify-center
                                                                shadow-[0_0_30px_rgba(196,41,30,0.3)]
                                                                group-hover:shadow-[0_0_50px_rgba(196,41,30,0.5)]
                                                                group-hover:scale-110 transition-all duration-500">
                                                    <Play size={28} className="text-brutal-bg fill-brutal-bg ml-0.5" />
                                                </div>
                                            </div>
                                            {/* Bottom label */}
                                            {vid.title && (
                                                <div className="absolute bottom-4 left-4 font-data text-xs text-brutal-bg/70 font-bold uppercase tracking-widest">
                                                    {vid.title}
                                                </div>
                                            )}
                                        </button>
                                    )}
                                </div>
                            ))}
                        </section>
                    )}

                    {/* Milestones */}
                    {project.milestones && project.milestones.length > 0 && (
                        <section className="pd-section">
                            <div className="flex items-end justify-between mb-8">
                                <div>
                                    <span className="font-data text-[10px] text-brutal-red font-bold uppercase tracking-[0.2em] block mb-2">
                                        Build Progress
                                    </span>
                                    <h3 className="font-drama italic text-3xl md:text-4xl text-brutal-dark">
                                        Specs
                                    </h3>
                                </div>
                                <span className="font-data text-xs text-brutal-dark/40 font-bold uppercase tracking-widest">
                                    {completedMilestones}/{totalMilestones} Done
                                </span>
                            </div>

                            {/* Progress bar */}
                            <div className="w-full h-1 bg-brutal-dark/8 rounded-full mb-10 overflow-hidden">
                                <div
                                    className="milestone-bar-fill h-full bg-brutal-red rounded-full origin-left"
                                    style={{ width: `${milestonePercent}%` }}
                                />
                            </div>

                            {/* Milestone cards in a grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {project.milestones.map((milestone: any, i: number) => (
                                    <div
                                        key={milestone.id}
                                        className={`p-6 rounded-2xl border-2 transition-all duration-300
                                            ${milestone.is_complete
                                                ? 'bg-brutal-bg border-brutal-dark/5 opacity-50'
                                                : 'bg-brutal-bg border-brutal-dark/10 hover:border-brutal-red/30'}`}
                                    >
                                        <span className="font-data text-3xl font-bold text-brutal-red">
                                            {String(i + 1).padStart(2, '0')}
                                        </span>
                                        <h4 className={`font-heading font-bold text-base uppercase tracking-tight-heading mt-3
                                            ${milestone.is_complete ? 'line-through text-brutal-dark/40' : 'text-brutal-dark'}`}>
                                            {milestone.title}
                                        </h4>
                                        {milestone.description && (
                                            <p className="font-data text-xs text-brutal-dark/50 mt-2 leading-relaxed">
                                                {milestone.description}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Gallery */}
                    {project.images && project.images.length > 1 && (
                        <section className="pd-section">
                            <h3 className="font-heading font-bold text-2xl uppercase tracking-tight-heading mb-6">Gallery</h3>
                            <div className="grid grid-cols-2 gap-4">
                                {project.images.slice(1).map((img, i) => (
                                    <div key={i} className="group rounded-2xl overflow-hidden border border-brutal-dark/10 bg-brutal-dark/5">
                                        <img
                                            src={img.image_url}
                                            className="w-full h-48 md:h-56 object-cover group-hover:scale-105
                                                       transition-transform duration-700 ease-out"
                                            alt={img.caption || 'Gallery'}
                                        />
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Discussion / Comments */}
                    <section className="pd-section">
                        <div className="flex items-center justify-between mb-1">
                            <h2 className="font-heading font-bold text-lg uppercase tracking-tight-heading">
                                Discussion
                            </h2>
                            {comments.length > 0 && (
                                <span className="font-data text-xs text-brutal-dark/40 font-bold">
                                    {comments.length} comment{comments.length !== 1 ? 's' : ''}
                                </span>
                            )}
                        </div>
                        <div className="w-full h-px bg-brutal-dark/10 mb-5" />

                        {/* Comment input — at top like YouTube */}
                        {user ? (
                            <form onSubmit={handleComment} className="flex items-start gap-3 mb-6">
                                <div className="w-8 h-8 rounded-full bg-brutal-dark text-brutal-bg font-heading font-bold
                                                flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                                    {user.email?.charAt(0).toUpperCase() || '?'}
                                </div>
                                <div className="flex-1">
                                    <input
                                        type="text"
                                        value={commentText}
                                        onChange={(e) => setCommentText(e.target.value)}
                                        placeholder="Add a comment..."
                                        className="w-full bg-transparent text-brutal-dark border-b-2 border-brutal-dark/10 px-0 py-2
                                                   font-data text-sm placeholder:text-brutal-dark/30
                                                   focus:outline-none focus:border-brutal-red/50
                                                   transition-all duration-300"
                                    />
                                    {commentText.trim() && (
                                        <div className="flex justify-end gap-2 mt-3">
                                            <button
                                                type="button"
                                                onClick={() => setCommentText('')}
                                                className="font-data text-xs font-bold uppercase tracking-wider text-brutal-dark/40
                                                           hover:text-brutal-dark transition-colors px-3 py-1.5"
                                            >
                                                Cancel
                                            </button>
                                            <Button type="submit" size="sm" className="px-4 py-1.5 text-xs">
                                                Comment
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </form>
                        ) : (
                            <div className="flex items-center gap-3 mb-6 p-4 rounded-xl bg-brutal-dark/[0.03] border border-brutal-dark/8">
                                <div className="w-8 h-8 rounded-full bg-brutal-dark/10 flex items-center justify-center flex-shrink-0">
                                    <span className="font-data text-xs text-brutal-dark/30">?</span>
                                </div>
                                <p className="font-data text-sm text-brutal-dark/50">
                                    <Link to="/login" className="text-brutal-red font-bold hover:underline">Log in</Link>
                                    {' '}to join the discussion.
                                </p>
                            </div>
                        )}

                        {/* Comments list */}
                        <div className="space-y-1">
                            {comments.map(c => {
                                const timeAgo = (() => {
                                    const diff = Date.now() - new Date(c.created_at).getTime();
                                    const mins = Math.floor(diff / 60000);
                                    if (mins < 1) return 'just now';
                                    if (mins < 60) return `${mins}m ago`;
                                    const hrs = Math.floor(mins / 60);
                                    if (hrs < 24) return `${hrs}h ago`;
                                    const days = Math.floor(hrs / 24);
                                    if (days < 7) return `${days}d ago`;
                                    return new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                                })();

                                return (
                                    <div key={c.id} className="flex items-start gap-3 py-3 group">
                                        <div className="w-8 h-8 rounded-full bg-brutal-dark text-brutal-bg font-heading font-bold
                                                        flex items-center justify-center text-xs flex-shrink-0">
                                            {c.userName?.charAt(0) || '?'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-data text-xs font-bold text-brutal-dark">
                                                    {c.userName || 'Anonymous'}
                                                </span>
                                                <span className="font-data text-[10px] text-brutal-dark/30">
                                                    {timeAgo}
                                                </span>
                                            </div>
                                            <p className="font-data text-sm text-brutal-dark/70 leading-relaxed mt-0.5">
                                                {c.content}
                                            </p>
                                            {user && c.user_id === user.id && (
                                                <button
                                                    onClick={() => deleteComment(c.id)}
                                                    className="font-data text-[10px] font-bold text-brutal-dark/25 uppercase tracking-wider
                                                               hover:text-brutal-red transition-colors mt-1 opacity-0 group-hover:opacity-100"
                                                >
                                                    Delete
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            {comments.length === 0 && (
                                <p className="font-data text-sm text-brutal-dark/30 py-6 text-center">
                                    No comments yet. Be the first to share your thoughts.
                                </p>
                            )}
                        </div>
                    </section>
                </div>

                {/* ─── RIGHT: Sidebar ─── */}
                <div className="pd-sidebar space-y-8">

                    {/* Details card */}
                    <Card className="pd-sidebar-card p-5 border-brutal-dark/10">
                        <h3 className="font-heading font-bold text-sm uppercase tracking-tight-heading mb-4">Details</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-baseline border-b border-brutal-dark/5 pb-2.5">
                                <span className="font-data text-xs text-brutal-dark/40 uppercase">Duration</span>
                                <span className="font-data text-sm font-bold">{project.duration || '—'}</span>
                            </div>
                            <div className="flex justify-between items-baseline border-b border-brutal-dark/5 pb-2.5">
                                <span className="font-data text-xs text-brutal-dark/40 uppercase">Status</span>
                                <span className="font-data text-xs font-bold text-green-600 uppercase">
                                    {project.status}
                                </span>
                            </div>
                            {totalMilestones > 0 && (
                                <div className="flex justify-between items-baseline border-b border-brutal-dark/5 pb-2.5">
                                    <span className="font-data text-xs text-brutal-dark/40 uppercase">Progress</span>
                                    <span className="font-data text-sm font-bold">{Math.round(milestonePercent)}%</span>
                                </div>
                            )}
                            <div className="flex justify-between items-baseline">
                                <span className="font-data text-xs text-brutal-dark/40 uppercase">Reactions</span>
                                <span className="font-data text-sm font-bold">{counts.likes + counts.upvotes}</span>
                            </div>
                        </div>

                        {project.github_url && (
                            <a
                                href={project.github_url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center justify-center gap-2 w-full mt-5 p-2.5 bg-brutal-dark text-brutal-bg
                                           rounded-xl font-data text-xs font-bold uppercase tracking-widest
                                           hover:bg-brutal-red transition-colors duration-300"
                            >
                                <Github size={14} /> Source Code
                            </a>
                        )}
                    </Card>

                    {/* Team card */}
                    <Card className="pd-sidebar-card p-5 border-brutal-dark/10">
                        <h3 className="font-heading font-bold text-sm uppercase tracking-tight-heading mb-4">Team</h3>

                        <div className="space-y-4">
                            {/* Owner */}
                            <div className="flex items-center gap-3 group">
                                <div className="w-9 h-9 rounded-full bg-brutal-dark text-brutal-bg font-heading font-bold
                                                flex items-center justify-center text-sm flex-shrink-0">
                                    {project.ownerName.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-data text-sm font-bold truncate">{project.ownerName}</div>
                                    <div className="font-data text-[10px] text-brutal-red font-bold uppercase tracking-widest">Owner</div>
                                </div>
                            </div>

                            {/* Mentors */}
                            {project.members?.filter((m: any) => m.role === 'mentor').map((m: any) => (
                                <div key={m.id} className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-brutal-dark/10 text-brutal-dark font-heading font-bold
                                                    flex items-center justify-center text-sm flex-shrink-0 border border-brutal-dark/10">
                                        {m.name.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-data text-sm font-bold truncate">{m.name}</div>
                                        <div className="font-data text-[10px] text-brutal-dark/40 font-bold uppercase tracking-widest">Mentor</div>
                                    </div>
                                </div>
                            ))}

                            {/* Contributors */}
                            {project.members?.filter((m: any) => m.role !== 'mentor' && m.user_id !== project.owner_id).map((m: any) => (
                                <div key={m.id} className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-brutal-dark/5 text-brutal-dark/60 font-heading font-bold
                                                    flex items-center justify-center text-sm flex-shrink-0 border border-brutal-dark/10">
                                        {m.name.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-data text-sm font-bold truncate">{m.name}</div>
                                        <div className="font-data text-[10px] text-brutal-dark/30 uppercase tracking-widest">{m.role}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>

                    {/* Approval Status (owner only) */}
                    {user?.id === project.owner_id && (
                        <Card className="pd-sidebar-card p-6 border-brutal-dark/10">
                            <h3 className="font-heading font-bold text-sm uppercase tracking-tight-heading mb-5">
                                Approval Status
                            </h3>
                            <div className="relative pl-6 space-y-5">
                                <div className="absolute left-[11px] top-2 bottom-4 w-px bg-brutal-dark/10 z-0" />

                                {['draft', 'pending_review', project.status === 'rejected' ? 'rejected' : 'active'].map((step) => {
                                    const labels: Record<string, string> = {
                                        'draft': 'Drafting',
                                        'pending_review': 'Under Review',
                                        'active': 'Active / Approved',
                                        'rejected': 'Rejected — Revise',
                                    };
                                    const isCurrent = project.status === step;
                                    const isPast = ['draft', 'pending_review', 'active', 'rejected'].indexOf(project.status) >
                                        ['draft', 'pending_review', 'active', 'rejected'].indexOf(step);

                                    return (
                                        <div key={step} className="relative z-10 flex items-center gap-3">
                                            <div className={`w-2.5 h-2.5 rounded-full -ml-[17px] transition-all
                                                ${isCurrent ? 'bg-brutal-red ring-4 ring-brutal-red/15' : isPast ? 'bg-brutal-dark' : 'bg-brutal-dark/15'}`}
                                            />
                                            <span className={`font-data text-xs font-bold uppercase tracking-wider
                                                ${isCurrent ? 'text-brutal-red' : 'text-brutal-dark/35'}`}>
                                                {labels[step]}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>
                    )}

                    {/* Tags */}
                    {project.tags && project.tags.length > 0 && (
                        <div className="pd-sidebar-card">
                            <h3 className="font-heading font-bold text-sm uppercase tracking-tight-heading mb-4">Tags</h3>
                            <div className="flex flex-wrap gap-2">
                                {project.tags.map(t => (
                                    <span key={t} className="px-3 py-1 font-data text-[10px] font-bold uppercase tracking-wider
                                                            text-brutal-red bg-brutal-red/5 rounded-full border border-brutal-red/15">
                                        {t}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* GitHub README hint */}
                    {project.github_url && (
                        <Card className="pd-sidebar-card p-5 border-brutal-dark/10">
                            <div className="flex items-center justify-between mb-3">
                                <span className="font-data text-[10px] font-bold uppercase text-brutal-dark/40 tracking-widest">README</span>
                                <span className="font-data text-[8px] text-brutal-dark/25 font-bold tracking-wider">SYNC COMING SOON</span>
                            </div>
                            <a
                                href={`${project.github_url}/blob/main/README.md`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 font-data text-xs font-bold text-brutal-dark/60
                                           hover:text-brutal-red transition-colors"
                            >
                                <Github size={12} /> View on GitHub
                                <ChevronRight size={12} />
                            </a>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
