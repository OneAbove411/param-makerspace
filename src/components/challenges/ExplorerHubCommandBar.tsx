import React, { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import { Search, X, Clock, Flame, Shuffle, ArrowDownAZ, ChevronDown, Compass, Wrench, Cpu } from 'lucide-react';
import { cn } from '../../lib/utils';
import { isMacPlatform } from '../../lib/platform';

// ─────────────────────────────────────────────────────────────
// Explorer Hub — Command Bar (step-3 of the overhaul)
//
// A 72px sticky bar mirroring ProjectsCommandBar's visual language so
// the site feels coherent, adapted for the inspiration-feed use case:
//
//   [ 🔍 Search title / mystery ]  [ Tier ▾ ]  [ Sort ▾ ]
//
// Below the bar — in the same sticky region — a horizontally-scrolling
// strip of DOMAIN CHIPS: All · Electronics · Robotics · AI · Design · …
//
// Everything is controlled state; URL sync lives in the parent page so
// this component stays reusable and testable.
//
// Design choices:
//   • Single-select filters for tier and domain. Multi-select is scope
//     creep for v1 — it adds a state model and a "clear all" dance that
//     isn't worth it for a blueprint library that's unlikely to hit
//     hundreds of items.
//   • Sort dropdown includes a "Shuffle" option at the bottom — classic
//     inspiration-feed move for when the user is stuck.
//   • Domain chips below the bar, not inside it, so the bar itself
//     stays uncluttered at narrow widths.
//   • "/" keyboard shortcut focuses the search input (matches Projects).
// ─────────────────────────────────────────────────────────────

export type ExplorerSort = 'newest' | 'oldest' | 'quickest' | 'alpha' | 'shuffle';
export type ExplorerTier = 'All' | 'Tier 1' | 'Tier 2' | 'Tier 3';

export interface ExplorerHubCommandBarProps {
    search: string;
    onSearchChange: (next: string) => void;
    searchInputRef?: React.Ref<HTMLInputElement>;

    tier: ExplorerTier;
    onTierChange: (next: ExplorerTier) => void;

    sort: ExplorerSort;
    onSortChange: (next: ExplorerSort) => void;

    domain: string; // "All" or one of DOMAINS below
    onDomainChange: (next: string) => void;
}

const TIERS: Array<{
    id: ExplorerTier;
    label: string;
    sub: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
}> = [
    { id: 'All', label: 'All tiers', sub: 'Any difficulty', icon: Flame },
    { id: 'Tier 1', label: 'Explorer', sub: 'Tier 1 · Fundamentals', icon: Compass },
    { id: 'Tier 2', label: 'Solver', sub: 'Tier 2 · Integration', icon: Wrench },
    { id: 'Tier 3', label: 'Architect', sub: 'Tier 3 · Systems', icon: Cpu },
];

const SORTS: Array<{
    id: ExplorerSort;
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
}> = [
    { id: 'newest', label: 'Newest', icon: Clock },
    { id: 'oldest', label: 'Oldest', icon: Clock },
    { id: 'quickest', label: 'Quickest', icon: Flame },
    { id: 'alpha', label: 'A → Z', icon: ArrowDownAZ },
    { id: 'shuffle', label: 'Surprise me', icon: Shuffle },
];

export const DOMAIN_OPTIONS = [
    'All',
    'Electronics',
    'Robotics',
    'AI',
    'Design',
    'Fabrication',
    'Bio',
    'Interdisciplinary',
    'Woodworking',
] as const;

export const ExplorerHubCommandBar = forwardRef<HTMLDivElement, ExplorerHubCommandBarProps>(
    function ExplorerHubCommandBar(
        {
            search,
            onSearchChange,
            searchInputRef,
            tier,
            onTierChange,
            sort,
            onSortChange,
            domain,
            onDomainChange,
        },
        ref,
    ) {
        const [tierOpen, setTierOpen] = useState(false);
        const [sortOpen, setSortOpen] = useState(false);
        const tierWrapRef = useRef<HTMLDivElement>(null);
        const sortWrapRef = useRef<HTMLDivElement>(null);
        const isMac = useMemo(() => isMacPlatform(), []);

        // Click-outside to close both popovers.
        useEffect(() => {
            const onDoc = (e: MouseEvent) => {
                const t = e.target as Node;
                if (tierWrapRef.current && !tierWrapRef.current.contains(t)) setTierOpen(false);
                if (sortWrapRef.current && !sortWrapRef.current.contains(t)) setSortOpen(false);
            };
            document.addEventListener('mousedown', onDoc);
            return () => document.removeEventListener('mousedown', onDoc);
        }, []);

        // Escape closes popovers; "/" focuses search (unless typing).
        useEffect(() => {
            const onKey = (e: KeyboardEvent) => {
                if (e.key === 'Escape') {
                    setTierOpen(false);
                    setSortOpen(false);
                    return;
                }
                if (e.key === '/') {
                    const target = e.target as HTMLElement | null;
                    const tag = target?.tagName;
                    if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return;
                    e.preventDefault();
                    // searchInputRef can be either a callback ref or a RefObject.
                    if (searchInputRef && 'current' in searchInputRef) {
                        (searchInputRef.current as HTMLInputElement | null)?.focus();
                    }
                }
            };
            window.addEventListener('keydown', onKey);
            return () => window.removeEventListener('keydown', onKey);
        }, [searchInputRef]);

        const currentTier = TIERS.find((t) => t.id === tier) ?? TIERS[0];
        const TierIcon = currentTier.icon;
        const currentSort = SORTS.find((s) => s.id === sort) ?? SORTS[0];
        const SortIcon = currentSort.icon;

        return (
            <div
                ref={ref}
                className={cn(
                    'eh-command-bar sticky top-20 z-30 -mx-6 md:-mx-12 lg:-mx-24 mb-6',
                    'backdrop-blur-md bg-brutal-bg/85 border-y border-brutal-dark/10',
                )}
                role="region"
                aria-label="Explorer Hub search and filters"
            >
                <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24">
                    {/* ─── Main 72px row ──────────────────────────── */}
                    <div className="h-[72px] flex items-center gap-3 md:gap-4">
                        {/* Search (flex-1) */}
                        <div className="relative flex-1 min-w-0">
                            <Search
                                size={14}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-brutal-dark/40 pointer-events-none"
                                aria-hidden="true"
                            />
                            <input
                                ref={searchInputRef}
                                id="explorer-hub-search"
                                type="search"
                                value={search}
                                onChange={(e) => onSearchChange(e.target.value)}
                                placeholder="Search blueprints…"
                                aria-label="Search blueprints"
                                className={cn(
                                    'w-full h-11 pl-9 pr-16 rounded-full',
                                    'bg-brutal-dark/[0.04] border border-brutal-dark/10',
                                    'font-data text-xs text-brutal-dark placeholder:text-brutal-dark/40',
                                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-brutal-red focus-visible:ring-offset-2',
                                    'focus-visible:ring-offset-brutal-bg',
                                )}
                            />
                            {search ? (
                                <button
                                    type="button"
                                    onClick={() => onSearchChange('')}
                                    aria-label="Clear search"
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-brutal-dark/40 hover:text-brutal-red focus:outline-none focus-visible:ring-2 focus-visible:ring-brutal-red"
                                >
                                    <X size={12} aria-hidden="true" />
                                </button>
                            ) : (
                                <kbd
                                    aria-hidden="true"
                                    title={isMac ? 'Press / to focus search' : 'Press / to focus search'}
                                    className="hidden md:inline-flex items-center absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[10px] font-bold text-brutal-dark/40 border border-brutal-dark/15 rounded px-1.5 py-0.5 bg-brutal-bg font-data tracking-wider"
                                >
                                    /
                                </kbd>
                            )}
                        </div>

                        {/* Tier dropdown */}
                        <div ref={tierWrapRef} className="relative flex-shrink-0">
                            <button
                                type="button"
                                onClick={() => {
                                    setTierOpen((o) => !o);
                                    setSortOpen(false);
                                }}
                                aria-haspopup="listbox"
                                aria-expanded={tierOpen}
                                className={cn(
                                    'h-11 px-3 rounded-full border font-data text-[11px] font-bold uppercase tracking-wider',
                                    'flex items-center gap-1.5 bg-transparent text-brutal-dark/70 border-brutal-dark/15',
                                    'hover:border-brutal-dark/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-brutal-red focus-visible:ring-offset-2 focus-visible:ring-offset-brutal-bg',
                                    tier !== 'All' && 'text-brutal-red border-brutal-red/40',
                                )}
                            >
                                <TierIcon size={12} aria-hidden="true" />
                                <span className="hidden sm:inline">{currentTier.label}</span>
                                <ChevronDown
                                    size={12}
                                    aria-hidden="true"
                                    className={tierOpen ? 'rotate-180 transition-transform' : 'transition-transform'}
                                />
                            </button>
                            {tierOpen && (
                                <ul
                                    role="listbox"
                                    aria-label="Filter by tier"
                                    className="absolute right-0 mt-2 w-56 rounded-xl border border-brutal-dark/15 bg-brutal-bg shadow-[0_12px_36px_rgba(0,0,0,0.12)] py-1 z-40"
                                >
                                    {TIERS.map((t) => {
                                        const Icon = t.icon;
                                        const active = t.id === tier;
                                        return (
                                            <li key={t.id}>
                                                <button
                                                    type="button"
                                                    role="option"
                                                    aria-selected={active}
                                                    onClick={() => {
                                                        onTierChange(t.id);
                                                        setTierOpen(false);
                                                    }}
                                                    className={cn(
                                                        'w-full text-left px-3 py-2.5 font-data text-[11px] font-bold',
                                                        'flex items-start gap-2.5',
                                                        'hover:bg-brutal-dark/[0.04] focus:outline-none focus-visible:bg-brutal-dark/[0.06]',
                                                        active ? 'text-brutal-red' : 'text-brutal-dark/80',
                                                    )}
                                                >
                                                    <Icon size={13} aria-hidden="true" className="mt-0.5 flex-shrink-0" />
                                                    <span className="flex flex-col gap-0.5 min-w-0">
                                                        <span className="uppercase tracking-wider">{t.label}</span>
                                                        <span className="font-normal normal-case text-[10px] text-brutal-dark/45 tracking-normal">
                                                            {t.sub}
                                                        </span>
                                                    </span>
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>

                        {/* Sort dropdown */}
                        <div ref={sortWrapRef} className="relative flex-shrink-0">
                            <button
                                type="button"
                                onClick={() => {
                                    setSortOpen((o) => !o);
                                    setTierOpen(false);
                                }}
                                aria-haspopup="listbox"
                                aria-expanded={sortOpen}
                                className={cn(
                                    'h-11 px-3 rounded-full border font-data text-[11px] font-bold uppercase tracking-wider',
                                    'flex items-center gap-1.5 bg-transparent text-brutal-dark/70 border-brutal-dark/15',
                                    'hover:border-brutal-dark/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-brutal-red focus-visible:ring-offset-2 focus-visible:ring-offset-brutal-bg',
                                )}
                            >
                                <SortIcon size={12} aria-hidden="true" />
                                <span className="hidden sm:inline">{currentSort.label}</span>
                                <ChevronDown
                                    size={12}
                                    aria-hidden="true"
                                    className={sortOpen ? 'rotate-180 transition-transform' : 'transition-transform'}
                                />
                            </button>
                            {sortOpen && (
                                <ul
                                    role="listbox"
                                    aria-label="Sort blueprints by"
                                    className="absolute right-0 mt-2 w-48 rounded-xl border border-brutal-dark/15 bg-brutal-bg shadow-[0_12px_36px_rgba(0,0,0,0.12)] py-1 z-40"
                                >
                                    {SORTS.map((s, idx) => {
                                        const Icon = s.icon;
                                        const active = s.id === sort;
                                        // Shuffle is the last entry — give it a top border to separate it
                                        // from the deterministic sorts above.
                                        const isShuffle = s.id === 'shuffle';
                                        return (
                                            <li key={s.id}>
                                                <button
                                                    type="button"
                                                    role="option"
                                                    aria-selected={active}
                                                    onClick={() => {
                                                        onSortChange(s.id);
                                                        setSortOpen(false);
                                                    }}
                                                    className={cn(
                                                        'w-full text-left px-3 py-2.5 font-data text-[11px] font-bold uppercase tracking-wider',
                                                        'flex items-center gap-2',
                                                        'hover:bg-brutal-dark/[0.04] focus:outline-none focus-visible:bg-brutal-dark/[0.06]',
                                                        active ? 'text-brutal-red' : 'text-brutal-dark/70',
                                                        isShuffle && idx > 0 && 'border-t border-brutal-dark/10 mt-1 pt-2.5',
                                                    )}
                                                >
                                                    <Icon size={12} aria-hidden="true" />
                                                    {s.label}
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                    </div>

                    {/* ─── Domain chip strip ───────────────────── */}
                    <div
                        className="flex items-center gap-2 pb-3 overflow-x-auto scrollbar-thin -mx-1 px-1"
                        role="tablist"
                        aria-label="Filter by domain"
                    >
                        {DOMAIN_OPTIONS.map((d) => {
                            const active = domain === d;
                            return (
                                <button
                                    key={d}
                                    type="button"
                                    role="tab"
                                    aria-selected={active}
                                    onClick={() => onDomainChange(d)}
                                    className={cn(
                                        'flex-shrink-0 h-8 px-3 rounded-full border font-data text-[10px] font-bold uppercase tracking-wider transition-colors',
                                        'focus:outline-none focus-visible:ring-2 focus-visible:ring-brutal-red focus-visible:ring-offset-2 focus-visible:ring-offset-brutal-bg',
                                        active
                                            ? 'bg-brutal-red text-brutal-bg border-brutal-red'
                                            : 'bg-transparent text-brutal-dark/60 border-brutal-dark/15 hover:text-brutal-red hover:border-brutal-red/40',
                                    )}
                                >
                                    {d}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    },
);
