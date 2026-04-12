import React, { useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SidebarSearchProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    inputRef?: React.RefObject<HTMLInputElement | null>;
}

/**
 * Brutalist search input for sidebar.
 * "/" focuses the input; Cmd/Ctrl+K opens command palette (handled upstream).
 * Hints both shortcuts inline.
 */
export function SidebarSearch({ value, onChange, placeholder = 'Search…', className, inputRef: externalRef }: SidebarSearchProps) {
    const internalRef = useRef<HTMLInputElement>(null);
    const ref = externalRef || internalRef;

    // "/" shortcut to focus
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== '/') return;
            const t = e.target as HTMLElement | null;
            if (t?.tagName === 'INPUT' || t?.tagName === 'TEXTAREA' || t?.isContentEditable) return;
            e.preventDefault();
            ref.current?.focus();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [ref]);

    // Detect mac for ⌘ vs Ctrl
    const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

    return (
        <div className={cn('space-y-1.5', className)}>
            {/* Search input */}
            <div className="relative group">
                <Search
                    size={13}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-brutal-dark/35 pointer-events-none"
                    aria-hidden
                />
                <input
                    ref={ref}
                    type="search"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    aria-label={placeholder}
                    className={cn(
                        'w-full h-9 pl-8 pr-7 rounded-md',
                        'bg-transparent border-b-2 border-brutal-dark/15',
                        'font-data text-[11px] font-medium text-brutal-dark placeholder:text-brutal-dark/30 placeholder:uppercase placeholder:tracking-wider',
                        'focus:outline-none focus:border-brutal-dark/60',
                        'transition-colors duration-150',
                    )}
                />
                {value ? (
                    <button
                        type="button"
                        onClick={() => onChange('')}
                        aria-label="Clear search"
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-brutal-dark/30 hover:text-brutal-red transition-colors"
                    >
                        <X size={11} />
                    </button>
                ) : (
                    <kbd
                        aria-hidden
                        className="hidden md:inline-flex items-center absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none font-data text-[9px] font-bold text-brutal-dark/25 tracking-widest"
                    >
                        /
                    </kbd>
                )}
            </div>

            {/* Cmd+K hint */}
            <button
                type="button"
                onClick={() => {
                    // dispatch synthetic Cmd+K / Ctrl+K to trigger command palette
                    window.dispatchEvent(new KeyboardEvent('keydown', {
                        key: 'k',
                        metaKey: isMac,
                        ctrlKey: !isMac,
                        bubbles: true,
                    }));
                }}
                className="flex items-center gap-1.5 w-full text-left group/cmd"
                aria-label="Open command palette"
            >
                <span className="font-data text-[9px] uppercase tracking-[0.2em] text-brutal-dark/30 group-hover/cmd:text-brutal-dark/60 transition-colors">
                    Quick search
                </span>
                <span className="flex items-center gap-0.5 ml-auto">
                    <kbd className="inline-flex items-center justify-center font-data text-[8px] font-bold text-brutal-dark/30 group-hover/cmd:text-brutal-dark/60 bg-brutal-dark/5 group-hover/cmd:bg-brutal-dark/10 border border-brutal-dark/10 rounded px-1 py-0.5 transition-all leading-none">
                        {isMac ? '⌘' : 'Ctrl'}
                    </kbd>
                    <kbd className="inline-flex items-center justify-center font-data text-[8px] font-bold text-brutal-dark/30 group-hover/cmd:text-brutal-dark/60 bg-brutal-dark/5 group-hover/cmd:bg-brutal-dark/10 border border-brutal-dark/10 rounded px-1 py-0.5 transition-all leading-none">
                        K
                    </kbd>
                </span>
            </button>
        </div>
    );
}
