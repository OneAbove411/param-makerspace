import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router';
import { gsap } from 'gsap';

/**
 * PageTransition — opacity crossfade on every route change.
 *
 * Wraps the <Outlet /> content. On each pathname change the wrapper
 * fades from opacity 0 → 1 over 300ms.
 *
 * The earlier version also slid the wrapper from `y: 16 → 0`, but that
 * conflicted with Lenis settling its scroll target after `ScrollToTop`
 * fired `window.scrollTo`: while Lenis was lerping to the new offset,
 * GSAP was simultaneously translating the outlet wrapper, and the two
 * transforms produced a visible "double-bounce" on navigation. An
 * opacity-only fade leaves Lenis unchallenged and removes the shake.
 *
 * Falls back to instant display when `prefers-reduced-motion` is active.
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
            gsap.set(el, { opacity: 1 });
            return;
        }

        if (reducedMotion) {
            gsap.set(el, { opacity: 1 });
            return;
        }

        gsap.fromTo(
            el,
            { opacity: 0 },
            {
                opacity: 1,
                duration: 0.3,
                ease: 'power2.out',
                clearProps: 'opacity',
            },
        );
    }, [location.pathname, reducedMotion]);

    return (
        <div ref={wrapperRef} style={{ willChange: 'opacity' }}>
            {children}
        </div>
    );
}
