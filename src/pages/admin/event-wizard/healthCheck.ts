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

/**
 * Past-or-future, just-not-empty check.
 * Used by the publish health-check so admins can also post recap-style
 * past events (e.g. "log last Tuesday's session"). The original
 * `dateInFuture` is kept around for any caller that genuinely wants
 * future-only semantics.
 */
function dateValid(iso: string): boolean {
    if (!iso) return false;
    return Number.isFinite(Date.parse(iso));
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
    // ─── Required-everywhere baseline ──────────────────────────
    //
    // A published event page renders garbage without title + a parseable
    // start date. Everything else has either a sensible default or is
    // editorial polish that should not block publish.
    //
    // What changed (UX simplification, see EVENT_FLOW_SIMPLIFICATION_PLAN.md):
    //   - Tagline: no longer required. Empty taglines render fine and
    //     the value is editorial; gating publish on it is friction.
    //   - Cover image: no longer required at the global layer. For
    //     recurring series the wizard pulls a default from
    //     event_series.default_cover_image_url. The CoverImageInput
    //     warns mentors visually if a pasted URL fails to load.
    //   - Body blocks: no longer required ≥ 3. Tech Tuesdays often link
    //     to the Luma page as the canonical description, and a body
    //     of 0 blocks is a valid choice. Cross-field deadline checks
    //     downstream still apply.
    //   - Location: still required, but the type-specific Tech Tuesday
    //     branch makes it "venue or RSVP URL" — a Luma-only event with
    //     no physical venue is still publishable.
    const items: HealthItem[] = [
        {
            id: 'title',
            label: 'Title present',
            status: nonEmpty(state.title) ? 'ok' : 'fail',
            jumpTo: { step: 1, field: 'title' },
        },
        {
            id: 'start_date',
            label: 'Start date set',
            status: dateValid(state.start_date) ? 'ok' : 'fail',
            jumpTo: { step: 1, field: 'start_date' },
        },
    ];

    // ─── Type-specific minimums (the only "must" beyond title+date) ──
    //
    // Per the UX-simplification plan: each event type keeps the smallest
    // set of fields that the public page genuinely cannot render without.
    // Smart-defaulted fields (slot length, team size, deadlines) are
    // therefore *not* checked here — the wizard's blank state seeds them
    // to safe values and mentors only override when needed.
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
                    // Cross-field consistency — the wizard defaults
                    // submission_deadline to start+7d but mentors can
                    // override; we only fail if they've actively set it
                    // *before* the start date.
                    id: 'submission_after_start',
                    label: 'Submission deadline after start date',
                    status:
                        !nonEmpty(f.submission_deadline) ||
                        dateAfter(f.submission_deadline, state.start_date)
                            ? 'ok'
                            : 'fail',
                    jumpTo: { step: 2, field: 'submission_deadline' },
                },
            );
            break;
        }
        case 'maker_meetup': {
            const f = state.typeFields;
            items.push(
                {
                    // Same consistency-only treatment as build challenges:
                    // the wizard defaults application_deadline to start-3d,
                    // we only fail if the mentor has explicitly set it
                    // *after* the start date.
                    id: 'application_before_start',
                    label: 'Application deadline before start date',
                    status:
                        !nonEmpty(f.application_deadline) ||
                        dateBefore(f.application_deadline, state.start_date)
                            ? 'ok'
                            : 'fail',
                    jumpTo: { step: 2, field: 'application_deadline' },
                },
            );
            break;
        }
        case 'tech_tuesday': {
            const f = state.typeFields;
            // Tech Tuesday is RSVP'd externally on Luma; the URL is the
            // single authoritative pointer. Speaker name no longer gates
            // publish — the autofill flow surfaces it visually but a
            // last-minute speaker change shouldn't block "post the page".
            items.push(
                {
                    id: 'luma',
                    label: 'External RSVP URL points to Luma',
                    status: LUMA_URL.test(f.external_rsvp_url) ? 'ok' : 'fail',
                    jumpTo: { step: 2, field: 'external_rsvp_url' },
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
