import React, { useEffect, useRef } from 'react';
import { useBadges, useUserBadges } from '../lib/hooks';
import { BadgeIcon } from '../components/ui/BadgeIcon';
import { CheckCircle2, Lock, ChevronRight, ArrowRight } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { getBadgeIcon, getBadgeColors } from '../lib/badgeIcons';
import { RANK_ORDER } from '../lib/xpEngine';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Link } from 'react-router';
import { getBadgeCriteria } from '../lib/badgeCriteria';

gsap.registerPlugin(ScrollTrigger);

const DOMAIN_COLORS: Record<string, string> = {
    Electronics: '#C4291E',
    Robotics: '#111111',
    AI: '#2563EB',
    Design: '#D97706',
    Fabrication: '#059669',
    Bio: '#7C3AED',
    Interdisciplinary: '#6B7280',
};

export function Badges() {
    const { user } = useAuth();
    const { data: badges, loading } = useBadges();
    const { data: myBadges } = useUserBadges(user?.id);
    const earnedIds = new Set((myBadges || []).map(ub => ub.badge_id));
    const pageRef = useRef<HTMLDivElement>(null);
    const hasAnimated = useRef(false);

    const progressionNames = ['Curious', 'Tinkerer', 'Builder', 'Maker', 'Innovator', 'Lab Pro'];
    const domainNames = ['Electronics', 'Robotics', 'AI', 'Design', 'Fabrication', 'Bio', 'Interdisciplinary'];

    const progressionBadges = (badges || []).filter(b => progressionNames.includes(b.name));
    const domainBadges = (badges || []).filter(b => domainNames.includes(b.domain) && !progressionNames.includes(b.name));
    const otherBadges = (badges || []).filter(b => !progressionNames.includes(b.name) && !domainNames.includes(b.domain));

    const domainGroups = domainNames.reduce((acc, domain) => {
        acc[domain] = domainBadges.filter(b => b.domain === domain);
        return acc;
    }, {} as Record<string, typeof badges>);

    // Find current user rank from earned progression badges
    const earnedProgressionNames = progressionBadges
        .filter(b => earnedIds.has(b.id))
        .map(b => b.name);
    const currentRankIndex = RANK_ORDER.reduce((maxIdx, rank, idx) => {
        return earnedProgressionNames.includes(rank) ? idx : maxIdx;
    }, -1);

    // GSAP — scroll-triggered sections only, with ref guard for Strict Mode
    useEffect(() => {
        if (loading || !badges?.length || !pageRef.current || hasAnimated.current) return;
        hasAnimated.current = true;

        const sections = pageRef.current.querySelectorAll('.bd-section');
        sections.forEach(el => {
            gsap.fromTo(el,
                { y: 30, opacity: 0 },
                {
                    y: 0, opacity: 1, duration: 0.6, ease: 'power3.out',
                    scrollTrigger: { trigger: el, start: 'top 85%' }
                }
            );
        });
    }, [loading, badges?.length]);

    if (loading) {
        return (
            <div ref={pageRef} className="flex-1 w-full bg-brutal-bg min-h-screen">
                <section className="pt-36 pb-12 px-6 md:px-12 lg:px-24 max-w-7xl mx-auto">
                    <div className="animate-pulse space-y-4">
                        <div className="h-14 w-80 bg-brutal-dark/5 rounded" />
                        <div className="h-5 w-96 bg-brutal-dark/5 rounded" />
                    </div>
                </section>
                <div className="px-6 md:px-12 lg:px-24 max-w-7xl mx-auto pb-32 space-y-12">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="animate-pulse space-y-4">
                            <div className="h-5 w-48 bg-brutal-dark/5 rounded" />
                            <div className="h-32 bg-brutal-dark/5 rounded-2xl" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div ref={pageRef} className="flex-1 w-full bg-brutal-bg min-h-screen">
            {/* Hero */}
            <section className="pt-36 pb-10 px-6 md:px-12 lg:px-24 max-w-7xl mx-auto animate-[fadeInUp_0.6s_ease-out_both]">
                <h1 className="font-heading font-bold text-3xl sm:text-5xl md:text-7xl uppercase tracking-tight-heading mb-4">
                    Badge Catalog
                </h1>
                <p className="font-data text-sm text-brutal-dark/50 max-w-xl border-l-2 border-brutal-red pl-4 leading-relaxed">
                    Earn badges by completing challenges and joining events.
                    Document your growth through the ranks of mastery.
                </p>
            </section>

            {/* ── 01 · YOUR JOURNEY ── */}
            <section className="bd-section px-6 md:px-12 lg:px-24 max-w-7xl mx-auto pb-16">
                <div className="flex items-center gap-3 mb-8">
                    <span className="font-data text-[10px] text-brutal-dark/30 font-bold uppercase tracking-widest">01</span>
                    <span className="font-data text-[10px] text-brutal-dark/30 font-bold uppercase tracking-widest">—</span>
                    <span className="font-data text-[10px] text-brutal-dark/30 font-bold uppercase tracking-widest">Growth Path</span>
                </div>
                <h2 className="font-heading font-bold text-2xl md:text-3xl mb-10">Your Journey</h2>

                {/* Progression timeline */}
                <div className="relative flex items-start justify-between">
                    {/* Connecting line */}
                    <div className="absolute top-8 left-8 right-8 h-[2px] bg-brutal-dark/10" />
                    {/* Progress fill */}
                    {currentRankIndex >= 0 && (
                        <div
                            className="absolute top-8 left-8 h-[2px] bg-brutal-red transition-all duration-700"
                            style={{
                                width: `${(currentRankIndex / (RANK_ORDER.length - 1)) * (100 - (16 / 7))}%`
                            }}
                        />
                    )}

                    {RANK_ORDER.map((rankName, idx) => {
                        const badge = progressionBadges.find(b => b.name === rankName);
                        const isEarned = badge ? earnedIds.has(badge.id) : false;
                        const isCurrent = idx === currentRankIndex;
                        const isPast = idx < currentRankIndex;
                        const Icon = getBadgeIcon({ name: rankName, badge_type: 'achievement', domain: 'General' });

                        return (
                            <div key={rankName} className="relative z-10 flex flex-col items-center text-center flex-1">
                                <div className={`
                                    w-16 h-16 rounded-full flex items-center justify-center border-2 transition-all duration-300
                                    ${isCurrent
                                        ? 'bg-brutal-red border-brutal-red shadow-[0_0_20px_rgba(196,41,30,0.25)] scale-110'
                                        : isEarned || isPast
                                            ? 'bg-brutal-red/10 border-brutal-red/40'
                                            : 'bg-brutal-bg border-brutal-dark/15'
                                    }
                                `}>
                                    <Icon
                                        size={24}
                                        strokeWidth={1.5}
                                        className={`
                                            ${isCurrent
                                                ? 'text-brutal-bg'
                                                : isEarned || isPast
                                                    ? 'text-brutal-red'
                                                    : 'text-brutal-dark/25'
                                            }
                                        `}
                                    />
                                </div>
                                <span className={`
                                    font-heading font-bold text-[10px] md:text-xs uppercase mt-3 tracking-wide
                                    ${isCurrent ? 'text-brutal-red' : isEarned || isPast ? 'text-brutal-dark' : 'text-brutal-dark/30'}
                                `}>
                                    {rankName}
                                </span>
                                {badge && (
                                    <span className="font-data text-[8px] md:text-[9px] text-brutal-dark/30 mt-1 max-w-[100px] line-clamp-2 leading-tight hidden md:block">
                                        {getBadgeCriteria(badge)}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* ── 02 · DOMAIN MASTERY ── */}
            <section className="bd-section bg-brutal-dark text-brutal-bg py-20">
                <div className="px-6 md:px-12 lg:px-24 max-w-7xl mx-auto">
                    <div className="flex items-center gap-3 mb-8">
                        <span className="font-data text-[10px] text-brutal-bg/30 font-bold uppercase tracking-widest">02</span>
                        <span className="font-data text-[10px] text-brutal-bg/30 font-bold uppercase tracking-widest">—</span>
                        <span className="font-data text-[10px] text-brutal-bg/30 font-bold uppercase tracking-widest">Skill Matrix</span>
                    </div>
                    <h2 className="font-heading font-bold text-2xl md:text-3xl uppercase mb-12">Domain Mastery</h2>

                    <div className="space-y-2">
                        {domainNames.map((domain, dIdx) => {
                            const group = domainGroups[domain] || [];
                            if (group.length === 0) return null;
                            const earnedCount = group.filter(b => earnedIds.has(b.id)).length;
                            const totalCount = group.length;
                            const allComplete = earnedCount === totalCount && totalCount > 0;

                            return (
                                <div
                                    key={domain}
                                    className="group flex items-center gap-4 md:gap-8 py-5 px-6 rounded-xl bg-brutal-bg/[0.04] hover:bg-brutal-bg/[0.08] transition-all duration-300"
                                >
                                    {/* Domain name */}
                                    <div className="w-32 md:w-40 flex-shrink-0">
                                        <span className="font-heading font-bold text-sm uppercase tracking-wide text-brutal-bg/60">
                                            {domain}
                                        </span>
                                    </div>

                                    {/* Badge icons row */}
                                    <div className="flex items-center gap-3 flex-1">
                                        {group.map((badge) => {
                                            const Icon = getBadgeIcon(badge);
                                            const earned = earnedIds.has(badge.id);
                                            return (
                                                <div
                                                    key={badge.id}
                                                    title={`${badge.name} — ${badge.tier}`}
                                                    className={`
                                                        w-10 h-10 rounded-full flex items-center justify-center border transition-all duration-200
                                                        ${earned
                                                            ? 'border-brutal-bg/40 bg-brutal-bg/15'
                                                            : 'border-brutal-bg/10 bg-brutal-bg/[0.03]'
                                                        }
                                                    `}
                                                >
                                                    <Icon
                                                        size={18}
                                                        strokeWidth={1.5}
                                                        className={earned ? 'text-brutal-bg' : 'text-brutal-bg/20'}
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Completion status */}
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <span className="font-data text-[10px] font-bold text-brutal-bg/30 uppercase tracking-widest">
                                            {earnedCount}/{totalCount} Complete
                                        </span>
                                        {allComplete ? (
                                            <CheckCircle2 size={14} className="text-brutal-red" />
                                        ) : (
                                            <ChevronRight size={14} className="text-brutal-bg/20" />
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ── 03 · SPECIAL ACHIEVEMENTS ── */}
            {otherBadges.length > 0 && (
                <section className="bd-section py-20 px-6 md:px-12 lg:px-24 max-w-7xl mx-auto">
                    <div className="flex items-center gap-3 mb-8">
                        <span className="font-data text-[10px] text-brutal-dark/30 font-bold uppercase tracking-widest">03</span>
                        <span className="font-data text-[10px] text-brutal-dark/30 font-bold uppercase tracking-widest">—</span>
                        <span className="font-data text-[10px] text-brutal-dark/30 font-bold uppercase tracking-widest">Hall of Fame</span>
                    </div>
                    <h2 className="font-heading font-bold text-2xl md:text-3xl mb-10">Special Achievements</h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        {otherBadges.map(badge => {
                            const earned = earnedIds.has(badge.id);
                            const Icon = getBadgeIcon(badge);

                            return (
                                <div
                                    key={badge.id}
                                    className={`
                                        group relative rounded-2xl border overflow-hidden transition-all duration-300
                                        ${earned
                                            ? 'bg-brutal-dark border-brutal-dark hover:shadow-[0_0_30px_rgba(17,17,17,0.15)]'
                                            : 'bg-brutal-bg border-brutal-dark/10 hover:border-brutal-dark/20'
                                        }
                                    `}
                                >
                                    {/* Icon area */}
                                    <div className={`p-6 pb-4 ${earned ? '' : ''}`}>
                                        <div className={`
                                            w-14 h-14 rounded-xl flex items-center justify-center mb-5
                                            ${earned
                                                ? 'bg-brutal-bg/10'
                                                : 'bg-brutal-dark/[0.04]'
                                            }
                                        `}>
                                            <Icon
                                                size={28}
                                                strokeWidth={1.5}
                                                className={earned ? 'text-brutal-bg' : 'text-brutal-dark/25'}
                                            />
                                        </div>

                                        <h3 className={`font-heading font-bold text-base uppercase leading-tight mb-2 ${earned ? 'text-brutal-bg' : 'text-brutal-dark'}`}>
                                            {badge.name}
                                        </h3>
                                        <p className={`font-data text-xs leading-relaxed mb-4 ${earned ? 'text-brutal-bg/50' : 'text-brutal-dark/40'}`}>
                                            {badge.description || getBadgeCriteria(badge)}
                                        </p>
                                    </div>

                                    {/* Status footer */}
                                    <div className={`px-6 pb-5 ${earned ? '' : ''}`}>
                                        {earned ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-brutal-red/20 font-data text-[9px] font-bold text-brutal-red uppercase tracking-wider">
                                                <CheckCircle2 size={10} />
                                                {badge.badge_type === 'achievement' ? 'Rare Achievement' : badge.badge_type}
                                                {' · '}Earned
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-brutal-dark/[0.04] font-data text-[9px] font-bold text-brutal-dark/30 uppercase tracking-wider">
                                                <Lock size={10} />
                                                Locked
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}

            {/* CTA */}
            <section className="bd-section pt-20 pb-24 px-6 md:px-12 lg:px-24 max-w-7xl mx-auto text-center">
                <Link
                    to="/makers"
                    className="inline-flex items-center gap-2 bg-brutal-red text-brutal-bg px-8 py-3.5 rounded-full font-data text-sm font-bold uppercase tracking-wider hover:bg-brutal-dark transition-colors duration-300"
                >
                    View Global Leaderboard
                    <ArrowRight size={16} />
                </Link>
            </section>
        </div>
    );
}
