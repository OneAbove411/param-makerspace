import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    CheckCircle2,
    XCircle,
    RefreshCw,
    Clock,
    User as UserIcon,
    AlertCircle,
    Send,
    Undo2,
    MessageSquare,
    Trash2,
} from 'lucide-react';
import type {
    Event,
    EventApplication,
    EventInterviewSlot,
    EventSelectionNote,
} from '../../../lib/database.types';
import { useAuth } from '../../../lib/auth';
import {
    fetchApplicationsForEvent,
    fetchUsersByIds,
    bulkSetApplicationStatus,
} from '../../../lib/api/buildChallenge';
import {
    fetchSlotsForEvent,
    markSlotOutcome,
    fetchNotesForApplications,
    upsertSelectionNote,
    deleteSelectionNote,
    publishSelection,
    unpublishSelection,
} from '../../../lib/api/makerMeetup';

/**
 * MakerMeetupSelectionTab — admin review after interviews happen.
 *
 * Workflow surfaced here:
 *   1. Mark each booked slot Done / No-show after the interview (so this
 *      tab has a working set to act on — completed interviews).
 *   2. For each completed interview, flip the attached application to
 *      Select / Decline, with an optional private note
 *      (event_selection_note) explaining the decision.
 *   3. Publish selection — flips event.selection_published_at so
 *      selected applicants see the "You're in" joining card.
 *
 * Notes are keyed by (application_id, author_id) — one per reviewer.
 * We intentionally scope the table by selection events (done / no_show)
 * rather than booked-but-not-yet-interviewed so the admin is nudged to
 * first mark the outcome.
 */

interface Props {
    event: Event;
    /** Called when selection_published_at flips, so the console can re-read the event row. */
    onEventChanged?: () => void;
}

interface UserLite {
    id: string;
    name: string | null;
    email: string | null;
}

