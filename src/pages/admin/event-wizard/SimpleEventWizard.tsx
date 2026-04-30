import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
    Calendar as CalendarIcon,
    Copy,
    Sparkles,
    AlertCircle,
} from 'lucide-react';
import { AdminPageShell } from '../../../components/admin/AdminPageShell';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Card } from '../../../components/ui/Card';
import { CoverImageInput } from '../../../components/events/CoverImageInput';
import {
    DescriptionEditor,
    isTiptapDoc,
    emptyDoc,
    tiptapDocToPlainText,
} from '../../../components/events/editor/DescriptionEditor';
import { useAuth } from '../../../lib/auth';
import { useEventMutations } from '../../../lib/hooks';
import { useAutosave } from '../../../lib/useAutosave';
import { getSeries, nextTuesdayAt1830 } from '../../../lib/api/eventSeries';
import { supabase } from '../../../lib/supabase';
import type { Event, EventType } from '../../../lib/database.types';
import { useEventDraft } from './useEventDraft';
import { useEventPrefill } from './useEventPrefill';
import {
    EVENT_TYPE_LABELS,
    EVENT_TYPE_TAGLINES,
    blankWizardState,
    type WizardFormState,
} from './wizardTypes';
import { computeHealth } from './healthCheck';

/**
 * SimpleEventWizard — single-screen wizard with a two-column hero-and-form
 * layout in the brutalist Param theme.
 *
 * Layout (a generic SaaS form pattern, rendered in the project's existing
 * red-accent + heavy-border + drop-shadow visual language):
 *
 *   ┌──────────────────────────────────────────────────────────┐
 *   │  Page header (title + autosave chip + "Duplicate last")   │
 *   ├──────────────────┬───────────────────────────────────────┤
 *   │                  │  Event title                           │
 *   │   Cover image    │  Start ─── End                         │
 *   │   (dominant)     │  Location                              │
 *   │                  │  Description (BlockEditor)             │
 *   │                  │  Type-specific fields (RSVP / prize…)  │
 *   │                  │                                        │
 *   │                  │  ──────────────────────                │
 *   │                  │  [ Publish event ]   ← inline errors   │
 *   └──────────────────┴───────────────────────────────────────┘
 *
 * No step transitions, no sticky sidebar, no quick-start card. Required
 * fields are right there; optional ones are visible too — just compact.
 * The publish CTA shows the failing checks inline beside it instead of
 * gating the form behind a separate review screen.
 *
 * Smart defaults (date, deadlines, slot length, team size) are seeded
 * into the wizard's blank state so most mentors don't touch them. See
 * applySmartDateDefault / applySmartTypeDefaults below.
 */

interface SimpleEventWizardProps {
    eventType: EventType;
}

