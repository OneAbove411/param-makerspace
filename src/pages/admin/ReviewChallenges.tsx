/**
 * ReviewChallenges — P6 Revamp
 *
 * Two views via BrutalTabBar:
 *   1. Submission Queue — pending challenge completions (verify/reject)
 *   2. Challenge Queue — challenges by status (draft/published/archived) with quick actions
 *
 * Wraps in AdminPageShell for consistent admin layout.
 */

import React, { useState, useMemo } from 'react';
import { useAuth } from '../../lib/auth';
import {
    usePendingCompletions,
    useCompletionReviewMutations,
    useBadgeMutations,
    useAllChallenges,
    useChallengeMutations,
} from '../../lib/hooks';
import { Link } from 'react-router';
import {
    Trophy,
    CheckCircle,
    XCircle,
    ExternalLink,
    Loader2,
    User,
    FileText,
    Link2,
    Zap,
    Send,
    Archive,
    ArrowRight,
} from 'lucide-react';
import { AdminPageShell } from '../../components/admin/AdminPageShell';
import { BrutalTabBar, type TabOption } from '../../components/admin/BrutalTabBar';
import { toast } from '../../lib/toast';
import { cn } from '../../lib/utils';

type ViewTab = 'submissions' | 'challenges';

const TIER_DOT: Record<string, string> = {
    'Tier 1': 'bg-green-500',
    'Tier 2': 'bg-yellow-500',
    'Tier 3': 'bg-brutal-red',
};

