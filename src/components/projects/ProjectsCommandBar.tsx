import React, { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import {
    Search, X, Flame, Clock,
    ChevronDown,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { isMacPlatform } from '../../lib/platform';
import type { ProjectsSort } from './ProjectsFilterRail';

/**
 * §8 Archive Cockpit — Phase-1 Step-2 Command Bar (Simplified).
 *
 * Now a minimal 72px sticky bar with:
 *   • Full-width search input (left) with / kbd hint + clear button
 *   • Sort pill (right) with dropdown
 *
 * Removed:
 *   • Domain chips
 *   • Tag popover
 *   • View toggle (moved to FacetRail)
 *   • Mobile Filters button (moved to FAB/sheet)
 *   • Inline count (moved to H1)
 *
 * All filter UI now lives in FacetRail (desktop ≥ lg) or MobileFilterSheet (< lg).
 */

export interface ProjectsCommandBarProps {
    search: string;
    onSearchChange: (next: string) => void;
    searchInputRef?: React.Ref<HTMLInputElement>;

    sort: ProjectsSort;
    onSortChange: (next: ProjectsSort) => void;
}

const SORTS: Array<{ id: ProjectsSort; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = [
    { id: 'trending', label: 'Trending', icon: Flame },
    { id: 'newest', label: 'Newest', icon: Clock },
    { id: 'oldest', label: 'Oldest', icon: Clock },
];

export const ProjectsCommandBar = forwardRef<HTMLDivElement, ProjectsCommandBarProps>(
    function ProjectsCommandBar(
        {
            search,
            onSearchChange,
            searchInputRef,
            sort,
            onSortChange,
        },
        ref,
    ) {
        const [sortOpen, setSortOpen] = useState(false);
        const sortWrapRef = useRef<HTMLDivElement>(null);
        const isMac = useMemo(() => isMacPlatform(), []);

        // Click-outside close
        useEffect(() => {
            const onDoc = (e: MouseEvent) => {
                const t = e.target as Node;
                if (sortWrapRef.current && !sortWrapRef.current.contains(t)) setSortOpen(false);
            };
            document.addEventListener('mousedown', onDoc);
            return () => document.removeEventListener('mousedown', onDoc);
        }, []);

        // Escape closes popovers
        useEffect(() => {
            const onKey = (e: KeyboardEvent) => {
                if (e.key === 'Escape') {
                    setSortOpen(false);
                }
            };
            window.addEventListener('keydown', onKey);
            return () => window.removeEventListener('keydown', onKey);
        }, []);

        const currentSort = SORTS.find((s) => s.id === sort) ?? SORTS[0];
        const SortIcon = currentSort.icon;

        return (
            <div
                ref={ref}
                className={cn(
                    'filter-rail lg:hidden sticky top-20 z-30 -mx-6 md:-mx-12 lg:-mx-24 mb-8',
                    'backdrop-blur-md bg-brutal-bg/85 border-y border-brutal-dark/10',
                )}
                role="region"
                aria-label="Project search and sort"
            >
                <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24 h-[56px] flex items-center gap-4">
                    {/* ── Search (visible on < lg only, sidebar has it on lg+) ───── */}
                    <div className="relative flex-1 lg:hidden">
                        <Search
                            size={14}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-brutal-dark/40 pointer-events-none"
                            aria-hidden="true"
                        />
                        <input
                            ref={searchInputRef}
                            id="projects-search"
                            type="search"
                            value={search}
                            onChange={(e) => onSearchChange(e.target.value)}
                            placeholder="Search…"
                            aria-label="Search projects"
                            className={cn(
                                'w-full h-11 pl-9 pr-8 rounded-full',
                                'bg-brutal-dark/[0.04] border border-brutal-dark/10',
                                'font-data text-xs text-brutal-dark placeholder:text-brutal-dark/40',
                                'focus:outline-none focus-visible:ring-2 focus-visible:ring-brutal-red focus-visible:ring-offset-2',
                                'focus-visible:ring-offset-brutal-bg',
                            )}
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={() => onSearchChange('')}
                                aria-label="Clear search"
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-brutal-dark/40 hover:text-brutal-red focus:outline-none focus-visible:ring-2 focus-visible:ring-brutal-red"
                            >
                                <X size={12} aria-hidden="true" />
                            </button>
                        )}
                        <kbd
                            aria-hidden="true"
                            title={isMac ? 'Press ⌘K to open the command palette' : 'Press Ctrl+K to open the command palette'}
                            className="hidden md:inline-flex items-center gap-0.5 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[10px] font-bold text-brutal-dark/40 border border-brutal-dark/15 rounded px-1.5 py-0.5 bg-brutal-bg font-data tracking-wider"
                            style={{ display: search ? 'none' : undefined }}
                        >
                            {isMac ? '⌘K' : 'Ctrl+K'}
                        </kbd>
                    </div>

                    {/* ── Sort dropdown (right) ──────────────────────── */}
                    <div ref={sortWrapRef} className="relative flex-shrink-0">
                        <button
                            type="button"
                            onClick={() => setSortOpen((o) => !o)}
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
                            <ChevronDown size={12} aria-hidden="true" className={sortOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
                        </button>
                        {sortOpen && (
                            <ul
                                role="listbox"
                                aria-label="Sort projects by"
                                className="absolute right-0 mt-2 w-44 rounded-xl border border-brutal-dark/15 bg-brutal-bg shadow-[0_12px_36px_rgba(0,0,0,0.12)] py-1 z-40"
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
                                                onClick={() => {
                                                    onSortChange(s.id);
                                                    setSortOpen(false);
                                                }}
                                                className={cn(
                                                    'w-full text-left px-3 py-2.5 font-data text-[11px] font-bold uppercase tracking-wider',
                                                    'flex items-center gap-2',
                                                    'hover:bg-brutal-dark/[0.04] focus:outline-none focus-visible:bg-brutal-dark/[0.06]',
                                                    active ? 'text-brutal-red' : 'text-brutal-dark/70',
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
            </div>
        );
    },
);
