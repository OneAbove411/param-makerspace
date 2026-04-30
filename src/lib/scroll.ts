/**
 * scroll.ts — small wrappers around native smooth-scroll APIs.
 *
 * The app previously routed these through Lenis; that's gone now, so
 * each helper just delegates to the corresponding native call. The
 * helper API stays the same so the ~15 call sites don't need to change.
 *
 * Why keep the wrappers at all (instead of inlining native calls)?
 *   • One place to reach for if we ever want to reintroduce smoothing
 *     (CSS `scroll-behavior` toggle, programmatic easing, sticky-nav
 *     offset, etc.).
 *   • One place to add `prefers-reduced-motion` short-circuits if we
 *     ever want to honor that beyond what the browser already does.
 */

interface ScrollOptions {
    /** Pixel offset added to the target — useful for sticky headers. */
    offset?: number;
    /** Where to anchor the element when scrolling into view. */
    block?: 'start' | 'center' | 'end';
}

export function smoothScrollToTop(opts: ScrollOptions = {}): void {
    window.scrollTo({ top: opts.offset ?? 0, behavior: 'smooth' });
}

export function smoothScrollToY(y: number, opts: ScrollOptions = {}): void {
    window.scrollTo({ top: y + (opts.offset ?? 0), behavior: 'smooth' });
}

export function smoothScrollIntoView(
    target: Element | null | undefined,
    opts: ScrollOptions = {},
): void {
    if (!target) return;
    (target as HTMLElement).scrollIntoView({
        behavior: 'smooth',
        block: opts.block ?? 'start',
    });
}
