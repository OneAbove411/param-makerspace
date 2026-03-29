import React, { useState, useEffect, useRef } from 'react';
import { useChallenges } from '../lib/hooks';
import { Card } from '../components/ui/Card';
import { MagneticCard } from '../components/ui/MagneticCard';
import { Link } from 'react-router-dom';
import { Clock, ArrowRight, Loader2, Compass, Wrench, Cpu, ChevronDown } from 'lucide-react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// ─── Tier metadata ───

const TIER_INFO = [
    {
        key: 'Tier 1',
        name: 'Explorer',
        subtitle: 'Fundamental workshops and core engineering principles.',
        icon: Compass,
    },
    {
        key: 'Tier 2',
        name: 'Solver',
        subtitle: 'Complex problem-solving and cross-platform integration missions.',
        icon: Wrench,
    },
    {
        key: 'Tier 3',
        name: 'Architect',
        subtitle: 'High-level systems design and industrial-scale development.',
        icon: Cpu,
    },
];

const DOMAINS = ['All', 'Electronics', 'Robotics', 'AI', 'Design', 'Fabrication', 'Bio', 'Interdisciplinary', 'Woodworking'];

// ─── Domain color map for badges ───

const DOMAIN_COLORS: Record<string, string> = {
    electronics: 'bg-brutal-red text-brutal-bg',
    robotics: 'bg-blue-600 text-white',
    ai: 'bg-green-700 text-white',
    design: 'bg-purple-600 text-white',
    fabrication: 'bg-amber-600 text-white',
    bio: 'bg-teal-600 text-white',
    interdisciplinary: 'bg-brutal-dark text-brutal-bg',
};

function getDomainBadgeClass(domain: string | null): string {
    if (!domain) return 'bg-brutal-dark/10 text-brutal-dark/50';
    return DOMAIN_COLORS[domain.toLowerCase()] || 'bg-brutal-dark/10 text-brutal-dark/50';
}

// ─── Skeleton for loading ───

function ChallengeSkeleton() {
    return (
        <div className="rounded-2xl border-2 border-brutal-dark/5 overflow-hidden animate-pulse">
            <div className="h-48 bg-brutal-dark/5" />
            <div className="p-5 space-y-3">
                <div className="h-5 w-3/4 bg-brutal-dark/5 rounded" />
                <div className="h-3 w-full bg-brutal-dark/[0.03] rounded" />
                <div className="h-3 w-1/2 bg-brutal-dark/[0.03] rounded" />
            </div>
        </div>
    );
}

// ─── Main Component ───

