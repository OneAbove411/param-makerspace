/**
 * zeroCTA — maps zero-count metrics to action-oriented CTA labels.
 *
 * When a metric (likes, comments, builds, etc.) has a count > 0, returns the
 * raw number as a string. When count === 0, returns a contextual CTA prompt
 * to encourage user engagement ("Be the first to like this", etc.).
 *
 * Used by ProjectCard, ChallengeCard, EventCard, AtAGlanceStrip, and any
 * future component that renders engagement counts.
 *
 * Zero-state CTA text should be styled with:
 *   font-data text-[11px] text-brutal-red/60 italic
 */

export type ZeroCTAMetric =
    | 'likes'
    | 'comments'
    | 'builds'
    | 'bookmarks'
    | 'registrations';

export interface ZeroCTAResult {
    /** The display label — either a number string or a CTA prompt */
    label: string;
    /** True when the count is zero and the label is a CTA */
    isZero: boolean;
}

const ZERO_LABELS: Record<ZeroCTAMetric, string> = {
    likes: 'Be the first to like this \u2661',
    comments: 'Start the conversation \u2192',
    builds: 'No builds yet \u2014 be the first!',
    bookmarks: 'Save this for later',
    registrations: 'Be the first to register \u2192',
};

export function zeroCTA(
    metric: ZeroCTAMetric,
    count: number,
    _options?: { isAuthenticated?: boolean }
): ZeroCTAResult {
    if (count > 0) {
        return { label: String(count), isZero: false };
    }

    return {
        label: ZERO_LABELS[metric] ?? '0',
        isZero: true,
    };
}
