import React from 'react';
import { Link } from 'react-router';
import {
    Zap,
    Calendar,
    Trophy,
    Plus,
    Lock,
    AlertTriangle,
    Sparkles,
    ArrowRight,
    Award,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';
import { NextBestAction, type NextBestActionInput } from './NextBestAction';
import { RANK_STYLES } from '../ui/RankBadge';
import { RANK_ORDER, RANK_THRESHOLDS, getProgressToNextRank, getNextRank } from '../../lib/xpEngine';
import { getBadgeIcon } from '../../lib/badgeIcons';
import { cn } from '../../lib/utils';
import { XP_REWARDS } from '../../lib/constants';

/**
 * §7 Cockpit — Overview Bento (v3: red-richness pass + custom rank tower).
 *
 * v2 → v3 changes (driven by user feedback on the polished build):
 *
 *   1. BentoStat tiles previously had an absolute ArrowUpRight in the
 *      top-right corner that visually collided with the big numeric
 *      value (also top-right). v3 removes the absolute arrow entirely
 *      and gives each tile a clean two-row layout:
 *        Row 1 — icon (left) + value (right)
 *        Row 2 — label (left) + ArrowRight CTA (right, hover-only color)
 *      No more overlap.
 *
 *   2. The rank cell previously rendered <RankBadge variant="full" />,
 *      whose 6-step rank ladder + p-6 + rounded-[2rem] + text-4xl was
 *      overflowing the col-span-4 cell. v3 replaces it with a hand-built
 *      "rank tower" sized exactly for this slot: vertical stack with a
 *      red top stripe, big rank glyph, condensed XP progress, and a
 *      6-dot mini ladder that fits horizontally without breakouts.
 *
 *   3. Color richness restored — every cell has been pushed back toward
 *      brutalism: red corner accents on light stat tiles, red borders
 *      on the rank tower, a red top-stripe on the XP card, and the
 *      AttentionCard's red variant got a thicker border.
 *
 * Layout (lg+) — same unified 12-col grid as v2:
 *
 *                col 1───────────────8 col 9──12
 *   Row A (auto) │ NEXT BEST ACTION   │ RANK   │  ← rank spans rows A+B
 *   Row B (auto) │ STAT × 4 (sub-grid)│ ↓      │
 *   Row C (auto) │ RECENT XP (full L) │ ATTN.  │  ← attention only if items exist
 */

export interface OverviewBentoProps {
    nbaInput: NextBestActionInput;
    rank: { rank: string; xp: number; loading: boolean; role?: string };
    stats: {
        activeProjects: number;
        upcomingEvents: number;
        completedChallenges: number;
        loading: boolean;
    };
    xpHistory: { items: Array<{ id: string; reason: string; amount: number }>; loading: boolean };
    propose: {
        canCreate: boolean;
        requiredRank: string;
        onPropose: () => void;
        currentXP: number;
        profileComplete: boolean;
    };
    attention: Array<{ id: string; status: string; title: string }>;
    badges: {
        earned: number;
        total: number;
        lastBadgeName: string | null;
        loading: boolean;
    };
}

export function OverviewBento({
    nbaInput,
    rank,
    stats,
    xpHistory,
    propose,
    attention,
    badges,
}: OverviewBentoProps) {
    const hasAttention = attention.length > 0;
    const topAttention = attention[0];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6">
            {/* ── A1: Next Best Action (cols 1-8, row 1) ── */}
            <div className="lg:col-span-8 lg:row-start-1">
                <NextBestAction {...nbaInput} />
            </div>

            {/* ── A2: Custom rank tower (cols 9-12, spans rows 1+2) ── */}
            <div className="lg:col-span-4 lg:row-start-1 lg:row-span-2">
                {rank.loading ? (
                    <div className="h-full">
                        <Skeleton variant="card" />
                    </div>
                ) : (
                    <RankTower rank={rank.rank} xp={rank.xp} role={rank.role} />
                )}
            </div>

            {/* ── B1: Stat tiles (cols 1-8, row 2) ── */}
            <div className="lg:col-span-8 lg:row-start-2 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <BentoStat
                    to="/projects?owner=me"
                    icon={Zap}
                    label="Active Projects"
                    value={stats.activeProjects}
                    loading={stats.loading}
                    dark
                />
                <BentoStat
                    to="/events"
                    icon={Calendar}
                    label="Upcoming Events"
                    value={stats.upcomingEvents}
                    loading={stats.loading}
                />
                <BentoStat
                    to="/challenges"
                    icon={Trophy}
                    label="Challenges Done"
                    value={stats.completedChallenges}
                    loading={stats.loading}
                />
                {propose.canCreate ? (
                    <button
                        type="button"
                        onClick={propose.onPropose}
                        aria-label="Propose a new project"
                        className={cn(
                            'group relative rounded-2xl p-4 text-left min-h-[130px]',
                            'bg-brutal-red text-brutal-bg border-2 border-brutal-dark',
                            'shadow-[6px_6px_0_0_rgba(20,20,20,0.9)]',
                            'transition-transform duration-150 ease-out',
                            'hover:translate-x-[-2px] hover:translate-y-[-2px]',
                            'hover:shadow-[8px_8px_0_0_rgba(20,20,20,1)]',
                            'motion-reduce:hover:translate-x-0 motion-reduce:hover:translate-y-0 motion-reduce:transition-none',
                            'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brutal-red',
                            'flex flex-col justify-between'
                        )}
                    >
                        <div className="flex items-start justify-between">
                            <Plus className="w-5 h-5" aria-hidden />
                            <span className="font-data text-[10px] font-bold uppercase tracking-widest text-brutal-bg/70">
                                New
                            </span>
                        </div>
                        <div className="font-heading font-bold text-xl uppercase tracking-tight-heading leading-none">
                            Propose
                        </div>
                    </button>
                ) : (
                    (() => {
                        const xpToUnlock = Math.max(0, RANK_THRESHOLDS[propose.requiredRank] - propose.currentXP);
                        return (
                            <div
                                aria-disabled="true"
                                aria-label={`Propose Project locked. ${xpToUnlock} XP to unlock at ${propose.requiredRank}.`}
                                className={cn(
                                    'rounded-2xl p-4 min-h-[130px] bg-brutal-bg border-2 border-dashed border-brutal-red/35',
                                    'shadow-[6px_6px_0_0_rgba(196,41,30,0.10)]',
                                    'flex flex-col justify-between'
                                )}
                            >
                                <div className="flex items-start justify-between">
                                    <Lock className="w-5 h-5 text-brutal-red/55" aria-hidden />
                                    <span className="font-data text-[10px] font-bold uppercase tracking-widest text-brutal-red/60">
                                        Locked
                                    </span>
                                </div>
                                <div>
                                    <div className="font-heading font-bold text-xl uppercase tracking-tight-heading leading-none text-brutal-dark/55">
                                        Propose
                                    </div>
                                    <div className="font-data text-[10px] mt-1 text-brutal-red font-bold uppercase tabular-nums">
                                        {xpToUnlock} XP to unlock
                                    </div>
                                    <Link
                                        to={!propose.profileComplete ? '/profile-setup' : '/challenges?tier=Tier+1'}
                                        className="mt-1 inline-block font-data text-[10px] underline text-brutal-red uppercase tracking-widest focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brutal-red"
                                    >
                                        {!propose.profileComplete
                                            ? `Finish your Profile (+50 XP) →`
                                            : 'Tier 1 challenge →'}
                                    </Link>
                                </div>
                            </div>
                        );
                    })()
                )}
            </div>

            {/* ── C1: Recent XP card (cols 1-8, row 3) ── */}
            <div className="lg:col-span-8 lg:row-start-3">
                <Card
                    className={cn(
                        'relative p-5 border-2 border-brutal-dark/15 overflow-hidden',
                        'shadow-[6px_6px_0_0_rgba(196,41,30,0.18)]',
                        'flex flex-col'
                    )}
                >
                    <div className="flex items-center justify-between mb-3 flex-shrink-0 pb-3 border-b-2 border-brutal-dark/10">
                        <div className="flex items-center gap-2 font-data text-[10px] uppercase font-bold tracking-widest text-brutal-dark/60">
                            <Sparkles className="w-3.5 h-3.5 text-brutal-red" aria-hidden />
                            Recent XP
                        </div>
                        <Link
                            to="/profile"
                            className="font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/40 hover:text-brutal-red focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brutal-red"
                        >
                            Full history →
                        </Link>
                    </div>
                    <div
                        className="overflow-y-auto pr-2 space-y-2 flex-1 font-data scrollbar-thin max-h-[180px]"
                        style={{
                            WebkitMaskImage: 'linear-gradient(to bottom, black 82%, transparent 100%)',
                            maskImage: 'linear-gradient(to bottom, black 82%, transparent 100%)',
                        }}
                        aria-label="Recent XP history"
                    >
                        {xpHistory.loading && xpHistory.items.length === 0 ? (
                            <div className="space-y-2">
                                <Skeleton variant="line" />
                                <Skeleton variant="line" />
                                <Skeleton variant="line" />
                            </div>
                        ) : xpHistory.items.length === 0 ? (
                            <div className="text-brutal-dark/40 italic text-sm py-2">
                                Complete challenges or projects to earn XP.
                            </div>
                        ) : (
                            xpHistory.items.slice(0, 8).map((event) => (
                                <div
                                    key={event.id}
                                    className="flex justify-between items-center border-b border-brutal-dark/5 pb-2 last:border-0 last:pb-0"
                                >
                                    <div className="font-medium text-brutal-dark text-[13px] truncate pr-2">
                                        {event.reason}
                                    </div>
                                    <div className="font-bold text-brutal-red tabular-nums flex-shrink-0 text-base">
                                        +{event.amount} XP
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </Card>
            </div>

            {/* ── C2: Badges summary or Attention (cols 9-12, row 3) ── */}
            {hasAttention && topAttention ? (
                <div className="lg:col-span-4 lg:row-start-3">
                    <AttentionCard item={topAttention} extraCount={attention.length - 1} />
                </div>
            ) : (
                <div className="lg:col-span-4 lg:row-start-3">
                    <BadgesSummaryCard {...badges} />
                </div>
            )}

            {/* If there IS attention AND we still want badges visible, show badges in row 4 */}
            {hasAttention && (
                <div className="lg:col-span-4 lg:row-start-4">
                    <BadgesSummaryCard {...badges} />
                </div>
            )}
        </div>
    );
}

/* ── Internal: a single bento stat tile (clean two-row, no arrow conflict) ── */

interface BentoStatProps {
    to: string;
    icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
    label: string;
    value: number;
    loading: boolean;
    dark?: boolean;
}

function BentoStat({ to, icon: Icon, label, value, loading, dark }: BentoStatProps) {
    return (
        <Link
            to={to}
            aria-label={`${label}: ${value}. Open details.`}
            className={cn(
                'group relative rounded-2xl p-4 block min-h-[130px] overflow-hidden',
                'border-2',
                'transition-transform duration-150 ease-out',
                'hover:translate-x-[-2px] hover:translate-y-[-2px]',
                'motion-reduce:hover:translate-x-0 motion-reduce:hover:translate-y-0 motion-reduce:transition-none',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brutal-red',
                'flex flex-col justify-between',
                dark
                    ? 'bg-brutal-dark text-brutal-bg border-brutal-dark shadow-[6px_6px_0_0_rgba(196,41,30,0.9)] hover:shadow-[8px_8px_0_0_rgba(196,41,30,1)]'
                    : 'bg-brutal-bg border-brutal-dark/20 shadow-[6px_6px_0_0_rgba(196,41,30,0.18)] hover:shadow-[8px_8px_0_0_rgba(196,41,30,0.28)] hover:border-brutal-red/40'
            )}
        >
            {/* Row 1 — icon + value */}
            <div className="flex items-start justify-between gap-3 relative">
                <Icon
                    className={cn(
                        'w-5 h-5 flex-shrink-0',
                        dark ? 'text-brutal-bg/70' : 'text-brutal-red'
                    )}
                    aria-hidden
                />
                {loading ? (
                    <div
                        className={cn(
                            'h-9 w-12 rounded motion-safe:animate-pulse',
                            dark ? 'bg-brutal-bg/15' : 'bg-brutal-dark/10'
                        )}
                    />
                ) : (
                    <div
                        className={cn(
                            'text-4xl font-heading font-bold tabular-nums leading-none',
                            dark ? 'text-brutal-bg' : 'text-brutal-dark'
                        )}
                    >
                        {value}
                    </div>
                )}
            </div>

            {/* Row 2 — label + cta arrow (no conflict, far from value) */}
            <div className="flex items-end justify-between gap-2">
                <div
                    className={cn(
                        'font-data text-[11px] font-bold uppercase tracking-widest leading-snug',
                        dark ? 'text-brutal-bg/60' : 'text-brutal-dark/60'
                    )}
                >
                    {label}
                </div>
                <ArrowRight
                    className={cn(
                        'w-3.5 h-3.5 flex-shrink-0 transition-all motion-reduce:transition-none',
                        'group-hover:translate-x-0.5 motion-reduce:group-hover:translate-x-0',
                        dark
                            ? 'text-brutal-bg/40 group-hover:text-brutal-bg'
                            : 'text-brutal-dark/30 group-hover:text-brutal-red'
                    )}
                    aria-hidden
                />
            </div>
        </Link>
    );
}

/* ── Rank milestone labels — what ACTION earns each rank ───────────────── */

const RANK_MILESTONES: Record<string, string> = {
    'Curious':   'Create your account',
    'Tinkerer':  'Earn 60 XP (profile + login, or a Tier 1 challenge)',
    'Builder':   'Earn 250 XP (projects, challenges, or events)',
    'Maker':     'Earn 600 XP (sustained making and challenges)',
    'Innovator': 'Earn 1,200 XP (advanced challenges and projects)',
    'Lab Pro':   'Mentor role + 2,500 XP',
};

/* ── What features unlock at each rank ─────────────────────────────────── */
const RANK_UNLOCKS: Record<string, string[]> = {
    'Tinkerer':  ['Propose Projects', 'Submit Challenges', 'Earn Domain Badges'],
    'Builder':   ['View Tier 3 Challenges', 'Book Showcase Slots'],
    'Maker':     ['Propose T3 Architect Projects'],
    'Innovator': ['Request Mentor Status'],
    'Lab Pro':   ['Full Lab Access'],
};

/* ── Internal: hand-built rank tower (sized for col-span-4 cell) ───────── */

interface RankTowerProps {
    rank: string;
    xp: number;
    role?: string;
}

function RankTower({ rank, xp, role }: RankTowerProps) {
    const style = RANK_STYLES[rank] || RANK_STYLES['Curious'];
    const progress = getProgressToNextRank(xp, rank);
    const nextRank = getNextRank(rank);
    const Icon = getBadgeIcon({ name: rank, badge_type: 'achievement', domain: 'General' });
    const xpForNext = nextRank ? RANK_THRESHOLDS[nextRank] : null;
    const xpToGo = xpForNext ? Math.max(0, xpForNext - xp) : 0;
    const currentIndex = RANK_ORDER.indexOf(rank);

    return (
        <div
            className={cn(
                'relative h-full overflow-hidden',
                'bg-brutal-bg border-2 border-brutal-dark rounded-2xl',
                'shadow-[6px_6px_0_0_rgba(196,41,30,0.9)]',
                'flex flex-col p-5'
            )}
        >
            {/* Eyebrow row — title left, big XP right (efficient use of width) */}
            <div className="flex items-baseline justify-between gap-3">
                <span className="font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/40">
                    Your Rank
                </span>
                <span className="font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/40 tabular-nums">
                    {xp.toLocaleString()} XP
                </span>
            </div>

            {/* Hero row — glyph + single-line rank name (text auto-shrinks) */}
            <div className="flex items-center gap-3 mt-4">
                <div
                    className={cn(
                        'w-14 h-14 rounded-full flex items-center justify-center border-2 flex-shrink-0',
                        style.bg,
                        style.border
                    )}
                >
                    <Icon size={28} className={style.text} strokeWidth={1.75} />
                </div>
                <div
                    className={cn(
                        'font-heading font-bold uppercase tracking-tight-heading leading-none truncate flex-1 min-w-0',
                        // Auto-shrink so multi-word ranks like "Lab Pro" stay one line
                        'text-[clamp(1.5rem,2.2vw+0.5rem,2.25rem)]',
                        style.text
                    )}
                    title={rank}
                >
                    {rank}
                </div>
            </div>

            {/* Progress to next rank — single line label + remainder */}
            <div className="mt-5">
                {nextRank === 'Lab Pro' && role !== 'mentor' && role !== 'admin' ? (
                    <div className="bg-brutal-dark/5 rounded-xl p-3 border border-brutal-dark/10">
                        <div className="font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/55 mb-1">
                            Next · Lab Pro
                        </div>
                        <div className="font-data text-[11px] text-brutal-dark/60">
                            Lab Pro requires <span className="font-bold text-brutal-red">Mentor role</span>. Apply for mentor status or talk to an admin.
                        </div>
                    </div>
                ) : nextRank ? (
                    <>
                        <div className="flex items-baseline justify-between gap-2 mb-1.5">
                            <span className="font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/55 truncate">
                                Next · {nextRank}
                            </span>
                            <span className="font-data text-[11px] font-bold tabular-nums text-brutal-red flex-shrink-0">
                                {xpToGo.toLocaleString()} XP to go
                            </span>
                        </div>
                        <div className="h-2 bg-brutal-dark/10 rounded-full overflow-hidden border border-brutal-dark/15">
                            <div
                                className={cn('h-full transition-all duration-700 motion-reduce:transition-none', style.barColor)}
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        {/* What unlocks at next rank */}
                        {RANK_UNLOCKS[nextRank] && (
                            <div className="mt-2">
                                <div className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-dark/35 mb-1">
                                    Unlocks at {nextRank}
                                </div>
                                {RANK_UNLOCKS[nextRank].map((feature) => (
                                    <div key={feature} className="flex items-center gap-1.5">
                                        <span className="text-brutal-red text-[9px]" aria-hidden>✦</span>
                                        <span className="font-data text-[9px] text-brutal-dark/50">{feature}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                ) : (
                    <div className={cn('text-center font-data text-xs font-bold uppercase tracking-widest py-2', style.text)}>
                        Maximum rank achieved
                    </div>
                )}
            </div>

            {/* XP earning guide — concrete actions with amounts */}
            <div className="mt-4 pt-3 border-t border-brutal-dark/10">
                <div className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-dark/35 mb-2">
                    How to earn XP
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                    {[
                        { label: 'Tier 1 challenge', xp: XP_REWARDS.tier1_challenge },
                        { label: 'Tier 2 challenge', xp: XP_REWARDS.tier2_challenge },
                        { label: 'Tier 3 challenge', xp: XP_REWARDS.tier3_challenge },
                        { label: 'Project approved', xp: XP_REWARDS.project_approved },
                        { label: 'Project active', xp: XP_REWARDS.project_active },
                        { label: 'Event registration', xp: XP_REWARDS.event_registered },
                        { label: 'Event presenting', xp: XP_REWARDS.event_presented },
                        { label: 'Profile completed', xp: XP_REWARDS.profile_completed },
                    ].map(({ label, xp }) => (
                        <div key={label} className="flex items-center justify-between">
                            <span className="font-data text-[9px] text-brutal-dark/50 truncate">{label}</span>
                            <span className="font-data text-[9px] font-bold text-brutal-red tabular-nums flex-shrink-0">+{xp}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Mini ladder — each dot expands into a pill on hover (XPHudPill pattern) */}
            <div className="mt-auto pt-5 border-t border-brutal-dark/10">
                <div className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-dark/35 mb-2">
                    Ladder · hover to reveal
                </div>
                <div className="flex items-center justify-between gap-1">
                    {RANK_ORDER.map((r, i) => {
                        const reached = currentIndex >= i;
                        const isCurrent = r === rank;
                        const milestone = RANK_MILESTONES[r] || r;
                        return (
                            <React.Fragment key={r}>
                                <button
                                    type="button"
                                    aria-label={`${r}: ${milestone}${isCurrent ? ' (current rank)' : reached ? ' (reached)' : ' (locked)'}`}
                                    title={`${r}: ${milestone}`}
                                    tabIndex={0}
                                    className={cn(
                                        'group/dot flex-shrink-0 inline-flex items-center gap-1.5 rounded-full',
                                        'border transition-all duration-300 ease-out motion-reduce:transition-none',
                                        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brutal-red',
                                        // Padding only when expanded, otherwise the dot floats clean
                                        'px-0 hover:px-2 focus-visible:px-2',
                                        'py-0 hover:py-0.5 focus-visible:py-0.5',
                                        isCurrent
                                            ? 'bg-brutal-red border-brutal-red'
                                            : reached
                                                ? 'bg-brutal-dark border-brutal-dark hover:bg-brutal-dark hover:border-brutal-dark'
                                                : 'bg-brutal-dark/15 border-brutal-dark/15 hover:bg-brutal-bg hover:border-brutal-dark/30'
                                    )}
                                >
                                    {/* The dot itself — stays the same physical size */}
                                    <span
                                        aria-hidden
                                        className={cn(
                                            'flex-shrink-0 rounded-full transition-all duration-300 motion-reduce:transition-none',
                                            isCurrent
                                                ? 'w-2.5 h-2.5 bg-brutal-bg'
                                                : reached
                                                    ? 'w-2 h-2 bg-brutal-bg'
                                                    : 'w-2 h-2 bg-brutal-dark/40 group-hover/dot:bg-brutal-dark'
                                        )}
                                    />
                                    {/* The rank label — collapsed by default, slides out on hover/focus */}
                                    <span
                                        className={cn(
                                            'overflow-hidden whitespace-nowrap font-data text-[9px] font-bold uppercase tracking-widest',
                                            'transition-all duration-300 ease-out motion-reduce:transition-none',
                                            'max-w-0 opacity-0',
                                            'group-hover/dot:max-w-[80px] group-hover/dot:opacity-100',
                                            'group-focus-visible/dot:max-w-[80px] group-focus-visible/dot:opacity-100',
                                            isCurrent
                                                ? 'text-brutal-bg'
                                                : reached
                                                    ? 'text-brutal-bg'
                                                    : 'text-brutal-dark/70'
                                        )}
                                    >
                                        {r}
                                    </span>
                                </button>
                                {i < RANK_ORDER.length - 1 && (
                                    <div
                                        aria-hidden
                                        className={cn(
                                            'flex-1 h-px min-w-[6px]',
                                            currentIndex > i ? 'bg-brutal-dark' : 'bg-brutal-dark/15'
                                        )}
                                    />
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

/* ── Internal: compact badges summary card ─────────────────────────────── */

interface BadgesSummaryCardProps {
    earned: number;
    total: number;
    lastBadgeName: string | null;
    loading: boolean;
}

function BadgesSummaryCard({ earned, total, lastBadgeName, loading }: BadgesSummaryCardProps) {
    if (loading) {
        return (
            <div className="h-full">
                <Skeleton variant="card" />
            </div>
        );
    }

    return (
        <Link
            to="/badges"
            aria-label={`Badges: ${earned} of ${total} earned. View all badges.`}
            className={cn(
                'group block h-full rounded-2xl p-5 border-2 border-brutal-dark/20',
                'bg-brutal-bg shadow-[6px_6px_0_0_rgba(196,41,30,0.18)]',
                'hover:translate-x-[-2px] hover:translate-y-[-2px]',
                'hover:shadow-[8px_8px_0_0_rgba(196,41,30,0.28)] hover:border-brutal-red/40',
                'transition-transform duration-150 ease-out',
                'motion-reduce:hover:translate-x-0 motion-reduce:hover:translate-y-0 motion-reduce:transition-none',
                'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brutal-red',
                'flex flex-col'
            )}
        >
            <div className="flex items-center gap-2 font-data text-[10px] uppercase font-bold tracking-widest text-brutal-dark/60 mb-3">
                <Award className="w-3.5 h-3.5 text-brutal-red" aria-hidden />
                My Badges
            </div>
            <div className="flex items-baseline gap-1 mb-2">
                <span className="text-3xl font-heading font-bold tabular-nums text-brutal-dark leading-none">
                    {earned}
                </span>
                <span className="font-data text-sm text-brutal-dark/40 font-bold">
                    /{total}
                </span>
                <span className="font-data text-[10px] text-brutal-dark/40 uppercase tracking-widest ml-1">
                    earned
                </span>
            </div>
            {lastBadgeName && (
                <div className="font-data text-xs text-brutal-dark/60 mb-3">
                    Last earned: <span className="font-bold text-brutal-dark">{lastBadgeName}</span>
                </div>
            )}
            <div className="mt-auto flex items-center gap-1 font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/40 group-hover:text-brutal-red">
                View all badges
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" aria-hidden />
            </div>
        </Link>
    );
}

/* ── Internal: top attention card (lives in the right column under rank) ── */

interface AttentionCardProps {
    item: { id: string; status: string; title: string };
    extraCount: number;
}

function AttentionCard({ item, extraCount }: AttentionCardProps) {
    const isRejected = item.status === 'rejected';
    return (
        <div
            className={cn(
                'h-full rounded-2xl p-5 border-2 flex flex-col',
                isRejected
                    ? 'bg-brutal-red/10 border-brutal-red shadow-[6px_6px_0_0_rgba(196,41,30,0.30)]'
                    : 'bg-yellow-500/10 border-yellow-500/60 shadow-[6px_6px_0_0_rgba(234,179,8,0.22)]'
            )}
        >
            <div className="flex items-center gap-2 font-data text-[10px] uppercase font-bold tracking-widest mb-3 pb-3 border-b-2 border-brutal-dark/10">
                <AlertTriangle
                    className={cn('w-3.5 h-3.5', isRejected ? 'text-brutal-red' : 'text-yellow-700')}
                    aria-hidden
                />
                <span className={isRejected ? 'text-brutal-red' : 'text-yellow-700'}>
                    {isRejected ? 'Needs you' : 'Under review'}
                </span>
                {extraCount > 0 && (
                    <span className="ml-auto text-brutal-dark/40">+{extraCount} more</span>
                )}
            </div>
            <p className="font-data text-sm text-brutal-dark mb-4 line-clamp-3 flex-1">
                "{item.title}" {isRejected ? 'needs your edits.' : 'is awaiting mentor approval.'}
            </p>
            {isRejected && (
                <Link
                    to={`/projects/${item.id}/edit`}
                    className="inline-flex items-center gap-1 font-data text-xs font-bold uppercase tracking-widest text-brutal-red underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brutal-red"
                >
                    Open editor →
                </Link>
            )}
        </div>
    );
}
