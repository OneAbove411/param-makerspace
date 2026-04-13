import React from 'react';
import { Link } from 'react-router';
import { ArrowRight, Zap, UserCheck, RefreshCcw, Calendar, FileEdit, Compass } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { canAccess } from '../../lib/rankAccess';
import { XP_REWARDS } from '../../lib/constants';

/**
 * §7 F-307 — "Next Best Action" strip.
 *
 * Dashboard research (Databox, AchieveIt, GoodData, Cluster, UXPin) is
 * unanimous: an actionable dashboard must lead with *one* clear next
 * step, not a grid of counters. This component picks ONE action per
 * render based on the user's current state, using a priority ladder:
 *
 *   1. Resubmit a rejected project (urgent, user is already invested)
 *   2. Pick up a draft project (recover abandoned work, Zeigarnik)
 *   3. Complete your profile (unlocks +50 XP and visibility)
 *   4. If locked out of create_project → complete a Tier 1 challenge
 *      (the gamification unlock path)
 *   5. RSVP to the next event you have not joined
 *   6. Fallback: browse challenges (exploration)
 *
 * Brutalist rules honored:
 *   - Exactly one red accent per render.
 *   - `font-drama` italic serif for the action headline.
 *   - `font-data` mono for metadata.
 *   - No generic SaaS copy.
 *   - Honors `prefers-reduced-motion` (no animation on this card —
 *     the GSAP section entrance from Dashboard.tsx handles motion).
 */

export interface NextBestActionInput {
    profileComplete: boolean;
    hasRejectedProject: { id: string; title: string } | null;
    hasDraftProject: { id: string; title: string } | null;
    currentRank: string;
    currentXP: number;
    completedChallenges: number;
    upcomingEvents: number;
    loading: boolean;
}

interface Action {
    eyebrow: string;
    headline: string;
    sub: string;
    ctaLabel: string;
    to: string;
    Icon: LucideIcon;
}

function pickAction(input: NextBestActionInput): Action {
    const {
        hasRejectedProject,
        hasDraftProject,
        profileComplete,
        currentRank,
        currentXP,
        completedChallenges,
        upcomingEvents,
    } = input;

    // XP delta to Tinkerer (the rank that unlocks project proposals)
    const tinkererThreshold = 60;
    const xpToTinkerer = Math.max(0, tinkererThreshold - currentXP);

    if (hasRejectedProject) {
        return {
            eyebrow: 'Needs you',
            headline: 'Resubmit your rejected project.',
            sub: `"${hasRejectedProject.title}" is waiting on your edits.`,
            ctaLabel: 'Open editor',
            to: `/projects/${hasRejectedProject.id}/edit`,
            Icon: RefreshCcw,
        };
    }

    if (hasDraftProject) {
        return {
            eyebrow: 'Pick up where you left off',
            headline: 'Finish your draft.',
            sub: `"${hasDraftProject.title}" is still unpublished.`,
            ctaLabel: 'Continue building',
            to: `/projects/${hasDraftProject.id}/edit`,
            Icon: FileEdit,
        };
    }

    // If locked out of create_project AND profile incomplete → profile is the fastest path
    if (!canAccess(currentRank, 'create_project') && !profileComplete) {
        return {
            eyebrow: 'Quick unlock',
            headline: 'Complete your profile to unlock Propose Project.',
            sub: `Your profile earns +${XP_REWARDS.profile_completed} XP. ${xpToTinkerer > 0 ? `You're ${xpToTinkerer} XP away from Tinkerer rank.` : 'Propose Project key awaits.'}`,
            ctaLabel: 'Complete profile',
            to: '/profile-setup',
            Icon: UserCheck,
        };
    }

    // Profile incomplete but NOT locked out → still nudge toward profile for the free XP
    if (!profileComplete) {
        return {
            eyebrow: 'Unlock the lab',
            headline: 'Finish your profile. Claim +50 XP.',
            sub: 'Bio, avatar, and a social link — two minutes, free XP.',
            ctaLabel: 'Complete profile',
            to: '/profile-setup',
            Icon: UserCheck,
        };
    }

    // Locked out of create_project but profile IS complete → challenge path
    if (!canAccess(currentRank, 'create_project')) {
        return {
            eyebrow: 'Your unlock path',
            headline: 'Beat a Tier 1 challenge.',
            sub: `One clean Tier 1 earns you +${XP_REWARDS.tier1_challenge} XP. ${xpToTinkerer > 0 ? `${xpToTinkerer} XP to Tinkerer.` : 'Propose Project key awaits.'}`,
            ctaLabel: 'Browse Tier 1',
            to: '/challenges?tier=Tier+1',
            Icon: Zap,
        };
    }

    if (upcomingEvents === 0) {
        return {
            eyebrow: 'The lab is open',
            headline: 'RSVP to something live.',
            sub: `Events are where drafts become projects. +${XP_REWARDS.event_registered} XP on registration, +${XP_REWARDS.event_presented} XP if you present.`,
            ctaLabel: 'See events',
            to: '/events',
            Icon: Calendar,
        };
    }

    return {
        eyebrow: 'Keep moving',
        headline: 'Find your next challenge.',
        sub: `Tier 1 → +${XP_REWARDS.tier1_challenge} XP · Tier 2 → +${XP_REWARDS.tier2_challenge} XP · Tier 3 → +${XP_REWARDS.tier3_challenge} XP`,
        ctaLabel: 'Browse challenges',
        to: '/challenges',
        Icon: Compass,
    };
}

