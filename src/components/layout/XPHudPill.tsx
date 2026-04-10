import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { gsap } from 'gsap';
import { Zap } from 'lucide-react';
import { cn } from '../../lib/utils';
import {
    RANK_THRESHOLDS,
    getNextRank,
    getXPForNextRank,
    getProgressToNextRank,
} from '../../lib/xpEngine';

/**
 * XPHudPill — Layer3-inspired gamification HUD that lives INSIDE the navbar.
 *
 * Replaces the old secondary status bar (LoggedInBand). Renders only for
 * authenticated users. Shows current rank, XP, and a thin progress bar to
 * the next rank. Hover expands to reveal "X XP to {NextRank}" tooltip.
 *
 * Theme-aware: when over the dark hero (onDark=true) it uses translucent
 * brutal-bg surfaces; otherwise it uses translucent brutal-dark.
 */

interface XPHudPillProps {
    rank: string;
    xp: number;
    onDark: boolean;
}

export function XPHudPill({ rank, xp, onDark }: XPHudPillProps) {
    const [hovered, setHovered] = useState(false);
    const barRef = useRef<HTMLDivElement>(null);
    const fillRef = useRef<HTMLDivElement>(null);

    const nextRank = getNextRank(rank);
    const nextXP = getXPForNextRank(rank);
    const progress = getProgressToNextRank(xp, rank);
    const xpToNext = nextXP !== null ? Math.max(0, nextXP - xp) : 0;
    const isMaxed = nextRank === null;

    // Animate fill width on mount + when xp changes
    useEffect(() => {
        if (!fillRef.current) return;
        gsap.fromTo(
            fillRef.current,
            { width: '0%' },
            { width: `${progress}%`, duration: 1.1, ease: 'power3.out', delay: 0.25 }
        );
    }, [progress]);

    return (
        <Link
            to="/dashboard"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className={cn(
                'group/hud hidden md:flex items-center gap-2.5 pl-3 pr-3.5 py-1.5 rounded-full',
                'border transition-all duration-300 will-change-transform',
                'hover:-translate-y-px',
                onDark
                    ? 'bg-brutal-bg/8 border-brutal-bg/12 hover:bg-brutal-bg/12 hover:border-brutal-red/40'
                    : 'bg-brutal-dark/5 border-brutal-dark/10 hover:bg-brutal-dark/8 hover:border-brutal-red/40'
            )}
            aria-label={`Rank ${rank}, ${xp} XP`}
        >
            {/* Rank icon dot */}
            <span
                className={cn(
                    'flex items-center justify-center w-4 h-4 rounded-full flex-shrink-0',
                    'bg-brutal-red/15'
                )}
            >
                <Zap size={9} className="text-brutal-red" strokeWidth={3} />
            </span>

            {/* Rank label */}
            <span
                className={cn(
                    'font-data text-[10px] font-bold uppercase tracking-wider whitespace-nowrap',
                    onDark ? 'text-brutal-bg' : 'text-brutal-dark'
                )}
            >
                {rank}
            </span>

            {/* Progress bar — expands on hover */}
            <div
                ref={barRef}
                className={cn(
                    'h-1 rounded-full overflow-hidden flex-shrink-0 transition-all duration-500',
                    hovered ? 'w-24' : 'w-14',
                    onDark ? 'bg-brutal-bg/15' : 'bg-brutal-dark/10'
                )}
            >
                <div
                    ref={fillRef}
                    className="h-full bg-gradient-to-r from-brutal-red to-brutal-red/70 rounded-full"
                    style={{ width: `${progress}%` }}
                />
            </div>

            {/* XP counter — always visible */}
            <span
                className={cn(
                    'font-data text-[10px] font-bold tabular-nums whitespace-nowrap',
                    onDark ? 'text-brutal-bg/60' : 'text-brutal-dark/55'
                )}
            >
                {xp.toLocaleString()}
                <span className="opacity-50"> XP</span>
            </span>

            {/* Hover micro-interaction — slides in from right on hover */}
            <span
                className={cn(
                    'font-data text-[9px] font-bold uppercase tracking-wider whitespace-nowrap',
                    'overflow-hidden transition-all duration-500',
                    hovered ? 'max-w-[140px] opacity-100 ml-0.5' : 'max-w-0 opacity-0',
                    'text-brutal-red'
                )}
            >
                {isMaxed ? 'Max Rank' : `+${xpToNext} → ${nextRank}`}
            </span>
        </Link>
    );
}
