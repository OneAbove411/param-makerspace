import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Rocket, Lock, Loader2, AlertCircle, CheckCircle2, ExternalLink } from 'lucide-react';
import type { Event, EventApplication, EventBlock, EventSubmission } from '../../../lib/database.types';
import { BlockEditor } from '../BlockEditor';
import { EventBody } from '../EventBody';
import {
    fetchMySubmissionForApplication,
    insertSubmission,
    updateSubmission,
} from '../../../lib/api/buildChallenge';

interface SubmitFormProps {
    event: Event;
    application: EventApplication;
    /** The logged-in user's app_user.id. Used as user_id when inserting a new submission. */
    userId: string;
}

/**
 * SubmitForm — form shown to shortlisted teams during submissions_open.
 *
 * Visibility rules (enforced by caller — we assume the caller already
 * checked phase === 'submissions_open' AND application.status === 'shortlisted'):
 *   - captain OR any tagged team member can load and edit.
 *   - locked_at IS NULL → editable.
 *   - locked_at IS NOT NULL → read-only confirmation view.
 *
 * Fields:
 *   - title (required)
 *   - repo_url (optional, URL-validated)
 *   - demo_url (optional, URL-validated)
 *   - description_blocks (block editor)
 *
 * submitted_at is set server-side (in insertSubmission) on the first insert
 * and never touched on updates. locked_at is only ever written by admins
 * via lockSubmissionsForEvent.
 */
