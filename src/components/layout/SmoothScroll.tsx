/**
 * SmoothScroll — REMOVED.
 *
 * Lenis smooth scroll was removed because the lerp-based animation
 * fought async data loading and produced inconsistent jitter on
 * content-heavy pages (notably the dashboard). Native browser scroll
 * is now used everywhere.
 *
 * This file is intentionally left as a no-op to keep the path
 * resolvable for any old import that hasn't been cleaned up.
 * `lib/scroll.ts` contains the small wrappers (`smoothScrollToTop`,
 * `smoothScrollToY`, `smoothScrollIntoView`) that callers use; they
 * now delegate to `window.scrollTo` and `Element.scrollIntoView`
 * directly.
 */

export {};
