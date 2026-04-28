/**
 * Event-wizard shared types.
 *
 * These types describe the shape of the form state for every step of the
 * Create-Event wizard — shared across build_challenge / maker_meetup /
 * tech_tuesday, with the type-specific Step-2 fields kept in a single
 * discriminated union so the autosave payload stays flat and JSON-safe.
 *
 * Why one combined type instead of three:
 *   - The autosave payload on `event_draft.payload` is generic JSONB, so
 *     keeping a single TS shape makes the (de)serialization trivial.
 *   - Fields that diverge by type are grouped under `typeFields` so the
 *     discriminated union guards the UI from accidentally showing a
 *     build-only field on a tech_tuesday draft.
 *
 * The field list is deliberately minimal — Prompt 2's Advanced drawer
 * reaches into the same object but those fields are rendered from a
 * separate helper so they don't pollute the hot-path state shape.
 */

import type { EventBlock, EventType } from '../../../lib/database.types';

// ─── Per-type Step-2 fields ─────────────────────────────────────────

export interface BuildChallengeFields {
    kind: 'build_challenge';
    /** Short summary of prizes shown at the top of the public page. */
    prize_summary: string;
    /** Upper bound on team size (>=1). */
    team_size_max: number;
    /** ISO datetime string — end of shortlist window. */
    shortlist_deadline: string;
    /** ISO datetime string — final submission deadline. */
    submission_deadline: string;
    /** Template for the submission URL (e.g. devpost link, GitHub topic). */
    submission_url_pattern: string;
}

export interface MakerMeetupFields {
    kind: 'maker_meetup';
    /** Max attendees; 0 = unlimited. */
    capacity: number;
    /** ISO datetime string — end of application window. */
    application_deadline: string;
    /** Length of each interview slot, in minutes. */
    interview_slot_length_min: number;
    /** ISO datetime string — when final selection is published. */
    selection_deadline: string;
    /** Duplicate of event.date on the top-level — kept for validation symmetry. */
    start_date: string;
}

export interface TechTuesdayFields {
    kind: 'tech_tuesday';
    /** External RSVP URL (Luma). */
    external_rsvp_url: string;
    /** Speaker display name. */
    speaker_name: string;
    /** Short speaker bio (1–2 sentences). */
    speaker_bio_short: string;
    /** One-line topic summary. */
    topic_summary: string;
    /** Duration in minutes. */
    duration_min: number;
}

export type TypeFields =
    | BuildChallengeFields
    | MakerMeetupFields
    | TechTuesdayFields;

// ─── Advanced drawer fields (Prompt 2) ──────────────────────────────
//
// Everything here is genuinely optional — the health-check in Prompt 6
// does NOT require any of them. Keeping them on the same state object
// means autosave captures them transparently.

export interface AdvancedFields {
    /** Override for the short public tagline. */
    tagline_override: string;
    /** Extra gallery seed URLs (post-event upload is separate in Prompt 12). */
    gallery_seed_urls: string[];
    /** Long-form prizes copy (build challenge only). */
    prizes_info: string;
    /** Placeholder for later wrap-up (shown after end_date). */
    results_summary_placeholder: string;
    /** Free-text capacity rules, e.g. "priority to first-year makers". */
    custom_capacity_rules: string;
    /**
     * Visibility flags. A future prompt will use these to gate list-view
     * appearance; for now they are captured but not enforced.
     */
    visibility_unlisted: boolean;
}

// ─── Full wizard form state ─────────────────────────────────────────

export interface WizardFormState {
    /** Which step the user is currently on (1 | 2 | 3). */
    step: 1 | 2 | 3;
    /** Shared Step-1 fields. */
    title: string;
    tagline: string;
    cover_image_url: string;
    start_date: string;   // ISO datetime-local
    end_date: string;     // ISO datetime-local (optional, empty = none)
    location: string;
    /** Block-editor body (P4). */
    description_blocks: EventBlock[];
    /** Type-specific Step-2 fields. */
    typeFields: TypeFields;
    /** Advanced drawer state + fields. */
    advanced: AdvancedFields;
    advancedOpen: boolean;
    /**
     * Tracks the wizard's origin for prefill banner copy. Null if the user
     * started fresh or cleared defaults.
     */
    prefillSourceTitle: string | null;
    /**
     * Optional event_series.id — set by the "New Tech Tuesday" fast-create
     * and "Duplicate last Tuesday" flows so the published event links back
     * to its recurring template. Null for one-off events.
     */
    series_id: string | null;
}

// ─── Factory: blank state per event type ────────────────────────────

export function blankTypeFields(eventType: EventType): TypeFields {
    switch (eventType) {
        case 'build_challenge':
            return {
                kind: 'build_challenge',
                prize_summary: '',
                team_size_max: 4,
                shortlist_deadline: '',
                submission_deadline: '',
                submission_url_pattern: '',
            };
        case 'maker_meetup':
            return {
                kind: 'maker_meetup',
                capacity: 0,
                application_deadline: '',
                interview_slot_length_min: 15,
                selection_deadline: '',
                start_date: '',
            };
        case 'tech_tuesday':
            return {
                kind: 'tech_tuesday',
                external_rsvp_url: '',
                speaker_name: '',
                speaker_bio_short: '',
                topic_summary: '',
                duration_min: 120,
            };
    }
}

export function blankAdvancedFields(): AdvancedFields {
    return {
        tagline_override: '',
        gallery_seed_urls: [],
        prizes_info: '',
        results_summary_placeholder: '',
        custom_capacity_rules: '',
        visibility_unlisted: false,
    };
}

export function blankWizardState(eventType: EventType): WizardFormState {
    return {
        step: 1,
        title: '',
        tagline: '',
        cover_image_url: '',
        start_date: '',
        end_date: '',
        location: '',
        description_blocks: [],
        typeFields: blankTypeFields(eventType),
        advanced: blankAdvancedFields(),
        advancedOpen: false,
        prefillSourceTitle: null,
        series_id: null,
    };
}

// ─── Route slug helpers ─────────────────────────────────────────────

export const EVENT_TYPE_SLUGS = {
    build_challenge: 'build-challenge',
    maker_meetup: 'maker-meetup',
    tech_tuesday: 'tech-tuesday',
} as const satisfies Record<EventType, string>;

export const EVENT_TYPE_LABELS = {
    build_challenge: 'Build Challenge',
    maker_meetup: 'Maker Meetup',
    tech_tuesday: 'Tech Tuesday',
} as const satisfies Record<EventType, string>;

export const EVENT_TYPE_TAGLINES = {
    build_challenge: 'Teams compete on a hardware brief. Shortlist, submit, win.',
    maker_meetup: 'Application + interview meetup. Curated attendance.',
    tech_tuesday: 'Weekly talk night. RSVP external. Public, no filter.',
} as const satisfies Record<EventType, string>;

export function slugToEventType(slug: string): EventType | null {
    const match = (Object.entries(EVENT_TYPE_SLUGS) as [EventType, string][])
        .find(([, s]) => s === slug);
    return match ? match[0] : null;
}
