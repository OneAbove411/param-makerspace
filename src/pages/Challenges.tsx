import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Loader2, Compass, SearchX, Bookmark, ArrowRight, Plus } from 'lucide-react';
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
    DOMAIN_OPTIONS,
    type ExplorerSort,
    type ExplorerTier,
} from '../components/challenges/ExplorerHubCommandBar';
import { TierPathway } from '../components/challenges/TierPathway';

// New shared components (SPEC.md Directive 1)
import { ListingLayout } from '../components/shared/ListingLayout';
import { ListingSidebar } from '../components/shared/ListingSidebar';
import { SidebarSearch } from '../components/shared/SidebarSearch';
import { ExplorerHubNudge } from '../components/shared/ExplorerHubNudge';
import { MobileFilterBar } from '../components/shared/MobileFilterBar';

gsap.registerPlugin(ScrollTrigger);

// ─────────────────────────────────────────────────────────────
// §8.c Explorer Hub — SPEC.md refactor
//
// Layout migration:
//   • ExplorerHubCommandBar → REMOVED. Logic migrated to sidebar.
//   • MoodStrip / Mood presets → REMOVED entirely from sidebar.
//   • Domain chips → Replaced with a sidebar dropdown (matches Sort).
//   • GamificationNudge → Replaced with ExplorerHubNudge ("Surprise me"
//     + saved-shortcut), which fits the inspiration-feed context.
//   • CSS multi-columns     → CSS Grid with @container queries.
//
// ALL data hooks, URL state, bookmark logic preserved byte-for-byte.
// ─────────────────────────────────────────────────────────────

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

function timeEstimateMinutes(raw: string | null): number {
    if (!raw) return Number.POSITIVE_INFINITY;
    const s = raw.toLowerCase();
    const match = s.match(/(\d+(?:\.\d+)?)/);
    if (!match) return Number.POSITIVE_INFINITY;
    const n = parseFloat(match[1]);
    if (s.includes('week')) return n * 7 * 24 * 60;
    if (s.includes('day')) return n * 24 * 60;
    if (s.includes('hour') || s.includes('hr')) return n * 60;
    if (s.includes('min')) return n;
    return n;
}

function hashString(s: string): number {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
    return h >>> 0;
}

function variantForIndex(index: number, hasCover: boolean): ChallengeCardVariant {
    const isSpotlightSlot = index >= 3 && (index - 3) % 7 === 0;
    const isQuoteSlot = index >= 5 && (index - 5) % 11 === 0;
    if (isSpotlightSlot && hasCover) return 'spotlight';
    if (isQuoteSlot) return 'quote';
    return 'medium';
}

function FeedSkeleton() {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(9)].map((_, i) => (
                <div
                    key={i}
                    className="rounded-lg bg-brutal-dark/10 animate-pulse aspect-[3/4] relative"
                >
                    <div className="absolute inset-x-0 bottom-0 p-4 space-y-2">
                        <div className="h-4 w-3/4 bg-brutal-dark/10 rounded" />
                        <div className="h-3 w-1/2 bg-brutal-dark/5 rounded" />
                    </div>
                </div>
            ))}
        </div>
    );
}

// ── Sidebar tier selector ──
function SidebarTierSelect({ value, onChange }: { value: ExplorerTier; onChange: (v: ExplorerTier) => void }) {
    const tiers: ExplorerTier[] = ['All', 'Tier 1', 'Tier 2', 'Tier 3'];
    return (
        <div>
            <h3 className="font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/50 mb-2">Tier</h3>
            <div className="flex flex-col gap-1">
                {tiers.map((t) => (
                    <button
                        key={t}
                        type="button"
                        onClick={() => onChange(t)}
                        className={cn(
                            'h-7 px-2.5 rounded-lg font-data text-[10px] font-bold uppercase tracking-wider text-left transition-colors',
                            'focus:outline-none focus-visible:ring-2 focus-visible:ring-brutal-red',
                            value === t
                                ? 'bg-brutal-dark text-brutal-bg'
                                : 'text-brutal-dark/60 hover:text-brutal-dark hover:bg-brutal-dark/5',
                        )}
                    >
                        {t === 'All' ? 'All Tiers' : t}
                    </button>
                ))}
            </div>
        </div>
    );
}

// ── Sidebar sort selector ──
function SidebarSortSelect({ value, onChange }: { value: ExplorerSort; onChange: (v: ExplorerSort) => void }) {
    return (
        <div>
            <h3 className="font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/50 mb-2">Sort</h3>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value as ExplorerSort)}
                className="w-full h-8 px-2.5 rounded-lg border border-brutal-dark/15 bg-transparent font-data text-[11px] font-bold uppercase tracking-wider text-brutal-dark/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-brutal-red"
            >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="quickest">Quickest</option>
                <option value="alpha">A → Z</option>
                <option value="shuffle">Shuffle</option>
            </select>
        </div>
    );
}

