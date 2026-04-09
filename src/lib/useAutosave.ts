import { useEffect, useRef, useState } from 'react';

/**
 * useAutosave — debounced autosave hook with status state.
 *
 * Watches a serializable `value` and, whenever it changes, waits `delayMs`
 * of stillness before calling `onSave(value)`. Tracks the save state as
 * `'idle' | 'saving' | 'saved' | 'error'` so callers can render a status
 * chip ("Saved · 12:04", "Saving…", "Save failed").
 *
 * Design notes:
 *   - The first render is treated as "hydrate from server" and does NOT
 *     trigger a save. Callers can signal a fresh hydration by bumping
 *     `hydrationKey` (e.g. the project id) — when it changes, the internal
 *     baseline is reset without firing a save.
 *   - `enabled=false` disables the watcher entirely (useful while the
 *     form is still loading or in a read-only state).
 *   - Errors leave the status as `'error'` until the next successful save
 *     or the next debounce cycle.
 *
 * The hook intentionally serializes `value` with `JSON.stringify` for
 * change detection so callers don't need to worry about reference equality.
 */

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface UseAutosaveOptions<T> {
    value: T;
    onSave: (value: T) => Promise<{ error?: unknown } | void>;
    delayMs?: number;
    enabled?: boolean;
    /** Any serializable key — when it changes the baseline is reset. */
    hydrationKey?: string | number;
}

export interface UseAutosaveResult {
    status: AutosaveStatus;
    lastSavedAt: Date | null;
    /** Force a save immediately, bypassing the debounce. */
    saveNow: () => Promise<void>;
}

export function useAutosave<T>({
    value,
    onSave,
    delayMs = 800,
    enabled = true,
    hydrationKey,
}: UseAutosaveOptions<T>): UseAutosaveResult {
    const [status, setStatus] = useState<AutosaveStatus>('idle');
    const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

    const baselineRef = useRef<string | null>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const latestValueRef = useRef<T>(value);
    const onSaveRef = useRef(onSave);
    const inFlightRef = useRef(false);

    // Keep refs fresh without re-triggering the main effect.
    useEffect(() => {
        latestValueRef.current = value;
    }, [value]);
    useEffect(() => {
        onSaveRef.current = onSave;
    }, [onSave]);

    // Reset baseline on hydration (project id changed, or first enable).
    useEffect(() => {
        baselineRef.current = JSON.stringify(value);
        setStatus('idle');
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hydrationKey]);

    // Debounced save watcher.
    useEffect(() => {
        if (!enabled) return;
        const serialized = JSON.stringify(value);
        if (baselineRef.current === null) {
            baselineRef.current = serialized;
            return;
        }
        if (serialized === baselineRef.current) return;

        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(async () => {
            // Honor the in-flight guard: if a save is already running, queue another one
            if (inFlightRef.current) {
                if (timerRef.current) clearTimeout(timerRef.current);
                timerRef.current = setTimeout(() => {
                    // Re-trigger the watcher by setting baseline to null
                    baselineRef.current = null;
                }, 50);
                return;
            }

            inFlightRef.current = true;
            setStatus('saving');
            try {
                const result = await onSaveRef.current(latestValueRef.current);
                if (result && 'error' in result && result.error) {
                    setStatus('error');
                    inFlightRef.current = false;
                    return;
                }
                baselineRef.current = JSON.stringify(latestValueRef.current);
                setLastSavedAt(new Date());
                setStatus('saved');
                inFlightRef.current = false;

                // If user kept editing while we saved, queue another save
                const currentSerialized = JSON.stringify(latestValueRef.current);
                if (currentSerialized !== baselineRef.current) {
                    if (timerRef.current) clearTimeout(timerRef.current);
                    timerRef.current = setTimeout(() => {
                        baselineRef.current = null;
                    }, 50);
                }
            } catch {
                setStatus('error');
                inFlightRef.current = false;
            }
        }, delayMs);

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [value, enabled, delayMs]);

    const saveNow = async () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }

        // Honor the in-flight guard: if a save is already running, don't queue another
        if (inFlightRef.current) {
            return;
        }

        inFlightRef.current = true;
        setStatus('saving');
        try {
            const result = await onSaveRef.current(latestValueRef.current);
            if (result && 'error' in result && result.error) {
                setStatus('error');
                inFlightRef.current = false;
                return;
            }
            baselineRef.current = JSON.stringify(latestValueRef.current);
            setLastSavedAt(new Date());
            setStatus('saved');
            inFlightRef.current = false;
        } catch {
            setStatus('error');
            inFlightRef.current = false;
        }
    };

    return { status, lastSavedAt, saveNow };
}
