import React from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface MobileFilterBarProps {
    searchValue: string;
    onSearch: (value: string) => void;
    onOpenFilters: () => void;
    placeholder?: string;
    className?: string;
}

/**
 * 48px compact bar shown only on mobile (< lg).
 * Contains a search input and a "Filters" button that triggers
 * the existing MobileFilterSheet bottom-sheet.
 */
export function MobileFilterBar({ searchValue, onSearch, onOpenFilters, placeholder = 'Search…', className }: MobileFilterBarProps) {
    return (
        <div
            className={cn(
                'lg:hidden sticky top-20 z-30 -mx-6 px-4 py-2',
                'backdrop-blur-md bg-brutal-bg/90 border-b border-brutal-dark/10',
                'flex items-center gap-2',
                className,
            )}
        >
            <div className="relative flex-1 min-w-0">
                <Search
                    size={13}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-brutal-dark/40 pointer-events-none"
                    aria-hidden
                />
                <input
                    type="search"
                    value={searchValue}
                    onChange={(e) => onSearch(e.target.value)}
                    placeholder={placeholder}
                    aria-label={placeholder}
                    className={cn(
                        'w-full h-9 pl-8 pr-7 rounded-full',
                        'bg-brutal-dark/[0.04] border border-brutal-dark/10',
                        'font-data text-[11px] text-brutal-dark placeholder:text-brutal-dark/40',
                        'focus:outline-none focus-visible:ring-2 focus-visible:ring-brutal-red',
                    )}
                />
                {searchValue && (
                    <button
                        type="button"
                        onClick={() => onSearch('')}
                        aria-label="Clear search"
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-brutal-dark/40 hover:text-brutal-red"
                    >
                        <X size={11} />
                    </button>
                )}
            </div>
            <button
                type="button"
                onClick={onOpenFilters}
                aria-label="Open filters"
                className={cn(
                    'flex-shrink-0 h-9 px-3 rounded-full border border-brutal-dark/15',
                    'font-data text-[10px] font-bold uppercase tracking-wider text-brutal-dark/60',
                    'flex items-center gap-1.5',
                    'hover:border-brutal-dark/30 transition-colors',
                )}
            >
                <SlidersHorizontal size={13} />
                Filters
            </button>
        </div>
    );
}
