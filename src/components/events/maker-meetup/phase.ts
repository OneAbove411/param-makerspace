import type { Event } from '../../../lib/database.types';

/**
 * Maker Meetup lifecycle phase.
 *
 * The phase is derived from three deadlines + selection publish flag
 * on the event row:
 *   application_deadline       — applications close, admin starts reviewing
 *   selection_published_at     — final selection visible to applicants
 *   interview_slot_length_min  — indirectly validates the setup is ready
 *
 * We also carry a bail-out "unconfigured" phase for events where the
 * host hasn't set application_deadline — the public page shows a soft
 * explainer rather than inviting applications that will never route
 * anywhere.
 *
 * Notes:
 *   • There is no "submissions_locked" analogue here — the analog to
 *     that is the selection window, which we call 'selection_pending'.
 *   • We deliberately don't hide applications after the deadline on
 *     the applicant-facing phase; the UI switches to "decision pending"
 *     based on application status.
 */
export type MakerMeetupPhase =
    | 'unconfigured'
    | 'applications_open'
    | 'selection_pending'
    | 'selection_published';

export function computeMakerMeetupPhase(event: Event, now: number = Date.now()): MakerMeetupPhase {
    if (event.selection_published_at) return 'selection_published';

    const appMs = event.application_deadline ? Date.parse(event.application_deadline) : NaN;
    if (!Number.isFinite(appMs)) {
        return 'unconfigured';
    }

    if (now < appMs) return 'applications_open';
    return 'selection_pending';
}
