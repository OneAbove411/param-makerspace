import React, { useState } from 'react';
import { useAuth } from '../../lib/auth';
import { usePendingProjects, useProjectReviewMutations, useMyProfile, useMaker } from '../../lib/hooks';
import { Link } from 'react-router';
import { Skeleton } from '../../components/ui/Skeleton';
import {
    ClipboardCheck,
    CheckCircle,
    XCircle,
    ExternalLink,
    ArrowLeft,
    Loader2,
    Layers,
    User,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Review Projects — Mentor / Admin review queue for pending project proposals
//
// Brutalist design aligned with MentorDashboard.tsx:
//   yellow-500 accents, 6px offset shadows, font-heading / font-data,
//   rounded-2xl cards, pill buttons, proper loading skeletons.
// ─────────────────────────────────────────────────────────────────────────────

export function ReviewProjects() {
    const { user, role } = useAuth();
    const { data: projects, loading } = usePendingProjects();
    const { data: profile, loading: profileLoading } = useMyProfile();
    const { data: makerProfile } = useMaker(user?.id);
    const { approveProject, rejectProject } = useProjectReviewMutations();
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [localProjects, setLocalProjects] = useState<typeof projects>(null);

    React.useEffect(() => { if (projects) setLocalProjects(projects); }, [projects]);

    const approvalDomains = (makerProfile as any)?.approval_domains
        ? (makerProfile as any).approval_domains.split(',').map((d: string) => d.trim().toLowerCase())
        : [];

    const isAdmin = role === 'admin';

    const filteredProjects = (localProjects || []).filter(p => {
        if (isAdmin) return true;
        if (approvalDomains.length === 0) return true;
        return approvalDomains.includes((p.domain || '').toLowerCase());
    });

    const handleApprove = async (id: string) => {
        setActionLoading(id);
        setLocalProjects(prev => prev?.filter(p => p.id !== id) ?? null);
        await approveProject(id);
        try {
            const { supabase } = await import('../../lib/supabase');
            const { onProjectApproved, onProjectActive } = await import('../../lib/badgeEngine');
            const { data: p } = await supabase.from('project').select('owner_id').eq('id', id).single();
            if (p?.owner_id) {
                await onProjectApproved(p.owner_id);
                await onProjectActive(p.owner_id);
            }
        } catch (err) {
            console.error('Failed to auto-award project badges', err);
        }
        setActionLoading(null);
    };

    const handleReject = async (id: string) => {
        if (!window.confirm('Are you sure you want to reject this project? The maker will need to edit and resubmit.')) return;
        setActionLoading(id);
        setLocalProjects(prev => prev?.filter(p => p.id !== id) ?? null);
        await rejectProject(id);
        setActionLoading(null);
    };

    // ── Loading skeleton ───────────────────────────────────────────────────
    if (loading || profileLoading) {
        return (
            <div className="flex-1 w-full bg-brutal-bg pt-28 px-6 md:px-12 lg:px-24 min-h-screen pb-32">
                <div className="max-w-6xl mx-auto space-y-6">
                    <Skeleton variant="line" className="h-6 w-48" />
                    <Skeleton variant="banner" className="h-14 w-96" />
                    <Skeleton variant="line" className="h-5 w-80" />
                    <div className="space-y-5 mt-8">
                        <Skeleton variant="card" className="h-52" />
                        <Skeleton variant="card" className="h-52" />
                    </div>
                </div>
            </div>
        );
    }

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
                    {!isAdmin && approvalDomains.length > 0 && (
                        <span className="font-data text-[10px] text-brutal-dark/40 ml-auto">
                            Showing: {approvalDomains.map((d: string) => d.charAt(0).toUpperCase() + d.slice(1)).join(', ')}
                        </span>
                    )}
                    {isAdmin && (
                        <span className="font-data text-[10px] text-brutal-dark/40 ml-auto">
                            Admin: all domains
                        </span>
                    )}
                </div>

                <div className="border-b-2 border-brutal-dark/10 pb-5">
                    <h1 className="font-heading font-bold text-3xl md:text-4xl uppercase tracking-tight-heading flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-yellow-500/15 border-2 border-yellow-500/40 flex items-center justify-center">
                            <ClipboardCheck className="w-5 h-5 text-yellow-700" />
                        </div>
                        Project Reviews
                    </h1>
                    <p className="font-data text-sm text-brutal-dark/55 mt-2 max-w-2xl">
                        Review pending project proposals. Approve to make them active and public, or reject to request changes from the maker.
                    </p>
                </div>

                {/* ── Queue count ─────────────────────────────────────── */}
                <div className="flex items-center gap-3">
                    <span className="font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/40">
                        {filteredProjects.length} pending
                    </span>
                    <div className="flex-1 h-px bg-brutal-dark/8" />
                </div>

                {/* ── Empty state ─────────────────────────────────────── */}
                {filteredProjects.length === 0 ? (
                    <div className="rounded-2xl border-2 border-dashed border-brutal-dark/15 bg-brutal-bg p-12 text-center">
                        <div className="w-12 h-12 rounded-full bg-brutal-dark/5 flex items-center justify-center mx-auto mb-4">
                            <ClipboardCheck className="w-6 h-6 text-brutal-dark/25" />
                        </div>
                        <h3 className="font-heading font-bold text-xl uppercase text-brutal-dark/40">
                            Queue is Clear
                        </h3>
                        <p className="font-data text-sm text-brutal-dark/35 mt-1">
                            No projects currently awaiting review. Check back later.
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
                        {filteredProjects.map((project) => {
                            const isPending = actionLoading === project.id;
                            return (
                                <article
                                    key={project.id}
                                    className="rounded-2xl border-2 border-yellow-500/40 bg-yellow-500/[0.04] p-5 md:p-6 shadow-[6px_6px_0_0_rgba(234,179,8,0.18)] transition-all duration-150 motion-reduce:transition-none"
                                >
                                    <div className="flex flex-col lg:flex-row gap-5">
                                        {/* ── Info ──────────────────────────────── */}
                                        <div className="flex-1 min-w-0 space-y-3">
                                            {/* Title + badges */}
                                            <div className="flex items-start gap-2 flex-wrap">
                                                <h3 className="font-heading font-bold text-xl md:text-2xl leading-tight">
                                                    {project.title}
                                                </h3>
                                                {project.domain && (
                                                    <span className="shrink-0 font-data text-[9px] font-bold uppercase tracking-widest bg-yellow-500/20 text-yellow-800 px-2 py-0.5 rounded-full">
                                                        {project.domain}
                                                    </span>
                                                )}
                                                {project.tier && (
                                                    <span className="shrink-0 font-data text-[9px] font-bold uppercase tracking-widest bg-brutal-dark/8 text-brutal-dark/60 px-2 py-0.5 rounded-full">
                                                        {project.tier}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Submitter */}
                                            <div className="flex items-center gap-2">
                                                <User className="w-3.5 h-3.5 text-brutal-dark/40" />
                                                <span className="font-data text-xs text-brutal-dark/60">
                                                    <strong className="text-brutal-dark/80">{project.ownerName}</strong>
                                                    {' '}({project.ownerEmail})
                                                </span>
                                            </div>

                                            {/* Content card */}
                                            <div className="bg-brutal-bg border-2 border-brutal-dark/8 rounded-xl p-4 space-y-3">
                                                <div>
                                                    <span className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-dark/40 block mb-1">
                                                        Summary
                                                    </span>
                                                    <p className="font-data text-sm text-brutal-dark/75 leading-relaxed">
                                                        {project.summary}
                                                    </p>
                                                </div>
                                                {project.description && project.description !== project.summary && (
                                                    <div>
                                                        <span className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-dark/40 block mb-1">
                                                            Description
                                                        </span>
                                                        <p className="font-data text-sm text-brutal-dark/70 whitespace-pre-wrap leading-relaxed line-clamp-4">
                                                            {project.description}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* ── Actions ───────────────────────────── */}
                                        <div className="flex flex-row lg:flex-col gap-2 lg:min-w-[180px] lg:border-l-2 lg:border-brutal-dark/8 lg:pl-5 shrink-0">
                                            <a
                                                href={`/projects/${project.id}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center justify-center gap-1.5 rounded-full border-2 border-brutal-dark/15 bg-brutal-bg px-4 py-2.5 font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/70 hover:border-brutal-dark hover:text-brutal-dark transition-colors"
                                            >
                                                <ExternalLink className="w-3 h-3" /> View
                                            </a>
                                            <button
                                                type="button"
                                                onClick={() => handleApprove(project.id)}
                                                disabled={isPending}
                                                aria-busy={isPending || undefined}
                                                className="inline-flex items-center justify-center gap-1.5 rounded-full bg-brutal-dark text-brutal-bg hover:bg-brutal-red transition-colors px-4 py-2.5 font-data text-[10px] font-bold uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                                                {isPending ? 'Working…' : 'Approve'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleReject(project.id)}
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
