import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Calendar as CalendarIcon, CheckCircle2, Circle, X } from 'lucide-react';
import { AdminPageShell } from '../../../components/admin/AdminPageShell';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Card } from '../../../components/ui/Card';
import { BlockEditor } from '../../../components/events/BlockEditor';
import { CoverImageInput } from '../../../components/events/CoverImageInput';
import { EventBody, blocksToPlainText } from '../../../components/events/EventBody';
import { useAuth } from '../../../lib/auth';
import { useEventMutations } from '../../../lib/hooks';
import { useAutosave } from '../../../lib/useAutosave';
import type { Event, EventType } from '../../../lib/database.types';
import { supabase } from '../../../lib/supabase';
import { getSeries, nextTuesdayAt1830 } from '../../../lib/api/eventSeries';
import { useEventDraft } from './useEventDraft';
import { useEventPrefill } from './useEventPrefill';
import {
    EVENT_TYPE_LABELS,
    EVENT_TYPE_TAGLINES,
    blankWizardState,
    type WizardFormState,
} from './wizardTypes';
import { Step2TypeFields } from './Step2TypeFields';
import { AdvancedDrawer } from './AdvancedFields';
import { computeHealth, type HealthAnchor } from './healthCheck';

/**
 * WizardShell — the one-screen 3-step creator for a single event type.
 *
 * Everything that diverges by type has been pushed out: the shell only
 * knows about Step 1 (shared basics), Step 3 (review + health + publish),
 * and delegates Step 2's per-type fields to <Step2TypeFields>. The three
 * route components (BuildChallengeWizard, etc.) are thin wrappers that
 * just pass their eventType in.
 *
 * Responsibilities:
 *   - Boot state from a resumable draft OR a same-type prefill fallback.
 *   - Autosave every edit to event_draft (P5), with a debounced status chip.
 *   - Validate at the step boundary (can't go Next with invalid current step).
 *   - Run the health check on Step 3 and disable Publish until all-green.
 *   - On publish: write the event row, mirror blocks->plaintext, delete draft.
 */

interface WizardShellProps {
    eventType: EventType;
}

type ResumeChoice = 'pending' | 'resume' | 'fresh';

