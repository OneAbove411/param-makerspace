import React, { useState, useMemo } from 'react';
import { Send, CheckCircle2, Plus, Trash2, ExternalLink } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { speakerPitchApi } from '../../lib/api';
import { BlockEditor } from '../events/BlockEditor';
import { EVENT_TYPE_LABELS, EVENT_TYPE_TAGLINES } from '../../pages/admin/event-wizard/wizardTypes';
import type { EventBlock, EventType } from '../../lib/database.types';

/**
 * PitchForm — public speaker/presenter pitch submission (P11).
 *
 * Rendered in two places:
 *   1. The standalone /speak route (full-page framing provided by the
 *      parent route — this component only renders the form card).
 *   2. As a compact footer CTA + inline form on every public event page.
 *
 * The form is intentionally event-agnostic: a pitcher picks which
 * cadence (Build Challenge / Maker Meetup / Tech Tuesday) they think
 * fits best, not a specific dated event. Admins triage pitches
 * globally at /admin/speakers.
 *
 * Access:
 *   • Signed-in and anonymous users can both submit. RLS enforces
 *     status='new' + reviewer fields null on first write.
 *   • When the user is signed in, name/email are prefilled.
 *
 * Guardrails:
 *   • topic_abstract capped at 5 blocks (server also accepts any
 *     length but the UI is the main guard).
 *   • past_talk_links capped at 3 slots here (the DB CHECK caps at 10).
 */

const MAX_ABSTRACT_BLOCKS = 5;
const MAX_PAST_LINKS = 3;

interface PitchFormProps {
    /** When provided, pre-selects the event type. */
    defaultEventType?: EventType;
    /** Compact mode tightens spacing for use inside event-detail footers. */
    compact?: boolean;
}

