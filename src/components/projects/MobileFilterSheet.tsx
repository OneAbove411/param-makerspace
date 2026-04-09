import { useEffect, useRef } from 'react';
import { X, Flame, Clock } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { ProjectsSort } from './ProjectsFilterRail';

// ─── Module-level ref-count for mobile sheet overflow lock ───
// Prevents overflow from being restored while other sheets are still open
let mobileSheetOpenCount = 0;
let savedBodyOverflow: string | null = null;

/**
 * §8 Archive Cockpit — Mobile bottom sheet for filters.
 *
 * Triggered by the "Filters" button in `ProjectsCommandBar` when the
 * viewport is below `md`. Contains:
 *   - Sort radios (Trending / Newest / Oldest)
 *   - Domain chips (multi-select)
 *   - Tag chips (multi-select)
 *   - Clear all + Apply (Apply = close)
 *
 * Accessibility:
 *   - `role="dialog"` + `aria-modal="true"` + `aria-labelledby`
 *   - First focus moves to the close button on open
 *   - Escape closes; backdrop click closes; body scroll locked
 *   - `prefers-reduced-motion` disables the slide transition
 */

export interface MobileFilterSheetProps {
    open: boolean;
    onClose: () => void;

    domains: string[];
    selectedDomains: string[];
    onToggleDomain: (d: string) => void;

    allTags: string[];
    selectedTags: string[];
    onToggleTag: (t: string) => void;

    sort: ProjectsSort;
    onSortChange: (next: ProjectsSort) => void;

    onClearAll: () => void;
    hasActiveFilters: boolean;
    resultCount: number;
}

