import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ExternalLink, Github, Globe, Lock, Unlock, RefreshCw, StickyNote, Save, Clock } from 'lucide-react';
import { useAuth } from '../../../lib/auth';
import type {
    Event,
    EventApplication,
    EventSubmission,
    EventSubmissionNote,
} from '../../../lib/database.types';
import {
    fetchApplicationsForEvent,
    fetchNotesForSubmissions,
    fetchSubmissionsForEvent,
    fetchUsersByIds,
    lockSubmissionsForEvent,
    upsertSubmissionNote,
} from '../../../lib/api/buildChallenge';
import { EventBody } from '../../../components/events/EventBody';

/**
 * SubmissionsTab — grid of Build Challenge submissions for an event.
 *
 * Each card shows:
 *   - Title + team name (resolved via the linked application)
 *   - Submitted-at timestamp, locked state
 *   - Repo / demo external links
 *   - Description body (rendered via EventBody)
 *   - Private note editor (per-admin; saved per keystroke debounce)
 *
 * Admin-only actions on this tab:
 *   - "Lock all submissions now" — immediately sets locked_at on every
 *     row for this event. Normally done at submission_deadline; the
 *     button exists for manual override.
 *   - "Unlock selected" — we deliberately skip this. Re-opening
 *     submissions mid-review is not a supported flow; if truly
 *     needed, an admin can do it via SQL.
 */

interface SubmissionsTabProps {
    event: Event;
}

interface UserLite {
    id: string;
    name: string | null;
    email: string | null;
}

