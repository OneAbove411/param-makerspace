import { useState, useMemo, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router';
import {
    useChallenge,
    useChallengeCompletion,
    useReaction,
    useChallengeCompletionCount,
    useRelatedChallenges,
    useChallengeCompletions,
    useComments,
} from '../lib/hooks';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { toast } from '../lib/toast';
import {
    ArrowLeft,
    Clock,
    CheckCircle2,
    Loader2,
    Heart,
    Bookmark,
    Share2,
    Sparkles,
    ListChecks,
    Layers,
    BookOpen,
    Image as ImageIcon,
    Wrench,
    Target,
    ShieldCheck,
    HelpCircle,
    Zap,
    Crosshair,
    ChevronRight,
    AlertTriangle,
    ArrowRight,
    Users,
    Trophy,
    MessageCircle,
} from 'lucide-react';
import { getEmbedUrl } from '../lib/videoUtils';
import { cn } from '../lib/utils';
import { XP_REWARDS } from '../lib/constants';
import { WhatsNextClosure } from '../components/shared/WhatsNextClosure';
import CommentThread from '../components/shared/CommentThread';

// ─────────────────────────────────────────────────────────────────────────────
// Challenge Details — P1 Revamp v2
//
// Redesigned to match ProjectDetails / EventDetails aesthetic:
//   • Dark full-bleed hero (bg-brutal-dark) — same tone as project details
//   • Centered max-w-6xl body — consistent with events
//   • Two-column grid (content + sidebar) — matches event layout
//   • Metadata pills in hero — backdrop-blur like events
//   • No inline submission form — CTA routes to /challenges/:id/submit
// ─────────────────────────────────────────────────────────────────────────────

// ─── Skeleton ──────────────────────────────────────────────────────────────

function DetailsSkeleton() {
    return (
        <div className="flex-1 w-full bg-brutal-bg min-h-screen">
            <div className="h-[55vh] bg-brutal-dark animate-pulse" />
            <div className="max-w-6xl mx-auto px-6 md:px-10 py-10">
                <div className="h-10 w-48 bg-brutal-dark/5 rounded animate-pulse mb-4" />
                <div className="h-[300px] bg-brutal-dark/5 rounded-2xl animate-pulse" />
            </div>
        </div>
    );
}

// ─── Tier helpers ──────────────────────────────────────────────────────────

const tierDot = (tier?: string | null) =>
    tier === 'Tier 1' ? 'bg-green-400'
        : tier === 'Tier 2' ? 'bg-yellow-400'
            : tier === 'Tier 3' ? 'bg-brutal-red'
                : 'bg-brutal-bg/30';

const tierBlurb = (tier?: string | null) =>
    tier === 'Tier 1' ? 'Open to all — no prerequisites.'
        : tier === 'Tier 2' ? 'Requires Tier 1 completion or direct domain experience.'
            : tier === 'Tier 3' ? 'Requires Tier 2 completion or mentor approval.'
                : 'Tier access information unavailable.';

const tierName = (tier?: string | null) =>
    tier === 'Tier 1' ? 'Explorer' : tier === 'Tier 2' ? 'Solver' : tier === 'Tier 3' ? 'Architect' : 'Open';

type TabKey = 'brief' | 'steps' | 'levels' | 'concepts' | 'media' | 'submissions' | 'discussion';

// ─── Main ──────────────────────────────────────────────────────────────────

export function ChallengeDetails() {
    const { id } = useParams();
    const { data: challenge, loading } = useChallenge(id);
    const { user } = useAuth();
    const { completion } = useChallengeCompletion(id);
    const { counts, myReactions, toggle } = useReaction('challenge', id);
    const { data: completionCount } = useChallengeCompletionCount(id);
    const navigate = useNavigate();
    const location = useLocation();
    const contentTopRef = useRef<HTMLDivElement>(null);

    const [centerTab, setCenterTab] = useState<TabKey>('brief');

    // Track which tabs have been visited so we lazily fetch only when needed
    const [visitedTabs, setVisitedTabs] = useState<Set<TabKey>>(new Set(['brief']));
    const markVisited = (k: TabKey) => {
        setVisitedTabs((prev) => {
            if (prev.has(k)) return prev;
            const next = new Set(prev);
            next.add(k);
            return next;
        });
    };

    // Submissions gallery — only fetch when tab visited
    const { data: completions } = useChallengeCompletions(visitedTabs.has('submissions') ? id : undefined);

    // Discussion — only fetch when tab visited
    const {
        comments, totalCount: commentCount, loading: commentsLoading, sortMode, setSortMode,
        addComment, editComment, deleteComment, toggleCommentLike, togglePin, reportComment,
    } = useComments('challenge', visitedTabs.has('discussion') ? id : undefined);

    // T3 gate — only check for logged-in users
    const [hasT2Completion, setHasT2Completion] = useState<boolean | null>(null);
    useEffect(() => {
        if (!user) { setHasT2Completion(null); return; }
        (async () => {
            const { count } = await supabase
                .from('challenge_completion')
                .select('id, challenge!inner(tier)', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('status', 'verified')
                .eq('challenge.tier', 'Tier 2');
            setHasT2Completion((count || 0) > 0);
        })();
    }, [user?.id]);

    // Related challenges — only fetch once the main challenge is loaded
    const { data: relatedChallenges } = useRelatedChallenges(id, challenge?.domain, challenge?.tier, 3);

    const goBack = () => {
        const from = (location.state as any)?.from;
        if (from) navigate(from);
        else if (typeof window !== 'undefined' && window.history.length > 1) navigate(-1);
        else navigate('/challenges');
    };

    const handleShare = async () => {
        const url = typeof window !== 'undefined' ? window.location.href : '';
        const title = challenge?.title || 'Challenge';
        try {
            if (typeof navigator !== 'undefined' && (navigator as any).share) {
                await (navigator as any).share({ title, url });
                return;
            }
        } catch { /* cancelled */ }
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

    const handleTab = (k: TabKey) => {
        setCenterTab(k);
        markVisited(k);
        if (contentTopRef.current) {
            const rect = contentTopRef.current.getBoundingClientRect();
            const y = window.scrollY + rect.top - 120;
            window.scrollTo({ top: y, behavior: 'smooth' });
        }
    };

    const coverImage = useMemo(() => {
        if (!challenge) return null;
        return (challenge as any).cover_image_url || challenge.images?.[0]?.image_url || null;
    }, [challenge]);

    const galleryImages = useMemo(() => {
        if (!challenge) return [] as { image_url: string; caption: string | null; display_order: number }[];
        const hasCoverUrl = !!(challenge as any).cover_image_url;
        return hasCoverUrl ? challenge.images : (challenge.images || []).slice(1);
    }, [challenge]);

    if (loading) return <DetailsSkeleton />;

    if (!challenge) {
        return (
            <div className="flex-1 w-full bg-brutal-bg pt-32 px-6 md:px-12 min-h-screen">
                <div className="max-w-2xl mx-auto text-center py-32">
                    <h1 className="font-heading font-bold text-3xl md:text-5xl uppercase tracking-tight-heading text-brutal-dark/20">
                        Challenge Not Found
                    </h1>
                    <p className="font-data text-sm text-brutal-dark/40 mt-4">
                        This challenge may have been removed or doesn't exist.
                    </p>
                    <button type="button" onClick={goBack}
                        className="inline-flex items-center gap-2 mt-8 font-heading font-bold text-sm uppercase text-brutal-dark hover:text-brutal-red transition-colors">
                        <ArrowLeft size={16} /> Back
                    </button>
                </div>
            </div>
        );
    }

    const isLiked = myReactions.includes('like');
    const isBookmarked = myReactions.includes('bookmark');
    const completionState = completion?.status;

    const hasBrief = !!(challenge.core_idea || challenge.mission || challenge.success_criteria);
    const hasSteps = challenge.steps.length > 0;
    const hasLevels = challenge.levels.length > 0;
    const hasConcepts = challenge.vocabulary.length > 0 || challenge.skills.length > 0;
    const hasMedia = galleryImages.length > 0 || challenge.videos.length > 0;

    const bountyXP = challenge.tier === 'Tier 3' ? XP_REWARDS.tier3_challenge
        : challenge.tier === 'Tier 2' ? XP_REWARDS.tier2_challenge
            : XP_REWARDS.tier1_challenge;

    const allTabs: { k: TabKey; label: string; icon: ReactNode; hasContent: boolean; count?: number }[] = [
        { k: 'brief', label: 'Brief', icon: <BookOpen size={14} />, hasContent: hasBrief },
        { k: 'steps', label: 'Steps', icon: <ListChecks size={14} />, hasContent: hasSteps, count: challenge.steps.length || undefined },
        { k: 'levels', label: 'Levels', icon: <Layers size={14} />, hasContent: hasLevels },
        { k: 'concepts', label: 'Concepts', icon: <Sparkles size={14} />, hasContent: hasConcepts },
        { k: 'media', label: 'Media', icon: <ImageIcon size={14} />, hasContent: hasMedia },
        { k: 'submissions', label: 'Submissions', icon: <Trophy size={14} />, hasContent: (completions?.length ?? 0) > 0, count: completions?.length || undefined },
        { k: 'discussion', label: 'Discussion', icon: <MessageCircle size={14} />, hasContent: true, count: commentCount || undefined },
    ];

    return (
        <div className="flex-1 w-full bg-brutal-bg min-h-screen">

            {/* ═══════════════════════════════════════════════════════
                HERO — Dark full-bleed, matches Project/Event detail pages
            ═══════════════════════════════════════════════════════ */}
            <header className="relative w-full min-h-[50vh] md:min-h-[55vh] flex items-end overflow-hidden">
                {/* Cover image — shown prominently like event pages */}
                {coverImage ? (
                    <img src={coverImage} alt={challenge.title} className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                    <div className="absolute inset-0 bg-brutal-dark" style={{
                        backgroundImage: 'radial-gradient(circle, rgba(245,243,238,0.04) 1px, transparent 1px)',
                        backgroundSize: '30px 30px',
                    }} />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-brutal-dark via-brutal-dark/80 to-brutal-dark/30" />

                <div className="relative z-10 w-full max-w-6xl mx-auto px-6 md:px-10 pt-32 md:pt-36 pb-8 md:pb-12">
                    {/* Domain badge */}
                    {challenge.domain && (
                        <div className="mb-5">
                            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brutal-bg/10 border border-brutal-bg/15">
                                <span className={cn('w-2 h-2 rounded-full', tierDot(challenge.tier))} />
                                <span className="font-data text-[11px] font-bold uppercase tracking-wider text-brutal-bg/80">
                                    {challenge.domain}
                                </span>
                            </span>
                        </div>
                    )}

                    {/* Title */}
                    <h1 className="font-heading font-bold text-[clamp(1.8rem,4.5vw,3.5rem)] uppercase tracking-tight leading-[0.95] text-brutal-bg max-w-3xl">
                        {challenge.title}
                    </h1>

                    {/* Mystery as subtitle */}
                    {challenge.mystery && (
                        <p className="mt-4 font-body text-base md:text-lg text-brutal-bg/60 leading-relaxed max-w-xl italic">
                            {challenge.mystery}
                        </p>
                    )}

                    {/* Metadata grid */}
                    <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-xl">
                        <div>
                            <div className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-bg/35 mb-0.5">Tier</div>
                            <div className="font-heading font-bold text-[15px] text-brutal-bg flex items-center gap-1.5">
                                <span className={cn('w-2 h-2 rounded-full', tierDot(challenge.tier))} />
                                {tierName(challenge.tier)}
                            </div>
                        </div>
                        {challenge.time_estimate && (
                            <div>
                                <div className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-bg/35 mb-0.5">Time</div>
                                <div className="font-heading font-bold text-[15px] text-brutal-bg">{challenge.time_estimate}</div>
                            </div>
                        )}
                        <div>
                            <div className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-bg/35 mb-0.5">Bounty</div>
                            <div className="font-heading font-bold text-[15px] text-brutal-red">+{bountyXP} XP</div>
                        </div>
                        <div>
                            <div className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-bg/35 mb-0.5">Completed</div>
                            <div className="font-heading font-bold text-[15px] text-brutal-bg">{completionCount ?? 0}</div>
                        </div>
                    </div>

                    {/* Action pills */}
                    <div className="flex flex-wrap items-center gap-2 mt-6">
                        <button type="button" onClick={() => handleReaction('like')} aria-label={isLiked ? 'Unlike' : 'Like'}
                            className={cn(
                                'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full font-data text-[11px] font-bold uppercase tracking-wider transition-all',
                                isLiked
                                    ? 'bg-brutal-red text-brutal-bg'
                                    : 'bg-brutal-dark/30 backdrop-blur-sm text-brutal-bg/70 border border-brutal-bg/15 hover:border-brutal-bg/30',
                            )}>
                            <Heart size={12} className={isLiked ? 'fill-current' : ''} />
                            {counts.likes > 0 && counts.likes}
                        </button>
                        <button type="button" onClick={() => handleReaction('bookmark')} aria-pressed={isBookmarked} aria-label={isBookmarked ? 'Unsave' : 'Save'}
                            className={cn(
                                'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full font-data text-[11px] font-bold uppercase tracking-wider transition-all',
                                isBookmarked
                                    ? 'bg-brutal-red text-brutal-bg'
                                    : 'bg-brutal-dark/30 backdrop-blur-sm text-brutal-bg/70 border border-brutal-bg/15 hover:border-brutal-bg/30',
                            )}>
                            <Bookmark size={12} className={isBookmarked ? 'fill-current' : ''} />
                        </button>
                        <button type="button" onClick={handleShare} aria-label="Share"
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-brutal-dark/30 backdrop-blur-sm text-brutal-bg/70 border border-brutal-bg/15 hover:border-brutal-bg/30 font-data text-[11px] font-bold uppercase tracking-wider transition-all">
                            <Share2 size={12} />
                        </button>
                    </div>
                </div>
            </header>

            {/* ═══════════════════════════════════════════════════════
                TAB BAR — sticky, centered
            ═══════════════════════════════════════════════════════ */}
            <div ref={contentTopRef} className="sticky top-0 z-20 bg-brutal-bg border-b border-brutal-dark/10">
                <nav className="max-w-6xl mx-auto flex items-center overflow-x-auto no-scrollbar px-6 md:px-10">
                    {allTabs.map((tab) => (
                        <button
                            key={tab.k}
                            type="button"
                            onClick={() => tab.hasContent && handleTab(tab.k)}
                            className={cn(
                                'flex items-center gap-1.5 px-3 md:px-4 py-3.5 font-data text-[11px] font-bold uppercase tracking-wider transition-colors relative whitespace-nowrap flex-shrink-0',
                                centerTab === tab.k
                                    ? 'text-brutal-red cursor-pointer'
                                    : tab.hasContent
                                        ? 'text-brutal-dark/40 hover:text-brutal-dark/70 cursor-pointer'
                                        : 'text-brutal-dark/20 pointer-events-none',
                            )}>
                            {tab.icon}
                            {tab.label}
                            {tab.count && tab.count > 0 && (
                                <span className="ml-0.5 font-data text-[9px] tabular-nums opacity-60">{tab.count}</span>
                            )}
                            {centerTab === tab.k && (
                                <span className="absolute bottom-0 left-2 right-2 h-[2.5px] bg-brutal-red rounded-t-full" />
                            )}
                        </button>
                    ))}
                </nav>
            </div>

            {/* ═══════════════════════════════════════════════════════
                BODY — Two-column grid (content + sidebar)
            ═══════════════════════════════════════════════════════ */}
            <div className="max-w-6xl mx-auto px-6 md:px-10 py-8 md:py-10">
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8 md:gap-10">

                    {/* ── MAIN CONTENT ─────────────────────────────── */}
                    <div className="min-w-0 space-y-6">

                        {/* ── BRIEF ── */}
                        {centerTab === 'brief' && (
                            <div className="space-y-5">
                                {challenge.core_idea && (
                                    <BriefCard label="Core Idea" icon={<Sparkles size={13} className="text-brutal-red" />}>
                                        <p className="font-body text-[14px] text-brutal-dark/80 leading-relaxed">{challenge.core_idea}</p>
                                    </BriefCard>
                                )}
                                {challenge.mission && (
                                    <BriefCard label="Mission" icon={<Crosshair size={13} className="text-brutal-red" />}>
                                        <p className="font-body text-[14px] text-brutal-dark/80 leading-relaxed">{challenge.mission}</p>
                                    </BriefCard>
                                )}
                                {challenge.success_criteria && (
                                    <BriefCard label="Success Criteria" icon={<CheckCircle2 size={13} className="text-brutal-red" />} accent>
                                        <p className="font-body text-[14px] font-medium text-brutal-dark leading-relaxed">{challenge.success_criteria}</p>
                                    </BriefCard>
                                )}
                                {!hasBrief && (
                                    <div className="text-center py-16">
                                        <BookOpen size={32} className="mx-auto text-brutal-dark/15 mb-3" />
                                        <p className="font-data text-sm text-brutal-dark/30">No brief yet.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── STEPS ── */}
                        {centerTab === 'steps' && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/40">{challenge.steps.length} Steps</span>
                                </div>
                                <ol className="space-y-3">
                                    {challenge.steps.map((step, idx) => (
                                        <li key={idx} className="rounded-xl border border-brutal-dark/10 bg-brutal-bg p-4 flex items-start gap-4 hover:border-brutal-dark/20 transition-colors">
                                            <div className="w-8 h-8 rounded-full bg-brutal-dark text-brutal-bg font-data text-xs font-bold flex items-center justify-center flex-shrink-0 tabular-nums">
                                                {String(idx + 1).padStart(2, '0')}
                                            </div>
                                            <p className="font-body text-[14px] text-brutal-dark/75 leading-relaxed pt-1">{step}</p>
                                        </li>
                                    ))}
                                </ol>
                            </div>
                        )}

                        {/* ── LEVELS ── */}
                        {centerTab === 'levels' && (
                            <div className="space-y-3">
                                {challenge.levels.map((lvl, idx) => (
                                    <div key={idx} className="rounded-xl border border-brutal-dark/10 bg-brutal-bg p-4 flex items-start gap-4 hover:border-brutal-dark/20 transition-colors">
                                        <div className="w-8 h-8 rounded-full bg-brutal-dark/8 text-brutal-dark/50 font-data text-xs font-bold flex items-center justify-center flex-shrink-0">
                                            {idx + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-heading font-bold text-sm uppercase tracking-tight text-brutal-dark">{lvl.level_name}</h4>
                                            {lvl.description && (
                                                <p className="font-body text-sm text-brutal-dark/60 leading-relaxed mt-1">{lvl.description}</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* ── CONCEPTS ── */}
                        {centerTab === 'concepts' && (
                            <div className="space-y-6">
                                {challenge.vocabulary.length > 0 && (
                                    <div>
                                        <p className="font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/40 mb-3">Key Vocabulary</p>
                                        <dl className="space-y-2">
                                            {challenge.vocabulary.map((v, i) => (
                                                <div key={i} className="rounded-xl border border-brutal-dark/10 p-4">
                                                    <dt className="font-heading font-bold text-sm text-brutal-dark">{v.term}</dt>
                                                    {v.definition && <dd className="font-body text-sm text-brutal-dark/60 mt-1 leading-relaxed">{v.definition}</dd>}
                                                </div>
                                            ))}
                                        </dl>
                                    </div>
                                )}
                                {challenge.skills.length > 0 && (
                                    <div>
                                        <p className="font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/40 mb-3">Skills Developed</p>
                                        <div className="flex flex-wrap gap-2">
                                            {challenge.skills.map((s, i) => (
                                                <span key={i} className="px-3 py-1.5 bg-brutal-dark text-brutal-bg rounded-full font-data text-[11px] font-bold uppercase tracking-wider">{s}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── MEDIA ── */}
                        {centerTab === 'media' && (
                            <div className="space-y-4">
                                {challenge.videos.length === 0 && galleryImages.length === 0 ? (
                                    <div className="text-center py-16">
                                        <ImageIcon size={32} className="mx-auto text-brutal-dark/15 mb-3" />
                                        <p className="font-data text-sm text-brutal-dark/30">No additional media.</p>
                                    </div>
                                ) : (
                                    <>
                                        {challenge.videos.map((vid, idx) => (
                                            <div key={idx} className="relative w-full aspect-video rounded-xl overflow-hidden border border-brutal-dark/10 bg-brutal-dark">
                                                <iframe title={vid.title || `Video ${idx + 1}`} src={getEmbedUrl(vid.video_url)}
                                                    className="absolute inset-0 w-full h-full"
                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                    allowFullScreen />
                                            </div>
                                        ))}
                                        {galleryImages.length > 0 && (
                                            <div className="grid grid-cols-2 gap-3">
                                                {galleryImages.map((img, idx) => (
                                                    <div key={idx} className="rounded-xl border border-brutal-dark/10 overflow-hidden bg-brutal-dark/5 hover:border-brutal-dark/25 transition-colors">
                                                        <img src={img.image_url} alt={img.caption || `Image ${idx + 1}`} loading="lazy"
                                                            className="w-full h-36 object-cover" />
                                                        {img.caption && <p className="font-data text-[10px] text-brutal-dark/50 text-center py-2 px-2">{img.caption}</p>}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}

                        {/* ── SUBMISSIONS GALLERY ── */}
                        {centerTab === 'submissions' && (
                            <div className="space-y-4">
                                {(!completions || completions.length === 0) ? (
                                    <div className="text-center py-16">
                                        <Trophy size={32} className="mx-auto text-brutal-dark/15 mb-3" />
                                        <p className="font-data text-sm text-brutal-dark/30">No verified submissions yet.</p>
                                        <p className="font-data text-xs text-brutal-dark/20 mt-1">Be the first to complete this challenge.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {completions.map((c) => (
                                            <div key={c.id} className="rounded-xl border border-brutal-dark/10 bg-brutal-bg p-4 hover:border-brutal-dark/20 transition-colors">
                                                <div className="flex items-center gap-3 mb-3">
                                                    {c.user_avatar ? (
                                                        <img src={c.user_avatar} alt={c.user_name} className="w-8 h-8 rounded-full object-cover border border-brutal-dark/10" />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-full bg-brutal-dark text-brutal-bg font-data text-[10px] font-bold flex items-center justify-center">
                                                            {c.user_name.charAt(0).toUpperCase()}
                                                        </div>
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <Link to={`/makers/${c.user_id}`} className="font-heading font-bold text-xs uppercase text-brutal-dark hover:text-brutal-red transition-colors truncate block">
                                                            {c.user_name}
                                                        </Link>
                                                        <span className="font-data text-[9px] text-brutal-dark/40">
                                                            {new Date(c.created_at).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                    <CheckCircle2 size={14} className="text-green-500 flex-shrink-0" />
                                                </div>
                                                {c.notes && (
                                                    <p className="font-body text-xs text-brutal-dark/65 leading-relaxed line-clamp-3">{c.notes}</p>
                                                )}
                                                {c.evidence_url && (
                                                    <a href={c.evidence_url} target="_blank" rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1.5 mt-2 font-data text-[10px] font-bold text-brutal-red hover:underline">
                                                        <ArrowRight size={10} /> View Evidence
                                                    </a>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── DISCUSSION ── */}
                        {centerTab === 'discussion' && (
                            <CommentThread
                                comments={comments}
                                totalCount={commentCount}
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
                            />
                        )}

                        {/* ── COMPLETION CTA ─────────────────────────── */}
                        <div className="border-t border-brutal-dark/10 pt-8 mt-4">
                            {completionState ? (
                                <div className={cn(
                                    'rounded-xl border p-5 text-center',
                                    completionState === 'verified'
                                        ? 'bg-green-50 border-green-200 text-green-700'
                                        : completionState === 'declined'
                                            ? 'bg-red-50 border-red-200 text-red-700'
                                            : 'bg-yellow-50 border-yellow-200 text-yellow-700',
                                )}>
                                    <p className="font-data text-[9px] font-bold uppercase tracking-widest opacity-60 mb-1">Quest Status</p>
                                    <div className="font-heading font-bold text-sm uppercase tracking-tight flex items-center justify-center gap-2">
                                        {completionState === 'verified' && <CheckCircle2 size={15} />}
                                        {(completionState === 'pending_review' || completionState === 'pending') && <Loader2 size={15} className="animate-spin" />}
                                        {completionState === 'verified' ? 'Bounty Claimed'
                                            : completionState === 'declined' ? 'Submission Declined' : 'Pending Verification'}
                                    </div>
                                </div>
                            ) : user ? (
                                challenge?.tier === 'Tier 3' && hasT2Completion === false ? (
                                    <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-5 text-center space-y-3">
                                        <AlertTriangle size={20} className="mx-auto text-yellow-500" />
                                        <p className="font-body text-sm text-yellow-800">
                                            Complete at least one <strong>Tier 2</strong> challenge to unlock Tier 3 submissions.
                                        </p>
                                        <Link to="/challenges?tier=Tier+2"
                                            className="inline-flex items-center gap-2 rounded-full bg-yellow-500 text-brutal-dark px-4 py-2 font-data text-[10px] font-bold uppercase tracking-widest hover:bg-yellow-600 transition-colors">
                                            <Target size={11} /> Browse Tier 2
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-5 rounded-xl border border-brutal-dark/10 bg-brutal-bg">
                                        <div className="flex-1">
                                            <p className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-dark/40 mb-1">Ready to claim?</p>
                                            <p className="font-heading font-bold text-sm text-brutal-dark">
                                                Submit your build to earn <span className="text-brutal-red">+{bountyXP} XP</span>
                                            </p>
                                        </div>
                                        <Link
                                            to={`/challenges/${id}/submit`}
                                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brutal-dark text-brutal-bg hover:bg-brutal-red px-6 py-3 font-data text-[11px] font-bold uppercase tracking-widest transition-colors w-full sm:w-auto"
                                        >
                                            <Zap size={13} className="fill-current" /> Claim Bounty
                                            <ArrowRight size={13} />
                                        </Link>
                                    </div>
                                )
                            ) : (
                                <Link to="/login"
                                    className="group block rounded-xl border border-brutal-dark/15 bg-brutal-bg p-5 text-center hover:border-brutal-red/30 transition-all">
                                    <p className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-dark/40 mb-1">Track Progress</p>
                                    <div className="font-heading font-bold text-sm uppercase text-brutal-dark group-hover:text-brutal-red transition-colors flex items-center justify-center gap-2">
                                        Log in to Accept Quest
                                        <ChevronRight size={14} className="opacity-40 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </Link>
                            )}
                        </div>

                        <WhatsNextClosure variant="challenge" />
                    </div>

                    {/* ── SIDEBAR ─────────────────────────────────── */}
                    <aside className="space-y-4 lg:sticky lg:top-28 lg:self-start">
                        {/* Tier access */}
                        <div className="rounded-xl border border-brutal-dark/10 bg-brutal-bg p-5">
                            <div className="flex items-center gap-1.5 mb-2">
                                <span className={cn('w-2 h-2 rounded-full', tierDot(challenge.tier))} />
                                <span className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-dark/50">Access</span>
                            </div>
                            <p className="font-body text-[13px] text-brutal-dark/70 leading-relaxed">{tierBlurb(challenge.tier)}</p>
                            {challenge.tags && challenge.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-3">
                                    {challenge.tags.slice(0, 8).map((t) => (
                                        <span key={t} className="font-data text-[9px] font-bold uppercase tracking-wider text-brutal-dark/55 bg-brutal-dark/5 border border-brutal-dark/10 px-2 py-0.5 rounded-md">
                                            #{t}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Materials */}
                        {challenge.materials.length > 0 && (
                            <div className="rounded-xl border border-brutal-dark/10 bg-brutal-bg p-5">
                                <div className="flex items-center gap-2 mb-3">
                                    <Wrench size={12} className="text-brutal-red" />
                                    <span className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-dark/50">Materials</span>
                                </div>
                                <ul className="space-y-1.5">
                                    {challenge.materials.map((m, i) => (
                                        <li key={i} className="flex items-center gap-2 font-body text-[13px] text-brutal-dark/75">
                                            <span className="w-1 h-1 rounded-full bg-brutal-red flex-shrink-0" />
                                            {m}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Skills */}
                        {challenge.skills.length > 0 && (
                            <div className="rounded-xl border border-brutal-dark/10 bg-brutal-bg p-5">
                                <span className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-dark/50 block mb-2.5">
                                    Skills You'll Develop
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                    {challenge.skills.map((s, i) => (
                                        <span key={i} className="px-2.5 py-1 bg-brutal-dark/5 border border-brutal-dark/10 text-brutal-dark/75 rounded-md font-data text-[10px] font-bold uppercase tracking-wider">{s}</span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* T3 mentor card */}
                        {challenge.tier === 'Tier 3' && (
                            <div className="rounded-xl border border-brutal-red/20 bg-brutal-red/[0.03] p-5">
                                <div className="flex items-center gap-2 mb-2">
                                    <Trophy size={12} className="text-brutal-red" />
                                    <span className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-red/70">Architect Tier</span>
                                </div>
                                <p className="font-body text-[12px] text-brutal-dark/60 leading-relaxed">
                                    Submissions are reviewed by domain mentors for quality, architecture decisions, and real-world applicability.
                                </p>
                            </div>
                        )}

                        {/* Related challenges */}
                        {relatedChallenges && relatedChallenges.length > 0 && (
                            <div className="rounded-xl border border-brutal-dark/10 bg-brutal-bg p-5">
                                <span className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-dark/50 block mb-3">
                                    Related Challenges
                                </span>
                                <div className="space-y-2.5">
                                    {relatedChallenges.map((rc) => (
                                        <Link
                                            key={rc.id}
                                            to={`/challenges/${rc.id}`}
                                            className="block rounded-lg border border-brutal-dark/8 p-3 hover:border-brutal-dark/20 transition-colors group"
                                        >
                                            <h4 className="font-heading font-bold text-xs uppercase tracking-tight text-brutal-dark group-hover:text-brutal-red transition-colors leading-tight">
                                                {rc.title}
                                            </h4>
                                            <div className="flex items-center gap-2 mt-1.5">
                                                <span className="inline-flex items-center gap-1 font-data text-[8px] font-bold uppercase tracking-wider text-brutal-dark/45">
                                                    <span className={cn('w-1 h-1 rounded-full', tierDot(rc.tier))} />
                                                    {rc.tier}
                                                </span>
                                                {rc.domain && (
                                                    <span className="font-data text-[8px] font-bold uppercase tracking-wider text-brutal-dark/35">
                                                        {rc.domain}
                                                    </span>
                                                )}
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}
                    </aside>
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════════════════

function BriefCard({ label, icon, accent = false, children }: {
    label: string; icon: ReactNode; accent?: boolean; children: ReactNode;
}) {
    return (
        <div className={cn(
            'rounded-xl border p-5',
            accent
                ? 'border-brutal-red/20 bg-brutal-red/[0.03]'
                : 'border-brutal-dark/10 bg-brutal-bg',
        )}>
            <div className="flex items-center gap-2 mb-3">
                {icon}
                <span className={cn(
                    'font-data text-[10px] font-bold uppercase tracking-[0.15em]',
                    accent ? 'text-brutal-red' : 'text-brutal-dark/45',
                )}>
                    {label}
                </span>
            </div>
            {children}
        </div>
    );
}
