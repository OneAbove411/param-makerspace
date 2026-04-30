/**
 * homeDataReady — Lightweight signal that tells AppBootLoader when the
 * home page's critical Supabase data (projects, events, activity) has
 * landed so the loading curtain can lift with a fully-populated page.
 *
 * Flow:
 *   1. Home.tsx mounts behind the opaque boot overlay and fires all
 *      prefetch calls immediately (useHomeLive cache, project grid,
 *      activity feed).
 *   2. When the prefetches settle, Home calls `signalHomeDataReady()`.
 *   3. AppBootLoader's settle() awaits `waitForHomeData(2500)` on the
 *      '/' route, which resolves as soon as the signal fires (or on
 *      timeout so the app never stays stuck).
 *
 * The signal is one-shot per page load. `resetHomeDataReady()` is
 * called at the top of Home's prefetch effect so a hot-reload / remount
 * re-arms it cleanly.
 */

type Listener = () => void;

let ready = false;
const listeners: Listener[] = [];

/** Mark home data as loaded. Resolves all pending waiters. */
export function signalHomeDataReady(): void {
    if (ready) return;
    ready = true;
    for (const fn of listeners) fn();
    listeners.length = 0;
}

/**
 * Returns a promise that resolves when home data is ready OR after
 * `timeoutMs` — whichever comes first.  Safe to call from any route;
 * on non-home pages the timeout acts as the hydration buffer.
 */
export function waitForHomeData(timeoutMs: number): Promise<void> {
    if (ready) return Promise.resolve();
    return new Promise<void>((resolve) => {
        let settled = false;
        const settle = () => {
            if (settled) return;
            settled = true;
            resolve();
        };
        const timer = setTimeout(settle, timeoutMs);
        const cb: Listener = () => {
            clearTimeout(timer);
            settle();
        };
        listeners.push(cb);
    });
}

/** Re-arm the signal (called before each prefetch round). */
export function resetHomeDataReady(): void {
    ready = false;
    // Don't clear listeners — any in-flight waiters should still resolve
    // via timeout if the new prefetch round doesn't complete.
}

export function isHomeDataReady(): boolean {
    return ready;
}
