import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, Compass, SearchX, Bookmark, Library, ArrowRight } from 'lucide-react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import {
    useChallenges,
    useMyBookmarkedChallengeIds,
    useMyRecentlyBookmarkedChallengeIds,
    useToggleChallengeBookmark,
    useMyChallengeCompletionStatus,
} from '../lib/hooks';
import { useAuth } from '../lib/auth';
import { cn } from '../lib/utils';
import { EmptyState } from '../components/ui/EmptyState';
import { ChallengeCard, type ChallengeCardVariant, type ChallengeListItem } from '../components/challenges/ChallengeCard';
import {
    ExplorerHubCommandBar,
    DOMAIN_OPTIONS,
    type ExplorerSort,
    type ExplorerTier,
} from '../components/challenges/ExplorerHubCommandBar';
import { MoodStrip, MOOD_PRESETS, type MoodPreset } from '../components/challenges/MoodStrip';
import { TierPathway } from '../components/challenges/TierPathway';

gsap.registerPlugin(ScrollTrigger);

// ─────────────────────────────────────────────────────────────
// §8.c Explorer Hub — Inspiration Feed rewrite (step-4).
//
// The page is now a density-first inspiration surface, not a uniform
// archive grid. Key moves vs the previous layout:
//
//   1. No tier bento + no single featured hero. Variety > hierarchy.
//   2. Masonry feed via CSS multi-columns — three card variants
//      (medium / spotlight / quote) deterministically assigned by
//      visible index so filtering doesn't reshuffle the layout.
//   3. Sticky command bar (search + tier + sort + domain chips) with
//      URL sync so filters are shareable and the Back button works.
//   4. Mood strip — 6 one-click presets that apply coordinated filter
//      overrides ("Quick wins", "Weekend dive", etc.).
//   5. All-data-client-side: we call useChallenges('All','All') once
//      and do tier/domain/search/sort in memory. That keeps the hook
//      contract unchanged and lets us sort/filter without a roundtrip.
//   6. Batched per-user state: 3 queries total (challenges + my
//      bookmarks + my completion statuses), not 3*N.
//
// No new npm deps. No schema changes. Real data only.
// ─────────────────────────────────────────────────────────────

// Rotating sub-phrase — picked once on mount so every visit feels
// slightly different without being annoying mid-session.
const SUB_PHRASES = [
    'What will you make next?',
    'Browse, save, build.',
    'One blueprint at a time.',
    'Make. Unmake. Remake.',
    'Find your next obsession.',
];

function pickSubPhrase(): string {
    return SUB_PHRASES[Math.floor(Math.random() * SUB_PHRASES.length)];
}

// Domain chip list is imported from ExplorerHubCommandBar so there's
// a single source of truth.

// ─── Client-side filter + sort ───

/**
 * Parse a time_estimate string like "2–3 hrs" / "1 week" / "4-6 hours"
 * into an approximate number of minutes so we can sort by duration.
 * Returns Infinity if we can't parse it (so un-parseable items sink to
 * the bottom of "quickest" sorts).
 */
function timeEstimateMinutes(raw: string | null): number {
    if (!raw) return Number.POSITIVE_INFINITY;
    const s = raw.toLowerCase();
    // Grab the first number (accepting dashes, en-dashes, etc.).
    const match = s.match(/(\d+(?:\.\d+)?)/);
    if (!match) return Number.POSITIVE_INFINITY;
    const n = parseFloat(match[1]);
    if (s.includes('week')) return n * 7 * 24 * 60;
    if (s.includes('day')) return n * 24 * 60;
    if (s.includes('hour') || s.includes('hr')) return n * 60;
    if (s.includes('min')) return n;
    // Unknown unit — return the raw number as an ordering key.
    return n;
}

/**
 * Deterministic hash → used to seed the "shuffle" sort so the order is
 * stable for a given session but different from the other sorts.
 */
function hashString(s: string): number {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
    return h >>> 0;
}