export function ReviewChallenges() {
    const { user, role } = useAuth();
    const [activeView, setActiveView] = useState<ViewTab>('submissions');

    // Submission queue data
    const { data: completions, loading: completionsLoading, refetch: refetchCompletions } = usePendingCompletions();
    const { verifyCompletion, rejectCompletion } = useCompletionReviewMutations();
    const { awardBadge } = useBadgeMutations();
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Challenge queue data
    const { data: challenges, loading: challengesLoading, refetch: refetchChallenges } = useAllChallenges();
    const { updateChallenge } = useChallengeMutations();

    // ─── Derived ───────────────────────────────────────────────────
    const pendingList = completions || [];
    const challengesByStatus = useMemo(() => {
        const groups = { draft: [] as any[], review_ready: [] as any[], published: [] as any[], archived: [] as any[] };
        for (const c of challenges || []) {
            if (c.status === 'draft') groups.draft.push(c);
            else if (c.status === 'review_ready') groups.review_ready.push(c);
            else if (c.status === 'published') groups.published.push(c);
            else if (c.status === 'archived') groups.archived.push(c);
        }
        return groups;
    }, [challenges]);

    const viewTabs: TabOption<ViewTab>[] = [
        { value: 'submissions', label: 'Submission Queue', count: pendingList.length },
        { value: 'challenges', label: 'Challenge Queue', count: challengesByStatus.draft.length },
    ];

    // ─── Handlers ──────────────────────────────────────────────────
    const handleVerify = async (completion: any) => {
        if (!user) return;
        setActionLoading(completion.id);
        const { error: verifyErr } = await verifyCompletion(completion.id, user.id);
        if (!verifyErr) {
            toast.success('Submission verified.');
            try {
                const { onChallengeVerified } = await import('../../lib/badgeEngine');
                await onChallengeVerified(completion.user_id, completion.challenge_id);
            } catch (err) {
                console.error('Failed to auto-award challenge badges', err);
            }
        } else {
            toast.error('Failed to verify.');
        }
        await refetchCompletions();
        setActionLoading(null);
    };

    const handleReject = async (id: string) => {
        if (!window.confirm('Reject this submission? The maker will need to re-submit.')) return;
        setActionLoading(id);
        await rejectCompletion(id);
        toast.success('Submission rejected.');
        await refetchCompletions();
        setActionLoading(null);
    };

    const handleAdvanceStatus = async (id: string, newStatus: string) => {
        setActionLoading(id);
        const { error } = await updateChallenge(id, { status: newStatus } as any);
        if (error) toast.error(error);
        else toast.success(`Challenge ${newStatus}.`);
        await refetchChallenges();
        setActionLoading(null);
    };

    // ─── Access guard ──────────────────────────────────────────────
    if (role !== 'admin' && role !== 'mentor') {
        return (
            <AdminPageShell role={role ?? 'viewer'} title="Access Denied" subtitle="Mentor or admin only." icon={Trophy}>
                <p className="font-data text-brutal-dark/60">You don't have permission to review challenges.</p>
            </AdminPageShell>
        );
    }

    const loading = activeView === 'submissions' ? completionsLoading : challengesLoading;

    return (
        <AdminPageShell
            role={role}
            title="Challenge Review"
            subtitle={`${pendingList.length} submissions pending · ${challengesByStatus.draft.length} drafts`}
            icon={Trophy}
        >
            <BrutalTabBar tabs={viewTabs} activeTab={activeView} onTabChange={setActiveView} />

            {loading ? (
                <p className="font-data text-brutal-dark/60 py-8 text-center">Loading...</p>
            ) : activeView === 'submissions' ? (
                /* ═══════════════════════════════════════════════
                   SUBMISSION QUEUE
                ═══════════════════════════════════════════════ */
                pendingList.length === 0 ? (
                    <div className="rounded-2xl border-2 border-dashed border-brutal-dark/15 bg-brutal-bg p-12 text-center">
                        <Trophy className="w-10 h-10 text-brutal-dark/15 mx-auto mb-3" />
                        <h3 className="font-heading font-bold text-lg uppercase text-brutal-dark/30">Queue is clear</h3>
                        <p className="font-data text-xs text-brutal-dark/30 mt-1">No challenge submissions awaiting verification.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {pendingList.map((completion) => {
                            const isPending = actionLoading === completion.id;
                            return (
                                <article
                                    key={completion.id}
                                    className="rounded-xl border-2 border-yellow-500/40 bg-yellow-500/[0.04] p-5 shadow-[4px_4px_0_0_rgba(234,179,8,0.18)]"
                                >
                                    <div className="flex flex-col lg:flex-row gap-4">
                                        <div className="flex-1 min-w-0 space-y-3">
                                            <div>
                                                <span className="font-data text-[9px] font-bold uppercase tracking-widest text-yellow-700/70 block mb-0.5">Challenge</span>
                                                <h3 className="font-heading font-bold text-lg leading-tight">{completion.challengeTitle}</h3>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <User className="w-3 h-3 text-brutal-dark/40" />
                                                <span className="font-data text-xs"><strong>{completion.userName}</strong></span>
                                                <span className="font-data text-[9px] text-brutal-dark/40">
                                                    {new Date(completion.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <div className="bg-brutal-bg border border-brutal-dark/8 rounded-lg p-3 space-y-2">
                                                {completion.notes && (
                                                    <div>
                                                        <span className="font-data text-[8px] font-bold uppercase tracking-widest text-brutal-dark/35 flex items-center gap-1 mb-0.5">
                                                            <FileText size={10} /> Notes
                                                        </span>
                                                        <p className="font-data text-xs text-brutal-dark/65 italic border-l-2 border-yellow-500/30 pl-2.5">
                                                            {completion.notes}
                                                        </p>
                                                    </div>
                                                )}
                                                {completion.evidence_url && (
                                                    <a href={completion.evidence_url} target="_blank" rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 font-data text-[10px] font-bold text-brutal-red hover:underline">
                                                        <Link2 size={10} /> View Evidence <ExternalLink size={8} />
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex flex-row lg:flex-col gap-2 lg:min-w-[140px] lg:border-l lg:border-brutal-dark/8 lg:pl-4 shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => handleVerify(completion)}
                                                disabled={isPending}
                                                className="flex-1 lg:flex-none inline-flex items-center justify-center gap-1.5 rounded-lg bg-brutal-dark text-brutal-bg hover:bg-green-700 transition-colors px-3 py-2 font-data text-[10px] font-bold uppercase tracking-widest disabled:opacity-50"
                                            >
                                                {isPending ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                                                Verify
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleReject(completion.id)}
                                                disabled={isPending}
                                                className="flex-1 lg:flex-none inline-flex items-center justify-center gap-1.5 rounded-lg border-2 border-brutal-dark/15 text-brutal-dark/60 hover:border-brutal-red hover:text-brutal-red transition-colors px-3 py-2 font-data text-[10px] font-bold uppercase tracking-widest disabled:opacity-50"
                                            >
                                                <XCircle size={12} /> Reject
                                            </button>
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )
            ) : (
                /* ═══════════════════════════════════════════════
                   CHALLENGE PUBLISHING QUEUE — kanban-style columns
                ═══════════════════════════════════════════════ */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Draft column */}
                    <KanbanColumn
                        title="Draft"
                        color="yellow"
                        items={challengesByStatus.draft}
                        actionLabel="Submit for Review"
                        actionIcon={<Send size={10} />}
                        onAction={(id) => handleAdvanceStatus(id, 'review_ready')}
                        actionLoading={actionLoading}
                    />
                    {/* Review Ready column */}
                    <KanbanColumn
                        title="Review Ready"
                        color="blue"
                        items={challengesByStatus.review_ready}
                        actionLabel="Publish"
                        actionIcon={<Send size={10} />}
                        onAction={(id) => handleAdvanceStatus(id, 'published')}
                        actionLoading={actionLoading}
                    />
                    {/* Published column */}
                    <KanbanColumn
                        title="Published"
                        color="green"
                        items={challengesByStatus.published}
                        actionLabel="Archive"
                        actionIcon={<Archive size={10} />}
                        onAction={(id) => handleAdvanceStatus(id, 'archived')}
                        actionLoading={actionLoading}
                    />
                    {/* Archived column */}
                    <KanbanColumn
                        title="Archived"
                        color="gray"
                        items={challengesByStatus.archived}
                        actionLabel="Re-publish"
                        actionIcon={<Send size={10} />}
                        onAction={(id) => handleAdvanceStatus(id, 'published')}
                        actionLoading={actionLoading}
                    />
                </div>
            )}
        </AdminPageShell>
    );
}

// ─── Kanban column ─────────────────────────────────────────────────────────

function KanbanColumn({
    title, color, items, actionLabel, actionIcon, onAction, actionLoading,
}: {
    title: string;
    color: 'yellow' | 'blue' | 'green' | 'gray';
    items: any[];
    actionLabel: string;
    actionIcon: React.ReactNode;
    onAction: (id: string) => void;
    actionLoading: string | null;
}) {
    const borderColor = color === 'yellow' ? 'border-yellow-400' : color === 'blue' ? 'border-blue-400' : color === 'green' ? 'border-green-400' : 'border-gray-300';
    const headerBg = color === 'yellow' ? 'bg-yellow-100 text-yellow-800' : color === 'blue' ? 'bg-blue-100 text-blue-800' : color === 'green' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600';

    return (
        <div className={cn('border-2 rounded-xl overflow-hidden', borderColor)}>
            <div className={cn('px-4 py-2.5 flex items-center justify-between', headerBg)}>
                <span className="font-heading font-bold text-sm uppercase">{title}</span>
                <span className="font-data text-[10px] font-bold">{items.length}</span>
            </div>
            <div className="p-2 space-y-2 max-h-[500px] overflow-y-auto bg-brutal-bg">
                {items.length === 0 ? (
                    <p className="font-data text-xs text-brutal-dark/30 text-center py-6">Empty</p>
                ) : (
                    items.map((c) => (
                        <div key={c.id} className="border border-brutal-dark/10 rounded-lg p-3 bg-brutal-bg hover:border-brutal-dark/25 transition-colors">
                            <div className="flex items-start gap-2">
                                <span className={cn('w-2 h-2 rounded-full mt-1.5 flex-shrink-0', TIER_DOT[c.tier || ''] || 'bg-brutal-dark/20')} />
                                <div className="flex-1 min-w-0">
                                    <Link to={`/admin/challenges/${c.id}/edit`} className="font-heading font-bold text-xs uppercase text-brutal-dark hover:text-brutal-red transition-colors leading-tight block truncate">
                                        {c.title}
                                    </Link>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="font-data text-[8px] text-brutal-dark/40">{c.tier}</span>
                                        <span className="font-data text-[8px] text-brutal-dark/40">{c.domain}</span>
                                    </div>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => onAction(c.id)}
                                disabled={actionLoading === c.id}
                                className="mt-2 w-full inline-flex items-center justify-center gap-1 rounded-md border border-brutal-dark/15 px-2 py-1.5 font-data text-[9px] font-bold uppercase tracking-widest text-brutal-dark/60 hover:bg-brutal-dark hover:text-brutal-bg transition-colors disabled:opacity-40"
                            >
                                {actionLoading === c.id ? <Loader2 size={10} className="animate-spin" /> : actionIcon}
                                {actionLabel}
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
