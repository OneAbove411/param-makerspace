import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

/**
 * SectionHeader — the two header patterns used throughout ProjectDetails &
 * EditProject main-column sections.
 *
 * Two variants:
 *
 * • `plain` (default) — a compact `<h2>` header matching the original
 *   "Description" / "Discussion" sections on ProjectDetails:
 *
 *     <h2 className="font-heading font-bold text-lg uppercase tracking-tight-heading mb-1">
 *     <div className="w-full h-px bg-brutal-dark/10 mb-5" />
 *
 * • `drama` — the tall red-eyebrow + drama-italic heading used for Specs /
 *   Milestones / Core, including support for a right-aligned slot (e.g. the
 *   "3/5 Done" counter):
 *
 *     <span className="font-data text-[10px] text-brutal-red ... block mb-2">{eyebrow}</span>
 *     <h3 className="font-drama italic text-3xl md:text-4xl ...">{title}</h3>
 *
 * Both variants render the matching 1px hairline below the header.
 */
export interface SectionHeaderProps {
    /** Red uppercase eyebrow shown above drama titles. */
    eyebrow?: string;
    /** The main heading text. */
    title: ReactNode;
    /** Right-side slot (e.g. "3/5 Done" counter, comment count). */
    rightSlot?: ReactNode;
    /** Visual variant — see top of file. */
    variant?: 'plain' | 'drama';
    /** Heading level. Defaults to h2 for `plain`, h3 for `drama` (matching the
     *  original markup). Override if you need a different level. */
    as?: 'h1' | 'h2' | 'h3' | 'h4';
    /** Extra class on the outer wrapper (e.g. GSAP stagger hook). */
    className?: string;
    /** Bottom margin before the next content element. Default `mb-5`. */
    hairlineMarginClass?: string;
    /** Suppress the 1px bottom hairline (used on Milestones where a progress
     *  bar sits directly below the heading instead). */
    hideHairline?: boolean;
    /** Extra margin on the heading row itself (defaults `mb-1`, but drama
     *  sections in ProjectDetails use `mb-8` when the hairline is hidden). */
    headingRowMarginClass?: string;
}

export function SectionHeader({
    eyebrow,
    title,
    rightSlot,
    variant = 'plain',
    as,
    className,
    hairlineMarginClass = 'mb-5',
    hideHairline = false,
    headingRowMarginClass,
}: SectionHeaderProps) {
    if (variant === 'drama') {
        const Heading = (as ?? 'h3') as any;
        const rowMargin = headingRowMarginClass ?? (hideHairline ? 'mb-8' : 'mb-1');
        return (
            <div className={className}>
                <div className={cn('flex items-end justify-between', rowMargin)}>
                    <div>
                        {eyebrow && (
                            <span className="font-data text-[10px] text-brutal-red font-bold uppercase tracking-[0.2em] block mb-2">
                                {eyebrow}
                            </span>
                        )}
                        <Heading className="font-drama italic text-3xl md:text-4xl text-brutal-dark">
                            {title}
                        </Heading>
                    </div>
                    {rightSlot && (
                        <span className="font-data text-xs text-brutal-dark/40 font-bold uppercase tracking-widest">
                            {rightSlot}
                        </span>
                    )}
                </div>
                {!hideHairline && (
                    <div className={cn('w-full h-px bg-brutal-dark/10', hairlineMarginClass)} />
                )}
            </div>
        );
    }

    // plain variant
    const Heading = (as ?? 'h2') as any;
    const rowMargin = headingRowMarginClass ?? 'mb-1';
    return (
        <div className={className}>
            <div className={cn('flex items-center justify-between', rowMargin)}>
                <Heading className="font-heading font-bold text-lg uppercase tracking-tight-heading">
                    {title}
                </Heading>
                {rightSlot && (
                    <span className="font-data text-xs text-brutal-dark/40 font-bold">
                        {rightSlot}
                    </span>
                )}
            </div>
            {!hideHairline && (
                <div className={cn('w-full h-px bg-brutal-dark/10', hairlineMarginClass)} />
            )}
        </div>
    );
}
