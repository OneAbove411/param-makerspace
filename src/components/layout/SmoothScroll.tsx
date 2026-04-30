import { useEffect, useRef, createContext, useContext } from 'react';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * SmoothScroll — Lenis-powered viewport scroll with GSAP integration.
 *
 * Replaces the browser's native scroll with an eased, momentum-based
 * scroll that feels premium on both desktop and mobile.  Wired directly
 * into GSAP's ScrollTrigger so all existing scroll-triggered animations
 * stay perfectly in sync.
 *
 * On mobile it uses a `touchMultiplier` tuned for iOS-style momentum
 * rather than the harsh stop-on-lift-finger default.
 *
 * Respects `prefers-reduced-motion`: when active, Lenis is still
 * initialised (ScrollTrigger needs it) but with `lerp: 1` so the
 * scroll is instant — no easing, no inertia.
 */

const LenisContext = createContext<Lenis | null>(null);

/** Access the Lenis instance from any child (e.g. to scrollTo). */
export function useLenis(): Lenis | null {
    return useContext(LenisContext);
}

export function SmoothScroll({ children }: { children: React.ReactNode }) {
    const lenisRef = useRef<Lenis | null>(null);

    useEffect(() => {
        const reducedMotion =
            typeof window !== 'undefined' &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        const lenis = new Lenis({
            // Core feel — these values produce the "oryzo.ai" buttery scroll.
            lerp: reducedMotion ? 1 : 0.08,
            duration: reducedMotion ? 0 : 1.2,
            smoothWheel: true,
            // Mobile tuning
            touchMultiplier: 1.5,
            // Prevent Lenis from fighting native scroll on inputs/textareas
            prevent: (node: Element) => {
                return (
                    node instanceof HTMLInputElement ||
                    node instanceof HTMLTextAreaElement ||
                    node instanceof HTMLSelectElement ||
                    node.closest('[data-lenis-prevent]') !== null
                );
            },
        });
        lenisRef.current = lenis;

        // Wire Lenis into GSAP's ScrollTrigger so all existing
        // gsap.fromTo / ScrollTrigger animations read Lenis's scroll
        // position instead of the native scroll offset.
        lenis.on('scroll', ScrollTrigger.update);

        gsap.ticker.add((time: number) => {
            lenis.raf(time * 1000);
        });
        gsap.ticker.lagSmoothing(0);

        return () => {
            gsap.ticker.remove(lenis.raf as any);
            lenis.destroy();
            lenisRef.current = null;
        };
    }, []);

    return (
        <LenisContext.Provider value={lenisRef.current}>
            {children}
        </LenisContext.Provider>
    );
}
