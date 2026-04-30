import { useEffect } from 'react';
import { useLocation } from 'react-router';

/**
 * ScrollToTop — resets scroll position on route change.
 *
 * Uses `window.scrollTo(0, 0)` with `instant` behavior so Lenis
 * (if active) picks up the new scroll offset immediately without
 * an intermediate tween. Lenis reads `window.scrollY` on its next
 * rAF tick and syncs its internal state automatically.
 */
export function ScrollToTop() {
    const { pathname } = useLocation();

    useEffect(() => {
        // `instant` bypasses smooth-scroll (both native and Lenis) so
        // the new page starts at the top without a visible scroll-up.
        window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }, [pathname]);

    return null;
}
