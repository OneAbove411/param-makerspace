import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Sparkles, ArrowRight, Mic2, CalendarClock, Clock } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { useRankAccess } from '../../lib/hooks';
import { getProgressToNextRank, getNextRank } from '../../lib/xpEngine';
import { XP_REWARDS } from '../../lib/constants';
import { cn } from '../../lib/utils';
import type { Event } from '../../lib/database.types';

// ─────────────────────────────────────────────────────────────
// EventsSidebarNudge — Events-page specific replacement for
// GamificationNudge.
//
// Why this exists:
//   The shared GamificationNudge promotes "Post a Project" which
//   is contextually wrong on /events — visitors here want to
//   *attend*, *RSVP*, or *speak*, not post a project. We keep
//   GamificationNudge untouched for /projects and /challenges
//   where "Post a Project" IS the correct next action, and use
//   this component only on Events.
//
// Content rail (top → bottom):
//   1. "Next Up" mini-card — points to the soonest upcoming event
//      with a live countdown. Data is already computed upstream
//      in Events.tsx (split.upcoming[0]) so no extra fetching.
//   2. For signed-in users, rank + XP progress bar, reframed to
//      highlight event_registered XP instead of project_approved.
//   3. For signed-out users, a "Join the Makerspace" card
//      mirroring the shared nudge's unauth branch so new visitors
//      still have a clear onboarding affordance.
//
// (The "Propose a talk" CTA was removed from the sidebar; users
// can still reach /speak via the footer link or the speaker-pitch
// CTA on individual event-detail pages.)
// ─────────────────────────────────────────────────────────────

type EventListItem = Event & { registration_count: number };

interface EventsSidebarNudgeProps {
    variant?: 'sidebar' | 'mobile-bar';
    /** The soonest upcoming event (split.upcoming[0] from Events.tsx). Can be null when nothing is upcoming. */
    nextEvent?: EventListItem | null;
}

/** Compact countdown label — matches EventCard's countdownLabel style.
 *  Returns null when dateStr is missing or the event is already in the past. */
function shortCountdown(dateStr: string | undefined): string | null {
    if (!dateStr) return null;
    const diff = new Date(dateStr).getTime() - Date.now();
    if (diff <= 0) return null;
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Tmrw';
    if (days <= 30) return `${days}d`;
    return `${Math.round(days / 7)}w`;
}

/** Re-compute "time from now" every 30s so the label doesn't go stale on a long-open tab.
 *  We only call setState from the interval callback (an external-system tick),
 *  never synchronously inside the effect body — that would trigger the
 *  react-hooks/set-state-in-effect lint rule. The initial value is seeded
 *  via useState's lazy initializer, and dateStr changes are handled by
 *  keying the useState via a parallel `pinnedDate` — when dateStr changes,
 *  the first interval tick (or immediate re-render via the key) catches up. */
function useCountdownLabel(dateStr: string | undefined): string | null {
    // Lazy initializer + keying on dateStr: when dateStr changes, React
    // re-runs the initializer via a remount. We achieve this by computing
    // the label once per dateStr using useMemo-equivalent semantics, then
    // patching it forward on a timer from inside the effect callback only.
    const [tick, setTick] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setTick(t => t + 1), 30_000);
        return () => clearInterval(id);
    }, []);
    // `tick` is referenced so React knows this value depends on the timer;
    // the actual value is derived purely from dateStr + current time.
    void tick;
    return shortCountdown(dateStr);
}

