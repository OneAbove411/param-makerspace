import type { WizardFormState } from './wizardTypes';

/**
 * Event-health checklist for Step 3 (Prompt 6).
 *
 * Pure function — takes a wizard state, returns an ordered list of check
 * results. The Step-3 UI renders each item with a ✓ / ✗ and, for failing
 * items, a "jump-to-field" target so the user can fix it in one click.
 *
 * "Publish" is enabled only when every item passes.
 *
 * Notes:
 *   - We check 8 items (6 common + 2 type-specific), matching Prompt 6.
 *   - The `jumpTo` value is an arbitrary anchor that the wizard shell
 *     wires to a scroll/focus handler — we don't assume a DOM shape here.
 */

export type HealthStatus = 'ok' | 'fail';

export interface HealthItem {
    id: string;
    /** Short human label shown on the checklist. */
    label: string;
    status: HealthStatus;
    /** Optional field anchor to focus when the user clicks a failing row. */
    jumpTo: HealthAnchor;
}

export type HealthAnchor =
    | { step: 1; field: 'title' | 'tagline' | 'cover_image_url' | 'start_date' | 'location' }
    | { step: 2; field: string };

export interface HealthSummary {
    items: HealthItem[];
    allPassing: boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────

const LUMA_URL = /^https:\/\/(lu\.ma|luma\.com)\//i;

function nonEmpty(v: string | null | undefined): boolean {
    return typeof v === 'string' && v.trim().length > 0;
}

function dateInFuture(iso: string): boolean {
    if (!iso) return false;
    const t = Date.parse(iso);
    return Number.isFinite(t) && t > Date.now();
}

function dateAfter(a: string, b: string): boolean {
    if (!a || !b) return false;
    return Date.parse(a) > Date.parse(b);
}

function dateBefore(a: string, b: string): boolean {
    if (!a || !b) return false;
    return Date.parse(a) < Date.parse(b);
}

// ─── Main ───────────────────────────────────────────────────────────

export function computeHealth(state: WizardFormState): HealthSummary {
    const items: HealthItem[] = [
        {
            id: 'title',
            label: 'Title present',
            status: nonEmpty(state.title) ? 'ok' : 'fail',
            jumpTo: { step: 1, field: 'title' },
        },
        {
            id: 'tagline',
            label: 'Tagline present',
            status: nonEmpty(state.tagline) ? 'ok' : 'fail',
            jumpTo: { step: 1, field: 'tagline' },
        },
        {
            id: 'cover',
            label: 'Cover image set',
            status: nonEmpty(state.cover_image_url) ? 'ok' : 'fail',
            jumpTo: { step: 1, field: 'cover_image_url' },
        },
        {
            id: 'start_date',
            label: 'Start date is in the future',
            status: dateInFuture(state.start_date) ? 'ok' : 'fail',
            jumpTo: { step: 1, field: 'start_date' },
        },
        {
            id: 'location',
            label: 'Location or venue present',
            status: nonEmpty(state.location) ? 'ok' : 'fail',
            jumpTo: { step: 1, field: 'location' },
        },
        {
            id: 'body',
            label: 'Body has at least 3 blocks',
            status: state.description_blocks.length >= 3 ? 'ok' : 'fail',
            jumpTo: { step: 1, field: 'title' }, // body edits live on step 1/2 depending on UI; default to step 1
        },
    ];

    switch (state.typeFields.kind) {
        case 'build_challenge': {
            const f = state.typeFields;
            items.push(
                {
                    id: 'prize_summary',
                    label: 'Prize summary present',
                    status: nonEmpty(f.prize_summary) ? 'ok' : 'fail',
                    jumpTo: { step: 2, field: 'prize_summary' },
                },
                {
                    id: 'submission_after_start',
                    label: 'Submission deadline after start date',
                    status: dateAfter(f.submission_deadline, state.start_date) ? 'ok' : 'fail',
                    jumpTo: { step: 2, field: 'submission_deadline' },
                },
            );
            break;
        }
        case 'maker_meetup': {
            const f = state.typeFields;
            items.push(
                {
                    id: 'application_before_start',
                    label: 'Application deadline before start date',
                    status:
                        nonEmpty(f.application_deadline) && dateBefore(f.application_deadline, state.start_date)
                            ? 'ok'
                            : 'fail',
                    jumpTo: { step: 2, field: 'application_deadline' },
                },
                {
                    id: 'slot_length',
                    label: 'Interview slot length > 0',
                    status: f.interview_slot_length_min > 0 ? 'ok' : 'fail',
                    jumpTo: { step: 2, field: 'interview_slot_length_min' },
                },
            );
            break;
        }
        case 'tech_tuesday': {
            const f = state.typeFields;
            items.push(
                {
                    id: 'luma',
                    label: 'External RSVP URL points to Luma',
                    status: LUMA_URL.test(f.external_rsvp_url) ? 'ok' : 'fail',
                    jumpTo: { step: 2, field: 'external_rsvp_url' },
                },
                {
                    id: 'speaker',
                    label: 'Speaker name present',
                    status: nonEmpty(f.speaker_name) ? 'ok' : 'fail',
                    jumpTo: { step: 2, field: 'speaker_name' },
                },
            );
            break;
        }
    }

    return {
        items,
        allPassing: items.every((i) => i.status === 'ok'),
    };
}
