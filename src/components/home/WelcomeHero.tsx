import { useEffect, useRef, useCallback } from 'react';
import { gsap } from 'gsap';
import { ChevronDown } from 'lucide-react';
import { InteractiveRobotSpline } from '../ui/interactive-3d-robot';

/**
 * WelcomeHero — Viewport 1
 *
 * gsap.com-inspired: ONE strong text animation, minimal decoration.
 * - Character reveal for "Welcome" with 3D flip
 * - Clean subtitle fade
 * - Single breathing accent line
 * - Cursor-following glow (subtle)
 * - Dot grid background with slow drift
 * - NO particle fields, NO floating shapes, NO spinning crosses
 *
 * Design rationale: gsap.com's hero has ONE animation focus (the text).
 * Everything else is quiet. Multiple floating shapes = visual noise
 * that competes with the headline for a goldfish-attention user.
 */

export function WelcomeHero() {
    const sectionRef = useRef<HTMLDivElement>(null);
    const glowRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            // Phase 1: Character-by-character "Welcome" — the ONE hero animation
            gsap.fromTo('.welcome-char',
                { opacity: 0, y: 80, rotateX: -90, transformOrigin: '50% 100%' },
                {
                    opacity: 1, y: 0, rotateX: 0,
                    duration: 0.7, stagger: 0.04,
                    ease: 'power2.out', delay: 0.2,
                }
            );

            // Phase 2: Subtitle slides up
            gsap.fromTo('.welcome-subtitle',
                { opacity: 0, y: 30 },
                { opacity: 1, y: 0, duration: 1, ease: 'power2.out', delay: 0.8 }
            );

            // Phase 3: Tagline
            gsap.fromTo('.welcome-tagline',
                { opacity: 0, y: 15 },
                { opacity: 0.5, y: 0, duration: 1, ease: 'power2.out', delay: 1.2 }
            );

            // Phase 4: Accent line draws in, then breathes
            gsap.fromTo('.welcome-line',
                { scaleX: 0 },
                { scaleX: 1, duration: 1.2, ease: 'power2.inOut', delay: 1.4 }
            );
            gsap.to('.welcome-line', {
                scaleX: 0.6, duration: 4, repeat: -1, yoyo: true,
                ease: 'sine.inOut', delay: 3,
            });

            // Phase 5: CTA button
            gsap.fromTo('.welcome-cta',
                { opacity: 0, y: 15 },
                { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out', delay: 1.7 }
            );

            // Phase 6: Scroll indicator
            gsap.fromTo('.welcome-scroll',
                { opacity: 0 },
                { opacity: 1, duration: 1, delay: 2.2 }
            );

            // Dot grid — slow diagonal drift (continuous, very subtle)
            gsap.to('.hero-grid', {
                backgroundPosition: '64px 64px',
                duration: 25,
                repeat: -1,
                ease: 'none',
            });
        }, sectionRef);
        return () => ctx.revert();
    }, []);

    // Cursor glow — subtle radial gradient follows mouse
    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!glowRef.current) return;
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        glowRef.current.style.background =
            `radial-gradient(circle 600px at ${x}px ${y}px, rgba(196,41,30,0.04) 0%, transparent 70%)`;
    }, []);

    const handleMouseLeave = useCallback(() => {
        if (glowRef.current) {
            gsap.to(glowRef.current, {
                opacity: 0, duration: 0.8, ease: 'power2.out',
                onComplete: () => {
                    if (glowRef.current) {
                        glowRef.current.style.background = 'transparent';
                        gsap.set(glowRef.current, { opacity: 1 });
                    }
                }
            });
        }
    }, []);

    const scrollDown = () => {
        document.getElementById('build-question')?.scrollIntoView({ behavior: 'smooth' });
    };

    // Split "Welcome" into chars
    const welcomeChars = 'Welcome'.split('').map((char, i) => (
        <span
            key={i}
            className="welcome-char inline-block"
            style={{ perspective: '800px' }}
        >
            {char}
        </span>
    ));

    return (
        <section
            ref={sectionRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="min-h-[100dvh] w-full relative flex items-center px-6 md:px-12 lg:px-24 py-20 md:py-0"
        >
            {/* Dark bg with dot grid */}
            <div
                className="hero-grid absolute inset-0 bg-brutal-dark"
                style={{
                    backgroundImage: 'radial-gradient(circle, rgba(245,243,238,0.04) 1px, transparent 1px)',
                    backgroundSize: '32px 32px',
                }}
            />

            {/* Cursor glow */}
            <div
                ref={glowRef}
                className="absolute inset-0 pointer-events-none z-[1]"
            />

            {/* 3D Robot — absolute layer covering the right side + bleeding into the full hero
                 Positioned to start from the left-center so the beam can reach across the whole section */}
            <div className="hidden md:block absolute top-0 bottom-0 left-0 right-0 z-[2]">
                <InteractiveRobotSpline
                    scene="https://prod.spline.design/PyzDhpQ9E5f1E3MT/scene.splinecode"
                    className="w-full h-full"
                />
            </div>

            {/* Content — text sits above the robot canvas */}
            <div className="relative z-10 w-full max-w-7xl mx-auto pointer-events-none">
                <div className="w-full md:w-3/5 lg:w-1/2 max-w-3xl pointer-events-auto">
                    {/* Main headline */}
                    <h1 className="font-drama italic text-4xl sm:text-6xl md:text-8xl lg:text-[8rem] text-brutal-bg leading-[0.95] tracking-tight">
                        {welcomeChars}
                    </h1>

                    {/* Second line */}
                    <p className="welcome-subtitle font-drama italic text-xl sm:text-3xl md:text-5xl lg:text-6xl text-brutal-bg/70 leading-[1.1] mt-2 md:mt-4">
                        to <span className="text-brutal-bg">Param</span>{' '}
                        <span className="text-brutal-red">Makersadda.</span>
                    </p>

                    {/* Tagline */}
                    <p className="welcome-tagline font-data text-xs sm:text-sm md:text-base text-brutal-bg/50 mt-5 sm:mt-8 max-w-lg leading-relaxed">
                        Where makers build the future, together.
                    </p>

                    {/* Accent line */}
                    <div className="welcome-line w-12 sm:w-16 md:w-24 h-px bg-brutal-red/60 mt-5 sm:mt-8 origin-left" />

                    {/* CTA */}
                    <div className="welcome-cta mt-5 sm:mt-8">
                        <button
                            onClick={scrollDown}
                            className="px-6 py-3 sm:px-8 sm:py-4 rounded-full bg-brutal-red text-brutal-bg
                                       font-heading font-bold text-xs sm:text-sm uppercase tracking-widest
                                       hover:bg-brutal-bg hover:text-brutal-dark
                                       transition-all duration-500"
                        >
                            See What's Possible ↓
                        </button>
                    </div>
                </div>
            </div>

            {/* Scroll indicator */}
            <div className="welcome-scroll absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2">
                <span className="font-data text-[10px] text-brutal-bg/25 uppercase tracking-[0.3em]">Scroll</span>
                <ChevronDown size={18} className="text-brutal-bg/25 animate-bounce" />
            </div>
        </section>
    );
}
