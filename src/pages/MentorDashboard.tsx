import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router';
import {
    Shield,
    Calendar,
    FileText,
    CheckCircle,
    XCircle,
    AlertCircle,
    Loader2,
    Users,
    Megaphone,
    Globe,
    Sparkles,
} from 'lucide-react';
import { useAllEvents, useEventWebsitesForReview } from '../lib/hooks';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { toast } from '../lib/toast';
import { cn } from '../lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// §7 — Mentor Dashboard cockpit.
//
// Replaces the prior stacked-sections long-scroll page that produced:
//   • 4 full-height blocks that required scrolling up to reach the header
//   • Inconsistent brutalist tokens (border-4 + 4px solid shadow) that clashed
//     with the §7 main Dashboard shell (rounded-2xl, border-2, 6px yellow
//     offset shadow for review cards)
//   • No way to jump between queues without hunting
//
// New layout:
//
//   ┌──────────────────────────────────────────────────────┐
//   │ HERO — compact Shield badge + subtitle               │
//   │ STATS — 3 yellow review-queue mini cards             │
//   │ TABS  — Events / Websites / Showcase   (sticky)      │
//   ├──────────────────────────────────────────────────────┤
//   │ TAB BODY (scrollable content)                         │
//   └──────────────────────────────────────────────────────┘
//
// Tabs are in-page state only. All data hooks, role guards, and
// approve/reject flows are identical to the prior implementation.
// ─────────────────────────────────────────────────────────────────────────────

interface ShowcaseSlot {
    id: string;
    status: string;
    event_id: string;
    user_id: string;
    topic: string;
    project: { id: string; title: string };
    app_user: { name: string };
    event: { title: string };
}

type MentorTab = 'events' | 'websites' | 'showcase';

const formatEventType = (t: string) =>
    t === 'build_challenge' ? 'Build Challenge'
    : t === 'tech_tuesday' ? 'Tech Tuesday'
    : 'Maker Meetup';

