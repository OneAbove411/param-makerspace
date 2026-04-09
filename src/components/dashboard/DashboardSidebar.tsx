import React from 'react';
import {
    LayoutGrid,
    Briefcase,
    ClipboardCheck,
    ShieldCheck,
    ChevronsLeft,
    ChevronsRight,
    Command,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { isMacPlatform } from '../../lib/platform';

/**
 * §7 Cockpit — Sticky brutalist left rail for the Dashboard route only.
 *
 * Why this exists:
 *   The previous dashboard was a long vertical scroll (8 viewports for an
 *   admin). Linear / Vercel / Supabase / Posthog have all converged on a
 *   sticky left rail + content layout because it kills scroll fatigue and
 *   gives one-click jumps to any section. We adopt the same pattern but
 *   keep the rail INSIDE Dashboard.tsx so it never appears on any other
 *   route — zero changes to RootLayout, zero risk to other UX_MASTER
 *   sections.
 *
 * RBAC:
 *   Visibility of Mentor Queue / System Control items is controlled by
 *   the parent Dashboard.tsx via the `items` prop, which is filtered with
 *   the same canViewMentorTools / role === 'admin' checks that already
 *   gate the lazy-loaded sections today. This file does NOT touch role
 *   or rank logic.
 *
 * Aesthetic:
 *   - brutal-bg surface, thick brutal-dark borders
 *   - Active item: solid brutal-dark fill, brutal-bg text (inverse)
 *   - Hover: subtle dark/5 fill + 2px translate
 *   - Collapsed mode: icon-only, 64px wide, tooltips via title attr
 *   - prefers-reduced-motion: transitions become snap
 */

export type DashboardTabId =
    | 'overview'
    | 'my-work'
    | 'mentor'
    | 'admin';

export interface DashboardSidebarItem {
    id: DashboardTabId;
    label: string;
    description: string;
    icon: 'overview' | 'work' | 'mentor' | 'admin';
    badge?: number; // optional small count chip (e.g. attention items)
}

const ICONS = {
    overview: LayoutGrid,
    work:     Briefcase,
    mentor:   ClipboardCheck,
    admin:    ShieldCheck,
} as const;

interface DashboardSidebarProps {
    items: DashboardSidebarItem[];
    activeTab: DashboardTabId;
    onTabChange: (tab: DashboardTabId) => void;
    collapsed: boolean;
    onToggleCollapsed: () => void;
    onOpenCommandPalette: () => void;
}

export function DashboardSidebar({
    items,
    activeTab,
    onTabChange,
    collapsed,
    onToggleCollapsed,
    onOpenCommandPalette,
}: DashboardSidebarProps) {
    const isMac = isMacPlatform();
    return (
        <aside
            aria-label="Dashboard navigation"
            className={cn(
                'sticky top-24 self-start hidden md:flex flex-col',
                'bg-brutal-bg border-2 border-brutal-dark/15 rounded-2xl',
                'shadow-[6px_6px_0_0_rgba(20,20,20,0.08)]',
                'transition-[width] duration-200 ease-out motion-reduce:transition-none',
                collapsed ? 'w-[72px]' : 'w-[240px]',
                'p-3'
            )}
        >
            {/* Eyebrow */}
            <div
                className={cn(
                    'font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/30 mb-3 px-2',
                    collapsed && 'sr-only'
                )}
            >
                Cockpit
            </div>

            {/* Items */}
            <nav className="flex flex-col gap-1.5" role="tablist" aria-orientation="vertical">
                {items.map((item) => {
                    const Icon = ICONS[item.icon];
                    const isActive = activeTab === item.id;
                    return (
                        <button
                            key={item.id}
                            type="button"
                            role="tab"
                            aria-selected={isActive}
                            aria-current={isActive ? 'page' : undefined}
                            title={collapsed ? item.label : undefined}
                            onClick={() => onTabChange(item.id)}
                            className={cn(
                                'group relative flex items-center gap-3 rounded-xl px-3 py-2.5',
                                'font-data text-sm font-bold uppercase tracking-wider',
                                'border-2 transition-all duration-150 ease-out',
                                'motion-reduce:transition-none',
                                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brutal-red',
                                isActive
                                    ? 'bg-brutal-dark text-brutal-bg border-brutal-dark shadow-[3px_3px_0_0_rgba(196,41,30,0.9)]'
                                    : 'bg-transparent text-brutal-dark/70 border-transparent hover:border-brutal-dark/15 hover:bg-brutal-dark/5 hover:text-brutal-dark'
                            )}
                        >
                            <Icon className="w-5 h-5 flex-shrink-0" aria-hidden />
                            {!collapsed && (
                                <span className="flex-1 text-left truncate">{item.label}</span>
                            )}
                            {!collapsed && typeof item.badge === 'number' && item.badge > 0 && (
                                <span
                                    aria-label={`${item.badge} pending`}
                                    className={cn(
                                        'ml-auto inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold tabular-nums',
                                        isActive
                                            ? 'bg-brutal-red text-brutal-bg'
                                            : 'bg-brutal-red/15 text-brutal-red'
                                    )}
                                >
                                    {item.badge > 99 ? '99+' : item.badge}
                                </span>
                            )}
                            {collapsed && typeof item.badge === 'number' && item.badge > 0 && (
                                <span
                                    aria-hidden
                                    className="absolute top-1 right-1 w-2 h-2 rounded-full bg-brutal-red"
                                />
                            )}
                        </button>
                    );
                })}
            </nav>

            <div className="flex-1" />

            {/* Cmd+K trigger */}
            <button
                type="button"
                onClick={onOpenCommandPalette}
                title="Open command palette"
                className={cn(
                    'mt-3 flex items-center gap-2 rounded-xl px-3 py-2',
                    'border-2 border-dashed border-brutal-dark/20',
                    'font-data text-[11px] font-bold uppercase tracking-widest text-brutal-dark/60',
                    'hover:border-brutal-dark/40 hover:text-brutal-dark hover:bg-brutal-dark/5',
                    'transition-colors motion-reduce:transition-none',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brutal-red'
                )}
            >
                <Command className="w-4 h-4" aria-hidden />
                {!collapsed && (
                    <>
                        <span>Quick jump</span>
                        <kbd className="ml-auto inline-flex items-center justify-center px-1.5 py-0.5 rounded border border-brutal-dark/20 bg-brutal-bg text-[9px] tabular-nums">
                            {isMac ? '⌘K' : 'Ctrl K'}
                        </kbd>
                    </>
                )}
            </button>

            {/* Collapse toggle */}
            <button
                type="button"
                onClick={onToggleCollapsed}
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                className={cn(
                    'mt-2 flex items-center justify-center gap-2 rounded-xl px-3 py-2',
                    'text-brutal-dark/40 hover:text-brutal-dark hover:bg-brutal-dark/5',
                    'transition-colors motion-reduce:transition-none',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brutal-red'
                )}
            >
                {collapsed ? (
                    <ChevronsRight className="w-4 h-4" aria-hidden />
                ) : (
                    <>
                        <ChevronsLeft className="w-4 h-4" aria-hidden />
                        <span className="font-data text-[10px] font-bold uppercase tracking-widest">
                            Collapse
                        </span>
                    </>
                )}
            </button>
        </aside>
    );
}

/**
 * Mobile counterpart — horizontal pill scroller pinned under the hero.
 * Renders only on `< md`, where the sidebar is hidden. RBAC is still
 * driven by the same `items` prop (already filtered by parent).
 */
export function DashboardTabBarMobile({
    items,
    activeTab,
    onTabChange,
}: {
    items: DashboardSidebarItem[];
    activeTab: DashboardTabId;
    onTabChange: (tab: DashboardTabId) => void;
}) {
    return (
        <div
            role="tablist"
            aria-label="Dashboard sections"
            className="md:hidden flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin"
        >
            {items.map((item) => {
                const Icon = ICONS[item.icon];
                const isActive = activeTab === item.id;
                return (
                    <button
                        key={item.id}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => onTabChange(item.id)}
                        className={cn(
                            'flex-shrink-0 inline-flex items-center gap-2 rounded-full px-4 py-2',
                            'font-data text-xs font-bold uppercase tracking-wider',
                            'border-2 transition-all duration-150 ease-out motion-reduce:transition-none',
                            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brutal-red',
                            isActive
                                ? 'bg-brutal-dark text-brutal-bg border-brutal-dark shadow-[3px_3px_0_0_rgba(196,41,30,0.9)]'
                                : 'bg-brutal-bg text-brutal-dark/70 border-brutal-dark/15 hover:border-brutal-dark/40'
                        )}
                    >
                        <Icon className="w-4 h-4" aria-hidden />
                        <span>{item.label}</span>
                        {typeof item.badge === 'number' && item.badge > 0 && (
                            <span
                                aria-label={`${item.badge} pending`}
                                className={cn(
                                    'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[9px] font-bold tabular-nums',
                                    isActive ? 'bg-brutal-red text-brutal-bg' : 'bg-brutal-red/15 text-brutal-red'
                                )}
                            >
                                {item.badge > 99 ? '99+' : item.badge}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
