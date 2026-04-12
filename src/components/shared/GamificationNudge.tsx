import React from 'react';
import { Link } from 'react-router';
import { Sparkles, ArrowRight } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { useRankAccess } from '../../lib/hooks';
import { getProgressToNextRank, getNextRank, RANK_ORDER, XP_REWARDS } from '../../lib/xpEngine';
import { cn } from '../../lib/utils';

interface GamificationNudgeProps {
    variant?: 'sidebar' | 'mobile-bar';
}

/**
 * Gamification sidebar CTA showing XP progress and a "Post a Project" CTA.
 * Uses useAuth() + useRankAccess() for data — no new fetching.
 * Hidden for unauthenticated users (shows a "Join" CTA instead).
 */
export function GamificationNudge({ variant = 'sidebar' }: GamificationNudgeProps) {
    const { user } = useAuth();
    const { data: rankInfo } = useRankAccess();

    if (!user) {
        return (
            <Link
                to="/register"
                className={cn(
                    'block rounded-xl border-2 border-brutal-dark p-4',
                    'bg-brutal-dark text-brutal-bg',
                    'shadow-[4px_4px_0_0_theme(colors.brutal.red)]',
                    'hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_theme(colors.brutal.red)] transition-all duration-200',
                    variant === 'mobile-bar' && 'flex items-center gap-3 px-4 py-3',
                )}
            >
                <div className="flex items-center gap-2 mb-2">
                    <Sparkles size={14} className="text-brutal-red" />
                    <span className="font-heading text-sm font-bold uppercase tracking-wider">
                        Join the Makerspace
                    </span>
                </div>
                <p className="font-data text-xs text-brutal-bg/60">
                    Create an account to start earning XP.
                </p>
            </Link>
        );
    }

    const rank = rankInfo?.rank || 'Curious';
    const xp = rankInfo?.xp || 0;
    const nextRank = getNextRank(rank);
    const progress = getProgressToNextRank(xp, rank);
    // Use actual XP reward from constants
    const xpReward = XP_REWARDS.project_approved;

    if (variant === 'mobile-bar') {
        return (
            <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 px-4 pb-[calc(env(safe-area-inset-bottom)+8px)] pt-2 bg-gradient-to-t from-brutal-bg via-brutal-bg/95 to-transparent pointer-events-none">
                <Link
                    to="/dashboard"
                    className="pointer-events-auto flex items-center gap-3 w-full bg-brutal-dark text-brutal-bg font-data text-xs font-bold uppercase tracking-wider px-4 py-3 rounded-full border-2 border-brutal-dark shadow-[3px_3px_0_0_rgba(196,41,30,0.4)]"
                >
                    <Sparkles size={14} className="text-brutal-red flex-shrink-0" />
                    <span className="flex-1 min-w-0 truncate">
                        Post a project — earn +{xpReward} XP
                    </span>
                    <ArrowRight size={12} />
                </Link>
            </div>
        );
    }

    return (
        <div
            className={cn(
                'rounded-xl border-2 border-brutal-dark p-4',
                'bg-brutal-dark text-brutal-bg',
                'shadow-[4px_4px_0_0_theme(colors.brutal.red)]',
            )}
        >
            <div className="flex items-center gap-2 mb-3">
                <Sparkles size={14} className="text-brutal-red" />
                <span className="font-heading text-sm font-bold uppercase tracking-wider">
                    Share Your Build
                </span>
            </div>

            <p className="font-data text-xs text-brutal-bg/70 mb-3">
                Earn +{xpReward} XP toward your next badge.
            </p>

            {/* XP progress bar */}
            <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                    <span className="font-data text-[10px] font-bold text-brutal-red">
                        {rank}
                    </span>
                    <span className="font-data text-[10px] text-brutal-bg/80 tabular-nums">
                        {progress}%
                    </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-brutal-bg/20 overflow-hidden">
                    <div
                        className="h-full bg-brutal-red rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                    />
                </div>
                {nextRank && (
                    <p className="font-data text-[10px] text-brutal-bg/70 mt-1">
                        {rank} → {nextRank}
                    </p>
                )}
            </div>

            <Link
                to="/dashboard"
                className="flex items-center justify-center gap-2 w-full bg-brutal-red text-brutal-bg font-heading text-xs font-bold uppercase tracking-widest py-2.5 rounded-lg hover:brightness-110 transition-all"
            >
                Post a Project <ArrowRight size={12} />
            </Link>
        </div>
    );
}
