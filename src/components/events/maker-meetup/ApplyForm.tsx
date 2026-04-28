import React, { useCallback, useEffect, useState } from 'react';
import { UserPlus, X, Send, Loader2, AlertCircle, CheckCircle2, Plus, Link as LinkIcon, Trash2 } from 'lucide-react';
import type { Event, EventApplication, PastWorkLink } from '../../../lib/database.types';
import {
    insertMeetupApplication,
    updateMeetupApplication,
} from '../../../lib/api/makerMeetup';
import { fetchMyApplicationForEvent } from '../../../lib/api/buildChallenge';

interface ApplyFormProps {
    event: Event;
    /** The logged-in user's app_user.id. */
    userId: string;
    /** Pre-fill display name from the auth profile. */
    defaultDisplayName?: string;
}

/**
 * Maker Meetup ApplyForm — single-applicant application shown during
 * the 'applications_open' phase.
 *
 * Fields:
 *   - Applicant display name (stored on event_application.team_name)
 *   - Why you want to join (pitch)
 *   - Past work links — JSONB array of { label, url }
 *
 * States:
 *   - no existing row → create
 *   - existing pending → edit or withdraw
 *   - existing shortlisted/selected/rejected → read-only status card
 */
export function ApplyForm({ event, userId, defaultDisplayName }: ApplyFormProps) {
    const [existing, setExisting] = useState<EventApplication | null>(null);
    const [loading, setLoading] = useState(true);
    const [displayName, setDisplayName] = useState(defaultDisplayName ?? '');
    const [pitch, setPitch] = useState('');
    const [links, setLinks] = useState<PastWorkLink[]>([]);

    const [submitting, setSubmitting] = useState(false);
    const [banner, setBanner] = useState<{ tone: 'ok' | 'error'; message: string } | null>(null);

    // Hydrate existing application
    useEffect(() => {
        let cancelled = false;
        (async () => {
            const { data, error } = await fetchMyApplicationForEvent(event.id, userId);
            if (cancelled) return;
            if (error) {
                setBanner({ tone: 'error', message: `Failed to check application: ${error.message}` });
                setLoading(false);
                return;
            }
            if (data) {
                const row = data as EventApplication;
                setExisting(row);
                setDisplayName(row.team_name);
                setPitch(row.pitch);
                setLinks(Array.isArray(row.past_work_links) ? row.past_work_links : []);
            }
            setLoading(false);
        })();
        return () => {
            cancelled = true;
        };
    }, [event.id, userId]);

    const canEdit = !existing || existing.status === 'pending' || existing.status === 'withdrawn';

    // ─── Link editor helpers ─────────────────────────────────
    const addLink = () => setLinks([...links, { label: '', url: '' }]);
    const removeLink = (idx: number) => setLinks(links.filter((_, i) => i !== idx));
    const updateLink = (idx: number, patch: Partial<PastWorkLink>) => {
        setLinks(links.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
    };

    const isValidHttpUrl = (value: string): boolean => {
        if (!value.trim()) return false;
        try {
            const u = new URL(value.trim());
            return u.protocol === 'http:' || u.protocol === 'https:';
        } catch {
            return false;
        }
    };

    // ─── Submit ──────────────────────────────────────────────
    const handleSubmit = useCallback(async () => {
        setBanner(null);
        if (!displayName.trim()) {
            setBanner({ tone: 'error', message: 'Display name is required.' });
            return;
        }
        if (pitch.trim().length < 20) {
            setBanner({ tone: 'error', message: 'Please write a bit more — at least 20 characters.' });
            return;
        }
        // Normalize links: drop entirely-empty rows, validate the rest.
        const cleanedLinks = links
            .map((l) => ({ label: l.label.trim(), url: l.url.trim() }))
            .filter((l) => l.label || l.url);
        for (const link of cleanedLinks) {
            if (!link.url) {
                setBanner({ tone: 'error', message: `Link "${link.label}" is missing a URL.` });
                return;
            }
            if (!isValidHttpUrl(link.url)) {
                setBanner({ tone: 'error', message: `Link URL "${link.url}" must start with http:// or https://.` });
                return;
            }
        }

        setSubmitting(true);
        if (existing) {
            const { error } = await updateMeetupApplication(existing.id, {
                applicant_display_name: displayName.trim(),
                pitch: pitch.trim(),
                past_work_links: cleanedLinks,
                // If withdrawn, re-submitting puts them back in the pending queue.
                status: existing.status === 'withdrawn' ? 'pending' : undefined,
            });
            setSubmitting(false);
            if (error) {
                setBanner({ tone: 'error', message: `Update failed: ${error.message}` });
                return;
            }
            setExisting({
                ...existing,
                team_name: displayName.trim(),
                pitch: pitch.trim(),
                past_work_links: cleanedLinks,
                status: existing.status === 'withdrawn' ? 'pending' : existing.status,
            });
            setBanner({ tone: 'ok', message: 'Application updated.' });
        } else {
            const { data, error } = await insertMeetupApplication({
                event_id: event.id,
                user_id: userId,
                applicant_display_name: displayName.trim(),
                pitch: pitch.trim(),
                past_work_links: cleanedLinks,
            });
            setSubmitting(false);
            if (error) {
                setBanner({ tone: 'error', message: `Submit failed: ${error.message}` });
                return;
            }
            if (data) {
                setExisting(data as EventApplication);
                setBanner({ tone: 'ok', message: 'Application submitted! We\'ll reach out after the review window closes.' });
            }
        }
    }, [displayName, event.id, existing, links, pitch, userId]);

    const handleWithdraw = useCallback(async () => {
        if (!existing) return;
        const ok = window.confirm('Withdraw your application? You can re-submit before the deadline.');
        if (!ok) return;
        setSubmitting(true);
        const { error } = await updateMeetupApplication(existing.id, { status: 'withdrawn' });
        setSubmitting(false);
        if (error) {
            setBanner({ tone: 'error', message: `Withdraw failed: ${error.message}` });
            return;
        }
        setExisting({ ...existing, status: 'withdrawn' });
        setBanner({ tone: 'ok', message: 'Application withdrawn.' });
    }, [existing]);

    if (loading) {
        return <div className="p-6 font-data text-sm text-brutal-dark/50">Loading application…</div>;
    }

    // Decided (shortlisted / selected / rejected) → status card, form hidden
    if (existing && (existing.status === 'shortlisted' || existing.status === 'selected' || existing.status === 'rejected')) {
        return <ApplicationStatusCard application={existing} />;
    }

    return (
        <section className="border-2 border-brutal-dark bg-white p-6 space-y-4">
            <header>
                <h3 className="font-heading font-bold text-2xl uppercase flex items-center gap-2">
                    <UserPlus className="w-6 h-6 text-brutal-red" />
                    {existing ? 'Edit your application' : 'Apply to attend'}
                </h3>
                <p className="font-data text-sm text-brutal-dark/60 mt-1">
                    Single-applicant — one form per person.
                </p>
                {event.application_deadline && (
                    <p className="font-data text-xs text-brutal-dark/50 mt-1">
                        Applications close {new Date(event.application_deadline).toLocaleString()}.
                    </p>
                )}
            </header>

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

            {/* Display name */}
            <label className="block space-y-1">
                <div className="font-data text-xs font-bold uppercase tracking-wide text-brutal-dark/70">
                    Your display name <span className="text-brutal-red">*</span>
                </div>
                <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    disabled={!canEdit}
                    placeholder="e.g. Asha Rao"
                    className="w-full px-3 py-2 border-2 border-brutal-dark bg-white font-data text-sm focus:outline-none focus:border-brutal-red disabled:bg-brutal-dark/5"
                />
            </label>

            {/* Pitch */}
            <label className="block space-y-1">
                <div className="font-data text-xs font-bold uppercase tracking-wide text-brutal-dark/70">
                    Why do you want to join? <span className="text-brutal-red">*</span>
                </div>
                <textarea
                    value={pitch}
                    onChange={(e) => setPitch(e.target.value)}
                    disabled={!canEdit}
                    rows={5}
                    placeholder="What brings you to this meetup? What would you like to learn or share?"
                    className="w-full px-3 py-2 border-2 border-brutal-dark bg-white font-data text-sm focus:outline-none focus:border-brutal-red disabled:bg-brutal-dark/5 resize-y"
                />
                <div className="font-data text-xs text-brutal-dark/40">{pitch.length} characters</div>
            </label>

            {/* Past work links */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <div className="font-data text-xs font-bold uppercase tracking-wide text-brutal-dark/70">
                        Past work links <span className="font-normal text-brutal-dark/40">(optional)</span>
                    </div>
                    {canEdit && (
                        <button
                            type="button"
                            onClick={addLink}
                            className="inline-flex items-center gap-1 font-data text-xs font-bold text-brutal-red hover:underline"
                        >
                            <Plus className="w-3 h-3" /> Add link
                        </button>
                    )}
                </div>

                {links.length === 0 && (
                    <p className="font-data text-xs text-brutal-dark/40">
                        Share any relevant GitHub repos, portfolio pages, project posts, etc.
                    </p>
                )}

                <ul className="space-y-2">
                    {links.map((l, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                            <LinkIcon className="w-4 h-4 text-brutal-dark/40 mt-3 flex-shrink-0" />
                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-[1fr_2fr] gap-2">
                                <input
                                    type="text"
                                    value={l.label}
                                    onChange={(e) => updateLink(idx, { label: e.target.value })}
                                    disabled={!canEdit}
                                    placeholder="Label (e.g. GitHub)"
                                    className="px-2 py-1.5 border-2 border-brutal-dark/40 bg-white font-data text-xs focus:outline-none focus:border-brutal-red disabled:bg-brutal-dark/5"
                                />
                                <input
                                    type="url"
                                    value={l.url}
                                    onChange={(e) => updateLink(idx, { url: e.target.value })}
                                    disabled={!canEdit}
                                    placeholder="https://…"
                                    className="px-2 py-1.5 border-2 border-brutal-dark/40 bg-white font-data text-xs focus:outline-none focus:border-brutal-red disabled:bg-brutal-dark/5"
                                />
                            </div>
                            {canEdit && (
                                <button
                                    type="button"
                                    onClick={() => removeLink(idx)}
                                    className="mt-2 text-brutal-dark/50 hover:text-brutal-red"
                                    aria-label="Remove link"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 justify-end">
                {existing && existing.status === 'withdrawn' && (
                    <p className="font-data text-xs text-brutal-dark/60 mr-auto self-center">
                        Withdrawn. Re-submit to return to the pending queue.
                    </p>
                )}
                {existing && existing.status === 'pending' && (
                    <button
                        type="button"
                        onClick={() => void handleWithdraw()}
                        disabled={submitting}
                        className="inline-flex items-center gap-2 px-3 py-2 border-2 border-brutal-red/40 text-brutal-red hover:bg-brutal-red hover:text-white font-data text-sm font-bold transition-colors disabled:opacity-40"
                    >
                        <X className="w-4 h-4" /> Withdraw
                    </button>
                )}
                <button
                    type="button"
                    onClick={() => void handleSubmit()}
                    disabled={submitting || !canEdit}
                    className="inline-flex items-center gap-2 px-4 py-2 border-2 border-brutal-dark bg-brutal-dark text-white hover:bg-brutal-dark/90 font-data text-sm font-bold transition-colors disabled:opacity-40"
                >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {existing && existing.status === 'withdrawn'
                        ? 'Re-submit application'
                        : existing
                            ? 'Update application'
                            : 'Submit application'}
                </button>
            </div>
        </section>
    );
}

function ApplicationStatusCard({ application }: { application: EventApplication }) {
    const style = (() => {
        switch (application.status) {
            case 'shortlisted':
                return { border: 'border-green-500', bg: 'bg-green-50', text: 'text-green-800', label: 'Shortlisted! Look for the "Book your interview slot" section below.' };
            case 'selected':
                return { border: 'border-brutal-red', bg: 'bg-brutal-red/5', text: 'text-brutal-red', label: 'You\'re in — see joining details below.' };
            case 'rejected':
                return { border: 'border-brutal-dark/30', bg: 'bg-brutal-bg', text: 'text-brutal-dark', label: 'Thanks for applying! This meetup isn\'t the right fit — we\'ll keep you posted on future ones.' };
            default:
                return { border: 'border-brutal-dark/30', bg: 'bg-brutal-bg', text: 'text-brutal-dark', label: application.status };
        }
    })();
    return (
        <section className={`border-2 ${style.border} ${style.bg} p-6 space-y-2`}>
            <h3 className="font-heading font-bold text-xl uppercase">{application.team_name}</h3>
            <p className={`font-data text-sm ${style.text}`}>{style.label}</p>
        </section>
    );
}
