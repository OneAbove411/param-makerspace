import React, { forwardRef, useMemo } from 'react';
import { Search, X, LayoutGrid, List as ListIcon, Bookmark, SlidersHorizontal, Flame, Clock } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * §8 Archive Cockpit — Sticky Filter Rail.
 *
 * Controlled component: all state lives in the parent (Projects.tsx)
 * which syncs it to URL search params. The rail is a dumb view that
 * renders chips + search + sort + view toggle.
 *
 * Layout:
 *   ┌───────────────────────────────────────────────────────────┐
 *   │ 🔍 search…                   [sort ▼]  [Grid|List|Saved]   │
 *   │ Domain:  #All  #Software  #AI  #Fab  #Electronics   …      │
 *   │ Tags:    #vision  #ros2  #cobot   (+N)                     │
 *   └───────────────────────────────────────────────────────────┘
 *
 * Accessibility:
 *   - Search input has an `id` and `aria-label`; parent passes a ref
 *     so the `/` shortcut can focus it.
 *   - Chips are real <button>s with `aria-pressed` for selection state.
 *   - View toggle is a `role="tablist"` with `role="tab"` children.
 *   - Keyboard focus rings are visible on every interactive element.
 *
 * Intentionally no network calls — aggregates come from `useProjects`.
 */

export type ProjectsView = 'grid' | 'list' | 'bookmarks';
export type ProjectsSort = 'newest' | 'oldest' | 'trending';

export interface ProjectsFilterRailProps {
    // Search
    search: string;
    onSearchChange: (next: string) => void;
    searchInputRef?: React.Ref<HTMLInputElement>;

    // Domain multi-select
    domains: string[];             // available domain options
    selectedDomains: string[];     // currently selected
    onToggleDomain: (domain: string) => void;

    // Tag multi-select
    allTags: string[];             // available tag options (capped)
    selectedTags: string[];
    onToggleTag: (tag: string) => void;

    // Sort + view
    sort: ProjectsSort;
    onSortChange: (next: ProjectsSort) => void;
    view: ProjectsView;
    onViewChange: (next: ProjectsView) => void;

    // Clear all
    onClearAll: () => void;
    hasActiveFilters: boolean;

    // Result count for screen readers
    resultCount: number;
}

