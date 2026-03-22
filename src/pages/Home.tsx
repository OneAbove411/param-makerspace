import { useEffect, useRef, useCallback, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ChevronDown } from 'lucide-react';
import { ParamLogo } from '../components/ui/ParamLogo';

// New landing page sections
import { MakerLoop } from '../components/home/MakerLoop';
import { FeaturedProjects } from '../components/home/FeaturedProjects';
import { RankPath } from '../components/home/RankPath';
import { LivePulse } from '../components/home/LivePulse';
import { ClosingCTA } from '../components/home/ClosingCTA';

// Old imports — preserved for rollback, not deleted:
// import { Button } from '../components/ui/Button';
// import { DiagnosticShuffler } from '../components/home/DiagnosticShuffler';
// import { TelemetryTypewriter } from '../components/home/TelemetryTypewriter';
// import { CursorProtocolScheduler } from '../components/home/CursorProtocolScheduler';
// import { Philosophy } from '../components/home/Philosophy';
// import { Protocol } from '../components/home/Protocol';

gsap.registerPlugin(ScrollTrigger);

// ─── Project showcase cards for the orbiting carousel ───
const SHOWCASE_PROJECTS = [
    {
        title: 'Robotic Arm Build',
        domain: 'Robotics',
        image: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=500&auto=format&fit=crop&q=80',
    },
    {
        title: 'LED Matrix Art',
        domain: 'Electronics',
        image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=500&auto=format&fit=crop&q=80',
    },
    {
        title: 'Bio-Reactor v2',
        domain: 'Bio',
        image: 'https://images.unsplash.com/photo-1582719471384-894fbb16f461?w=500&auto=format&fit=crop&q=80',
    },
    {
        title: 'CNC Sculpture',
        domain: 'Fabrication',
        image: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=500&auto=format&fit=crop&q=80',
    },
    {
        title: 'Custom PCB Array',
        domain: 'Electronics',
        image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=500&auto=format&fit=crop&q=80',
    },
    {
        title: '3D Print Lattice',
        domain: 'Design',
        image: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=500&auto=format&fit=crop&q=80',
    },
];

// ─── Orbiting Card Carousel Component ───