export function WizardShell({ eventType }: WizardShellProps) {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user, role } = useAuth();
    const { createEvent } = useEventMutations();

    // URL-driven overrides. Priority: duplicate > series > prefill > blank.
    // Pitch overrides (?topic=&speaker=&pitch=) layer on TOP of whichever
    // base the other params picked — so accepting a pitch for a Tech
    // Tuesday that also specifies a default series still prefills the
    // series defaults and THEN drops the pitcher's topic/name on top.
    //   ?series=<id>         → apply series defaults + next-Tuesday 18:30 + skip Step 1.
    //   ?duplicate=<eventId> → clone a past event minus date / speaker / Luma URL.
    //   ?topic=<str>&speaker=<str>&pitch=<id>
    //     → P11 Accept-a-pitch handoff; stamps title/topic/speaker fields.
    const seriesIdParam = searchParams.get('series');
    const duplicateIdParam = searchParams.get('duplicate');
    const topicParam = searchParams.get('topic');
    const speakerParam = searchParams.get('speaker');
    const pitchIdParam = searchParams.get('pitch');

    const { draftState, writeDraft, deleteDraft } = useEventDraft(user?.id, eventType);
    const { prefilled } = useEventPrefill(eventType);

    const [state, setState] = useState<WizardFormState | null>(null);
    const [resumeChoice, setResumeChoice] = useState<ResumeChoice>('pending');
    const [overrideState, setOverrideState] = useState<WizardFormState | null>(null);
    const [overrideLoaded, setOverrideLoaded] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [publishError, setPublishError] = useState<string | null>(null);
    const [focusField, setFocusField] = useState<string | null>(null);

    // ─── URL override loader (series / duplicate) ───────────────────
    useEffect(() => {
        let cancelled = false;
        (async () => {
            const hasPitchOverride = !!(topicParam || speakerParam || pitchIdParam);
            if (!seriesIdParam && !duplicateIdParam && !hasPitchOverride) {
                setOverrideLoaded(true);
                return;
            }

            // Start from a blank of the current event type.
            const base = blankWizardState(eventType);

            if (seriesIdParam && eventType === 'tech_tuesday') {
                const { data: series } = await getSeries(seriesIdParam);
                if (cancelled) return;
                if (series) {
                    base.series_id = series.id;
                    base.title = series.title_template;
                    base.location = series.default_location ?? '';
                    base.cover_image_url = series.default_cover_image_url ?? '';
                    base.start_date = toDatetimeLocal(nextTuesdayAt1830());
                    base.prefillSourceTitle = `${series.title_template} (series)`;
                    if (base.typeFields.kind === 'tech_tuesday') {
                        base.typeFields.duration_min = series.default_duration_min ?? base.typeFields.duration_min;
                    }
                    // Skip straight to Step 2 — Step 1 basics are prefilled.
                    base.step = 2;
                }
            }

            if (duplicateIdParam) {
                const { data: src } = await supabase
                    .from('event')
                    .select('*')
                    .eq('id', duplicateIdParam)
                    .maybeSingle<Event>();
                if (cancelled) return;
                if (src) {
                    // Copy everything that makes sense week-to-week.
                    base.title = src.title;
                    base.tagline = src.tagline ?? '';
                    base.cover_image_url = src.cover_image_url ?? '';
                    base.location = src.location ?? '';
                    base.description_blocks = src.description_blocks ?? [];
                    base.series_id = src.series_id ?? null;
                    if (base.typeFields.kind === 'tech_tuesday') {
                        base.typeFields.duration_min = src.duration_min ?? base.typeFields.duration_min;
                        // Explicitly clear what a new week must re-enter:
                        base.typeFields.speaker_name = '';
                        base.typeFields.speaker_bio_short = '';
                        base.typeFields.topic_summary = '';
                        base.typeFields.external_rsvp_url = '';
                    }
                    // Always clear the date — the new week picks its own.
                    base.start_date = toDatetimeLocal(nextTuesdayAt1830());
                    base.end_date = '';
                    base.prefillSourceTitle = `${src.title} (duplicated)`;
                    base.step = 2;
                }
            }

            // P11 — Accept-a-pitch overlay. Applied last so it wins over
            // series/duplicate values for the fields it knows about. We
            // intentionally don't skip Step 1 here — the admin still
            // needs to pick a date & confirm basics.
            const rawTopic = topicParam?.trim();
            const rawSpeaker = speakerParam?.trim();
            if (rawTopic) {
                // Seed the event title from the topic if it's still blank
                // (no series template) — otherwise stash the topic in the
                // type-specific topic field.
                if (!base.title) base.title = rawTopic;
                if (base.typeFields.kind === 'tech_tuesday') {
                    base.typeFields.topic_summary = rawTopic;
                }
            }
            if (rawSpeaker && base.typeFields.kind === 'tech_tuesday') {
                base.typeFields.speaker_name = rawSpeaker;
            }
            if (rawTopic || rawSpeaker) {
                base.prefillSourceTitle = pitchIdParam
                    ? 'From accepted pitch'
                    : base.prefillSourceTitle;
            }

            if (!cancelled) {
                setOverrideState(base);
                setOverrideLoaded(true);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [seriesIdParam, duplicateIdParam, topicParam, speakerParam, pitchIdParam, eventType]);

    // ─── Hydration: resume dialog vs prefill vs blank ───────────────
    useEffect(() => {
        if (draftState === null) return; // still loading
        if (!overrideLoaded) return;     // override fetch still pending

        // URL overrides (?series=/?duplicate=) always win — the user came from
        // a fast-create shortcut and expects a prefilled form, not a draft
        // from some other session.
        if (overrideState) {
            setState(overrideState);
            return;
        }

        // If a draft exists and the user hasn't decided, gate on the dialog.
        if (draftState !== undefined && resumeChoice === 'pending') {
            return;
        }

        // User picked "fresh" or there is no draft — seed accordingly.
        //
        // Two prefill sources can collide here:
        //   • `prefilled` — fields carried forward from the most recent
        //     event of this type (cover, location, slot length, etc.).
        //   • `blankWizardState` — a literal empty form.
        //
        // If the user explicitly clicked "Start fresh" on the resume
        // dialog, the label has to mean what it says: a blank form.
        // We only honour `prefilled` on the natural cold-start path
        // (no draft existed at all) — that's where it acts as a
        // legitimate smart default.
        if (draftState === undefined || resumeChoice === 'fresh') {
            setState(
                resumeChoice === 'fresh'
                    ? blankWizardState(eventType)
                    : (prefilled ?? blankWizardState(eventType)),
            );
            return;
        }

        // User picked "resume" or only one branch applies.
        if (resumeChoice === 'resume' && draftState !== undefined) {
            setState(draftState);
            return;
        }
    }, [draftState, prefilled, resumeChoice, eventType, overrideLoaded, overrideState]);

    // If a draft exists but the user hasn't picked yet, show the dialog.
    const showResumeDialog = draftState !== null && draftState !== undefined && resumeChoice === 'pending';

    // ─── Autosave ──────────────────────────────────────────────────
    const { status: saveStatus, lastSavedAt } = useAutosave<WizardFormState | null>({
        value: state,
        enabled: !!user && !!state && !showResumeDialog,
        delayMs: 600,
        hydrationKey: `${user?.id ?? ''}:${eventType}`,
        onSave: async (value) => {
            if (!value || !user) return;
            const { error } = await writeDraft(value);
            return { error };
        },
    });

    // ─── Derived ───────────────────────────────────────────────────
    const health = useMemo(() => (state ? computeHealth(state) : null), [state]);

    // ─── Access guard ──────────────────────────────────────────────
    if (role !== 'admin' && role !== 'mentor') {
        return (
            <AdminPageShell role={role ?? 'viewer'} title="Access Denied" subtitle="Only mentors and admins can host events." icon={CalendarIcon}>
                <p className="font-data text-brutal-dark/60">You don't have permission to host events.</p>
            </AdminPageShell>
        );
    }

    // ─── Loading ───────────────────────────────────────────────────
    if (!state) {
        return (
            <AdminPageShell role={role} title={`New ${EVENT_TYPE_LABELS[eventType]}`} subtitle={EVENT_TYPE_TAGLINES[eventType]} icon={CalendarIcon}>
                <p className="font-data text-brutal-dark/60">Loading…</p>
                {showResumeDialog && draftState && (
                    <ResumeDialog
                        draftUpdatedHint="You have unsaved work on this event type."
                        onResume={() => setResumeChoice('resume')}
                        onFresh={async () => {
                            await deleteDraft();
                            setResumeChoice('fresh');
                        }}
                    />
                )}
            </AdminPageShell>
        );
    }

    // ─── Handlers ──────────────────────────────────────────────────
    const goto = (step: 1 | 2 | 3) => {
        setState({ ...state, step });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const canLeaveStep1 = !!state.title && !!state.start_date;
    const canLeaveStep2 = (() => {
        switch (state.typeFields.kind) {
            case 'build_challenge':
                return !!state.typeFields.prize_summary && !!state.typeFields.submission_deadline;
            case 'maker_meetup':
                return !!state.typeFields.application_deadline && state.typeFields.interview_slot_length_min > 0;
            case 'tech_tuesday':
                return !!state.typeFields.external_rsvp_url && !!state.typeFields.speaker_name;
        }
    })();

    const handleJumpTo = (anchor: HealthAnchor) => {
        setFocusField(anchor.field);
        goto(anchor.step as 1 | 2 | 3);
        // Clear focus hint after a tick so subsequent renders don't steal focus.
        setTimeout(() => setFocusField(null), 1500);
    };

    const handlePublish = async () => {
        if (!user || !state) return;
        if (!health?.allPassing) return;
        setPublishing(true);
        setPublishError(null);

        try {
            // Mirror blocks to the legacy plaintext `description` column.
            const plaintext = blocksToPlainText(state.description_blocks);
            const locationValue = state.location.trim();

            const payload: Parameters<typeof createEvent>[0] & Record<string, unknown> = {
                title: state.title.trim(),
                event_type: eventType,
                date: state.start_date,
                end_date: state.end_date || undefined,
                description: plaintext,
                // Extended columns (added by earlier migrations):
                tagline: state.tagline.trim() || null,
                cover_image_url: state.cover_image_url.trim() || undefined,
                location: locationValue || undefined,
                created_by: user.id,
                // New block column from this migration:
                description_blocks: state.description_blocks,
                // Advanced drawer captures:
                prizes_info: state.advanced.prizes_info || null,
                gallery_urls: state.advanced.gallery_seed_urls.length > 0 ? state.advanced.gallery_seed_urls : null,
                results_summary: state.advanced.results_summary_placeholder || null,
            };

            // Type-specific capacity mapping (keeps the existing schema happy
            // without shipping the type-specific columns yet — those land in
            // Prompts 8/9/10).
            if (state.typeFields.kind === 'maker_meetup' && state.typeFields.capacity > 0) {
                payload.capacity = state.typeFields.capacity;
            }

            // P10 — persist Tech Tuesday fields + series link.
            if (state.typeFields.kind === 'tech_tuesday') {
                payload.external_rsvp_url = state.typeFields.external_rsvp_url.trim() || null;
                payload.speaker_name = state.typeFields.speaker_name.trim() || null;
                payload.speaker_bio_short = state.typeFields.speaker_bio_short.trim() || null;
                payload.topic_summary = state.typeFields.topic_summary.trim() || null;
                payload.duration_min = state.typeFields.duration_min || null;
            }
            if (state.series_id) {
                payload.series_id = state.series_id;
            }

            const { error } = await createEvent(payload);
            if (error) {
                setPublishError(error);
                setPublishing(false);
                return;
            }

            // Publish succeeded → wipe the draft so the user starts clean next time.
            await deleteDraft();
            navigate('/admin/events');
        } catch (err) {
            setPublishError(err instanceof Error ? err.message : 'Failed to publish');
            setPublishing(false);
        }
    };

    // ─── Render ────────────────────────────────────────────────────
    return (
        <AdminPageShell
            role={role}
            title={`New ${EVENT_TYPE_LABELS[eventType]}`}
            subtitle={EVENT_TYPE_TAGLINES[eventType]}
            icon={CalendarIcon}
            headerAction={<SaveStatusChip status={saveStatus} lastSavedAt={lastSavedAt} />}
        >
            {/* Prefill banner */}
            {state.prefillSourceTitle && (
                <div className="flex items-center gap-3 p-3 bg-brutal-red/5 border border-brutal-red/20 rounded-xl">
                    <span className="font-data text-xs text-brutal-dark/70">
                        Prefilled from <strong className="text-brutal-dark">{state.prefillSourceTitle}</strong>.
                    </span>
                    <button
                        onClick={() => setState({ ...blankWizardState(eventType), step: state.step })}
                        className="ml-auto font-data text-xs font-bold text-brutal-red hover:underline"
                    >
                        Clear all →
                    </button>
                </div>
            )}

            {/* Step indicator */}
            <StepIndicator step={state.step} />

            <Card className="p-5 md:p-6 border-2 border-brutal-dark border-t-[6px] border-t-brutal-red shadow-[6px_6px_0_0_rgba(17,17,17,1)]">
                {state.step === 1 && (
                    <Step1
                        state={state}
                        onChange={setState}
                        eventType={eventType}
                        userId={user?.id ?? null}
                        onNext={() => canLeaveStep1 && goto(2)}
                        canNext={canLeaveStep1}
                    />
                )}
                {state.step === 2 && (
                    <Step2
                        state={state}
                        onChange={setState}
                        focusField={focusField}
                        onBack={() => goto(1)}
                        onNext={() => canLeaveStep2 && goto(3)}
                        canNext={canLeaveStep2}
                    />
                )}
                {state.step === 3 && (
                    <Step3
                        state={state}
                        health={health!}
                        onBack={() => goto(2)}
                        onPublish={handlePublish}
                        publishing={publishing}
                        publishError={publishError}
                        onJumpTo={handleJumpTo}
                    />
                )}
            </Card>
        </AdminPageShell>
    );
}

// ─── Helpers ────────────────────────────────────────────────────────

/**
 * ISO-8601 → value suitable for <input type="datetime-local">.
 * The native control requires "YYYY-MM-DDTHH:mm" (no seconds, no TZ)
 * in the *local* timezone; Date.toISOString() would emit UTC and
 * drift by the user's offset. We build the string from the Date's
 * local getters instead.
 */
function toDatetimeLocal(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ─── Step indicator ────────────────────────────────────────────────

function StepIndicator({ step }: { step: 1 | 2 | 3 }) {
    const steps: { n: 1 | 2 | 3; label: string }[] = [
        { n: 1, label: 'Basics' },
        { n: 2, label: 'Type-specific' },
        { n: 3, label: 'Review & Publish' },
    ];
    return (
        <div className="flex items-center gap-3 font-data text-xs font-bold">
            {steps.map((s, i) => (
                <React.Fragment key={s.n}>
                    <div className={`flex items-center gap-2 ${step === s.n ? 'text-brutal-red' : step > s.n ? 'text-brutal-dark' : 'text-brutal-dark/30'}`}>
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${step === s.n ? 'bg-brutal-red text-white' : step > s.n ? 'bg-brutal-dark text-white' : 'bg-brutal-dark/10'}`}>
                            {step > s.n ? '✓' : s.n}
                        </span>
                        <span className="uppercase tracking-widest">{s.label}</span>
                    </div>
                    {i < steps.length - 1 && <span className="text-brutal-dark/20">—</span>}
                </React.Fragment>
            ))}
        </div>
    );
}

// ─── Save status chip ──────────────────────────────────────────────

function SaveStatusChip({ status, lastSavedAt }: { status: 'idle' | 'saving' | 'saved' | 'error'; lastSavedAt: Date | null }) {
    const map: Record<typeof status, { text: string; cls: string }> = {
        idle: { text: 'Ready', cls: 'bg-brutal-dark/5 text-brutal-dark/50' },
        saving: { text: 'Saving…', cls: 'bg-amber-100 text-amber-800' },
        saved: {
            text: lastSavedAt ? `Saved · ${lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Saved',
            cls: 'bg-green-100 text-green-800',
        },
        error: { text: 'Save failed', cls: 'bg-brutal-red/10 text-brutal-red' },
    };
    const { text, cls } = map[status];
    return (
        <span className={`font-data text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${cls}`}>
            {text}
        </span>
    );
}

// ─── Resume dialog ─────────────────────────────────────────────────

function ResumeDialog({ draftUpdatedHint, onResume, onFresh }: {
    draftUpdatedHint: string;
    onResume: () => void;
    onFresh: () => void;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brutal-dark/40 backdrop-blur-sm p-4">
            <Card className="p-6 max-w-md w-full space-y-4">
                <h2 className="font-heading font-bold text-xl uppercase tracking-tight">Resume or start fresh?</h2>
                <p className="font-data text-sm text-brutal-dark/70">{draftUpdatedHint}</p>
                <div className="flex gap-3 justify-end">
                    <Button variant="ghost" onClick={onFresh}>Start fresh</Button>
                    <Button onClick={onResume}>Resume draft</Button>
                </div>
            </Card>
        </div>
    );
}

// ─── Step 1: Basics ────────────────────────────────────────────────

function Step1({
    state, onChange, eventType, userId, onNext, canNext,
}: {
    state: WizardFormState;
    onChange: (s: WizardFormState) => void;
    eventType: EventType;
    userId: string | null;
    onNext: () => void;
    canNext: boolean;
}) {
    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <h2 className="font-heading font-bold text-xl uppercase tracking-tight">Step 1 of 3 — Basics</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                    label="Event title"
                    required
                    value={state.title}
                    onChange={(e) => onChange({ ...state, title: e.target.value })}
                />
                <Input
                    label="Tagline (one line)"
                    placeholder="e.g. Build the future of AI at the edge"
                    value={state.tagline}
                    onChange={(e) => onChange({ ...state, tagline: e.target.value })}
                />
                <div>
                    <label className="font-data text-sm font-bold text-brutal-dark block mb-1">Start date & time <span className="text-brutal-red ml-0.5">*</span></label>
                    <input
                        type="datetime-local"
                        className="w-full h-10 rounded bg-brutal-bg border-2 border-brutal-dark/20 px-3 font-data text-sm focus:border-brutal-red focus:outline-none"
                        value={state.start_date}
                        onChange={(e) => onChange({ ...state, start_date: e.target.value })}
                    />
                </div>
                <div>
                    <label className="font-data text-sm font-bold text-brutal-dark block mb-1">End date & time (optional)</label>
                    <input
                        type="datetime-local"
                        className="w-full h-10 rounded bg-brutal-bg border-2 border-brutal-dark/20 px-3 font-data text-sm focus:border-brutal-red focus:outline-none"
                        value={state.end_date}
                        onChange={(e) => onChange({ ...state, end_date: e.target.value })}
                    />
                </div>
                <div className="md:col-span-2">
                    <CoverImageInput
                        label="Cover image"
                        value={state.cover_image_url}
                        onChange={(url) => onChange({ ...state, cover_image_url: url })}
                        userId={userId}
                    />
                </div>
                <Input
                    label="Location"
                    placeholder="e.g. ParSEC Jayanagar, Bengaluru"
                    value={state.location}
                    onChange={(e) => onChange({ ...state, location: e.target.value })}
                />
            </div>

            <BlockEditor
                label="Body"
                hint="Add at least 3 blocks to clear the health check."
                blocks={state.description_blocks as any}
                onChange={(b) => onChange({ ...state, description_blocks: b })}
            />

            <div className="flex justify-end pt-2 border-t-2 border-brutal-dark/10 gap-3">
                <Button onClick={onNext} disabled={!canNext}>Next: Type-specific →</Button>
            </div>
        </div>
    );
}

// ─── Step 2: Type-specific ─────────────────────────────────────────

function Step2({
    state, onChange, focusField, onBack, onNext, canNext,
}: {
    state: WizardFormState;
    onChange: (s: WizardFormState) => void;
    focusField: string | null;
    onBack: () => void;
    onNext: () => void;
    canNext: boolean;
}) {
    return (
        <div className="space-y-5">
            <h2 className="font-heading font-bold text-xl uppercase tracking-tight">Step 2 of 3 — Type-specific</h2>

            <Step2TypeFields
                fields={state.typeFields}
                onChange={(f) => onChange({ ...state, typeFields: f })}
                focusField={focusField}
            />

            <AdvancedDrawer
                open={state.advancedOpen}
                onToggle={(open) => onChange({ ...state, advancedOpen: open })}
                advanced={state.advanced}
                onChange={(a) => onChange({ ...state, advanced: a })}
                typeKind={state.typeFields.kind}
            />

            <div className="flex justify-between pt-2 border-t-2 border-brutal-dark/10 gap-3">
                <Button variant="ghost" onClick={onBack}>← Back</Button>
                <Button onClick={onNext} disabled={!canNext}>Next: Review →</Button>
            </div>
        </div>
    );
}

// ─── Step 3: Review & Publish ──────────────────────────────────────

function Step3({
    state, health, onBack, onPublish, publishing, publishError, onJumpTo,
}: {
    state: WizardFormState;
    health: ReturnType<typeof computeHealth>;
    onBack: () => void;
    onPublish: () => void;
    publishing: boolean;
    publishError: string | null;
    onJumpTo: (anchor: HealthAnchor) => void;
}) {
    return (
        <div className="space-y-5">
            <h2 className="font-heading font-bold text-xl uppercase tracking-tight">Step 3 of 3 — Review & Publish</h2>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
                {/* Preview column */}
                <div className="space-y-4">
                    <div className="bg-brutal-dark/5 border-2 border-brutal-dark/10 rounded-xl p-5 space-y-3">
                        <h3 className="font-heading font-bold text-3xl uppercase tracking-tight leading-tight">
                            {state.title || <span className="text-brutal-dark/30">— No title —</span>}
                        </h3>
                        {state.tagline && (
                            <p className="font-data text-sm text-brutal-dark/70">{state.tagline}</p>
                        )}
                        {state.cover_image_url && (
                            <img src={state.cover_image_url} alt="" className="w-full rounded-lg border-2 border-brutal-dark/10" />
                        )}
                        <div className="font-data text-xs text-brutal-dark/60">
                            {state.start_date && <div>Starts: {new Date(state.start_date).toLocaleString()}</div>}
                            {state.location && <div>Location: {state.location}</div>}
                        </div>
                    </div>
                    <EventBody blocks={state.description_blocks} fallback={
                        <p className="font-data text-xs text-brutal-dark/40 italic">Body is empty.</p>
                    } />
                </div>

                {/* Checklist column */}
                <aside>
                    <div className="border-2 border-brutal-dark/10 rounded-xl p-4 space-y-3 sticky top-28">
                        <h3 className="font-heading font-bold text-sm uppercase tracking-tight">Event health</h3>
                        <ul className="space-y-1.5">
                            {health.items.map((item) => (
                                <li key={item.id}>
                                    <button
                                        type="button"
                                        onClick={() => item.status === 'fail' && onJumpTo(item.jumpTo)}
                                        className={`w-full flex items-start gap-2 text-left p-2 rounded font-data text-xs ${item.status === 'ok' ? 'text-brutal-dark/70' : 'text-brutal-red hover:bg-brutal-red/5'}`}
                                    >
                                        {item.status === 'ok'
                                            ? <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-green-600" />
                                            : <Circle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                                        <span>{item.label}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                        {publishError && (
                            <div className="flex items-start gap-2 p-2 bg-brutal-red/10 border border-brutal-red/20 rounded text-brutal-red font-data text-xs">
                                <X className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                <span>{publishError}</span>
                            </div>
                        )}
                        <Button
                            onClick={onPublish}
                            disabled={!health.allPassing || publishing}
                            className="w-full"
                        >
                            {publishing ? 'Publishing…' : health.allPassing ? 'Publish event' : `${health.items.filter(i => i.status === 'fail').length} to fix`}
                        </Button>
                    </div>
                </aside>
            </div>

            <div className="flex justify-start pt-2 border-t-2 border-brutal-dark/10">
                <Button variant="ghost" onClick={onBack}>← Back</Button>
            </div>
        </div>
    );
}
