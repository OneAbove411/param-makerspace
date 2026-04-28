import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, XCircle, RefreshCw, Search, Users, Trophy, AlertCircle } from 'lucide-react';
import type { Event, EventApplication, EventApplicationStatus } from '../../../lib/database.types';
import {
    bulkSetApplicationStatus,
    fetchApplicationsForEvent,
    fetchUsersByIds,
} from '../../../lib/api/buildChallenge';

/**
 * ShortlistTab — admin review of Build Challenge applications.
 *
 * Shows every application for the event in a table with:
 *   - Team name + captain + tagged members (resolved to names)
 *   - Pitch (truncated + expandable)
 *   - Current status chip
 *   - Row checkbox for bulk actions
 *
 * Bulk actions:
 *   - "Shortlist selected" flips status → 'shortlisted'
 *   - "Reject selected" flips status → 'rejected'
 *
 * Search filters by team name, captain name, or tagged-member name.
 *
 * We do NOT mutate status optimistically — on success we refetch so
 * the view reflects server truth, which matters when multiple admins
 * are reviewing in parallel.
 */

interface ShortlistTabProps {
    event: Event;
}

interface UserLite {
    id: string;
    name: string | null;
    email: string | null;
}

type StatusFilter = 'all' | EventApplicationStatus;

export function ShortlistTab({ event }: ShortlistTabProps) {
    const [apps, setApps] = useState<EventApplication[] | null>(null);
    const [users, setUsers] = useState<Map<string, UserLite>>(new Map());
    const [error, setError] = useState<string | null>(null);
    const [query, setQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [busy, setBusy] = useState(false);
    const [expanded, setExpanded] = useState<Set<string>>(new Set());

    const load = useCallback(async () => {
        setError(null);
        setApps(null);
        const { data, error: loadErr } = await fetchApplicationsForEvent(event.id);
        if (loadErr) {
            setError(loadErr.message);
            return;
        }
        const rows = (data as EventApplication[]) || [];
        setApps(rows);

        // Resolve display names for captain + all tagged members in one call.
        const allUserIds = new Set<string>();
        for (const a of rows) {
            allUserIds.add(a.user_id);
            for (const m of a.team_member_user_ids) allUserIds.add(m);
        }
        if (allUserIds.size > 0) {
            const { data: uData, error: uErr } = await fetchUsersByIds(Array.from(allUserIds));
            if (!uErr && uData) {
                const map = new Map<string, UserLite>();
                for (const u of uData as UserLite[]) map.set(u.id, u);
                setUsers(map);
            }
        }
    }, [event.id]);

    useEffect(() => {
        void load();
    }, [load]);

    // ─── Filtering ──────────────────────────────────────────
    const filtered = useMemo(() => {
        if (!apps) return null;
        const q = query.trim().toLowerCase();
        return apps.filter((a) => {
            if (statusFilter !== 'all' && a.status !== statusFilter) return false;
            if (!q) return true;
            const captain = users.get(a.user_id);
            const memberNames = a.team_member_user_ids
                .map((id) => users.get(id)?.name ?? '')
                .join(' ');
            const haystack = [a.team_name, captain?.name ?? '', memberNames]
                .join(' ')
                .toLowerCase();
            return haystack.includes(q);
        });
    }, [apps, users, query, statusFilter]);

    // ─── Selection ─────────────────────────────────────────
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
        if (allFilteredSelected) {
            const next = new Set(selected);
            for (const a of filtered) next.delete(a.id);
            setSelected(next);
        } else {
            const next = new Set(selected);
            for (const a of filtered) next.add(a.id);
            setSelected(next);
        }
    };

    // ─── Bulk actions ──────────────────────────────────────
    const doBulk = useCallback(
        async (status: EventApplicationStatus) => {
            if (selected.size === 0) return;
            const ok = window.confirm(
                `Mark ${selected.size} application(s) as "${status}"? Teams will see the result on their dashboard.`,
            );
            if (!ok) return;
            setBusy(true);
            try {
                const { error: bulkErr } = await bulkSetApplicationStatus(Array.from(selected), status);
                if (bulkErr) {
                    window.alert(`Bulk update failed: ${bulkErr.message}`);
                } else {
                    setSelected(new Set());
                    await load();
                }
            } finally {
                setBusy(false);
            }
        },
        [load, selected],
    );

    const toggleExpanded = (id: string) => {
        const next = new Set(expanded);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setExpanded(next);
    };

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

    return (
        <div className="space-y-4">
            {/* Filter chips */}
            <div className="flex flex-wrap items-center gap-2">
                <StatusChip label={`All (${apps.length})`} active={statusFilter === 'all'} onClick={() => setStatusFilter('all')} />
                <StatusChip label={`Pending (${counts.pending})`} active={statusFilter === 'pending'} onClick={() => setStatusFilter('pending')} />
                <StatusChip label={`Shortlisted (${counts.shortlisted})`} active={statusFilter === 'shortlisted'} onClick={() => setStatusFilter('shortlisted')} />
                <StatusChip label={`Rejected (${counts.rejected})`} active={statusFilter === 'rejected'} onClick={() => setStatusFilter('rejected')} />
                <StatusChip label={`Withdrawn (${counts.withdrawn})`} active={statusFilter === 'withdrawn'} onClick={() => setStatusFilter('withdrawn')} />
            </div>

            {/* Search + actions */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-brutal-dark/40" />
                    <input
                        type="text"
                        placeholder="Search by team, captain, or member name…"
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
                        onClick={() => void load()}
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

            {/* Deadline context */}
            {event.shortlist_deadline && (
                <div className="flex items-start gap-2 p-3 border-2 border-brutal-dark/20 bg-brutal-dark/5 font-data text-xs">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-brutal-dark/60" />
                    <span className="text-brutal-dark/70">
                        Shortlist deadline: {new Date(event.shortlist_deadline).toLocaleString()}.
                        Shortlisted teams unlock the submission form; others stay read-only.
                    </span>
                </div>
            )}

            {/* Table */}
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
                                <th className="px-3 py-2 font-bold uppercase text-xs tracking-wide">Team</th>
                                <th className="px-3 py-2 font-bold uppercase text-xs tracking-wide">Captain</th>
                                <th className="px-3 py-2 font-bold uppercase text-xs tracking-wide">Members</th>
                                <th className="px-3 py-2 font-bold uppercase text-xs tracking-wide">Pitch</th>
                                <th className="px-3 py-2 font-bold uppercase text-xs tracking-wide">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(filtered ?? []).map((a) => {
                                const captain = users.get(a.user_id);
                                const memberNames = a.team_member_user_ids.map((id) => users.get(id)?.name || users.get(id)?.email || 'Unknown');
                                const isExpanded = expanded.has(a.id);
                                const pitchShort = a.pitch.length > 140 && !isExpanded
                                    ? a.pitch.slice(0, 140) + '…'
                                    : a.pitch;
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
                                        <td className="px-3 py-2 font-bold">{a.team_name}</td>
                                        <td className="px-3 py-2">{captain?.name || captain?.email || '—'}</td>
                                        <td className="px-3 py-2">
                                            {memberNames.length === 0 ? (
                                                <span className="text-brutal-dark/40">Solo</span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1">
                                                    <Users className="w-3 h-3 text-brutal-dark/50" />
                                                    {memberNames.join(', ')}
                                                </span>
                                            )}
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
                                        <td className="px-3 py-2">
                                            <StatusBadge status={a.status} />
                                        </td>
                                    </tr>
                                );
                            })}
                            {filtered && filtered.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-3 py-8 text-center text-brutal-dark/50">
                                        No matches.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Footer note */}
            <p className="font-data text-xs text-brutal-dark/50 inline-flex items-center gap-1">
                <Trophy className="w-3 h-3" />
                Shortlisted teams will see the "Submit project" button on the event page.
            </p>
        </div>
    );
}

// ─── Helpers ─────────────────────────────────────────────

function computeStatusCounts(apps: EventApplication[]) {
    const counts = { pending: 0, shortlisted: 0, rejected: 0, withdrawn: 0 };
    for (const a of apps) {
        // EventApplicationStatus was widened in P9 to include 'selected',
        // which BC shouldn't actually produce — guard the indexer defensively
        // so a stray row doesn't crash this tab.
        if (a.status in counts) counts[a.status as keyof typeof counts] += 1;
    }
    return counts;
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
                return 'bg-green-100 text-green-800 border-green-400';
            case 'selected':
                return 'bg-green-100 text-green-800 border-green-400';
            case 'rejected':
                return 'bg-brutal-red/10 text-brutal-red border-brutal-red/40';
            case 'withdrawn':
                return 'bg-brutal-dark/10 text-brutal-dark/60 border-brutal-dark/30';
        }
    })();
    return (
        <span className={'inline-block px-2 py-0.5 border text-xs font-bold font-data uppercase rounded ' + style}>
            {status}
        </span>
    );
}