type ResumeChoice = 'pending' | 'resume' | 'fresh';

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function SimpleEventWizard({ eventType }: SimpleEventWizardProps) {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user, role } = useAuth();
    const { createEvent } = useEventMutations();

    // URL overrides — preserved from the legacy WizardShell so existing
    // CTAs (?series= / ?duplicate= / ?topic=&speaker=&pitch=) keep working.
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
    const [duplicating, setDuplicating] = useState(false);

    // ─── URL override loader (series / duplicate / pitch) ─────────
    useEffect(() => {
        let cancelled = false;
        (async () => {
            const hasPitchOverride = !!(topicParam || speakerParam || pitchIdParam);
            if (!seriesIdParam && !duplicateIdParam && !hasPitchOverride) {
                setOverrideLoaded(true);
                return;
            }
            const base = blankWizardState(eventType);
            base.start_date = applySmartDateDefault(eventType, base.start_date);
            base.end_date = applySmartEndDateDefault(eventType, base.start_date, base.end_date);
            applySmartTypeDefaults(base);

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
                        base.typeFields.duration_min =
                            series.default_duration_min ?? base.typeFields.duration_min;
                    }
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
                    cloneEventInto(base, src);
                }
            }

            const rawTopic = topicParam?.trim();
            const rawSpeaker = speakerParam?.trim();
            if (rawTopic) {
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

    // ─── Hydration ───────────────────────────────────────────────
    useEffect(() => {
        if (draftState === null) return;
        if (!overrideLoaded) return;

        if (overrideState) {
            setState(overrideState);
            return;
        }
        if (draftState !== undefined && resumeChoice === 'pending') return;
        if (draftState === undefined || resumeChoice === 'fresh') {
            // Two different "starting points" can apply here, and they
            // were colliding before:
            //
            //   • prefilled — fields carried forward from the most recent
            //     event of this type (cover, location, slot length, etc.).
            //     Useful when there is no draft and we want smart defaults.
            //
            //   • blankWizardState — a literal empty form.
            //
            // If the user explicitly clicked "Start fresh" on the resume
            // banner, that has to mean "give me a blank form" — otherwise
            // the label lies. So we only honour the same-type prefill on
            // the natural-cold-start path (no draft existed at all). When
            // resumeChoice === 'fresh' we go straight to blank.
            const seeded =
                resumeChoice === 'fresh'
                    ? blankWizardState(eventType)
                    : (prefilled ?? blankWizardState(eventType));
            seeded.start_date = applySmartDateDefault(eventType, seeded.start_date);
            seeded.end_date = applySmartEndDateDefault(eventType, seeded.start_date, seeded.end_date);
            applySmartTypeDefaults(seeded);
            setState(seeded);
            return;
        }
        if (resumeChoice === 'resume' && draftState !== undefined) {
            setState(draftState);
            return;
        }
    }, [draftState, prefilled, resumeChoice, eventType, overrideLoaded, overrideState]);

    const showResumeBanner =
        draftState !== null && draftState !== undefined && resumeChoice === 'pending';

    // ─── Autosave ────────────────────────────────────────────────
    const { status: saveStatus, lastSavedAt } = useAutosave<WizardFormState | null>({
        value: state,
        enabled: !!user && !!state && !showResumeBanner,
        delayMs: 600,
        hydrationKey: `${user?.id ?? ''}:${eventType}`,
        onSave: async (value) => {
            if (!value || !user) return;
            const { error } = await writeDraft(value);
            return { error };
        },
    });

    const health = useMemo(() => (state ? computeHealth(state) : null), [state]);
    const failingItems = health ? health.items.filter((i) => i.status === 'fail') : [];

    // ─── Access guard ────────────────────────────────────────────
    if (role !== 'admin' && role !== 'mentor') {
        return (
            <AdminPageShell
                role={role ?? 'viewer'}
                title="Access Denied"
                subtitle="Only mentors and admins can host events."
                icon={CalendarIcon}
            >
                <p className="font-data text-brutal-dark/60">
                    You don't have permission to host events.
                </p>
            </AdminPageShell>
        );
    }

    if (!state) {
        return (
            <AdminPageShell
                role={role}
                title={`New ${EVENT_TYPE_LABELS[eventType]}`}
                subtitle={EVENT_TYPE_TAGLINES[eventType]}
                icon={CalendarIcon}
            >
                <p className="font-data text-brutal-dark/60">Loading…</p>
                {showResumeBanner && (
                    <ResumeBanner
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

    // ─── Duplicate last <type> ────────────────────────────────
    const handleDuplicateLast = async () => {
        setDuplicating(true);
        const { data, error } = await supabase
            .from('event')
            .select('*')
            .eq('event_type', eventType)
            .order('date', { ascending: false })
            .limit(1)
            .maybeSingle<Event>();
        setDuplicating(false);
        if (error || !data) return;
        const cloned = blankWizardState(eventType);
        cloneEventInto(cloned, data);
        setState(cloned);
    };

    // ─── Publish ─────────────────────────────────────────────────
    const handlePublish = async () => {
        if (!user || !state || !health?.allPassing) return;
        setPublishing(true);
        setPublishError(null);
        try {
            // The wizard stores the Tiptap document tree directly on
            // description_blocks (the column is JSONB so the shape is
            // free). For the legacy `description` TEXT mirror — used by
            // calendar export and OG previews — we flatten the tree to
            // plaintext.
            const tiptapDoc = isTiptapDoc(state.description_blocks)
                ? state.description_blocks
                : emptyDoc();
            const plaintext = tiptapDocToPlainText(tiptapDoc);
            // The first paragraph of the description doubles as the
            // tagline on the public page — no separate input. If the
            // mentor explicitly set a tagline we keep it, otherwise we
            // derive one (truncated to keep the layout from blowing up).
            const derivedTagline = plaintext.split('\n').find((l) => l.trim().length > 0) ?? '';
            const tagline = state.tagline.trim() || derivedTagline.slice(0, 140) || null;

            // End time auto-derives from start + duration_min when the
            // mentor leaves it blank. Tech Tuesday and Maker Meetup have
            // sensible defaults; Build Challenge stays open-ended.
            const computedEnd = state.end_date || autoEndFromStart(state, eventType);

            const payload: Parameters<typeof createEvent>[0] & Record<string, unknown> = {
                title: state.title.trim(),
                event_type: eventType,
                date: state.start_date,
                end_date: computedEnd || undefined,
                description: plaintext,
                tagline,
                cover_image_url: state.cover_image_url.trim() || undefined,
                location: state.location.trim() || undefined,
                created_by: user.id,
                description_blocks: tiptapDoc,
                prizes_info: state.advanced.prizes_info || null,
                gallery_urls:
                    state.advanced.gallery_seed_urls.length > 0
                        ? state.advanced.gallery_seed_urls
                        : null,
                results_summary: state.advanced.results_summary_placeholder || null,
            };
            if (state.typeFields.kind === 'maker_meetup' && state.typeFields.capacity > 0) {
                payload.capacity = state.typeFields.capacity;
            }
            if (state.typeFields.kind === 'tech_tuesday') {
                payload.external_rsvp_url = state.typeFields.external_rsvp_url.trim() || null;
                payload.speaker_name = state.typeFields.speaker_name.trim() || null;
                // speaker_bio_short and topic_summary are no longer surfaced
                // as separate fields — they live inside the description doc.
                // We still write them through if a duplicated event seeded
                // them, so existing rows keep their data on round-trip.
                payload.speaker_bio_short = state.typeFields.speaker_bio_short.trim() || null;
                payload.topic_summary = state.typeFields.topic_summary.trim() || null;
                payload.duration_min = state.typeFields.duration_min || null;
            }
            if (state.series_id) payload.series_id = state.series_id;

            const { error } = await createEvent(payload);
            if (error) {
                setPublishError(error);
                setPublishing(false);
                return;
            }
            await deleteDraft();
            navigate('/admin/events');
        } catch (err) {
            setPublishError(err instanceof Error ? err.message : 'Failed to publish');
            setPublishing(false);
        }
    };

    return (
        <AdminPageShell
            role={role}
            title={`New ${EVENT_TYPE_LABELS[eventType]}`}
            subtitle={EVENT_TYPE_TAGLINES[eventType]}
            icon={CalendarIcon}
            headerAction={
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleDuplicateLast}
                        disabled={duplicating}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-brutal-dark/15 hover:border-brutal-red font-data text-[11px] font-bold uppercase tracking-wider text-brutal-dark/70 hover:text-brutal-red transition-colors disabled:opacity-50"
                    >
                        <Copy className="w-3.5 h-3.5" />
                        {duplicating ? 'Loading…' : `Duplicate last ${EVENT_TYPE_LABELS[eventType]}`}
                    </button>
                    <SaveStatusChip status={saveStatus} lastSavedAt={lastSavedAt} />
                </div>
            }
        >
            {showResumeBanner && (
                <ResumeBanner
                    onResume={() => setResumeChoice('resume')}
                    onFresh={async () => {
                        await deleteDraft();
                        setResumeChoice('fresh');
                    }}
                />
            )}

            {state.prefillSourceTitle && (
                <div className="flex items-center gap-3 p-3 bg-brutal-red/5 border border-brutal-red/20 rounded-xl mb-4">
                    <Sparkles className="w-4 h-4 text-brutal-red" />
                    <span className="font-data text-xs text-brutal-dark/70">
                        Prefilled from{' '}
                        <strong className="text-brutal-dark">{state.prefillSourceTitle}</strong>.
                    </span>
                    <button
                        type="button"
                        onClick={() => {
                            const cleared = blankWizardState(eventType);
                            cleared.start_date = applySmartDateDefault(eventType, cleared.start_date);
                            cleared.end_date = applySmartEndDateDefault(
                                eventType,
                                cleared.start_date,
                                cleared.end_date,
                            );
                            applySmartTypeDefaults(cleared);
                            setState(cleared);
                        }}
                        className="ml-auto font-data text-xs font-bold text-brutal-red hover:underline"
                    >
                        Clear all →
                    </button>
                </div>
            )}

            {/* ── Two-column hero + form layout ──────────────────────── */}
            <Card className="p-0 overflow-hidden border-2 border-brutal-dark border-t-[6px] border-t-brutal-red shadow-[6px_6px_0_0_rgba(17,17,17,1)]">
                <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] divide-y-2 lg:divide-y-0 lg:divide-x-2 divide-brutal-dark/10">
                    {/* Left — cover image takes the whole column */}
                    <div className="p-5 md:p-6 bg-brutal-bg/40">
                        <CoverImageInput
                            label="Cover image"
                            value={state.cover_image_url}
                            onChange={(url) => setState({ ...state, cover_image_url: url })}
                            userId={user?.id ?? null}
                        />
                        <p className="font-data text-[10px] text-brutal-dark/40 mt-3 leading-relaxed">
                            Square or 4:3 reads best on the public page. Upload from your device or
                            paste any image URL — broken hot-links are flagged before publish.
                        </p>
                    </div>

                    {/* Right — stacked form fields */}
                    <div className="p-5 md:p-6 space-y-4">
                        <Input
                            label="Event name"
                            required
                            placeholder={`e.g. ${exampleTitleFor(eventType)}`}
                            value={state.title}
                            onChange={(e) => setState({ ...state, title: e.target.value })}
                        />

                        <DateRow
                            startValue={state.start_date}
                            endValue={state.end_date}
                            onStartChange={(v) => setState({ ...state, start_date: v })}
                            onEndChange={(v) => setState({ ...state, end_date: v })}
                        />

                        <Input
                            label="Location"
                            placeholder="e.g. ParSEC Whitefield, or 'Online'"
                            value={state.location}
                            onChange={(e) => setState({ ...state, location: e.target.value })}
                        />

                        {/* Type-specific essentials live inline, not in a separate step */}
                        {eventType === 'tech_tuesday' && state.typeFields.kind === 'tech_tuesday' && (
                            <TechTuesdayFields state={state} onChange={setState} />
                        )}
                        {eventType === 'maker_meetup' && state.typeFields.kind === 'maker_meetup' && (
                            <MakerMeetupFields state={state} onChange={setState} />
                        )}
                        {eventType === 'build_challenge' && state.typeFields.kind === 'build_challenge' && (
                            <BuildChallengeFields state={state} onChange={setState} />
                        )}

                        <div>
                            <label className="font-data text-sm font-bold text-brutal-dark block mb-2">
                                About this event
                            </label>
                            <p className="font-data text-[10px] text-brutal-dark/40 mb-2">
                                Type, paste, or drop images. The first paragraph also becomes the
                                tagline shown under the title — no separate field needed.
                            </p>
                            <DescriptionEditor
                                value={state.description_blocks as unknown}
                                onChange={(doc) =>
                                    setState({
                                        ...state,
                                        description_blocks: doc as typeof state.description_blocks,
                                    })
                                }
                                userId={user?.id ?? null}
                                placeholder={descriptionPlaceholderFor(eventType)}
                            />
                        </div>

                        {/* Publish bar */}
                        <div className="pt-4 border-t-2 border-brutal-dark/10 flex flex-col gap-3">
                            {failingItems.length > 0 && (
                                <div className="flex items-start gap-2 p-2.5 bg-amber-50 border-2 border-amber-300 rounded-lg">
                                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-700" />
                                    <div className="font-data text-xs text-amber-900 space-y-0.5">
                                        <strong>Still to fix before publish:</strong>
                                        <ul className="list-disc list-inside text-[11px] leading-relaxed">
                                            {failingItems.map((i) => (
                                                <li key={i.id}>{i.label}</li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            )}
                            {publishError && (
                                <div className="flex items-start gap-2 p-2.5 bg-brutal-red/10 border-2 border-brutal-red/30 rounded-lg font-data text-xs text-brutal-red">
                                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                    <span>{publishError}</span>
                                </div>
                            )}
                            <Button
                                onClick={handlePublish}
                                disabled={!health?.allPassing || publishing}
                                className="w-full"
                                size="lg"
                            >
                                {publishing ? 'Publishing…' : 'Publish event'}
                            </Button>
                        </div>
                    </div>
                </div>
            </Card>
        </AdminPageShell>
    );
}

export default SimpleEventWizard;

// ═══════════════════════════════════════════════════════════════════
// TYPE-SPECIFIC INLINE FIELD GROUPS
// ═══════════════════════════════════════════════════════════════════

/**
 * Tech Tuesday inline fields — RSVP URL is required, the rest are
 * polish. We keep them all visible (no disclosure toggle) because the
 * full set is short and mentors fill them every week.
 */
function TechTuesdayFields({
    state,
    onChange,
}: {
    state: WizardFormState;
    onChange: (s: WizardFormState) => void;
}) {
    if (state.typeFields.kind !== 'tech_tuesday') return null;
    const f = state.typeFields;
    return (
        <div className="rounded-lg border-2 border-brutal-dark/10 p-3 space-y-3 bg-brutal-bg/30">
            <h3 className="font-heading font-bold text-xs uppercase tracking-widest text-brutal-dark/70">
                Tech Tuesday
            </h3>
            <Input
                label="RSVP link (Luma)"
                required
                placeholder="https://lu.ma/your-event"
                value={f.external_rsvp_url}
                onChange={(e) =>
                    onChange({
                        ...state,
                        typeFields: { ...f, external_rsvp_url: e.target.value },
                    })
                }
            />
            <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr] gap-3">
                <Input
                    label="Speaker"
                    placeholder="Name shown on the event page"
                    value={f.speaker_name}
                    onChange={(e) =>
                        onChange({
                            ...state,
                            typeFields: { ...f, speaker_name: e.target.value },
                        })
                    }
                />
                <NumberField
                    label="Duration (min)"
                    min={30}
                    max={240}
                    value={f.duration_min}
                    onChange={(v) =>
                        onChange({ ...state, typeFields: { ...f, duration_min: v } })
                    }
                />
            </div>
            {/* Topic summary used to live as its own field. We removed it
                because mentors were always typing the same content into the
                description body too. The Tiptap doc's first paragraph now
                doubles as the topic blurb on the public page. */}
        </div>
    );
}

function MakerMeetupFields({
    state,
    onChange,
}: {
    state: WizardFormState;
    onChange: (s: WizardFormState) => void;
}) {
    if (state.typeFields.kind !== 'maker_meetup') return null;
    const f = state.typeFields;
    return (
        <div className="rounded-lg border-2 border-brutal-dark/10 p-3 space-y-3 bg-brutal-bg/30">
            <h3 className="font-heading font-bold text-xs uppercase tracking-widest text-brutal-dark/70">
                Maker Meetup
            </h3>
            <DateField
                label="Applications close"
                value={f.application_deadline}
                onChange={(v) =>
                    onChange({ ...state, typeFields: { ...f, application_deadline: v } })
                }
                hint="Defaulted to 3 days before the event."
            />
            <div className="grid grid-cols-2 gap-3">
                <NumberField
                    label="Slot length (min)"
                    min={5}
                    max={120}
                    value={f.interview_slot_length_min}
                    onChange={(v) =>
                        onChange({
                            ...state,
                            typeFields: { ...f, interview_slot_length_min: v },
                        })
                    }
                />
                <NumberField
                    label="Capacity (0 = no cap)"
                    min={0}
                    value={f.capacity}
                    onChange={(v) => onChange({ ...state, typeFields: { ...f, capacity: v } })}
                />
            </div>
        </div>
    );
}

function BuildChallengeFields({
    state,
    onChange,
}: {
    state: WizardFormState;
    onChange: (s: WizardFormState) => void;
}) {
    if (state.typeFields.kind !== 'build_challenge') return null;
    const f = state.typeFields;
    return (
        <div className="rounded-lg border-2 border-brutal-dark/10 p-3 space-y-3 bg-brutal-bg/30">
            <h3 className="font-heading font-bold text-xs uppercase tracking-widest text-brutal-dark/70">
                Build Challenge
            </h3>
            <Input
                label="Prize summary"
                required
                placeholder="e.g. ₹50k cash + ParSEC residency"
                value={f.prize_summary}
                onChange={(e) =>
                    onChange({
                        ...state,
                        typeFields: { ...f, prize_summary: e.target.value },
                    })
                }
            />
            <div className="grid grid-cols-1 sm:grid-cols-[3fr_1fr] gap-3">
                <DateField
                    label="Submission deadline"
                    value={f.submission_deadline}
                    onChange={(v) =>
                        onChange({
                            ...state,
                            typeFields: { ...f, submission_deadline: v },
                        })
                    }
                    hint="Defaulted to 7 days after start."
                />
                <NumberField
                    label="Team size (max)"
                    min={1}
                    max={10}
                    value={f.team_size_max}
                    onChange={(v) =>
                        onChange({
                            ...state,
                            typeFields: { ...f, team_size_max: v },
                        })
                    }
                />
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════
// SHARED FIELD HELPERS (theme-matched bare inputs)
// ═══════════════════════════════════════════════════════════════════

function DateField({
    label,
    value,
    onChange,
    required = false,
    hint,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    required?: boolean;
    hint?: string;
}) {
    return (
        <div>
            <label className="font-data text-sm font-bold text-brutal-dark block mb-1">
                {label}
                {required && <span className="text-brutal-red ml-0.5">*</span>}
            </label>
            <input
                type="datetime-local"
                className="w-full h-10 rounded bg-brutal-bg border-2 border-brutal-dark/20 px-3 font-data text-sm focus:border-brutal-red focus:outline-none"
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
            {hint && (
                <p className="font-data text-[10px] text-brutal-dark/40 mt-1">{hint}</p>
            )}
        </div>
    );
}

function NumberField({
    label,
    value,
    onChange,
    min,
    max,
}: {
    label: string;
    value: number;
    onChange: (v: number) => void;
    min?: number;
    max?: number;
}) {
    return (
        <div>
            <label className="font-data text-sm font-bold text-brutal-dark block mb-1">
                {label}
            </label>
            <input
                type="number"
                min={min}
                max={max}
                className="w-full h-10 rounded bg-brutal-bg border-2 border-brutal-dark/20 px-3 font-data text-sm focus:border-brutal-red focus:outline-none"
                value={value}
                onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)}
            />
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════
// DATE ROW — start always visible, end appears on click
// ═══════════════════════════════════════════════════════════════════

/**
 * For most events end time is mechanically `start + duration` and the
 * mentor doesn't care. Hiding the end-time field by default removes one
 * input from the visible form; "Add end time" reveals it for the rare
 * case where it actually differs.
 *
 * If the field already has a value (e.g. duplicated from a past event,
 * or smart-defaulted by the wizard), it stays visible automatically.
 */
function DateRow({
    startValue,
    endValue,
    onStartChange,
    onEndChange,
}: {
    startValue: string;
    endValue: string;
    onStartChange: (v: string) => void;
    onEndChange: (v: string) => void;
}) {
    const [endVisible, setEndVisible] = useState<boolean>(!!endValue);
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
            <DateField
                label="Starts"
                required
                value={startValue}
                onChange={onStartChange}
            />
            {endVisible ? (
                <div className="flex items-end gap-2">
                    <div className="flex-1">
                        <DateField label="Ends" value={endValue} onChange={onEndChange} />
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            setEndVisible(false);
                            onEndChange('');
                        }}
                        className="h-10 px-2 font-data text-[10px] font-bold uppercase tracking-wider text-brutal-dark/50 hover:text-brutal-red"
                    >
                        Remove
                    </button>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => setEndVisible(true)}
                    className="h-10 inline-flex items-center justify-center font-data text-xs font-bold uppercase tracking-wider text-brutal-dark/60 hover:text-brutal-red border-2 border-dashed border-brutal-dark/15 hover:border-brutal-red rounded-xl px-3"
                >
                    + Add end time
                </button>
            )}
        </div>
    );
}

/**
 * Compute a sensible end timestamp from start + per-type duration when
 * the mentor has left "Ends" blank. Used at publish time so the public
 * page always has both endpoints; the editor still doesn't ask.
 */
function autoEndFromStart(state: WizardFormState, eventType: EventType): string {
    if (!state.start_date) return '';
    const start = new Date(state.start_date);
    if (Number.isNaN(start.getTime())) return '';
    const minutes =
        eventType === 'tech_tuesday' && state.typeFields.kind === 'tech_tuesday'
            ? state.typeFields.duration_min || 120
            : eventType === 'maker_meetup'
            ? 240
            : 0;
    if (minutes === 0) return '';
    const end = new Date(start.getTime() + minutes * 60_000);
    return toDatetimeLocal(end.toISOString());
}

/**
 * Per-type editor placeholder. Mentors often stare at an empty doc
 * unsure what to type; a short cue gets them moving without dictating
 * structure.
 */
function descriptionPlaceholderFor(eventType: EventType): string {
    switch (eventType) {
        case 'tech_tuesday':
            return 'What will the speaker cover? Anything attendees should bring? Drop in a poster image, paste a YouTube link…';
        case 'maker_meetup':
            return 'What does the meetup look like? Application criteria, what gets built, what gets shipped…';
        case 'build_challenge':
            return 'What is the brief? Constraints, judging rubric, prizes — drop the deck or link to the rules.';
    }
}

// ═══════════════════════════════════════════════════════════════════
// SMART DEFAULTS
// ═══════════════════════════════════════════════════════════════════

function applySmartDateDefault(eventType: EventType, current: string): string {
    if (current) return current;
    const now = new Date();
    const d = new Date(now);
    d.setSeconds(0, 0);
    switch (eventType) {
        case 'tech_tuesday':
            return toDatetimeLocal(nextTuesdayAt1830(now));
        case 'maker_meetup': {
            const daysToSat = (6 - d.getDay() + 7) % 7 || 7;
            d.setDate(d.getDate() + daysToSat);
            d.setHours(11, 0, 0, 0);
            return toDatetimeLocal(d.toISOString());
        }
        case 'build_challenge': {
            d.setDate(d.getDate() + 14);
            d.setHours(10, 0, 0, 0);
            return toDatetimeLocal(d.toISOString());
        }
    }
}

function applySmartEndDateDefault(
    eventType: EventType,
    startISO: string,
    current: string,
): string {
    if (current) return current;
    if (!startISO) return '';
    const start = new Date(startISO);
    if (Number.isNaN(start.getTime())) return '';
    switch (eventType) {
        case 'tech_tuesday':
            return toDatetimeLocal(new Date(start.getTime() + 120 * 60_000).toISOString());
        case 'maker_meetup':
            return toDatetimeLocal(new Date(start.getTime() + 240 * 60_000).toISOString());
        case 'build_challenge':
            return toDatetimeLocal(new Date(start.getTime() + 7 * 86400_000).toISOString());
    }
}

function applySmartTypeDefaults(state: WizardFormState): void {
    const start = state.start_date ? new Date(state.start_date) : null;
    if (!start || Number.isNaN(start.getTime())) return;
    if (
        state.typeFields.kind === 'maker_meetup' &&
        !state.typeFields.application_deadline
    ) {
        const ad = new Date(start.getTime() - 3 * 86400_000);
        state.typeFields.application_deadline = toDatetimeLocal(ad.toISOString());
    }
    if (
        state.typeFields.kind === 'build_challenge' &&
        !state.typeFields.submission_deadline
    ) {
        const sd = new Date(start.getTime() + 7 * 86400_000);
        state.typeFields.submission_deadline = toDatetimeLocal(sd.toISOString());
    }
}

// ═══════════════════════════════════════════════════════════════════
// MISC HELPERS
// ═══════════════════════════════════════════════════════════════════

function exampleTitleFor(eventType: EventType): string {
    switch (eventType) {
        case 'tech_tuesday':
            return 'Tech Tuesday — AI & Robotics demo';
        case 'maker_meetup':
            return 'Maker Meetup #4 — Autumn cohort';
        case 'build_challenge':
            return 'Build Challenge — Edge AI on a Pi';
    }
}

function cloneEventInto(target: WizardFormState, src: Event): void {
    target.title = src.title;
    target.tagline = src.tagline ?? '';
    target.cover_image_url = src.cover_image_url ?? '';
    target.location = src.location ?? '';
    target.description_blocks = src.description_blocks ?? [];
    target.series_id = src.series_id ?? null;
    target.start_date = applySmartDateDefault(target.typeFields.kind as EventType, '');
    target.end_date = applySmartEndDateDefault(
        target.typeFields.kind as EventType,
        target.start_date,
        '',
    );
    target.prefillSourceTitle = `${src.title} (duplicated)`;
    if (target.typeFields.kind === 'tech_tuesday') {
        target.typeFields.duration_min =
            src.duration_min ?? target.typeFields.duration_min;
        // Each week needs new speaker / topic / RSVP — explicitly clear.
        target.typeFields.speaker_name = '';
        target.typeFields.speaker_bio_short = '';
        target.typeFields.topic_summary = '';
        target.typeFields.external_rsvp_url = '';
    }
    applySmartTypeDefaults(target);
}

function toDatetimeLocal(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
        d.getHours(),
    )}:${pad(d.getMinutes())}`;
}

function SaveStatusChip({
    status,
    lastSavedAt,
}: {
    status: 'idle' | 'saving' | 'saved' | 'error';
    lastSavedAt: Date | null;
}) {
    const map: Record<typeof status, { text: string; cls: string }> = {
        idle: { text: 'Ready', cls: 'bg-brutal-dark/5 text-brutal-dark/50' },
        saving: { text: 'Saving…', cls: 'bg-amber-100 text-amber-800' },
        saved: {
            text: lastSavedAt
                ? `Saved · ${lastSavedAt.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                  })}`
                : 'Saved',
            cls: 'bg-green-100 text-green-800',
        },
        error: { text: 'Save failed', cls: 'bg-brutal-red/10 text-brutal-red' },
    };
    const { text, cls } = map[status];
    return (
        <span
            className={`font-data text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${cls}`}
        >
            {text}
        </span>
    );
}

function ResumeBanner({
    onResume,
    onFresh,
}: {
    onResume: () => void;
    onFresh: () => void;
}) {
    return (
        <div className="flex items-center gap-3 p-3 mb-4 bg-amber-50 border-2 border-amber-300 rounded-xl">
            <span className="font-data text-xs text-amber-900 flex-1">
                You have unsaved work on this event type from a previous session.
            </span>
            <Button variant="ghost" size="sm" onClick={onFresh}>
                Start fresh
            </Button>
            <Button size="sm" onClick={onResume}>
                Resume draft
            </Button>
        </div>
    );
}