// ─── Variant assignment ───
//
// Given the *visible* index in the feed (after filter + sort), return
// which ChallengeCard variant to render. Deterministic so filtering
// doesn't cause the spotlights to hop around.
//
//   • Every 7th card (index 3, 10, 17, ...) with a cover image → spotlight
//   • Every 11th card (index 5, 16, 27, ...) regardless → quote
//   • Everything else → medium
//
// The offsets (3, 5) ensure the first spotlight / first quote don't both
// land on index 0 and that they don't collide with each other in small
// feeds. If a card is marked for both, spotlight wins — the quote slot
// rolls over to the next multiple.
function variantForIndex(index: number, hasCover: boolean): ChallengeCardVariant {
    const isSpotlightSlot = index >= 3 && (index - 3) % 7 === 0;
    const isQuoteSlot = index >= 5 && (index - 5) % 11 === 0;
    if (isSpotlightSlot && hasCover) return 'spotlight';
    if (isQuoteSlot) return 'quote';
    return 'medium';
}

// ─── Skeleton ───

function FeedSkeleton() {
    // Three columns, varied heights so the skeleton matches the real
    // masonry rhythm and doesn't pop on first fetch.
    const heights = [260, 340, 220, 300, 240, 380, 260, 220, 300];
    return (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-5">
            {heights.map((h, i) => (
                <div
                    key={i}
                    className="break-inside-avoid mb-5 rounded-2xl bg-brutal-dark/[0.04] border-2 border-brutal-dark/10 animate-pulse"
                    style={{ height: h }}
                />
            ))}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────

export function Challenges() {
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const pageRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // ── URL-synced filter state ─────────────────────────────
    const query = searchParams.get('q') || '';
    const tier = ((searchParams.get('tier') as ExplorerTier) || 'All') as ExplorerTier;
    const domain = searchParams.get('domain') || 'All';
    const sort = ((searchParams.get('sort') as ExplorerSort) || 'newest') as ExplorerSort;
    const view = searchParams.get('view') === 'saved' ? 'saved' : 'all';
    const mood = searchParams.get('mood');

    const updateParams = useCallback(
        (mutator: (p: URLSearchParams) => void) => {
            const p = new URLSearchParams(searchParams);
            mutator(p);
            setSearchParams(p, { replace: true });
        },
        [searchParams, setSearchParams],
    );

    const setQuery = (next: string) =>
        updateParams((p) => {
            if (!next) p.delete('q');
            else p.set('q', next);
        });
    const setTier = (next: ExplorerTier) =>
        updateParams((p) => {
            if (next === 'All') p.delete('tier');
            else p.set('tier', next);
            // Changing tier manually clears any active mood.
            p.delete('mood');
        });
    const setDomain = (next: string) =>
        updateParams((p) => {
            if (next === 'All') p.delete('domain');
            else p.set('domain', next);
            p.delete('mood');
        });
    const setSort = (next: ExplorerSort) =>
        updateParams((p) => {
            if (next === 'newest') p.delete('sort');
            else p.set('sort', next);
            p.delete('mood');
        });
    const setView = (next: 'all' | 'saved') =>
        updateParams((p) => {
            if (next === 'all') p.delete('view');
            else p.set('view', next);
        });

    /**
     * Applies a mood preset's patch on top of the current state, and
     * records the active mood id so the strip can highlight it. Passing
     * `null` clears the mood *and* its filter imprint back to neutral
     * defaults (leaving the user's search query alone).
     */
    const selectMood = (preset: MoodPreset | null) => {
        updateParams((p) => {
            if (preset == null) {
                p.delete('mood');
                p.delete('tier');
                p.delete('domain');
                p.delete('sort');
                return;
            }
            p.set('mood', preset.id);
            const patch = preset.patch;
            if (patch.tier !== undefined) {
                if (patch.tier === 'All') p.delete('tier');
                else p.set('tier', patch.tier);
            }
            if (patch.domain !== undefined) {
                if (patch.domain === 'All') p.delete('domain');
                else p.set('domain', patch.domain);
            }
            if (patch.sort !== undefined) {
                if (patch.sort === 'newest') p.delete('sort');
                else p.set('sort', patch.sort);
            }
        });
    };

    // ── Data ────────────────────────────────────────────────
    // Fetch ALL published challenges once, filter/sort/search in memory.
    // The library is small (tutorials, not UGC) so this is cheap and lets
    // the client-side bar feel instant.
    const { data: allChallenges, loading } = useChallenges('All', 'All');
    const { data: bookmarkedIds } = useMyBookmarkedChallengeIds();
    const { data: recentlyBookmarkedIds } = useMyRecentlyBookmarkedChallengeIds(6);
    const { data: completionMap } = useMyChallengeCompletionStatus();
    const toggleBookmark = useToggleChallengeBookmark();

    const bookmarkSet = bookmarkedIds || new Set<string>();
    const completion = completionMap || new Map<string, string>();

    // Stable shuffle seed for this page mount. Only changes when the user
    // re-selects the shuffle sort (we bump the seed by updating URL state
    // with the same sort, which re-renders — but the seed is mount-scoped
    // so the order is actually stable until reload).
    const shuffleSeed = useRef(Date.now().toString(36));

    const subPhrase = useMemo(pickSubPhrase, []);

    // Filtered + sorted list
    const filtered = useMemo(() => {
        const base = (allChallenges || []) as ChallengeListItem[];
        const q = query.trim().toLowerCase();

        let list = base.filter((c) => {
            // Tier
            if (tier !== 'All' && c.tier !== tier) return false;
            // Domain (case-insensitive)
            if (domain !== 'All') {
                if (!c.domain || c.domain.toLowerCase() !== domain.toLowerCase()) return false;
            }
            // Search (title + mystery)
            if (q) {
                const haystack = `${c.title || ''} ${c.mystery || ''}`.toLowerCase();
                if (!haystack.includes(q)) return false;
            }
            // Saved tab
            if (view === 'saved') {
                if (!bookmarkSet.has(c.id)) return false;
            }
            return true;
        });

        // Sort (stable per filter result)
        switch (sort) {
            case 'oldest':
                list = [...list].sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));
                break;
            case 'quickest':
                list = [...list].sort(
                    (a, b) => timeEstimateMinutes(a.time_estimate) - timeEstimateMinutes(b.time_estimate),
                );
                break;
            case 'alpha':
                list = [...list].sort((a, b) => (a.title || '').localeCompare(b.title || ''));
                break;
            case 'shuffle': {
                const seed = shuffleSeed.current;
                list = [...list].sort((a, b) => hashString(a.id + seed) - hashString(b.id + seed));
                break;
            }
            case 'newest':
            default:
                list = [...list].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
        }

        return list;
    }, [allChallenges, query, tier, domain, sort, view, bookmarkSet]);

    // Paginate (Load More)
    const [visibleCount, setVisibleCount] = useState(12);
    // Reset pagination when filters change
    useEffect(() => {
        setVisibleCount(12);
    }, [query, tier, domain, sort, view]);

    const visibleChallenges = filtered.slice(0, visibleCount);
    const hasMore = filtered.length > visibleCount;

    // Active mood → preset object (for the strip highlight)
    const activeMood = useMemo(() => {
        if (!mood) return null;
        return MOOD_PRESETS.find((p) => p.id === mood) || null;
    }, [mood]);

    // Count of currently saved (across the whole library, not the filter)
    const savedCount = bookmarkSet.size;

    // ── "Continue browsing" strip ──
    // Resolves the current user's 3 most-recently-bookmarked challenge
    // ids back into full ChallengeListItem objects by looking them up in
    // the already-loaded library. No extra query.
    // Hidden when: not logged in, zero bookmarks, currently filtered to
    // the Saved view (would be redundant), or the library hasn't finished
    // loading yet (would render empty tiles and flicker).
    const continueBrowsing = useMemo(() => {
        if (!user || !recentlyBookmarkedIds || recentlyBookmarkedIds.length === 0) return [];
        if (view === 'saved') return [];
        if (!allChallenges) return [];
        const byId = new Map<string, ChallengeListItem>();
        for (const c of allChallenges as ChallengeListItem[]) byId.set(c.id, c);
        const resolved: ChallengeListItem[] = [];
        for (const id of recentlyBookmarkedIds) {
            const hit = byId.get(id);
            if (hit) resolved.push(hit);
            if (resolved.length >= 3) break;
        }
        return resolved;
    }, [user, recentlyBookmarkedIds, allChallenges, view]);

    // ── GSAP entrance (one-shot — we don't replay on filter change) ──
    const hasAnimatedRef = useRef(false);
    useEffect(() => {
        if (loading || !filtered.length || hasAnimatedRef.current) return;
        hasAnimatedRef.current = true;
        const ctx = gsap.context(() => {
            gsap.fromTo(
                '.eh-hero-text',
                { y: 24, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.6, stagger: 0.08, ease: 'power3.out' },
            );
            gsap.fromTo(
                '.eh-feed-card',
                { y: 30, opacity: 0 },
                {
                    y: 0,
                    opacity: 1,
                    duration: 0.5,
                    stagger: 0.04,
                    ease: 'power3.out',
                    scrollTrigger: { trigger: '.eh-feed', start: 'top 88%' },
                },
            );
        }, pageRef);
        return () => ctx.revert();
    }, [loading, filtered.length]);

    // ── Render ──────────────────────────────────────────────

    const hasActiveFilter = !!query || tier !== 'All' || domain !== 'All' || view === 'saved' || !!mood;

    return (
        <div
            ref={pageRef}
            className="flex-1 w-full bg-brutal-bg pt-28 md:pt-32 px-6 md:px-12 lg:px-24 min-h-screen"
        >
            <div className="max-w-7xl mx-auto">
                {/* ═══════════════════════════════════════════
                    PAGE HEADER
                ═══════════════════════════════════════════ */}
                {/* Extra bottom padding (pb-2) reserves vertical space for
                    the header ornament's 6px red offset-shadow so it doesn't
                    visually bleed into the mood-strip row beneath. Extra
                    right padding (pr-1.5) does the same for the horizontal
                    shadow component. */}
                <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 md:gap-8 mb-10 md:mb-12 pr-1.5 pb-2">
                    <div className="min-w-0 flex-1">
                        <div className="eh-hero-text flex items-center gap-2 mb-3">
                            <span className="inline-block w-6 h-[3px] bg-brutal-red" aria-hidden />
                            <p className="font-data text-[10px] font-bold uppercase tracking-[0.25em] text-brutal-dark/60">
                                Explorer Hub
                            </p>
                        </div>
                        <h1 className="eh-hero-text font-heading font-bold text-3xl md:text-4xl uppercase tracking-tight-heading text-brutal-dark leading-[1.05]">
                            {filtered.length} blueprint{filtered.length === 1 ? '' : 's'}
                            <span className="text-brutal-dark/30"> · {subPhrase.toLowerCase().replace(/[.?]$/, '')}</span>
                        </h1>
                        <p className="eh-hero-text font-data text-xs text-brutal-dark/55 mt-3 max-w-lg leading-relaxed">
                            A living library of tutorials, builds, and open-source makes. Drift, filter, save the ones that spark something.
                        </p>
                    </div>

                    {/* ── Header ornament — brutalist red-shadow tile ──
                        Gives the above-the-fold surface its signature
                        red ink and one piece of meaningful shape-based
                        information (saved count for logged-in users,
                        total library size for guests). Matches the
                        Dashboard's 6px red-offset chrome so Explorer
                        Hub reads as part of the same family. */}
                    <div
                        className={cn(
                            'eh-hero-text flex-shrink-0 w-full md:w-auto',
                            'rounded-2xl border-2 border-brutal-dark p-4 md:p-5',
                            'bg-brutal-bg shadow-[6px_6px_0_0_rgba(196,41,30,0.55)]',
                            'flex items-center gap-4 min-w-[240px]',
                        )}
                    >
                        {user ? (
                            <>
                                <div className="w-11 h-11 rounded-full bg-brutal-red text-brutal-bg flex items-center justify-center flex-shrink-0 border-2 border-brutal-dark">
                                    <Bookmark size={18} fill="currentColor" aria-hidden />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-baseline gap-1.5">
                                        <span className="font-heading font-bold text-3xl md:text-[32px] text-brutal-dark tabular-nums leading-none">
                                            {savedCount}
                                        </span>
                                        <span className="font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/45">
                                            saved
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setView(view === 'saved' ? 'all' : 'saved')}
                                        className="mt-1 font-data text-[10px] font-bold uppercase tracking-widest text-brutal-red inline-flex items-center gap-1 hover:gap-1.5 transition-all focus:outline-none focus-visible:underline"
                                    >
                                        {view === 'saved' ? 'Back to all' : 'Open saved'} <ArrowRight size={11} />
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="w-11 h-11 rounded-full bg-brutal-red text-brutal-bg flex items-center justify-center flex-shrink-0 border-2 border-brutal-dark">
                                    <Library size={18} aria-hidden />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-baseline gap-1.5">
                                        <span className="font-heading font-bold text-3xl md:text-[32px] text-brutal-dark tabular-nums leading-none">
                                            {(allChallenges || []).length}
                                        </span>
                                        <span className="font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/45">
                                            in library
                                        </span>
                                    </div>
                                    <p className="mt-1 font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/40">
                                        Sign in to save
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                </header>

                {/* ═══════════════════════════════════════════
                    MOOD STRIP  —  shown FIRST so returning users can
                    pick a vibe in one click before seeing the precise
                    filter controls. Inspired by Dashboard's
                    "Next Best Action" leading the bento.
                ═══════════════════════════════════════════ */}
                <MoodStrip activeMoodId={activeMood?.id || null} onSelectMood={selectMood} />

                {/* ═══════════════════════════════════════════
                    TIER PATHWAY  —  teaches new users what
                    Tier 1 / 2 / 3 actually mean (Explorer / Solver /
                    Architect) with icons and one-line subtitles.
                    Doubles as a fast filter. Shown above the command
                    bar because the tier dropdown inside it is easy
                    to miss on a first visit.
                ═══════════════════════════════════════════ */}
                <TierPathway activeTier={tier} onTierChange={setTier} />

                {/* ═══════════════════════════════════════════
                    STICKY COMMAND BAR  —  third so power users who
                    want precision can still reach for it, and so the
                    sticky element that follows scroll is the search
                    bar (not the mood buttons).
                ═══════════════════════════════════════════ */}
                <ExplorerHubCommandBar
                    search={query}
                    onSearchChange={setQuery}
                    searchInputRef={searchInputRef}
                    tier={tier}
                    onTierChange={setTier}
                    sort={sort}
                    onSortChange={setSort}
                    domain={domain}
                    onDomainChange={setDomain}
                />

                {/* ═══════════════════════════════════════════
                    CONTINUE BROWSING  —  returning-user memory surface
                    Shows the 3 most-recently-bookmarked blueprints so
                    the page feels like it knows the user, mirroring
                    the Dashboard's "show me what to do next" vibe.
                ═══════════════════════════════════════════ */}
                {continueBrowsing.length > 0 && (
                    <section className="mb-8" aria-label="Continue browsing your saved blueprints">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-baseline gap-3 min-w-0">
                                <h2 className="font-heading font-bold text-sm uppercase tracking-tight-heading text-brutal-dark">
                                    Continue browsing
                                </h2>
                                <span className="font-data text-[10px] text-brutal-dark/40 font-bold uppercase tracking-widest truncate">
                                    Your last saves
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setView('saved')}
                                className="font-data text-[10px] font-bold uppercase tracking-widest text-brutal-red hover:underline inline-flex items-center gap-1 flex-shrink-0"
                            >
                                See all saved <ArrowRight size={11} />
                            </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            {continueBrowsing.map((challenge) => (
                                <ChallengeCard
                                    key={`cb-${challenge.id}`}
                                    challenge={challenge}
                                    variant="medium"
                                    isBookmarked={bookmarkSet.has(challenge.id)}
                                    completionStatus={completion.get(challenge.id) || null}
                                    onToggleBookmark={toggleBookmark}
                                />
                            ))}
                        </div>
                    </section>
                )}

                {/* ═══════════════════════════════════════════
                    SAVED-VIEW ACTIVE INDICATOR  —  only rendered when
                    the user is currently filtering to their saved
                    items, so the feed context is never ambiguous.
                    The All/Saved toggle itself now lives in the
                    header ornament.
                ═══════════════════════════════════════════ */}
                {user && view === 'saved' && (
                    <div className="flex items-center gap-2 mb-6">
                        <span className="inline-flex items-center gap-2 px-3 h-8 rounded-full bg-brutal-dark text-brutal-bg font-data text-[10px] font-bold uppercase tracking-widest">
                            <Bookmark size={11} fill="currentColor" aria-hidden />
                            Showing saved blueprints
                        </span>
                        <button
                            type="button"
                            onClick={() => setView('all')}
                            className="font-data text-[10px] font-bold uppercase tracking-widest text-brutal-red hover:underline"
                        >
                            Show all
                        </button>
                    </div>
                )}

                {/* ═══════════════════════════════════════════
                    THE FEED  (masonry via CSS multi-columns)
                ═══════════════════════════════════════════ */}
                <section className="pb-32">
                    {loading ? (
                        <FeedSkeleton />
                    ) : filtered.length === 0 ? (
                        <EmptyState
                            icon={hasActiveFilter ? <SearchX size={28} /> : <Compass size={28} />}
                            title={
                                view === 'saved'
                                    ? 'No saved blueprints yet.'
                                    : hasActiveFilter
                                        ? 'No blueprints match.'
                                        : 'The library is empty.'
                            }
                            description={
                                view === 'saved'
                                    ? 'Tap the bookmark icon on any card to save it for later.'
                                    : hasActiveFilter
                                        ? 'Try a different keyword, tier, or domain — or clear everything and start over.'
                                        : 'New blueprints are added by mentors. Check back soon.'
                            }
                            cta={
                                hasActiveFilter && view !== 'saved' ? (
                                    <button
                                        type="button"
                                        onClick={() => setSearchParams(new URLSearchParams(), { replace: true })}
                                        className="px-5 py-2.5 rounded-full bg-brutal-dark text-brutal-bg font-data text-[11px] font-bold uppercase tracking-widest hover:bg-brutal-red transition-colors"
                                    >
                                        Clear all filters
                                    </button>
                                ) : undefined
                            }
                        />
                    ) : (
                        <>
                            <div className="eh-feed columns-1 sm:columns-2 lg:columns-3 gap-5">
                                {visibleChallenges.map((challenge, i) => {
                                    const variant = variantForIndex(i, !!challenge.cover_image_url);
                                    return (
                                        <div
                                            key={challenge.id}
                                            className="break-inside-avoid mb-5 eh-feed-card"
                                        >
                                            <ChallengeCard
                                                challenge={challenge}
                                                variant={variant}
                                                isBookmarked={bookmarkSet.has(challenge.id)}
                                                completionStatus={completion.get(challenge.id) || null}
                                                onToggleBookmark={user ? toggleBookmark : undefined}
                                            />
                                        </div>
                                    );
                                })}
                            </div>

                            {hasMore && (
                                <div className="flex justify-center mt-10">
                                    <button
                                        type="button"
                                        onClick={() => setVisibleCount((n) => n + 12)}
                                        className="flex items-center gap-3 px-8 py-3.5 bg-brutal-dark text-brutal-bg font-data text-xs font-bold uppercase tracking-widest rounded-full hover:bg-brutal-red transition-colors duration-300 border-2 border-brutal-dark shadow-[6px_6px_0_0_rgba(196,41,30,0.55)] hover:shadow-[8px_8px_0_0_rgba(196,41,30,0.7)]"
                                    >
                                        Load more blueprints
                                        <Loader2 size={14} className="opacity-50" />
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </section>
            </div>
        </div>
    );
}
