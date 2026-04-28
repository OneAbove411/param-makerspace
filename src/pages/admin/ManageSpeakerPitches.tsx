/**
 * /admin/speakers — global speaker-pitch triage console (P11).
 *
 * Pitches submitted via /speak or the per-event PitchCTA footer land
 * in the speaker_pitch table. This page is the inbox + detail view
 * mentors/admins use to triage them:
 *
 *   • Inbox: filterable list (status + preferred_event_type), newest
 *     first, with a status badge and meta line per row.
 *   • Detail: reviewer_note editor, status transitions, and an Accept
 *     button that launches the prefilled wizard.
 *
 * The Accept flow is a soft handoff: it opens
 * `/admin/events/new/<slug>?topic=<>&speaker=<>&pitch=<id>` and leaves
 * the pitch at status='accepted'. We don't auto-archive on publish —
 * the admin can archive later once the event lands.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
    Mic2, ArrowLeft, Inbox, CheckCircle2, Archive, RefreshCw, Search,
    Mail, Calendar, User as UserIcon, ExternalLink, Filter, Rocket,
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { AdminPageShell } from '../../components/admin/AdminPageShell';
import { speakerPitchApi } from '../../lib/api';
import type {
    SpeakerPitch, SpeakerPitchStatus, EventType,
} from '../../lib/database.types';
import { EventBody } from '../../components/events/EventBody';
import { EVENT_TYPE_LABELS } from './event-wizard/wizardTypes';

// ─── Status display ─────────────────────────────────────────────

const STATUS_BADGES: Record<SpeakerPitchStatus, { label: string; className: string }> = {
    new:       { label: 'New',       className: 'bg-brutal-red/15 text-brutal-red border-brutal-red/30' },
    reviewing: { label: 'Reviewing', className: 'bg-blue-500/15 text-blue-700 border-blue-500/30' },
    accepted:  { label: 'Accepted',  className: 'bg-green-500/15 text-green-700 border-green-500/30' },
    archived:  { label: 'Archived',  className: 'bg-brutal-dark/10 text-brutal-dark/60 border-brutal-dark/20' },
};

function StatusBadge({ status }: { status: SpeakerPitchStatus }) {
    const b = STATUS_BADGES[status];
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full border-2 font-data text-[10px] font-bold uppercase tracking-widest ${b.className}`}>
            {b.label}
        </span>
    );
}

// ─── Top-level page ─────────────────────────────────────────────

export function ManageSpeakerPitches() {
    const { role } = useAuth();
    const [rows, setRows] = useState<SpeakerPitch[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    // Filters
    const [statusFilter, setStatusFilter] = useState<SpeakerPitchStatus | 'all'>('all');
    const [typeFilter, setTypeFilter] = useState<EventType | 'all'>('all');
    const [search, setSearch] = useState('');

    const reload = useCallback(async () => {
        setLoading(true);
        const filters: Parameters<typeof speakerPitchApi.listPitches>[0] = {};
        if (statusFilter !== 'all') filters.status = statusFilter;
        if (typeFilter !== 'all') filters.preferred_event_type = typeFilter;
        const { data, error } = await speakerPitchApi.listPitches(filters);
        if (error) {
            setError(error.message);
            setRows([]);
        } else {
            setRows((data as SpeakerPitch[]) ?? []);
            setError(null);
        }
        setLoading(false);
    }, [statusFilter, typeFilter]);

    useEffect(() => {
        void reload();
    }, [reload]);

    const filteredRows = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return rows;
        return rows.filter((r) =>
            r.name.toLowerCase().includes(q)
            || r.email.toLowerCase().includes(q)
            || r.topic_title.toLowerCase().includes(q),
        );
    }, [rows, search]);

    const selected = useMemo(
        () => filteredRows.find((r) => r.id === selectedId) ?? rows.find((r) => r.id === selectedId) ?? null,
        [selectedId, rows, filteredRows],
    );

    if (role !== 'mentor' && role !== 'admin') {
        return (
            <div className="p-24 text-center font-data text-2xl">
                Access Denied: Mentor or Admin only.
            </div>
        );
    }

    // Summary counts for the inbox header
    const counts = useMemo(() => {
        const out = { new: 0, reviewing: 0, accepted: 0, archived: 0 } as Record<SpeakerPitchStatus, number>;
        for (const r of rows) out[r.status] = (out[r.status] ?? 0) + 1;
        return out;
    }, [rows]);

    return (
        <AdminPageShell
            role={role}
            title="Speaker Pitches"
            subtitle="Triage speaker/presenter pitches submitted through /speak and event pages."
            icon={Mic2}
            headerAction={
                <button
                    type="button"
                    onClick={() => { void reload(); }}
                    className="inline-flex items-center gap-2 px-3 py-2 border-2 border-brutal-dark/30 hover:border-brutal-dark font-data text-sm transition-colors"
                >
                    <RefreshCw className="w-4 h-4" /> Refresh
                </button>
            }
        >
            {error && (
                <div className="p-4 border-2 border-brutal-red/40 bg-brutal-red/5 font-data text-sm mb-4">
                    Failed to load: {error}
                </div>
            )}

            {/* Counters */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                {(Object.keys(STATUS_BADGES) as SpeakerPitchStatus[]).map((s) => {
                    const active = statusFilter === s;
                    return (
                        <button
                            key={s}
                            type="button"
                            onClick={() => setStatusFilter(active ? 'all' : s)}
                            className={
                                'text-left p-3 rounded-xl border-2 transition-colors '
                                + (active
                                    ? 'border-brutal-red bg-brutal-red/5'
                                    : 'border-brutal-dark/15 hover:border-brutal-dark/35')
                            }
                        >
                            <div className="font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/55">
                                {STATUS_BADGES[s].label}
                            </div>
                            <div className="font-heading font-bold text-2xl tabular-nums text-brutal-dark mt-0.5">
                                {counts[s] ?? 0}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Filters row */}
            <div className="flex flex-col md:flex-row gap-3 mb-5">
                <div className="flex-1 relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-brutal-dark/40" />
                    <input
                        type="search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by name, email, or topic…"
                        className="w-full h-11 rounded-xl bg-brutal-bg border-2 border-brutal-dark/15 pl-10 pr-3 font-data text-sm focus:border-brutal-red focus:outline-none"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-brutal-dark/40" />
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value as EventType | 'all')}
                        className="h-11 rounded-xl bg-brutal-bg border-2 border-brutal-dark/15 px-3 font-data text-sm focus:border-brutal-red focus:outline-none"
                    >
                        <option value="all">All event types</option>
                        <option value="tech_tuesday">{EVENT_TYPE_LABELS.tech_tuesday}</option>
                        <option value="maker_meetup">{EVENT_TYPE_LABELS.maker_meetup}</option>
                        <option value="build_challenge">{EVENT_TYPE_LABELS.build_challenge}</option>
                    </select>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as SpeakerPitchStatus | 'all')}
                        className="h-11 rounded-xl bg-brutal-bg border-2 border-brutal-dark/15 px-3 font-data text-sm focus:border-brutal-red focus:outline-none"
                    >
                        <option value="all">All statuses</option>
                        <option value="new">New</option>
                        <option value="reviewing">Reviewing</option>
                        <option value="accepted">Accepted</option>
                        <option value="archived">Archived</option>
                    </select>
                </div>
            </div>

            {/* Master-detail grid */}
            <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-5">
                {/* List */}
                <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1 [scrollbar-width:thin]">
                    {loading && (
                        <div className="p-8 text-center font-data text-sm text-brutal-dark/50">Loading pitches…</div>
                    )}
                    {!loading && filteredRows.length === 0 && (
                        <div className="p-10 text-center border-2 border-dashed border-brutal-dark/15 rounded-xl">
                            <Inbox className="w-6 h-6 mx-auto mb-2 text-brutal-dark/30" />
                            <p className="font-data text-sm text-brutal-dark/55">No pitches match these filters.</p>
                        </div>
                    )}
                    {filteredRows.map((p) => {
                        const active = p.id === selectedId;
                        const created = new Date(p.created_at);
                        return (
                            <button
                                key={p.id}
                                type="button"
                                onClick={() => setSelectedId(p.id)}
                                className={
                                    'w-full text-left p-4 rounded-xl border-2 transition-colors '
                                    + (active
                                        ? 'border-brutal-red bg-brutal-red/5'
                                        : 'border-brutal-dark/10 hover:border-brutal-dark/30 bg-white')
                                }
                            >
                                <div className="flex items-center justify-between gap-2 mb-1">
                                    <div className="font-data text-xs font-bold text-brutal-dark truncate">
                                        {p.name}
                                    </div>
                                    <StatusBadge status={p.status} />
                                </div>
                                <div className="font-heading font-bold text-sm text-brutal-dark line-clamp-2 mb-1">
                                    {p.topic_title}
                                </div>
                                <div className="flex items-center gap-3 font-data text-[11px] text-brutal-dark/55">
                                    <span>{EVENT_TYPE_LABELS[p.preferred_event_type]}</span>
                                    <span>·</span>
                                    <span>{created.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Detail */}
                <div>
                    {selected ? (
                        <PitchDetail
                            pitch={selected}
                            onChanged={() => void reload()}
                            onClose={() => setSelectedId(null)}
                        />
                    ) : (
                        <div className="p-12 border-2 border-dashed border-brutal-dark/15 rounded-2xl text-center">
                            <Mic2 className="w-8 h-8 mx-auto mb-3 text-brutal-dark/30" />
                            <p className="font-data text-sm text-brutal-dark/55">
                                Select a pitch on the left to review it.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </AdminPageShell>
    );
}

// ─── Detail ───────────────────────────────────────────────────

interface PitchDetailProps {
    pitch: SpeakerPitch;
    onChanged: () => void;
    onClose: () => void;
}

function PitchDetail({ pitch, onChanged, onClose }: PitchDetailProps) {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [note, setNote] = useState(pitch.reviewer_note ?? '');
    const [savingNote, setSavingNote] = useState(false);
    const [updatingStatus, setUpdatingStatus] = useState(false);

    // Resync note when a different pitch is selected.
    useEffect(() => {
        setNote(pitch.reviewer_note ?? '');
    }, [pitch.id, pitch.reviewer_note]);

    const reviewerId = user?.id ?? null;
    const created = new Date(pitch.created_at);
    const updated = new Date(pitch.updated_at);

    const moveToStatus = async (status: SpeakerPitchStatus) => {
        setUpdatingStatus(true);
        const { error } = await speakerPitchApi.updatePitchStatus(pitch.id, status, reviewerId);
        setUpdatingStatus(false);
        if (error) {
            window.alert(`Update failed: ${error.message}`);
            return;
        }
        onChanged();
    };

    const saveNote = async () => {
        setSavingNote(true);
        const { error } = await speakerPitchApi.updatePitchNote(pitch.id, note.trim() || null, reviewerId);
        setSavingNote(false);
        if (error) {
            window.alert(`Note save failed: ${error.message}`);
            return;
        }
        onChanged();
    };

    const accept = async () => {
        // First mark accepted so the audit trail reflects the decision even
        // if the admin abandons the wizard mid-way.
        const { error } = await speakerPitchApi.updatePitchStatus(pitch.id, 'accepted', reviewerId);
        if (error) {
            window.alert(`Accept failed: ${error.message}`);
            return;
        }
        onChanged();
        navigate(speakerPitchApi.acceptPitchWizardHref(pitch));
    };

    return (
        <article className="bg-white border-2 border-brutal-dark/15 rounded-2xl overflow-hidden">
            {/* Header */}
            <header className="p-5 md:p-6 border-b-2 border-brutal-dark/10 flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        <StatusBadge status={pitch.status} />
                        <span className="font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/50">
                            {EVENT_TYPE_LABELS[pitch.preferred_event_type]}
                        </span>
                    </div>
                    <h2 className="font-heading font-bold text-xl md:text-2xl uppercase tracking-tight-heading leading-tight text-brutal-dark">
                        {pitch.topic_title}
                    </h2>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-data text-[11px] text-brutal-dark/55">
                        <span className="inline-flex items-center gap-1.5"><UserIcon className="w-3 h-3" />{pitch.name}</span>
                        <a href={`mailto:${pitch.email}`} className="inline-flex items-center gap-1.5 hover:text-brutal-red">
                            <Mail className="w-3 h-3" />{pitch.email}
                        </a>
                        <span className="inline-flex items-center gap-1.5">
                            <Calendar className="w-3 h-3" />
                            Received {created.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        {updated.getTime() !== created.getTime() && (
                            <span className="text-brutal-dark/40">
                                · updated {updated.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            </span>
                        )}
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex items-center gap-1.5 font-data text-[11px] font-bold uppercase tracking-widest text-brutal-dark/50 hover:text-brutal-red"
                >
                    <ArrowLeft className="w-3.5 h-3.5" /> Close
                </button>
            </header>

            {/* Abstract */}
            <section className="p-5 md:p-6 border-b-2 border-brutal-dark/10">
                <h3 className="font-data text-xs font-bold uppercase tracking-widest text-brutal-dark/55 mb-3">
                    Abstract
                </h3>
                <EventBody
                    blocks={pitch.topic_abstract}
                    fallback={
                        <p className="font-data text-sm text-brutal-dark/50 italic">
                            (No abstract provided.)
                        </p>
                    }
                />
            </section>

            {/* Past links */}
            {pitch.past_talk_links.length > 0 && (
                <section className="p-5 md:p-6 border-b-2 border-brutal-dark/10">
                    <h3 className="font-data text-xs font-bold uppercase tracking-widest text-brutal-dark/55 mb-3">
                        Past talks & recordings
                    </h3>
                    <ul className="space-y-1.5">
                        {pitch.past_talk_links.map((url, i) => (
                            <li key={i}>
                                <a
                                    href={url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 font-data text-sm text-brutal-dark hover:text-brutal-red break-all"
                                >
                                    <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                                    {url}
                                </a>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {/* Reviewer note */}
            <section className="p-5 md:p-6 border-b-2 border-brutal-dark/10">
                <label className="font-data text-xs font-bold uppercase tracking-widest text-brutal-dark/55 block mb-2">
                    Reviewer note (admin only)
                </label>
                <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Private thoughts, follow-up questions, routing decisions…"
                    className="w-full min-h-[90px] rounded-lg bg-brutal-bg border-2 border-brutal-dark/15 p-3 font-data text-sm focus:border-brutal-red focus:outline-none"
                />
                <div className="flex justify-end mt-2">
                    <button
                        type="button"
                        onClick={saveNote}
                        disabled={savingNote || note === (pitch.reviewer_note ?? '')}
                        className="inline-flex items-center gap-2 px-3 py-1.5 border-2 border-brutal-dark/30 hover:border-brutal-dark font-data text-xs font-bold uppercase tracking-widest transition-colors disabled:opacity-40"
                    >
                        {savingNote ? 'Saving…' : 'Save note'}
                    </button>
                </div>
            </section>

            {/* Actions */}
            <section className="p-5 md:p-6 flex flex-wrap items-center gap-2">
                {pitch.status === 'new' && (
                    <button
                        type="button"
                        onClick={() => moveToStatus('reviewing')}
                        disabled={updatingStatus}
                        className="inline-flex items-center gap-2 px-3 py-2 border-2 border-blue-500/40 text-blue-700 hover:bg-blue-500 hover:text-white font-data text-sm font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
                    >
                        Mark reviewing
                    </button>
                )}
                {(pitch.status === 'new' || pitch.status === 'reviewing') && (
                    <button
                        type="button"
                        onClick={accept}
                        disabled={updatingStatus}
                        className="inline-flex items-center gap-2 px-3 py-2 bg-brutal-red text-brutal-bg border-2 border-brutal-red font-data text-sm font-bold uppercase tracking-wider hover:shadow-[3px_3px_0_0_rgba(17,17,17,0.4)] transition-all disabled:opacity-50"
                    >
                        <Rocket className="w-4 h-4" />
                        Accept & open wizard
                    </button>
                )}
                {pitch.status !== 'archived' && (
                    <button
                        type="button"
                        onClick={() => moveToStatus('archived')}
                        disabled={updatingStatus}
                        className="inline-flex items-center gap-2 px-3 py-2 border-2 border-brutal-dark/30 text-brutal-dark/60 hover:border-brutal-dark hover:text-brutal-dark font-data text-sm font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
                    >
                        <Archive className="w-4 h-4" />
                        Archive
                    </button>
                )}
                {pitch.status === 'archived' && (
                    <button
                        type="button"
                        onClick={() => moveToStatus('new')}
                        disabled={updatingStatus}
                        className="inline-flex items-center gap-2 px-3 py-2 border-2 border-brutal-dark/30 hover:border-brutal-dark font-data text-sm font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
                    >
                        Restore to inbox
                    </button>
                )}
                {pitch.status === 'accepted' && (
                    <span className="inline-flex items-center gap-1.5 font-data text-[11px] text-green-700">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Accepted{pitch.reviewer_id ? ' — event wizard launched' : ''}.
                    </span>
                )}
                <Link
                    to="/admin/events"
                    className="ml-auto inline-flex items-center gap-1.5 font-data text-[11px] font-bold uppercase tracking-widest text-brutal-dark/50 hover:text-brutal-red"
                >
                    Back to events <ExternalLink className="w-3 h-3" />
                </Link>
            </section>
        </article>
    );
}

export default ManageSpeakerPitches;
