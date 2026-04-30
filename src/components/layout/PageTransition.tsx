import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router';
import { gsap } from 'gsap';

/**
 * PageTransition — Crossfade + lift entrance on every route change.
 *
 * Wraps the <Outlet /> content (or whatever children are passed).
 * On each pathname change the wrapper:
 *   1. Fades in from opacity 0 → 1
 *   2. Slides up from y: 16px → 0
 *   3. Duration: 400ms with an expo-out ease for that premium feel.
 *
 * Uses GSAP for hardware-accelerated transforms. Falls back to
 * instant display when `prefers-reduced-motion` is active.
 */

export function PageTransition({ children }: { children: React.ReactNode }) {
    const location = useLocation();
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [reducedMotion] = useState(() =>
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    );
    const isFirstRender = useRef(true);

    useEffect(() => {
        const el = wrapperRef.current;
        if (!el) return;

        // Skip the entrance animation on the very first render — the
        // AppBootLoader's curtain-lift already provides the entrance.
        if (isFirstRender.current) {
            isFirstRender.current = false;
            gsap.set(el, { opacity: 1, y: 0 });
            return;
        }

        if (reducedMotion) {
            gsap.set(el, { opacity: 1, y: 0 });
            return;
        }

        gsap.fromTo(
            el,
            { opacity: 0, y: 16 },
            {
                opacity: 1,
                y: 0,
                duration: 0.4,
                ease: 'expo.out',
                clearProps: 'transform',
            },
        );
    }, [location.pathname, reducedMotion]);

    return (
        <div ref={wrapperRef} style={{ willChange: 'opacity, transform' }}>
            {children}
        </div>
    );
}