export const ProjectsFilterRail = forwardRef<HTMLDivElement, ProjectsFilterRailProps>(
    function ProjectsFilterRail(
        {
            search,
            onSearchChange,
            searchInputRef,
            domains,
            selectedDomains,
            onToggleDomain,
            allTags,
            selectedTags,
            onToggleTag,
            sort,
            onSortChange,
            view,
            onViewChange,
            onClearAll,
            hasActiveFilters,
            resultCount,
        },
        ref
    ) {
        const visibleTags = useMemo(() => allTags.slice(0, 12), [allTags]);
        const hiddenTagCount = Math.max(0, allTags.length - visibleTags.length);

        return (
            <div
                ref={ref}
                className={cn(
                    'filter-rail sticky top-20 z-30 mb-8',
                    'bg-brutal-bg/92 backdrop-blur-md supports-[backdrop-filter]:bg-brutal-bg/80',
                    'border-2 border-brutal-dark/15 rounded-2xl',
                    'shadow-[6px_6px_0_0_rgba(196,41,30,0.14)]'
                )}
                role="region"
                aria-label="Project filters"
            >
                {/* Row 1 — search + sort + view toggle */}
                <div className="flex flex-col lg:flex-row lg:items-center gap-3 p-4 border-b border-brutal-dark/10">
                    {/* Search */}
                    <label
                        htmlFor="projects-archive-search"
                        className="relative flex-1 flex items-center"
                    >
                        <Search
                            size={16}
                            aria-hidden
                            className="absolute left-4 text-brutal-dark/40"
                        />
                        <input
                            id="projects-archive-search"
                            ref={searchInputRef}
                            type="search"
                            value={search}
                            onChange={(e) => onSearchChange(e.target.value)}
                            placeholder="Search projects, tags, makers…"
                            aria-label="Search projects"
                            className={cn(
                                'w-full pl-11 pr-24 py-3 rounded-full min-h-[44px]',
                                'bg-brutal-bg border-2 border-brutal-dark/15',
                                'font-data text-sm text-brutal-dark placeholder:text-brutal-dark/35',
                                'focus:border-brutal-dark focus:outline-none',
                                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brutal-red',
                                search && 'border-brutal-red/60'
                            )}
                        />
                        <kbd
                            className={cn(
                                'hidden md:inline-flex items-center absolute right-4',
                                'px-1.5 py-0.5 rounded border border-brutal-dark/20 bg-brutal-dark/[0.04]',
                                'font-data text-[9px] font-bold tracking-widest text-brutal-dark/50'
                            )}
                            aria-hidden
                        >
                            /
                        </kbd>
                    </label>

                    {/* Sort */}
                    <div className="flex items-center gap-2">
                        <SlidersHorizontal size={14} className="text-brutal-dark/40 flex-shrink-0" aria-hidden />
                        <div
                            role="radiogroup"
                            aria-label="Sort projects"
                            className="inline-flex rounded-full border-2 border-brutal-dark/15 overflow-hidden bg-brutal-bg"
                        >
                            <SortButton
                                label="Trending"
                                icon={<Flame size={12} aria-hidden />}
                                active={sort === 'trending'}
                                onClick={() => onSortChange('trending')}
                            />
                            <SortButton
                                label="Newest"
                                icon={<Clock size={12} aria-hidden />}
                                active={sort === 'newest'}
                                onClick={() => onSortChange('newest')}
                            />
                            <SortButton
                                label="Oldest"
                                icon={<Clock size={12} aria-hidden className="rotate-180" />}
                                active={sort === 'oldest'}
                                onClick={() => onSortChange('oldest')}
                            />
                        </div>
                    </div>

                    {/* View toggle */}
                    <div
                        role="tablist"
                        aria-label="View mode"
                        className="inline-flex rounded-full border-2 border-brutal-dark/15 overflow-hidden bg-brutal-bg flex-shrink-0"
                    >
                        <ViewButton
                            label="Grid"
                            icon={<LayoutGrid size={14} aria-hidden />}
                            active={view === 'grid'}
                            onClick={() => onViewChange('grid')}
                        />
                        <ViewButton
                            label="List"
                            icon={<ListIcon size={14} aria-hidden />}
                            active={view === 'list'}
                            onClick={() => onViewChange('list')}
                        />
                        <ViewButton
                            label="Saved"
                            icon={<Bookmark size={14} aria-hidden />}
                            active={view === 'bookmarks'}
                            onClick={() => onViewChange('bookmarks')}
                        />
                    </div>
                </div>

                {/* Row 2 — domain chips */}
                <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-brutal-dark/10">
                    <span className="font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/40 mr-1">
                        Domain
                    </span>
                    {domains.map((d) => {
                        const active = selectedDomains.includes(d);
                        return (
                            <button
                                key={d}
                                type="button"
                                role="button"
                                aria-pressed={active}
                                onClick={() => onToggleDomain(d)}
                                className={cn(
                                    'inline-flex items-center gap-1 rounded-full px-3 py-1.5 min-h-[32px]',
                                    'font-data text-[11px] font-bold uppercase tracking-wider',
                                    'border-2 transition-colors duration-150',
                                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brutal-red',
                                    active
                                        ? 'bg-brutal-dark text-brutal-bg border-brutal-dark shadow-[2px_2px_0_0_rgba(196,41,30,0.5)]'
                                        : 'bg-brutal-bg text-brutal-dark/65 border-brutal-dark/15 hover:border-brutal-dark/40 hover:text-brutal-dark'
                                )}
                            >
                                #{d}
                            </button>
                        );
                    })}
                </div>

                {/* Row 3 — tag chips (only if any exist) */}
                {visibleTags.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 px-4 py-3">
                        <span className="font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/40 mr-1">
                            Tags
                        </span>
                        {visibleTags.map((t) => {
                            const active = selectedTags.includes(t);
                            return (
                                <button
                                    key={t}
                                    type="button"
                                    aria-pressed={active}
                                    onClick={() => onToggleTag(t)}
                                    className={cn(
                                        'inline-flex items-center rounded-full px-2.5 py-1 min-h-[28px]',
                                        'font-data text-[10px] font-bold uppercase tracking-wider',
                                        'border transition-colors duration-150',
                                        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brutal-red',
                                        active
                                            ? 'bg-brutal-red/10 text-brutal-red border-brutal-red/60'
                                            : 'bg-brutal-dark/[0.03] text-brutal-dark/55 border-brutal-dark/10 hover:border-brutal-dark/30 hover:text-brutal-dark/80'
                                    )}
                                >
                                    {t}
                                </button>
                            );
                        })}
                        {hiddenTagCount > 0 && (
                            <span className="font-data text-[10px] font-bold uppercase tracking-wider text-brutal-dark/35">
                                +{hiddenTagCount} more
                            </span>
                        )}
                    </div>
                )}

                {/* Footer — count + clear */}
                <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-t border-brutal-dark/10 bg-brutal-dark/[0.015]">
                    <span
                        className="font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/50 tabular-nums"
                        aria-live="polite"
                    >
                        {resultCount} {resultCount === 1 ? 'project' : 'projects'}
                    </span>
                    {hasActiveFilters && (
                        <button
                            type="button"
                            onClick={onClearAll}
                            className={cn(
                                'inline-flex items-center gap-1 rounded-full px-3 py-1.5 min-h-[32px]',
                                'font-data text-[10px] font-bold uppercase tracking-widest',
                                'text-brutal-red border border-brutal-red/40 bg-brutal-red/5',
                                'hover:bg-brutal-red hover:text-brutal-bg transition-colors',
                                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brutal-red'
                            )}
                        >
                            <X size={11} aria-hidden />
                            Clear all
                        </button>
                    )}
                </div>
            </div>
        );
    }
);

