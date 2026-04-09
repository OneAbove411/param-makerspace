import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

/**
 * AtAGlanceStrip — the 4-stat row that lives at the bottom of the project
 * hero info card on both ProjectDetails and EditProject.
 *
 * Matches the original markup exactly:
 *   <div className="mt-6 pt-5 border-t border-brutal-dark/8 grid grid-cols-2
 *                   sm:grid-cols-4 gap-4" aria-label="Project at a glance">
 *
 * Each stat renders a uppercase tracking-widest label over a heading-weight
 * value. The value can be a string/number OR an arbitrary ReactNode so callers
 * can embed icons / secondary counts / status-dependent colour classes.
 */
export interface AtAGlanceStat {
    /** Short uppercase label above the value (e.g. "Status", "Progress"). */
    label: string;
    /** Primary value. String/number renders with default styling; a ReactNode
     *  lets the caller own colour and inline icons. */
    value: ReactNode;
    /** Optional key if callers render the stats from a dynamic source. */
    key?: string;
}

export interface AtAGlanceStripProps {
    stats: AtAGlanceStat[];
    /** Optional extra class on the outer grid (e.g. GSAP stagger hooks). */
    className?: string;
    /** Accessible label for the group. */
    ariaLabel?: string;
}

const VALUE_CLS =
    'font-heading font-bold text-sm uppercase tracking-tight-heading text-brutal-dark';
const LABEL_CLS =
    'font-data text-[9px] text-brutal-dark/40 font-bold uppercase tracking-widest mb-0.5';

export function AtAGlanceStrip({
    stats,
    className,
    ariaLabel = 'Project at a glance',
}: AtAGlanceStripProps) {
    return (
        <div
            className={cn(
                'mt-6 pt-5 border-t border-brutal-dark/8 grid grid-cols-2 sm:grid-cols-4 gap-4',
                className,
            )}
            aria-label={ariaLabel}
        >
            {stats.map((stat, i) => (
                <div key={stat.key ?? `${stat.label}-${i}`}>
                    <div className={LABEL_CLS}>{stat.label}</div>
                    {typeof stat.value === 'string' || typeof stat.value === 'number' ? (
                        <div className={VALUE_CLS}>{stat.value}</div>
                    ) : (
                        stat.value
                    )}
                </div>
            ))}
        </div>
    );
}

/**
 * Re-export the stat value classes so callers that need to wrap their own
 * JSX (e.g. to apply a conditional text-green-700 colour to the status) can
 * still match the default visual weight exactly.
 */
export const atAGlanceStatClasses = {
    value: VALUE_CLS,
    label: LABEL_CLS,
};
