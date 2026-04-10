import React, { useState, useMemo } from 'react';
import { useAuth } from '../../lib/auth';
import { useEventWebsitesForReview, useEventWebsiteMutations, useAllEvents } from '../../lib/hooks';
import { Link } from 'react-router';
import { Skeleton } from '../../components/ui/Skeleton';
import {
    Globe,
    Users,
    Eye,
    EyeOff,
    CheckCircle,
    XCircle,
    ArrowLeft,
    Loader2,
    ChevronDown,
    User,
    RotateCcw,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Review Website Submissions — website showcase review with live preview
//
// Brutalist yellow accent cards, 6px offset shadows, browser-chrome iframe,
// status filters, event dropdown. Matches MentorDashboard + ReviewProjects.
// ─────────────────────────────────────────────────────────────────────────────

const MINI_PREVIEW_STYLE: React.CSSProperties = {
    transform: 'scale(0.4)',
    transformOrigin: 'top left',
    width: '250%',
    height: '250%',
    paddingTop: '18px',
    pointerEvents: 'none',
};
const FULL_PREVIEW_STYLE: React.CSSProperties = { paddingTop: '28px' };

const STATUS_BADGE: Record<string, string> = {
    pending:  'bg-yellow-500/20 text-yellow-800',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-brutal-red/10 text-brutal-red',
};

export function ReviewWebsiteSubmissions() {
    const { user, role } = useAuth();
    const [selectedEventId, setSelectedEventId] = useState<string | undefined>(undefined);
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
    const { data: websites, loading, refetch } = useEventWebsitesForReview(selectedEventId);
    const { data: events } = useAllEvents();
    const { reviewWebsite } = useEventWebsiteMutations();
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [previewId, setPreviewId] = useState<string | null>(null);

    const handleReview = async (id: string, status: 'approved' | 'rejected') => {
        if (!user) return;
        setActionLoading(id);
        await reviewWebsite(id, status, user.id);
        refetch();
        setActionLoading(null);
    };

    const filtered = useMemo(
        () => (websites || []).filter(w => statusFilter === 'all' || w.status === statusFilter),
        [websites, statusFilter],
    );

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
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-8">
                        <Skeleton variant="card" className="h-80" />
                        <Skeleton variant="card" className="h-80" />
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
                            <Globe className="w-5 h-5 text-yellow-700" />
                        </div>
                        Website Reviews
                    </h1>
                    <p className="font-data text-sm text-brutal-dark/55 mt-2 max-w-2xl">
                        Review and approve participant website submissions. Approved websites appear on the event showcase wall.
                    </p>
                </div>

                {/* ── Filters ──────────────────────────────────────────── */}
                <div className="flex flex-wrap gap-3 items-center">
                    <div className="relative">
                        <select
                            value={selectedEventId || ''}
                            onChange={e => setSelectedEventId(e.target.value || undefined)}
                            className="bg-brutal-bg border-2 border-brutal-dark/15 px-4 py-2 pr-10 rounded-xl font-data text-xs font-bold focus:outline-none focus:border-brutal-dark/30 appearance-none min-w-[200px]"
                        >
                            <option value="">All Events</option>
                            {(events || []).map(ev => (
                                <option key={ev.id} value={ev.id}>{ev.title}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-brutal-dark/40 pointer-events-none" />
                    </div>

                    <div className="flex gap-0.5 bg-brutal-dark/5 rounded-xl p-1">
                        {(['pending', 'approved', 'rejected', 'all'] as const).map(s => (
                            <button
                                key={s}
                                onClick={() => setStatusFilter(s)}
                                className={`px-3 py-1.5 rounded-lg font-data text-[10px] font-bold uppercase tracking-widest transition-all ${
                                    statusFilter === s
                                        ? 'bg-brutal-dark text-brutal-bg shadow-[2px_2px_0_0_rgba(234,179,8,0.35)]'
                                        : 'text-brutal-dark/50 hover:text-brutal-dark hover:bg-brutal-dark/10'
                                }`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>

                    <span className="font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/40 ml-auto">
                        {filtered.length} result{filtered.length !== 1 ? 's' : ''}
                    </span>
                </div>

                {/* ── Content ──────────────────────────────────────────── */}
                {filtered.length === 0 ? (
                    <div className="rounded-2xl border-2 border-dashed border-brutal-dark/15 bg-brutal-bg p-12 text-center">
                        <div className="w-12 h-12 rounded-full bg-brutal-dark/5 flex items-center justify-center mx-auto mb-4">
                            <Globe className="w-6 h-6 text-brutal-dark/25" />
                        </div>
                        <h3 className="font-heading font-bold text-xl uppercase text-brutal-dark/40">
                            No Submissions Found
                        </h3>
                        <p className="font-data text-sm text-brutal-dark/35 mt-1">
                            No {statusFilter !== 'all' ? statusFilter : ''} website submissions match the current filters.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        {filtered.map(website => {
                            const isPending = actionLoading === website.id;
                            const isExpanded = previewId === website.id;
                            return (
                                <article
                                    key={website.id}
                                    className="rounded-2xl border-2 border-yellow-500/40 bg-yellow-500/[0.04] shadow-[6px_6px_0_0_rgba(234,179,8,0.18)] overflow-hidden flex flex-col transition-all duration-150 motion-reduce:transition-none"
                                >
                                    {/* ── Preview area ────────────────── */}
                                    <div className="relative bg-white" style={{ height: isExpanded ? '400px' : '180px' }}>
                                        {/* Browser chrome */}
                                        <div className="absolute top-0 left-0 right-0 bg-brutal-dark px-3 py-1.5 flex items-center gap-2 z-10">
                                            <div className="flex gap-1">
                                                <div className="w-2 h-2 rounded-full bg-brutal-red/70" />
                                                <div className="w-2 h-2 rounded-full bg-yellow-500/70" />
                                                <div className="w-2 h-2 rounded-full bg-green-500/70" />
                                            </div>
                                            <div className="flex-1 bg-brutal-dark/50 rounded px-2 py-0.5">
                                                <span className="font-data text-[8px] text-brutal-bg/40 truncate block">
                                                    {website.title}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => setPreviewId(isExpanded ? null : website.id)}
                                                className="text-brutal-bg/40 hover:text-brutal-bg transition-colors"
                                                aria-label={isExpanded ? 'Collapse preview' : 'Expand preview'}
                                            >
                                                {isExpanded ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                            </button>
                                        </div>

                                        {website.html_content ? (
                                            <iframe
                                                srcDoc={website.html_content}
                                                title={website.title}
                                                className="w-full h-full border-0 pt-7"
                                                sandbox={isExpanded ? 'allow-scripts' : ''}
                                                style={!isExpanded ? MINI_PREVIEW_STYLE : FULL_PREVIEW_STYLE}
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-brutal-dark/5 pt-7">
                                                <Globe className="w-8 h-8 text-brutal-dark/15" />
                                            </div>
                                        )}
                                    </div>

                                    {/* ── Details ─────────────────────── */}
                                    <div className="p-5 flex flex-col flex-1">
                                        <div className="flex justify-between items-start mb-3">
                                            <span className={`px-2 py-0.5 text-[9px] font-bold font-data rounded-full uppercase tracking-widest ${STATUS_BADGE[website.status] || STATUS_BADGE.pending}`}>
                                                {website.status}
                                            </span>
                                            <span className="font-data text-[10px] text-brutal-dark/40 uppercase tracking-widest">
                                                {new Date(website.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                            </span>
                                        </div>

                                        <h3 className="font-heading font-bold text-lg leading-tight mb-1.5">
                                            {website.title}
                                        </h3>
                                        {website.description && (
                                            <p className="font-data text-xs text-brutal-dark/60 line-clamp-2 mb-3">
                                                {website.description}
                                            </p>
                                        )}

                                        {/* Meta */}
                                        <div className="bg-brutal-bg border-2 border-brutal-dark/8 rounded-xl p-3 space-y-1.5 mb-4 flex-1">
                                            <div className="flex items-center gap-2">
                                                <User className="w-3 h-3 text-brutal-dark/40" />
                                                <span className="font-data text-[10px] text-brutal-dark/60">{website.userName}</span>
                                            </div>
                                            {website.userEmail && (
                                                <div className="flex items-center gap-2">
                                                    <span className="font-data text-[10px] text-brutal-dark/40 ml-5">{website.userEmail}</span>
                                                </div>
                                            )}
                                            {website.host_names && website.host_names.length > 0 && (
                                                <div className="flex items-center gap-2">
                                                    <Users className="w-3 h-3 text-brutal-dark/40" />
                                                    <span className="font-data text-[10px] text-brutal-dark/60">
                                                        {website.host_names.join(', ')}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions — vary by status */}
                                        {website.status === 'pending' && (
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => handleReview(website.id, 'approved')}
                                                    disabled={isPending}
                                                    className="inline-flex items-center justify-center gap-1.5 rounded-full bg-brutal-dark text-brutal-bg hover:bg-brutal-red transition-colors px-3 py-2 font-data text-[10px] font-bold uppercase tracking-widest disabled:opacity-50 flex-1"
                                                >
                                                    {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                                                    Approve
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleReview(website.id, 'rejected')}
                                                    disabled={isPending}
                                                    className="inline-flex items-center justify-center gap-1.5 rounded-full border-2 border-brutal-dark/15 bg-brutal-bg text-brutal-dark/70 hover:border-brutal-red hover:text-brutal-red transition-colors px-3 py-2 font-data text-[10px] font-bold uppercase tracking-widest disabled:opacity-50 flex-1"
                                                >
                                                    <XCircle className="w-3 h-3" /> Reject
                                                </button>
                                            </div>
                                        )}

                                        {website.status === 'approved' && (
                                            <button
                                                type="button"
                                                onClick={() => handleReview(website.id, 'rejected')}
                                                disabled={isPending}
                                                className="inline-flex items-center justify-center gap-1.5 rounded-full border-2 border-brutal-dark/15 bg-brutal-bg text-brutal-dark/70 hover:border-brutal-red hover:text-brutal-red transition-colors px-3 py-2 font-data text-[10px] font-bold uppercase tracking-widest disabled:opacity-50 w-full"
                                            >
                                                {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                                                Revoke Approval
                                            </button>
                                        )}

                                        {website.status === 'rejected' && (
                                            <button
                                                type="button"
                                                onClick={() => handleReview(website.id, 'approved')}
                                                disabled={isPending}
                                                className="inline-flex items-center justify-center gap-1.5 rounded-full bg-brutal-dark text-brutal-bg hover:bg-brutal-red transition-colors px-3 py-2 font-data text-[10px] font-bold uppercase tracking-widest disabled:opacity-50 w-full"
                                            >
                                                {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                                                Approve After All
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
