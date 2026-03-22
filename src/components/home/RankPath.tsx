import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { RANK_ORDER, RANK_THRESHOLDS } from '../../lib/xpEngine';
import { getBadgeIcon } from '../../lib/badgeIcons';

gsap.registerPlugin(ScrollTrigger);

const RANK_DETAILS: Record<string, string> = {
    'Curious':   'Attend intro workshops. Create your first maker profile.',
    'Tinkerer':  'Complete 3 basic projects. Verify 2 machine safety certs.',
    'Builder':   'Lead a small group project. Document 10 successful builds.',
    'Maker':     'Master 3 advanced fabrication tools. Contribute to the wiki.',
    'Innovator': 'Develop an original open-source tool or program.',
    'Lab Pro':   'Instruct 15 workshops. Oversee lab safety for 100+ hours.',
};

export function RankPath() {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            // Section header
            gsap.fromTo('.rp-header',
                { y: 40, opacity: 0 },
                {
                    y: 0, opacity: 1,
                    duration: 0.8, stagger: 0.08,
                    ease: 'power3.out',
                    scrollTrigger: { trigger: containerRef.current, start: 'top 70%' }
                }
            );

            // Subtitle word reveal (Philosophy.tsx pattern)
            gsap.fromTo('.path-word',
                { opacity: 0, y: 20 },
                {
                    opacity: 1, y: 0,
                    duration: 0.5, stagger: 0.05,
                    ease: 'power3.out',
                    scrollTrigger: { trigger: '.path-subtitle', start: 'top 75%' }
                }
            );

            // Rank nodes stagger in
            gsap.fromTo('.rank-node',
                { y: 50, opacity: 0, scale: 0.9 },
                {
                    y: 0, opacity: 1, scale: 1,
                    duration: 0.6, stagger: 0.1,
                    ease: 'power3.out',
                    scrollTrigger: { trigger: '.rank-timeline', start: 'top 80%' }
                }
            );

            // Connecting line draws in (horizontal on desktop)
            gsap.fromTo('.rank-connector',
                { scaleX: 0 },
                {
                    scaleX: 1,
                    duration: 1.2,
                    ease: 'power2.inOut',
                    scrollTrigger: { trigger: '.rank-timeline', start: 'top 80%' }
                }
            );
        }, containerRef);
        return () => ctx.revert();
    }, []);

    const subtitleWords = 'Start as Curious. End as Lab Pro.'.split(' ');

    return (
        <section
            ref={containerRef}
            className="py-32 md:py-40 px-6 md:px-12 lg:px-24 bg-brutal-dark text-brutal-bg relative overflow-hidden"
        >
            {/* Subtle dot texture */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    backgroundImage: 'radial-gradient(circle, rgba(245,243,238,0.04) 1px, transparent 1px)',
                    backgroundSize: '28px 28px',
                }}
            />

            <div className="relative z-10 max-w-6xl mx-auto">
                {/* Header */}
                <p className="rp-header font-data text-xs text-brutal-red uppercase tracking-[0.2em] mb-4">
                    Your Journey
                </p>
                <h2 className="rp-header font-heading font-bold text-4xl md:text-6xl uppercase tracking-tight-heading text-brutal-bg">
                    Your Path
                </h2>

                {/* Subtitle with word-by-word reveal */}
                <p className="path-subtitle mt-6 flex flex-wrap gap-x-2 gap-y-1">
                    {subtitleWords.map((word, i) => (
                        <span
                            key={i}
                            className="path-word inline-block font-drama italic text-2xl md:text-4xl text-brutal-bg/60"
                        >
                            {word}
                        </span>
                    ))}
                </p>

                {/* Rank timeline */}
                <div className="rank-timeline mt-20 relative">
                    {/* Horizontal connector line (desktop only) */}
                    <div className="hidden md:block absolute top-7 left-[8%] right-[8%] h-px">
                        <div className="rank-connector w-full h-full bg-gradient-to-r from-brutal-red/60 via-brutal-red/30 to-brutal-bg/10 origin-left" />
                    </div>

                    {/* Rank nodes */}
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-8 md:gap-4">
                        {RANK_ORDER.map((rank, i) => {
                            const Icon = getBadgeIcon({ name: rank, badge_type: 'achievement', domain: 'General' });
                            const isFirst = i < 2; // First two ranks are "active" styled
                            return (
                                <div
                                    key={rank}
                                    className="rank-node flex flex-col items-center text-center"
                                >
                                    {/* Icon circle */}
                                    <div className={`
                                        w-14 h-14 rounded-full flex items-center justify-center relative z-10
                                        border-2 transition-all duration-500
                                        ${isFirst
                                            ? 'bg-brutal-red/15 border-brutal-red/40'
                                            : 'bg-brutal-bg/5 border-brutal-bg/15'
                                        }
                                    `}>
                                        <Icon
                                            size={22}
                                            className={isFirst ? 'text-brutal-bg' : 'text-brutal-bg/35'}
                                            strokeWidth={1.5}
                                        />
                                    </div>

                                    {/* Rank name */}
                                    <h3 className={`
                                        font-heading font-bold text-sm uppercase mt-4 tracking-tight-heading
                                        ${isFirst ? 'text-brutal-bg' : 'text-brutal-bg/40'}
                                    `}>
                                        {rank}
                                    </h3>

                                    {/* XP threshold */}
                                    <span className="font-data text-[10px] text-brutal-red mt-1 uppercase tracking-widest">
                                        {RANK_THRESHOLDS[rank]} XP
                                    </span>

                                    {/* Unlock description */}
                                    <p className={`
                                        font-data text-[11px] leading-relaxed mt-3 max-w-[150px]
                                        ${isFirst ? 'text-brutal-bg/50' : 'text-brutal-bg/25'}
                                    `}>
                                        {RANK_DETAILS[rank]}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </section>
    );
}