const SORT_OPTIONS: Array<{ id: ProjectsSort; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = [
    { id: 'trending', label: 'Trending', icon: Flame },
    { id: 'newest', label: 'Newest', icon: Clock },
    { id: 'oldest', label: 'Oldest', icon: Clock },
];

export function MobileFilterSheet({
    open,
    onClose,
    domains,
    selectedDomains,
    onToggleDomain,
    allTags,
    selectedTags,
    onToggleTag,
    sort,
    onSortChange,
    onClearAll,
    hasActiveFilters,
    resultCount,
}: MobileFilterSheetProps) {
    const closeBtnRef = useRef<HTMLButtonElement>(null);
    const titleId = 'mobile-filter-sheet-title';

    // Lock body scroll with ref-counted pattern to prevent leak
    useEffect(() => {
        if (!open) return;

        // Increment open count; if first sheet, save and lock overflow
        mobileSheetOpenCount++;
        if (mobileSheetOpenCount === 1) {
            savedBodyOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
        }

        const prevActive = document.activeElement as HTMLElement | null;
        closeBtnRef.current?.focus();
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.stopPropagation();
                onClose();
            }
        };
        window.addEventListener('keydown', onKey);

        return () => {
            // Decrement open count; if last sheet, restore overflow
            mobileSheetOpenCount--;
            if (mobileSheetOpenCount === 0 && savedBodyOverflow !== null) {
                document.body.style.overflow = savedBodyOverflow;
                savedBodyOverflow = null;
            }
            window.removeEventListener('keydown', onKey);
            prevActive?.focus?.();
        };
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div
            className="md:hidden fixed inset-0 z-50"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
        >
            {/* Backdrop */}
            <button
                type="button"
                aria-label="Close filters"
                onClick={onClose}
                className="absolute inset-0 bg-brutal-dark/50 backdrop-blur-sm animate-in fade-in duration-200"
            />

            {/* Sheet */}
            <div
                className={cn(
                    'absolute inset-x-0 bottom-0 max-h-[85vh]',
                    'bg-brutal-bg rounded-t-3xl border-t-2 border-brutal-dark/15',
                    'shadow-[0_-12px_48px_rgba(0,0,0,0.18)]',
                    'flex flex-col',
                    'motion-safe:animate-in motion-safe:slide-in-from-bottom motion-safe:duration-300',
                )}
            >
                {/* Grabber */}
                <div className="flex justify-center pt-3 pb-2">
                    <div className="w-12 h-1 rounded-full bg-brutal-dark/15" aria-hidden="true" />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-5 pb-3 border-b border-brutal-dark/10">
                    <h2 id={titleId} className="font-heading font-bold text-lg uppercase tracking-tight-heading">
                        Filters
                    </h2>
                    <button
                        ref={closeBtnRef}
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="min-h-[44px] min-w-[44px] rounded-full flex items-center justify-center text-brutal-dark/60 hover:text-brutal-red focus:outline-none focus-visible:ring-2 focus-visible:ring-brutal-red"
                    >
                        <X size={18} aria-hidden="true" />
                    </button>
                </div>

                {/* Scrollable body */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
                    {/* Sort */}
                    <section>
                        <h3 className="font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/50 mb-2">
                            Sort
                        </h3>
                        <div role="radiogroup" aria-label="Sort by" className="flex flex-wrap gap-2">
                            {SORT_OPTIONS.map((s) => {
                                const Icon = s.icon;
                                const active = sort === s.id;
                                return (
                                    <button
                                        key={s.id}
                                        type="button"
                                        role="radio"
                                        aria-checked={active}
                                        onClick={() => onSortChange(s.id)}
                                        className={cn(
                                            'min-h-[44px] px-4 rounded-full border font-data text-[11px] font-bold uppercase tracking-wider',
                                            'flex items-center gap-1.5',
                                            'focus:outline-none focus-visible:ring-2 focus-visible:ring-brutal-red focus-visible:ring-offset-2 focus-visible:ring-offset-brutal-bg',
                                            active
                                                ? 'bg-brutal-dark text-brutal-bg border-brutal-dark'
                                                : 'text-brutal-dark/60 border-brutal-dark/15',
                                        )}
                                    >
                                        <Icon size={12} aria-hidden="true" />
                                        {s.label}
                                    </button>
                                );
                            })}
                        </div>
                    </section>

                    {/* Domains */}
                    <section>
                        <h3 className="font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/50 mb-2">
                            Domain
                        </h3>
                        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by domain">
                            {domains.map((d) => {
                                const active = selectedDomains.includes(d);
                                return (
                                    <button
                                        key={d}
                                        type="button"
                                        onClick={() => onToggleDomain(d)}
                                        aria-pressed={active}
                                        className={cn(
                                            'min-h-[44px] px-4 rounded-full border font-data text-[11px] font-bold uppercase tracking-wider',
                                            'focus:outline-none focus-visible:ring-2 focus-visible:ring-brutal-red focus-visible:ring-offset-2 focus-visible:ring-offset-brutal-bg',
                                            active
                                                ? 'bg-brutal-red text-brutal-bg border-brutal-red'
                                                : 'text-brutal-dark/60 border-brutal-dark/15',
                                        )}
                                    >
                                        #{d}
                                    </button>
                                );
                            })}
                        </div>
                    </section>

                    {/* Tags */}
                    {allTags.length > 0 && (
                        <section>
                            <h3 className="font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/50 mb-2">
                                Tags
                            </h3>
                            <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by tag">
                                {allTags.map((t) => {
                                    const active = selectedTags.includes(t);
                                    return (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => onToggleTag(t)}
                                            aria-pressed={active}
                                            className={cn(
                                                'min-h-[36px] px-3 rounded-full border font-data text-[10px] font-bold uppercase tracking-wider',
                                                'focus:outline-none focus-visible:ring-2 focus-visible:ring-brutal-red focus-visible:ring-offset-1',
                                                active
                                                    ? 'bg-brutal-red text-brutal-bg border-brutal-red'
                                                    : 'text-brutal-dark/60 border-brutal-dark/15',
                                            )}
                                        >
                                            #{t}
                                        </button>
                                    );
                                })}
                            </div>
                        </section>
                    )}
                </div>

                {/* Footer actions */}
                <div className="flex items-center gap-3 px-5 py-3 pb-[calc(env(safe-area-inset-bottom)+12px)] border-t border-brutal-dark/10 bg-brutal-bg">
                    <button
                        type="button"
                        onClick={onClearAll}
                        disabled={!hasActiveFilters}
                        className={cn(
                            'min-h-[44px] px-4 rounded-full border font-data text-[11px] font-bold uppercase tracking-wider',
                            'focus:outline-none focus-visible:ring-2 focus-visible:ring-brutal-red focus-visible:ring-offset-2 focus-visible:ring-offset-brutal-bg',
                            hasActiveFilters
                                ? 'text-brutal-red border-brutal-red/40 hover:bg-brutal-red/5'
                                : 'text-brutal-dark/30 border-brutal-dark/10 cursor-not-allowed',
                        )}
                    >
                        Clear
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 min-h-[44px] rounded-full bg-brutal-dark text-brutal-bg font-heading font-bold uppercase tracking-widest text-sm hover:bg-brutal-red transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brutal-red focus-visible:ring-offset-2 focus-visible:ring-offset-brutal-bg"
                    >
                        Show {resultCount} {resultCount === 1 ? 'project' : 'projects'}
                    </button>
                </div>
            </div>
        </div>
    );
}