// ── Tiny internal components ─────────────────────────────────────

function SortButton({
    label,
    icon,
    active,
    onClick,
}: {
    label: string;
    icon: React.ReactNode;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            role="radio"
            aria-checked={active}
            onClick={onClick}
            className={cn(
                'inline-flex items-center gap-1.5 px-3 py-2 min-h-[36px]',
                'font-data text-[10px] font-bold uppercase tracking-widest',
                'border-r border-brutal-dark/10 last:border-r-0',
                'transition-colors duration-150',
                'focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brutal-red',
                active
                    ? 'bg-brutal-red text-brutal-bg'
                    : 'text-brutal-dark/55 hover:text-brutal-dark hover:bg-brutal-dark/[0.04]'
            )}
        >
            {icon}
            {label}
        </button>
    );
}

function ViewButton({
    label,
    icon,
    active,
    onClick,
}: {
    label: string;
    icon: React.ReactNode;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            role="tab"
            aria-selected={active}
            aria-label={label}
            onClick={onClick}
            className={cn(
                'inline-flex items-center gap-1.5 px-3 py-2 min-h-[36px] min-w-[44px] justify-center',
                'font-data text-[10px] font-bold uppercase tracking-widest',
                'border-r border-brutal-dark/10 last:border-r-0',
                'transition-colors duration-150',
                'focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brutal-red',
                active
                    ? 'bg-brutal-dark text-brutal-bg'
                    : 'text-brutal-dark/55 hover:text-brutal-dark hover:bg-brutal-dark/[0.04]'
            )}
        >
            {icon}
            <span className="hidden sm:inline">{label}</span>
        </button>
    );
}