// ── Sidebar domain selector ──
function SidebarDomainSelect({
    value,
    onChange,
    counts,
}: {
    value: string;
    onChange: (v: string) => void;
    counts: Record<string, number>;
}) {
    return (
        <div>
            <h3 className="font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/50 mb-2">Domain</h3>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full h-8 px-2.5 rounded-lg border border-brutal-dark/15 bg-transparent font-data text-[11px] font-bold uppercase tracking-wider text-brutal-dark/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-brutal-red"
            >
                {DOMAIN_OPTIONS.map((d) => {
                    const count = d === 'All' ? undefined : counts[d] || 0;
                    return (
                        <option key={d} value={d}>
                            {d === 'All' ? 'All Domains' : `${d}${count !== undefined ? ` (${count})` : ''}`}
                        </option>
                    );
                })}
            </select>
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
        });
    const setDomain = (next: string) =>
        updateParams((p) => {
            if (next === 'All') p.delete('domain');
            else p.set('domain', next);
        });
    const setSort = (next: ExplorerSort) =>
        updateParams((p) => {
            if (next === 'newest') p.delete('sort');
            else p.set('sort', next);
        });
    const setView = (next: 'all' | 'saved') =>
        updateParams((p) => {
            if (next === 'all') p.delete('view');
            else p.set('view', next);
        });

    // ── Data ────────────────────────────────────────────────
    const { data: allChallenges, loading } = useChallenges('All', 'All');
    const { data: bookmarkedIds } = useMyBookmarkedChallengeIds();
    const { data: recentlyBookmarkedIds } = useMyRecentlyBookmarkedChallengeIds(6);
    const { data: completionMap } = useMyChallengeCompletionStatus();
    const toggleBookmark = useToggleChallengeBookmark();

    const bookmarkSet = bookmarkedIds || new Set<string>();
    const completion = completionMap || new Map<string, string>();

    const shuffleSeed = useRef(Date.now().toString(36));
    const subPhrase = useMemo(pickSubPhrase, []);

    // ── Domain counts for sidebar dropdown ──
    const domainCounts = useMemo(() => {
        if (!allChallenges) return {} as Record<string, number>;
        const counts: Record<string, number> = {};
        for (const c of allChallenges as ChallengeListItem[]) {
            if (c.domain) counts[c.domain] = (counts[c.domain] || 0) + 1;
        }
        return counts;
    }, [allChallenges]);

    // Filtered + sorted list
    const filtered = useMemo(() => {
        const base = (allChallenges || []) as ChallengeListItem[];
        const q = query.trim().toLowerCase();

        let list = base.filter((c) => {
            if (tier !== 'All' && c.tier !== tier) return false;
            if (domain !== 'All') {
                if (!c.domain || c.domain.toLowerCase() !== domain.toLowerCase()) return false;
            }
            if (q) {
                const haystack = `${c.title || ''} ${c.mystery || ''}`.toLowerCase();
                if (!haystack.includes(q)) return false;
            }
            if (view === 'saved') {
                if (!bookmarkSet.has(c.id)) return false;
            }
            return true;
        });

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

    // Paginate
    const [visibleCount, setVisibleCount] = useState(12);
    useEffect(() => {
        setVisibleCount(12);
    }, [query, tier, domain, sort, view]);

    const visibleChallenges = filtered.slice(0, visibleCount);
    const hasMore = filtered.length > visibleCount;

    const savedCount = bookmarkSet.size;

    // ── "Continue browsing" strip ──
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

    // ── GSAP entrance ──
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

    // ── Mobile filter sheet state ──
    const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

    const hasActiveFilter = !!query || tier !== 'All' || domain !== 'All' || view === 'saved';

    return (
        <div
            ref={pageRef}
            className="flex-1 w-full bg-brutal-bg pt-28 md:pt-32 min-h-screen"
        >
            <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-0">
                {/* ── PAGE HEADER ── */}
                <header className="px-0 lg:px-8 flex flex-col md:flex-row md:items-end md:justify-between gap-5 md:gap-8 mb-10 md:mb-12 pr-1.5 pb-2">
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

                    {/* Add Challenge button — visible to all users, routes to challenge create page */}
                    <div className="flex-shrink-0">
                        <Link
                            to="/admin/challenges/new"
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-brutal-red text-brutal-bg font-data text-xs font-bold uppercase tracking-wider rounded-xl border-2 border-brutal-red shadow-[3px_3px_0_0_rgba(17,17,17,0.18)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all"
                        >
                            <Plus className="w-4 h-4" />
                            Add Challenge
                        </Link>
                    </div>
                </header>

                {/* ── Mobile filter bar ── */}
                <MobileFilterBar
                    searchValue={query}
                    onSearch={setQuery}
                    onOpenFilters={() => setMobileSheetOpen(true)}
                    placeholder="Search blueprints…"
                />

                {/* ── Two-column layout ── */}
                <ListingLayout
                    sidebar={
                        <ListingSidebar>
                            <SidebarSearch
                                value={query}
                                onChange={setQuery}
                                placeholder="Search blueprints…"
                                inputRef={searchInputRef}
                            />
                            <SidebarTierSelect value={tier} onChange={setTier} />
                            <SidebarDomainSelect value={domain} onChange={setDomain} counts={domainCounts} />
                            <SidebarSortSelect value={sort} onChange={setSort} />
                            <ExplorerHubNudge savedCount={savedCount} />
                        </ListingSidebar>
                    }
                >
                    {/* ── Continue browsing ── */}
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

                    {/* ── Saved-view indicator ── */}
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

                    {/* ── THE FEED (CSS Grid) ── */}
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
                                <div className="eh-feed grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {visibleChallenges.map((challenge, i) => {
                                        const variant = variantForIndex(i, !!challenge.cover_image_url);
                                        return (
                                            <div
                                                key={challenge.id}
                                                className="eh-feed-card"
                                            >
                                                <ChallengeCard
                                                    challenge={challenge}
                                                    variant={variant === 'spotlight' ? 'medium' : variant}
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
                </ListingLayout>
            </div>
        </div>
    );
}
