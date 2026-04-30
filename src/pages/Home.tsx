import { Suspense, lazy, useEffect, useRef, useState } from 'react';

import { WelcomeHero } from '../components/home/WelcomeHero';
import { prefetchHomeLive } from '../lib/hooks/useHomeLive';
import { prefetchHomeProjects } from '../components/home/BuildQuestion';
import { prefetchHomeActivity } from '../components/home/LivePulse';
import { signalHomeDataReady, resetHomeDataReady } from '../lib/homeDataReady';

/**
 * Home — The newcomer journey (v6 — perf pass)
 *
 * Four sections, no secondary nav slabs:
 *  1. WelcomeHero    → Auth-contextual hook. Logged-out: italic-serif "Welcome".
 *                       Logged-in: action headline "Build something today, NAME"
 *                       with Dashboard CTA. Recognition for authed users now
 *                       lives inside the Navbar via XPHudPill (no second row).
 *  2. BuildQuestion  → Spark: scatter-to-grid project tiles, "What would you
 *                       [build]?" rotating verb.
 *  3. LivePulse      → Proof of life: live activity + upcoming events.
 *  4. KnowMore       → Three connected node-cards with the final convert CTA
 *                       strip folded into its bottom.
 *
 * PERF: WelcomeHero is the only eagerly-imported section — it owns the LCP
 * headline. Everything below the fold (BuildQuestion, LivePulse, KnowMore)
 * is `React.lazy`'d and only streamed in once the hero has painted, so the
 * critical initial chunk stays small and the "3D robot + italic serif
 * welcome" lands on first paint without waiting on GSAP timelines, the
 * project grid query, or the ScrollTrigger setup used by the lower
 * sections.
 *
 * We deliberately do NOT wait for the user to scroll before loading the
 * below-fold sections — that would cause visible pop-in. Instead we fire an
 * `idleCallback` (or a short setTimeout fallback) right after the hero
 * mounts, so the chunks are already warm in cache by the time the user
 * scrolls.
 */

const BuildQuestion = lazy(() =>
    import('../components/home/BuildQuestion').then((m) => ({ default: m.BuildQuestion })),
);
const LivePulse = lazy(() =>
    import('../components/home/LivePulse').then((m) => ({ default: m.LivePulse })),
);
const KnowMore = lazy(() =>
    import('../components/home/KnowMore').then((m) => ({ default: m.KnowMore })),
);

// Reusable `requestIdleCallback` wrapper that falls back to `setTimeout` on
// browsers (Safari < 17.4) without native idle-callback support.
type IdleHandle = number;
const scheduleIdle = (cb: () => void, timeout = 600): IdleHandle => {
    if (typeof window === 'undefined') return 0;
    type IdleRequest = (cb: () => void, opts?: { timeout: number }) => number;
    const ric = (window as unknown as { requestIdleCallback?: IdleRequest })
        .requestIdleCallback;
    if (typeof ric === 'function') {
        return ric(cb, { timeout });
    }
    return window.setTimeout(cb, timeout) as unknown as number;
};
const cancelIdle = (id: IdleHandle) => {
    if (typeof window === 'undefined' || !id) return;
    type CancelIdle = (id: number) => void;
    const cic = (window as unknown as { cancelIdleCallback?: CancelIdle })
        .cancelIdleCallback;
    if (typeof cic === 'function') {
        cic(id);
        return;
    }
    window.clearTimeout(id);
};

/**
 * Lightweight placeholder for lazy-loaded home sections. Matches the page
 * background exactly so there's no flash. A very short delay prevents
 * flicker when chunks load in <50ms.
 */
function SectionPlaceholder({ minHeight }: { minHeight: string }) {
    return (
        <div
            className="w-full bg-brutal-bg"
            style={{ minHeight }}
            aria-hidden="true"
        />
    );
}

export function Home() {
    // ── Eager data prefetch ──────────────────────────────────────────
    // Children mount behind the opaque AppBootLoader overlay, so there's
    // no LCP concern.  Fire ALL Supabase queries immediately so the data
    // is warm by the time the boot curtain lifts + the idle callback
    // mounts the below-fold sections.  When all three settle, signal the
    // boot loader that it's safe to reveal the page.
    useEffect(() => {
        resetHomeDataReady();
        Promise.all([
            prefetchHomeLive(),
            prefetchHomeProjects(),
            prefetchHomeActivity(),
        ]).finally(() => {
            signalHomeDataReady();
        });
    }, []);

    // Gate the below-the-fold sections behind either an idle callback OR an
    // IntersectionObserver on a sentinel just above the fold. Whichever
    // fires first wins. This means:
    //   • On a fast connection, idle fires almost immediately and the
    //     sections are in the DOM before the user scrolls.
    //   • On a slow connection, idle is delayed by timeout fallback, so
    //     the user doesn't wait on below-fold chunks for LCP.
    //   • If the user scrolls aggressively before idle fires, the
    //     IntersectionObserver catches them and forces the load.
    const [belowFoldReady, setBelowFoldReady] = useState(false);
    const sentinelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (belowFoldReady) return;
        // Schedule an idle load so the chunks warm up after LCP is safe.
        const idleId = scheduleIdle(() => setBelowFoldReady(true), 800);
        return () => cancelIdle(idleId);
    }, [belowFoldReady]);

    useEffect(() => {
        if (belowFoldReady) return;
        const el = sentinelRef.current;
        if (!el || typeof IntersectionObserver === 'undefined') return;
        const io = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        setBelowFoldReady(true);
                        io.disconnect();
                        return;
                    }
                }
            },
            // Pre-fetch when the sentinel is within one viewport of the user.
            { rootMargin: '100% 0px' },
        );
        io.observe(el);
        return () => io.disconnect();
    }, [belowFoldReady]);

    return (
        <div className="flex-1 w-full bg-brutal-bg overflow-hidden relative">
            <WelcomeHero />
            <div ref={sentinelRef} aria-hidden="true" />
            {belowFoldReady ? (
                <Suspense fallback={<SectionPlaceholder minHeight="80vh" />}>
                    <div className="cv-auto">
                        <BuildQuestion />
                    </div>
                    <div className="cv-auto">
                        <LivePulse />
                    </div>
                    <div className="cv-auto">
                        <KnowMore />
                    </div>
                </Suspense>
            ) : (
                <SectionPlaceholder minHeight="240vh" />
            )}
        </div>
    );
}

export default Home;