export function SubmitForm({ event, application, userId }: SubmitFormProps) {
    const [existing, setExisting] = useState<EventSubmission | null>(null);
    const [loading, setLoading] = useState(true);
    const [title, setTitle] = useState('');
    const [repoUrl, setRepoUrl] = useState('');
    const [demoUrl, setDemoUrl] = useState('');
    const [blocks, setBlocks] = useState<EventBlock[]>([]);

    const [submitting, setSubmitting] = useState(false);
    const [banner, setBanner] = useState<{ tone: 'ok' | 'error'; message: string } | null>(null);

    // ─── Hydrate existing submission ─────────────────────────
    useEffect(() => {
        let cancelled = false;
        (async () => {
            const { data, error } = await fetchMySubmissionForApplication(application.id);
            if (cancelled) return;
            if (error) {
                setBanner({ tone: 'error', message: `Failed to load submission: ${error.message}` });
                setLoading(false);
                return;
            }
            if (data) {
                const row = data as EventSubmission;
                setExisting(row);
                setTitle(row.title ?? '');
                setRepoUrl(row.repo_url ?? '');
                setDemoUrl(row.demo_url ?? '');
                setBlocks(Array.isArray(row.description_blocks) ? row.description_blocks : []);
            }
            setLoading(false);
        })();
        return () => {
            cancelled = true;
        };
    }, [application.id]);

    const isLocked = Boolean(existing?.locked_at);
    const canEdit = !isLocked;

    // ─── URL validation ──────────────────────────────────────
    const isValidHttpUrl = (value: string): boolean => {
        if (!value.trim()) return true; // empty is allowed
        try {
            const u = new URL(value.trim());
            return u.protocol === 'http:' || u.protocol === 'https:';
        } catch {
            return false;
        }
    };

    const repoValid = useMemo(() => isValidHttpUrl(repoUrl), [repoUrl]);
    const demoValid = useMemo(() => isValidHttpUrl(demoUrl), [demoUrl]);

    // ─── Submit ──────────────────────────────────────────────
    const handleSubmit = useCallback(async () => {
        setBanner(null);
        if (!title.trim()) {
            setBanner({ tone: 'error', message: 'Project title is required.' });
            return;
        }
        if (!repoValid) {
            setBanner({ tone: 'error', message: 'Repo URL must start with http:// or https://' });
            return;
        }
        if (!demoValid) {
            setBanner({ tone: 'error', message: 'Demo URL must start with http:// or https://' });
            return;
        }

        setSubmitting(true);

        if (existing) {
            const { error } = await updateSubmission(existing.id, {
                title: title.trim(),
                repo_url: repoUrl.trim() || null,
                demo_url: demoUrl.trim() || null,
                description_blocks: blocks,
            });
            setSubmitting(false);
            if (error) {
                setBanner({ tone: 'error', message: `Update failed: ${error.message}` });
                return;
            }
            setExisting({
                ...existing,
                title: title.trim(),
                repo_url: repoUrl.trim() || null,
                demo_url: demoUrl.trim() || null,
                description_blocks: blocks,
            });
            setBanner({ tone: 'ok', message: 'Submission updated.' });
        } else {
            const { data, error } = await insertSubmission({
                event_id: event.id,
                user_id: userId,
                application_id: application.id,
                title: title.trim(),
                repo_url: repoUrl.trim(),
                demo_url: demoUrl.trim(),
                description_blocks: blocks,
            });
            setSubmitting(false);
            if (error) {
                setBanner({ tone: 'error', message: `Submit failed: ${error.message}` });
                return;
            }
            if (data) {
                setExisting(data as EventSubmission);
                setBanner({ tone: 'ok', message: 'Submission saved! You can keep editing until the submission deadline.' });
            }
        }
    }, [application.id, blocks, demoUrl, demoValid, event.id, existing, repoUrl, repoValid, title, userId]);

    // ─── Render ──────────────────────────────────────────────
    if (loading) {
        return <div className="p-6 font-data text-sm text-brutal-dark/50">Loading submission…</div>;
    }

    if (isLocked && existing) {
        return <LockedSubmissionView submission={existing} />;
    }

    return (
        <section className="border-2 border-brutal-dark bg-white p-6 space-y-4">
            <header>
                <h3 className="font-heading font-bold text-2xl uppercase flex items-center gap-2">
                    <Rocket className="w-6 h-6 text-brutal-red" />
                    {existing ? 'Edit your submission' : 'Submit your project'}
                </h3>
                <p className="font-data text-sm text-brutal-dark/60 mt-1">
                    Team: <span className="font-bold">{application.team_name}</span>
                </p>
                {event.submission_deadline && (
                    <p className="font-data text-xs text-brutal-dark/50 mt-1">
                        Editing closes {new Date(event.submission_deadline).toLocaleString()}.
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

            {/* Title */}
            <label className="block space-y-1">
                <div className="font-data text-xs font-bold uppercase tracking-wide text-brutal-dark/70">
                    Project title <span className="text-brutal-red">*</span>
                </div>
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={!canEdit}
                    placeholder="e.g. Claw-Bot Mk III"
                    className="w-full px-3 py-2 border-2 border-brutal-dark bg-white font-data text-sm focus:outline-none focus:border-brutal-red disabled:bg-brutal-dark/5"
                />
            </label>

            {/* Repo URL */}
            <label className="block space-y-1">
                <div className="font-data text-xs font-bold uppercase tracking-wide text-brutal-dark/70">Repo URL</div>
                <input
                    type="url"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    disabled={!canEdit}
                    placeholder="https://github.com/your-team/your-repo"
                    className={
                        'w-full px-3 py-2 border-2 bg-white font-data text-sm focus:outline-none disabled:bg-brutal-dark/5 ' +
                        (repoValid ? 'border-brutal-dark focus:border-brutal-red' : 'border-brutal-red')
                    }
                />
                {!repoValid && (
                    <p className="font-data text-xs text-brutal-red">Must start with http:// or https://</p>
                )}
            </label>

            {/* Demo URL */}
            <label className="block space-y-1">
                <div className="font-data text-xs font-bold uppercase tracking-wide text-brutal-dark/70">Demo URL</div>
                <input
                    type="url"
                    value={demoUrl}
                    onChange={(e) => setDemoUrl(e.target.value)}
                    disabled={!canEdit}
                    placeholder="https://your-demo.example.com"
                    className={
                        'w-full px-3 py-2 border-2 bg-white font-data text-sm focus:outline-none disabled:bg-brutal-dark/5 ' +
                        (demoValid ? 'border-brutal-dark focus:border-brutal-red' : 'border-brutal-red')
                    }
                />
                {!demoValid && (
                    <p className="font-data text-xs text-brutal-red">Must start with http:// or https://</p>
                )}
            </label>

            {/* Description blocks */}
            <div className="space-y-2">
                <BlockEditor
                    blocks={blocks}
                    onChange={setBlocks}
                    label="Project description"
                    hint="Describe what you built, how it works, and what you'd do next."
                />
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 justify-end">
                <button
                    type="button"
                    onClick={() => void handleSubmit()}
                    disabled={submitting || !canEdit}
                    className="inline-flex items-center gap-2 px-4 py-2 border-2 border-brutal-dark bg-brutal-dark text-white hover:bg-brutal-dark/90 font-data text-sm font-bold transition-colors disabled:opacity-40"
                >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                    {existing ? 'Save changes' : 'Submit project'}
                </button>
            </div>
        </section>
    );
}

function LockedSubmissionView({ submission }: { submission: EventSubmission }) {
    return (
        <section className="border-2 border-brutal-dark bg-brutal-bg p-6 space-y-4">
            <header className="flex items-start gap-2">
                <Lock className="w-6 h-6 text-brutal-dark mt-1" />
                <div className="flex-1">
                    <h3 className="font-heading font-bold text-2xl uppercase">{submission.title || '(untitled)'}</h3>
                    <p className="font-data text-xs text-brutal-dark/60 mt-1">
                        Locked{submission.locked_at ? ` on ${new Date(submission.locked_at).toLocaleString()}` : ''}. No further edits allowed.
                    </p>
                </div>
            </header>
            <div className="flex flex-wrap gap-3">
                {submission.repo_url && (
                    <a
                        href={submission.repo_url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-1 font-data text-sm text-brutal-red hover:underline"
                    >
                        <ExternalLink className="w-3 h-3" /> Repo
                    </a>
                )}
                {submission.demo_url && (
                    <a
                        href={submission.demo_url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-1 font-data text-sm text-brutal-red hover:underline"
                    >
                        <ExternalLink className="w-3 h-3" /> Demo
                    </a>
                )}
            </div>
            {Array.isArray(submission.description_blocks) && submission.description_blocks.length > 0 && (
                <EventBody blocks={submission.description_blocks} />
            )}
        </section>
    );
}
