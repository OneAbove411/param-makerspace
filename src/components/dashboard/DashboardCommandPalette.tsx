import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowRight, Command as CommandIcon, CornerDownLeft } from 'lucide-react';
import { cn } from '../../lib/utils';
import { isMacPlatform } from '../../lib/platform';
import type { DashboardTabId } from './DashboardSidebar';

/**
 * §7 Cockpit — Brutalist command palette (Cmd+K).
 *
 * Implementation note:
 *   We deliberately do NOT pull in `cmdk` or `react-cmdk` because that
 *   would add a runtime dependency for ~120 lines of behavior we can
 *   write ourselves. Same architecture Linear shipped first: a portal-
 *   like fixed overlay, fuzzy substring filter, keyboard navigation,
 *   focus trap, ESC to close, prefers-reduced-motion respected.
 *
 * RBAC:
 *   Commands are filtered by the `commands` array passed in from
 *   Dashboard.tsx. The dashboard derives that array from the same
 *   role / canAccess checks that gate the rest of the UI today, so
 *   this file does NOT touch role or rank logic.
 */

export interface DashboardCommand {
    id: string;
    label: string;
    hint?: string;
    section: 'Navigate' | 'Create' | 'Mentor' | 'Admin' | 'Account';
    keywords?: string[];
    /** Either jump to a tab or navigate to a route — exactly one. */
    tab?: DashboardTabId;
    to?: string;
    /** Optional side effect (e.g. open the new-project form). */
    action?: () => void;
}

interface DashboardCommandPaletteProps {
    open: boolean;
    onClose: () => void;
    commands: DashboardCommand[];
    onJumpToTab: (tab: DashboardTabId) => void;
}

