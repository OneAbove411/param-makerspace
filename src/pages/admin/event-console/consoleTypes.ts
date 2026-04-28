import type { EventType } from '../../../lib/database.types';

/**
 * Which tabs the ops console shows for a given event type.
 *
 * Centralized so:
 *   - Prompts 8 (Shortlist/Submissions/Winners) and 12 (Recap) don't need
 *     to touch the console shell — they just light up their own placeholders.
 *   - The tab bar and the route validator stay in sync.
 *
 * Order here is the order rendered in the tab bar.
 */

export type ConsoleTabId =
    | 'overview'
    | 'registrations'
    | 'shortlist'
    | 'submissions'
    | 'winners'
    | 'selection'
    | 'recap';

export interface ConsoleTabDef {
    id: ConsoleTabId;
    label: string;
    /** Always | only after end_date | only when event_type matches one of these. */
    gating: 'always' | 'past_only';
    allowedTypes?: EventType[];
}

export const TAB_DEFS: ConsoleTabDef[] = [
    { id: 'overview', label: 'Overview', gating: 'always' },
    { id: 'registrations', label: 'Registrations', gating: 'always' },
    { id: 'shortlist', label: 'Shortlist', gating: 'always', allowedTypes: ['build_challenge', 'maker_meetup'] },
    { id: 'submissions', label: 'Submissions', gating: 'always', allowedTypes: ['build_challenge'] },
    { id: 'winners', label: 'Winners', gating: 'always', allowedTypes: ['build_challenge'] },
    { id: 'selection', label: 'Selection', gating: 'always', allowedTypes: ['maker_meetup'] },
    { id: 'recap', label: 'Recap', gating: 'past_only' },
];

export function visibleTabs(eventType: EventType, endDateMs: number | null): ConsoleTabDef[] {
    const now = Date.now();
    return TAB_DEFS.filter((t) => {
        if (t.allowedTypes && !t.allowedTypes.includes(eventType)) return false;
        if (t.gating === 'past_only' && (endDateMs === null || endDateMs > now)) return false;
        return true;
    });
}

export function isValidTab(eventType: EventType, endDateMs: number | null, id: string): id is ConsoleTabId {
    return visibleTabs(eventType, endDateMs).some((t) => t.id === id);
}
