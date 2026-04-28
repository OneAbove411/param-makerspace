import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import type { EventType } from '../../../lib/database.types';
import type { WizardFormState } from './wizardTypes';

/**
 * useEventDraft — loads and writes the per-user, per-type wizard draft.
 *
 * Each (user, event_type) has at most one draft row. The draft carries the
 * full wizard state (Step 1 + Step 2 + Advanced + step index) as JSON so
 * we don't need a migration every time Step 2 grows a new field.
 *
 * Surface:
 *   - `draftState` is `null` while loading, `undefined` if the user has
 *     no existing draft, or a `WizardFormState` if a draft was found.
 *     The three-way shape is what lets the resume dialog render:
 *         null      → "Loading…"
 *         undefined → start fresh, no banner
 *         state     → show the "Resume / Start fresh" dialog
 *
 *   - `writeDraft(payload)` upserts the full payload. Called from the
 *     autosave hook, which debounces and wraps this with status state.
 *
 *   - `deleteDraft()` is invoked after a successful publish, or from the
 *     "Start fresh" branch of the resume dialog.
 *
 * The hook intentionally does NOT own the autosave debounce — that lives
 * in `useAutosave` (already in the project). This keeps the responsibilities
 * clean: persistence here, debounce + status there.
 */

type LoadedState = WizardFormState | undefined; // undefined = no row

export interface UseEventDraftResult {
    /** null while loading, then undefined or WizardFormState. */
    draftState: LoadedState | null;
    writeDraft: (payload: WizardFormState) => Promise<{ error?: string }>;
    deleteDraft: () => Promise<{ error?: string }>;
    reload: () => Promise<void>;
}

export function useEventDraft(userId: string | undefined, eventType: EventType): UseEventDraftResult {
    const [draftState, setDraftState] = useState<LoadedState | null>(null);

    const fetchDraft = useCallback(async () => {
        if (!userId) {
            setDraftState(undefined);
            return;
        }
        const { data, error } = await supabase
            .from('event_draft')
            .select('payload')
            .eq('user_id', userId)
            .eq('event_type', eventType)
            .maybeSingle();
        if (error || !data) {
            setDraftState(undefined);
            return;
        }
        // The payload is arbitrary JSON. We trust the shape because only
        // this app writes to it; if it's malformed, the wizard will render
        // with missing fields and the user can just "Start fresh".
        setDraftState(data.payload as unknown as WizardFormState);
    }, [userId, eventType]);

    useEffect(() => {
        void fetchDraft();
    }, [fetchDraft]);

    const writeDraft = useCallback(
        async (payload: WizardFormState) => {
            if (!userId) return { error: 'no user' };
            // Cast payload to Record<string, unknown> — the supabase-js types
            // model payload as a generic object but our WizardFormState is
            // structurally JSON-safe. We assert here rather than widen the
            // hook surface so callers keep strict typing.
            const row = {
                user_id: userId,
                event_type: eventType,
                payload: payload as unknown as Record<string, unknown>,
            };
            const { error } = await supabase
                .from('event_draft')
                .upsert(row, { onConflict: 'user_id,event_type' });
            return { error: error?.message };
        },
        [userId, eventType],
    );

    const deleteDraft = useCallback(async () => {
        if (!userId) return { error: 'no user' };
        const { error } = await supabase
            .from('event_draft')
            .delete()
            .eq('user_id', userId)
            .eq('event_type', eventType);
        return { error: error?.message };
    }, [userId, eventType]);

    return { draftState, writeDraft, deleteDraft, reload: fetchDraft };
}
