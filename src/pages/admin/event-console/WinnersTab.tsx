import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Trophy, Plus, X, Save, Eye, EyeOff, GripVertical, AlertCircle, CheckCircle2 } from 'lucide-react';
import type {
    Event,
    EventApplication,
    EventSubmission,
    EventWinner,
} from '../../../lib/database.types';
import {
    fetchApplicationsForEvent,
    fetchSubmissionsForEvent,
    fetchUsersByIds,
    fetchWinnersForEvent,
    publishWinners,
    replaceWinners,
    unpublishWinners,
} from '../../../lib/api/buildChallenge';

/**
 * WinnersTab — rank submissions into podium + honourable-mention slots.
 *
 * Slot ranks:
 *   1, 2, 3               — podium
 *   -1, -2, …             — honourable mentions (ordered by addition)
 *
 * Model:
 *   - The left pool shows all submissions NOT currently assigned to a
 *     slot. Drag one into a slot (or click "Assign" on the slot).
 *   - Each slot has prize_label + citation text inputs.
 *   - "Save draft" persists the current slots as event_winner rows.
 *   - "Publish winners" sets event.winners_published_at (makes them
 *     visible on the public page). "Unpublish" reverts.
 *
 * Drag-and-drop uses native HTML5 dnd. We expose equivalent click-based
 * controls (Assign / Remove / Move to HM) so users on touch devices or
 * those preferring keyboards can still build the ranking.
 */

interface WinnersTabProps {
    event: Event;
    /** Called after publish/unpublish flips so the console header refreshes. */
    onEventChanged?: () => void;
}

interface UserLite {
    id: string;
    name: string | null;
    email: string | null;
}

/** Client-side slot model; serialized to event_winner rows on save. */
interface Slot {
    rank: number;
    submissionId: string | null;
    prize_label: string;
    citation: string;
}

const DEFAULT_PODIUM: Slot[] = [
    { rank: 1, submissionId: null, prize_label: '1st place', citation: '' },
    { rank: 2, submissionId: null, prize_label: '2nd place', citation: '' },
    { rank: 3, submissionId: null, prize_label: '3rd place', citation: '' },
];

