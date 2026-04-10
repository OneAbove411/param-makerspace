import React, { useState, useMemo, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router';
import { useChallenge, useChallengeCompletion, useReaction } from '../lib/hooks';
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
    Video as VideoIcon,
    Wrench,
    Target,
    ShieldCheck,
    HelpCircle,
} from 'lucide-react';
import { getEmbedUrl } from '../lib/videoUtils';
import { cn } from '../lib/utils';
import { XpRewardBadge } from '../components/ui/XpRewardBadge';
import { XP_REWARDS } from '../lib/constants';

// ─────────────────────────────────────────────────────────────────────────────
// §10 Challenge Cockpit — bento redesign matching ProjectDetails.
//
// Replaces the prior long-scroll 2-col layout with a single-viewport bento:
//
//   ┌─────────── 12 col grid ─────────────────────────────────┐
//   │ IDENTITY (3) │ HERO + TABS (6)         │ ACTION (3)     │
//   │ title/tier   │ cover + brief/steps/    │ completion CTA │
//   │ stats/tier   │ levels/concepts/media   │ materials      │
//   │ tags         │                          │ mystery        │
//   └──────────────────────────────────────────────────────────┘
//
// Mirrors ProjectDetails' tokens: rounded-2xl, border-2 border-brutal-dark/10,
// font-drama italic titles, font-data uppercase microcopy, brutal-red accents,
// 6px offset red shadow on the title card.
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

// ─── Tier dot colour ───────────────────────────────────────────────────────

const tierDot = (tier?: string | null) =>
    tier === 'Tier 1' ? 'bg-green-500'
    : tier === 'Tier 2' ? 'bg-yellow-500'
    : tier === 'Tier 3' ? 'bg-brutal-red'
    : 'bg-brutal-dark/30';

const tierBlurb = (tier?: string | null) =>
    tier === 'Tier 1' ? 'Open to all — no prerequisites.'
    : tier === 'Tier 2' ? 'Requires Tier 1 completion or direct domain experience.'
    : tier === 'Tier 3' ? 'Requires Tier 2 completion or mentor approval.'
    : 'Tier access information unavailable.';

// ─── Main ──────────────────────────────────────────────────────────────────