export function NextBestAction(props: NextBestActionInput) {
    if (props.loading) {
        // Reserve height to kill CLS while we wait for profile/projects/stats.
        return (
            <div
                role="status"
                aria-busy="true"
                aria-label="Loading your next best action"
                className="relative overflow-hidden bg-brutal-dark/5 motion-safe:animate-pulse h-[148px] w-full rounded-2xl border-2 border-brutal-dark/10"
            />
        );
    }

    const action = pickAction(props);
    const { Icon } = action;

    return (
        <Link
            to={action.to}
            aria-label={`${action.headline} ${action.sub}`}
            className="group block w-full h-full rounded-2xl border-2 border-brutal-dark bg-brutal-dark text-brutal-bg p-5 sm:p-6 md:p-7 shadow-[6px_6px_0_0_rgba(196,41,30,0.9)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0_0_rgba(196,41,30,1)] transition-transform duration-200 ease-out motion-reduce:hover:translate-x-0 motion-reduce:hover:translate-y-0 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brutal-red"
        >
            {/*
                Layout strategy:
                - On mobile (< md): vertical stack — eyebrow + icon on row 1,
                  headline gets full width, sub gets full width, CTA gets full
                  width as a real button-looking pill. The icon is shown
                  inline with the eyebrow so it stays visible without stealing
                  horizontal space from the headline.
                - On md+: original horizontal layout — icon left, text middle,
                  CTA right.
            */}

            {/* MOBILE layout */}
            <div className="md:hidden flex flex-col h-full">
                <div className="flex items-center gap-3 mb-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-brutal-red flex items-center justify-center border-2 border-brutal-bg">
                        <Icon className="w-5 h-5 text-brutal-bg" aria-hidden="true" strokeWidth={2} />
                    </div>
                    <div className="font-data text-[10px] text-brutal-bg/55 uppercase tracking-widest font-bold truncate">
                        {action.eyebrow}
                    </div>
                </div>
                <div className="font-drama italic text-[26px] leading-[1.1] text-brutal-bg mb-2 break-words">
                    {action.headline}
                </div>
                <div className="font-data text-xs text-brutal-bg/70 mb-4 break-words">
                    {action.sub}
                </div>
                <div className="mt-auto">
                    <span className="inline-flex w-full sm:w-auto items-center justify-center gap-2 font-data text-xs font-bold uppercase tracking-widest text-brutal-bg bg-brutal-red border-2 border-brutal-bg px-4 py-2.5 rounded">
                        <span>{action.ctaLabel}</span>
                        <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </span>
                </div>
            </div>

            {/* DESKTOP layout (md+) */}
            <div className="hidden md:flex items-center gap-6 h-full">
                <div className="flex-shrink-0 w-14 h-14 rounded-full bg-brutal-red flex items-center justify-center border-2 border-brutal-bg">
                    <Icon className="w-7 h-7 text-brutal-bg" aria-hidden="true" strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="font-data text-xs text-brutal-bg/50 uppercase tracking-widest font-bold mb-1">
                        {action.eyebrow}
                    </div>
                    <div className="font-drama italic text-[32px] leading-[1.1] text-brutal-bg mb-1.5">
                        {action.headline}
                    </div>
                    <div className="font-data text-sm text-brutal-bg/70">
                        {action.sub}
                    </div>
                </div>
                <div className="flex-shrink-0 flex items-center gap-2 font-data text-xs font-bold uppercase tracking-widest text-brutal-bg/80 group-hover:text-brutal-bg">
                    <span>{action.ctaLabel}</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" aria-hidden="true" />
                </div>
            </div>
        </Link>
    );
}
