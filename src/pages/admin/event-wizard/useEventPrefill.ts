import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import type { Event, EventType } from '../../../lib/database.types';
import type { WizardFormState } from './wizardTypes';
import { blankWizardState } from './wizardTypes';

/**
 * useEventPrefill — pulls defaults from the last event of the same type.
 *
 * The wizard calls this once on mount when there is no resumable draft.
 * It fetches the most recent `event` row of the given type (ordered by
 * date desc) and returns a `WizardFormState` seeded with the fields that
 * almost never change week-to-week:
 *
 *   Shared:   cover_image_url, location
 *   Build:    team_size_max, submission_url_pattern, prize_summary
 *   Meetup:   capacity, interview_slot_length_min
 *   Tuesday:  duration_min
 *
 * Fields we always clear: title, tagline, start_date, end_date, deadlines,
 * speaker fields (per-session), external_rsvp_url (each Luma link is unique).
 *
 * If there is no previous event of this type, we fall back to a blank
 * state. The `prefillSourceTitle` field on the returned state powers the
 * prefill banner so the user can tell where the values came from.
 */

export interface UseEventPrefillResult {
    /** null while loading, then the seeded state. */
    prefilled: WizardFormState | null;
}

export function useEventPrefill(eventType: EventType): UseEventPrefillResult {
    const [prefilled, setPrefilled] = useState<WizardFormState | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const { data } = await supabase
                .from('event')
                .select('*')
                .eq('event_type', eventType)
                .order('date', { ascending: false })
                .limit(1)
                .maybeSingle<Event>();

            if (cancelled) return;

            const base = blankWizardState(eventType);
            if (!data) {
                setPrefilled(base);
                return;
            }

            // Shared Step-1 fields carried forward.
            base.cover_image_url = data.cover_image_url || '';
            base.location = data.location?.startsWith('rsvp:') ? '' : (data.location || '');

            // Type-specific fields. We cannot read the new typed columns
            // yet (Prompts 8/9/10 add them), so we only carry forward the
            // handful of stable knobs we can infer from existing rows.
            if (base.typeFields.kind === 'maker_meetup') {
                base.typeFields.capacity = data.capacity || 0;
            }

            base.prefillSourceTitle = data.title;
            setPrefilled(base);
        })();

        return () => {
            cancelled = true;
        };
    }, [eventType]);

    return { prefilled };
}
