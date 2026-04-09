import { useCallback, useRef, useState } from 'react';

/**
 * Tiny wrapper for optimistic UI updates around an async mutation.
 *
 * It exposes a locally-held value that you can render immediately, plus a
 * `mutate(next, fn)` helper: it sets the value to `next`, runs the async
 * `fn`, and rolls back to the previous value if `fn` rejects. The actual
 * server result (if returned by `fn`) is committed on success so the UI
 * stays in sync with the source of truth.
 *
 * Built as a thin shim — not React 19's `useOptimistic` — so it works the
 * same way regardless of where it's called from (event handlers, transitions,
 * etc.).
 *
 * Usage:
 *     const [likes, mutateLikes, isPending, error] = useOptimistic(initialLikes);
 *     const onLike = () => mutateLikes(likes + 1, () => api.like(projectId));
 */
export function useOptimistic<T>(
    initial: T,
): [
    T,
    (next: T, fn: () => Promise<T | void>) => Promise<void>,
    boolean,
    unknown,
] {
    const [value, setValue] = useState<T>(initial);
    const [isPending, setPending] = useState(false);
    const [error, setError] = useState<unknown>(null);
    const previousRef = useRef<T>(initial);

    const mutate = useCallback(
        async (next: T, fn: () => Promise<T | void>) => {
            previousRef.current = value;
            setValue(next);
            setPending(true);
            setError(null);
            try {
                const result = await fn();
                if (result !== undefined) {
                    setValue(result as T);
                }
            } catch (err) {
                setValue(previousRef.current);
                setError(err);
                throw err;
            } finally {
                setPending(false);
            }
        },
        [value],
    );

    return [value, mutate, isPending, error];
}
