import React, { useRef, useEffect } from 'react';
import { LayoutGrid, List as ListIcon, Bookmark, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { ProjectsSort, ProjectsView } from './ProjectsFilterRail';

/**
 * §8 Archive Cockpit — Facet Rail (left sidebar).
 *
 * Desktop (≥ lg): Fixed 220px sticky rail below the command bar
 * (sticky top-36 so it sits under the 72px command bar + 16px gap).
 * Contains:
 *   • Domains (multi-select radio chips)
 *   • Tags (multi-select scrollable list)
 *   • View (Grid / List / Bookmarks radio)
 *   • Clear all button
 *
 * Mobile (< lg): Hidden. Use the Filters FAB in the bottom-right
 * or the mobile sheet.
 *
 * Uses same typography as ProjectsCommandBar:
 *   font-data [10-11px] bold uppercase, brutal-dark/brutal-red colors
 */

export interface FacetRailProps {
    // Domain multi-select
    domains: string[];             // available domain options
    selectedDomains: string[];     // currently selected
    onToggleDomain: (domain: string) => void;

    // Tag multi-select
    allTags: string[];             // available tag options
    selectedTags: string[];
    onToggleTag: (tag: string) => void;

    // View mode
    view: ProjectsView;
    onViewChange: (next: ProjectsView) => void;

    // Clear all
    onClearAll: () => void;
    hasActiveFilters: boolean;
}

export const FacetRail = React.forwardRef<HTMLDivElement, FacetRailProps>(
    function FacetRail(
        {
            domains,
            selectedDomains,
            onToggleDomain,
            allTags,
            selectedTags,
            onToggleTag,
            view,
            onViewChange,
            onClearAll,
            hasActiveFilters,
        },
        ref,
    ) {
        const tagsScrollRef = useRef<HTMLDivElement>(null);

        return (
            <div
                ref={ref}
                className={cn(
                    'hidden lg:block',
                    'w-[200px] flex-shrink-0',
                    'sticky top-[180px] h-fit',
                    'space-y-6 pb-12',
                    'filter-rail'
                )}
                role="region"
                aria-label="Project filters"
            >
                {/* ── Domains Section ───────────────────────────────── */}
                <div className="space-y-2">
                    <h3 className="font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/50">
                        Domain
                    </h3>
                    <div className="space-y-1.5">
                        <button
                            type="button"
                            onClick={() => {
                                // Clear all domains
                                for (const d of selectedDomains) {
                                    onToggleDomain(d);
                                }
                            }}
                            aria-pressed={selectedDomains.length === 0}
                            className={cn(
                                'block w-full text-left px-2.5 py-1.5 rounded-md border',
                                'font-data text-[10px] font-bold uppercase tracking-wider',
                                'transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brutal-red',
                                selectedDomains.length === 0
                                    ? 'bg-brutal-dark text-brutal-bg border-brutal-dark'
                                    : 'bg-transparent text-brutal-dark/60 border-brutal-dark/15 hover:border-brutal-dark/40',
                            )}
                        >
                            All
                        </button>
                        {domains.map((d) => {
                            const active = selectedDomains.includes(d);
                            return (
                                <button
                                    key={d}
                                    type="button"
                                    onClick={() => onToggleDomain(d)}
                                    aria-pressed={active}
                                    className={cn(
                                        'block w-full text-left px-2.5 py-1.5 rounded-md border',
                                        'font-data text-[10px] font-bold uppercase tracking-wider',
                                        'transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brutal-red',
                                        active
                                            ? 'bg-brutal-red text-brutal-bg border-brutal-red'
                                            : 'bg-transparent text-brutal-dark/60 border-brutal-dark/15 hover:border-brutal-red/40 hover:text-brutal-red',
                                    )}
                                >
                                    {d}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* ── Tags Section ──────────────────────────────────── */}
                <div className="space-y-2">
                    <h3 className="font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/50">
                        Tags
                    </h3>
                    {allTags.length === 0 ? (
                        <p className="font-data text-xs text-brutal-dark/40">No tags yet.</p>
                    ) : (
                        <div
                            ref={tagsScrollRef}
                            className="space-y-1.5 max-h-[240px] overflow-y-auto"
                        >
                            {allTags.map((t) => {
                                const active = selectedTags.includes(t);
                                return (
                                    <button
                                        key={t}
                                        type="button"
                                        onClick={() => onToggleTag(t)}
                                        aria-pressed={active}
                                        className={cn(
                                            'block w-full text-left px-2.5 py-1.5 rounded-md border',
                                            'font-data text-[10px] font-bold uppercase tracking-wider',
                                            'transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brutal-red',
                                            active
                                                ? 'bg-brutal-red text-brutal-bg border-brutal-red'
                                                : 'bg-transparent text-brutal-dark/60 border-brutal-dark/15 hover:border-brutal-red/40 hover:text-brutal-red',
                                        )}
                                    >
                                        {t}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* ── View Section ──────────────────────────────────── */}
                <div className="space-y-2">
                    <h3 className="font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/50">
                        View
                    </h3>
                    <div role="tablist" aria-label="View mode" className="space-y-1.5">
                        {([
                            { id: 'grid' as const, label: 'Grid', icon: LayoutGrid },
                            { id: 'list' as const, label: 'List', icon: ListIcon },
                            { id: 'bookmarks' as const, label: 'Saved', icon: Bookmark },
                        ]).map((v) => {
                            const Icon = v.icon;
                            const active = view === v.id;
                            return (
                                <button
                                    key={v.id}
                                    type="button"
                                    role="tab"
                                    aria-selected={active}
                                    onClick={() => onViewChange(v.id)}
                                    className={cn(
                                        'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md border',
                                        'font-data text-[10px] font-bold uppercase tracking-wider',
                                        'transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brutal-red',
                                        active
                                            ? 'bg-brutal-dark text-brutal-bg border-brutal-dark'
                                            : 'bg-transparent text-brutal-dark/60 border-brutal-dark/15 hover:border-brutal-dark/40',
                                    )}
                                >
                                    <Icon size={12} aria-hidden />
                                    {v.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* ── Clear all button ───────────────────────────────── */}
                {hasActiveFilters && (
                    <button
                        type="button"
                        onClick={onClearAll}
                        className="w-full flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-md border-2 border-brutal-red/50 bg-brutal-red/5 hover:bg-brutal-red/10"
                    >
                        <X size={12} className="text-brutal-red" aria-hidden />
                        <span className="font-data text-[10px] font-bold uppercase tracking-widest text-brutal-red">
                            Clear all
                        </span>
                    </button>
                )}
            </div>
        );
    },
);
