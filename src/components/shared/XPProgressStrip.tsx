import React from 'react';
import { Zap } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { useRankAccess } from '../../lib/hooks';
import { getProgressToNextRank, getNextRank, RANK_THRESHOLDS } from '../../lib/xpEngine';
import { RANK_COLORS } from '../../lib/constants';
import { cn } from '../../lib/utils';

/**
 * Compact single-line XP progress strip for detail page headers.
 * Shows current rank, progress bar, XP numbers, and next rank.
 * Hidden entirely if the user is not authenticated.
 */
export function XPProgressStrip() {
    const { user } = useAuth();
    const { data: rankInfo } = useRankAccess();

    if (!user || !rankInfo) return null;

    const rank = rankInfo.rank || 'Curious';
    const xp = rankInfo.xp || 0;
    const nextRank = getNextRank(rank);
    const progress = getProgressToNextRank(xp, rank);
    const nextThreshold = nextRank ? RANK_THRESHOLDS[nextRank] : null;
    const rankColor = RANK_COLORS[rank as keyof typeof RANK_COLORS] || 'text-brutal-dark/60';

    return (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 min-h-[36px] py-2 px-3 bg-brutal-paper/60 border border-brutal-dark/15 rounded-lg">
            <Zap size={12} className="text-brutal-red flex-shrink-0" />
            <span className={cn('font-data text-xs font-bold', rankColor)}>
                {rank}
            </span>

            {/* Progress bar */}
            <div className="w-16 sm:w-24 flex-grow h-1 rounded-full bg-brutal-dark/10 overflow-hidden">
                <div
                    className="h-full bg-brutal-red rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                />
            </div>

            <span className="font-data text-[11px] text-brutal-dark/60 tabular-nums">
                {xp}{nextThreshold ? ` / ${nextThreshold}` : ''} XP
            </span>

            {nextRank && (
                <span className="font-data text-[11px] text-brutal-dark/40">
                    → {nextRank}
                </span>
            )}
        </div>
    );
}