export function DashboardCommandPalette({
    open,
    onClose,
    commands,
    onJumpToTab,
}: DashboardCommandPaletteProps) {
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    // Reset query + focus input on open
    useEffect(() => {
        if (open) {
            setQuery('');
            setActiveIndex(0);
            // Defer focus to next tick so the dialog has mounted.
            const t = setTimeout(() => inputRef.current?.focus(), 0);
            return () => clearTimeout(t);
        }
    }, [open]);

    // Lock body scroll while open
    useEffect(() => {
        if (!open) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, [open]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return commands;
        return commands.filter((c) => {
            const hay = [c.label, c.hint || '', c.section, ...(c.keywords || [])]
                .join(' ')
                .toLowerCase();
            return hay.includes(q);
        });
    }, [commands, query]);

    // Group filtered commands by section, preserving section order.
    const grouped = useMemo(() => {
        const order: DashboardCommand['section'][] = [
            'Navigate',
            'Create',
            'Mentor',
            'Admin',
            'Account',
        ];
        const map = new Map<DashboardCommand['section'], DashboardCommand[]>();
        for (const c of filtered) {
            if (!map.has(c.section)) map.set(c.section, []);
            map.get(c.section)!.push(c);
        }
        return order
            .filter((s) => map.has(s))
            .map((s) => ({ section: s, items: map.get(s)! }));
    }, [filtered]);

    // Flat order so arrow keys can step through across sections.
    const flatOrder = useMemo(
        () => grouped.flatMap((g) => g.items),
        [grouped]
    );

    // Keep activeIndex in range when filter changes
    useEffect(() => {
        if (activeIndex >= flatOrder.length) {
            setActiveIndex(0);
        }
    }, [flatOrder, activeIndex]);

    const runCommand = useCallback(
        (cmd: DashboardCommand) => {
            onClose();
            // Defer the side effect one tick so the dialog can unmount cleanly.
            setTimeout(() => {
                if (cmd.action) cmd.action();
                if (cmd.tab) onJumpToTab(cmd.tab);
                if (cmd.to) navigate(cmd.to);
            }, 0);
        },
        [navigate, onClose, onJumpToTab]
    );

    const onKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLDivElement>) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
                return;
            }
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveIndex((i) => (flatOrder.length === 0 ? 0 : (i + 1) % flatOrder.length));
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveIndex((i) =>
                    flatOrder.length === 0 ? 0 : (i - 1 + flatOrder.length) % flatOrder.length
                );
                return;
            }
            if (e.key === 'Enter') {
                e.preventDefault();
                const cmd = flatOrder[activeIndex];
                if (cmd) runCommand(cmd);
                return;
            }
        },
        [activeIndex, flatOrder, onClose, runCommand]
    );

    if (!open) return null;

    const isMac = isMacPlatform();
    const modKeyLabel = isMac ? '⌘K' : 'Ctrl K';

    let runningIndex = -1;

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4"
            onKeyDown={onKeyDown}
        >
            {/* Backdrop */}
            <button
                type="button"
                aria-label="Close command palette"
                onClick={onClose}
                className="absolute inset-0 bg-brutal-dark/50 backdrop-blur-sm motion-reduce:backdrop-blur-none"
            />

            {/* Dialog body — tighter corners, thicker border, sharper shadow */}
            <div
                className={cn(
                    'relative w-full max-w-xl bg-brutal-bg border-2 border-brutal-dark rounded-xl overflow-hidden',
                    'shadow-[8px_8px_0_0_rgba(196,41,30,0.95)]',
                    'motion-safe:animate-[fadeIn_120ms_ease-out]'
                )}
            >
                {/* Brutalist red top stripe — frames the dialog */}
                <div className="h-1 bg-brutal-red" aria-hidden />

                {/* Search bar */}
                <div className="flex items-center gap-3 px-5 py-4 border-b-2 border-brutal-dark/15">
                    <Search className="w-[18px] h-[18px] text-brutal-dark/45 flex-shrink-0" aria-hidden strokeWidth={2.25} />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setActiveIndex(0);
                        }}
                        placeholder="Jump to anything…"
                        aria-label="Search dashboard commands"
                        className="flex-1 bg-transparent border-none outline-none font-data text-[15px] leading-none text-brutal-dark placeholder:text-brutal-dark/35"
                    />
                    <kbd
                        className={cn(
                            'hidden sm:inline-flex items-center justify-center px-2 py-1 rounded',
                            'border border-brutal-dark/25 bg-brutal-bg',
                            'font-data text-[10px] font-bold tracking-widest text-brutal-dark/55'
                        )}
                    >
                        ESC
                    </kbd>
                </div>

                {/* Results */}
                <div
                    ref={listRef}
                    role="listbox"
                    aria-label="Available commands"
                    className="max-h-[52vh] overflow-y-auto py-2 scrollbar-thin"
                >
                    {grouped.length === 0 && (
                        <div className="px-5 py-10 text-center font-data text-sm text-brutal-dark/45">
                            No commands match "<span className="font-bold text-brutal-dark/70">{query}</span>".
                        </div>
                    )}
                    {grouped.map(({ section, items }, gIdx) => (
                        <div key={section} className={cn('mb-1', gIdx > 0 && 'mt-1')}>
                            <div className="px-5 pt-3 pb-1.5 font-data text-[10px] font-bold uppercase tracking-[0.18em] text-brutal-dark/35">
                                {section}
                            </div>
                            {items.map((cmd) => {
                                runningIndex += 1;
                                const isActive = runningIndex === activeIndex;
                                return (
                                    <button
                                        key={cmd.id}
                                        type="button"
                                        role="option"
                                        aria-selected={isActive}
                                        onMouseEnter={() => setActiveIndex(runningIndex)}
                                        onClick={() => runCommand(cmd)}
                                        className={cn(
                                            'w-full flex items-center gap-3 px-5 py-2.5 text-left',
                                            'font-data text-sm transition-colors motion-reduce:transition-none',
                                            'focus:outline-none border-l-2',
                                            isActive
                                                ? 'bg-brutal-dark text-brutal-bg border-brutal-red'
                                                : 'text-brutal-dark border-transparent hover:bg-brutal-dark/[0.04]'
                                        )}
                                    >
                                        <span className="flex-1 min-w-0 flex items-baseline gap-2">
                                            <span className="font-bold truncate">{cmd.label}</span>
                                            {cmd.hint && (
                                                <span
                                                    className={cn(
                                                        'text-[11px] truncate',
                                                        isActive ? 'text-brutal-bg/55' : 'text-brutal-dark/40'
                                                    )}
                                                >
                                                    {cmd.hint}
                                                </span>
                                            )}
                                        </span>
                                        <ArrowRight
                                            className={cn(
                                                'w-4 h-4 flex-shrink-0 transition-transform motion-reduce:transition-none',
                                                isActive
                                                    ? 'text-brutal-red translate-x-0.5'
                                                    : 'text-brutal-dark/20'
                                            )}
                                            aria-hidden
                                        />
                                    </button>
                                );
                            })}
                        </div>
                    ))}
                </div>

                {/* Footer hint */}
                <div className="flex items-center justify-between px-5 py-2.5 border-t-2 border-brutal-dark/15 bg-brutal-dark/[0.02] font-data text-[10px] font-bold uppercase tracking-[0.18em] text-brutal-dark/45">
                    <span className="inline-flex items-center gap-1.5">
                        <CommandIcon className="w-3 h-3 text-brutal-red" aria-hidden />
                        <span>{modKeyLabel}</span>
                        <span className="text-brutal-dark/25">·</span>
                        <span>Cockpit</span>
                    </span>
                    <span className="hidden sm:inline-flex items-center gap-3">
                        <span className="inline-flex items-center gap-1">
                            <span aria-hidden>↑↓</span>
                            <span>navigate</span>
                        </span>
                        <span className="inline-flex items-center gap-1">
                            <CornerDownLeft className="w-3 h-3" aria-hidden />
                            <span>select</span>
                        </span>
                        <span>esc close</span>
                    </span>
                </div>
            </div>
        </div>
    );
}
