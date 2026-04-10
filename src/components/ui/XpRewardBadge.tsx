import React from 'react';
import { Zap } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * XP Reward Badge — displays the XP amount a user can earn for an action.
 *
 * Two variants:
 *   • 'pill'  — compact inline pill for cards and lists (default)
 *   • 'card'  — sidebar card with label and description
 *
 * Uses the brutalist palette: brutal-red accent, font-data typography.
 */

interface XpRewardBadgeProps {
    amount: number;
    variant?: 'pill' | 'card';
    /** Optional label shown in card variant, e.g. "Complete this challenge" */
    label?: string;
    /** Optional secondary line for card variant */
    description?: string;
    className?: string;
}

export function XpRewardBadge({
    amount,
    variant = 'pill',
    label,
    description,
    className,
}: XpRewardBadgeProps) {
    if (variant === 'card') {
        return (
            <div className={cn(
                'rounded-2xl border-2 border-brutal-red/15 bg-brutal-red/[0.04] p-4',
                className,
            )}>
                <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-6 h-6 rounded-lg bg-brutal-red/10 flex items-center justify-center">
                        <Zap size={12} className="text-brutal-red" />
                    </div>
                    <span className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-dark/45">
                        {label || 'XP Reward'}
                    </span>
                </div>
                <div className="flex items-baseline gap-1.5">
                    <span className="font-heading font-bold text-2xl text-brutal-red">+{amount}</span>
                    <span className="font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/40">XP</span>
                </div>
                {description && (
                    <p className="font-data text-[10px] text-brutal-dark/50 leading-relaxed mt-1.5">
                        {description}
                    </p>
                )}
            </div>
        );
    }

    // Pill variant — compact inline badge
    return (
        <span className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full',
            'bg-brutal-red/10 text-brutal-red',
            'font-data text-[9px] font-bold uppercase tracking-wider',
            className,
        )}>
            <Zap size={9} className="fill-brutal-red" />
            +{amount} XP
        </span>
    );
}
