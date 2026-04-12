import React from 'react';
import { cn } from '../../lib/utils';

export interface TabOption<T extends string = string> {
    value: T;
    label: string;
    /** Optional count badge shown next to the label */
    count?: number;
}

interface BrutalTabBarProps<T extends string = string> {
    /** Available tab options */
    tabs: TabOption<T>[];
    /** Currently active tab value */
    activeTab: T;
    /** Callback when a tab is selected */
    onTabChange: (value: T) => void;
    /** Additional className for the container */
    className?: string;
}

/**
 * BrutalTabBar — Neo-Brutalist horizontal tab/filter bar.
 *
 * Active tab: bg-brutal-dark text-brutal-bg border-2 border-brutal-dark
 * Inactive tab: bg-brutal-paper border-2 border-brutal-dark
 *
 * Used for status/category filtering across ManageProjects, ManageTags, ManageStore.
 * Purely presentational — no data logic.
 */
export function BrutalTabBar<T extends string = string>({
    tabs,
    activeTab,
    onTabChange,
    className,
}: BrutalTabBarProps<T>) {
    return (
        <div
            className={cn('flex flex-wrap gap-2', className)}
            role="tablist"
        >
            {tabs.map((tab) => {
                const isActive = tab.value === activeTab;
                return (
                    <button
                        key={tab.value}
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => onTabChange(tab.value)}
                        className={cn(
                            'px-4 py-2 font-data text-sm font-bold uppercase tracking-wide',
                            'border-2 border-brutal-dark transition-all duration-200 ease-magnetic',
                            'hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_rgba(17,17,17,1)]',
                            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brutal-red',
                            isActive
                                ? 'bg-brutal-dark text-brutal-bg shadow-[4px_4px_0_0_rgba(17,17,17,0.3)]'
                                : 'bg-brutal-paper text-brutal-dark hover:bg-brutal-dark/5'
                        )}
                    >
                        {tab.label}
                        {tab.count !== undefined && (
                            <span
                                className={cn(
                                    'ml-2 text-xs px-1.5 py-0.5 rounded-sm',
                                    isActive
                                        ? 'bg-brutal-bg/20 text-brutal-bg'
                                        : 'bg-brutal-dark/10 text-brutal-dark/60'
                                )}
                            >
                                {tab.count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