export function MakerMeetupSelectionTab({ event, onEventChanged }: Props) {
    const { user } = useAuth();

    const [apps, setApps] = useState<EventApplication[]>([]);
    const [slots, setSlots] = useState<EventInterviewSlot[]>([]);
    const [users, setUsers] = useState<Map<string, UserLite>>(new Map());
    const [notes, setNotes] = useState<Map<string, EventSelectionNote[]>>(new Map());
    const [draftNotes, setDraftNotes] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [publishing, setPublishing] = useState(false);

    const load = useCallback(async () => {
        setError(null);
        setLoading(true);
        const [appsRes, slotsRes] = await Promise.all([
            fetchApplicationsForEvent(event.id),
            fetchSlotsForEvent(event.id),
        ]);
        if (appsRes.error) {
            setError(appsRes.error.message);
            setLoading(false);
            return;
        }
        const a = (appsRes.data as EventApplication[]) ?? [];
        const s = (slotsRes.data as EventInterviewSlot[]) ?? [];
        setApps(a);
        setSlots(s);

        const userIds = new Set<string>();
        for (const row of a) userIds.add(row.user_id);
        for (const row of s) userIds.add(row.mentor_user_id);
        if (userIds.size > 0) {
            const { data } = await fetchUsersByIds(Array.from(userIds));
            const map = new Map<string, UserLite>();
            for (const u of (data as UserLite[]) ?? []) map.set(u.id, u);
            setUsers(map);
        }

        const appIds = a.map((x) => x.id);
        if (appIds.length > 0) {
            const { data: notesData } = await fetchNotesForApplications(appIds);
            const byApp = new Map<string, EventSelectionNote[]>();
            for (const n of (notesData as EventSelectionNote[]) ?? []) {
                const list = byApp.get(n.application_id) ?? [];
                list.push(n);
                byApp.set(n.application_id, list);
            }
            setNotes(byApp);
        } else {
            setNotes(new Map());
        }

        setLoading(false);
    }, [event.id]);

    useEffect(() => {
        void load();
    }, [load]);

    // ─── Outcome actions ───────────────────────────────────
    const setOutcome = useCallback(
        async (slotId: string, outcome: 'done' | 'no_show') => {
            setBusy(true);
            try {
                const { error: err } = await markSlotOutcome(slotId, outcome);
                if (err) {
                    window.alert(`Update failed: ${err.message}`);
                    return;
                }
                await load();
            } finally {
                setBusy(false);
            }
        },
        [load],
    );

    // ─── Select / Decline ──────────────────────────────────
    const setDecision = useCallback(
        async (applicationId: string, status: 'selected' | 'rejected') => {
            setBusy(true);
            try {
                const { error: err } = await bulkSetApplicationStatus([applicationId], status);
                if (err) {
                    window.alert(`Update failed: ${err.message}`);
                    return;
                }
                await load();
            } finally {
                setBusy(false);
            }
        },
        [load],
    );

    // ─── Notes ─────────────────────────────────────────────
    const saveNote = useCallback(
        async (applicationId: string) => {
            if (!user) return;
            const body = (draftNotes[applicationId] ?? '').trim();
            if (!body) {
                window.alert('Note body is empty.');
                return;
            }
            setBusy(true);
            try {
                const { error: err } = await upsertSelectionNote({
                    application_id: applicationId,
                    author_id: user.id,
                    body,
                });
                if (err) {
                    window.alert(`Save failed: ${err.message}`);
                    return;
                }
                setDraftNotes((d) => ({ ...d, [applicationId]: '' }));
                await load();
            } finally {
                setBusy(false);
            }
        },
        [draftNotes, load, user],
    );

    const removeNote = useCallback(
        async (applicationId: string, authorId: string) => {
            const ok = window.confirm('Delete this note?');
            if (!ok) return;
            setBusy(true);
            try {
                const { error: err } = await deleteSelectionNote(applicationId, authorId);
                if (err) {
                    window.alert(`Delete failed: ${err.message}`);
                    return;
                }
                await load();
            } finally {
                setBusy(false);
            }
        },
        [load],
    );

    // ─── Publish ───────────────────────────────────────────
    const handlePublish = useCallback(async () => {
        const ok = window.confirm(
            'Publish selection? Selected applicants will see the joining card and their status will be visible.',
        );
        if (!ok) return;
        setPublishing(true);
        try {
            const { error: err } = await publishSelection(event.id);
            if (err) {
                window.alert(`Publish failed: ${err.message}`);
                return;
            }
            onEventChanged?.();
        } finally {
            setPublishing(false);
        }
    }, [event.id, onEventChanged]);

    const handleUnpublish = useCallback(async () => {
        const ok = window.confirm('Un-publish selection? Applicants will stop seeing their status.');
        if (!ok) return;
        setPublishing(true);
        try {
            const { error: err } = await unpublishSelection(event.id);
            if (err) {
                window.alert(`Un-publish failed: ${err.message}`);
                return;
            }
            onEventChanged?.();
        } finally {
            setPublishing(false);
        }
    }, [event.id, onEventChanged]);

    // ─── Derived ──────────────────────────────────────────
    const appById = useMemo(() => new Map(apps.map((a) => [a.id, a])), [apps]);

    // Interviews we want to act on: booked, done, no_show. We show all three
    // so the admin can walk the list in one place.
    const actionableSlots = useMemo(
        () =>
            slots
                .filter((s) => s.status === 'booked' || s.status === 'done' || s.status === 'no_show')
                .sort((a, b) => Date.parse(a.start_at) - Date.parse(b.start_at)),
        [slots],
    );

    const selectedCount = apps.filter((a) => a.status === 'selected').length;
    const published = !!event.selection_published_at;

    // ─── Render ────────────────────────────────────────────
    if (error) {
        return (
            <div className="p-6 border-2 border-brutal-red/40 bg-brutal-red/5 font-data text-sm">
                Failed to load: {error}
            </div>
        );
    }
    if (loading) {
        return <div className="p-12 text-center font-data text-brutal-dark/50">Loading…</div>;
    }

    return (
        <div className="space-y-6">
            {/* Publish bar */}
            <div
                className={
                    'flex flex-col sm:flex-row sm:items-center gap-3 justify-between p-4 border-2 ' +
                    (published
                        ? 'border-green-500 bg-green-50'
                        : 'border-brutal-dark bg-brutal-bg')
                }
            >
                <div className="font-data text-sm">
                    {published ? (
                        <>
                            <span className="font-heading font-bold uppercase text-green-900">
                                Selection published
                            </span>
                            <div className="text-xs text-green-900/70 mt-0.5">
                                Selected on {new Date(event.selection_published_at!).toLocaleString()} ·{' '}
                                {selectedCount} selected
                            </div>
                        </>
                    ) : (
                        <>
                            <span className="font-heading font-bold uppercase">Draft</span>
                            <div className="text-xs text-brutal-dark/60 mt-0.5">
                                {selectedCount} marked as selected — click publish when ready.
                            </div>
                        </>
                    )}
                </div>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => void load()}
                        disabled={busy}
                        className="inline-flex items-center gap-2 px-3 py-2 border-2 border-brutal-dark/30 hover:border-brutal-dark font-data text-sm transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                    {published ? (
                        <button
                            type="button"
                            onClick={() => void handleUnpublish()}
                            disabled={publishing}
                            className="inline-flex items-center gap-2 px-3 py-2 border-2 border-brutal-red/40 text-brutal-red hover:bg-brutal-red hover:text-white font-data text-sm font-bold transition-colors disabled:opacity-50"
                        >
                            <Undo2 className="w-4 h-4" /> {publishing ? 'Un-publishing…' : 'Un-publish'}
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => void handlePublish()}
                            disabled={publishing || selectedCount === 0}
                            className="inline-flex items-center gap-2 px-3 py-2 border-2 border-brutal-dark bg-brutal-dark text-white hover:bg-brutal-dark/90 font-data text-sm font-bold transition-colors disabled:opacity-40"
                        >
                            <Send className="w-4 h-4" /> {publishing ? 'Publishing…' : 'Publish selection'}
                        </button>
                    )}
                </div>
            </div>

            {/* Interviews list */}
            {actionableSlots.length === 0 ? (
                <div className="p-12 text-center border-2 border-dashed border-brutal-dark/20 font-data text-brutal-dark/50">
                    <p>No booked or completed interviews yet.</p>
                    <p className="text-xs mt-1">Generate slots in the Shortlist tab and wait for applicants to book.</p>
                </div>
            ) : (
                <ul className="space-y-4">
                    {actionableSlots.map((slot) => {
                        const app = slot.application_id ? appById.get(slot.application_id) : null;
                        const mentor = users.get(slot.mentor_user_id);
                        const applicant = app ? users.get(app.user_id) : null;
                        const appNotes = app ? notes.get(app.id) ?? [] : [];
                        const draft = app ? draftNotes[app.id] ?? '' : '';

                        return (
                            <li
                                key={slot.id}
                                className="border-2 border-brutal-dark bg-white p-4 space-y-3"
                            >
                                {/* Header */}
                                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                                    <div>
                                        <div className="font-heading font-bold uppercase flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-brutal-red" />
                                            {new Date(slot.start_at).toLocaleString()}
                                        </div>
                                        <div className="font-data text-xs text-brutal-dark/60 flex items-center gap-1 mt-0.5">
                                            <UserIcon className="w-3 h-3" />
                                            Mentor: {mentor?.name || mentor?.email || 'Mentor'}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <InterviewOutcomeBadge status={slot.status} />
                                        {slot.status === 'booked' && (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() => void setOutcome(slot.id, 'done')}
                                                    disabled={busy}
                                                    className="inline-flex items-center gap-1 px-2 py-1 border-2 border-brutal-dark bg-brutal-dark text-white hover:bg-brutal-dark/90 font-data text-xs font-bold transition-colors disabled:opacity-40"
                                                >
                                                    Mark done
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => void setOutcome(slot.id, 'no_show')}
                                                    disabled={busy}
                                                    className="inline-flex items-center gap-1 px-2 py-1 border-2 border-brutal-red/40 text-brutal-red hover:bg-brutal-red hover:text-white font-data text-xs font-bold transition-colors disabled:opacity-40"
                                                >
                                                    No-show
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Applicant summary */}
                                {app ? (
                                    <div className="border-t-2 border-brutal-dark/10 pt-3 space-y-2">
                                        <div>
                                            <div className="font-bold font-data text-sm">{app.team_name}</div>
                                            <div className="font-data text-xs text-brutal-dark/50">
                                                {applicant?.name ? `${applicant.name} · ` : ''}
                                                {applicant?.email || '—'}
                                            </div>
                                        </div>
                                        <p className="font-data text-sm text-brutal-dark/80 whitespace-pre-wrap">
                                            {app.pitch}
                                        </p>

                                        {/* Select / Decline */}
                                        {slot.status === 'done' && (
                                            <div className="flex flex-wrap items-center gap-2 pt-1">
                                                <span className="font-data text-xs text-brutal-dark/60">Decision:</span>
                                                <DecisionBadge status={app.status} />
                                                <button
                                                    type="button"
                                                    onClick={() => void setDecision(app.id, 'selected')}
                                                    disabled={busy || app.status === 'selected'}
                                                    className="inline-flex items-center gap-1 px-2 py-1 border-2 border-brutal-dark bg-brutal-dark text-white hover:bg-brutal-dark/90 font-data text-xs font-bold transition-colors disabled:opacity-40"
                                                >
                                                    <CheckCircle2 className="w-3 h-3" /> Select
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => void setDecision(app.id, 'rejected')}
                                                    disabled={busy || app.status === 'rejected'}
                                                    className="inline-flex items-center gap-1 px-2 py-1 border-2 border-brutal-red/40 text-brutal-red hover:bg-brutal-red hover:text-white font-data text-xs font-bold transition-colors disabled:opacity-40"
                                                >
                                                    <XCircle className="w-3 h-3" /> Decline
                                                </button>
                                            </div>
                                        )}
                                        {slot.status === 'no_show' && (
                                            <div className="flex items-start gap-2 p-2 border-2 border-brutal-red/30 bg-brutal-red/5 font-data text-xs text-brutal-red">
                                                <AlertCircle className="w-4 h-4 mt-0.5" />
                                                Marked as no-show. Decline the application to close the loop.
                                                <button
                                                    type="button"
                                                    onClick={() => void setDecision(app.id, 'rejected')}
                                                    disabled={busy || app.status === 'rejected'}
                                                    className="ml-auto inline-flex items-center gap-1 px-2 py-1 border-2 border-brutal-red/40 text-brutal-red hover:bg-brutal-red hover:text-white font-data text-xs font-bold transition-colors disabled:opacity-40"
                                                >
                                                    Decline
                                                </button>
                                            </div>
                                        )}

                                        {/* Notes */}
                                        <div className="border-t-2 border-brutal-dark/10 pt-3 space-y-2">
                                            <div className="font-data text-[11px] uppercase tracking-wide text-brutal-dark/50 font-bold flex items-center gap-1">
                                                <MessageSquare className="w-3 h-3" /> Private notes
                                            </div>
                                            {appNotes.length > 0 ? (
                                                <ul className="space-y-2">
                                                    {appNotes.map((n) => {
                                                        const author = users.get(n.author_id);
                                                        const mine = user?.id === n.author_id;
                                                        return (
                                                            <li
                                                                key={n.id}
                                                                className="p-2 border-2 border-brutal-dark/15 bg-brutal-bg font-data text-xs"
                                                            >
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <span className="text-brutal-dark/60">
                                                                        {author?.name || author?.email || 'Reviewer'}
                                                                        {' · '}
                                                                        {new Date(n.created_at).toLocaleString()}
                                                                    </span>
                                                                    {mine && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => void removeNote(app.id, n.author_id)}
                                                                            disabled={busy}
                                                                            className="text-brutal-red hover:underline"
                                                                            aria-label="Delete note"
                                                                        >
                                                                            <Trash2 className="w-3 h-3" />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                                <p className="mt-1 whitespace-pre-wrap text-brutal-dark">{n.body}</p>
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            ) : (
                                                <p className="font-data text-xs text-brutal-dark/40 italic">
                                                    No notes yet.
                                                </p>
                                            )}
                                            <div className="flex gap-2">
                                                <textarea
                                                    value={draft}
                                                    onChange={(e) =>
                                                        setDraftNotes((d) => ({ ...d, [app.id]: e.target.value }))
                                                    }
                                                    placeholder="Write a quick private note (your decision reasoning)…"
                                                    rows={2}
                                                    className="flex-1 border-2 border-brutal-dark bg-white px-2 py-1.5 font-data text-xs focus:outline-none focus:border-brutal-red"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => void saveNote(app.id)}
                                                    disabled={busy || !draft.trim()}
                                                    className="inline-flex items-center gap-1 px-3 py-1 border-2 border-brutal-dark bg-brutal-dark text-white hover:bg-brutal-dark/90 font-data text-xs font-bold transition-colors disabled:opacity-40 self-start"
                                                >
                                                    <Send className="w-3 h-3" /> Save
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="font-data text-xs text-brutal-dark/50 italic">
                                        Slot has no application attached.
                                    </div>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}

// ─── Small badges ─────────────────────────────────────────

function InterviewOutcomeBadge({ status }: { status: EventInterviewSlot['status'] }) {
    const style = (() => {
        switch (status) {
            case 'booked':
                return 'bg-blue-100 text-blue-800 border-blue-400';
            case 'done':
                return 'bg-green-100 text-green-800 border-green-400';
            case 'no_show':
                return 'bg-brutal-red/10 text-brutal-red border-brutal-red/40';
            case 'open':
                return 'bg-brutal-dark/5 text-brutal-dark/70 border-brutal-dark/30';
            default:
                return 'bg-brutal-dark/5 text-brutal-dark/70 border-brutal-dark/30';
        }
    })();
    return (
        <span className={'inline-block px-2 py-0.5 border text-xs font-bold font-data uppercase rounded ' + style}>
            {status}
        </span>
    );
}

function DecisionBadge({ status }: { status: EventApplication['status'] }) {
    const style = (() => {
        switch (status) {
            case 'selected':
                return 'bg-green-100 text-green-800 border-green-400';
            case 'rejected':
                return 'bg-brutal-red/10 text-brutal-red border-brutal-red/40';
            case 'shortlisted':
                return 'bg-blue-100 text-blue-800 border-blue-400';
            case 'pending':
                return 'bg-yellow-100 text-yellow-800 border-yellow-400';
            case 'withdrawn':
                return 'bg-brutal-dark/10 text-brutal-dark/60 border-brutal-dark/30';
            default:
                return 'bg-brutal-dark/10 text-brutal-dark/60 border-brutal-dark/30';
        }
    })();
    return (
        <span className={'inline-block px-2 py-0.5 border text-xs font-bold font-data uppercase rounded ' + style}>
            {status}
        </span>
    );
}
