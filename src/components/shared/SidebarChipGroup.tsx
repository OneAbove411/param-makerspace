import React from 'react';
import { cn } from '../../lib/utils';

export interface ChipOption {
    value: string;
    label: string;
    count: number;
}

interface SidebarChipGroupProps {
    label: string;
    options: ChipOption[];
    selected: string[];
    onChange: (next: string[]) => void;
    /** If true, acts as single-select instead of multi-select */
    singleSelect?: boolean;
}

/**
 * Vertical multi-select chip group for sidebar.
 * Hides entirely if all options have count === 0.
 */
export function SidebarChipGroup({ label, options, selected, onChange, singleSelect }: SidebarChipGroupProps) {
    const visible = options.filter((o) => o.count > 0);
    if (visible.length === 0) return null;

    const toggle = (value: string) => {
        if (singleSelect) {
            onChange(selected.includes(value) ? [] : [value]);
            return;
        }
        if (selected.includes(value)) {
            onChange(selected.filter((v) => v !== value));
        } else {
            onChange([...selected, value]);
        }
    };

    return (
        <div>
            <h3 className="font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/50 mb-2">
                {label}
            </h3>
            <div className="flex flex-wrap gap-1.5">
                {visible.map((opt) => {
                    const active = selected.includes(opt.value);
                    return (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => toggle(opt.value)}
                            className={cn(
                                'flex items-center gap-1.5 h-7 px-2.5 rounded-lg border font-data text-[10px] font-bold uppercase tracking-wider',
                                'transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brutal-red focus-visible:ring-offset-1 focus-visible:ring-offset-brutal-bg',
                                active
                                    ? 'bg-brutal-red text-brutal-bg border-brutal-red'
                                    : 'bg-transparent text-brutal-dark/60 border-brutal-dark/15 hover:text-brutal-red hover:border-brutal-red/40',
                            )}
                        >
                            {opt.label}
                            <span
                                className={cn(
                                    'text-[9px] tabular-nums',
                                    active ? 'text-brutal-bg/70' : 'text-brutal-dark/35',
                                )}
                            >
                                {opt.count}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
