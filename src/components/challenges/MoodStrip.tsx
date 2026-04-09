import React from 'react';
import { Zap, Coffee, Sparkles, Laptop, Hammer, Leaf, type LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { ExplorerTier, ExplorerSort } from './ExplorerHubCommandBar';

// ─────────────────────────────────────────────────────────────
// Explorer Hub — Mood Strip (step-3 of the overhaul)
//
// People browsing for inspiration don't know what *tier* or *domain* they
// want — they know what *mood* they're in. ("I have a free Saturday",
// "I only have a laptop today", "I want something quick.") The mood strip
// meets them where they are: a single row of ~6 preset buttons, each of
// which applies a coordinated filter override (tier + domain + sort) in
// one click.
//
// Hard-coded presets. Zero new data. Zero schema. Zero backend.
//
// Each preset is a tuple of filter overrides. Clicking a preset applies
// the override patch on top of whatever the user already has set.
// Clicking the *same* preset again clears it back to a neutral baseline.
// The parent page owns the actual filter state; this strip is purely a
// remote-control that emits patches.
//
// Kept intentionally small — 6 presets fits on a single row at most
// widths, and > 6 starts to feel like a second filter UI competing with
// the command bar.
// ─────────────────────────────────────────────────────────────

export interface MoodPatch {
    search?: string;
    tier?: ExplorerTier;
    domain?: string;
    sort?: ExplorerSort;
}

export interface MoodPreset {
    id: string;
    label: string;
    sub: string;
    icon: LucideIcon;
    /** Filter overrides applied when this mood is activated. */
    patch: MoodPatch;
}

export const MOOD_PRESETS: MoodPreset[] = [
    {
        id: 'quick-win',
        label: 'Quick wins',
        sub: 'Short & sweet',
        icon: Zap,
        patch: { sort: 'quickest', tier: 'Tier 1' },
    },
    {
        id: 'weekend',
        label: 'Weekend dive',
        sub: 'Solver tier',
        icon: Coffee,
        patch: { tier: 'Tier 2', sort: 'newest' },
    },
    {
        id: 'first-blueprint',
        label: 'First blueprint',
        sub: 'Beginner-friendly',
        icon: Sparkles,
        patch: { tier: 'Tier 1', domain: 'All', sort: 'quickest' },
    },
    {
        id: 'laptop-only',
        label: 'Laptop only',
        sub: 'No hardware',
        icon: Laptop,
        patch: { domain: 'AI' },
    },
    {
        id: 'workshop-bay',
        label: 'Workshop bay',
        sub: 'Tools required',
        icon: Hammer,
        patch: { domain: 'Fabrication' },
    },
    {
        id: 'apex',
        label: 'Go deep',
        sub: 'Architect tier',
        icon: Leaf,
        patch: { tier: 'Tier 3', sort: 'newest' },
    },
];

export interface MoodStripProps {
    /** Currently active mood id, if any. */
    activeMoodId: string | null;
    /**
     * Called when the user clicks a mood preset. If the clicked mood is
     * already active, the parent should clear it; otherwise apply the
     * preset's patch. This component emits the raw preset id + patch so
     * the parent decides the exact state transition.
     */
    onSelectMood: (preset: MoodPreset | null) => void;
    className?: string;
}

/**
 * Horizontal row of preset mood buttons. Scrolls horizontally on narrow
 * screens so nothing wraps awkwardly. Compact (~120px tall) so it doesn't
 * eat into the feed.
 */
export function MoodStrip({ activeMoodId, onSelectMood, className }: MoodStripProps) {
    return (
        <section
            className={cn('mb-8', className)}
            aria-label="Browse by mood"
        >
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-baseline gap-3 min-w-0">
                    <h2 className="font-heading font-bold text-sm uppercase tracking-tight-heading text-brutal-dark">
                        What's the mood?
                    </h2>
                    <span className="font-data text-[10px] text-brutal-dark/40 font-bold uppercase tracking-widest truncate">
                        One click · tier + domain + sort
                    </span>
                </div>
                {activeMoodId && (
                    <button
                        type="button"
                        onClick={() => onSelectMood(null)}
                        className="font-data text-[10px] font-bold uppercase tracking-widest text-brutal-red hover:underline flex-shrink-0"
                    >
                        Clear mood
                    </button>
                )}
            </div>

            <div
                className="flex gap-3 overflow-x-auto scrollbar-thin pb-1 -mx-1 px-1"
                role="tablist"
                aria-label="Mood presets"
            >
                {MOOD_PRESETS.map((preset) => {
                    const Icon = preset.icon;
                    const active = preset.id === activeMoodId;
                    return (
                        <button
                            key={preset.id}
                            type="button"
                            role="tab"
                            aria-selected={active}
                            onClick={() => onSelectMood(active ? null : preset)}
                            className={cn(
                                'flex-shrink-0 group flex items-center gap-3 px-4 py-3 rounded-2xl border-2 text-left min-w-[180px]',
                                'transition-all duration-150 ease-out',
                                'focus:outline-none focus-visible:ring-2 focus-visible:ring-brutal-red focus-visible:ring-offset-2 focus-visible:ring-offset-brutal-bg',
                                'hover:translate-x-[-1px] hover:translate-y-[-1px] motion-reduce:hover:translate-x-0 motion-reduce:hover:translate-y-0',
                                active
                                    ? 'bg-brutal-dark text-brutal-bg border-brutal-dark shadow-[4px_4px_0_0_rgba(196,41,30,0.9)] hover:shadow-[6px_6px_0_0_rgba(196,41,30,1)]'
                                    : 'bg-brutal-bg text-brutal-dark border-brutal-dark/15 shadow-[4px_4px_0_0_rgba(196,41,30,0.15)] hover:border-brutal-red/40 hover:shadow-[6px_6px_0_0_rgba(196,41,30,0.25)]',
                            )}
                        >
                            <div
                                className={cn(
                                    'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 border',
                                    active
                                        ? 'bg-brutal-red border-brutal-red text-brutal-bg'
                                        : 'bg-brutal-red/[0.08] border-brutal-red/20 text-brutal-red',
                                )}
                            >
                                <Icon size={15} strokeWidth={2} aria-hidden />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="font-heading font-bold text-[13px] uppercase tracking-tight-heading leading-none">
                                    {preset.label}
                                </span>
                                <span
                                    className={cn(
                                        'font-data text-[10px] mt-1 uppercase tracking-wider',
                                        active ? 'text-brutal-bg/60' : 'text-brutal-dark/45',
                                    )}
                                >
                                    {preset.sub}
                                </span>
                            </div>
                        </button>
                    );
                })}
            </div>
        </section>
    );
}