export function PitchForm({ defaultEventType, compact = false }: PitchFormProps) {
    const { user } = useAuth();

    const [name, setName] = useState(user?.name ?? '');
    const [email, setEmail] = useState(user?.email ?? '');
    const [topicTitle, setTopicTitle] = useState('');
    const [abstract, setAbstract] = useState<EventBlock[]>([]);
    const [preferredType, setPreferredType] = useState<EventType>(defaultEventType ?? 'tech_tuesday');
    const [pastLinks, setPastLinks] = useState<string[]>(['']);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [submitted, setSubmitted] = useState(false);

    const canAddBlock = abstract.length < MAX_ABSTRACT_BLOCKS;

    // Valid URL guard — accept http(s) only, empty strings are ignored.
    const linkErrors = useMemo(() => {
        return pastLinks.map((v) => {
            const t = v.trim();
            if (!t) return null;
            try {
                const u = new URL(t);
                if (u.protocol !== 'http:' && u.protocol !== 'https:') {
                    return 'Must start with http(s)://';
                }
                return null;
            } catch {
                return 'Not a valid URL';
            }
        });
    }, [pastLinks]);

    const canSubmit =
        name.trim().length > 0
        && /.+@.+\..+/.test(email.trim())
        && topicTitle.trim().length >= 3
        && linkErrors.every((e) => e === null)
        && !submitting;

    const handleAddLink = () => {
        if (pastLinks.length < MAX_PAST_LINKS) {
            setPastLinks([...pastLinks, '']);
        }
    };

    const handleRemoveLink = (i: number) => {
        const next = pastLinks.filter((_, idx) => idx !== i);
        setPastLinks(next.length ? next : ['']);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSubmit) return;
        setSubmitting(true);
        setError(null);
        const { error: insertError } = await speakerPitchApi.createPitch({
            name,
            email,
            topic_title: topicTitle,
            // Guard server-side too by trimming empties.
            topic_abstract: abstract,
            preferred_event_type: preferredType,
            past_talk_links: pastLinks.filter((u) => u.trim().length > 0),
            user_id: user?.id ?? null,
        });
        setSubmitting(false);
        if (insertError) {
            setError(insertError.message);
            return;
        }
        setSubmitted(true);
    };

    // ─── Success state ────────────────────────────────────────────
    if (submitted) {
        return (
            <div className={`bg-green-500/10 border-2 border-green-500/30 rounded-2xl ${compact ? 'p-5' : 'p-8'} text-center`}>
                <CheckCircle2 className="w-10 h-10 mx-auto text-green-600 mb-3" />
                <h3 className="font-heading font-bold text-xl uppercase tracking-tight-heading text-brutal-dark mb-2">
                    Pitch received
                </h3>
                <p className="font-data text-sm text-brutal-dark/70 max-w-md mx-auto">
                    Thanks, {name.split(' ')[0] || 'friend'}. We'll review your pitch and reach out within 7 days.
                    If we don't, feel free to email{' '}
                    <a href="mailto:hello@paraminnovation.org" className="underline text-brutal-red">
                        hello@paraminnovation.org
                    </a>
                    .
                </p>
            </div>
        );
    }

    // ─── Form ─────────────────────────────────────────────────────
    const padY = compact ? 'p-5 md:p-6' : 'p-6 md:p-8';
    const gapY = compact ? 'space-y-4' : 'space-y-5';
    const inputClass =
        'w-full h-11 rounded-lg bg-brutal-bg border-2 border-brutal-dark/15 px-3 font-data text-sm focus:border-brutal-red focus:outline-none';

    return (
        <form
            onSubmit={handleSubmit}
            className={`bg-white border-2 border-brutal-dark/15 rounded-2xl ${padY} ${gapY} shadow-[4px_4px_0_0_rgba(196,41,30,0.15)]`}
        >
            {/* Name + email row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="font-data text-xs font-bold uppercase tracking-widest text-brutal-dark/60 block mb-1.5">
                        Your name <span className="text-brutal-red">*</span>
                    </label>
                    <input
                        required
                        className={inputClass}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Jane Doe"
                    />
                </div>
                <div>
                    <label className="font-data text-xs font-bold uppercase tracking-widest text-brutal-dark/60 block mb-1.5">
                        Email <span className="text-brutal-red">*</span>
                    </label>
                    <input
                        required
                        type="email"
                        className={inputClass}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                    />
                </div>
            </div>

            {/* Topic title */}
            <div>
                <label className="font-data text-xs font-bold uppercase tracking-widest text-brutal-dark/60 block mb-1.5">
                    Topic / pitch title <span className="text-brutal-red">*</span>
                </label>
                <input
                    required
                    className={inputClass}
                    value={topicTitle}
                    onChange={(e) => setTopicTitle(e.target.value)}
                    placeholder='e.g. "Building a CubeSat attitude controller in a weekend"'
                    maxLength={120}
                />
                <p className="font-data text-[11px] text-brutal-dark/45 mt-1">
                    Short and concrete beats vague and grand.
                </p>
            </div>

            {/* Event type radio */}
            <div>
                <label className="font-data text-xs font-bold uppercase tracking-widest text-brutal-dark/60 block mb-2">
                    Which kind of event do you think fits? <span className="text-brutal-red">*</span>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {(['tech_tuesday', 'maker_meetup', 'build_challenge'] as EventType[]).map((type) => {
                        const active = preferredType === type;
                        return (
                            <button
                                type="button"
                                key={type}
                                onClick={() => setPreferredType(type)}
                                className={
                                    'text-left p-3 rounded-xl border-2 transition-colors '
                                    + (active
                                        ? 'border-brutal-red bg-brutal-red/5'
                                        : 'border-brutal-dark/15 hover:border-brutal-dark/35')
                                }
                            >
                                <div className="font-data text-sm font-bold text-brutal-dark">
                                    {EVENT_TYPE_LABELS[type]}
                                </div>
                                <div className="font-data text-[11px] text-brutal-dark/55 mt-0.5 leading-snug">
                                    {EVENT_TYPE_TAGLINES[type]}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Abstract — block editor */}
            <div>
                <BlockEditor
                    blocks={abstract}
                    onChange={(next) => {
                        // Hard-cap in the setter in case someone spams "add".
                        setAbstract(next.slice(0, MAX_ABSTRACT_BLOCKS));
                    }}
                    label="Abstract"
                    hint={`Give us a taste of what you'd cover. Up to ${MAX_ABSTRACT_BLOCKS} blocks — ${abstract.length}/${MAX_ABSTRACT_BLOCKS} used.`}
                />
                {!canAddBlock && (
                    <p className="font-data text-[11px] text-brutal-red mt-1">
                        Abstract cap reached — remove a block to add a different one.
                    </p>
                )}
            </div>

            {/* Past talk links */}
            <div>
                <label className="font-data text-xs font-bold uppercase tracking-widest text-brutal-dark/60 block mb-1.5">
                    Past talks or recordings (optional)
                </label>
                <p className="font-data text-[11px] text-brutal-dark/45 mb-2">
                    Up to {MAX_PAST_LINKS} links. A blog post, video, slide deck, anything that shows how you present.
                </p>
                <div className="space-y-2">
                    {pastLinks.map((url, i) => (
                        <div key={i}>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <ExternalLink className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-brutal-dark/30" />
                                    <input
                                        type="url"
                                        className={`${inputClass} pl-9`}
                                        value={url}
                                        onChange={(e) => {
                                            const next = [...pastLinks];
                                            next[i] = e.target.value;
                                            setPastLinks(next);
                                        }}
                                        placeholder="https://youtube.com/…"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleRemoveLink(i)}
                                    className="w-11 h-11 flex items-center justify-center rounded-lg border-2 border-brutal-dark/15 hover:border-brutal-red hover:text-brutal-red transition-colors"
                                    aria-label="Remove link"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                            {linkErrors[i] && (
                                <p className="font-data text-[11px] text-brutal-red mt-1 ml-1">{linkErrors[i]}</p>
                            )}
                        </div>
                    ))}
                </div>
                {pastLinks.length < MAX_PAST_LINKS && (
                    <button
                        type="button"
                        onClick={handleAddLink}
                        className="mt-2 inline-flex items-center gap-1.5 font-data text-xs font-bold text-brutal-red hover:underline"
                    >
                        <Plus className="w-3.5 h-3.5" /> Add another link
                    </button>
                )}
            </div>

            {/* Error */}
            {error && (
                <div className="p-3 border-2 border-brutal-red/40 bg-brutal-red/5 rounded-lg font-data text-sm text-brutal-red">
                    {error}
                </div>
            )}

            {/* Submit */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2">
                <button
                    type="submit"
                    disabled={!canSubmit}
                    className="inline-flex items-center justify-center gap-2 bg-brutal-red text-brutal-bg py-3 px-5 rounded-xl font-heading font-bold text-sm uppercase tracking-wider shadow-[3px_3px_0_0_rgba(0,0,0,0.25)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0"
                >
                    {submitting ? 'Sending…' : (
                        <>
                            Send pitch <Send className="w-4 h-4" />
                        </>
                    )}
                </button>
                <p className="font-data text-[11px] text-brutal-dark/45">
                    We'll reach out within 7 days.
                </p>
            </div>
        </form>
    );
}

export default PitchForm;