export function EventsSidebarNudge({ variant = 'sidebar', nextEvent = null }: EventsSidebarNudgeProps) {
    const { user } = useAuth();
    const { data: rankInfo } = useRankAccess();
    const countdown = useCountdownLabel(nextEvent?.date);

    // ── Mobile bar: single pill, matches existing GamificationNudge mobile footprint ──
    if (variant === 'mobile-bar') {
        // Prefer pointing at the next event if we have one — it's the most
        // actionable thing on an events page. Fall back to /speak.
        const to = nextEvent ? `/events/${nextEvent.id}` : '/speak';
        const label = nextEvent
            ? `Next: ${nextEvent.title}${countdown ? ` · ${countdown}` : ''}`
            : `Propose a talk — +${XP_REWARDS.event_registered} XP on RSVP`;
        const Icon = nextEvent ? CalendarClock : Mic2;
        return (
            <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 px-4 pb-[calc(env(safe-area-inset-bottom)+8px)] pt-2 bg-gradient-to-t from-brutal-bg via-brutal-bg/95 to-transparent pointer-events-none">
                <Link
                    to={to}
                    className="pointer-events-auto flex items-center gap-3 w-full bg-brutal-dark text-brutal-bg font-data text-xs font-bold uppercase tracking-wider px-4 py-3 rounded-full border-2 border-brutal-dark shadow-[3px_3px_0_0_rgba(196,41,30,0.4)]"
                >
                    <Icon size={14} className="text-brutal-red flex-shrink-0" />
                    <span className="flex-1 min-w-0 truncate">{label}</span>
                    <ArrowRight size={12} className="flex-shrink-0" />
                </Link>
            </div>
        );
    }

    // ── Unauthenticated sidebar — mirror GamificationNudge's "Join the Makerspace" card
    //    but reframed for events: the reward framing here is attendance XP, not projects. ──
    if (!user) {
        return (
            <div className="space-y-4">
                {nextEvent && <NextUpCard event={nextEvent} countdown={countdown} />}
                <Link
                    to="/register"
                    className={cn(
                        'block rounded-xl border-2 border-brutal-dark p-4',
                        'bg-brutal-dark text-brutal-bg',
                        'shadow-[4px_4px_0_0_theme(colors.brutal.red)]',
                        'hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_theme(colors.brutal.red)] transition-all duration-200',
                    )}
                >
                    <div className="flex items-center gap-2 mb-2">
                        <Sparkles size={14} className="text-brutal-red" />
                        <span className="font-heading text-sm font-bold uppercase tracking-wider">
                            Join the Makerspace
                        </span>
                    </div>
                    <p className="font-data text-xs text-brutal-bg/60">
                        Create an account to RSVP, save seats, and earn +{XP_REWARDS.event_registered} XP per event.
                    </p>
                </Link>
            </div>
        );
    }

    // ── Signed-in sidebar — Next Up + rank/XP bar framed for events + propose-a-talk ──
    const rank = rankInfo?.rank || 'Curious';
    const xp = rankInfo?.xp || 0;
    const nextRank = getNextRank(rank);
    const progress = getProgressToNextRank(xp, rank);

    return (
        <div className="space-y-4">
            {nextEvent && <NextUpCard event={nextEvent} countdown={countdown} />}

            {/* Rank + XP — same structural slot as the old GamificationNudge, reframed for events */}
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
                        Earn XP by Showing Up
                    </span>
                </div>
                <p className="font-data text-xs text-brutal-bg/70 mb-3">
                    +{XP_REWARDS.event_registered} XP per RSVP, +{XP_REWARDS.event_presented} XP when you present.
                </p>

                <div className="mb-1">
                    <div className="flex items-center justify-between mb-1">
                        <span className="font-data text-[10px] font-bold text-brutal-red">{rank}</span>
                        <span className="font-data text-[10px] text-brutal-bg/80 tabular-nums">{progress}%</span>
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
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// Sub-cards
// ─────────────────────────────────────────────────────────────

function NextUpCard({ event, countdown }: { event: EventListItem; countdown: string | null }) {
    const date = new Date(event.date);
    return (
        <Link
            to={`/events/${event.id}`}
            className="block rounded-xl border-2 border-brutal-dark/15 bg-brutal-bg p-4 hover:border-brutal-red/40 hover:shadow-[4px_4px_0_0_rgba(196,41,30,0.15)] transition-all"
        >
            <div className="flex items-center justify-between gap-2 mb-2">
                <span className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-dark/55">
                    Next up
                </span>
                {countdown && (
                    <span className="inline-flex items-center gap-1 font-data text-[9px] font-bold uppercase tracking-wider bg-brutal-red text-brutal-bg px-1.5 py-0.5 rounded-full">
                        <Clock size={8} /> {countdown}
                    </span>
                )}
            </div>
            <p className="font-heading text-sm font-bold uppercase tracking-tight-heading leading-snug text-brutal-dark line-clamp-2">
                {event.title}
            </p>
            <p className="font-data text-[11px] text-brutal-dark/55 mt-1 tabular-nums">
                {date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                {' · '}
                {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
            <span className="inline-flex items-center gap-1 mt-2 font-data text-[10px] font-bold uppercase tracking-wider text-brutal-red">
                View event <ArrowRight size={10} />
            </span>
        </Link>
    );
}