export function MentorDashboard() {
    const { user } = useAuth();
    const { data: eventsData, loading: eventsLoading } = useAllEvents();
    const { data: submissionsData, refetch: refetchSubmissions } = useEventWebsitesForReview();
    const events = useMemo(() => eventsData ?? [], [eventsData]);
    const allSubmissions = useMemo(() => submissionsData ?? [], [submissionsData]);

    // Fetch mentor's approval domains for domain-specific filtering
    const [approvalDomains, setApprovalDomains] = useState<string[]>([]);
    useEffect(() => {
        if (!user?.id) return;
        (async () => {
            const { data } = await supabase
                .from('maker_profile')
                .select('approval_domains')
                .eq('user_id', user.id)
                .single();
            if (data?.approval_domains) {
                setApprovalDomains(
                    (data.approval_domains as string).split(',').map((d: string) => d.trim()).filter(Boolean)
                );
            }
        })();
    }, [user?.id]);
    const isAdmin = user?.role === 'admin';
    const hasDomainFilter = !isAdmin && approvalDomains.length > 0;

    const [showcaseSlots, setShowcaseSlots] = useState<ShowcaseSlot[]>([]);
    const [slotsLoading, setSlotsLoading] = useState(true);
    const [pendingSubmissionIds, setPendingSubmissionIds] = useState<Set<string>>(() => new Set());
    const [pendingSlotIds, setPendingSlotIds] = useState<Set<string>>(() => new Set());
    const [activeTab, setActiveTab] = useState<MentorTab>('events');
    const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());

    const isAuthorized = user && (user.role === 'mentor' || user.role === 'admin');

    // Fetch showcase slots. StrictMode-safe via `cancelled` flag.
    useEffect(() => {
        let cancelled = false;
        const fetchShowcaseSlots = async () => {
            try {
                const { data, error } = await supabase
                    .from('showcase_slot')
                    .select(
                        'id, status, event_id, user_id, topic, project:project!project_id(id, title), app_user:app_user!user_id(name), event:event!event_id(title)'
                    )
                    .eq('status', 'pending')
                    .order('created_at', { ascending: false });

                if (cancelled) return;
                if (error) throw error;
                if (data) setShowcaseSlots(data as unknown as ShowcaseSlot[]);
            } catch (error) {
                if (!cancelled) {
                    console.error('Error fetching showcase slots:', error);
                    toast.error('Could not load showcase slot requests.');
                }
            } finally {
                if (!cancelled) setSlotsLoading(false);
            }
        };
        fetchShowcaseSlots();
        return () => { cancelled = true; };
    }, []);

    // Filter events for this mentor (admins see all, mentors see their own)
    const mentorEvents = useMemo(() => (
        user?.role === 'admin'
            ? events
            : events.filter((e) => e.created_by === user?.id)
    ), [events, user]);

    const pendingWebsites = useMemo(
        () => allSubmissions.filter((s) => s.status === 'pending'),
        [allSubmissions],
    );

    // Stats
    const now = useMemo(() => new Date(), []);
    const totalEvents = mentorEvents.length;
    const pendingReviews = pendingWebsites.length + showcaseSlots.length;
    const upcomingEvents = mentorEvents.filter((e) => new Date(e.date) > now).length;

    // ── Action handlers (identical flow, restyled callers) ─────────────────

    const handleSubmissionAction = useCallback(
        async (submissionId: string, action: 'approved' | 'rejected') => {
            setPendingSubmissionIds((prev) => {
                if (prev.has(submissionId)) return prev;
                const next = new Set(prev);
                next.add(submissionId);
                return next;
            });
            try {
                const { error } = await supabase
                    .from('event_website')
                    .update({
                        status: action,
                        reviewed_by: user?.id,
                        reviewed_at: new Date().toISOString(),
                    })
                    .eq('id', submissionId);
                if (error) throw error;
                toast.success(`Submission ${action}.`);
                setRemovingIds((prev) => new Set(prev).add(submissionId));
                await new Promise(r => setTimeout(r, 250));
                setRemovingIds((prev) => { const n = new Set(prev); n.delete(submissionId); return n; });
                await refetchSubmissions();
            } catch (error) {
                console.error('Error updating submission:', error);
                toast.error(
                    error instanceof Error
                        ? `Could not ${action === 'approved' ? 'approve' : 'reject'} submission: ${error.message}`
                        : `Could not ${action === 'approved' ? 'approve' : 'reject'} submission.`,
                );
            } finally {
                setPendingSubmissionIds((prev) => {
                    if (!prev.has(submissionId)) return prev;
                    const next = new Set(prev);
                    next.delete(submissionId);
                    return next;
                });
            }
        },
        [user?.id, refetchSubmissions],
    );

    const handleSlotAction = useCallback(
        async (slotId: string, action: 'approved' | 'rejected') => {
            setPendingSlotIds((prev) => {
                if (prev.has(slotId)) return prev;
                const next = new Set(prev);
                next.add(slotId);
                return next;
            });
            try {
                const { error } = await supabase
                    .from('showcase_slot')
                    .update({ status: action })
                    .eq('id', slotId);
                if (error) throw error;
                toast.success(`Showcase slot ${action}.`);
                setRemovingIds((prev) => new Set(prev).add(slotId));
                setTimeout(() => {
                    setShowcaseSlots((prev) => prev.filter((s) => s.id !== slotId));
                    setRemovingIds((prev) => { const n = new Set(prev); n.delete(slotId); return n; });
                }, 250);
            } catch (error) {
                console.error('Error updating showcase slot:', error);
                toast.error(
                    error instanceof Error
                        ? `Could not update slot: ${error.message}`
                        : 'Could not update showcase slot.',
                );
            } finally {
                setPendingSlotIds((prev) => {
                    if (!prev.has(slotId)) return prev;
                    const next = new Set(prev);
                    next.delete(slotId);
                    return next;
                });
            }
        },
        [],
    );

    // ── Access control ─────────────────────────────────────────────────────
    if (!isAuthorized) {
        return (
            <div className="min-h-screen bg-brutal-bg pt-24 md:pt-32 px-5 sm:px-6 md:px-8">
                <div className="max-w-4xl mx-auto rounded-2xl border-2 border-brutal-red/30 bg-brutal-red/[0.04] p-8">
                    <div className="flex items-center gap-3 mb-2">
                        <AlertCircle className="w-6 h-6 text-brutal-red" />
                        <h1 className="font-heading font-bold text-brutal-dark text-2xl uppercase tracking-tight-heading">
                            Access Denied
                        </h1>
                    </div>
                    <p className="font-data text-sm text-brutal-dark/70 ml-9">
                        Only mentors and admins can access the mentor dashboard.
                    </p>
                </div>
            </div>
        );
    }

    const tabs: { k: MentorTab; label: string; count: number; Icon: React.ComponentType<{ className?: string }> }[] = [
        { k: 'events', label: 'Your Events', count: totalEvents, Icon: Calendar },
        { k: 'websites', label: 'Website Reviews', count: pendingWebsites.length, Icon: Globe },
        { k: 'showcase', label: 'Showcase Slots', count: showcaseSlots.length, Icon: Megaphone },
    ];

    return (
        <div className="min-h-screen bg-brutal-bg pt-24 md:pt-28 pb-16 px-4 sm:px-6 md:px-8">
            <div className="max-w-6xl mx-auto">

                {/* ── Hero ──────────────────────────────────────────────── */}
                <header className="mb-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border-2 border-yellow-500/40 flex items-center justify-center">
                            <Shield className="w-5 h-5 text-yellow-700" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="bg-yellow-500 text-brutal-dark px-2 py-0.5 text-[9px] font-bold font-data rounded uppercase tracking-widest">
                                    Mentor-only
                                </span>
                                <span className="font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/40">
                                    Cockpit
                                </span>
                            </div>
                            <h1 className="font-heading font-bold text-brutal-dark text-2xl md:text-3xl uppercase tracking-tight-heading leading-none mt-1">
                                Mentor Dashboard
                            </h1>
                        </div>
                    </div>
                    <p className="font-data text-xs md:text-sm text-brutal-dark/55 max-w-2xl">
                        Manage your events, review submissions, and track registrations in one place.
                    </p>
                    {hasDomainFilter && (
                        <div className="mt-2 flex items-center gap-2 flex-wrap">
                            <span className="font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/40">
                                Showing items in your domains:
                            </span>
                            {approvalDomains.map((d) => (
                                <span
                                    key={d}
                                    className="font-data text-[10px] font-bold uppercase tracking-widest bg-yellow-500/10 text-yellow-800 border border-yellow-500/30 rounded-full px-2.5 py-0.5"
                                >
                                    {d}
                                </span>
                            ))}
                        </div>
                    )}
                    {isAdmin && (
                        <div className="mt-2">
                            <span className="font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/40">
                                Admin: viewing all domains
                            </span>
                        </div>
                    )}
                </header>

                {/* ── Sticky header: stats + tabs ───────────────────────── */}
                <div className="sticky top-20 md:top-24 z-20 -mx-4 sm:-mx-6 md:-mx-8 px-4 sm:px-6 md:px-8 bg-brutal-bg/90 backdrop-blur-md pt-2 pb-3 mb-6 border-b border-brutal-dark/8">

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-3 md:gap-4 mb-4">
                        <StatCard
                            label="Total Events"
                            value={totalEvents}
                            Icon={Calendar}
                            tone="muted"
                        />
                        <StatCard
                            label="Pending Reviews"
                            value={pendingReviews}
                            Icon={FileText}
                            tone={pendingReviews > 0 ? 'yellow' : 'muted'}
                        />
                        <StatCard
                            label="Upcoming Events"
                            value={upcomingEvents}
                            Icon={Sparkles}
                            tone="muted"
                        />
                    </div>

                    {/* Tab strip */}
                    <div
                        role="tablist"
                        aria-label="Mentor dashboard sections"
                        className="flex gap-1 overflow-x-auto rounded-xl border-2 border-brutal-dark bg-brutal-bg p-1"
                    >
                        {tabs.map((t) => {
                            const active = activeTab === t.k;
                            return (
                                <button
                                    key={t.k}
                                    type="button"
                                    role="tab"
                                    aria-selected={active}
                                    onClick={() => setActiveTab(t.k)}
                                    className={cn(
                                        'flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg font-data text-[11px] font-bold uppercase tracking-widest transition-all whitespace-nowrap',
                                        active
                                            ? 'bg-brutal-dark text-brutal-bg shadow-[3px_3px_0_0_rgba(234,179,8,0.35)]'
                                            : 'text-brutal-dark/55 hover:text-brutal-dark hover:bg-brutal-dark/5',
                                    )}
                                >
                                    <t.Icon className="w-3.5 h-3.5" />
                                    <span>{t.label}</span>
                                    {t.count > 0 && (
                                        <span
                                            className={cn(
                                                'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full text-[9px] font-bold tabular-nums',
                                                active
                                                    ? 'bg-yellow-400 text-brutal-dark'
                                                    : 'bg-brutal-dark/10 text-brutal-dark/60',
                                            )}
                                        >
                                            {t.count}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* ── Tab bodies ────────────────────────────────────────── */}
                <div role="tabpanel" aria-label={tabs.find((t) => t.k === activeTab)?.label}>
                <div key={activeTab} style={{ animation: 'mentorFadeIn 200ms ease-out' }}>

                    {/* ── EVENTS ── */}
                    {activeTab === 'events' && (
                        <section className="space-y-4">
                            {eventsLoading ? (
                                <EmptyState icon={<Loader2 className="w-5 h-5 animate-spin" />} text="Loading events…" />
                            ) : mentorEvents.length === 0 ? (
                                <EmptyState
                                    icon={<Calendar className="w-5 h-5" />}
                                    text="No events found. Create your first event to get started."
                                    cta={{ to: '/admin/events', label: 'Create Event' }}
                                />
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {mentorEvents.map((event) => {
                                        const eventDate = new Date(event.date);
                                        const isPast = eventDate < now;
                                        const registrations = (event as { registration_count?: number }).registration_count || 0;
                                        const capacity = event.capacity || 0;
                                        const pct = capacity > 0 ? Math.min(100, Math.round((registrations / capacity) * 100)) : 0;

                                        return (
                                            <article
                                                key={event.id}
                                                className="rounded-2xl border-2 border-brutal-dark bg-brutal-bg p-5 flex flex-col gap-3 hover:border-brutal-dark/25 transition-colors"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0 flex-1">
                                                        <h3 className="font-heading font-bold text-brutal-dark text-lg leading-tight truncate">
                                                            {event.title}
                                                        </h3>
                                                        <p className="font-data text-[11px] text-brutal-dark/55 mt-0.5">
                                                            {eventDate.toLocaleDateString('en-US', {
                                                                weekday: 'short',
                                                                month: 'short',
                                                                day: 'numeric',
                                                                year: 'numeric',
                                                            })}
                                                        </p>
                                                    </div>
                                                    <span
                                                        className={cn(
                                                            'font-data text-[9px] font-bold uppercase tracking-widest rounded-full px-2 py-0.5 flex-shrink-0',
                                                            isPast
                                                                ? 'bg-brutal-dark/5 text-brutal-dark/45 border border-brutal-dark/10'
                                                                : 'bg-brutal-red/10 text-brutal-red border border-brutal-red/25',
                                                        )}
                                                    >
                                                        {isPast ? 'Past' : 'Upcoming'}
                                                    </span>
                                                </div>

                                                <div className="flex flex-wrap gap-1.5">
                                                    <span className="font-data text-[9px] font-bold uppercase tracking-widest bg-brutal-dark text-brutal-bg rounded-full px-2 py-0.5">
                                                        {formatEventType(event.event_type)}
                                                    </span>
                                                    {event.location && (
                                                        <span className="font-data text-[9px] font-bold uppercase tracking-widest bg-brutal-dark/5 text-brutal-dark/55 border border-brutal-dark/10 rounded-full px-2 py-0.5 truncate max-w-[180px]">
                                                            {event.location}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Capacity bar */}
                                                <div>
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-dark/40 flex items-center gap-1">
                                                            <Users className="w-2.5 h-2.5" /> Capacity
                                                        </span>
                                                        <span className="font-data text-[10px] font-bold tabular-nums text-brutal-dark/70">
                                                            {registrations}/{capacity || '∞'}
                                                        </span>
                                                    </div>
                                                    <div className="h-1.5 bg-brutal-dark/8 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-yellow-500 transition-all duration-700"
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                    </div>
                                                </div>

                                                <Link
                                                    to={`/events/${event.id}`}
                                                    className="mt-1 inline-flex items-center justify-center rounded-full border-2 border-brutal-dark/15 bg-brutal-bg px-4 py-2 font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/70 hover:border-brutal-dark hover:bg-brutal-dark hover:text-brutal-bg transition-all"
                                                >
                                                    Manage Event →
                                                </Link>
                                            </article>
                                        );
                                    })}
                                </div>
                            )}
                        </section>
                    )}

                    {/* ── WEBSITE REVIEWS ── */}
                    {activeTab === 'websites' && (
                        <section className="space-y-4">
                            {pendingWebsites.length === 0 ? (
                                <EmptyState
                                    icon={<Globe className="w-5 h-5" />}
                                    text="No pending website submissions to review. You're all caught up."
                                />
                            ) : (
                                <div className="grid grid-cols-1 gap-4">
                                    {pendingWebsites.map((submission) => {
                                        const isPending = pendingSubmissionIds.has(submission.id);
                                        return (
                                            <article
                                                key={submission.id}
                                                className={cn(
                                                    "rounded-2xl border-2 border-yellow-500/40 bg-yellow-500/[0.04] p-5 shadow-[6px_6px_0_0_rgba(196,41,30,0.18)] transition-all duration-250",
                                                    removingIds.has(submission.id) && "opacity-0 translate-x-2.5"
                                                )}
                                            >
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                                    <div className="md:col-span-1">
                                                        <h3 className="font-heading font-bold text-brutal-dark text-base leading-tight mb-2">
                                                            {submission.title}
                                                        </h3>
                                                        <p className="font-data text-xs text-brutal-dark/70">
                                                            By <strong className="text-brutal-dark">{submission.userName}</strong>
                                                        </p>
                                                        <p className="font-data text-[10px] text-brutal-dark/40 uppercase tracking-widest mt-1">
                                                            {new Date(submission.created_at).toLocaleDateString('en-US', {
                                                                month: 'short',
                                                                day: 'numeric',
                                                                year: 'numeric',
                                                            })}
                                                        </p>

                                                        <div className="flex flex-wrap gap-2 mt-4">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleSubmissionAction(submission.id, 'approved')}
                                                                disabled={isPending}
                                                                aria-busy={isPending || undefined}
                                                                className="inline-flex items-center gap-1.5 rounded-full bg-brutal-dark text-brutal-bg hover:bg-brutal-red transition-colors px-3.5 py-2 font-data text-[10px] font-bold uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                                                            >
                                                                {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                                                                {isPending ? 'Working…' : 'Approve'}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleSubmissionAction(submission.id, 'rejected')}
                                                                disabled={isPending}
                                                                aria-busy={isPending || undefined}
                                                                className="inline-flex items-center gap-1.5 rounded-full border-2 border-brutal-dark/15 bg-brutal-bg text-brutal-dark/70 hover:border-brutal-red hover:text-brutal-red transition-colors px-3.5 py-2 font-data text-[10px] font-bold uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                                                            >
                                                                <XCircle className="w-3 h-3" />
                                                                Reject
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {submission.html_content && (
                                                        <div className="md:col-span-2">
                                                            <span className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-dark/40 block mb-1.5">
                                                                Preview
                                                            </span>
                                                            <div className="rounded-xl border-2 border-brutal-dark bg-brutal-bg overflow-hidden">
                                                                <iframe
                                                                    srcDoc={submission.html_content}
                                                                    className="w-full h-48"
                                                                    title={`Preview: ${submission.title}`}
                                                                    sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </article>
                                        );
                                    })}
                                </div>
                            )}
                        </section>
                    )}

                    {/* ── SHOWCASE SLOTS ── */}
                    {activeTab === 'showcase' && (
                        <section className="space-y-4">
                            {slotsLoading ? (
                                <EmptyState icon={<Loader2 className="w-5 h-5 animate-spin" />} text="Loading showcase requests…" />
                            ) : showcaseSlots.length === 0 ? (
                                <EmptyState
                                    icon={<Megaphone className="w-5 h-5" />}
                                    text="No pending showcase slot requests. You're all caught up."
                                />
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {showcaseSlots.map((slot) => {
                                        const isPending = pendingSlotIds.has(slot.id);
                                        return (
                                            <article
                                                key={slot.id}
                                                className={cn(
                                                    "rounded-2xl border-2 border-yellow-500/40 bg-yellow-500/[0.04] p-5 shadow-[6px_6px_0_0_rgba(196,41,30,0.18)] transition-all duration-250",
                                                    removingIds.has(slot.id) && "opacity-0 translate-x-2.5"
                                                )}
                                            >
                                                <h3 className="font-heading font-bold text-brutal-dark text-base leading-tight mb-3">
                                                    {slot.project?.title || 'Untitled Project'}
                                                </h3>

                                                <dl className="space-y-1.5 mb-4">
                                                    <MetaRow label="By" value={slot.app_user?.name || '—'} />
                                                    <MetaRow label="Event" value={slot.event?.title || '—'} />
                                                    <MetaRow label="Topic" value={slot.topic || '—'} />
                                                </dl>

                                                <div className="flex flex-wrap gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSlotAction(slot.id, 'approved')}
                                                        disabled={isPending}
                                                        aria-busy={isPending || undefined}
                                                        className="inline-flex items-center gap-1.5 rounded-full bg-brutal-dark text-brutal-bg hover:bg-brutal-red transition-colors px-3.5 py-2 font-data text-[10px] font-bold uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                                                        {isPending ? 'Working…' : 'Approve'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSlotAction(slot.id, 'rejected')}
                                                        disabled={isPending}
                                                        aria-busy={isPending || undefined}
                                                        className="inline-flex items-center gap-1.5 rounded-full border-2 border-brutal-dark/15 bg-brutal-bg text-brutal-dark/70 hover:border-brutal-red hover:text-brutal-red transition-colors px-3.5 py-2 font-data text-[10px] font-bold uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        <XCircle className="w-3 h-3" />
                                                        Reject
                                                    </button>
                                                </div>
                                            </article>
                                        );
                                    })}
                                </div>
                            )}
                        </section>
                    )}
                </div>
                </div>
            </div>
            <style>{`@keyframes mentorFadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        </div>
    );
}

// ─── Subcomponents ────────────────────────────────────────────────────────

function StatCard({
    label,
    value,
    Icon,
    tone,
}: {
    label: string;
    value: number;
    Icon: React.ComponentType<{ className?: string }>;
    tone: 'yellow' | 'muted';
}) {
    return (
        <div
            className={cn(
                'rounded-xl border-2 p-3 md:p-4 flex items-center gap-3',
                tone === 'yellow'
                    ? 'border-yellow-500/40 bg-yellow-500/10 shadow-[6px_6px_0_0_rgba(196,41,30,0.18)]'
                    : 'border-brutal-dark/10 bg-brutal-bg',
            )}
        >
            <div
                className={cn(
                    'w-8 h-8 md:w-9 md:h-9 rounded-lg flex items-center justify-center flex-shrink-0',
                    tone === 'yellow' ? 'bg-yellow-500/10 text-yellow-700' : 'bg-brutal-dark/5 text-brutal-dark/50',
                )}
            >
                <Icon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
                <div className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-dark/45 truncate">
                    {label}
                </div>
                <div className="font-heading font-bold text-brutal-dark text-xl md:text-2xl leading-none tabular-nums">
                    {value}
                </div>
            </div>
        </div>
    );
}

function MetaRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-baseline gap-2">
            <dt className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-dark/40 w-12 flex-shrink-0">
                {label}
            </dt>
            <dd className="font-data text-xs text-brutal-dark/75 truncate">{value}</dd>
        </div>
    );
}

function EmptyState({
    icon,
    text,
    cta,
}: {
    icon: React.ReactNode;
    text: string;
    cta?: { to: string; label: string };
}) {
    return (
        <div className="rounded-2xl border-2 border-dashed border-brutal-dark/15 bg-brutal-bg p-10 text-center">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-brutal-dark/5 text-brutal-dark/40 mb-3">
                {icon}
            </div>
            <p className="font-data text-sm text-brutal-dark/60 max-w-md mx-auto">{text}</p>
            {cta && (
                <Link
                    to={cta.to}
                    className="inline-flex items-center justify-center mt-4 rounded-full bg-brutal-dark text-brutal-bg hover:bg-brutal-red transition-colors px-4 py-2 font-data text-[10px] font-bold uppercase tracking-widest"
                >
                    {cta.label}
                </Link>
            )}
        </div>
    );
}
