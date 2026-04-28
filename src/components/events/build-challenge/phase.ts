import type { Event } from '../../../lib/database.types';

/**
 * Build Challenge lifecycle phase.
 *
 * The phase is derived from three deadlines on the event row:
 *   shortlist_deadline   — applications close, admin review starts
 *   submission_deadline  — submissions lock
 *   winners_published_at — winners become public
 *
 * We also have a bail-out "unconfigured" phase for events where the
 * host hasn't yet set shortlist_deadline / submission_deadline — the
 * public-side UI shows a soft explainer rather than inviting applications
 * that will never be reviewed.
 */
export type BuildChallengePhase =
    | 'unconfigured'
    | 'applications_open'
    | 'shortlist_review'
    | 'submissions_open'
    | 'submissions_locked'
    | 'winners_published';

export function computeBuildChallengePhase(event: Event, now: number = Date.now()): BuildChallengePhase {
    if (event.winners_published_at) return 'winners_published';

    const shortlistMs = event.shortlist_deadline ? Date.parse(event.shortlist_deadline) : NaN;
    const submissionMs = event.submission_deadline ? Date.parse(event.submission_deadline) : NaN;

    if (!Number.isFinite(shortlistMs) || !Number.isFinite(submissionMs)) {
        return 'unconfigured';
    }

    if (now < shortlistMs) return 'applications_open';
    if (now < submissionMs) {
        // Between shortlist close and submission deadline — shortlisted teams
        // may submit; public shows "review in progress" until submission_deadline
        // hits and the gallery opens.
        // We keep 'shortlist_review' as a distinct phase in case we want to
        // surface different copy (e.g. "results coming soon") but the caller
        // treats both as submission-form phase for shortlisted teams.
        return 'submissions_open';
    }
    return 'submissions_locked';
}
