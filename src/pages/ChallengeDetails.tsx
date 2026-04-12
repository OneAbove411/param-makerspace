import { useState, useMemo, useEffect } from 'react';
import type { ReactNode, FormEvent } from 'react';
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
    Wrench,
    Target,
    ShieldCheck,
    HelpCircle,
    Zap,
    Crosshair,
    ChevronRight,
    AlertTriangle,
    ArrowRight,
} from 'lucide-react';
import { getEmbedUrl } from '../lib/videoUtils';
import { cn } from '../lib/utils';
import { XP_REWARDS } from '../lib/constants';
import { XPProgressStrip } from '../components/shared/XPProgressStrip';
import { WhatsNextClosure } from '../components/shared/WhatsNextClosure';

// ─────────────────────────────────────────────────────────────────────────────
// Challenge Details — visual language matches Dashboard bento grid:
//   • Hard 6px offset red shadows: shadow-[6px_6px_0_0_rgba(196,41,30,0.9)]
//   • border-2 border-brutal-dark (dark cards) / border-brutal-dark/20 (light)
//   • Dark bounty card: bg-brutal-dark text-brutal-bg
//   • Hover lift: translate-x-[-2px] translate-y-[-2px] + larger shadow
//   • No dot-grid textures, no glow shadows, no corner bracket divs
// ─────────────────────────────────────────────────────────────────────────────

// ─── Skeleton ──────────────────────────────────────────────────────────────

function DetailsSkeleton() {
    return (
        <div className="flex-1 w-full bg-brutal-bg min-h-screen">
            <div className="h-[40vh] md:h-[50vh] bg-brutal-dark/5 animate-pulse" />
            <div className="flex animate-pulse gap-4 px-4 pt-5">
                <div className="hidden lg:block w-72 flex-shrink-0">
                    <div className="h-[480px] rounded-2xl bg-brutal-dark/5" />
                </div>
                <div className="flex-1">
                    <div className="h-10 w-48 bg-brutal-dark/5 rounded mb-4" />
                    <div className="h-[280px] bg-brutal-dark/5 rounded-2xl" />
                </div>
            </div>
        </div>
    );
}

// ─── Tier helpers ──────────────────────────────────────────────────────────

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

