import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    CheckCircle2,
    XCircle,
    RefreshCw,
    Search,
    AlertCircle,
    Calendar as CalendarIcon,
    Clock,
    User as UserIcon,
    Plus,
    Trash2,
    ExternalLink,
} from 'lucide-react';
import type {
    Event,
    EventApplication,
    EventApplicationStatus,
    EventInterviewSlot,
    PastWorkLink,
} from '../../../lib/database.types';
import {
    bulkSetApplicationStatus,
    fetchApplicationsForEvent,
    fetchUsersByIds,
} from '../../../lib/api/buildChallenge';
import {
    createSlotsBatch,
    deleteSlot,
    fetchMentorCandidates,
    fetchSlotsForEvent,
    releaseSlotForApplication,
} from '../../../lib/api/makerMeetup';

/**
 * MakerMeetupShortlistTab — admin review of Maker Meetup applications +
 * interview-slot generation.
 *
 * Sections:
 *   1. Applications table — one row per applicant with:
 *        display name · pitch (expandable) · past work links · status
 *        Row checkbox + bulk Shortlist / Reject actions.
 *      Rejecting an applicant with a booked slot: we call
 *      releaseSlotForApplication() so the slot goes back to 'open'.
 *   2. "Generate interview slots" tool — batch-creates N open slots at
 *      a starting datetime with a chosen mentor. Slot length defaults
 *      to event.interview_slot_length_min (falls back to 30m when
 *      unset on the event).
 *   3. Slot overview — running list of all slots for this event with
 *      per-row Delete so typos can be fixed.
 */

interface Props {
    event: Event;
}

interface UserLite {
    id: string;
    name: string | null;
    email: string | null;
    role?: string;
}

type StatusFilter = 'all' | EventApplicationStatus;

