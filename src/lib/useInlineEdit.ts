import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from './supabase';
import type { AutosaveStatus } from './useAutosave';

/**
 * useInlineEdit — single-field click-to-edit helper for the public
 * event page (P13).
 *
 * Pattern:
 *   const edit = useInlineEdit<string>({
 *       eventId,
 *       column: 'title',
 *       initialValue: event.title,
 *       canEdit: isMentorOrAdmin,
 *   });
 *
 *   edit.isEditing         → boolean, whether the caller should render the input
 *   edit.draft             → current buffer (controlled input value)
 *   edit.setDraft(v)       → update the buffer
 *   edit.start()           → enter edit mode (only if canEdit)
 *   edit.cancel()          → leave edit mode, revert to the last-committed value
 *   edit.commit()          → persist the buffer via `supabase.update({ [column]: draft })`
 *   edit.status            → autosave-pill status
 *   edit.lastSavedAt       → Date | null
 *   edit.value             → last-committed value (mirrors initialValue until commit)
 *
 * Design notes:
 *   - `commit()` skips the round-trip when the draft is identical to the
 *     last-committed value (avoids empty updates and status noise).
 *   - Status transitions: idle → saving → (saved | error). On `saved`,
 *     the hook auto-returns to `idle` after 2 s so the pill fades.
 *   - `eventId` + `column` are captured in a ref so a remounted
 *     component never collides with the write cycle.
 *   - The hook is deliberately NOT debounced — inline edits commit on
 *     explicit actions (blur, Enter, Save button). Combining autosave
 *     WITH click-to-edit confuses keyboard users.
 */

export interface UseInlineEditOptions<T> {
    eventId: string;
    /** Column name on the `event` table to write when committing. */
    column: string;
    /** Initial persisted value; also used as the "revert target" on cancel. */
    initialValue: T;
    /** When false, `start()` is a no-op and the hook stays in read-only mode. */
    canEdit?: boolean;
    /** Optional transform before the update, e.g. `.trim() || null`. */
    serialize?: (draft: T) => unknown;
    /** Called after a successful save. */
    onSaved?: (value: T) => void;
}

export interface UseInlineEditResult<T> {
    isEditing: boolean;
    draft: T;
    value: T;
    setDraft: (next: T) => void;
    start: () => void;
    cancel: () => void;
    commit: () => Promise<void>;
    status: AutosaveStatus;
    lastSavedAt: Date | null;
}

export function useInlineEdit<T>({
    eventId,
    column,
    initialValue,
    canEdit = true,
    serialize,
    onSaved,
}: UseInlineEditOptions<T>): UseInlineEditResult<T> {
    const [isEditing, setIsEditing] = useState(false);
    const [value, setValue] = useState<T>(initialValue);
    const [draft, setDraft] = useState<T>(initialValue);
    const [status, setStatus] = useState<AutosaveStatus>('idle');
    const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

    const idleResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const inFlight = useRef(false);

    // If the event row is refetched, resync. Serialize for comparison
    // so we don't stomp a local draft with a stale server value while
    // the user is actively editing.
    useEffect(() => {
        if (isEditing) return;
        const a = JSON.stringify(value);
        const b = JSON.stringify(initialValue);
        if (a !== b) {
            setValue(initialValue);
            setDraft(initialValue);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialValue]);

    // Clean up the idle-reset timer on unmount.
    useEffect(() => () => {
        if (idleResetTimer.current) clearTimeout(idleResetTimer.current);
    }, []);

    const start = useCallback(() => {
        if (!canEdit) return;
        setDraft(value);
        setIsEditing(true);
    }, [canEdit, value]);

    const cancel = useCallback(() => {
        setDraft(value);
        setIsEditing(false);
    }, [value]);

    const commit = useCallback(async () => {
        if (inFlight.current) return;
        const a = JSON.stringify(draft);
        const b = JSON.stringify(value);
        if (a === b) {
            setIsEditing(false);
            return;
        }
        inFlight.current = true;
        setStatus('saving');
        try {
            const payload = serialize ? serialize(draft) : draft;
            const { error } = await supabase
                .from('event')
                .update({ [column]: payload })
                .eq('id', eventId);
            if (error) {
                setStatus('error');
                return;
            }
            setValue(draft);
            setLastSavedAt(new Date());
            setStatus('saved');
            setIsEditing(false);
            if (onSaved) onSaved(draft);
            // Fade the pill back to idle after a beat.
            if (idleResetTimer.current) clearTimeout(idleResetTimer.current);
            idleResetTimer.current = setTimeout(() => setStatus('idle'), 2000);
        } catch {
            setStatus('error');
        } finally {
            inFlight.current = false;
        }
    }, [column, draft, eventId, onSaved, serialize, value]);

    return {
        isEditing,
        draft,
        value,
        setDraft,
        start,
        cancel,
        commit,
        status,
        lastSavedAt,
    };
}
