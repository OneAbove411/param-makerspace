import React from 'react';
import { cn } from '../../lib/utils';
import type { LucideIcon } from 'lucide-react';

interface BrutalStatCardProps {
    /** The stat number to display prominently */
    value: number | string;
    /** Label shown below the number (e.g. "Total Items") */
    label: string;
    /** Optional Lucide icon */
    icon?: LucideIcon;
    /** Variant controls border/bg accent color */
    variant?: 'default' | 'alert' | 'success';
    /** Additional className */
    className?: string;
}

/**
 * BrutalStatCard — a Neo-Brutalist stat display card.
 *
 * Used at the top of admin dashboards to surface key metrics
 * (e.g. "47 Total Items", "3 Low Stock Alerts").
 *
 * Purely presentational — no data fetching.
 */
export function BrutalStatCard({
    value,
    label,
    icon: Icon,
    variant = 'default',
    className,
}: BrutalStatCardProps) {
    const variantStyles = {
        default: 'border-brutal-dark bg-brutal-bg',
        alert: 'border-brutal-red bg-red-50',
        success: 'border-green-600 bg-green-50',
    };

    const valueColor = {
        default: 'text-brutal-dark',
        alert: 'text-brutal-red',
        success: 'text-green-700',
    };

    return (
        <div
            className={cn(
                'border-2 p-5 shadow-[6px_6px_0_0_rgba(17,17,17,1)]',
                'hover:-translate-y-0.5 hover:-translate-x-0.5 hover:shadow-[8px_8px_0_0_rgba(17,17,17,1)]',
                'transition-all duration-200 ease-magnetic',
                variantStyles[variant],
                className
            )}
        >
            <div className="flex items-start justify-between gap-3">
                <div>
                    <div className={cn('font-heading text-4xl font-bold', valueColor[variant])}>
                        {value}
                    </div>
                    <div className="font-data text-xs uppercase tracking-wide text-brutal-dark/60 mt-1">
                        {label}
                    </div>
                </div>
                {Icon && (
                    <Icon
                        className={cn(
                            'w-6 h-6 flex-shrink-0 mt-1',
                            variant === 'alert' ? 'text-brutal-red' : 'text-brutal-dark/40'
                        )}
                    />
                )}
            </div>
        </div>
    );
}
