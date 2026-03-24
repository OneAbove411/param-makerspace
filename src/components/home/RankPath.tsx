import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { RANK_ORDER, RANK_THRESHOLDS } from '../../lib/xpEngine';
import { getBadgeIcon } from '../../lib/badgeIcons';

gsap.registerPlugin(ScrollTrigger);

/**
 * RankPath — Section 7
 *
 * Design critique of previous version:
 * - Each rank node had independent `y: -3` float + independent `scale: 1.04` pulse
 *   on the icon circles, all with different delays → visual chaos. Looks like
 *   badges are "bouncing" at random. A UX critic would say "is this loading?"
 * - The connector line had opacity pulsing (to 0.7) which made it look broken.
 * - The dot texture had `backgroundPosition` animation — unnecessary movement
 *   in a section where the user is trying to READ rank descriptions.
 *
 * New approach:
 * - ZERO continuous animations on the rank nodes. They appear via scroll-triggered
 *   stagger, then stay still. Stillness = stability = "this is a progression system
 *   you can trust."
 * - Click to expand is JUSTIFIED here — 6 items with descriptions. Showing all
 *   descriptions would be a wall of text.
 * - Connector line: static after entrance. No pulsing.
 * - Hover: icon circle gets a subtle glow. CSS only — no GSAP.
 * - Expand: smooth height animation on click, same as FeaturedProjects.
 */

const RANK_DETAILS: Record<string, string> = {
    'Curious': 'Where everyone starts. Show up, explore, attend your first workshop.',
    'Tinkerer': 'You\'ve completed a few projects and proved you can finish what you start.',
    'Builder': 'You lead small teams and help others learn. 10+ builds under your belt.',
    'Maker': 'You\'ve mastered advanced tools and contribute knowledge back to the community.',
    'Innovator': 'You\'ve created something original — an open-source tool, a new technique, a program.',
    'Lab Pro': 'The highest rank. You teach, mentor, and help run the lab itself.',
};