const tierLabel = (tier?: string | null) =>
    tier === 'Tier 1' ? 'COMMON' : tier === 'Tier 2' ? 'RARE' : tier === 'Tier 3' ? 'LEGENDARY' : 'STANDARD';

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

    // T3 gate
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

    const handleMarkComplete = async (e?: FormEvent) => {
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

    const availableTabs = [
        { k: 'brief' as const, label: 'Brief', icon: <BookOpen size={12} />, show: hasBrief },
        { k: 'steps' as const, label: 'Steps', icon: <ListChecks size={12} />, show: hasSteps },
        { k: 'levels' as const, label: 'Levels', icon: <Layers size={12} />, show: hasLevels },
        { k: 'concepts' as const, label: 'Concepts', icon: <Sparkles size={12} />, show: hasConcepts },
        { k: 'media' as const, label: 'Media', icon: <ImageIcon size={12} />, show: hasMedia },
    ].filter(t => t.show);

    return (
        <div className="flex-1 w-full bg-brutal-bg min-h-screen">

            {/* ══════════════════════════════════════════════════
                HERO
            ══════════════════════════════════════════════════ */}
            <div className="relative w-full h-[40vh] md:h-[50vh] overflow-hidden bg-brutal-bg">
                {coverImage ? (
                    <img src={coverImage} alt={`${challenge.title} cover`}
                        className="absolute inset-0 w-full h-[120%] object-cover opacity-50" />
                ) : (
                    <div className="absolute inset-0 bg-brutal-dark" style={{
                        backgroundImage: 'radial-gradient(circle, rgba(245,243,238,0.05) 1px, transparent 1px)',
                        backgroundSize: '24px 24px',
                    }} />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-brutal-bg via-brutal-bg/80 to-brutal-dark/30" />



                {/* Rarity — top right */}
                <div className="absolute top-24 right-4 md:right-8 lg:right-16 z-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brutal-bg/80 backdrop-blur-sm border border-brutal-dark/15">
                        <span className={cn('w-2 h-2 rounded-full flex-shrink-0', tierDot(challenge.tier))} />
                        <span className="font-data text-[9px] font-bold uppercase tracking-[0.2em] text-brutal-dark/65">
                            {tierLabel(challenge.tier)} Bounty
                        </span>
                    </div>
                </div>

                {/* Bottom content */}
                <div className="absolute bottom-0 inset-x-0 px-4 md:px-8 lg:px-16 pb-6 md:pb-10 z-10">
                    <div className="max-w-5xl">
                        {challenge.domain && (
                            <span className="inline-block font-data text-[9px] font-bold uppercase tracking-[0.25em] text-brutal-red bg-brutal-red/10 border border-brutal-red/25 px-2.5 py-1 rounded-full mb-3">
                                {challenge.domain}
                            </span>
                        )}
                        <h1 className="font-heading font-bold text-2xl sm:text-3xl md:text-4xl lg:text-5xl uppercase tracking-tight leading-[1.05] text-brutal-dark">
                            {challenge.title}
                        </h1>

                        <div className="flex flex-wrap items-center gap-2 mt-3">
                            {challenge.tier && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 font-data text-[9px] font-bold uppercase tracking-widest rounded-full bg-brutal-dark/8 border border-brutal-dark/20 text-brutal-dark/70">
                                    <span className={cn('w-1.5 h-1.5 rounded-full', tierDot(challenge.tier))} />
                                    {challenge.tier}
                                </span>
                            )}
                            {challenge.time_estimate && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 font-data text-[9px] font-bold uppercase tracking-widest rounded-full bg-brutal-dark/8 border border-brutal-dark/20 text-brutal-dark/60">
                                    <Clock size={9} /> {challenge.time_estimate}
                                </span>
                            )}
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 font-data text-[9px] font-bold uppercase tracking-widest rounded-full bg-brutal-red/10 border border-brutal-red/30 text-brutal-red">
                                <Zap size={9} className="fill-current" /> +{bountyXP} XP
                            </span>
                        </div>

                        <div className="mt-3"><XPProgressStrip /></div>

                        <div className="flex items-center gap-2 mt-4">
                            <button type="button" onClick={() => handleReaction('like')} aria-label={isLiked ? 'Unlike' : 'Like'}
                                className={cn(
                                    'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl font-data text-[10px] font-bold uppercase tracking-wider border-2 transition-all',
                                    isLiked ? 'bg-brutal-red text-brutal-bg border-brutal-red' : 'border-brutal-dark/20 text-brutal-dark/60 hover:border-brutal-dark/40',
                                )}>
                                <Heart size={11} className={isLiked ? 'fill-current' : ''} />
                                {counts.likes > 0 && counts.likes}
                            </button>
                            <button type="button" onClick={() => handleReaction('bookmark')} aria-pressed={isBookmarked} aria-label={isBookmarked ? 'Unsave' : 'Save'}
                                className={cn(
                                    'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl font-data text-[10px] font-bold uppercase tracking-wider border-2 transition-all',
                                    isBookmarked ? 'bg-brutal-red text-brutal-bg border-brutal-red' : 'border-brutal-dark/20 text-brutal-dark/60 hover:border-brutal-dark/40',
                                )}>
                                <Bookmark size={11} className={isBookmarked ? 'fill-current' : ''} />
                            </button>
                            <button type="button" onClick={handleShare} aria-label="Share"
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl font-data text-[10px] font-bold uppercase tracking-wider border-2 border-brutal-dark/20 text-brutal-dark/60 hover:border-brutal-dark/40 transition-all">
                                <Share2 size={11} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════
                MOBILE STATS STRIP — visible only < lg
            ══════════════════════════════════════════════════ */}
            <div className="lg:hidden bg-brutal-bg border-b-2 border-brutal-dark/10">
                <div className="px-4 py-4 space-y-3">
                    {/* Bounty card — light */}
                    <div className="rounded-xl border-2 border-brutal-dark/12 bg-brutal-bg p-4">
                        <p className="font-data text-[9px] font-bold uppercase tracking-[0.2em] text-brutal-dark/50 mb-1">Bounty Reward</p>
                        <div className="flex items-baseline gap-1.5">
                            <span className="font-heading font-bold text-3xl tabular-nums text-brutal-dark leading-none">+{bountyXP}</span>
                            <span className="font-data text-sm font-bold text-brutal-red uppercase tracking-wider">XP</span>
                        </div>
                        <p className="font-data text-[9px] text-brutal-dark/45 mt-1 uppercase tracking-widest">
                            {tierLabel(challenge.tier)} · {challenge.tier || 'Open'} Challenge
                        </p>
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-5 gap-2">
                        {[
                            { icon: <ShieldCheck size={10} />, label: 'Tier', value: challenge.tier?.replace('Tier ', 'T') || '—' },
                            { icon: <Clock size={10} />, label: 'Time', value: challenge.time_estimate || '—' },
                            { icon: <ListChecks size={10} />, label: 'Steps', value: String(challenge.steps.length) },
                            { icon: <Layers size={10} />, label: 'Levels', value: String(challenge.levels.length) },
                            { icon: <Heart size={10} />, label: 'Likes', value: String(counts.likes) },
                        ].map(({ icon, label, value }) => (
                            <div key={label} className="rounded-lg border-2 border-brutal-dark/12 bg-brutal-bg py-2 px-1 text-center">
                                <div className="flex justify-center text-brutal-red mb-0.5">{icon}</div>
                                <div className="font-heading font-bold text-xs tabular-nums text-brutal-dark leading-none truncate">{value}</div>
                                <div className="font-data text-[7px] font-bold uppercase tracking-[0.1em] text-brutal-dark/45 mt-0.5">{label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════
                BODY — Sidebar + Main
            ══════════════════════════════════════════════════ */}
            <div className="flex min-h-[50vh]">

                {/* ── DESKTOP SIDEBAR ──────────────────────────── */}
                <aside className="hidden lg:block w-72 flex-shrink-0 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto bg-brutal-bg px-4 py-5 space-y-4 no-scrollbar">

                    {/* Bounty — light card */}
                    <div className="rounded-xl border-2 border-brutal-dark/12 bg-brutal-bg p-5">
                        <p className="font-data text-[9px] font-bold uppercase tracking-[0.2em] text-brutal-dark/50 mb-2">Bounty Reward</p>
                        <div className="flex items-baseline gap-2 mb-1">
                            <span className="font-heading font-bold text-4xl tabular-nums text-brutal-dark leading-none">+{bountyXP}</span>
                            <span className="font-data text-base font-bold text-brutal-red uppercase tracking-wider">XP</span>
                        </div>
                        <p className="font-data text-[9px] text-brutal-dark/45 uppercase tracking-widest">
                            {tierLabel(challenge.tier)} · {challenge.tier || 'Open'} Challenge
                        </p>

                        <hr className="border-brutal-dark/10 my-4" />

                        <div className="grid grid-cols-2 gap-2 mb-3">
                            <div className="rounded-lg bg-brutal-dark/[0.04] border border-brutal-dark/10 p-2.5">
                                <div className="flex items-center gap-1 mb-1">
                                    <ShieldCheck size={9} className="text-brutal-red" />
                                    <span className="font-data text-[7px] font-bold uppercase tracking-widest text-brutal-dark/45">Tier</span>
                                </div>
                                <span className="font-heading font-bold text-sm text-brutal-dark leading-none">
                                    {challenge.tier?.replace('Tier ', 'T') || '—'}
                                </span>
                            </div>
                            <div className="rounded-lg bg-brutal-dark/[0.04] border border-brutal-dark/10 p-2.5">
                                <div className="flex items-center gap-1 mb-1">
                                    <Clock size={9} className="text-brutal-red" />
                                    <span className="font-data text-[7px] font-bold uppercase tracking-widest text-brutal-dark/45">Time</span>
                                </div>
                                <span className="font-heading font-bold text-sm text-brutal-dark leading-none truncate block">
                                    {challenge.time_estimate || '—'}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-1.5">
                            {[
                                { icon: <ListChecks size={10} />, label: 'Steps', value: challenge.steps.length },
                                { icon: <Layers size={10} />, label: 'Levels', value: challenge.levels.length },
                                { icon: <Heart size={10} />, label: 'Likes', value: counts.likes },
                            ].map(({ icon, label, value }) => (
                                <div key={label} className="rounded-lg bg-brutal-dark/[0.04] border border-brutal-dark/10 py-2 text-center">
                                    <div className="flex justify-center text-brutal-red mb-0.5">{icon}</div>
                                    <div className="font-heading font-bold text-sm tabular-nums text-brutal-dark leading-none">{value}</div>
                                    <div className="font-data text-[7px] font-bold uppercase tracking-[0.15em] text-brutal-dark/45 mt-0.5">{label}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Tier access card */}
                    <div className="rounded-xl border-2 border-brutal-dark/12 bg-brutal-bg p-5">
                        <div className="flex items-center gap-1.5 mb-2">
                            <span className={cn('w-2 h-2 rounded-full', tierDot(challenge.tier))} />
                            <span className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-dark/50">Access</span>
                        </div>
                        <p className="font-data text-[12px] text-brutal-dark/75 leading-relaxed">{tierBlurb(challenge.tier)}</p>
                        {challenge.tags && challenge.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-3">
                                {challenge.tags.slice(0, 8).map((t) => (
                                    <span key={t} className="font-data text-[9px] font-bold uppercase tracking-wider text-brutal-dark/60 bg-brutal-dark/[0.04] border border-brutal-dark/10 px-2 py-0.5 rounded-md">
                                        #{t}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {challenge.materials.length > 0 && <MaterialsCard materials={challenge.materials} />}
                    {challenge.skills.length > 0 && <SkillsCard skills={challenge.skills} />}
                    {challenge.mystery && <MysteryCard mystery={challenge.mystery} />}
                </aside>

                {/* ── MAIN CONTENT ─────────────────────────────── */}
                <main className="flex-1 min-w-0">

                    {/* Tab bar — scrollable on mobile */}
                    <div className="sticky top-16 z-20 bg-brutal-bg/96 backdrop-blur-sm border-b-2 border-brutal-dark/12">
                        <nav className="flex items-center overflow-x-auto no-scrollbar px-4 md:px-6 lg:px-8">
                            {availableTabs.map((tab) => (
                                <button key={tab.k} type="button" onClick={() => setCenterTab(tab.k)}
                                    className={cn(
                                        'flex items-center gap-1.5 px-3 md:px-4 py-3.5 font-data text-[10px] md:text-[11px] font-bold uppercase tracking-wider transition-colors relative whitespace-nowrap flex-shrink-0',
                                        centerTab === tab.k ? 'text-brutal-red' : 'text-brutal-dark/35 hover:text-brutal-dark/65',
                                    )}>
                                    {tab.icon}
                                    {tab.label}
                                    {centerTab === tab.k && (
                                        <span className="absolute bottom-0 left-2 right-2 h-[2.5px] bg-brutal-red rounded-t-full" />
                                    )}
                                </button>
                            ))}
                        </nav>
                    </div>

                    {/* Tab content */}
                    <div className="px-4 md:px-6 lg:px-8 py-5 md:py-6 space-y-4">

                        {/* ── BRIEF ── */}
                        {centerTab === 'brief' && (
                            <div className="space-y-4">
                                {challenge.core_idea && (
                                    <BriefCard index="01" label="Core Idea" icon={<Sparkles size={11} className="text-brutal-red" />}>
                                        <p className="font-data text-[12px] md:text-[13px] text-brutal-dark/80 leading-relaxed">{challenge.core_idea}</p>
                                    </BriefCard>
                                )}
                                {challenge.mission && (
                                    <BriefCard index="02" label="Mission" icon={<Crosshair size={11} className="text-brutal-red" />}>
                                        <p className="font-data text-[12px] md:text-[13px] text-brutal-dark/80 leading-relaxed">{challenge.mission}</p>
                                    </BriefCard>
                                )}
                                {challenge.success_criteria && (
                                    <BriefCard index="03" label="Success Criteria" icon={<CheckCircle2 size={11} className="text-brutal-red" />} accent>
                                        <p className="font-data text-[12px] md:text-[13px] font-bold text-brutal-dark leading-relaxed">{challenge.success_criteria}</p>
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
                            <div className="rounded-2xl border-2 border-brutal-dark/20 bg-brutal-bg p-4 md:p-5 shadow-[6px_6px_0_0_rgba(196,41,30,0.18)]">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-dark/45">{challenge.steps.length} Steps</span>
                                    <div className="flex items-center gap-1">
                                        {challenge.steps.map((_, idx) => (
                                            <div key={idx} className="h-1 w-4 md:w-6 rounded-full bg-brutal-dark/10" />
                                        ))}
                                    </div>
                                </div>
                                <ol className="space-y-2.5">
                                    {challenge.steps.map((step, idx) => (
                                        <li key={idx} className="rounded-xl border-2 border-brutal-dark/12 bg-brutal-bg p-3 md:p-4 flex items-start gap-3 hover:border-brutal-dark/25 transition-colors">
                                            <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-brutal-dark text-brutal-bg font-data text-[9px] font-bold flex items-center justify-center flex-shrink-0 tabular-nums">
                                                {String(idx + 1).padStart(2, '0')}
                                            </div>
                                            <p className="font-data text-[12px] md:text-[13px] text-brutal-dark/75 leading-relaxed pt-0.5">{step}</p>
                                        </li>
                                    ))}
                                </ol>
                            </div>
                        )}

                        {/* ── LEVELS ── */}
                        {centerTab === 'levels' && (
                            <div className="rounded-2xl border-2 border-brutal-dark/20 bg-brutal-bg p-4 md:p-5 shadow-[6px_6px_0_0_rgba(196,41,30,0.18)]">
                                <div className="space-y-2.5">
                                    {challenge.levels.map((lvl, idx) => (
                                        <div key={idx} className="rounded-xl border-2 border-brutal-dark/12 bg-brutal-bg p-3 md:p-4 flex items-start gap-3 hover:border-brutal-dark/25 transition-colors">
                                            <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-brutal-dark/8 text-brutal-dark/50 font-data text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                                                {idx + 1}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-heading font-bold text-sm uppercase tracking-tight text-brutal-dark">{lvl.level_name}</h4>
                                                {lvl.description && (
                                                    <p className="font-data text-xs text-brutal-dark/60 leading-relaxed mt-1">{lvl.description}</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ── CONCEPTS ── */}
                        {centerTab === 'concepts' && (
                            <div className="space-y-4">
                                {challenge.vocabulary.length > 0 && (
                                    <div className="rounded-2xl border-2 border-brutal-dark/20 bg-brutal-bg p-4 md:p-5 shadow-[4px_4px_0_0_rgba(196,41,30,0.18)]">
                                        <p className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-dark/45 mb-3">Key Vocabulary</p>
                                        <dl className="space-y-2.5">
                                            {challenge.vocabulary.map((v, i) => (
                                                <div key={i} className="rounded-xl border-2 border-brutal-dark/10 p-3 md:p-4">
                                                    <dt className="font-heading font-bold text-sm text-brutal-dark">{v.term}</dt>
                                                    {v.definition && <dd className="font-data text-xs text-brutal-dark/60 mt-1 leading-relaxed">{v.definition}</dd>}
                                                </div>
                                            ))}
                                        </dl>
                                    </div>
                                )}
                                {challenge.skills.length > 0 && (
                                    <div className="rounded-2xl border-2 border-brutal-dark/20 bg-brutal-bg p-4 md:p-5 shadow-[4px_4px_0_0_rgba(196,41,30,0.18)]">
                                        <p className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-dark/45 mb-3">Skills Developed</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {challenge.skills.map((s, i) => (
                                                <span key={i} className="px-2.5 py-1 bg-brutal-dark text-brutal-bg rounded-full font-data text-[10px] font-bold uppercase tracking-wider">{s}</span>
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
                                            <div key={idx} className="relative w-full aspect-video rounded-2xl overflow-hidden border-2 border-brutal-dark/20 bg-brutal-dark shadow-[4px_4px_0_0_rgba(196,41,30,0.18)]">
                                                <iframe title={vid.title || `Video ${idx + 1}`} src={getEmbedUrl(vid.video_url)}
                                                    className="absolute inset-0 w-full h-full"
                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                    allowFullScreen />
                                            </div>
                                        ))}
                                        {galleryImages.length > 0 && (
                                            <div className="grid grid-cols-2 gap-2 md:gap-3">
                                                {galleryImages.map((img, idx) => (
                                                    <div key={idx} className="rounded-xl border-2 border-brutal-dark/15 overflow-hidden bg-brutal-dark/5 hover:border-brutal-dark/30 transition-colors">
                                                        <img src={img.image_url} alt={img.caption || `Image ${idx + 1}`} loading="lazy"
                                                            className="w-full h-28 md:h-32 object-cover" />
                                                        {img.caption && <p className="font-data text-[9px] text-brutal-dark/50 text-center py-1.5 px-2">{img.caption}</p>}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ── MOBILE: sidebar content inline ──────────── */}
                    <div className="lg:hidden px-4 pb-4 space-y-3 border-t-2 border-brutal-dark/10 pt-4">
                        <div className="rounded-2xl border-2 border-brutal-dark/20 bg-brutal-bg p-5 shadow-[6px_6px_0_0_rgba(196,41,30,0.18)]">
                            <div className="flex items-center gap-1.5 mb-2">
                                <span className={cn('w-2 h-2 rounded-full', tierDot(challenge.tier))} />
                                <span className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-dark/45">Access</span>
                            </div>
                            <p className="font-data text-[11px] text-brutal-dark/60 leading-relaxed">{tierBlurb(challenge.tier)}</p>
                            {challenge.tags && challenge.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-3">
                                    {challenge.tags.slice(0, 6).map((t) => (
                                        <span key={t} className="font-data text-[9px] font-bold uppercase tracking-wider text-brutal-dark/50 bg-brutal-dark/5 border border-brutal-dark/10 px-1.5 py-0.5 rounded-full">#{t}</span>
                                    ))}
                                </div>
                            )}
                        </div>
                        {challenge.materials.length > 0 && <MaterialsCard materials={challenge.materials} />}
                        {challenge.skills.length > 0 && <SkillsCard skills={challenge.skills} />}
                        {challenge.mystery && <MysteryCard mystery={challenge.mystery} />}
                    </div>

                    {/* ── COMPLETION CTA ───────────────────────────── */}
                    <div className="border-t-2 border-brutal-dark/12 px-4 md:px-6 lg:px-8 py-5 md:py-6">
                        {completionState ? (
                            <div className={cn(
                                'rounded-2xl border-2 p-4 md:p-5 text-center',
                                completionState === 'verified'
                                    ? 'bg-green-50 border-green-300 text-green-700 shadow-[4px_4px_0_0_rgba(34,197,94,0.25)]'
                                    : completionState === 'declined'
                                        ? 'bg-brutal-red/5 border-brutal-red/30 text-brutal-red shadow-[4px_4px_0_0_rgba(196,41,30,0.18)]'
                                        : 'bg-yellow-50 border-yellow-300 text-yellow-700 shadow-[4px_4px_0_0_rgba(234,179,8,0.25)]',
                            )}>
                                <p className="font-data text-[9px] font-bold uppercase tracking-widest opacity-60 mb-1">Quest Status</p>
                                <div className="font-heading font-bold text-sm md:text-base uppercase tracking-tight flex items-center justify-center gap-2">
                                    {completionState === 'verified' && <CheckCircle2 size={15} />}
                                    {completionState === 'pending_review' && <Loader2 size={15} className="animate-spin" />}
                                    {completionState === 'verified' ? 'Bounty Claimed'
                                        : completionState === 'declined' ? 'Submission Declined' : 'Pending Verification'}
                                </div>
                            </div>
                        ) : user ? (
                            challenge?.tier === 'Tier 3' && hasT2Completion === false ? (
                                <div className="rounded-2xl border-2 border-yellow-300 bg-yellow-50 p-4 md:p-5 text-center space-y-3 shadow-[4px_4px_0_0_rgba(234,179,8,0.25)]">
                                    <div className="flex items-center justify-center gap-2">
                                        <AlertTriangle size={11} className="text-yellow-600" />
                                        <span className="font-data text-[9px] font-bold uppercase tracking-widest text-yellow-700/70">Tier 3 Prerequisite</span>
                                    </div>
                                    <p className="font-data text-[11px] text-yellow-800 leading-relaxed">
                                        Complete at least one <strong>Tier 2</strong> challenge to unlock Tier 3 submissions.
                                    </p>
                                    <Link to="/challenges?tier=Tier+2"
                                        className="inline-flex items-center gap-2 rounded-xl bg-yellow-500 text-brutal-dark hover:bg-yellow-600 transition-colors px-4 py-2.5 font-data text-[10px] font-bold uppercase tracking-widest">
                                        <Target size={11} /> Browse Tier 2
                                    </Link>
                                </div>
                            ) : (
                                <div className="rounded-2xl border-2 border-brutal-dark/15 bg-brutal-bg p-4 md:p-5 shadow-[6px_6px_0_0_rgba(196,41,30,0.18)]">
                                    {!showCompleteForm ? (
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                                            <div className="flex-1">
                                                <p className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-dark/45 mb-1">Ready to claim?</p>
                                                <p className="font-heading font-bold text-sm text-brutal-dark">
                                                    Submit your build to earn <span className="text-brutal-red">+{bountyXP} XP</span>
                                                </p>
                                            </div>
                                            <button type="button" onClick={() => setShowCompleteForm(true)}
                                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-brutal-dark text-brutal-bg hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0_0_rgba(196,41,30,1)] px-5 py-3 font-data text-[11px] font-bold uppercase tracking-widest shadow-[6px_6px_0_0_rgba(196,41,30,0.9)] transition-all duration-150 w-full sm:w-auto">
                                                <Zap size={12} className="fill-current" /> Claim Bounty
                                                <ArrowRight size={12} />
                                            </button>
                                        </div>
                                    ) : (
                                        <form onSubmit={handleMarkComplete} className="space-y-3">
                                            <div className="flex items-center gap-2">
                                                <CheckCircle2 size={12} className="text-brutal-red" />
                                                <h4 className="font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/65">Submit Evidence</h4>
                                            </div>
                                            <div>
                                                <label className="block font-data text-[9px] font-bold text-brutal-dark/40 uppercase tracking-widest mb-1.5">Build Notes *</label>
                                                <textarea required
                                                    className="w-full bg-brutal-bg border-2 border-brutal-dark/15 p-2.5 rounded-xl font-data min-h-[80px] text-[12px] focus:outline-none focus:border-brutal-dark/40 transition-colors resize-none"
                                                    placeholder="What did you make? What did you learn?"
                                                    value={notes} onChange={(e) => setNotes(e.target.value)} />
                                            </div>
                                            <div>
                                                <label className="block font-data text-[9px] font-bold text-brutal-dark/40 uppercase tracking-widest mb-1.5">Evidence URL (Optional)</label>
                                                <input type="url"
                                                    className="w-full bg-brutal-bg border-2 border-brutal-dark/15 p-2.5 rounded-xl font-data text-[12px] focus:outline-none focus:border-brutal-dark/40 transition-colors"
                                                    placeholder="GitHub, video, or photo link..."
                                                    value={evidenceUrl} onChange={(e) => setEvidenceUrl(e.target.value)} />
                                            </div>
                                            <div className="flex gap-2 pt-1">
                                                <button type="button" onClick={() => setShowCompleteForm(false)}
                                                    className="flex-1 rounded-xl border-2 border-brutal-dark/15 px-3 py-2.5 font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/55 hover:border-brutal-dark/30 transition-colors">
                                                    Cancel
                                                </button>
                                                <button type="submit" disabled={submitting}
                                                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-brutal-red text-brutal-bg hover:bg-brutal-dark transition-colors px-3 py-2.5 font-data text-[10px] font-bold uppercase tracking-widest disabled:opacity-50 shadow-[3px_3px_0_0_rgba(20,20,20,0.4)]">
                                                    {submitting ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                                                    Submit
                                                </button>
                                            </div>
                                        </form>
                                    )}
                                </div>
                            )
                        ) : (
                            <Link to="/login"
                                className="group block rounded-2xl border-2 border-brutal-dark/20 bg-brutal-bg p-5 md:p-6 text-center hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0_0_rgba(196,41,30,0.28)] hover:border-brutal-red/40 transition-all duration-150 shadow-[6px_6px_0_0_rgba(196,41,30,0.18)]">
                                <p className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-dark/40 mb-1.5">Track Progress</p>
                                <div className="font-heading font-bold text-sm md:text-base uppercase tracking-tight text-brutal-dark group-hover:text-brutal-red transition-colors flex items-center justify-center gap-2">
                                    Log in to Accept Quest
                                    <ChevronRight size={14} className="opacity-40 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </Link>
                        )}
                    </div>

                    <div className="px-4 md:px-6 lg:px-8 pb-10">
                        <WhatsNextClosure variant="challenge" />
                    </div>
                </main>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════════════════

// ─── Brief Card ─────────────────────────────────────────────────────────────
// Clean card matching dashboard's border-2 + hard offset shadow.
// No dot-grid, no pseudo brackets, no glow effects.

function BriefCard({ index, label, icon, accent = false, children }: {
    index: string; label: string; icon: ReactNode; accent?: boolean; children: ReactNode;
}) {
    return (
        <div className={cn(
            'rounded-2xl border-2 p-4 md:p-5',
            accent
                ? 'border-brutal-red/35 bg-brutal-red/[0.03] shadow-[6px_6px_0_0_rgba(196,41,30,0.28)]'
                : 'border-brutal-dark/20 bg-brutal-bg shadow-[6px_6px_0_0_rgba(196,41,30,0.18)]',
        )}>
            <div className="flex items-center gap-2 mb-3">
                <span className="font-data text-[9px] font-bold tabular-nums text-brutal-dark/25">{index} //</span>
                {icon}
                <span className={cn(
                    'font-data text-[9px] font-bold uppercase tracking-[0.2em]',
                    accent ? 'text-brutal-red' : 'text-brutal-dark/45',
                )}>
                    {label}
                </span>
            </div>
            {children}
        </div>
    );
}

// ─── Materials Card ────────────────────────────────────────────────────────

function MaterialsCard({ materials }: { materials: string[] }) {
    return (
        <div className="rounded-xl border-2 border-brutal-dark/12 bg-brutal-bg p-5">
            <div className="flex items-center gap-2 mb-3">
                <Wrench size={11} className="text-brutal-red" />
                <span className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-dark/50">Required Materials</span>
            </div>
            <ul className="space-y-1.5">
                {materials.map((m, i) => (
                    <li key={i} className="flex items-center gap-2 font-data text-[12px] text-brutal-dark/80">
                        <span className="w-1 h-1 rounded-full bg-brutal-red flex-shrink-0" />
                        {m}
                    </li>
                ))}
            </ul>
        </div>
    );
}

// ─── Skills Card ───────────────────────────────────────────────────────────

function SkillsCard({ skills }: { skills: string[] }) {
    return (
        <div className="rounded-xl border-2 border-brutal-dark/12 bg-brutal-bg p-5">
            <span className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-dark/50 block mb-2.5">
                Skills You'll Develop
            </span>
            <div className="flex flex-wrap gap-1.5">
                {skills.map((s, i) => (
                    <span key={i} className="px-2.5 py-1 bg-brutal-dark/[0.06] border border-brutal-dark/12 text-brutal-dark/80 rounded-md font-data text-[10px] font-bold uppercase tracking-wider">{s}</span>
                ))}
            </div>
        </div>
    );
}

// ─── Mystery Card ──────────────────────────────────────────────────────────

function MysteryCard({ mystery }: { mystery: string }) {
    return (
        <div className="rounded-xl border-2 border-brutal-dark/12 bg-brutal-bg p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 font-heading text-[72px] font-bold leading-none text-brutal-red/[0.06] pointer-events-none select-none">?</div>
            <div className="relative z-10 flex items-center gap-2 mb-2">
                <HelpCircle size={11} className="text-brutal-red" />
                <span className="font-data text-[9px] font-bold uppercase tracking-[0.2em] text-brutal-red">The Mystery</span>
            </div>
            <p className="relative z-10 font-data text-[12px] text-brutal-dark/70 leading-relaxed italic">{mystery}</p>
        </div>
    );
}
