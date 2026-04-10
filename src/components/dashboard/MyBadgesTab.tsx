import React from 'react';
import { Link } from 'react-router';
import { Award, ArrowRight, Lock, Zap } from 'lucide-react';
import { Card } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';
import { getBadgeCriteria } from '../../lib/badgeCriteria';
import { getBadgeIcon } from '../../lib/badgeIcons';
import { cn } from '../../lib/utils';

/**
 * §7 F-324 — My Badges dashboard tab.
 *
 * Shows the user's earned badges and upcoming (locked) badges with
 * earning instructions. Links to the full /badges page for detail.
 *
 * Layout:
 *   - Earned badges grid (brutalist cards with red accent)
 *   - Locked badges grid (muted cards with lock icon + criteria)
 *   - CTA to full badges page
 */

interface BadgeItem {
    id: string;
    name: string;
    description?: string | null;
    criteria?: string | null;
    tier?: string | null;
    domain?: string | null;
    badge_type?: string | null;
    icon_url?: string | null;
}

interface MyBadgesTabProps {
    earnedBadges: BadgeItem[];
    allBadges: BadgeItem[];
    loading: boolean;
}

export function MyBadgesTab({ earnedBadges, allBadges, loading }: MyBadgesTabProps) {
    if (loading) {
        return (
            <div className="space-y-6">
                <Skeleton variant="line" className="h-6 w-40" />
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <Skeleton key={i} variant="card" className="h-40" />
                    ))}
                </div>
            </div>
        );
    }

    const earnedIds = new Set(earnedBadges.map(b => b.id));
    const lockedBadges = allBadges.filter(b => !earnedIds.has(b.id));

    return (
        <div className="space-y-8">
            {/* ── Section: Earned ─────────────────────────────── */}
            <section>
                <div className="flex items-center gap-3 mb-5">
                    <div className="w-8 h-8 rounded-lg bg-brutal-red/10 border border-brutal-red/20 flex items-center justify-center">
                        <Award className="w-4 h-4 text-brutal-red" />
                    </div>
                    <h3 className="font-heading font-bold text-xl uppercase tracking-tight-heading">
                        Earned
                    </h3>
                    <span className="font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/40 ml-auto">
                        {earnedBadges.length} / {allBadges.length}
                    </span>
                </div>

                {earnedBadges.length === 0 ? (
                    <Card className="p-8 border-2 border-dashed border-brutal-dark/15 text-center">
                        <div className="w-12 h-12 rounded-full bg-brutal-dark/5 flex items-center justify-center mx-auto mb-3">
                            <Award className="w-6 h-6 text-brutal-dark/25" />
                        </div>
                        <p className="font-heading font-bold text-lg uppercase text-brutal-dark/40 mb-1">
                            No badges yet
                        </p>
                        <p className="font-data text-xs text-brutal-dark/35 mb-4">
                            Complete challenges and projects to earn your first badge.
                        </p>
                        <Link
                            to="/challenges?tier=Tier+1"
                            className="inline-flex items-center gap-1.5 rounded-full bg-brutal-dark text-brutal-bg px-4 py-2 font-data text-[10px] font-bold uppercase tracking-widest hover:bg-brutal-red transition-colors"
                        >
                            Start a Challenge <ArrowRight className="w-3 h-3" />
                        </Link>
                    </Card>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {earnedBadges.map(badge => (
                            <BadgeCard key={badge.id} badge={badge} earned />
                        ))}
                    </div>
                )}
            </section>

            {/* ── Section: Locked ─────────────────────────────── */}
            {lockedBadges.length > 0 && (
                <section>
                    <div className="flex items-center gap-3 mb-5 pt-4 border-t border-brutal-dark/10">
                        <Lock className="w-4 h-4 text-brutal-dark/30" />
                        <h3 className="font-heading font-bold text-lg uppercase tracking-tight-heading text-brutal-dark/60">
                            Upcoming
                        </h3>
                        <span className="font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/30 ml-auto">
                            {lockedBadges.length} remaining
                        </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {lockedBadges.slice(0, 12).map(badge => (
                            <BadgeCard key={badge.id} badge={badge} earned={false} />
                        ))}
                    </div>
                    {lockedBadges.length > 12 && (
                        <Link
                            to="/badges"
                            className="mt-4 inline-flex items-center gap-1.5 font-data text-[10px] font-bold uppercase tracking-widest text-brutal-red hover:text-brutal-dark transition-colors"
                        >
                            View all {lockedBadges.length} remaining badges <ArrowRight className="w-3 h-3" />
                        </Link>
                    )}
                </section>
            )}

            {/* ── CTA to full badges page ────────────────────── */}
            <div className="pt-4 border-t border-brutal-dark/10">
                <Link
                    to="/badges"
                    className="inline-flex items-center gap-2 rounded-xl border-2 border-brutal-dark/15 bg-brutal-bg px-5 py-3 font-data text-xs font-bold uppercase tracking-widest text-brutal-dark/70 hover:border-brutal-red hover:text-brutal-red transition-all shadow-[4px_4px_0_0_rgba(196,41,30,0.12)] hover:shadow-[6px_6px_0_0_rgba(196,41,30,0.2)]"
                >
                    <Award className="w-4 h-4" /> View Full Badge Collection <ArrowRight className="w-3 h-3" />
                </Link>
            </div>
        </div>
    );
}

// ── Badge Card ──────────────────────────────────────────────────────────────

function BadgeCard({ badge, earned }: { badge: BadgeItem; earned: boolean }) {
    const Icon = getBadgeIcon(badge as any);
    const criteria = getBadgeCriteria(badge);

    return (
        <Card
            className={cn(
                'p-4 flex flex-col items-center text-center transition-all duration-150',
                earned
                    ? 'border-2 border-brutal-red/25 bg-brutal-red/[0.03] shadow-[4px_4px_0_0_rgba(196,41,30,0.15)]'
                    : 'border-2 border-brutal-dark/10 bg-brutal-dark/[0.02] opacity-70',
            )}
        >
            <div
                className={cn(
                    'w-12 h-12 rounded-full flex items-center justify-center mb-3 border-2',
                    earned
                        ? 'bg-brutal-red/10 border-brutal-red/25'
                        : 'bg-brutal-dark/5 border-brutal-dark/15',
                )}
            >
                {earned ? (
                    <Icon size={24} className="text-brutal-red" strokeWidth={1.75} />
                ) : (
                    <Lock size={18} className="text-brutal-dark/30" />
                )}
            </div>
            <h4 className={cn(
                'font-heading font-bold text-sm uppercase tracking-tight-heading mb-1 line-clamp-1',
                earned ? 'text-brutal-dark' : 'text-brutal-dark/50',
            )}>
                {badge.name}
            </h4>
            {badge.tier && (
                <span className={cn(
                    'font-data text-[8px] font-bold uppercase tracking-widest mb-2',
                    earned ? 'text-brutal-red' : 'text-brutal-dark/30',
                )}>
                    {badge.tier}
                    {badge.domain && badge.domain !== 'General' ? ` · ${badge.domain}` : ''}
                </span>
            )}
            <p className={cn(
                'font-data text-[9px] leading-relaxed line-clamp-2',
                earned ? 'text-brutal-dark/55' : 'text-brutal-dark/40',
            )}>
                {earned ? (badge.description || criteria) : criteria}
            </p>
        </Card>
    );
}