export function SubmissionsTab({ event }: SubmissionsTabProps) {
    const { user } = useAuth();
    const [submissions, setSubmissions] = useState<EventSubmission[] | null>(null);
    const [applications, setApplications] = useState<Map<string, EventApplication>>(new Map());
    const [notes, setNotes] = useState<Map<string, EventSubmissionNote>>(new Map());
    const [users, setUsers] = useState<Map<string, UserLite>>(new Map());
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        setError(null);
        setSubmissions(null);

        const [subsRes, appsRes] = await Promise.all([
            fetchSubmissionsForEvent(event.id),
            fetchApplicationsForEvent(event.id),
        ]);

        if (subsRes.error) {
            setError(subsRes.error.message);
            return;
        }
        const subs = (subsRes.data as EventSubmission[]) || [];
        setSubmissions(subs);

        const appMap = new Map<string, EventApplication>();
        for (const a of (appsRes.data as EventApplication[]) || []) appMap.set(a.id, a);
        setApplications(appMap);

        // Resolve captain display names for the cards.
        const captainIds = Array.from(new Set(subs.map((s) => s.user_id)));
        if (captainIds.length > 0) {
            const { data: uData } = await fetchUsersByIds(captainIds);
            if (uData) {
                const m = new Map<string, UserLite>();
                for (const u of uData as UserLite[]) m.set(u.id, u);
                setUsers(m);
            }
        }

        // Load any pre-existing notes authored by the current admin.
        if (subs.length > 0 && user?.id) {
            const { data: nData } = await fetchNotesForSubmissions(subs.map((s) => s.id));
            if (nData) {
                const nMap = new Map<string, EventSubmissionNote>();
                for (const n of nData as EventSubmissionNote[]) {
                    if (n.author_id === user.id) nMap.set(n.submission_id, n);
                }
                setNotes(nMap);
            }
        }
    }, [event.id, user?.id]);

    useEffect(() => {
        void load();
    }, [load]);

    const allLocked = useMemo(() => {
        if (!submissions || submissions.length === 0) return false;
        return submissions.every((s) => s.locked_at !== null);
    }, [submissions]);

    const handleLockAll = useCallback(async () => {
        if (!submissions || submissions.length === 0) return;
        const ok = window.confirm(
            `Lock all ${submissions.length} submission(s) now? Teams will no longer be able to edit their entries. This is normally done automatically at submission_deadline.`,
        );
        if (!ok) return;
        setBusy(true);
        try {
            const { error: lockErr } = await lockSubmissionsForEvent(event.id);
            if (lockErr) window.alert(`Lock failed: ${lockErr.message}`);
            else await load();
        } finally {
            setBusy(false);
        }
    }, [event.id, load, submissions]);

    // ─── Render ──────────────────────────────────────────
    if (error) {
        return (
            <div className="p-6 border-2 border-brutal-red/40 bg-brutal-red/5 font-data text-sm">
                Failed to load submissions: {error}
            </div>
        );
    }

    if (submissions === null) {
        return <div className="p-12 text-center font-data text-brutal-dark/50">Loading submissions…</div>;
    }

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3">
                <span className="font-data text-sm text-brutal-dark/60">
                    {submissions.length} submission{submissions.length === 1 ? '' : 's'}
                </span>
                {event.submission_deadline && (
                    <span className="inline-flex items-center gap-1 font-data text-xs text-brutal-dark/60">
                        <Clock className="w-3 h-3" />
                        Deadline: {new Date(event.submission_deadline).toLocaleString()}
                    </span>
                )}
                <div className="ml-auto flex gap-2">
                    <button
                        type="button"
                        onClick={() => void load()}
                        disabled={busy}
                        className="inline-flex items-center gap-2 px-3 py-2 border-2 border-brutal-dark/30 hover:border-brutal-dark font-data text-sm transition-colors disabled:opacity-50"
                        title="Refresh"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => void handleLockAll()}
                        disabled={busy || submissions.length === 0 || allLocked}
                        className="inline-flex items-center gap-2 px-3 py-2 border-2 border-brutal-dark hover:bg-brutal-dark hover:text-white font-data text-sm font-bold transition-colors disabled:opacity-40"
                    >
                        {allLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                        {allLocked ? 'All locked' : 'Lock all now'}
                    </button>
                </div>
            </div>

            {/* Grid */}
            {submissions.length === 0 ? (
                <div className="p-12 text-center border-2 border-dashed border-brutal-dark/20 font-data text-brutal-dark/50">
                    No submissions yet.
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {submissions.map((s) => {
                        const app = s.application_id ? applications.get(s.application_id) : undefined;
                        const captain = users.get(s.user_id);
                        const existingNote = notes.get(s.id);
                        return (
                            <SubmissionCard
                                key={s.id}
                                submission={s}
                                teamName={app?.team_name ?? '(no application)'}
                                captainName={captain?.name || captain?.email || 'Unknown captain'}
                                authorId={user?.id ?? null}
                                existingNote={existingNote}
                                onNoteSaved={(n) => {
                                    setNotes((prev) => {
                                        const next = new Map(prev);
                                        next.set(s.id, n);
                                        return next;
                                    });
                                }}
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ─── Card ────────────────────────────────────────────────

interface SubmissionCardProps {
    submission: EventSubmission;
    teamName: string;
    captainName: string;
    authorId: string | null;
    existingNote: EventSubmissionNote | undefined;
    onNoteSaved: (n: EventSubmissionNote) => void;
}

function SubmissionCard({ submission, teamName, captainName, authorId, existingNote, onNoteSaved }: SubmissionCardProps) {
    const [noteDraft, setNoteDraft] = useState<string>(existingNote?.body ?? '');
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [bodyOpen, setBodyOpen] = useState(false);

    // Keep the draft in sync if the external existingNote changes
    // (e.g. after load finishes).
    useEffect(() => {
        setNoteDraft(existingNote?.body ?? '');
    }, [existingNote?.body]);

    const saveNote = useCallback(async () => {
        if (!authorId) return;
        setSaving(true);
        setSaveError(null);
        const { data, error } = await upsertSubmissionNote({
            submission_id: submission.id,
            author_id: authorId,
            body: noteDraft,
        });
        setSaving(false);
        if (error) {
            setSaveError(error.message);
            return;
        }
        if (data) onNoteSaved(data as EventSubmissionNote);
    }, [authorId, noteDraft, onNoteSaved, submission.id]);

    const isLocked = submission.locked_at !== null;

    return (
        <article className="border-2 border-brutal-dark bg-white p-4 space-y-3">
            <header className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <h3 className="font-heading font-bold text-xl truncate">{submission.title || '(untitled submission)'}</h3>
                    <p className="font-data text-sm text-brutal-dark/70 truncate">
                        {teamName} · {captainName}
                    </p>
                    <p className="font-data text-xs text-brutal-dark/50 mt-1">
                        {submission.submitted_at
                            ? `Submitted ${new Date(submission.submitted_at).toLocaleString()}`
                            : 'Draft — not yet submitted'}
                    </p>
                </div>
                <span
                    className={
                        'px-2 py-0.5 border text-xs font-bold font-data uppercase rounded inline-flex items-center gap-1 flex-shrink-0 ' +
                        (isLocked
                            ? 'bg-brutal-dark/5 text-brutal-dark/70 border-brutal-dark/30'
                            : 'bg-yellow-50 text-yellow-800 border-yellow-400')
                    }
                >
                    {isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                    {isLocked ? 'Locked' : 'Editable'}
                </span>
            </header>

            <div className="flex flex-wrap gap-2">
                {submission.repo_url && (
                    <a
                        href={submission.repo_url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-1 px-2 py-1 border-2 border-brutal-dark/30 hover:border-brutal-dark font-data text-xs transition-colors"
                    >
                        <Github className="w-3 h-3" /> Repo <ExternalLink className="w-3 h-3" />
                    </a>
                )}
                {submission.demo_url && (
                    <a
                        href={submission.demo_url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-1 px-2 py-1 border-2 border-brutal-dark/30 hover:border-brutal-dark font-data text-xs transition-colors"
                    >
                        <Globe className="w-3 h-3" /> Demo <ExternalLink className="w-3 h-3" />
                    </a>
                )}
            </div>

            {submission.description_blocks.length > 0 && (
                <div>
                    <button
                        type="button"
                        onClick={() => setBodyOpen((b) => !b)}
                        className="font-data text-xs underline text-brutal-dark/60 hover:text-brutal-dark"
                    >
                        {bodyOpen ? 'Hide description' : 'Show description'}
                    </button>
                    {bodyOpen && (
                        <div className="mt-2 pl-3 border-l-2 border-brutal-dark/10">
                            <EventBody blocks={submission.description_blocks} />
                        </div>
                    )}
                </div>
            )}

            {/* Private admin note */}
            <div className="pt-3 border-t border-brutal-dark/10 space-y-2">
                <label className="font-data text-xs font-bold uppercase tracking-wide text-brutal-dark/70 inline-flex items-center gap-1">
                    <StickyNote className="w-3 h-3" /> Private note (only you see this)
                </label>
                <textarea
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    rows={2}
                    placeholder="Scratch notes for judging…"
                    className="w-full px-2 py-1 border-2 border-brutal-dark/30 bg-white font-data text-sm focus:outline-none focus:border-brutal-red resize-y"
                />
                <div className="flex items-center justify-between">
                    <span className="font-data text-xs text-brutal-dark/40">
                        {saveError ? <span className="text-brutal-red">{saveError}</span> : existingNote?.updated_at ? `Saved ${new Date(existingNote.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Not saved yet'}
                    </span>
                    <button
                        type="button"
                        onClick={() => void saveNote()}
                        disabled={saving || noteDraft === (existingNote?.body ?? '')}
                        className="inline-flex items-center gap-1 px-2 py-1 border-2 border-brutal-dark hover:bg-brutal-dark hover:text-white font-data text-xs font-bold transition-colors disabled:opacity-40"
                    >
                        <Save className="w-3 h-3" /> {saving ? 'Saving…' : 'Save note'}
                    </button>
                </div>
            </div>
        </article>
    );
}
