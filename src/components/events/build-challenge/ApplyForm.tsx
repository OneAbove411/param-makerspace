import React, { useCallback, useEffect, useRef, useState } from 'react';
import { UserPlus, X, Search, Send, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { Event, EventApplication } from '../../../lib/database.types';
import {
    fetchMyApplicationForEvent,
    fetchUsersByIds,
    insertApplication,
    searchUsersForTeamPicker,
    updateApplication,
} from '../../../lib/api/buildChallenge';

interface UserLite {
    id: string;
    name: string | null;
    email: string | null;
    role?: string | null;
}

interface ApplyFormProps {
    event: Event;
    /** The logged-in user's app_user.id. */
    userId: string;
    /** Team size cap (falls back to 4 when unset). */
    teamSizeMax?: number | null;
}

/**
 * ApplyForm — self-serve application form shown to logged-in users on
 * a Build Challenge event page while applications are open.
 *
 * Captures:
 *   - team_name
 *   - team_member_user_ids (via platform user search)
 *   - pitch
 *
 * If the user has already applied, we load their row and switch to
 * edit-mode (still possible while status = 'pending'; captain can
 * also withdraw). Once the admin shortlists or rejects, the form
 * becomes read-only.
 */
export function ApplyForm({ event, userId, teamSizeMax }: ApplyFormProps) {
    const maxMembers = Math.max(1, (teamSizeMax ?? 4) - 1); // minus the captain

    const [existing, setExisting] = useState<EventApplication | null>(null);
    const [loading, setLoading] = useState(true);
    const [teamName, setTeamName] = useState('');
    const [members, setMembers] = useState<UserLite[]>([]);
    const [pitch, setPitch] = useState('');

    const [submitting, setSubmitting] = useState(false);
    const [banner, setBanner] = useState<{ tone: 'ok' | 'error'; message: string } | null>(null);

    // ─── Load existing application ─────────────────────────
    useEffect(() => {
        let cancelled = false;
        (async () => {
            const { data, error } = await fetchMyApplicationForEvent(event.id, userId);
            if (cancelled) return;
            if (error) {
                setBanner({ tone: 'error', message: `Failed to check application status: ${error.message}` });
                setLoading(false);
                return;
            }
            if (data) {
                const existingRow = data as EventApplication;
                setExisting(existingRow);
                setTeamName(existingRow.team_name);
                setPitch(existingRow.pitch);
                if (existingRow.team_member_user_ids.length > 0) {
                    const { data: uData } = await fetchUsersByIds(existingRow.team_member_user_ids);
                    if (uData) setMembers(uData as UserLite[]);
                }
            }
            setLoading(false);
        })();
        return () => {
            cancelled = true;
        };
    }, [event.id, userId]);

    // ─── Team picker state ─────────────────────────────────
    const [query, setQuery] = useState('');
    const [searchResults, setSearchResults] = useState<UserLite[]>([]);
    const [searchBusy, setSearchBusy] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (query.trim().length < 2) {
            setSearchResults([]);
            return;
        }
        debounceRef.current = setTimeout(async () => {
            setSearchBusy(true);
            const { data, error } = await searchUsersForTeamPicker(query, userId);
            setSearchBusy(false);
            if (!error && data) setSearchResults(data as UserLite[]);
        }, 250);
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [query, userId]);

    const addMember = (u: UserLite) => {
        if (members.some((m) => m.id === u.id)) return;
        if (members.length >= maxMembers) return;
        setMembers([...members, u]);
        setQuery('');
        setSearchResults([]);
    };

    const removeMember = (id: string) => {
        setMembers(members.filter((m) => m.id !== id));
    };

    // ─── Submit ────────────────────────────────────────────
    const canEdit = !existing || existing.status === 'pending';

    const handleSubmit = useCallback(async () => {
        setBanner(null);

        if (!teamName.trim()) {
            setBanner({ tone: 'error', message: 'Team name is required.' });
            return;
        }
        if (pitch.trim().length < 10) {
            setBanner({ tone: 'error', message: 'Please write at least a short pitch (10+ characters).' });
            return;
        }

        setSubmitting(true);

        if (existing) {
            const { error } = await updateApplication(existing.id, {
                team_name: teamName.trim(),
                team_member_user_ids: members.map((m) => m.id),
                pitch: pitch.trim(),
            });
            setSubmitting(false);
            if (error) {
                setBanner({ tone: 'error', message: `Update failed: ${error.message}` });
                return;
            }
            setBanner({ tone: 'ok', message: 'Application updated.' });
            setExisting({
                ...existing,
                team_name: teamName.trim(),
                team_member_user_ids: members.map((m) => m.id),
                pitch: pitch.trim(),
            });
        } else {
            const { data, error } = await insertApplication({
                event_id: event.id,
                user_id: userId,
                team_name: teamName.trim(),
                team_member_user_ids: members.map((m) => m.id),
                pitch: pitch.trim(),
            });
            setSubmitting(false);
            if (error) {
                setBanner({ tone: 'error', message: `Submit failed: ${error.message}` });
                return;
            }
            if (data) {
                setExisting(data as EventApplication);
                setBanner({ tone: 'ok', message: 'Application submitted! You\'ll hear back after the shortlist deadline.' });
            }
        }
    }, [event.id, existing, members, pitch, teamName, userId]);

    const handleWithdraw = useCallback(async () => {
        if (!existing) return;
        const ok = window.confirm('Withdraw your application? You can re-apply before the shortlist deadline.');
        if (!ok) return;
        setSubmitting(true);
        const { error } = await updateApplication(existing.id, { status: 'withdrawn' });
        setSubmitting(false);
        if (error) {
            setBanner({ tone: 'error', message: `Withdraw failed: ${error.message}` });
            return;
        }
        setExisting({ ...existing, status: 'withdrawn' });
        setBanner({ tone: 'ok', message: 'Application withdrawn.' });
    }, [existing]);

    // ─── Render ────────────────────────────────────────────
    if (loading) {
        return <div className="p-6 font-data text-sm text-brutal-dark/50">Loading application…</div>;
    }

    if (existing && existing.status !== 'pending' && existing.status !== 'withdrawn') {
        // Decision made — surface the status rather than the form.
        return <ApplicationStatusCard application={existing} />;
    }

    return (
        <section className="border-2 border-brutal-dark bg-white p-6 space-y-4">
            <header>
                <h3 className="font-heading font-bold text-2xl uppercase flex items-center gap-2">
                    <UserPlus className="w-6 h-6 text-brutal-red" />
                    {existing ? 'Edit your application' : 'Apply as a team'}
                </h3>
                <p className="font-data text-sm text-brutal-dark/60 mt-1">
                    Captain: you. Add up to {maxMembers} other teammate{maxMembers === 1 ? '' : 's'}.
                </p>
                {event.shortlist_deadline && (
                    <p className="font-data text-xs text-brutal-dark/50 mt-1">
                        Applications close {new Date(event.shortlist_deadline).toLocaleString()}.
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

            {/* Team name */}
            <label className="block space-y-1">
                <div className="font-data text-xs font-bold uppercase tracking-wide text-brutal-dark/70">Team name <span className="text-brutal-red">*</span></div>
                <input
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    disabled={!canEdit}
                    placeholder="e.g. The Claw Crew"
                    className="w-full px-3 py-2 border-2 border-brutal-dark bg-white font-data text-sm focus:outline-none focus:border-brutal-red disabled:bg-brutal-dark/5"
                />
            </label>

            {/* Team member picker */}
            <div className="space-y-2">
                <div className="font-data text-xs font-bold uppercase tracking-wide text-brutal-dark/70">
                    Team members <span className="font-normal text-brutal-dark/40">({members.length}/{maxMembers})</span>
                </div>

                {/* Chips */}
                {members.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {members.map((m) => (
                            <span
                                key={m.id}
                                className="inline-flex items-center gap-1 px-2 py-1 border-2 border-brutal-dark bg-brutal-dark/5 font-data text-xs"
                            >
                                <span className="font-bold">{m.name || m.email}</span>
                                {canEdit && (
                                    <button
                                        type="button"
                                        onClick={() => removeMember(m.id)}
                                        className="text-brutal-dark/60 hover:text-brutal-red"
                                        aria-label={`Remove ${m.name}`}
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </span>
                        ))}
                    </div>
                )}

                {canEdit && members.length < maxMembers && (
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-brutal-dark/40" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search platform users by name or email…"
                            className="w-full pl-9 pr-3 py-2 border-2 border-brutal-dark/30 bg-white font-data text-sm focus:outline-none focus:border-brutal-red"
                        />
                        {(searchBusy || searchResults.length > 0) && (
                            <ul className="absolute z-10 top-full left-0 right-0 mt-1 max-h-60 overflow-y-auto border-2 border-brutal-dark bg-white shadow-[4px_4px_0_rgba(0,0,0,0.15)]">
                                {searchBusy && (
                                    <li className="px-3 py-2 font-data text-xs text-brutal-dark/50 flex items-center gap-2">
                                        <Loader2 className="w-3 h-3 animate-spin" /> Searching…
                                    </li>
                                )}
                                {!searchBusy && searchResults.length === 0 && (
                                    <li className="px-3 py-2 font-data text-xs text-brutal-dark/50">
                                        No matches.
                                    </li>
                                )}
                                {searchResults.map((u) => (
                                    <li key={u.id}>
                                        <button
                                            type="button"
                                            onClick={() => addMember(u)}
                                            disabled={members.some((m) => m.id === u.id)}
                                            className="w-full text-left px-3 py-2 font-data text-sm hover:bg-brutal-dark/5 disabled:opacity-40 disabled:hover:bg-transparent"
                                        >
                                            <span className="font-bold">{u.name || '(no name)'}</span>
                                            <span className="text-brutal-dark/60 ml-2">{u.email}</span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}
            </div>

            {/* Pitch */}
            <label className="block space-y-1">
                <div className="font-data text-xs font-bold uppercase tracking-wide text-brutal-dark/70">Pitch <span className="text-brutal-red">*</span></div>
                <textarea
                    value={pitch}
                    onChange={(e) => setPitch(e.target.value)}
                    disabled={!canEdit}
                    rows={4}
                    placeholder="Why should your team be shortlisted? What's your idea?"
                    className="w-full px-3 py-2 border-2 border-brutal-dark bg-white font-data text-sm focus:outline-none focus:border-brutal-red disabled:bg-brutal-dark/5 resize-y"
                />
                <div className="font-data text-xs text-brutal-dark/40">{pitch.length} characters</div>
            </label>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 justify-end">
                {existing && existing.status === 'withdrawn' && (
                    <p className="font-data text-xs text-brutal-dark/60 mr-auto self-center">
                        Withdrawn. Re-apply by updating and submitting again.
                    </p>
                )}
                {existing && canEdit && (
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
                    {existing && existing.status !== 'withdrawn' ? 'Update application' : 'Submit application'}
                </button>
            </div>
        </section>
    );
}

function ApplicationStatusCard({ application }: { application: EventApplication }) {
    const style = (() => {
        switch (application.status) {
            case 'shortlisted':
                return { border: 'border-green-500', bg: 'bg-green-50', text: 'text-green-800', label: 'Shortlisted! Keep scrolling for the submission form.' };
            case 'rejected':
                return { border: 'border-brutal-red', bg: 'bg-brutal-red/5', text: 'text-brutal-red', label: 'Your application wasn\'t shortlisted this time. Thanks for applying!' };
            default:
                return { border: 'border-brutal-dark/30', bg: 'bg-brutal-dark/5', text: 'text-brutal-dark', label: application.status };
        }
    })();
    return (
        <section className={`border-2 ${style.border} ${style.bg} p-6 space-y-2`}>
            <h3 className="font-heading font-bold text-xl uppercase">{application.team_name}</h3>
            <p className={`font-data text-sm ${style.text}`}>{style.label}</p>
        </section>
    );
}
