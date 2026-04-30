import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../lib/auth';
import { waitForHomeData } from '../../lib/homeDataReady';

/**
 * AppBootLoader — Global loading gate
 *
 * Blocks the entire app behind a branded loading screen until ALL of
 * these conditions are met:
 *   1. Auth state resolved (isLoading → false, avatar included)
 *   2. Fonts loaded (document.fonts.ready)
 *   3. Robot GLB model prefetched into HTTP cache (desktop only)
 *   4. Hydration buffer — 150ms grace period after auth resolves so
 *      child hooks (useRankAccess, etc.) can complete their first
 *      fetch before the curtain lifts. Prevents XP pill / navbar
 *      components from popping in with a second render flash.
 *
 * Once all conditions are met, the loader crossfades out over 600ms
 * with a scale + opacity exit, then unmounts completely so it adds
 * zero runtime overhead to the running app.
 *
 * The visual is intentionally lightweight — pure CSS animation on the
 * brutal-dark background with Space Mono text + a red accent pulse.
 * No Three.js, no GSAP, no heavy deps. The loader itself must be
 * instant.
 *
 * Respects prefers-reduced-motion: skips the scanline + pulse
 * animations, shows a static state, and exits without the scale
 * transform.
 */

// ── Readiness signals ─────────────────────────────────────────────

/** Resolve when all Google Font families used by the app are loaded */
function waitForFonts(): Promise<void> {
    if (typeof document === 'undefined') return Promise.resolve();
    return Promise.race([
        document.fonts.ready.then(() => {}),
        new Promise<void>((r) => setTimeout(r, 3000)),
    ]);
}

/**
 * Prefetch the robot GLB into the browser's HTTP cache.
 * On mobile (<768px) we skip entirely since the 3D scene is disabled.
 */
function prefetchRobotModel(): Promise<void> {
    if (typeof window === 'undefined') return Promise.resolve();
    if (window.matchMedia('(max-width: 768px)').matches) return Promise.resolve();
    return Promise.race([
        fetch('/models/robot.glb', { priority: 'low' as any })
            .then(() => {})
            .catch(() => {}),
        new Promise<void>((r) => setTimeout(r, 5000)),
    ]);
}

// ── Component ─────────────────────────────────────────────────────

/** Minimum time the loader stays visible (ms). */
const MIN_DISPLAY_MS = 800;

/** Grace period after auth resolves for child hooks to hydrate (ms).
 *  Used on non-home routes where we only need useRankAccess to settle. */
const HYDRATION_BUFFER_MS = 150;

/** Maximum time to wait for the home page data prefetch signal (ms).
 *  On the '/' route, Home.tsx fires all Supabase queries immediately
 *  on mount and signals when they complete.  This cap prevents an
 *  infinite hang if a query is unreachable. */
const HOME_DATA_WAIT_MS = 2500;

/** Exit animation duration (ms) — must match the CSS transition. */
const EXIT_DURATION_MS = 600;

const STAGES = [
    'initializing systems',
    'loading fonts',
    'resolving session',
    'preparing workspace',
] as const;

