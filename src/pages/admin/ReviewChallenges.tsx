import React, { useState } from 'react';
import { useAuth } from '../../lib/auth';
import { usePendingCompletions, useCompletionReviewMutations, useBadgeMutations } from '../../lib/hooks';
import { Link } from 'react-router';
import { Skeleton } from '../../components/ui/Skeleton';
import {
    Trophy,
    CheckCircle,
    XCircle,
    ExternalLink,
    ArrowLeft,
    Loader2,
    User,
    FileText,
    Link2,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Review Challenges — Mentor / Admin review queue for challenge completions
//
// Same brutalist pattern as ReviewProjects: yellow-500 accent cards, 6px
// offset shadows, pill buttons, loading skeletons.
// ─────────────────────────────────────────────────────────────────────────────

export function ReviewChallenges() {
    const { user, role } = useAuth();
    const { data: completions, loading, refetch } = usePendingCompletions();
    const { verifyCompletion, rejectCompletion } = useCompletionReviewMutations();
    const { awardBadge } = useBadgeMutations();
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    if (role !== 'admin' && role !== 'mentor') {
        return (
            <div className="flex-1 w-full bg-brutal-bg min-h-screen flex items-center justify-center">
                <div className="rounded-2xl border-2 border-brutal-red/30 bg-brutal-red/5 p-10 text-center">
                    <h2 className="font-heading font-bold text-2xl uppercase text-brutal-red">Access Denied</h2>
                    <p className="font-data text-sm text-brutal-dark/60 mt-2">You need mentor or admin privileges.</p>
                </div>
            </div>
        );
    }

    const handleVerify = async (completion: any) => {
        if (!user) return;
        setActionLoading(completion.id);
        const { error: verifyErr } = await verifyCompletion(completion.id, user.id);
        if (!verifyErr) {
            try {
                const { onChallengeVerified } = await import('../../lib/badgeEngine');
                await onChallengeVerified(completion.user_id, completion.challenge_id);
            } catch (err) {
                console.error('Failed to auto-award challenge badges', err);
            }
        }
        await refetch();
        setActionLoading(null);
    };

    const handleReject = async (id: string) => {
        if (!window.confirm('Are you sure you want to reject this submission? The maker will need to try again.')) return;
        setActionLoading(id);
        await rejectCompletion(id);
        await refetch();
        setActionLoading(null);
    };

    // ── Loading skeleton ───────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="flex-1 w-full bg-brutal-bg pt-28 px-6 md:px-12 lg:px-24 min-h-screen pb-32">
                <div className="max-w-6xl mx-auto space-y-6">
                    <Skeleton variant="line" className="h-6 w-48" />
                    <Skeleton variant="banner" className="h-14 w-80" />
                    <Skeleton variant="line" className="h-5 w-72" />
                    <div className="space-y-5 mt-8">
                        <Skeleton variant="card" className="h-48" />
                        <Skeleton variant="card" className="h-48" />
                    </div>
                </div>
            </div>
        );
    }

    const pendingList = completions || [];

    return (
        <div className="flex-1 w-full bg-brutal-bg pt-28 px-6 md:px-12 lg:px-24 min-h-screen pb-32">
            <div className="max-w-6xl mx-auto space-y-6">

                {/* ── Header ───────────────────────────────────────────── */}
                <div className="flex items-center gap-3 flex-wrap">
                    <Link
                        to="/dashboard"
                        className="inline-flex items-center gap-1.5 font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/50 hover:text-brutal-dark transition-colors"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
                    </Link>
                    <span className="bg-yellow-500 text-brutal-dark px-2.5 py-1 text-[10px] font-bold font-data rounded-full uppercase tracking-widest">
                        Mentor Queue
                    </span>
                </div>

                <div className="border-b-2 border-brutal-dark/10 pb-5">
                    <h1 className="font-heading font-bold text-3xl md:text-4xl uppercase tracking-tight-heading flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-yellow-500/15 border-2 border-yellow-500/40 flex items-center justify-center">
                            <Trophy className="w-5 h-5 text-yellow-700" />
                        </div>
                        Challenge Verification
                    </h1>
                    <p className="font-data text-sm text-brutal-dark/55 mt-2 max-w-2xl">
                        Review maker challenge submissions and verify their evidence. Verified completions auto-award XP and badges.
                    </p>
                </div>

                {/* ── Queue count ─────────────────────────────────────── */}
                <div className="flex items-center gap-3">
                    <span className="font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/40">
                        {pendingList.length} pending
                    </span>
                    <div className="flex-1 h-px bg-brutal-dark/8" />
                </div>

                {/* ── Empty state ─────────────────────────────────────── */}
                {pendingList.length === 0 ? (
                    <div className="rounded-2xl border-2 border-dashed border-brutal-dark/15 bg-brutal-bg p-12 text-center">
                        <div className="w-12 h-12 rounded-full bg-brutal-dark/5 flex items-center justify-center mx-auto mb-4">
                            <Trophy className="w-6 h-6 text-brutal-dark/25" />
                        </div>
                        <h3 className="font-heading font-bold text-xl uppercase text-brutal-dark/40">
                            Queue is Clear
                        </h3>
                        <p className="font-data text-sm text-brutal-dark/35 mt-1">
                            No challenge submissions awaiting verification.
                        </p>
                        <Link
                            to="/dashboard"
                            className="inline-flex items-center gap-1.5 mt-5 rounded-full bg-brutal-dark text-brutal-bg px-4 py-2 font-data text-[10px] font-bold uppercase tracking-widest hover:bg-brutal-red transition-colors"
                        >
                            <ArrowLeft className="w-3 h-3" /> Back to Dashboard
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-5">
                        {pendingList.map(completion => {
                            const isPending = actionLoading === completion.id;
                            return (
                                <article
                                    key={completion.id}
                                    className="rounded-2xl border-2 border-yellow-500/40 bg-yellow-500/[0.04] p-5 md:p-6 shadow-[6px_6px_0_0_rgba(234,179,8,0.18)] transition-all duration-150 motion-reduce:transition-none"
                                >
                                    <div className="flex flex-col lg:flex-row gap-5">
                                        {/* ── Info ──────────────────────────────── */}
                                        <div className="flex-1 min-w-0 space-y-3">
                                            <div>
                                                <span className="font-data text-[9px] font-bold uppercase tracking-widest text-yellow-700/70 block mb-1">
                                                    Challenge
                                                </span>
                                                <h3 className="font-heading font-bold text-xl md:text-2xl leading-tight">
                                                    {completion.challengeTitle}
                                                </h3>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <User className="w-3.5 h-3.5 text-brutal-dark/40" />
                                                <span className="font-data text-xs text-brutal-dark/60">
                                                    <strong className="text-brutal-dark/80">{completion.userName}</strong>
                                                </span>
                                            </div>

                                            {/* Evidence card */}
                                            <div className="bg-brutal-bg border-2 border-brutal-dark/8 rounded-xl p-4 space-y-3">
                                                <div>
                                                    <span className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-dark/40 flex items-center gap-1.5 mb-1">
                                                        <FileText className="w-3 h-3" /> Maker Notes
                                                    </span>
                                                    <p className="font-data text-sm text-brutal-dark/70 italic leading-relaxed border-l-2 border-yellow-500/40 pl-3">
                                                        {completion.notes || 'No notes provided.'}
                                                    </p>
                                                </div>
                                                {completion.evidence_url && (
                                                    <div>
                                                        <span className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-dark/40 flex items-center gap-1.5 mb-1">
                                                            <Link2 className="w-3 h-3" /> Evidence
                                                        </span>
                                                        <a
                                                            href={completion.evidence_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-1.5 font-data text-xs text-brutal-red hover:text-brutal-dark transition-colors font-bold"
                                                        >
                                                            <ExternalLink className="w-3 h-3" /> View Evidence
                                                        </a>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* ── Actions ───────────────────────────── */}
                                        <div className="flex flex-row lg:flex-col gap-2 lg:min-w-[180px] lg:border-l-2 lg:border-brutal-dark/8 lg:pl-5 shrink-0">
                                            <a
                                                href={`/challenges/${completion.challenge_id}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center justify-center gap-1.5 rounded-full border-2 border-brutal-dark/15 bg-brutal-bg px-4 py-2.5 font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/70 hover:border-brutal-dark hover:text-brutal-dark transition-colors"
                                            >
                                                <ExternalLink className="w-3 h-3" /> View
                                            </a>
                                            <button
                                                type="button"
                                                onClick={() => handleVerify(completion)}
                                                disabled={isPending}
                                                aria-busy={isPending || undefined}
                                                className="inline-flex items-center justify-center gap-1.5 rounded-full bg-brutal-dark text-brutal-bg hover:bg-brutal-red transition-colors px-4 py-2.5 font-data text-[10px] font-bold uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                                                {isPending ? 'Working…' : 'Verify'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleReject(completion.id)}
                                                disabled={isPending}
                                                aria-busy={isPending || undefined}
                                                className="inline-flex items-center justify-center gap-1.5 rounded-full border-2 border-brutal-dark/15 bg-brutal-bg text-brutal-dark/70 hover:border-brutal-red hover:text-brutal-red transition-colors px-4 py-2.5 font-data text-[10px] font-bold uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <XCircle className="w-3 h-3" /> Reject
                                            </button>
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
