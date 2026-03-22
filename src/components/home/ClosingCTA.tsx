import { useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Button } from '../ui/Button';
import { ArrowRight } from 'lucide-react';
import { RANK_ORDER } from '../../lib/xpEngine';
import { getBadgeIcon } from '../../lib/badgeIcons';

gsap.registerPlugin(ScrollTrigger);

// Floating decorative rank icons
const DECORATIVE_ICONS = RANK_ORDER.map((rank, i) => {
    const Icon = getBadgeIcon({ name: rank, badge_type: 'achievement', domain: 'General' });
    // Scatter positions (percentage-based for responsiveness)
    const positions = [
        { top: '12%', left: '8%',  size: 48 },
        { top: '25%', right: '12%', size: 36 },
        { bottom: '30%', left: '15%', size: 28 },
        { top: '18%', right: '25%', size: 40 },
        { bottom: '20%', right: '8%', size: 32 },
        { bottom: '15%', left: '30%', size: 44 },
    ];
    return { rank, Icon, position: positions[i] };
});

export function ClosingCTA() {
    const containerRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const ctx = gsap.context(() => {
            // Main content entrance
            gsap.fromTo('.cta-element',
                { y: 50, opacity: 0 },
                {
                    y: 0, opacity: 1,
                    duration: 1, stagger: 0.15,
                    ease: 'power3.out',
                    scrollTrigger: { trigger: containerRef.current, start: 'top 55%' }
                }
            );

            // Floating icons drift slowly
            gsap.utils.toArray<HTMLElement>('.floating-icon').forEach((icon, i) => {
                gsap.to(icon, {
                    y: `${(i % 2 === 0 ? -1 : 1) * 15}`,
                    rotation: (i % 2 === 0 ? 5 : -5),
                    duration: 3 + i * 0.5,
                    repeat: -1,
                    yoyo: true,
                    ease: 'sine.inOut',
                    delay: i * 0.3,
                });
            });
        }, containerRef);
        return () => ctx.revert();
    }, []);

    return (
        <section
            ref={containerRef}
            className="h-[100dvh] bg-brutal-dark text-brutal-bg flex flex-col items-center justify-center
                       px-6 relative overflow-hidden"
        >
            {/* Decorative floating rank icons */}
            <div className="absolute inset-0 pointer-events-none">
                {DECORATIVE_ICONS.map(({ rank, Icon, position }) => (
                    <div
                        key={rank}
                        className="floating-icon absolute opacity-[0.06]"
                        style={position as React.CSSProperties}
                    >
                        <Icon size={position.size} strokeWidth={1} className="text-brutal-bg" />
                    </div>
                ))}
            </div>

            {/* Subtle radial gradient from center */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    background: 'radial-gradient(ellipse at center, rgba(196,41,30,0.06) 0%, transparent 60%)',
                }}
            />

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center text-center max-w-3xl">
                <h2 className="cta-element font-drama italic text-4xl md:text-6xl lg:text-7xl text-brutal-bg leading-tight">
                    Every Lab Pro started as Curious.
                </h2>

                <div className="cta-element mt-10">
                    <Button
                        size="lg"
                        onClick={() => navigate('/register')}
                        className="uppercase font-bold text-sm tracking-widest
                                   shadow-[0_0_40px_rgba(196,41,30,0.3)]
                                   hover:shadow-[0_0_60px_rgba(196,41,30,0.5)]
                                   group/cta"
                    >
                        <span className="flex items-center gap-2">
                            Create Your Account
                            <ArrowRight size={16} className="group-hover/cta:translate-x-1 transition-transform duration-300" />
                        </span>
                    </Button>
                </div>

                <Link
                    to="/challenges"
                    className="cta-element mt-5 font-data text-sm text-brutal-bg/40
                               hover:text-brutal-bg/70 transition-colors duration-300
                               underline-offset-4 hover:underline"
                >
                    Or explore challenges first →
                </Link>
            </div>
        </section>
    );
}