function OrbitCarousel() {
    const containerRef = useRef<HTMLDivElement>(null);
    const [angle, setAngle] = useState(0);
    const animRef = useRef<number>(0);

    // Smooth continuous rotation via requestAnimationFrame
    useEffect(() => {
        let lastTime = performance.now();

        const animate = (time: number) => {
            const delta = time - lastTime;
            lastTime = time;
            // Rotate at ~12 degrees per second (smooth, not too fast)
            setAngle(prev => (prev + delta * 0.012) % 360);
            animRef.current = requestAnimationFrame(animate);
        };

        animRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animRef.current);
    }, []);

    const count = SHOWCASE_PROJECTS.length;
    const radiusX = typeof window !== 'undefined' && window.innerWidth < 640 ? 140 : 260; // Horizontal radius
    const radiusY = typeof window !== 'undefined' && window.innerWidth < 640 ? 30 : 50;   // Vertical radius (flat ellipse = semi-circular arc)

    return (
        <div
            ref={containerRef}
            className="relative w-full h-52 md:h-64 flex items-center justify-center"
            style={{ perspective: '800px' }}
        >
            {SHOWCASE_PROJECTS.map((project, i) => {
                const theta = ((360 / count) * i + angle) * (Math.PI / 180);
                const x = Math.sin(theta) * radiusX;
                const z = Math.cos(theta) * radiusY;

                // Cards in front are larger/brighter, cards behind are smaller/dimmer
                const normalizedZ = (z + radiusY) / (radiusY * 2); // 0 = back, 1 = front
                const scale = 0.65 + normalizedZ * 0.45;
                const opacity = 0.3 + normalizedZ * 0.7;
                const zIndex = Math.round(normalizedZ * 100);
                const blur = normalizedZ < 0.3 ? 2 : 0;

                return (
                    <div
                        key={project.title}
                        className="absolute rounded-xl overflow-hidden border border-brutal-bg/10
                                   bg-brutal-dark/60 backdrop-blur-sm transition-[filter] duration-300
                                   cursor-pointer"
                        style={{
                            width: typeof window !== 'undefined' && window.innerWidth < 640 ? '100px' : '140px',
                            transform: `translateX(${x}px) translateZ(${z}px) scale(${scale})`,
                            opacity,
                            zIndex,
                            filter: blur > 0 ? `blur(${blur}px)` : 'none',
                            willChange: 'transform, opacity',
                        }}
                    >
                        <div className="aspect-[3/4] overflow-hidden">
                            <img
                                src={project.image}
                                alt={project.title}
                                className="w-full h-full object-cover"
                                loading="eager"
                            />
                        </div>
                        <div className="p-2.5 bg-brutal-dark/80">
                            <span className="font-data text-[8px] text-brutal-red uppercase tracking-widest block">
                                {project.domain}
                            </span>
                            <p className="font-heading font-bold text-[10px] md:text-xs text-brutal-bg/80 mt-0.5 truncate">
                                {project.title}
                            </p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ─── Main Home Component ───

export function Home() {
    const heroRef = useRef<HTMLDivElement>(null);
    const heroGlowRef = useRef<HTMLDivElement>(null);

    // Hero GSAP entrance animation
    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.fromTo('.hero-text',
                { y: 40, opacity: 0 },
                { y: 0, opacity: 1, duration: 1, stagger: 0.08, ease: 'power3.out', delay: 0.2 }
            );

            // Carousel container fades in
            gsap.fromTo('.carousel-container',
                { y: 40, opacity: 0 },
                { y: 0, opacity: 1, duration: 1.2, ease: 'power3.out', delay: 0.7 }
            );
        }, heroRef);
        return () => ctx.revert();
    }, []);

    // Cursor-following radial gradient on hero (Lusion-style)
    const handleHeroMouseMove = useCallback((e: React.MouseEvent) => {
        if (!heroGlowRef.current) return;
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        heroGlowRef.current.style.background =
            `radial-gradient(circle 400px at ${x}px ${y}px, rgba(196,41,30,0.07) 0%, transparent 70%)`;
    }, []);

    const handleHeroMouseLeave = useCallback(() => {
        if (heroGlowRef.current) {
            heroGlowRef.current.style.background = 'transparent';
        }
    }, []);

    const scrollToLoop = () => {
        document.getElementById('maker-loop')?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className="flex-1 w-full bg-brutal-bg overflow-hidden relative">

            {/* ═══════════════════════════════════════════════════
                SECTION 1: HERO — "What would you build?"
            ═══════════════════════════════════════════════════ */}
            <div
                ref={heroRef}
                onMouseMove={handleHeroMouseMove}
                onMouseLeave={handleHeroMouseLeave}
                className="h-[100dvh] w-full relative flex flex-col items-center justify-center px-6 md:px-12 lg:px-24"
            >
                {/* Background: dark with subtle dot grid */}
                <div
                    className="absolute inset-0 bg-brutal-dark"
                    style={{
                        backgroundImage: 'radial-gradient(circle, rgba(245,243,238,0.06) 1px, transparent 1px)',
                        backgroundSize: '32px 32px',
                    }}
                />

                {/* Cursor-following glow overlay */}
                <div
                    ref={heroGlowRef}
                    className="absolute inset-0 pointer-events-none z-[1] transition-[background] duration-300"
                />

                {/* Content */}
                <div className="relative z-10 flex flex-col items-center text-center w-full max-w-5xl">
                    {/* Wordmark */}
                    <div className="hero-text flex items-center gap-2.5 mb-8">
                        <ParamLogo variant="light" size={20} />
                        <span className="font-data text-xs text-brutal-bg/40 uppercase tracking-[0.2em] font-bold">
                            Param Makerspace
                        </span>
                    </div>

                    {/* Main headline */}
                    <h1 className="hero-text font-drama italic text-5xl md:text-7xl lg:text-[5.5rem] text-brutal-bg leading-[1.05] max-w-4xl">
                        What would you build?
                    </h1>

                    {/* Subtitle */}
                    <p className="hero-text font-data text-sm md:text-base text-brutal-bg/40 mt-6 max-w-lg leading-relaxed">
                        A community-driven platform where curious minds learn, build, and level up through real projects.
                    </p>

                    {/* ── Orbiting Card Carousel ── */}
                    <div className="carousel-container mt-10 w-full">
                        <OrbitCarousel />
                    </div>

                    {/* CTA — sits right below the arc of orbiting cards */}
                    <button
                        onClick={scrollToLoop}
                        className="hero-text mt-4 px-8 py-4 rounded-full bg-brutal-red text-brutal-bg
                                   font-heading font-bold text-sm uppercase tracking-widest
                                   hover:bg-brutal-dark hover:shadow-[0_0_60px_rgba(196,41,30,0.4)]
                                   transition-all duration-500 magnetic-btn relative z-20"
                    >
                        See How It Works ↓
                    </button>
                </div>

                {/* Scroll indicator */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
                    <ChevronDown
                        size={24}
                        className="text-brutal-bg/30 animate-bounce"
                    />
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════
                SECTION 2: THE MAKER LOOP
            ═══════════════════════════════════════════════════ */}
            <MakerLoop />

            {/* ═══════════════════════════════════════════════════
                SECTION 3: WHAT MAKERS BUILD (Social Proof)
            ═══════════════════════════════════════════════════ */}
            <FeaturedProjects />

            {/* ═══════════════════════════════════════════════════
                SECTION 4: YOUR PATH (Rank Progression)
            ═══════════════════════════════════════════════════ */}
            <RankPath />

            {/* ═══════════════════════════════════════════════════
                SECTION 5: LIVE PULSE (Activity + Events)
            ═══════════════════════════════════════════════════ */}
            <LivePulse />

            {/* ═══════════════════════════════════════════════════
                SECTION 6: CLOSING CTA
            ═══════════════════════════════════════════════════ */}
            <ClosingCTA />

            {/* ═══════════════════════════════════════════════════
                OLD SECTIONS — commented out for rollback safety:

                <section className="py-32 px-6 md:px-12 lg:px-24 bg-brutal-bg isolate">
                    <h2 className="font-heading font-bold text-4xl mb-16 tracking-tight-heading max-w-2xl uppercase">
                        Core Capabilities Overview
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <DiagnosticShuffler />
                        <TelemetryTypewriter />
                        <CursorProtocolScheduler />
                    </div>
                </section>
                <Philosophy />
                <Protocol />

            ═══════════════════════════════════════════════════ */}
        </div>
    );
}