export function RankPath() {
    const containerRef = useRef<HTMLDivElement>(null);
    const [expandedRank, setExpandedRank] = useState<string | null>(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            // Accent line
            gsap.fromTo('.rp-line',
                { scaleX: 0 },
                {
                    scaleX: 1, duration: 1, ease: 'power2.inOut',
                    scrollTrigger: { trigger: containerRef.current, start: 'top 75%' }
                }
            );

            // Header
            gsap.fromTo('.rp-header',
                { y: 30, opacity: 0 },
                {
                    y: 0, opacity: 1,
                    duration: 0.7, stagger: 0.08, ease: 'power2.out',
                    scrollTrigger: { trigger: containerRef.current, start: 'top 70%' }
                }
            );

            // Rank nodes stagger in
            gsap.fromTo('.rank-node',
                { y: 40, opacity: 0, scale: 0.9 },
                {
                    y: 0, opacity: 1, scale: 1,
                    duration: 0.6, stagger: 0.08,
                    ease: 'power2.out',
                    scrollTrigger: { trigger: '.rank-timeline', start: 'top 80%' }
                }
            );

            // Connector line draws in
            gsap.fromTo('.rank-connector',
                { scaleX: 0 },
                {
                    scaleX: 1, duration: 1.2, ease: 'power2.inOut',
                    scrollTrigger: { trigger: '.rank-timeline', start: 'top 80%' }
                }
            );

            // NO continuous animations. Nodes stay still after entrance.
        }, containerRef);
        return () => ctx.revert();
    }, []);

    return (
        <section
            ref={containerRef}
            className="py-24 md:py-32 px-6 md:px-12 lg:px-24 bg-brutal-dark text-brutal-bg"
        >
            <div className="max-w-6xl mx-auto">
                {/* Accent line */}
                <div className="rp-line w-16 h-0.5 bg-brutal-red mb-8 origin-left" />

                {/* Header */}
                <p className="rp-header font-data text-xs text-brutal-red uppercase tracking-[0.2em] mb-4">
                    Your Growth
                </p>
                <h2 className="rp-header font-heading font-bold text-3xl md:text-5xl uppercase tracking-tight-heading text-brutal-bg">
                    Six ranks. One journey.
                </h2>
                <p className="rp-header font-data text-sm text-brutal-bg/40 mt-4 max-w-xl leading-relaxed">
                    Build projects, earn XP, and climb through ranks. Each rank unlocks new tools,
                    responsibilities, and recognition.
                </p>
                <p className="rp-header font-drama italic text-xl md:text-2xl text-brutal-bg/60 mt-6">
                    Everyone starts at Curious. Where you go is up to you.
                </p>

                {/* Rank timeline */}
                <div className="rank-timeline mt-16 relative">
                    {/* Horizontal connector line (desktop) */}
                    <div className="hidden md:block absolute top-7 left-[8%] right-[8%] h-px">
                        <div className="rank-connector w-full h-full bg-gradient-to-r from-brutal-red/50 via-brutal-red/25 to-brutal-bg/10 origin-left" />
                    </div>

                    {/* Rank nodes */}
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-6 md:gap-4">
                        {RANK_ORDER.map((rank) => (
                            <RankNode
                                key={rank}
                                rank={rank}
                                isExpanded={expandedRank === rank}
                                onClick={() => setExpandedRank(expandedRank === rank ? null : rank)}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

interface RankNodeProps {
    rank: string;
    isExpanded: boolean;
    onClick: () => void;
}

function RankNode({ rank, isExpanded, onClick }: RankNodeProps) {
    const Icon = getBadgeIcon({ name: rank, badge_type: 'achievement', domain: 'General' });
    const threshold = RANK_THRESHOLDS[rank];
    const description = RANK_DETAILS[rank];
    const expandRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!expandRef.current || !contentRef.current) return;

        if (isExpanded) {
            const height = contentRef.current.scrollHeight;
            gsap.to(expandRef.current, {
                height, duration: 0.4, ease: 'power2.out', overwrite: 'auto',
            });
        } else {
            gsap.to(expandRef.current, {
                height: 0, duration: 0.3, ease: 'power2.inOut', overwrite: 'auto',
            });
        }
    }, [isExpanded]);

    return (
        <div
            className="rank-node flex flex-col items-center text-center cursor-pointer"
            onClick={onClick}
        >
            {/* Icon circle — CSS hover only, no GSAP continuous */}
            <div
                className={`
                    w-14 h-14 rounded-full flex items-center justify-center relative z-10
                    border-2 transition-all duration-300
                    ${isExpanded
                        ? 'bg-brutal-red/20 border-brutal-red/60'
                        : 'bg-brutal-bg/5 border-brutal-bg/15 hover:bg-brutal-bg/10 hover:border-brutal-bg/25'
                    }
                `}
            >
                <Icon
                    size={22}
                    className={`transition-colors duration-300 ${
                        isExpanded ? 'text-brutal-red' : 'text-brutal-bg/40'
                    }`}
                    strokeWidth={1.5}
                />
            </div>

            {/* Rank name */}
            <h3 className={`font-heading font-bold text-sm uppercase mt-4 tracking-tight-heading
                transition-colors duration-300
                ${isExpanded ? 'text-brutal-red' : 'text-brutal-bg/50 hover:text-brutal-bg/70'}`}
            >
                {rank}
            </h3>

            {/* Expandable content */}
            <div ref={expandRef} className="overflow-hidden mt-2" style={{ height: 0 }}>
                <div ref={contentRef} className="pt-1">
                    <span className="font-data text-[10px] text-brutal-red uppercase tracking-widest block mb-2">
                        {threshold} XP
                    </span>
                    <p className="font-data text-[11px] leading-relaxed max-w-[150px] text-brutal-bg/60">
                        {description}
                    </p>
                </div>
            </div>
        </div>
    );
}