export function Challenges() {
    const [tierFilter, setTierFilter] = useState('All');
    const [domainFilter, setDomainFilter] = useState('All');
    const { data: challenges, loading } = useChallenges(tierFilter, domainFilter);
    const pageRef = useRef<HTMLDivElement>(null);
    const [visibleCount, setVisibleCount] = useState(9);

    const normalizeDomain = (d: string) => d.charAt(0).toUpperCase() + d.slice(1).toLowerCase();

    const visibleChallenges = (challenges || []).slice(0, visibleCount);
    const hasMore = (challenges || []).length > visibleCount;

    // ─── GSAP Animations ───
    useEffect(() => {
        const ctx = gsap.context(() => {
            // Hero text entrance
            gsap.fromTo('.eh-hero-text',
                { y: 50, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.9, stagger: 0.12, ease: 'power3.out', delay: 0.1 }
            );

            // Tier cards entrance
            gsap.fromTo('.eh-tier-card',
                { y: 40, opacity: 0 },
                {
                    y: 0, opacity: 1,
                    duration: 0.7, stagger: 0.1, ease: 'power3.out',
                    scrollTrigger: { trigger: '.eh-tiers-section', start: 'top 80%' }
                }
            );
        }, pageRef);

        return () => ctx.revert();
    }, []);

    // Animate challenge cards on data change
    useEffect(() => {
        if (loading || !challenges?.length) return;

        const ctx = gsap.context(() => {
            gsap.fromTo('.eh-challenge-card',
                { y: 40, opacity: 0 },
                {
                    y: 0, opacity: 1,
                    duration: 0.6, stagger: 0.06, ease: 'power3.out',
                    scrollTrigger: { trigger: '.eh-challenges-grid', start: 'top 85%' }
                }
            );
        }, pageRef);

        return () => ctx.revert();
    }, [loading, challenges?.length, tierFilter, domainFilter]);

    return (
        <div ref={pageRef} className="flex-1 w-full bg-brutal-bg min-h-screen">

            {/* ═══════════════════════════════════════════════════
                HERO SECTION
            ═══════════════════════════════════════════════════ */}
            <section className="pt-36 pb-16 px-6 md:px-12 lg:px-24 max-w-7xl mx-auto">
                <h1 className="eh-hero-text font-heading font-bold text-3xl sm:text-5xl md:text-7xl uppercase tracking-tight-heading">
                    Explorer Hub
                </h1>
                <p className="eh-hero-text font-heading text-base md:text-lg text-brutal-dark/55 max-w-lg mt-6 leading-relaxed">
                    The central repository for technical challenges, architectural blueprints,
                    and cross-domain engineering missions. Prototype. Deploy. Ascend.
                </p>
            </section>

            {/* ═══════════════════════════════════════════════════
                ACCESS TIERS — 3 cards showing tier progression
            ═══════════════════════════════════════════════════ */}
            <section className="eh-tiers-section px-6 md:px-12 lg:px-24 max-w-7xl mx-auto pb-20">
                <div className="flex items-center gap-3 mb-8">
                    <span className="font-data text-[10px] text-brutal-dark/30 font-bold uppercase tracking-widest">01</span>
                    <h2 className="font-heading font-bold text-lg uppercase tracking-tight-heading">Access Tiers</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {TIER_INFO.map((tier, i) => {
                        const isActive = tierFilter === tier.key || tierFilter === 'All';
                        const Icon = tier.icon;

                        return (
                            <button
                                key={tier.key}
                                onClick={() => setTierFilter(tierFilter === tier.key ? 'All' : tier.key)}
                                className={`eh-tier-card text-left p-6 rounded-2xl border-2 transition-all duration-300 group
                                    ${isActive && tierFilter !== 'All'
                                        ? 'border-brutal-red bg-brutal-bg shadow-[0_4px_24px_rgba(196,41,30,0.06)]'
                                        : 'border-brutal-dark/10 bg-brutal-bg hover:border-brutal-dark/25'}`}
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <span className={`font-data text-[9px] font-bold uppercase tracking-[0.2em]
                                        ${isActive && tierFilter !== 'All' ? 'text-brutal-red' : 'text-brutal-dark/35'}`}>
                                        {tierFilter !== 'All' && tierFilter === tier.key ? 'Active Pathway' : `Tier ${i + 1} Access`}
                                    </span>
                                    <Icon size={20} className={`transition-colors ${isActive && tierFilter !== 'All'
                                        ? 'text-brutal-red' : 'text-brutal-dark/20'}`} />
                                </div>

                                <h3 className="font-heading font-bold text-xl uppercase tracking-tight-heading mb-1.5">
                                    {tier.name}
                                </h3>
                                <p className="font-data text-xs text-brutal-dark/50 leading-relaxed">
                                    {tier.subtitle}
                                </p>

                                {/* Progress indicator line */}
                                <div className="w-full h-0.5 bg-brutal-dark/8 rounded-full mt-5">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500
                                            ${isActive && tierFilter !== 'All' ? 'bg-brutal-red w-full' : 'bg-brutal-dark/15 w-0'}`}
                                    />
                                </div>
                            </button>
                        );
                    })}
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════
                ACTIVE CHALLENGES — domain filters + card grid
            ═══════════════════════════════════════════════════ */}
            <section className="px-6 md:px-12 lg:px-24 max-w-7xl mx-auto pb-32">
                {/* Section header with domain filter pills */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-3">
                        <span className="font-data text-[10px] text-brutal-dark/30 font-bold uppercase tracking-widest">02</span>
                        <h2 className="font-heading font-bold text-lg uppercase tracking-tight-heading">Active Challenges</h2>
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="font-data text-[10px] font-bold uppercase text-brutal-dark/40 tracking-widest">
                            Domain:
                        </span>
                        <div className="relative w-full sm:w-auto">
                            <select
                                className="appearance-none bg-brutal-bg border-2 border-brutal-dark/15 rounded-full
                                           w-full sm:w-auto px-5 py-2 pr-9 font-data text-xs font-bold uppercase tracking-wider
                                           focus:outline-none focus:border-brutal-dark transition-colors cursor-pointer"
                                value={domainFilter}
                                onChange={(e) => setDomainFilter(e.target.value)}
                            >
                                {DOMAINS.map(d => (
                                    <option key={d} value={d}>{d}</option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-brutal-dark/40 pointer-events-none" />
                        </div>
                    </div>
                </div>

                {/* Count */}
                {!loading && challenges && (
                    <p className="font-data text-[10px] text-brutal-dark/30 font-bold uppercase tracking-widest mb-6 text-right">
                        Showing {visibleChallenges.length} of {challenges.length} challenge{challenges.length !== 1 ? 's' : ''}
                    </p>
                )}

                {/* Challenge cards grid */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[...Array(6)].map((_, i) => <ChallengeSkeleton key={i} />)}
                    </div>
                ) : (
                    <>
                        <div className="eh-challenges-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {visibleChallenges.map(challenge => (
                                <MagneticCard
                                    key={challenge.id}
                                    className="eh-challenge-card"
                                    glowOnHover
                                    intensity={5}
                                >
                                    <Link to={`/challenges/${challenge.id}`} className="block h-full">
                                        <Card className="h-full flex flex-col hover:border-brutal-dark/25 transition-colors duration-300">
                                            {/* Image */}
                                            <div className="h-48 w-full overflow-hidden bg-brutal-dark relative group">
                                                {challenge.cover_image_url ? (
                                                    <img
                                                        src={challenge.cover_image_url}
                                                        alt={challenge.title}
                                                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100
                                                                   group-hover:scale-105 transition-all duration-700 ease-out"
                                                    />
                                                ) : (
                                                    <div
                                                        className="w-full h-full"
                                                        style={{
                                                            backgroundImage: 'radial-gradient(circle, rgba(245,243,238,0.06) 1px, transparent 1px)',
                                                            backgroundSize: '20px 20px',
                                                        }}
                                                    />
                                                )}

                                                {/* Badges overlay */}
                                                <div className="absolute top-3 left-3 flex gap-1.5">
                                                    {challenge.tier && (
                                                        <span className="bg-brutal-dark/80 text-brutal-bg px-2 py-0.5 text-[9px] font-bold font-data rounded uppercase tracking-wider backdrop-blur-sm">
                                                            {challenge.tier}
                                                        </span>
                                                    )}
                                                    {challenge.domain && (
                                                        <span className={`px-2 py-0.5 text-[9px] font-bold font-data rounded uppercase tracking-wider ${getDomainBadgeClass(challenge.domain)}`}>
                                                            {normalizeDomain(challenge.domain)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Content */}
                                            <div className="p-5 flex-1 flex flex-col">
                                                <h3 className="font-heading font-bold text-lg mb-1.5 leading-tight line-clamp-2 group-hover:text-brutal-red transition-colors">
                                                    {challenge.title}
                                                </h3>

                                                {challenge.mystery && (
                                                    <p className="font-data text-xs text-brutal-dark/50 leading-relaxed mb-4 line-clamp-2">
                                                        {challenge.mystery}
                                                    </p>
                                                )}

                                                <div className="flex items-center justify-between mt-auto pt-4 border-t border-brutal-dark/5">
                                                    <span className="font-data text-[10px] font-bold text-brutal-red uppercase tracking-wider flex items-center gap-1.5 group-hover:gap-2.5 transition-all">
                                                        View Blueprint <ArrowRight size={12} />
                                                    </span>
                                                    {challenge.time_estimate && (
                                                        <span className="font-data text-[10px] text-brutal-dark/35 font-bold flex items-center gap-1 uppercase">
                                                            <Clock size={11} /> {challenge.time_estimate}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </Card>
                                    </Link>
                                </MagneticCard>
                            ))}

                            {(challenges || []).length === 0 && (
                                <div className="col-span-full py-20 text-center font-data text-sm text-brutal-dark/30 border-2 border-dashed border-brutal-dark/10 rounded-2xl">
                                    No challenges found for this filter.
                                </div>
                            )}
                        </div>

                        {/* Load More */}
                        {hasMore && (
                            <div className="flex justify-center mt-12">
                                <button
                                    onClick={() => setVisibleCount(prev => prev + 9)}
                                    className="flex items-center gap-3 px-8 py-3.5 bg-brutal-dark text-brutal-bg font-data text-xs font-bold
                                               uppercase tracking-widest rounded-full hover:bg-brutal-red transition-colors duration-300
                                               shadow-[0_4px_20px_rgba(17,17,17,0.15)] hover:shadow-[0_4px_24px_rgba(196,41,30,0.2)]"
                                >
                                    Load More Archives
                                    <Loader2 size={14} className="opacity-50" />
                                </button>
                            </div>
                        )}
                    </>
                )}
            </section>
        </div>
    );
}
