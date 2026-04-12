import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router';
import {
    X, Search, Flame, Clock, ChevronDown,
    Zap, Command, Bookmark, Layers,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { isMacPlatform } from '../../lib/platform';
import type { ProjectsSort, ProjectsView } from './ProjectsFilterRail';

/**
 * §8 Archive Cockpit — Facet Rail (left sidebar).
 *
 * Desktop (≥ lg): 220px sticky rail. Now contains:
 *   • Search input (vibrant)
 *   • Sort selector
 *   • Domains with counts
 *   • Saved filter toggle
 *   • Keyboard shortcuts guide
 *   • Clear all button
 *
 * Mobile (< lg): Hidden. Use the mobile sheet.
 */

export interface FacetRailProps {
    // Search (integrated into sidebar)
    search?: string;
    onSearchChange?: (next: string) => void;
    searchInputRef?: React.Ref<HTMLInputElement>;

    // Sort
    sort?: ProjectsSort;
    onSortChange?: (next: ProjectsSort) => void;

    // Domain multi-select
    domains: string[];
    selectedDomains: string[];
    onToggleDomain: (domain: string) => void;
    domainCounts?: Record<string, number>;

    // Tag multi-select (kept for API compatibility but not rendered)
    allTags: string[];
    selectedTags: string[];
    onToggleTag: (tag: string) => void;

    // View mode
    view: ProjectsView;
    onViewChange: (next: ProjectsView) => void;

    // Clear all
    onClearAll: () => void;
    hasActiveFilters: boolean;

    /** Total project count (before filtering) for display */
    totalCount?: number;
}

const SORTS: Array<{ id: ProjectsSort; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = [
    { id: 'trending', label: 'Trending', icon: Flame },
    { id: 'newest', label: 'Newest', icon: Clock },
    { id: 'oldest', label: 'Oldest', icon: Clock },
];

export const FacetRail = React.forwardRef<HTMLDivElement, FacetRailProps>(
    function FacetRail(
        {
            search,
            onSearchChange,
            searchInputRef,
            sort,
            onSortChange,
            domains,
            selectedDomains,
            onToggleDomain,
            domainCounts,
            allTags,
            selectedTags,
            onToggleTag,
            view,
            onViewChange,
            onClearAll,
            hasActiveFilters,
            totalCount,
        },
        ref,
    ) {
        const isMac = useMemo(() => isMacPlatform(), []);
        const [sortOpen, setSortOpen] = useState(false);
        const [domainOpen, setDomainOpen] = useState(false);
        const sortRef = useRef<HTMLDivElement>(null);
        const domainRef = useRef<HTMLDivElement>(null);

        // Click-outside close for dropdowns
        useEffect(() => {
            const handler = (e: MouseEvent) => {
                if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
                if (domainRef.current && !domainRef.current.contains(e.target as Node)) setDomainOpen(false);
            };
            document.addEventListener('mousedown', handler);
            return () => document.removeEventListener('mousedown', handler);
        }, []);

        const currentSort = SORTS.find((s) => s.id === sort) ?? SORTS[0];
        const SortIcon = currentSort.icon;

        return (
            <div
                ref={ref}
                className={cn(
                    'hidden lg:block',
                    'w-[220px] flex-shrink-0',
                    'sticky top-[120px] h-fit max-h-[calc(100vh-140px)] overflow-y-auto',
                    'space-y-5 pb-12',
                    '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
                    'filter-rail',
                )}
                role="region"
                aria-label="Project filters"
            >
                {/* ── Search (vibrant) ─────────────────────────────── */}
                {onSearchChange && (
                    <div className="relative group/search">
                        <Search
                            size={14}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-brutal-dark/35 group-focus-within/search:text-brutal-red pointer-events-none transition-colors"
                            aria-hidden="true"
                        />
                        <input
                            ref={searchInputRef}
                            id="projects-search"
                            type="search"
                            value={search || ''}
                            onChange={(e) => onSearchChange(e.target.value)}
                            placeholder="Search projects…"
                            aria-label="Search projects"
                            className={cn(
                                'w-full h-10 pl-9 pr-8 rounded-xl',
                                'bg-brutal-bg border-2 border-brutal-dark/12',
                                'font-data text-xs text-brutal-dark placeholder:text-brutal-dark/35',
                                'focus:outline-none focus:border-brutal-red/50 focus:shadow-[3px_3px_0_0_rgba(196,41,30,0.12)]',
                                'transition-all duration-200',
                            )}
                        />
                        {search ? (
                            <button
                                type="button"
                                onClick={() => onSearchChange('')}
                                aria-label="Clear search"
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-brutal-dark/40 hover:text-brutal-red focus:outline-none"
                            >
                                <X size={12} aria-hidden="true" />
                            </button>
                        ) : (
                            <kbd
                                aria-hidden="true"
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[9px] font-bold text-brutal-dark/25 border border-brutal-dark/10 rounded px-1.5 py-0.5 bg-brutal-paper font-data"
                            >
                                /
                            </kbd>
                        )}
                    </div>
                )}

                {/* ── Sort ─────────────────────────────────────────── */}
                {onSortChange && (
                    <div ref={sortRef} className="relative">
                        <h3 className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-dark/40 mb-1.5">
                            Sort by
                        </h3>
                        <button
                            type="button"
                            onClick={() => setSortOpen((o) => !o)}
                            aria-haspopup="listbox"
                            aria-expanded={sortOpen}
                            className={cn(
                                'w-full h-9 px-3 rounded-lg border font-data text-[11px] font-bold uppercase tracking-wider',
                                'flex items-center gap-2 bg-transparent text-brutal-dark/70 border-brutal-dark/12',
                                'hover:border-brutal-dark/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-brutal-red',
                                'transition-colors',
                            )}
                        >
                            <SortIcon size={12} aria-hidden="true" />
                            <span className="flex-1 text-left">{currentSort.label}</span>
                            <ChevronDown size={11} aria-hidden="true" className={cn('transition-transform', sortOpen && 'rotate-180')} />
                        </button>
                        {sortOpen && (
                            <ul
                                role="listbox"
                                aria-label="Sort projects by"
                                className="absolute left-0 right-0 mt-1 rounded-lg border border-brutal-dark/12 bg-brutal-bg shadow-[6px_6px_0_0_rgba(196,41,30,0.18)] py-1 z-40"
                            >
                                {SORTS.map((s) => {
                                    const Icon = s.icon;
                                    const active = s.id === sort;
                                    return (
                                        <li key={s.id}>
                                            <button
                                                type="button"
                                                role="option"
                                                aria-selected={active}
                                                onClick={() => { onSortChange(s.id); setSortOpen(false); }}
                                                className={cn(
                                                    'w-full text-left px-3 py-2 font-data text-[11px] font-bold uppercase tracking-wider',
                                                    'flex items-center gap-2',
                                                    'hover:bg-brutal-dark/[0.04] focus:outline-none',
                                                    active ? 'text-brutal-red' : 'text-brutal-dark/60',
                                                )}
                                            >
                                                <Icon size={11} aria-hidden="true" />
                                                {s.label}
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                )}

                {/* ── Domains (collapsible dropdown) ─────────────────── */}
                <div ref={domainRef} className="relative">
                    <h3 className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-dark/40 mb-1.5">
                        Domain
                    </h3>
                    <button
                        type="button"
                        onClick={() => setDomainOpen((o) => !o)}
                        aria-haspopup="listbox"
                        aria-expanded={domainOpen}
                        className={cn(
                            'w-full h-9 px-3 rounded-lg border font-data text-[11px] font-bold uppercase tracking-wider',
                            'flex items-center gap-2 bg-transparent border-brutal-dark/12',
                            'hover:border-brutal-dark/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-brutal-red',
                            'transition-colors',
                            selectedDomains.length > 0 ? 'text-brutal-red' : 'text-brutal-dark/70',
                        )}
                    >
                        <Layers size={12} aria-hidden="true" />
                        <span className="flex-1 text-left truncate">
                            {selectedDomains.length === 0
                                ? 'All Domains'
                                : selectedDomains.length === 1
                                    ? selectedDomains[0]
                                    : `${selectedDomains.length} selected`}
                        </span>
                        <ChevronDown size={11} aria-hidden="true" className={cn('transition-transform', domainOpen && 'rotate-180')} />
                    </button>
                    {domainOpen && (
                        <ul
                            role="listbox"
                            aria-label="Filter by domain"
                            aria-multiselectable="true"
                            className="absolute left-0 right-0 mt-1 rounded-lg border border-brutal-dark/12 bg-brutal-bg shadow-[6px_6px_0_0_rgba(196,41,30,0.18)] py-1 z-40 max-h-[280px] overflow-y-auto"
                        >
                            {/* All option */}
                            <li>
                                <button
                                    type="button"
                                    role="option"
                                    aria-selected={selectedDomains.length === 0}
                                    onClick={() => { for (const d of selectedDomains) onToggleDomain(d); setDomainOpen(false); }}
                                    className={cn(
                                        'w-full text-left px-3 py-2 font-data text-[11px] font-bold uppercase tracking-wider',
                                        'flex items-center gap-2',
                                        'hover:bg-brutal-dark/[0.04] focus:outline-none',
                                        selectedDomains.length === 0 ? 'text-brutal-red' : 'text-brutal-dark/60',
                                    )}
                                >
                                    All Domains
                                </button>
                            </li>
                            {domains.map((d) => {
                                const active = selectedDomains.includes(d);
                                const count = domainCounts?.[d] ?? 0;
                                return (
                                    <li key={d}>
                                        <button
                                            type="button"
                                            role="option"
                                            aria-selected={active}
                                            onClick={() => onToggleDomain(d)}
                                            className={cn(
                                                'w-full text-left px-3 py-2 font-data text-[11px] font-bold uppercase tracking-wider',
                                                'flex items-center justify-between',
                                                'hover:bg-brutal-dark/[0.04] focus:outline-none',
                                                active ? 'text-brutal-red' : 'text-brutal-dark/60',
                                            )}
                                        >
                                            <span className="truncate">{d}</span>
                                            {count > 0 && (
                                                <span className={cn('tabular-nums text-[9px] flex-shrink-0', active ? 'text-brutal-red/60' : 'text-brutal-dark/25')}>
                                                    {count}
                                                </span>
                                            )}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>

                {/* ── Saved (bookmark toggle) ──────────────────────── */}
                <button
                    type="button"
                    onClick={() => onViewChange(view === 'bookmarks' ? 'grid' : 'bookmarks')}
                    aria-pressed={view === 'bookmarks'}
                    className={cn(
                        'w-full flex items-center gap-2 px-2.5 py-2 rounded-lg border',
                        'font-data text-[10px] font-bold uppercase tracking-wider',
                        'transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brutal-red',
                        view === 'bookmarks'
                            ? 'bg-brutal-red text-brutal-bg border-brutal-red'
                            : 'bg-transparent text-brutal-dark/55 border-brutal-dark/12 hover:border-brutal-red/40 hover:text-brutal-red',
                    )}
                >
                    <Bookmark size={12} className={view === 'bookmarks' ? 'fill-current' : ''} aria-hidden />
                    Saved Projects
                </button>

                {/* ── Clear all ─────────────────────────────────────── */}
                {hasActiveFilters && (
                    <button
                        type="button"
                        onClick={onClearAll}
                        className="w-full flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-md border-2 border-brutal-red/40 bg-brutal-red/5 hover:bg-brutal-red/10 transition-colors"
                    >
                        <X size={11} className="text-brutal-red" aria-hidden />
                        <span className="font-data text-[10px] font-bold uppercase tracking-widest text-brutal-red">
                            Clear all
                        </span>
                    </button>
                )}

                {/* ── Divider ──────────────────────────────────────── */}
                <div className="border-t border-brutal-dark/8" />

                {/* ── Keyboard Shortcuts guide ─────────────────────── */}
                <div className="space-y-2">
                    <h3 className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-dark/35">
                        Shortcuts
                    </h3>
                    <div className="space-y-1.5">
                        {[
                            { keys: '/', desc: 'Focus search' },
                            { keys: isMac ? '⌘K' : 'Ctrl+K', desc: 'Command palette' },
                            { keys: 'B', desc: 'Toggle saved' },
                            { keys: 'V', desc: 'Cycle view' },
                        ].map(({ keys, desc }) => (
                            <div key={keys} className="flex items-center gap-2">
                                <kbd className="font-data text-[9px] font-bold text-brutal-dark/30 bg-brutal-paper border border-brutal-dark/8 rounded px-1.5 py-0.5 min-w-[28px] text-center">
                                    {keys}
                                </kbd>
                                <span className="font-data text-[10px] text-brutal-dark/35">{desc}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    },
);