export function AppBootLoader({ children }: { children: React.ReactNode }) {
    const { isLoading: authLoading } = useAuth();
    const [ready, setReady] = useState(false);
    const [exiting, setExiting] = useState(false);
    const [gone, setGone] = useState(false);
    const [stageIdx, setStageIdx] = useState(0);
    const mountTime = useRef(Date.now());
    const reducedMotion = useRef(false);

    // Detect reduced motion once
    useEffect(() => {
        if (typeof window !== 'undefined' && window.matchMedia) {
            reducedMotion.current = window.matchMedia(
                '(prefers-reduced-motion: reduce)',
            ).matches;
        }
    }, []);

    // Cycle through progress stages while loading
    useEffect(() => {
        if (ready) return;
        const id = setInterval(() => {
            setStageIdx((i) => (i + 1) % STAGES.length);
        }, 600);
        return () => clearInterval(id);
    }, [ready]);

    // ── Readiness gate ────────────────────────────────────────────
    // Fonts + model start loading immediately (parallel with auth).
    // Once auth resolves, we add a short hydration buffer so child
    // hooks like useRankAccess can complete before we lift.
    const fontsReady = useRef(false);
    const modelReady = useRef(false);
    const assetsStarted = useRef(false);

    useEffect(() => {
        if (ready || assetsStarted.current) return;
        assetsStarted.current = true;

        // Start font + model loading immediately (don't wait for auth)
        waitForFonts().then(() => { fontsReady.current = true; });
        prefetchRobotModel().then(() => { modelReady.current = true; });
    }, [ready]);

    // React to auth resolving
    useEffect(() => {
        if (ready || authLoading) return;

        let cancelled = false;

        async function settle() {
            // Auth just resolved. Wait for fonts + model if they haven't
            // finished yet (they usually have — they started earlier).
            const waitAssets = async () => {
                while (!fontsReady.current || !modelReady.current) {
                    await new Promise<void>((r) => setTimeout(r, 50));
                }
            };
            await Promise.race([
                waitAssets(),
                new Promise<void>((r) => setTimeout(r, 3000)), // safety cap
            ]);

            if (cancelled) return;

            // Hydration gate — route-aware.
            //
            // On the home page ('/'), Home.tsx fires prefetches for the
            // project grid, activity feed, and live-pulse data as soon as
            // it mounts (which happens behind this overlay).  We wait for
            // the `homeDataReady` signal so the curtain lifts onto a
            // fully-populated page.  A 2.5s cap ensures we never hang.
            //
            // On every other route, a short fixed buffer covers
            // useRankAccess and other navbar hooks (~10-30ms typical).
            const isHome = typeof window !== 'undefined' && window.location.pathname === '/';
            if (isHome) {
                await waitForHomeData(HOME_DATA_WAIT_MS);
            } else {
                await new Promise<void>((r) => setTimeout(r, HYDRATION_BUFFER_MS));
            }

            if (cancelled) return;

            // Enforce minimum display time
            const elapsed = Date.now() - mountTime.current;
            const remaining = Math.max(0, MIN_DISPLAY_MS - elapsed);
            if (remaining > 0) {
                await new Promise<void>((r) => setTimeout(r, remaining));
            }

            if (!cancelled) setReady(true);
        }

        settle();
        return () => { cancelled = true; };
    }, [authLoading, ready]);

    // ── Exit animation ────────────────────────────────────────────
    const beginExit = useCallback(() => {
        setExiting(true);
        setTimeout(() => setGone(true), EXIT_DURATION_MS);
    }, []);

    useEffect(() => {
        if (ready && !exiting) beginExit();
    }, [ready, exiting, beginExit]);

    // Once gone, render only children — zero overhead
    if (gone) return <>{children}</>;

    return (
        <>
            {/* App tree renders underneath the opaque overlay from the
                start. No visibility toggle — children mount, hooks fire,
                GSAP animations run and complete while hidden behind the
                overlay. When the overlay fades out the app is already in
                its final state with no entrance re-triggers. */}
            {children}

            {/* ── Loader overlay ─── */}
            <div
                role="status"
                aria-live="polite"
                aria-label="Loading Param Makerspace"
                className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-brutal-dark overflow-hidden"
                style={{
                    transition: `opacity ${EXIT_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1), transform ${EXIT_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
                    opacity: exiting ? 0 : 1,
                    transform: exiting
                        ? (reducedMotion.current ? 'none' : 'scale(1.02)')
                        : 'none',
                    pointerEvents: exiting ? 'none' : 'auto',
                }}
            >
                {/* Dot grid — same as hero */}
                <div
                    aria-hidden="true"
                    className="absolute inset-0"
                    style={{
                        backgroundImage:
                            'radial-gradient(circle, rgba(245,243,238,0.04) 1px, transparent 1px)',
                        backgroundSize: '32px 32px',
                    }}
                />

                {/* Scanline overlay — subtle horizontal lines */}
                <div
                    aria-hidden="true"
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        backgroundImage:
                            'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(245,243,238,0.015) 3px, rgba(245,243,238,0.015) 4px)',
                    }}
                />

                {/* Center content */}
                <div className="relative z-10 flex flex-col items-center gap-8">
                    {/* Logo mark — PARAM in heading font */}
                    <div className="flex flex-col items-center gap-1">
                        <span
                            className="font-heading font-bold text-brutal-bg tracking-[0.3em] text-lg sm:text-xl uppercase"
                            style={{
                                animation: exiting ? 'none' : 'bootFadeIn 0.6s ease-out both',
                            }}
                        >
                            PARAM
                        </span>
                        <span
                            className="font-drama italic text-brutal-red text-xs sm:text-sm tracking-wider"
                            style={{
                                animation: exiting
                                    ? 'none'
                                    : 'bootFadeIn 0.6s ease-out 0.15s both',
                            }}
                        >
                            makersadda
                        </span>
                    </div>

                    {/* Progress bar — thin red line */}
                    <div className="w-48 sm:w-56 h-[2px] bg-brutal-bg/10 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-brutal-red rounded-full"
                            style={{
                                transition: 'width 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
                                width: ready ? '100%' : `${Math.min(85, 20 + stageIdx * 20)}%`,
                            }}
                        />
                    </div>

                    {/* Status text */}
                    <p
                        className="font-data text-[10px] sm:text-[11px] text-brutal-bg/40 uppercase tracking-[0.25em]"
                        style={{
                            animation: exiting ? 'none' : 'bootFadeIn 0.5s ease-out 0.3s both',
                        }}
                    >
                        {ready ? 'ready' : STAGES[stageIdx]}
                    </p>
                </div>

                {/* Red accent glow — bottom */}
                <div
                    aria-hidden="true"
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] pointer-events-none"
                    style={{
                        background:
                            'radial-gradient(ellipse at center bottom, rgba(196,41,30,0.08) 0%, transparent 70%)',
                        animation: reducedMotion.current || exiting
                            ? 'none'
                            : 'bootPulse 3s ease-in-out infinite',
                    }}
                />

                {/* Keyframes — inlined so the loader has zero external deps */}
                <style>{`
                    @keyframes bootFadeIn {
                        from { opacity: 0; transform: translateY(8px); }
                        to   { opacity: 1; transform: translateY(0); }
                    }
                    @keyframes bootPulse {
                        0%, 100% { opacity: 0.5; }
                        50% { opacity: 1; }
                    }
                    @media (prefers-reduced-motion: reduce) {
                        .boot-loader * {
                            animation: none !important;
                            transition: none !important;
                        }
                    }
                `}</style>
            </div>
        </>
    );
}
