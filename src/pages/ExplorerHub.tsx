import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Loader2, ArrowRight, Sparkles } from 'lucide-react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { useChallenges, useEvents, useMakers } from '../lib/hooks';
import { useAuth } from '../lib/auth';
import { cn } from '../lib/utils';
import { TierPathway, type TierPathwayProps } from '../components/challenges/TierPathway';
import { ChallengeCard } from '../components/challenges/ChallengeCard';
import { DOMAIN_OPTIONS } from '../components/challenges/ExplorerHubCommandBar';
import type { ExplorerTier } from '../components/challenges/ExplorerHubCommandBar';

gsap.registerPlugin(ScrollTrigger);

// ─────────────────────────────────────────────────────────────
// Explorer Hub Landing Page
//
// Dedicated `/explorer-hub` landing page with:
//   • Hero section with dramatic heading and CTA
//   • TierPathway component showing 3-tier progression
//   • Domain showcase cards
//   • Stats strip (challenges, events, makers count)
//   • Featured challenges (3 newest)
//   • Bottom CTA section
//   • GSAP entrance animations
// ─────────────────────────────────────────────────────────────

/**
 * Skeleton loader for challenge cards during data fetch.
 */
function ChallengeSkeleton() {
    return (
        <div className="rounded-2xl border-2 border-brutal-dark/10 bg-brutal-dark/[0.02] overflow-hidden animate-pulse">
            <div className="h-48 bg-brutal-dark/10" />
            <div className="p-5 space-y-3">
                <div className="h-4 bg-brutal-dark/10 rounded w-3/4" />
                <div className="h-6 bg-brutal-dark/10 rounded w-5/6" />
                <div className="h-10 bg-brutal-dark/10 rounded w-full" />
            </div>
        </div>
    );
}

/**
 * Stats tile — shows count + label.
 */
function StatTile({
    count,
    label,
    isLoading = false,
}: {
    count: number | null;
    label: string;
    isLoading?: boolean;
}) {
    return (
        <div className="flex flex-col items-center justify-center p-5 rounded-xl border-2 border-brutal-dark/15 bg-brutal-bg/50">
            {isLoading ? (
                <Loader2 size={20} className="animate-spin text-brutal-red mb-2" />
            ) : (
                <div className="font-heading font-bold text-3xl text-brutal-red mb-1">
                    {count ?? '—'}
                </div>
            )}
            <span className="font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/60 text-center">
                {label}
            </span>
        </div>
    );
}

/**
 * Domain card for the showcase section.
 */
function DomainCard({
    domain,
    onNavigate,
}: {
    domain: string;
    onNavigate: (domain: string) => void;
}) {
    return (
        <button
            type="button"
            onClick={() => onNavigate(domain)}
            className={cn(
                'px-5 py-3 rounded-xl border-2 border-brutal-dark/15',
                'bg-brutal-bg hover:border-brutal-red/40 hover:bg-brutal-dark/[0.02]',
                'font-data text-sm font-bold uppercase tracking-wider text-brutal-dark',
                'transition-all duration-150 ease-out',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-brutal-red focus-visible:ring-offset-2 focus-visible:ring-offset-brutal-bg',
                domain === 'All' && 'border-brutal-red/40 text-brutal-red',
            )}
        >
            {domain}
        </button>
    );
}

/**
 * Main Explorer Hub Landing Page
 */
