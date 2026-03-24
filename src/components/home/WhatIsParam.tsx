import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Lightbulb, Users, Rocket } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

/**
 * WhatIsParam — Section 4
 *
 * Design critique of previous version:
 * - Three cards with expandable descriptions. Each description is 2 sentences.
 *   Hiding 2 sentences behind a click is not "minimal design" — it's friction.
 *   A goldfish user sees 3 titles and thinks "I have to click all three to
 *   understand what this place is?" → they scroll past.
 *
 * New approach:
 * - Show everything. The content is already short.
 * - Three vertical cards in a row, each with icon + title + description visible.
 * - Scroll-triggered stagger entrance (cards rise up one by one).
 * - Hover: subtle lift + border color change. No bouncing, no scale pulsing.
 * - Icons: static on load, gentle color shift on hover. No continuous animation
 *   (why would a lightbulb pulse when you're reading text? It's distracting).
 */

const PILLARS = [
    {
        icon: Lightbulb,
        title: 'A Maker is anyone who builds.',
        desc: 'You don\'t need a degree, fancy tools, or years of experience. If you\'re curious enough to try — you\'re already a maker.',
    },
    {
        icon: Users,
        title: 'A community, not a classroom.',
        desc: 'No lectures. You learn by doing — picking projects, getting stuck, asking for help, and figuring it out together.',
    },
    {
        icon: Rocket,
        title: 'Real projects, real impact.',
        desc: 'The things you build here — from 3D-printed prosthetics to interactive art — solve real problems and go out into the world.',
    },
];

export function WhatIsParam() {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            // Accent line draws in
            gsap.fromTo('.wp-line',
                { scaleX: 0 },
                {
                    scaleX: 1, duration: 1, ease: 'power2.inOut',
                    scrollTrigger: { trigger: containerRef.current, start: 'top 75%' }
                }
            );

            // Label + heading
            gsap.fromTo('.wp-header',
                { y: 30, opacity: 0 },
                {
                    y: 0, opacity: 1,
                    duration: 0.7, stagger: 0.08, ease: 'power2.out',
                    scrollTrigger: { trigger: containerRef.current, start: 'top 70%' }
                }
            );

            // Cards stagger in
            gsap.fromTo('.wp-card',
                { y: 60, opacity: 0 },
                {
                    y: 0, opacity: 1,
                    duration: 0.8, stagger: 0.12, ease: 'power2.out',
                    scrollTrigger: { trigger: '.wp-grid', start: 'top 80%' }
                }
            );

            // Icon entrance — pop in with slight overshoot
            gsap.fromTo('.wp-icon',
                { scale: 0 },
                {
                    scale: 1,
                    duration: 0.5, stagger: 0.12,
                    ease: 'back.out(1.7)',
                    scrollTrigger: { trigger: '.wp-grid', start: 'top 78%' }
                }
            );
        }, containerRef);
        return () => ctx.revert();
    }, []);

    return (
        <section
            ref={containerRef}
            className="py-24 md:py-32 px-6 md:px-12 lg:px-24 bg-brutal-bg"
        >
            <div className="max-w-5xl mx-auto">
                {/* Accent line */}
                <div className="wp-line w-16 h-0.5 bg-brutal-red mb-8 origin-left" />

                {/* Header */}
                <p className="wp-header font-data text-xs text-brutal-red uppercase tracking-[0.2em] mb-4">
                    New Here?
                </p>
                <h2 className="wp-header font-heading font-bold text-3xl md:text-5xl uppercase tracking-tight-heading">
                    Here's what you need to know.
                </h2>

                {/* Cards — all content visible */}
                <div className="wp-grid grid grid-cols-1 md:grid-cols-3 gap-8 mt-14">
                    {PILLARS.map((pillar) => {
                        const Icon = pillar.icon;
                        return (
                            <div
                                key={pillar.title}
                                className="wp-card bg-brutal-bg border-2 border-brutal-dark/8 rounded-2xl p-8
                                           hover:border-brutal-red/20 transition-all duration-500
                                           hover:shadow-[0_12px_40px_rgba(196,41,30,0.06)]
                                           hover:-translate-y-1"
                            >
                                {/* Icon */}
                                <div className="wp-icon w-12 h-12 rounded-full bg-brutal-red/10 flex items-center justify-center mb-6">
                                    <Icon size={22} className="text-brutal-red" strokeWidth={1.8} />
                                </div>

                                {/* Title */}
                                <h3 className="font-heading font-bold text-lg tracking-tight-heading leading-snug mb-4">
                                    {pillar.title}
                                </h3>

                                {/* Description — always visible */}
                                <p className="font-data text-sm text-brutal-dark/55 leading-relaxed">
                                    {pillar.desc}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
