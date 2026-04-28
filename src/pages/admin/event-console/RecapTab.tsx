import React, { useState } from 'react';
import { Link } from 'react-router';
import { ExternalLink, Sparkles } from 'lucide-react';
import type { Event } from '../../../lib/database.types';
import { supabase } from '../../../lib/supabase';
import { useAutosave } from '../../../lib/useAutosave';
import { AutosavePill } from '../../../components/shared/AutosavePill';
import { GalleryUploader } from '../../../components/events/recap/GalleryUploader';

/**
 * RecapTab — post-event recap editor (Prompt 12).
 *
 * Unlocked once the event has passed (gating lives in consoleTypes).
 * Three editable surfaces:
 *
 *   1. "What happened" — results_summary textarea (autosaves).
 *   2. "What we learned" — learnings textarea (autosaves).
 *   3. Gallery — drag-drop image uploader that pushes URLs into
 *      event.gallery_urls[].
 *
 * Everything autosaves; there is no "Save" button. A single
 * AutosavePill in the tab header shows the current state of all
 * three fields (we save whichever changed).
 *
 * The public past-event page renders these three surfaces
 * automatically via PostEventPage — no separate "publish recap"
 * step. Saving IS publishing.
 */

interface RecapTabProps {
    event: Event;
    /** Called after a successful save so the console header refreshes. */
    onEventChanged?: () => void;
}

interface DraftState {
    results_summary: string;
    learnings: string;
    gallery_urls: string[];
}

function toDraft(event: Event): DraftState {
    return {
        results_summary: event.results_summary ?? '',
        learnings: event.learnings ?? '',
        gallery_urls: event.gallery_urls ?? [],
    };
}

export function RecapTab({ event, onEventChanged }: RecapTabProps) {
    // Derive draft state from props using the "prevProp sentinel" pattern
    // from the React 19 docs (https://react.dev/reference/react/useState
    // #storing-information-from-previous-renders). We track the server-
    // side fingerprint; when the event prop's persisted columns change
    // out-of-band (e.g. the wizard edit modal wrote to it), we reset the
    // draft synchronously without an effect — so useAutosave's baseline
    // can stay in lockstep via its `hydrationKey`.
    const serverFp =
        `${event.id}|${event.results_summary ?? ''}|${event.learnings ?? ''}|${JSON.stringify(event.gallery_urls ?? [])}`;
    const [lastFp, setLastFp] = useState<string>(serverFp);
    const [draft, setDraft] = useState<DraftState>(() => toDraft(event));
    if (serverFp !== lastFp) {
        setLastFp(serverFp);
        setDraft(toDraft(event));
    }

    const { status, lastSavedAt } = useAutosave<DraftState>({
        value: draft,
        delayMs: 700,
        hydrationKey: event.id,
        onSave: async (value) => {
            const { error } = await supabase
                .from('event')
                .update({
                    results_summary: value.results_summary.trim() || null,
                    learnings: value.learnings.trim() || null,
                    gallery_urls: value.gallery_urls,
                })
                .eq('id', event.id);
            if (!error && onEventChanged) onEventChanged();
            return { error };
        },
    });

    const textareaClass =
        'w-full min-h-[160px] rounded-lg bg-brutal-bg border-2 border-brutal-dark/15 p-3 font-data text-sm leading-relaxed focus:border-brutal-red focus:outline-none';

    return (
        <div className="space-y-8">
            {/* Header strip: status + preview link */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                    <AutosavePill status={status} lastSavedAt={lastSavedAt} idleLabel="Autosaves as you type" />
                    <span className="font-data text-[11px] text-brutal-dark/45">
                        Saving writes directly to the public recap — no extra publish step.
                    </span>
                </div>
                <Link
                    to={`/events/${event.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-2 border-2 border-brutal-dark/30 hover:border-brutal-dark font-data text-sm font-bold uppercase tracking-wider transition-colors"
                >
                    <ExternalLink className="w-4 h-4" /> Preview public recap
                </Link>
            </div>

            {/* What happened */}
            <section>
                <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                        <h3 className="font-heading font-bold text-lg uppercase tracking-tight-heading text-brutal-dark flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-brutal-red" /> What happened
                        </h3>
                        <p className="font-data text-xs text-brutal-dark/50 mt-0.5">
                            One or two paragraphs — the headline of the event in plain English.
                        </p>
                    </div>
                </div>
                <textarea
                    className={textareaClass}
                    placeholder="e.g. Twelve teams shipped robots in 48 hours. Three finished the full obstacle course…"
                    value={draft.results_summary}
                    onChange={(e) => setDraft((d) => ({ ...d, results_summary: e.target.value }))}
                />
            </section>

            {/* What we learned */}
            <section>
                <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                        <h3 className="font-heading font-bold text-lg uppercase tracking-tight-heading text-brutal-dark">
                            What we learned
                        </h3>
                        <p className="font-data text-xs text-brutal-dark/50 mt-0.5">
                            Anything worth carrying into the next event — format, scoring, logistics, mentorship.
                        </p>
                    </div>
                </div>
                <textarea
                    className={textareaClass}
                    placeholder="e.g. 48 hours was tight — next time we'll front-load tool onboarding on Friday evening…"
                    value={draft.learnings}
                    onChange={(e) => setDraft((d) => ({ ...d, learnings: e.target.value }))}
                />
            </section>

            {/* Gallery */}
            <section>
                <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                        <h3 className="font-heading font-bold text-lg uppercase tracking-tight-heading text-brutal-dark">
                            Gallery
                        </h3>
                        <p className="font-data text-xs text-brutal-dark/50 mt-0.5">
                            Drop photos from the event. Drag tiles to reorder; the first image anchors the grid on the public page.
                        </p>
                    </div>
                    <span className="font-data text-[11px] text-brutal-dark/45 tabular-nums">
                        {draft.gallery_urls.length} image{draft.gallery_urls.length === 1 ? '' : 's'}
                    </span>
                </div>
                <GalleryUploader
                    eventId={event.id}
                    urls={draft.gallery_urls}
                    onChange={(next) => setDraft((d) => ({ ...d, gallery_urls: next }))}
                />
            </section>
        </div>
    );
}

export default RecapTab;