export function WinnersTab({ event, onEventChanged }: WinnersTabProps) {
    const [submissions, setSubmissions] = useState<EventSubmission[] | null>(null);
    const [applications, setApplications] = useState<Map<string, EventApplication>>(new Map());
    const [users, setUsers] = useState<Map<string, UserLite>>(new Map());
    const [slots, setSlots] = useState<Slot[]>(DEFAULT_PODIUM);
    const [serverWinners, setServerWinners] = useState<EventWinner[] | null>(null);
    const [dirty, setDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [banner, setBanner] = useState<{ tone: 'ok' | 'error'; message: string } | null>(null);

    // ─── Load ──────────────────────────────────────────────
    const load = useCallback(async () => {
        setBanner(null);

        const [subsRes, appsRes, winnersRes] = await Promise.all([
            fetchSubmissionsForEvent(event.id),
            fetchApplicationsForEvent(event.id),
            fetchWinnersForEvent(event.id),
        ]);

        if (subsRes.error || appsRes.error || winnersRes.error) {
            setBanner({ tone: 'error', message: subsRes.error?.message || appsRes.error?.message || winnersRes.error?.message || 'Load failed' });
            return;
        }

        const subs = (subsRes.data as EventSubmission[]) || [];
        setSubmissions(subs);

        const aMap = new Map<string, EventApplication>();
        for (const a of (appsRes.data as EventApplication[]) || []) aMap.set(a.id, a);
        setApplications(aMap);

        const captainIds = Array.from(new Set(subs.map((s) => s.user_id)));
        if (captainIds.length > 0) {
            const { data: uData } = await fetchUsersByIds(captainIds);
            if (uData) {
                const m = new Map<string, UserLite>();
                for (const u of uData as UserLite[]) m.set(u.id, u);
                setUsers(m);
            }
        }

        // Hydrate slots from server state (if any).
        const winners = (winnersRes.data as EventWinner[]) || [];
        setServerWinners(winners);
        if (winners.length > 0) {
            const podium = [1, 2, 3].map<Slot>((r) => {
                const w = winners.find((x) => x.rank === r);
                return w
                    ? { rank: r, submissionId: w.submission_id, prize_label: w.prize_label, citation: w.citation }
                    : { rank: r, submissionId: null, prize_label: `${r === 1 ? '1st' : r === 2 ? '2nd' : '3rd'} place`, citation: '' };
            });
            const hm = winners
                .filter((w) => w.rank < 0)
                .sort((a, b) => a.rank - b.rank)
                .map<Slot>((w) => ({
                    rank: w.rank,
                    submissionId: w.submission_id,
                    prize_label: w.prize_label,
                    citation: w.citation,
                }));
            setSlots([...podium, ...hm]);
            setDirty(false);
        } else {
            setSlots(DEFAULT_PODIUM);
            setDirty(false);
        }
    }, [event.id]);

    useEffect(() => {
        void load();
    }, [load]);

    // ─── Derived ───────────────────────────────────────────
    const assignedIds = useMemo(() => {
        const s = new Set<string>();
        for (const slot of slots) if (slot.submissionId) s.add(slot.submissionId);
        return s;
    }, [slots]);

    const pool = useMemo(() => {
        if (!submissions) return [];
        return submissions.filter((s) => !assignedIds.has(s.id));
    }, [assignedIds, submissions]);

    const submissionById = useMemo(() => {
        const m = new Map<string, EventSubmission>();
        for (const s of submissions ?? []) m.set(s.id, s);
        return m;
    }, [submissions]);

    // ─── Slot mutations ────────────────────────────────────
    const setSlotAt = useCallback(
        (idx: number, patch: Partial<Slot>) => {
            setSlots((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
            setDirty(true);
        },
        [],
    );

    const assignToSlot = useCallback(
        (idx: number, submissionId: string) => {
            // If submission is already in another slot, vacate it first.
            setSlots((prev) => {
                const next = prev.map((s) =>
                    s.submissionId === submissionId ? { ...s, submissionId: null } : s,
                );
                return next.map((s, i) => (i === idx ? { ...s, submissionId } : s));
            });
            setDirty(true);
        },
        [],
    );

    const clearSlot = useCallback((idx: number) => {
        setSlots((prev) => prev.map((s, i) => (i === idx ? { ...s, submissionId: null } : s)));
        setDirty(true);
    }, []);

    const addHonourableMention = useCallback(() => {
        setSlots((prev) => {
            const existingHmRanks = prev.filter((s) => s.rank < 0).map((s) => s.rank);
            const nextRank = existingHmRanks.length === 0 ? -1 : Math.min(...existingHmRanks) - 1;
            return [
                ...prev,
                { rank: nextRank, submissionId: null, prize_label: 'Honourable mention', citation: '' },
            ];
        });
        setDirty(true);
    }, []);

    const removeSlot = useCallback((idx: number) => {
        setSlots((prev) => prev.filter((_, i) => i !== idx));
        setDirty(true);
    }, []);

    // ─── Drag-and-drop handlers ────────────────────────────
    // We pass the submission id via dataTransfer; both the pool and
    // other slots are valid drop targets.
    const onDragStart = (e: React.DragEvent, submissionId: string) => {
        e.dataTransfer.setData('text/x-submission-id', submissionId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const onDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const onDropOnSlot = (e: React.DragEvent, idx: number) => {
        e.preventDefault();
        const id = e.dataTransfer.getData('text/x-submission-id');
        if (id) assignToSlot(idx, id);
    };

    // ─── Save + publish ────────────────────────────────────
    const handleSave = useCallback(async () => {
        setSaving(true);
        setBanner(null);
        const entries = slots
            .filter((s) => s.submissionId !== null && s.prize_label.trim().length > 0)
            .map((s) => ({
                submission_id: s.submissionId!,
                rank: s.rank,
                prize_label: s.prize_label.trim(),
                citation: s.citation.trim(),
            }));
        const { error: saveErr } = await replaceWinners(event.id, entries);
        setSaving(false);
        if (saveErr) {
            setBanner({ tone: 'error', message: `Save failed: ${saveErr.message}` });
        } else {
            setBanner({ tone: 'ok', message: `Saved ${entries.length} winner row(s).` });
            setDirty(false);
            // Refresh server state so "published" snapshot stays accurate.
            await load();
        }
    }, [event.id, load, slots]);

    const handlePublish = useCallback(async () => {
        setPublishing(true);
        setBanner(null);
        const { error: pubErr } = await publishWinners(event.id);
        setPublishing(false);
        if (pubErr) {
            setBanner({ tone: 'error', message: `Publish failed: ${pubErr.message}` });
            return;
        }
        setBanner({ tone: 'ok', message: 'Winners are now public on the event page.' });
        onEventChanged?.();
    }, [event.id, onEventChanged]);

    const handleUnpublish = useCallback(async () => {
        const ok = window.confirm('Hide winners from the public event page? Teams will no longer see the leaderboard.');
        if (!ok) return;
        setPublishing(true);
        const { error: unpubErr } = await unpublishWinners(event.id);
        setPublishing(false);
        if (unpubErr) setBanner({ tone: 'error', message: `Unpublish failed: ${unpubErr.message}` });
        else {
            setBanner({ tone: 'ok', message: 'Winners hidden.' });
            onEventChanged?.();
        }
    }, [event.id, onEventChanged]);

    // ─── Render ────────────────────────────────────────────
    if (submissions === null) {
        return <div className="p-12 text-center font-data text-brutal-dark/50">Loading submissions…</div>;
    }

    const isPublished = event.winners_published_at !== null;
    const savedMatchesDraft = !dirty && serverWinners !== null;

    return (
        <div className="space-y-4">
            {/* Banner */}
            {banner && (
                <div
                    className={
                        'flex items-start gap-2 p-3 border-2 font-data text-sm ' +
                        (banner.tone === 'ok'
                            ? 'border-green-500 bg-green-50 text-green-800'
                            : 'border-brutal-red bg-brutal-red/5 text-brutal-red')
                    }
                >
                    {banner.tone === 'ok' ? <CheckCircle2 className="w-4 h-4 mt-0.5" /> : <AlertCircle className="w-4 h-4 mt-0.5" />}
                    <span>{banner.message}</span>
                </div>
            )}

            {/* Status + publish controls */}
            <div className="flex flex-wrap items-center gap-3 p-3 border-2 border-brutal-dark bg-white">
                <span className="inline-flex items-center gap-2 font-data text-sm">
                    <Trophy className="w-4 h-4 text-brutal-red" />
                    <strong>{isPublished ? 'Published' : 'Draft'}</strong>
                    {isPublished && event.winners_published_at && (
                        <span className="text-brutal-dark/60">
                            · since {new Date(event.winners_published_at).toLocaleString()}
                        </span>
                    )}
                </span>
                <div className="ml-auto flex gap-2">
                    <button
                        type="button"
                        onClick={() => void handleSave()}
                        disabled={saving || !dirty}
                        className="inline-flex items-center gap-2 px-3 py-2 border-2 border-brutal-dark hover:bg-brutal-dark hover:text-white font-data text-sm font-bold transition-colors disabled:opacity-40"
                    >
                        <Save className="w-4 h-4" /> {saving ? 'Saving…' : dirty ? 'Save draft' : 'Saved'}
                    </button>
                    {isPublished ? (
                        <button
                            type="button"
                            onClick={() => void handleUnpublish()}
                            disabled={publishing}
                            className="inline-flex items-center gap-2 px-3 py-2 border-2 border-brutal-red/40 text-brutal-red hover:bg-brutal-red hover:text-white font-data text-sm font-bold transition-colors disabled:opacity-40"
                        >
                            <EyeOff className="w-4 h-4" /> Unpublish
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => void handlePublish()}
                            disabled={publishing || !savedMatchesDraft || slots.every((s) => s.submissionId === null)}
                            className="inline-flex items-center gap-2 px-3 py-2 border-2 border-brutal-red bg-brutal-red text-white hover:bg-brutal-red/90 font-data text-sm font-bold transition-colors disabled:opacity-40"
                            title={!savedMatchesDraft ? 'Save the draft first' : undefined}
                        >
                            <Eye className="w-4 h-4" /> Publish winners
                        </button>
                    )}
                </div>
            </div>

            {submissions.length === 0 ? (
                <div className="p-12 text-center border-2 border-dashed border-brutal-dark/20 font-data text-brutal-dark/50">
                    No submissions yet — nothing to rank.
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Pool */}
                    <div className="lg:col-span-1 space-y-2">
                        <h3 className="font-heading font-bold text-lg uppercase">Unassigned</h3>
                        <p className="font-data text-xs text-brutal-dark/50">
                            Drag a submission into a slot, or use Assign.
                        </p>
                        {pool.length === 0 ? (
                            <div className="p-4 border-2 border-dashed border-brutal-dark/20 text-center font-data text-sm text-brutal-dark/50">
                                All submissions assigned.
                            </div>
                        ) : (
                            <ul className="space-y-2">
                                {pool.map((s) => {
                                    const app = s.application_id ? applications.get(s.application_id) : undefined;
                                    const captain = users.get(s.user_id);
                                    return (
                                        <li
                                            key={s.id}
                                            draggable
                                            onDragStart={(e) => onDragStart(e, s.id)}
                                            className="p-3 border-2 border-brutal-dark bg-white cursor-move hover:shadow-[4px_4px_0_rgba(0,0,0,0.1)] transition-shadow"
                                        >
                                            <div className="flex items-start gap-2">
                                                <GripVertical className="w-4 h-4 text-brutal-dark/40 mt-0.5 flex-shrink-0" />
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-bold truncate">{s.title || '(untitled)'}</p>
                                                    <p className="font-data text-xs text-brutal-dark/60 truncate">
                                                        {app?.team_name ?? 'unknown team'} · {captain?.name || captain?.email || ''}
                                                    </p>
                                                </div>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>

                    {/* Slots */}
                    <div className="lg:col-span-2 space-y-3">
                        <h3 className="font-heading font-bold text-lg uppercase">Ranking</h3>
                        <ul className="space-y-3">
                            {slots.map((slot, idx) => {
                                const submission = slot.submissionId ? submissionById.get(slot.submissionId) : undefined;
                                const app = submission?.application_id ? applications.get(submission.application_id) : undefined;
                                const captain = submission ? users.get(submission.user_id) : undefined;
                                const isHm = slot.rank < 0;
                                return (
                                    <li
                                        key={slot.rank}
                                        onDragOver={onDragOver}
                                        onDrop={(e) => onDropOnSlot(e, idx)}
                                        className="p-4 border-2 border-brutal-dark bg-white space-y-3"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="font-heading font-bold text-xl uppercase">
                                                {isHm ? 'HM' : `#${slot.rank}`}
                                            </span>
                                            <input
                                                type="text"
                                                value={slot.prize_label}
                                                onChange={(e) => setSlotAt(idx, { prize_label: e.target.value })}
                                                placeholder="Prize label (e.g. 1st · ₹25,000)"
                                                className="flex-1 px-2 py-1 border-2 border-brutal-dark/30 font-data text-sm focus:outline-none focus:border-brutal-red"
                                            />
                                            {isHm && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeSlot(idx)}
                                                    className="p-1 border-2 border-brutal-red/30 text-brutal-red hover:bg-brutal-red hover:text-white transition-colors"
                                                    title="Remove slot"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>

                                        {/* Assigned submission preview */}
                                        {submission ? (
                                            <div className="flex items-start justify-between gap-3 p-3 bg-brutal-dark/5 border border-brutal-dark/10">
                                                <div className="min-w-0">
                                                    <p className="font-bold truncate">{submission.title || '(untitled)'}</p>
                                                    <p className="font-data text-xs text-brutal-dark/60 truncate">
                                                        {app?.team_name ?? 'unknown team'} · {captain?.name || captain?.email || ''}
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => clearSlot(idx)}
                                                    className="px-2 py-1 border-2 border-brutal-dark/30 hover:border-brutal-dark font-data text-xs transition-colors"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="p-3 border-2 border-dashed border-brutal-dark/30 text-center font-data text-xs text-brutal-dark/50">
                                                Drop a submission here, or use the Assign menu below.
                                            </div>
                                        )}

                                        {/* Assign menu (click-based fallback) */}
                                        {!submission && pool.length > 0 && (
                                            <select
                                                value=""
                                                onChange={(e) => {
                                                    if (e.target.value) assignToSlot(idx, e.target.value);
                                                }}
                                                className="w-full px-2 py-1 border-2 border-brutal-dark/30 font-data text-sm focus:outline-none focus:border-brutal-red"
                                            >
                                                <option value="">Assign submission…</option>
                                                {pool.map((s) => (
                                                    <option key={s.id} value={s.id}>
                                                        {s.title || '(untitled)'}
                                                    </option>
                                                ))}
                                            </select>
                                        )}

                                        <textarea
                                            value={slot.citation}
                                            onChange={(e) => setSlotAt(idx, { citation: e.target.value })}
                                            rows={2}
                                            placeholder="Citation — one paragraph on why this team won (shown publicly)"
                                            className="w-full px-2 py-1 border-2 border-brutal-dark/30 font-data text-sm focus:outline-none focus:border-brutal-red resize-y"
                                        />
                                    </li>
                                );
                            })}
                        </ul>

                        <button
                            type="button"
                            onClick={addHonourableMention}
                            className="inline-flex items-center gap-2 px-3 py-2 border-2 border-brutal-dark/30 hover:border-brutal-dark font-data text-sm transition-colors"
                        >
                            <Plus className="w-4 h-4" /> Add honourable mention
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
