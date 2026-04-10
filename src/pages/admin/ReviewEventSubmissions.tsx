import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { Link } from 'react-router';
import { Skeleton } from '../../components/ui/Skeleton';
import {
    Trophy,
    Calendar,
    CheckCircle,
    XCircle,
    Star,
    ArrowLeft,
    Loader2,
    User,
    Users,
    ExternalLink,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Review Event Submissions — Build Challenge project submission review
//
// Brutalist design: yellow-500 accent cards, 6px offset shadows,
// pill buttons, font-heading/font-data, proper loading skeletons.
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
    submitted:   'bg-brutal-dark/8 text-brutal-dark/70',
    shortlisted: 'bg-yellow-500/20 text-yellow-800 border border-yellow-400/50',
    accepted:    'bg-green-100 text-green-800 border border-green-300/50',
    rejected:    'bg-brutal-red/10 text-brutal-red border border-brutal-red/20',
    winner:      'bg-yellow-400/30 text-yellow-900 border border-yellow-500/50',
};

export function ReviewEventSubmissions() {
    const { role } = useAuth();
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const fetchSubmissions = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('event_submission')
            .select(`
                id, status, created_at,
                event:event!event_id(id, title, event_type),
                project:project!project_id(id, title, summary, domain),
                team:event_team!team_id(id, name),
                user:app_user!user_id(name, email)
            `)
            .in('status', ['submitted', 'shortlisted'])
            .order('created_at', { ascending: false });

        if (!error && data) setSubmissions(data);
        setLoading(false);
    };

    useEffect(() => {
        if (role === 'admin' || role === 'mentor') fetchSubmissions();
    }, [role]);

    const handleUpdateStatus = async (subId: string, newStatus: string) => {
        setActionLoading(subId);
        setSubmissions(prev =>
            prev.map(s => s.id === subId ? { ...s, status: newStatus } : s)
                .filter(s => ['submitted', 'shortlisted'].includes(s.status)),
        );
        await supabase.from('event_submission').update({ status: newStatus }).eq('id', subId);
        setActionLoading(null);
    };

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

    // ── Loading skeleton ───────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="flex-1 w-full bg-brutal-bg pt-28 px-6 md:px-12 lg:px-24 min-h-screen pb-32">
                <div className="max-w-7xl mx-auto space-y-6">
                    <Skeleton variant="line" className="h-6 w-48" />
                    <Skeleton variant="banner" className="h-14 w-96" />
                    <Skeleton variant="line" className="h-5 w-80" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-8">
                        <Skeleton variant="card" className="h-64" />
                        <Skeleton variant="card" className="h-64" />
                        <Skeleton variant="card" className="h-64" />
                        <Skeleton variant="card" className="h-64" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 w-full bg-brutal-bg pt-28 px-6 md:px-12 lg:px-24 min-h-screen pb-32">
            <div className="max-w-7xl mx-auto space-y-6">

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
                        Event Submissions
                    </h1>
                    <p className="font-data text-sm text-brutal-dark/55 mt-2 max-w-2xl">
                        Review, shortlist, and accept Build Challenge project submissions from participating makers and teams.
                    </p>
                </div>

                {/* ── Queue count ─────────────────────────────────────── */}
                <div className="flex items-center gap-3">
                    <span className="font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/40">
                        {submissions.length} pending
                    </span>
                    <div className="flex-1 h-px bg-brutal-dark/8" />
                </div>

                {/* ── Empty state ─────────────────────────────────────── */}
                {submissions.length === 0 ? (
                    <div className="rounded-2xl border-2 border-dashed border-brutal-dark/15 bg-brutal-bg p-12 text-center">
                        <div className="w-12 h-12 rounded-full bg-brutal-dark/5 flex items-center justify-center mx-auto mb-4">
                            <Trophy className="w-6 h-6 text-brutal-dark/25" />
                        </div>
                        <h3 className="font-heading font-bold text-xl uppercase text-brutal-dark/40">
                            All Caught Up
                        </h3>
                        <p className="font-data text-sm text-brutal-dark/35 mt-1">
                            No pending event submissions to review.
                        </p>
                        <Link
                            to="/dashboard"
                            className="inline-flex items-center gap-1.5 mt-5 rounded-full bg-brutal-dark text-brutal-bg px-4 py-2 font-data text-[10px] font-bold uppercase tracking-widest hover:bg-brutal-red transition-colors"
                        >
                            <ArrowLeft className="w-3 h-3" /> Back to Dashboard
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {submissions.map((sub) => {
                            const isPending = actionLoading === sub.id;
                            return (
                                <article
                                    key={sub.id}
                                    className="rounded-2xl border-2 border-yellow-500/40 bg-yellow-500/[0.04] p-5 shadow-[6px_6px_0_0_rgba(234,179,8,0.18)] flex flex-col transition-all duration-150 motion-reduce:transition-none"
                                >
                                    {/* Status + date */}
                                    <div className="flex justify-between items-start mb-3">
                                        <span className={`px-2 py-0.5 text-[9px] font-bold font-data rounded-full uppercase tracking-widest ${STATUS_BADGE[sub.status] || STATUS_BADGE.submitted}`}>
                                            {sub.status}
                                        </span>
                                        <span className="font-data text-[10px] text-brutal-dark/40 uppercase tracking-widest">
                                            {new Date(sub.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        </span>
                                    </div>

                                    {/* Event label */}
                                    <div className="flex items-center gap-1.5 font-data text-[9px] font-bold text-yellow-700/70 uppercase tracking-widest mb-1">
                                        <Calendar className="w-3 h-3" /> {sub.event?.title}
                                    </div>

                                    {/* Project title + summary */}
                                    <h4 className="font-heading font-bold text-lg leading-tight mb-1.5">
                                        {sub.project?.title || 'Unknown Project'}
                                    </h4>
                                    <p className="font-data text-xs text-brutal-dark/60 line-clamp-2 mb-4">
                                        {sub.project?.summary}
                                    </p>

                                    {/* Meta */}
                                    <div className="bg-brutal-bg border-2 border-brutal-dark/8 rounded-xl p-3 space-y-1.5 mb-4 flex-1">
                                        <div className="flex items-center gap-2">
                                            <User className="w-3 h-3 text-brutal-dark/40" />
                                            <span className="font-data text-[10px] text-brutal-dark/60">{sub.user?.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Users className="w-3 h-3 text-brutal-dark/40" />
                                            <span className="font-data text-[10px] text-brutal-dark/60">{sub.team?.name || 'Individual Entry'}</span>
                                        </div>
                                        {sub.project?.id && (
                                            <Link
                                                to={`/projects/${sub.project.id}`}
                                                target="_blank"
                                                className="inline-flex items-center gap-1 font-data text-[10px] font-bold text-brutal-red hover:text-brutal-dark transition-colors mt-1"
                                            >
                                                <ExternalLink className="w-3 h-3" /> View Project
                                            </Link>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex flex-wrap gap-2">
                                        {sub.status === 'submitted' && (
                                            <button
                                                type="button"
                                                onClick={() => handleUpdateStatus(sub.id, 'shortlisted')}
                                                disabled={isPending}
                                                className="inline-flex items-center justify-center gap-1.5 rounded-full bg-yellow-500 text-brutal-dark hover:bg-yellow-600 transition-colors px-3 py-2 font-data text-[10px] font-bold uppercase tracking-widest disabled:opacity-50 flex-1"
                                            >
                                                {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Star className="w-3 h-3" />}
                                                Shortlist
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => handleUpdateStatus(sub.id, 'accepted')}
                                            disabled={isPending}
                                            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-brutal-dark text-brutal-bg hover:bg-brutal-red transition-colors px-3 py-2 font-data text-[10px] font-bold uppercase tracking-widest disabled:opacity-50 flex-1"
                                        >
                                            {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                                            Accept
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleUpdateStatus(sub.id, 'rejected')}
                                            disabled={isPending}
                                            className="inline-flex items-center justify-center gap-1.5 rounded-full border-2 border-brutal-dark/15 bg-brutal-bg text-brutal-dark/70 hover:border-brutal-red hover:text-brutal-red transition-colors px-3 py-2 font-data text-[10px] font-bold uppercase tracking-widest disabled:opacity-50 flex-1"
                                        >
                                            <XCircle className="w-3 h-3" /> Reject
                                        </button>
                                        {role === 'admin' && (
                                            <button
                                                type="button"
                                                onClick={() => handleUpdateStatus(sub.id, 'winner')}
                                                disabled={isPending}
                                                className="inline-flex items-center justify-center gap-1.5 rounded-full bg-brutal-dark text-yellow-400 border-2 border-yellow-500/60 hover:bg-yellow-500 hover:text-brutal-dark transition-colors px-3 py-2 font-data text-[10px] font-bold uppercase tracking-widest disabled:opacity-50 w-full mt-1"
                                            >
                                                <Trophy className="w-3 h-3" /> Mark Winner
                                            </button>
                                        )}
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