export function MakerMeetupShortlistTab({ event }: Props) {
    // ─── Applications state ────────────────────────────────
    const [apps, setApps] = useState<EventApplication[] | null>(null);
    const [users, setUsers] = useState<Map<string, UserLite>>(new Map());
    const [error, setError] = useState<string | null>(null);
    const [query, setQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [busy, setBusy] = useState(false);
    const [expanded, setExpanded] = useState<Set<string>>(new Set());

    // ─── Slots state ───────────────────────────────────────
    const [slots, setSlots] = useState<EventInterviewSlot[]>([]);
    const [mentors, setMentors] = useState<UserLite[]>([]);

    // Batch-tool form
    const defaultLen = event.interview_slot_length_min ?? 30;
    const [slotMentorId, setSlotMentorId] = useState<string>('');
    const [slotStartAt, setSlotStartAt] = useState<string>('');
    const [slotLen, setSlotLen] = useState<number>(defaultLen);
    const [slotCount, setSlotCount] = useState<number>(6);
    const [slotBusy, setSlotBusy] = useState(false);
    const [slotBanner, setSlotBanner] = useState<{ tone: 'ok' | 'error'; message: string } | null>(null);

    // ─── Loaders ───────────────────────────────────────────
    const loadApps = useCallback(async () => {
        setError(null);
        const { data, error: loadErr } = await fetchApplicationsForEvent(event.id);
        if (loadErr) {
            setError(loadErr.message);
            return;
        }
        const rows = (data as EventApplication[]) || [];
        setApps(rows);
        const ids = new Set<string>();
        for (const a of rows) ids.add(a.user_id);
        if (ids.size > 0) {
            const { data: uData } = await fetchUsersByIds(Array.from(ids));
            if (uData) {
                const map = new Map<string, UserLite>();
                for (const u of uData as UserLite[]) map.set(u.id, u);
                setUsers(map);
            }
        }
    }, [event.id]);

    const loadSlots = useCallback(async () => {
        const { data } = await fetchSlotsForEvent(event.id);
        setSlots((data as EventInterviewSlot[]) ?? []);
    }, [event.id]);

    const loadMentors = useCallback(async () => {
        const { data } = await fetchMentorCandidates();
        setMentors((data as UserLite[]) ?? []);
    }, []);

    useEffect(() => {
        void loadApps();
        void loadSlots();
        void loadMentors();
    }, [loadApps, loadSlots, loadMentors]);

    // ─── Filtering ─────────────────────────────────────────
    const filtered = useMemo(() => {
        if (!apps) return null;
        const q = query.trim().toLowerCase();
        return apps.filter((a) => {
            if (statusFilter !== 'all' && a.status !== statusFilter) return false;
            if (!q) return true;
            const captain = users.get(a.user_id);
            const haystack = [a.team_name, captain?.name ?? '', captain?.email ?? '', a.pitch]
                .join(' ')
                .toLowerCase();
            return haystack.includes(q);
        });
    }, [apps, users, query, statusFilter]);

    const allFilteredSelected =
        !!filtered && filtered.length > 0 && filtered.every((a) => selected.has(a.id));

    const toggleRow = (id: string) => {
        const next = new Set(selected);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelected(next);
    };
    const toggleAll = () => {
        if (!filtered) return;
        const next = new Set(selected);
        if (allFilteredSelected) filtered.forEach((a) => next.delete(a.id));
        else filtered.forEach((a) => next.add(a.id));
        setSelected(next);
    };
    const toggleExpanded = (id: string) => {
        const next = new Set(expanded);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setExpanded(next);
    };

    // ─── Bulk actions ──────────────────────────────────────
    const doBulk = useCallback(
        async (status: EventApplicationStatus) => {
            if (selected.size === 0) return;
            const ok = window.confirm(
                `Mark ${selected.size} application(s) as "${status}"?${
                    status === 'rejected' ? ' Any booked interview slots will be released.' : ''
                }`,
            );
            if (!ok) return;
            setBusy(true);
            try {
                const ids = Array.from(selected);
                const { error: bulkErr } = await bulkSetApplicationStatus(ids, status);
                if (bulkErr) {
                    window.alert(`Bulk update failed: ${bulkErr.message}`);
                    return;
                }
                // Rejecting → free any slot attached to these applications.
                if (status === 'rejected') {
                    await Promise.all(ids.map((id) => releaseSlotForApplication(id)));
                }
                setSelected(new Set());
                await Promise.all([loadApps(), loadSlots()]);
            } finally {
                setBusy(false);
            }
        },
        [loadApps, loadSlots, selected],
    );

    // ─── Slot batch create ─────────────────────────────────
    const handleGenerateSlots = useCallback(async () => {
        setSlotBanner(null);
        if (!slotMentorId) {
            setSlotBanner({ tone: 'error', message: 'Pick a mentor.' });
            return;
        }
        const parsed = Date.parse(slotStartAt);
        if (!Number.isFinite(parsed)) {
            setSlotBanner({ tone: 'error', message: 'Pick a valid start date & time.' });
            return;
        }
        if (!Number.isFinite(slotLen) || slotLen <= 0) {
            setSlotBanner({ tone: 'error', message: 'Slot length must be a positive number.' });
            return;
        }
        if (!Number.isFinite(slotCount) || slotCount <= 0 || slotCount > 50) {
            setSlotBanner({ tone: 'error', message: 'Count must be between 1 and 50.' });
            return;
        }
        setSlotBusy(true);
        try {
            const { error: err } = await createSlotsBatch({
                event_id: event.id,
                mentor_user_id: slotMentorId,
                first_start_at: new Date(parsed),
                slot_length_min: slotLen,
                count: slotCount,
            });
            if (err) {
                setSlotBanner({ tone: 'error', message: `Create failed: ${err.message}` });
                return;
            }
            setSlotBanner({ tone: 'ok', message: `Created ${slotCount} slot(s).` });
            await loadSlots();
        } finally {
            setSlotBusy(false);
        }
    }, [event.id, loadSlots, slotCount, slotLen, slotMentorId, slotStartAt]);

    const handleDeleteSlot = useCallback(
        async (slot: EventInterviewSlot) => {
            if (slot.status === 'booked') {
                const ok = window.confirm(
                    'This slot is booked. Deleting will orphan the applicant. Continue?',
                );
                if (!ok) return;
            } else {
                const ok = window.confirm('Delete this slot?');
                if (!ok) return;
            }
            const { error: err } = await deleteSlot(slot.id);
            if (err) {
                window.alert(`Delete failed: ${err.message}`);
                return;
            }
            await loadSlots();
        },
        [loadSlots],
    );

    // ─── Render ────────────────────────────────────────────
    if (error) {
        return (
            <div className="p-6 border-2 border-brutal-red/40 bg-brutal-red/5 font-data text-sm">
                Failed to load applications: {error}
            </div>
        );
    }
    if (apps === null) {
        return <div className="p-12 text-center font-data text-brutal-dark/50">Loading applications…</div>;
    }

    const counts = computeStatusCounts(apps);
    const slotSummary = summarizeSlots(slots);
    const mentorById = new Map(mentors.map((m) => [m.id, m]));
    const appById = new Map(apps.map((a) => [a.id, a]));

    return (
        <div className="space-y-8">
            {/* ── Applications ── */}
            <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                    <StatusChip label={`All (${apps.length})`} active={statusFilter === 'all'} onClick={() => setStatusFilter('all')} />
                    <StatusChip label={`Pending (${counts.pending})`} active={statusFilter === 'pending'} onClick={() => setStatusFilter('pending')} />
                    <StatusChip label={`Shortlisted (${counts.shortlisted})`} active={statusFilter === 'shortlisted'} onClick={() => setStatusFilter('shortlisted')} />
                    <StatusChip label={`Selected (${counts.selected})`} active={statusFilter === 'selected'} onClick={() => setStatusFilter('selected')} />
                    <StatusChip label={`Rejected (${counts.rejected})`} active={statusFilter === 'rejected'} onClick={() => setStatusFilter('rejected')} />
                    <StatusChip label={`Withdrawn (${counts.withdrawn})`} active={statusFilter === 'withdrawn'} onClick={() => setStatusFilter('withdrawn')} />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-brutal-dark/40" />
                        <input
                            type="text"
                            placeholder="Search by name, email, pitch…"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 border-2 border-brutal-dark bg-white font-data text-sm focus:outline-none focus:border-brutal-red"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="font-data text-sm text-brutal-dark/60">
                            {filtered?.length ?? 0} shown · {selected.size} selected
                        </span>
                        <button
                            type="button"
                            onClick={() => void loadApps()}
                            disabled={busy}
                            className="inline-flex items-center gap-2 px-3 py-2 border-2 border-brutal-dark/30 hover:border-brutal-dark font-data text-sm transition-colors disabled:opacity-50"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => void doBulk('shortlisted')}
                            disabled={selected.size === 0 || busy}
                            className="inline-flex items-center gap-2 px-3 py-2 border-2 border-brutal-dark bg-brutal-dark text-white hover:bg-brutal-dark/90 font-data text-sm font-bold transition-colors disabled:opacity-40"
                        >
                            <CheckCircle2 className="w-4 h-4" /> Shortlist ({selected.size})
                        </button>
                        <button
                            type="button"
                            onClick={() => void doBulk('rejected')}
                            disabled={selected.size === 0 || busy}
                            className="inline-flex items-center gap-2 px-3 py-2 border-2 border-brutal-red text-brutal-red hover:bg-brutal-red hover:text-white font-data text-sm font-bold transition-colors disabled:opacity-40"
                        >
                            <XCircle className="w-4 h-4" /> Reject ({selected.size})
                        </button>
                    </div>
                </div>

                {event.application_deadline && (
                    <div className="flex items-start gap-2 p-3 border-2 border-brutal-dark/20 bg-brutal-dark/5 font-data text-xs">
                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-brutal-dark/60" />
                        <span className="text-brutal-dark/70">
                            Application deadline: {new Date(event.application_deadline).toLocaleString()}.
                            Shortlisted applicants can book an interview slot; others stay read-only.
                        </span>
                    </div>
                )}

                {apps.length === 0 ? (
                    <div className="p-12 text-center border-2 border-dashed border-brutal-dark/20 font-data text-brutal-dark/50">
                        No applications yet.
                    </div>
                ) : (
                    <div className="overflow-x-auto border-2 border-brutal-dark bg-white">
                        <table className="w-full min-w-[720px] font-data text-sm">
                            <thead className="bg-brutal-dark/5 border-b-2 border-brutal-dark/20">
                                <tr className="text-left">
                                    <th className="px-3 py-2 w-8">
                                        <input
                                            type="checkbox"
                                            checked={allFilteredSelected}
                                            onChange={toggleAll}
                                            aria-label="Select all filtered"
                                        />
                                    </th>
                                    <th className="px-3 py-2 font-bold uppercase text-xs tracking-wide">Applicant</th>
                                    <th className="px-3 py-2 font-bold uppercase text-xs tracking-wide">Pitch</th>
                                    <th className="px-3 py-2 font-bold uppercase text-xs tracking-wide">Past work</th>
                                    <th className="px-3 py-2 font-bold uppercase text-xs tracking-wide">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(filtered ?? []).map((a) => {
                                    const applicant = users.get(a.user_id);
                                    const isExpanded = expanded.has(a.id);
                                    const pitchShort = a.pitch.length > 140 && !isExpanded
                                        ? a.pitch.slice(0, 140) + '…'
                                        : a.pitch;
                                    const links = (a.past_work_links ?? []) as PastWorkLink[];
                                    return (
                                        <tr key={a.id} className="border-b border-brutal-dark/10 last:border-0 align-top">
                                            <td className="px-3 py-2">
                                                <input
                                                    type="checkbox"
                                                    checked={selected.has(a.id)}
                                                    onChange={() => toggleRow(a.id)}
                                                    aria-label={`Select ${a.team_name}`}
                                                />
                                            </td>
                                            <td className="px-3 py-2">
                                                <div className="font-bold">{a.team_name}</div>
                                                <div className="text-xs text-brutal-dark/50">
                                                    {applicant?.name ? `${applicant.name} · ` : ''}
                                                    {applicant?.email || '—'}
                                                </div>
                                            </td>
                                            <td className="px-3 py-2 max-w-md">
                                                <p className="text-brutal-dark whitespace-pre-wrap break-words">{pitchShort}</p>
                                                {a.pitch.length > 140 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleExpanded(a.id)}
                                                        className="mt-1 text-xs underline text-brutal-dark/60 hover:text-brutal-dark"
                                                    >
                                                        {isExpanded ? 'Show less' : 'Show more'}
                                                    </button>
                                                )}
                                            </td>
                                            <td className="px-3 py-2 max-w-xs">
                                                {links.length === 0 ? (
                                                    <span className="text-brutal-dark/40">—</span>
                                                ) : (
                                                    <ul className="space-y-1">
                                                        {links.map((l, i) => (
                                                            <li key={i}>
                                                                <a
                                                                    href={l.url}
                                                                    target="_blank"
                                                                    rel="noreferrer noopener"
                                                                    className="inline-flex items-center gap-1 text-brutal-red hover:underline text-xs break-all"
                                                                >
                                                                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                                                    {l.label || l.url}
                                                                </a>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </td>
                                            <td className="px-3 py-2">
                                                <StatusBadge status={a.status} />
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filtered && filtered.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-3 py-8 text-center text-brutal-dark/50">
                                            No matches.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ── Generate interview slots ── */}
            <div className="space-y-3 border-2 border-brutal-dark bg-white p-5">
                <header className="flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-brutal-red" />
                    <h3 className="font-heading font-bold text-lg uppercase">Generate interview slots</h3>
                </header>
                <p className="font-data text-xs text-brutal-dark/60">
                    Creates a batch of open slots back-to-back. Shortlisted applicants pick one.
                </p>

                {slotBanner && (
                    <div
                        className={
                            'flex items-start gap-2 p-3 border-2 font-data text-sm ' +
                            (slotBanner.tone === 'ok'
                                ? 'border-green-500 bg-green-50 text-green-800'
                                : 'border-brutal-red bg-brutal-red/5 text-brutal-red')
                        }
                    >
                        {slotBanner.tone === 'ok' ? (
                            <CheckCircle2 className="w-4 h-4 mt-0.5" />
                        ) : (
                            <AlertCircle className="w-4 h-4 mt-0.5" />
                        )}
                        <span>{slotBanner.message}</span>
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <label className="block">
                        <span className="font-data text-[11px] uppercase tracking-wide text-brutal-dark/60 font-bold">
                            Mentor
                        </span>
                        <select
                            value={slotMentorId}
                            onChange={(e) => setSlotMentorId(e.target.value)}
                            className="mt-1 w-full border-2 border-brutal-dark bg-white px-2 py-1.5 font-data text-sm focus:outline-none focus:border-brutal-red"
                        >
                            <option value="">Pick a mentor…</option>
                            {mentors.map((m) => (
                                <option key={m.id} value={m.id}>
                                    {m.name || m.email || m.id}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="block">
                        <span className="font-data text-[11px] uppercase tracking-wide text-brutal-dark/60 font-bold">
                            Start at
                        </span>
                        <input
                            type="datetime-local"
                            value={slotStartAt}
                            onChange={(e) => setSlotStartAt(e.target.value)}
                            className="mt-1 w-full border-2 border-brutal-dark bg-white px-2 py-1.5 font-data text-sm focus:outline-none focus:border-brutal-red"
                        />
                    </label>

                    <label className="block">
                        <span className="font-data text-[11px] uppercase tracking-wide text-brutal-dark/60 font-bold">
                            Slot length (min)
                        </span>
                        <input
                            type="number"
                            min={5}
                            max={240}
                            step={5}
                            value={slotLen}
                            onChange={(e) => setSlotLen(Number(e.target.value))}
                            className="mt-1 w-full border-2 border-brutal-dark bg-white px-2 py-1.5 font-data text-sm focus:outline-none focus:border-brutal-red"
                        />
                    </label>

                    <label className="block">
                        <span className="font-data text-[11px] uppercase tracking-wide text-brutal-dark/60 font-bold">
                            Count
                        </span>
                        <input
                            type="number"
                            min={1}
                            max={50}
                            value={slotCount}
                            onChange={(e) => setSlotCount(Number(e.target.value))}
                            className="mt-1 w-full border-2 border-brutal-dark bg-white px-2 py-1.5 font-data text-sm focus:outline-none focus:border-brutal-red"
                        />
                    </label>
                </div>

                <button
                    type="button"
                    onClick={() => void handleGenerateSlots()}
                    disabled={slotBusy}
                    className="inline-flex items-center gap-2 px-4 py-2 border-2 border-brutal-dark bg-brutal-dark text-white hover:bg-brutal-dark/90 font-data text-sm font-bold transition-colors disabled:opacity-40"
                >
                    <Plus className="w-4 h-4" /> {slotBusy ? 'Creating…' : `Create ${slotCount} slot(s)`}
                </button>
            </div>

            {/* ── Slot overview ── */}
            <div className="space-y-3">
                <header className="flex items-center justify-between">
                    <h3 className="font-heading font-bold text-lg uppercase flex items-center gap-2">
                        <Clock className="w-5 h-5 text-brutal-red" />
                        Interview slots
                    </h3>
                    <div className="font-data text-xs text-brutal-dark/60">
                        {slots.length} total · {slotSummary.open} open · {slotSummary.booked} booked ·{' '}
                        {slotSummary.done} done · {slotSummary.no_show} no-show
                    </div>
                </header>

                {slots.length === 0 ? (
                    <div className="p-6 border-2 border-dashed border-brutal-dark/20 font-data text-sm text-brutal-dark/50 text-center">
                        No slots created yet.
                    </div>
                ) : (
                    <div className="overflow-x-auto border-2 border-brutal-dark bg-white">
                        <table className="w-full min-w-[640px] font-data text-sm">
                            <thead className="bg-brutal-dark/5 border-b-2 border-brutal-dark/20">
                                <tr className="text-left">
                                    <th className="px-3 py-2 font-bold uppercase text-xs tracking-wide">Start</th>
                                    <th className="px-3 py-2 font-bold uppercase text-xs tracking-wide">End</th>
                                    <th className="px-3 py-2 font-bold uppercase text-xs tracking-wide">Mentor</th>
                                    <th className="px-3 py-2 font-bold uppercase text-xs tracking-wide">Applicant</th>
                                    <th className="px-3 py-2 font-bold uppercase text-xs tracking-wide">Status</th>
                                    <th className="px-3 py-2 w-16"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {slots.map((s) => {
                                    const mentor = mentorById.get(s.mentor_user_id);
                                    const app = s.application_id ? appById.get(s.application_id) : null;
                                    return (
                                        <tr key={s.id} className="border-b border-brutal-dark/10 last:border-0">
                                            <td className="px-3 py-2">{new Date(s.start_at).toLocaleString()}</td>
                                            <td className="px-3 py-2">{new Date(s.end_at).toLocaleTimeString()}</td>
                                            <td className="px-3 py-2 inline-flex items-center gap-1">
                                                <UserIcon className="w-3 h-3 text-brutal-dark/40" />
                                                {mentor?.name || mentor?.email || 'Mentor'}
                                            </td>
                                            <td className="px-3 py-2">
                                                {app ? (
                                                    <span>{app.team_name}</span>
                                                ) : (
                                                    <span className="text-brutal-dark/40">—</span>
                                                )}
                                            </td>
                                            <td className="px-3 py-2">
                                                <SlotStatusBadge status={s.status} />
                                            </td>
                                            <td className="px-3 py-2">
                                                <button
                                                    type="button"
                                                    onClick={() => void handleDeleteSlot(s)}
                                                    className="inline-flex items-center gap-1 px-2 py-1 border-2 border-brutal-red/30 text-brutal-red hover:bg-brutal-red hover:text-white font-data text-xs transition-colors"
                                                    aria-label="Delete slot"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Helpers ─────────────────────────────────────────────

function computeStatusCounts(apps: EventApplication[]) {
    const counts = { pending: 0, shortlisted: 0, selected: 0, rejected: 0, withdrawn: 0 };
    for (const a of apps) {
        if (a.status in counts) counts[a.status as keyof typeof counts] += 1;
    }
    return counts;
}

function summarizeSlots(slots: EventInterviewSlot[]) {
    const s = { open: 0, booked: 0, done: 0, no_show: 0 };
    for (const r of slots) {
        if (r.status in s) s[r.status as keyof typeof s] += 1;
    }
    return s;
}

function StatusChip({
    label,
    active,
    onClick,
}: {
    label: string;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={
                'px-3 py-1 border-2 font-data text-xs font-bold uppercase tracking-wide transition-colors ' +
                (active
                    ? 'border-brutal-dark bg-brutal-dark text-white'
                    : 'border-brutal-dark/30 text-brutal-dark/70 hover:border-brutal-dark')
            }
        >
            {label}
        </button>
    );
}

function StatusBadge({ status }: { status: EventApplicationStatus }) {
    const style = (() => {
        switch (status) {
            case 'pending':
                return 'bg-yellow-100 text-yellow-800 border-yellow-400';
            case 'shortlisted':
                return 'bg-blue-100 text-blue-800 border-blue-400';
            case 'selected':
                return 'bg-green-100 text-green-800 border-green-400';
            case 'rejected':
                return 'bg-brutal-red/10 text-brutal-red border-brutal-red/40';
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

function SlotStatusBadge({ status }: { status: EventInterviewSlot['status'] }) {
    const style = (() => {
        switch (status) {
            case 'open':
                return 'bg-brutal-dark/5 text-brutal-dark/70 border-brutal-dark/30';
            case 'booked':
                return 'bg-blue-100 text-blue-800 border-blue-400';
            case 'done':
                return 'bg-green-100 text-green-800 border-green-400';
            case 'no_show':
                return 'bg-brutal-red/10 text-brutal-red border-brutal-red/40';
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
