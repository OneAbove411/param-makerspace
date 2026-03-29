import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Globe } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

/**
 * WhyParam — Section 3
 *
 * Design critique of previous version:
 * - "Curiosity in." with a [+] expand button to reveal "Innovation out." is absurd.
 *   These are 3-word phrases. Hiding half behind a click adds friction, not intrigue.
 * - Three different icon animations (spin, pulse, orbit) = visual inconsistency.
 *   A Reddit/UX critic would say "why is the cog spinning but the rocket floating?"
 *
 * New approach:
 * - Show ALL content directly. It's already short — no expandable needed.
 * - Each statement pair is a full-width row: left phrase → right phrase
 * - Animation: scroll-triggered stagger reveal, each row slides in from left.
 *   This matches the READING direction (left→right) and the MEANING (input→output).
 * - NO icon animations. The text IS the content. Icons were decorative noise.
 * - Clean dividers between rows that draw in on scroll.
 * - Globe footer kept — it's a nice punctuation mark.
 */

const STATEMENTS = [
    { left: 'Curiosity in.', right: 'Innovation out.' },
    { left: 'No degrees required.', right: 'No gatekeeping.' },
    { left: 'Build real things.', right: 'Ship to the real world.' },
];

export function WhyParam() {
    const sectionRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            // Section label
            gsap.fromTo('.why-label',
                { opacity: 0, x: -20 },
                {
                    opacity: 1, x: 0,
                    duration: 0.8, ease: 'power2.out',
                    scrollTrigger: { trigger: sectionRef.current, start: 'top 75%' }
                }
            );

            // Top divider draws in
            gsap.fromTo('.why-divider-top',
                { scaleX: 0 },
                {
                    scaleX: 1, duration: 1.2, ease: 'power2.inOut',
                    scrollTrigger: { trigger: sectionRef.current, start: 'top 75%' }
                }
            );

            // Each statement row — left slides from left, right slides from right
            gsap.utils.toArray<HTMLElement>('.why-row').forEach((row, i) => {
                const left = row.querySelector('.why-left');
                const right = row.querySelector('.why-right');
                const arrow = row.querySelector('.why-arrow');

                if (left) {
                    gsap.fromTo(left,
                        { opacity: 0, x: -40 },
                        {
                            opacity: 1, x: 0,
                            duration: 0.8, ease: 'power2.out',
                            scrollTrigger: { trigger: row, start: 'top 80%' }
                        }
                    );
                }

                if (arrow) {
                    gsap.fromTo(arrow,
                        { opacity: 0, scaleX: 0 },
                        {
                            opacity: 0.3, scaleX: 1,
                            duration: 0.6, ease: 'power2.out', delay: 0.2,
                            scrollTrigger: { trigger: row, start: 'top 80%' }
                        }
                    );
                }

                if (right) {
                    gsap.fromTo(right,
                        { opacity: 0, x: 40 },
                        {
                            opacity: 1, x: 0,
                            duration: 0.8, ease: 'power2.out', delay: 0.15,
                            scrollTrigger: { trigger: row, start: 'top 80%' }
                        }
                    );
                }
            });

            // Row dividers draw in
            gsap.utils.toArray<HTMLElement>('.why-divider').forEach((el) => {
                gsap.fromTo(el,
                    { scaleX: 0 },
                    {
                        scaleX: 1, duration: 0.8, ease: 'power2.inOut',
                        scrollTrigger: { trigger: el, start: 'top 85%' }
                    }
                );
            });

            // Globe footer
            gsap.fromTo('.why-footer',
                { opacity: 0, y: 20 },
                {
                    opacity: 1, y: 0,
                    duration: 0.8, ease: 'power2.out',
                    scrollTrigger: { trigger: '.why-footer', start: 'top 85%' }
                }
            );

            // Globe — slow continuous rotation (contextual: it's a globe, globes spin)
            gsap.to('.why-globe', {
                rotation: 360, duration: 20, repeat: -1, ease: 'none',
            });
        }, sectionRef);
        return () => ctx.revert();
    }, []);

    return (
        <section
            ref={sectionRef}
            className="py-24 md:py-32 px-6 md:px-12 lg:px-24 bg-brutal-dark text-brutal-bg"
        >
            <div className="why-divider-top w-full h-px bg-brutal-bg/10 origin-left mb-16" />

            <div className="max-w-4xl mx-auto">
                {/* Label */}
                <div className="why-label flex items-center gap-3 mb-16">
                    <span className="font-data text-lg text-brutal-bg/20">{'{'}</span>
                    <span className="font-data text-xs text-brutal-bg/60 uppercase tracking-[0.25em] font-bold">
                        Why Param
                    </span>
                    <span className="font-data text-lg text-brutal-bg/20">{'}'}</span>
                </div>

                {/* Statement rows — all content visible, no expandable */}
                {STATEMENTS.map((s, idx) => (
                    <div key={idx}>
                        <div className="why-row flex flex-col md:flex-row md:items-center gap-4 md:gap-8 py-10 md:py-12">
                            {/* Left phrase */}
                            <div className="why-left flex-1">
                                <span className="font-heading text-lg sm:text-xl md:text-3xl lg:text-4xl font-bold tracking-tight">
                                    {s.left}
                                </span>
                            </div>

                            {/* Arrow connector — hidden on mobile */}
                            <div className="why-arrow hidden md:block w-12 h-px bg-brutal-red/30 origin-left flex-shrink-0" />

                            {/* Right phrase */}
                            <div className="why-right flex-1 md:text-right">
                                <span className="font-heading text-lg sm:text-xl md:text-3xl lg:text-4xl font-bold tracking-tight text-brutal-bg/70">
                                    {s.right}
                                </span>
                            </div>
                        </div>

                        {idx < STATEMENTS.length - 1 && (
                            <div className="why-divider w-full h-px bg-brutal-bg/8 origin-left" />
                        )}
                    </div>
                ))}

                {/* Footer */}
                <div className="why-footer flex items-center justify-center gap-3 mt-16 pt-16 border-t border-brutal-bg/8">
                    <Globe size={20} className="why-globe text-brutal-red flex-shrink-0" strokeWidth={1.5} />
                    <span className="font-heading text-base md:text-lg text-brutal-bg/60">
                        Built in India. Open to the world.
                    </span>
                </div>
            </div>
        </section>
    );
}
