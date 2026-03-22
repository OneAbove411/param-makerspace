import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Card } from '../ui/Card';
import { MagneticCard } from '../ui/MagneticCard';
import { ArrowRight } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

// Static featured projects — replace with useProjects() hook later for live data
const FEATURED = [
    {
        id: 'p1',
        title: 'Solar Powered Kiln v2',
        domain: 'Fabrication',
        maker: 'Elena K.',
        image: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=600&auto=format&fit=crop&q=80',
        summary: 'A solar-thermal kiln for ceramic firing, built entirely from reclaimed materials.',
    },
    {
        id: 'p2',
        title: 'Autonomous Navigation Drone',
        domain: 'Robotics',
        maker: 'Julian V.',
        image: 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=600&auto=format&fit=crop&q=80',
        summary: 'Carbon-fiber quadcopter with SLAM-based indoor navigation and obstacle avoidance.',
    },
    {
        id: 'p3',
        title: 'Neural Interface PCB v3',
        domain: 'Electronics',
        maker: 'Sarah J.',
        image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop&q=80',
        summary: 'Custom PCB for low-latency bio-signal processing in wearable devices.',
    },
];

export function FeaturedProjects() {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            // Header entrance
            gsap.fromTo('.fp-header',
                { y: 40, opacity: 0 },
                {
                    y: 0, opacity: 1,
                    duration: 0.8, stagger: 0.1,
                    ease: 'power3.out',
                    scrollTrigger: { trigger: containerRef.current, start: 'top 75%' }
                }
            );

            // Stat count-up
            gsap.utils.toArray<HTMLElement>('.stat-number').forEach((el) => {
                const target = parseInt(el.dataset.target || '0', 10);
                gsap.fromTo(el,
                    { innerText: 0 },
                    {
                        innerText: target,
                        duration: 1.8,
                        ease: 'power2.out',
                        snap: { innerText: 1 },
                        scrollTrigger: { trigger: el, start: 'top 85%' }
                    }
                );
            });

            // Cards stagger + parallax
            const cards = gsap.utils.toArray<HTMLElement>('.fp-card');
            cards.forEach((card, i) => {
                // Entrance
                gsap.fromTo(card,
                    { y: 80, opacity: 0 },
                    {
                        y: 0, opacity: 1,
                        duration: 0.9,
                        delay: i * 0.12,
                        ease: 'power3.out',
                        scrollTrigger: { trigger: containerRef.current, start: 'top 65%' }
                    }
                );

                // Parallax depth — each card drifts at a slightly different speed
                gsap.to(card, {
                    y: (i - 1) * -25,
                    ease: 'none',
                    scrollTrigger: {
                        trigger: containerRef.current,
                        start: 'top bottom',
                        end: 'bottom top',
                        scrub: 0.6,
                    }
                });
            });

            // CTA entrance
            gsap.fromTo('.fp-cta',
                { y: 20, opacity: 0 },
                {
                    y: 0, opacity: 1,
                    duration: 0.6, ease: 'power3.out',
                    scrollTrigger: { trigger: '.fp-cta', start: 'top 90%' }
                }
            );
        }, containerRef);
        return () => ctx.revert();
    }, []);

    return (
        <section ref={containerRef} className="py-32 md:py-40 px-6 md:px-12 lg:px-24 bg-brutal-bg">
            <div className="max-w-6xl mx-auto">
                {/* Header row: title + stats */}
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8 mb-16">
                    <div>
                        <p className="fp-header font-data text-xs text-brutal-red uppercase tracking-[0.2em] mb-4">
                            Social Proof
                        </p>
                        <h2 className="fp-header font-heading font-bold text-4xl md:text-6xl uppercase tracking-tight-heading">
                            What Makers Build
                        </h2>
                    </div>
                    <div className="fp-header flex gap-10 md:gap-14">
                        <div>
                            <span
                                className="stat-number font-data text-4xl md:text-5xl font-bold text-brutal-dark tabular-nums"
                                data-target="47"
                            >
                                0
                            </span>
                            <p className="font-data text-[10px] text-brutal-dark/40 uppercase tracking-widest mt-1">
                                Projects Built
                            </p>
                        </div>
                        <div className="w-px bg-brutal-dark/10 hidden md:block" />
                        <div>
                            <span
                                className="stat-number font-data text-4xl md:text-5xl font-bold text-brutal-dark tabular-nums"
                                data-target="12"
                            >
                                0
                            </span>
                            <p className="font-data text-[10px] text-brutal-dark/40 uppercase tracking-widest mt-1">
                                Active Makers
                            </p>
                        </div>
                    </div>
                </div>

                {/* Project cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {FEATURED.map((project) => (
                        <MagneticCard
                            key={project.id}
                            intensity={5}
                            glowOnHover
                            className="fp-card"
                        >
                            <Card className="h-full overflow-hidden group cursor-pointer">
                                {/* Image */}
                                <div className="aspect-[4/3] bg-brutal-dark/10 overflow-hidden relative">
                                    <img
                                        src={project.image}
                                        alt={project.title}
                                        className="w-full h-full object-cover
                                                   group-hover:scale-105 transition-transform duration-700 ease-out"
                                        loading="lazy"
                                    />
                                    {/* Hover overlay */}
                                    <div className="absolute inset-0 bg-brutal-dark/0 group-hover:bg-brutal-dark/10
                                                    transition-colors duration-500" />
                                </div>

                                {/* Content */}
                                <div className="p-6">
                                    <span className="font-data text-[10px] text-brutal-red uppercase tracking-[0.15em] font-bold">
                                        #{project.domain}
                                    </span>
                                    <h3 className="font-heading font-bold text-lg mt-2 tracking-tight-heading
                                                   group-hover:text-brutal-red transition-colors duration-300">
                                        {project.title}
                                    </h3>
                                    <p className="font-data text-xs text-brutal-dark/50 mt-2 line-clamp-2">
                                        {project.summary}
                                    </p>
                                    <p className="font-data text-[10px] text-brutal-dark/40 mt-4 uppercase tracking-widest">
                                        Maker: {project.maker}
                                    </p>
                                </div>
                            </Card>
                        </MagneticCard>
                    ))}
                </div>

                {/* CTA */}
                <div className="fp-cta text-center mt-16">
                    <Link
                        to="/projects"
                        className="inline-flex items-center gap-2 font-heading font-bold text-sm uppercase
                                   tracking-widest text-brutal-dark hover:text-brutal-red transition-colors
                                   duration-300 interactive-lift group/link"
                    >
                        Explore All Projects
                        <ArrowRight size={16} className="group-hover/link:translate-x-1 transition-transform duration-300" />
                    </Link>
                </div>
            </div>
        </section>
    );
}
