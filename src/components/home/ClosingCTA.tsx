import { useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Button } from '../ui/Button';
import { ArrowRight } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

/**
 * ClosingCTA — Section 9
 *
 * Design critique of previous version:
 * - Floating decorative rank icons at opacity 0.04 → invisible noise.
 *   They add DOM elements, animation cycles, and visual confusion for
 *   effectively zero design value. Remove entirely.
 * - Center glow pulsing + button glow pulsing = two competing glow animations.
 *   The user should focus on ONE thing: the CTA button.
 * - "You don't need permission to build something amazing." is a strong line.
 *   Let it stand alone with breathing room. Don't surround it with visual noise.
 *
 * New approach:
 * - Clean dark section. Big headline. One button. One secondary link.
 * - Scroll-triggered entrance. Button gets a subtle hover glow via CSS.
 * - NO floating icons. NO pulsing glows. NO continuous GSAP animations.
 * - The emptiness IS the design. Dark space around bright text = focus.
 */

export function ClosingCTA() {
    const containerRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.fromTo('.cta-element',
                { y: 40, opacity: 0 },
                {
                    y: 0, opacity: 1,
                    duration: 0.8, stagger: 0.12,
                    ease: 'power2.out',
                    scrollTrigger: { trigger: containerRef.current, start: 'top 60%' }
                }
            );
        }, containerRef);
        return () => ctx.revert();
    }, []);

    return (
        <section
            ref={containerRef}
            className="h-[100dvh] bg-brutal-dark text-brutal-bg flex flex-col items-center justify-center
                       px-6 relative overflow-hidden"
        >
            {/* Content */}
            <div className="relative z-10 flex flex-col items-center text-center max-w-3xl">
                <p className="cta-element font-data text-xs text-brutal-bg/30 uppercase tracking-[0.2em] mb-6">
                    Ready to start?
                </p>

                <h2 className="cta-element font-drama italic text-4xl md:text-6xl lg:text-7xl text-brutal-bg leading-tight">
                    You don't need permission to build something amazing.
                </h2>

                <p className="cta-element font-data text-sm text-brutal-bg/35 mt-6 max-w-md leading-relaxed">
                    Join a community of makers who started exactly where you are now — curious, excited, and ready to learn by doing.
                </p>

                <div className="cta-element mt-10">
                    <Button
                        size="lg"
                        onClick={() => navigate('/register')}
                        className="uppercase font-bold text-sm tracking-widest
                                   shadow-[0_0_40px_rgba(196,41,30,0.2)]
                                   hover:shadow-[0_0_60px_rgba(196,41,30,0.4)]
                                   transition-shadow duration-500
                                   group/cta"
                    >
                        <span className="flex items-center gap-2">
                            Create Your Free Account
                            <ArrowRight size={16} className="group-hover/cta:translate-x-1 transition-transform duration-300" />
                        </span>
                    </Button>
                </div>

                <Link
                    to="/challenges"
                    className="cta-element mt-5 font-data text-sm text-brutal-bg/35
                               hover:text-brutal-bg/60 transition-colors duration-300
                               underline-offset-4 hover:underline"
                >
                    Or browse challenges first →
                </Link>
            </div>
        </section>
    );
}
