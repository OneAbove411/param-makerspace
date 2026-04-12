import React from 'react';
import { Compass, Wrench, Cpu, type LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { ExplorerTier } from './ExplorerHubCommandBar';

// ─────────────────────────────────────────────────────────────
// Explorer Hub — TierPathway (polish pass).
//
// The old Challenges page had a big 3-card "Access Tiers" section
// that told users what Tier 1 / Tier 2 / Tier 3 meant (Explorer /
// Solver / Architect) and let them click to filter. We compressed
// that into a dropdown inside the command bar, which made the
// information *technically* accessible but *practically* invisible
// to first-time visitors.
//
// TierPathway brings the mapping back as a compact horizontal
// strip — three small brutalist cards showing icon + tier number +
// archetype name + one-line subtitle. Clicking a card toggles that
// tier's filter, same as clicking the equivalent entry in the
// command bar dropdown. Clicking the already-active tier clears it.
//
// Design intent: informational first, filter second. The strip
// should teach the user what tiers mean even if they never click
// it. That's why every card always shows its subtitle — it's not
// a filter control pretending to be a label, it's a label that
// also happens to filter.
// ─────────────────────────────────────────────────────────────

interface TierInfo {
    id: Extract<ExplorerTier, 'Tier 1' | 'Tier 2' | 'Tier 3'>;
    number: 1 | 2 | 3;
    name: string;
    subtitle: string;
    icon: LucideIcon;
}

const TIER_PATHWAY: TierInfo[] = [
    {
        id: 'Tier 1',
        number: 1,
        name: 'Explorer',
        subtitle: 'Fundamentals & core principles',
        icon: Compass,
    },
    {
        id: 'Tier 2',
        number: 2,
        name: 'Solver',
        subtitle: 'Integration & cross-platform builds',
        icon: Wrench,
    },
    {
        id: 'Tier 3',
        number: 3,
        name: 'Architect',
        subtitle: 'Systems design & scale',
        icon: Cpu,
    },
];

export interface TierPathwayProps {
    activeTier: ExplorerTier;
    onTierChange: (next: ExplorerTier) => void;
    className?: string;
}

export function TierPathway({ activeTier, onTierChange, className }: TierPathwayProps) {
    return (
        <section className={cn('mb-8', className)} aria-label="Access tiers">
            <div className="flex items-baseline gap-3 mb-3">
                <h2 className="font-heading font-bold text-sm uppercase tracking-tight-heading text-brutal-dark">
                    Access Tiers
                </h2>
                <span className="font-data text-[10px] text-brutal-dark/40 font-bold uppercase tracking-wider truncate">
                    Click a tier to focus · Explorer → Architect
                </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {TIER_PATHWAY.map((t) => {
                    const Icon = t.icon;
                    const active = activeTier === t.id;
                    return (
                        <button
                            key={t.id}
                            type="button"
                            aria-pressed={active}
                            onClick={() => onTierChange(active ? 'All' : t.id)}
                            className={cn(
                                'group relative text-left p-4 rounded-2xl border-2 overflow-hidden',
                                'transition-all duration-150 ease-out',
                                'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                                active
                                    ? 'focus-visible:ring-brutal-bg focus-visible:ring-offset-brutal-bg'
                                    : 'focus-visible:ring-brutal-red focus-visible:ring-offset-brutal-bg',
                                'hover:translate-x-[-1px] hover:translate-y-[-1px] motion-reduce:hover:translate-x-0 motion-reduce:hover:translate-y-0',
                                active
                                    ? 'bg-brutal-dark text-brutal-bg border-brutal-dark shadow-[4px_4px_0_0_rgba(196,41,30,0.9)] hover:shadow-[6px_6px_0_0_rgba(196,41,30,1)]'
                                    : 'bg-brutal-bg text-brutal-dark border-brutal-dark/15 shadow-[4px_4px_0_0_rgba(196,41,30,0.15)] hover:border-brutal-red/40 hover:shadow-[6px_6px_0_0_rgba(196,41,30,0.25)]',
                            )}
                        >
                            {/* Big faint tier number as a background mark —
                                instantly identifies 1/2/3 at a glance. */}
                            <span
                                className={cn(
                                    'absolute -right-2 -bottom-4 font-heading font-bold text-[88px] leading-none select-none pointer-events-none',
                                    active ? 'text-brutal-bg/[0.06]' : 'text-brutal-dark/[0.05]',
                                )}
                                aria-hidden
                            >
                                {t.number}
                            </span>

                            <div className="relative flex items-center gap-3 mb-2">
                                <div
                                    className={cn(
                                        'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 border-2',
                                        active
                                            ? 'bg-brutal-red border-brutal-red text-brutal-bg'
                                            : 'bg-brutal-red/[0.08] border-brutal-red/20 text-brutal-red',
                                    )}
                                >
                                    <Icon size={16} strokeWidth={2} aria-hidden />
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span
                                        className={cn(
                                            'font-data text-[10px] font-bold uppercase tracking-wider',
                                            active ? 'text-brutal-bg/60' : 'text-brutal-red',
                                        )}
                                    >
                                        Tier {t.number}
                                    </span>
                                    <span className="font-heading font-bold text-lg uppercase tracking-tight-heading leading-none">
                                        {t.name}
                                    </span>
                                </div>
                            </div>
                            <p
                                className={cn(
                                    'relative font-data text-[11px] leading-relaxed',
                                    active ? 'text-brutal-bg/70' : 'text-brutal-dark/55',
                                )}
                            >
                                {t.subtitle}
                            </p>
                        </button>
                    );
                })}
            </div>
        </section>
    );
}