export function ChallengeDetails() {
    const { id } = useParams();
    const { data: challenge, loading } = useChallenge(id);
    const { user } = useAuth();
    const { completion, markComplete } = useChallengeCompletion(id);
    const { counts, myReactions, toggle } = useReaction('challenge', id);
    const navigate = useNavigate();
    const location = useLocation();

    const [centerTab, setCenterTab] = useState<'brief' | 'steps' | 'levels' | 'concepts' | 'media'>('brief');
    const [showCompleteForm, setShowCompleteForm] = useState(false);
    const [notes, setNotes] = useState('');
    const [evidenceUrl, setEvidenceUrl] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // T3 gate: check if user has any verified Tier 2 completion
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

    const handleMarkComplete = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setSubmitting(true);
        await markComplete(notes, evidenceUrl);
        setSubmitting(false);
        setShowCompleteForm(false);
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
        const canGoBack = typeof window !== 'undefined' && window.history.length > 1;
        return (
            <div className="flex-1 w-full bg-brutal-bg pt-32 px-12 min-h-screen">
                <div className="max-w-2xl mx-auto text-center py-32">
                    <h1 className="font-heading font-bold text-5xl uppercase tracking-tight-heading text-brutal-dark/20">
                        Challenge Not Found
                    </h1>
                    <p className="font-data text-sm text-brutal-dark/40 mt-4">
                        This challenge may have been removed or doesn't exist.
                    </p>
                    <button
                        type="button"
                        onClick={goBack}
                        className="inline-flex items-center gap-2 mt-8 font-heading font-bold text-sm
                                   uppercase text-brutal-dark hover:text-brutal-red transition-colors"
                    >
                        <ArrowLeft size={16} /> {canGoBack ? 'Back' : 'Browse all challenges'}
                    </button>
                </div>
            </div>
        );
    }

    const isLiked = myReactions.includes('like');
    const isBookmarked = myReactions.includes('bookmark');

    const completionState = completion?.status;

    // Tabs that actually have content
    const hasBrief = !!(challenge.core_idea || challenge.mission || challenge.success_criteria);
    const hasSteps = challenge.steps.length > 0;
    const hasLevels = challenge.levels.length > 0;
    const hasConcepts = challenge.vocabulary.length > 0 || challenge.skills.length > 0;
    const hasMedia = galleryImages.length > 0 || challenge.videos.length > 0;

    return (
        <div className="flex-1 w-full bg-brutal-bg min-h-screen">
            <div className="pt-24 md:pt-24 pb-10 px-4 md:px-8 lg:px-10">
                <div className="max-w-[1480px] mx-auto">

                    {/* ── Compact breadcrumb + actions strip ──────────────── */}
                    <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
                        <div className="flex items-center gap-2 min-w-0">
                            <button
                                type="button"
                                onClick={goBack}
                                className="inline-flex items-center gap-1.5 font-data text-[10px] font-bold uppercase tracking-widest
                                           text-brutal-dark/50 hover:text-brutal-red transition-colors"
                            >
                                <ArrowLeft size={12} /> Back
                            </button>
                            <span className="hidden sm:inline font-data text-[10px] text-brutal-dark/30">/</span>
                            <Link
                                to="/challenges"
                                className="hidden sm:inline-flex font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/50 hover:text-brutal-red transition-colors"
                            >
                                Explorer Hub
                            </Link>
                            {challenge.domain && (
                                <>
                                    <span className="hidden md:inline font-data text-[10px] text-brutal-dark/30">/</span>
                                    <span className="hidden md:inline font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/50 truncate">
                                        {challenge.domain}
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
                                aria-label={isBookmarked ? 'Unsave' : 'Save'}
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
                        </div>
                    </div>

                    {/* ── Bento grid ──────────────────────────────────────── */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5">

                        {/* ── Identity column ───────────────────────────── */}
                        <aside className="lg:col-span-3 lg:max-h-[calc(100vh-9rem)] flex flex-col gap-4">

                            {/* Title card */}
                            <div className="rounded-2xl border-2 border-brutal-dark/10 bg-brutal-bg p-5 shadow-[6px_6px_0_0_rgba(196,41,30,0.12)]">
                                {challenge.domain && (
                                    <span className="inline-block font-data text-[9px] font-bold uppercase tracking-widest text-brutal-red mb-2">
                                        #{challenge.domain}
                                    </span>
                                )}
                                <h1 className="font-drama italic text-2xl leading-[1.05] text-brutal-dark mb-3">
                                    {challenge.title}
                                </h1>

                                <div className="flex flex-wrap items-center gap-2">
                                    {challenge.tier && (
                                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 font-data text-[9px] font-bold uppercase tracking-widest rounded-full bg-brutal-dark text-brutal-bg">
                                            <span className={cn('w-1.5 h-1.5 rounded-full', tierDot(challenge.tier))} />
                                            {challenge.tier}
                                        </span>
                                    )}
                                    {challenge.time_estimate && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 font-data text-[9px] font-bold uppercase tracking-widest rounded-full bg-brutal-dark/5 text-brutal-dark/60 border border-brutal-dark/10">
                                            <Clock size={10} /> {challenge.time_estimate}
                                        </span>
                                    )}
                                </div>

                                {/* Success criteria teaser */}
                                {challenge.success_criteria && (
                                    <div className="mt-4 pt-4 border-t border-brutal-dark/10">
                                        <span className="font-data text-[8px] font-bold uppercase tracking-widest text-brutal-red block mb-1.5">
                                            Success Criteria
                                        </span>
                                        <p className="font-data text-[11px] text-brutal-dark/70 leading-snug">
                                            {challenge.success_criteria}
                                        </p>
                                    </div>
                                )}

                                {/* Tags */}
                                {challenge.tags && challenge.tags.length > 0 && (
                                    <div className="mt-4 flex flex-wrap gap-1">
                                        {challenge.tags.slice(0, 8).map((t) => (
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
                                <Stat icon={<ListChecks size={11} />} label="Steps" value={challenge.steps.length} />
                                <Stat icon={<Layers size={11} />} label="Levels" value={challenge.levels.length} />
                                <Stat icon={<Sparkles size={11} />} label="Skills" value={challenge.skills.length} />
                                <Stat icon={<BookOpen size={11} />} label="Concepts" value={challenge.vocabulary.length} />
                                <Stat icon={<Wrench size={11} />} label="Parts" value={challenge.materials.length} />
                                <Stat icon={<Heart size={11} />} label="Likes" value={counts.likes} />
                            </div>

                            {/* Tier access explainer */}
                            <div className="rounded-2xl border-2 border-brutal-dark/10 bg-brutal-bg p-4">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <ShieldCheck size={12} className="text-brutal-red" />
                                    <span className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-dark/45">
                                        Tier Access
                                    </span>
                                </div>
                                <p className="font-data text-[10px] text-brutal-dark/60 leading-relaxed">
                                    {tierBlurb(challenge.tier)}
                                </p>
                            </div>

                            {/* XP Reward */}
                            <XpRewardBadge
                                variant="card"
                                amount={
                                    challenge.tier === 'Tier 3' ? XP_REWARDS.tier3_challenge
                                    : challenge.tier === 'Tier 2' ? XP_REWARDS.tier2_challenge
                                    : XP_REWARDS.tier1_challenge
                                }
                                label="Completion Reward"
                                description={`Complete and get verified to earn ${
                                    challenge.tier === 'Tier 3' ? XP_REWARDS.tier3_challenge
                                    : challenge.tier === 'Tier 2' ? XP_REWARDS.tier2_challenge
                                    : XP_REWARDS.tier1_challenge
                                } XP toward your next rank.`}
                            />

                            {/* Skills pills (if any) — only shows when compact room allows */}
                            {challenge.skills.length > 0 && (
                                <div className="rounded-2xl border-2 border-brutal-dark/10 bg-brutal-bg p-4">
                                    <span className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-dark/45 block mb-2">
                                        Skills You'll Develop
                                    </span>
                                    <div className="flex flex-wrap gap-1">
                                        {challenge.skills.map((s, i) => (
                                            <span
                                                key={i}
                                                className="px-2 py-0.5 bg-brutal-dark text-brutal-bg rounded-full font-data text-[9px] font-bold uppercase tracking-wider"
                                            >
                                                {s}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </aside>

                        {/* ── Center column: cover + tabbed content ─────── */}
                        <main className="lg:col-span-6 flex flex-col gap-4 lg:max-h-[calc(100vh-9rem)] min-h-0">

                            {/* Cover */}
                            {coverImage ? (
                                <div className="relative rounded-2xl overflow-hidden border-2 border-brutal-dark/10 bg-brutal-dark/5 aspect-[16/8] flex-shrink-0">
                                    <img
                                        src={coverImage}
                                        alt={`${challenge.title} cover`}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            ) : (
                                <div className="relative rounded-2xl overflow-hidden border-2 border-brutal-dark/10 bg-brutal-dark text-brutal-bg aspect-[16/8] flex-shrink-0 flex items-center justify-center">
                                    <div className="absolute inset-0 opacity-[0.04] font-heading text-[20rem] font-bold leading-none flex items-center justify-center pointer-events-none select-none">?</div>
                                    <div className="relative z-10 text-center px-6">
                                        <span className="font-data text-[9px] font-bold tracking-[0.25em] text-brutal-red uppercase block mb-2">
                                            The Mystery
                                        </span>
                                        <p className="font-drama italic text-xl md:text-2xl leading-tight max-w-lg mx-auto">
                                            {challenge.mystery || 'Decode this challenge by reading its brief.'}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Tabs strip */}
                            <div className="rounded-2xl border-2 border-brutal-dark/10 bg-brutal-bg flex-1 min-h-0 flex flex-col">
                                <div className="flex border-b-2 border-brutal-dark/10 px-4 flex-shrink-0 overflow-x-auto">
                                    {([
                                        { k: 'brief', label: 'Brief', show: hasBrief, count: 0 },
                                        { k: 'steps', label: 'Steps', show: hasSteps, count: challenge.steps.length },
                                        { k: 'levels', label: 'Levels', show: hasLevels, count: challenge.levels.length },
                                        { k: 'concepts', label: 'Concepts', show: hasConcepts, count: challenge.vocabulary.length },
                                        { k: 'media', label: 'Media', show: hasMedia, count: galleryImages.length + challenge.videos.length },
                                    ] as const).filter(t => t.show).map((t) => (
                                        <button
                                            key={t.k}
                                            type="button"
                                            onClick={() => setCenterTab(t.k)}
                                            className={cn(
                                                'px-3 py-3 font-data text-[10px] font-bold uppercase tracking-widest transition-colors border-b-2 -mb-[2px] whitespace-nowrap',
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

                                    {/* ── BRIEF ── */}
                                    {centerTab === 'brief' && (
                                        <div className="space-y-5">
                                            {challenge.core_idea && (
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1.5">
                                                        <Sparkles size={11} className="text-brutal-red" />
                                                        <span className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-dark/45">
                                                            Core Idea
                                                        </span>
                                                    </div>
                                                    <p className="font-data text-[13px] text-brutal-dark/80 leading-relaxed">
                                                        {challenge.core_idea}
                                                    </p>
                                                </div>
                                            )}

                                            {challenge.mission && (
                                                <div className="pt-4 border-t border-brutal-dark/8">
                                                    <div className="flex items-center gap-2 mb-1.5">
                                                        <Target size={11} className="text-brutal-red" />
                                                        <span className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-dark/45">
                                                            Mission
                                                        </span>
                                                    </div>
                                                    <p className="font-data text-[13px] text-brutal-dark/80 leading-relaxed">
                                                        {challenge.mission}
                                                    </p>
                                                </div>
                                            )}

                                            {challenge.success_criteria && (
                                                <div className="rounded-xl border border-brutal-red/20 bg-brutal-red/[0.04] p-4">
                                                    <div className="flex items-center gap-2 mb-1.5">
                                                        <CheckCircle2 size={11} className="text-brutal-red" />
                                                        <span className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-red">
                                                            Success Criteria
                                                        </span>
                                                    </div>
                                                    <p className="font-data text-[12px] font-bold text-brutal-dark leading-relaxed">
                                                        {challenge.success_criteria}
                                                    </p>
                                                </div>
                                            )}

                                            {!hasBrief && (
                                                <p className="font-data text-xs text-brutal-dark/35 italic text-center py-8">
                                                    No brief yet.
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {/* ── STEPS ── */}
                                    {centerTab === 'steps' && (
                                        <ol className="space-y-3">
                                            {challenge.steps.map((step, idx) => (
                                                <li
                                                    key={idx}
                                                    className="rounded-xl border border-brutal-dark/10 bg-brutal-dark/[0.02] p-4 flex items-start gap-3"
                                                >
                                                    <div className="w-7 h-7 rounded-full bg-brutal-red text-brutal-bg font-data text-[10px] font-bold flex items-center justify-center flex-shrink-0 tabular-nums">
                                                        {String(idx + 1).padStart(2, '0')}
                                                    </div>
                                                    <p className="font-data text-[13px] text-brutal-dark/80 leading-relaxed">
                                                        {step}
                                                    </p>
                                                </li>
                                            ))}
                                        </ol>
                                    )}

                                    {/* ── LEVELS ── */}
                                    {centerTab === 'levels' && (
                                        <div className="space-y-3">
                                            {challenge.levels.map((lvl, idx) => (
                                                <div
                                                    key={idx}
                                                    className="rounded-xl border border-brutal-dark/10 bg-brutal-dark/[0.02] p-4"
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className="w-7 h-7 rounded-full bg-brutal-dark/8 text-brutal-dark/50 font-data text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                                                            {idx + 1}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="font-heading font-bold text-sm uppercase tracking-tight text-brutal-dark">
                                                                {lvl.level_name}
                                                            </h4>
                                                            {lvl.description && (
                                                                <p className="font-data text-xs text-brutal-dark/60 leading-relaxed mt-1.5">
                                                                    {lvl.description}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* ── CONCEPTS ── */}
                                    {centerTab === 'concepts' && (
                                        <div className="space-y-5">
                                            {challenge.vocabulary.length > 0 && (
                                                <div>
                                                    <span className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-dark/45 block mb-3">
                                                        Key Vocabulary
                                                    </span>
                                                    <dl className="space-y-3">
                                                        {challenge.vocabulary.map((v, i) => (
                                                            <div
                                                                key={i}
                                                                className="rounded-xl border border-brutal-dark/10 bg-brutal-dark/[0.02] p-4"
                                                            >
                                                                <dt className="font-heading font-bold text-sm text-brutal-dark">
                                                                    {v.term}
                                                                </dt>
                                                                {v.definition && (
                                                                    <dd className="font-data text-xs text-brutal-dark/60 mt-1 leading-relaxed">
                                                                        {v.definition}
                                                                    </dd>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </dl>
                                                </div>
                                            )}

                                            {challenge.skills.length > 0 && (
                                                <div className="pt-4 border-t border-brutal-dark/8">
                                                    <span className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-dark/45 block mb-3">
                                                        Skills Developed
                                                    </span>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {challenge.skills.map((s, i) => (
                                                            <span
                                                                key={i}
                                                                className="px-2.5 py-1 bg-brutal-dark text-brutal-bg rounded-full font-data text-[10px] font-bold uppercase tracking-wider"
                                                            >
                                                                {s}
                                                            </span>
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
                                                <p className="font-data text-xs text-brutal-dark/35 italic text-center py-8">
                                                    No additional media.
                                                </p>
                                            ) : (
                                                <>
                                                    {challenge.videos.map((vid, idx) => (
                                                        <div
                                                            key={idx}
                                                            className="relative w-full aspect-video rounded-xl overflow-hidden border border-brutal-dark/10 bg-brutal-dark"
                                                        >
                                                            <iframe
                                                                title={vid.title || `Challenge video ${idx + 1}`}
                                                                src={getEmbedUrl(vid.video_url)}
                                                                className="absolute inset-0 w-full h-full"
                                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                                allowFullScreen
                                                            />
                                                        </div>
                                                    ))}
                                                    {galleryImages.length > 0 && (
                                                        <div className="grid grid-cols-2 gap-3">
                                                            {galleryImages.map((img, idx) => (
                                                                <div
                                                                    key={idx}
                                                                    className="rounded-xl overflow-hidden border border-brutal-dark/10 bg-brutal-dark/5"
                                                                >
                                                                    <img
                                                                        src={img.image_url}
                                                                        alt={img.caption || `Image ${idx + 1}`}
                                                                        loading="lazy"
                                                                        className="w-full h-32 object-cover hover:scale-105 transition-transform duration-500"
                                                                    />
                                                                    {img.caption && (
                                                                        <p className="font-data text-[9px] text-brutal-dark/50 text-center py-1.5 px-2">
                                                                            {img.caption}
                                                                        </p>
                                                                    )}
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

                        {/* ── Action column: completion + materials + mystery */}
                        <aside className="lg:col-span-3 lg:max-h-[calc(100vh-9rem)] flex flex-col gap-4 min-h-0">

                            {/* Completion status / CTA */}
                            {completionState ? (
                                <div
                                    className={cn(
                                        'rounded-2xl border-2 p-5 text-center',
                                        completionState === 'verified'
                                            ? 'bg-green-50 text-green-700 border-green-200'
                                            : completionState === 'declined'
                                                ? 'bg-brutal-red/5 text-brutal-red border-brutal-red/20'
                                                : 'bg-yellow-50 text-yellow-700 border-yellow-200',
                                    )}
                                >
                                    <div className="font-data text-[9px] font-bold uppercase tracking-widest opacity-70 mb-1">
                                        Your Status
                                    </div>
                                    <div className="font-heading font-bold text-base uppercase tracking-tight">
                                        {completionState === 'verified' ? '✓ Verified Complete'
                                            : completionState === 'declined' ? '✗ Declined'
                                            : '⏳ Pending Verification'}
                                    </div>
                                </div>
                            ) : user ? (
                                challenge?.tier === 'Tier 3' && hasT2Completion === false ? (
                                    /* T3 soft gate — user hasn't completed any T2 challenge yet */
                                    <div className="rounded-2xl border-2 border-yellow-300 bg-yellow-50 p-5 text-center space-y-3">
                                        <div className="font-data text-[9px] font-bold uppercase tracking-widest text-yellow-700/70">
                                            Tier 3 Prerequisite
                                        </div>
                                        <p className="font-data text-[11px] text-yellow-800 leading-relaxed">
                                            Complete at least one <strong>Tier 2</strong> challenge (or obtain mentor approval) to unlock Tier 3 submissions.
                                        </p>
                                        <Link
                                            to="/challenges?tier=Tier+2"
                                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-yellow-500 text-brutal-dark hover:bg-yellow-600 transition-colors px-4 py-2.5 font-data text-[10px] font-bold uppercase tracking-widest"
                                        >
                                            <Target size={12} /> Browse Tier 2 Challenges
                                        </Link>
                                    </div>
                                ) : (
                                <div className="rounded-2xl border-2 border-brutal-dark/10 bg-brutal-bg p-4">
                                    {!showCompleteForm ? (
                                        <button
                                            type="button"
                                            onClick={() => setShowCompleteForm(true)}
                                            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brutal-dark text-brutal-bg hover:bg-brutal-red transition-colors px-4 py-3 font-data text-[11px] font-bold uppercase tracking-widest"
                                        >
                                            <CheckCircle2 size={13} /> Mark as Completed
                                        </button>
                                    ) : (
                                        <form onSubmit={handleMarkComplete} className="space-y-3">
                                            <div className="flex items-center gap-2">
                                                <CheckCircle2 size={12} className="text-brutal-red" />
                                                <h4 className="font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/70">
                                                    Submit Evidence
                                                </h4>
                                            </div>
                                            <div>
                                                <label className="block font-data text-[9px] font-bold text-brutal-dark/45 uppercase tracking-widest mb-1">
                                                    Build Notes
                                                </label>
                                                <textarea
                                                    required
                                                    className="w-full bg-brutal-bg border-2 border-brutal-dark/10 p-2.5 rounded-lg font-data min-h-[80px] text-[11px]
                                                               focus:outline-none focus:border-brutal-red/40 transition-colors"
                                                    placeholder="What did you make? What did you learn?"
                                                    value={notes}
                                                    onChange={(e) => setNotes(e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <label className="block font-data text-[9px] font-bold text-brutal-dark/45 uppercase tracking-widest mb-1">
                                                    Evidence URL (Optional)
                                                </label>
                                                <input
                                                    type="url"
                                                    className="w-full bg-brutal-bg border-2 border-brutal-dark/10 p-2.5 rounded-lg font-data text-[11px]
                                                               focus:outline-none focus:border-brutal-red/40 transition-colors"
                                                    placeholder="GitHub, video, or photo link..."
                                                    value={evidenceUrl}
                                                    onChange={(e) => setEvidenceUrl(e.target.value)}
                                                />
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setShowCompleteForm(false)}
                                                    className="flex-1 rounded-lg border-2 border-brutal-dark/10 px-3 py-2 font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/60 hover:border-brutal-dark/30 transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="submit"
                                                    disabled={submitting}
                                                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-brutal-red text-brutal-bg hover:bg-brutal-dark transition-colors px-3 py-2 font-data text-[10px] font-bold uppercase tracking-widest disabled:opacity-50"
                                                >
                                                    {submitting ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                                                    Submit
                                                </button>
                                            </div>
                                        </form>
                                    )}
                                </div>
                                )
                            ) : (
                                <Link
                                    to="/login"
                                    className="rounded-2xl border-2 border-brutal-dark/10 bg-brutal-bg p-5 text-center hover:border-brutal-red hover:text-brutal-red transition-colors block"
                                >
                                    <div className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-dark/45 mb-1">
                                        Track Progress
                                    </div>
                                    <div className="font-heading font-bold text-sm uppercase tracking-tight text-brutal-dark">
                                        Log in to Begin
                                    </div>
                                </Link>
                            )}

                            {/* Required materials */}
                            {challenge.materials.length > 0 && (
                                <div className="rounded-2xl border-2 border-brutal-dark/10 bg-brutal-bg p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Wrench size={12} className="text-brutal-red" />
                                        <span className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-dark/45">
                                            Required Materials
                                        </span>
                                    </div>
                                    <ul className="space-y-1.5">
                                        {challenge.materials.map((m, i) => (
                                            <li
                                                key={i}
                                                className="flex items-center gap-2 font-data text-[11px] text-brutal-dark/75"
                                            >
                                                <div className="w-1 h-1 rounded-full bg-brutal-red flex-shrink-0" />
                                                {m}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Mystery card — only if there's a cover above so we haven't used it as hero */}
                            {coverImage && challenge.mystery && (
                                <div className="rounded-2xl border-2 border-brutal-dark bg-brutal-dark text-brutal-bg p-5 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4 opacity-5 text-brutal-bg font-heading text-7xl font-bold leading-none pointer-events-none select-none">
                                        ?
                                    </div>
                                    <div className="flex items-center gap-2 mb-2 relative z-10">
                                        <HelpCircle size={12} className="text-brutal-red" />
                                        <span className="font-data text-[9px] font-bold tracking-[0.2em] text-brutal-red uppercase">
                                            The Mystery
                                        </span>
                                    </div>
                                    <p className="font-drama italic text-base leading-snug relative z-10">
                                        {challenge.mystery}
                                    </p>
                                </div>
                            )}
                        </aside>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Tiny stat tile (mirrors ProjectDetails) ──────────────────────────────

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