export function ExplorerHub() {
    const { user } = useAuth();
    const navigate = useNavigate();

    // State management
    const [activeTier, setActiveTier] = useState<ExplorerTier>('All');

    // Fetch data
    const { data: allChallenges, loading: isChallengesLoading } = useChallenges('All', 'All');
    const { data: allEvents, loading: isEventsLoading } = useEvents();
    const { data: allMakers, loading: isMakersLoading } = useMakers();

    // Animation refs
    const heroTextRef = useRef<HTMLDivElement>(null);
    const statsRef = useRef<HTMLDivElement>(null);

    // Handle tier change with navigation
    const handleTierChange: TierPathwayProps['onTierChange'] = (next) => {
        setActiveTier(next);
        if (next !== 'All') {
            navigate(`/challenges?tier=${encodeURIComponent(next)}`);
        }
    };

    // Handle domain selection with navigation
    const handleDomainSelect = (domain: string) => {
        if (domain !== 'All') {
            navigate(`/challenges?domain=${encodeURIComponent(domain)}`);
        }
    };

    // GSAP entrance animations
    useEffect(() => {
        if (!heroTextRef.current) return;

        const textElements = heroTextRef.current.querySelectorAll('.eh-landing-text');
        if (textElements.length === 0) return;

        // Animate text elements in with fade + translate
        gsap.fromTo(
            textElements,
            {
                opacity: 0,
                y: 20,
            },
            {
                opacity: 1,
                y: 0,
                duration: 0.8,
                stagger: 0.15,
                ease: 'power2.out',
                delay: 0.1,
            }
        );
    }, []);

    // Animate stats on scroll
    useEffect(() => {
        if (!statsRef.current) return;

        const statElements = statsRef.current.querySelectorAll('.stat-tile');
        if (statElements.length === 0) return;

        gsap.fromTo(
            statElements,
            { opacity: 0, scale: 0.95 },
            {
                opacity: 1,
                scale: 1,
                duration: 0.6,
                stagger: 0.1,
                ease: 'back.out',
                scrollTrigger: {
                    trigger: statsRef.current,
                    start: 'top 80%',
                    toggleActions: 'play none none none',
                },
            }
        );
    }, []);

    // Get featured challenges (3 newest)
    const featuredChallenges = (allChallenges || [])
        .sort((a, b) => {
            const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
            const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
            return dateB - dateA;
        })
        .slice(0, 3);

    // Calculate stats
    const statsTotal = {
        challenges: allChallenges?.length ?? 0,
        events: allEvents?.length ?? 0,
        makers: allMakers?.length ?? 0,
    };

    return (
        <div className="flex-1 w-full bg-brutal-bg overflow-hidden relative">
            {/* ─── HERO SECTION ─────────────────────────────── */}
            <section className="pt-28 md:pt-32 px-6 md:px-12 lg:px-24 pb-16 md:pb-20">
                <div className="max-w-7xl mx-auto">
                    {/* Label */}
                    <div className="mb-4">
                        <span className="font-data text-[10px] font-bold uppercase tracking-[0.25em] text-brutal-red">
                            Welcome to Param
                        </span>
                    </div>

                    {/* Hero text */}
                    <div ref={heroTextRef} className="space-y-4 md:space-y-6 mb-8">
                        <h1 className="eh-landing-text font-heading font-bold text-4xl md:text-5xl lg:text-6xl uppercase tracking-tight-heading text-brutal-dark leading-[1.1]">
                            Your Maker Journey Starts Here
                        </h1>

                        <p className="eh-landing-text font-data text-lg md:text-xl text-brutal-dark/70 max-w-2xl leading-relaxed">
                            Progress through three tiers — Explorer, Solver, Architect — and build real
                            projects across electronics, robotics, AI, design, and more.
                        </p>

                        {/* CTA Button */}
                        <div className="eh-landing-text flex gap-4 pt-4">
                            <Link
                                to="/challenges"
                                className={cn(
                                    'inline-flex items-center gap-2 px-6 py-3 rounded-full',
                                    'font-heading font-bold uppercase tracking-wider text-brutal-bg',
                                    'bg-brutal-red border-2 border-brutal-red',
                                    'hover:translate-x-[-2px] hover:translate-y-[-2px]',
                                    'shadow-[4px_4px_0_0_rgba(196,41,30,0.6)]',
                                    'hover:shadow-[6px_6px_0_0_rgba(196,41,30,0.8)]',
                                    'transition-all duration-150 ease-out',
                                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-brutal-bg focus-visible:ring-brutal-dark',
                                )}
                            >
                                Browse Blueprints
                                <ArrowRight size={16} />
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── TIER PATHWAY ─────────────────────────────── */}
            <section className="px-6 md:px-12 lg:px-24 pb-16 md:pb-20">
                <div className="max-w-7xl mx-auto">
                    <TierPathway activeTier={activeTier} onTierChange={handleTierChange} />
                </div>
            </section>

            {/* ─── DOMAIN SHOWCASE ──────────────────────────── */}
            <section className="px-6 md:px-12 lg:px-24 pb-16 md:pb-20">
                <div className="max-w-7xl mx-auto">
                    <div className="mb-4">
                        <h2 className="font-heading font-bold text-sm uppercase tracking-tight-heading text-brutal-dark mb-2">
                            Explore Domains
                        </h2>
                        <p className="font-data text-[10px] text-brutal-dark/40 font-bold uppercase tracking-widest">
                            Click to browse projects by discipline
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2 md:gap-3">
                        {DOMAIN_OPTIONS.map((domain) => (
                            <DomainCard
                                key={domain}
                                domain={domain}
                                onNavigate={handleDomainSelect}
                            />
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── STATS STRIP ──────────────────────────────── */}
            <section className="px-6 md:px-12 lg:px-24 pb-16 md:pb-20">
                <div className="max-w-7xl mx-auto">
                    <div
                        ref={statsRef}
                        className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6"
                    >
                        <div className="stat-tile">
                            <StatTile
                                count={statsTotal.challenges}
                                label="Blueprints Available"
                                isLoading={isChallengesLoading}
                            />
                        </div>
                        <div className="stat-tile">
                            <StatTile
                                count={statsTotal.events}
                                label="Live Events"
                                isLoading={isEventsLoading}
                            />
                        </div>
                        <div className="stat-tile">
                            <StatTile
                                count={statsTotal.makers}
                                label="Makers in Community"
                                isLoading={isMakersLoading}
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── FEATURED CHALLENGES ──────────────────────── */}
            {featuredChallenges.length > 0 && (
                <section className="px-6 md:px-12 lg:px-24 pb-16 md:pb-20">
                    <div className="max-w-7xl mx-auto">
                        <div className="mb-6">
                            <h2 className="font-heading font-bold text-lg uppercase tracking-tight-heading text-brutal-dark mb-2">
                                Featured Blueprints
                            </h2>
                            <p className="font-data text-[10px] text-brutal-dark/40 font-bold uppercase tracking-widest">
                                Three newest blueprints to inspire your next project
                            </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {featuredChallenges.map((challenge) => (
                                <ChallengeCard
                                    key={challenge.id}
                                    challenge={challenge}
                                    variant="medium"
                                    isBookmarked={false}
                                />
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* ─── FEATURED CHALLENGES SKELETON ───────────── */}
            {isChallengesLoading && (
                <section className="px-6 md:px-12 lg:px-24 pb-16 md:pb-20">
                    <div className="max-w-7xl mx-auto">
                        <div className="mb-6">
                            <h2 className="font-heading font-bold text-lg uppercase tracking-tight-heading text-brutal-dark mb-2">
                                Featured Blueprints
                            </h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {[0, 1, 2].map((i) => (
                                <ChallengeSkeleton key={i} />
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* ─── BOTTOM CTA SECTION ───────────────────────── */}
            <section className="px-6 md:px-12 lg:px-24 pb-20 md:pb-28">
                <div className="max-w-4xl mx-auto">
                    <div className="rounded-2xl border-2 border-brutal-dark/15 bg-brutal-dark/[0.02] p-8 md:p-10 lg:p-12 text-center">
                        <div className="mb-4">
                            <Sparkles
                                size={28}
                                className="text-brutal-red mx-auto mb-3"
                                strokeWidth={1.5}
                            />
                        </div>

                        <h2 className="font-heading font-bold text-2xl md:text-3xl uppercase tracking-tight-heading text-brutal-dark mb-3">
                            Ready to Start?
                        </h2>

                        <p className="font-data text-base text-brutal-dark/70 mb-6 leading-relaxed">
                            Join thousands of makers building amazing things. Pick a blueprint and begin
                            your journey today.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link
                                to="/challenges"
                                className={cn(
                                    'inline-flex items-center gap-2 px-6 py-3 rounded-full',
                                    'font-heading font-bold uppercase tracking-wider text-brutal-bg',
                                    'bg-brutal-red border-2 border-brutal-red',
                                    'hover:translate-x-[-2px] hover:translate-y-[-2px]',
                                    'shadow-[4px_4px_0_0_rgba(196,41,30,0.6)]',
                                    'hover:shadow-[6px_6px_0_0_rgba(196,41,30,0.8)]',
                                    'transition-all duration-150 ease-out',
                                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-brutal-bg focus-visible:ring-brutal-dark',
                                )}
                            >
                                Browse All Blueprints
                                <ArrowRight size={16} />
                            </Link>

                            {!user && (
                                <Link
                                    to="/register"
                                    className={cn(
                                        'inline-flex items-center gap-2 px-6 py-3 rounded-full',
                                        'font-heading font-bold uppercase tracking-wider text-brutal-dark',
                                        'bg-transparent border-2 border-brutal-dark/15',
                                        'hover:border-brutal-dark/40 hover:bg-brutal-dark/[0.02]',
                                        'transition-all duration-150 ease-out',
                                        'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-brutal-bg focus-visible:ring-brutal-red',
                                    )}
                                >
                                    Create Account
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
