import React from 'react';
import { cn } from '../../lib/utils';
import { MOOD_PRESETS, type MoodPreset } from '../challenges/MoodStrip';

interface SidebarMoodPresetsProps {
    active: string | null;
    onSelect: (preset: MoodPreset | null) => void;
}

/**
 * Vertical mood pill stack for the Challenges sidebar.
 * Renders the same MOOD_PRESETS data as the original horizontal MoodStrip
 * but in a compact vertical layout for sidebar context.
 */
export function SidebarMoodPresets({ active, onSelect }: SidebarMoodPresetsProps) {
    return (
        <div>
            <div className="flex items-center justify-between mb-2">
                <h3 className="font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/50">
                    Mood
                </h3>
                {active && (
                    <button
                        type="button"
                        onClick={() => onSelect(null)}
                        className="font-data text-[9px] font-bold uppercase tracking-wider text-brutal-red hover:underline"
                    >
                        Clear
                    </button>
                )}
            </div>
            <div className="flex flex-col gap-1.5">
                {MOOD_PRESETS.map((preset) => {
                    const Icon = preset.icon;
                    const isActive = preset.id === active;
                    return (
                        <button
                            key={preset.id}
                            type="button"
                            onClick={() => onSelect(isActive ? null : preset)}
                            className={cn(
                                'flex items-center gap-2.5 px-3 py-2 rounded-lg border text-left',
                                'transition-all duration-150',
                                'focus:outline-none focus-visible:ring-2 focus-visible:ring-brutal-red',
                                isActive
                                    ? 'bg-brutal-dark text-brutal-bg border-brutal-dark shadow-[3px_3px_0_0_rgba(196,41,30,0.4)]'
                                    : 'bg-transparent text-brutal-dark border-brutal-dark/10 hover:border-brutal-red/30',
                            )}
                        >
                            <Icon
                                size={14}
                                className={cn(
                                    'flex-shrink-0',
                                    isActive ? 'text-brutal-bg/80' : 'text-brutal-red',
                                )}
                            />
                            <div className="flex flex-col min-w-0">
                                <span className="font-heading font-bold text-[11px] uppercase tracking-tight-heading leading-none truncate">
                                    {preset.label}
                                </span>
                                <span
                                    className={cn(
                                        'font-data text-[9px] uppercase tracking-wider mt-0.5',
                                        isActive ? 'text-brutal-bg/50' : 'text-brutal-dark/40',
                                    )}
                                >
                                    {preset.sub}
                                </span>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
