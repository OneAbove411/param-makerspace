import React from 'react';
import { cn } from '../../lib/utils';

export type SkeletonVariant = 'card' | 'line' | 'avatar' | 'banner';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: SkeletonVariant;
    /** Number of repeated skeletons (useful for line and card lists). */
    count?: number;
}

const VARIANT_STYLES: Record<SkeletonVariant, string> = {
    card: 'h-48 w-full rounded-2xl border-2 border-brutal-dark/10',
    line: 'h-4 w-full rounded-md',
    avatar: 'h-16 w-16 rounded-full',
    banner: 'h-40 w-full rounded-2xl border-2 border-brutal-dark/10',
};

/**
 * Brutalist skeleton placeholder. Used while async data loads. Reserves
 * height to prevent CLS. Respects `prefers-reduced-motion` (no shimmer).
 */
export function Skeleton({ variant = 'line', count = 1, className, ...props }: SkeletonProps) {
    const items = Array.from({ length: Math.max(1, count) });
    return (
        <>
            {items.map((_, i) => (
                <div
                    key={i}
                    role="status"
                    aria-busy="true"
                    aria-live="polite"
                    aria-label="Loading"
                    className={cn(
                        'relative overflow-hidden bg-brutal-dark/5',
                        'motion-safe:animate-pulse',
                        VARIANT_STYLES[variant],
                        className,
                    )}
                    {...props}
                />
            ))}
        </>
    );
}
