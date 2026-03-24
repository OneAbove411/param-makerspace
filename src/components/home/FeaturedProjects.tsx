import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight, ChevronDown } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

/**
 * FeaturedProjects — Section 6
 *
 * Design critique of previous version:
 * - Cards had continuous floating animation (y: -4, yoyo) which made
 *   the whole grid feel "wobbly." Projects = stability, credibility.
 *   Wobbling undermines trust.
 * - Stat numbers had continuous scale pulse — unnecessary distraction.
 * - MagneticCard 3D tilt was heavy for project cards (elastic.out on leave
 *   is jarring when you're trying to read project titles).
 *
 * New approach:
 * - Project cards show image + domain + title always visible.
 * - Click to expand summary + maker credit (expandable IS justified here —
 *   the image takes up space, and the summary is multiple sentences).
 * - NO continuous floating. Cards are static after scroll entrance.
 * - NO MagneticCard wrapper. Simple CSS hover lift + shadow.
 * - Stats counter kept (count-up is satisfying and scroll-triggered once).
 * - Hover: image zooms slightly, border shifts. Clean and predictable.
 */

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
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const handleCardClick = (id: string) => {
        setExpandedId(expandedId === id ? null : id);
    };

    // Animate expand/collapse
    useEffect(() => {
        FEATURED.forEach((project) => {
            const el = document.querySelector(`[data-project="${project.id}"]`) as HTMLElement;
            if (!el) return;

            const summary = el.querySelector('[data-summary]') as HTMLElement;
            const chevron = el.querySelector('[data-chevron]') as HTMLElement;
            if (!summary) return;

            if (expandedId === project.id) {
                gsap.to(summary, {
                    height: 'auto', opacity: 1,
                    duration: 0.4, ease: 'power2.out',
                });
                if (chevron) gsap.to(chevron, { rotation: 180, duration: 0.3, ease: 'power2.out' });
            } else {
                gsap.to(summary, {
                    height: 0, opacity: 0,
                    duration: 0.3, ease: 'power2.inOut',
                });
                if (chevron) gsap.to(chevron, { rotation: 0, duration: 0.3, ease: 'power2.inOut' });
            }
        });
    }, [expandedId]);

    useEffect(() => {
        const ctx = gsap.context(() => {
            // Accent line
            gsap.fromTo('.fp-line',
                { scaleX: 0 },
                {
                    scaleX: 1, duration: 1, ease: 'power2.inOut',
                    scrollTrigger: { trigger: containerRef.current, start: 'top 75%' }
                }
            );

            // Header
            gsap.fromTo('.fp-header',
                { y: 30, opacity: 0 },
                {
                    y: 0, opacity: 1,
                    duration: 0.7, stagger: 0.08, ease: 'power2.out',
                    scrollTrigger: { trigger: containerRef.current, start: 'top 70%' }
                }
            );

            // Stat count-up (scroll-triggered, runs once)
            gsap.utils.toArray<HTMLElement>('.stat-number').forEach((el) => {
                const target = parseInt(el.dataset.target || '0', 10);
                gsap.fromTo(el,
                    { innerText: 0 },
                    {
                        innerText: target,
                        duration: 1.8, ease: 'power2.out',
                        snap: { innerText: 1 },
                        scrollTrigger: { trigger: el, start: 'top 85%' }
                    }
                );
            });

            // Cards stagger
            gsap.fromTo('.fp-card',
                { y: 60, opacity: 0 },
                {
                    y: 0, opacity: 1,
                    duration: 0.8, stagger: 0.12, ease: 'power2.out',
                    scrollTrigger: { trigger: containerRef.current, start: 'top 65%' }
                }
            );

            // CTA
            gsap.fromTo('.fp-cta',
                { y: 20, opacity: 0 },
                {
                    y: 0, opacity: 1,
                    duration: 0.6, ease: 'power2.out',
                    scrollTrigger: { trigger: '.fp-cta', start: 'top 90%' }
                }
            );
        }, containerRef);
        return () => ctx.revert();
    }, []);

    return (
        <section ref={containerRef} className="py-24 md:py-32 px-6 md:px-12 lg:px-24 bg-brutal-bg">
            <div className="max-w-6xl mx-auto">
                {/* Header + stats */}
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8 mb-14">
                    <div>
                        <div className="fp-line w-16 h-0.5 bg-brutal-red mb-8 origin-left" />
                        <p className="fp-header font-data text-xs text-brutal-red uppercase tracking-[0.2em] mb-4">
                            See What's Possible
                        </p>
                        <h2 className="fp-header font-heading font-bold text-3xl md:text-5xl uppercase tracking-tight-heading">
                            Built by makers like you.
                        </h2>
                        <p className="fp-header font-data text-sm text-brutal-dark/50 mt-4 max-w-md">
                            Real projects by community members. Some started with zero experience.
                        </p>
                    </div>
                    <div className="fp-header flex gap-10 md:gap-14">
                        <div>
                            <span className="stat-number font-data text-4xl md:text-5xl font-bold text-brutal-dark tabular-nums" data-target="47">0</span>
                            <p className="font-data text-[10px] text-brutal-dark/40 uppercase tracking-widest mt-1">Projects Built</p>
                        </div>
                        <div className="w-px bg-brutal-dark/10 hidden md:block" />
                        <div>
                            <span className="stat-number font-data text-4xl md:text-5xl font-bold text-brutal-dark tabular-nums" data-target="12">0</span>
                            <p className="font-data text-[10px] text-brutal-dark/40 uppercase tracking-widest mt-1">Active Makers</p>
                        </div>
                    </div>
                </div>

                {/* Project cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {FEATURED.map((project) => (
                        <div
                            key={project.id}
                            data-project={project.id}
                            className="fp-card bg-brutal-bg border-2 border-brutal-dark/8 rounded-2xl
                                       overflow-hidden cursor-pointer group
                                       hover:border-brutal-red/20 transition-all duration-500
                                       hover:shadow-[0_12px_40px_rgba(196,41,30,0.06)]
                                       hover:-translate-y-1"
                            onClick={() => handleCardClick(project.id)}
                        >
                            {/* Image */}
                            <div className="aspect-[4/3] bg-brutal-dark/10 overflow-hidden">
                                <img
                                    src={project.image}
                                    alt={project.title}
                                    className="w-full h-full object-cover group-hover:scale-105
                                               transition-transform duration-700 ease-out"
                                    loading="lazy"
                                />
                            </div>

                            {/* Content */}
                            <div className="p-6">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1">
                                        <span className="font-data text-[10px] text-brutal-red uppercase tracking-[0.15em] font-bold">
                                            #{project.domain}
                                        </span>
                                        <h3 className="font-heading font-bold text-lg mt-2 tracking-tight-heading
                                                       group-hover:text-brutal-red transition-colors duration-300">
                                            {project.title}
                                        </h3>
                                    </div>
                                    <ChevronDown
                                        data-chevron
                                        size={16}
                                        className="flex-shrink-0 mt-3 text-brutal-dark/30 group-hover:text-brutal-red
                                                   transition-colors duration-300"
                                    />
                                </div>

                                {/* Expandable: summary + maker */}
                                <div
                                    data-summary
                                    className="overflow-hidden"
                                    style={{ height: 0, opacity: 0 }}
                                >
                                    <p className="font-data text-xs text-brutal-dark/60 mt-3 leading-relaxed">
                                        {project.summary}
                                    </p>
                                    <p className="font-data text-[10px] text-brutal-dark/40 mt-3 uppercase tracking-widest">
                                        Built by {project.maker}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* CTA */}
                <div className="fp-cta text-center mt-14">
                    <Link
                        to="/projects"
                        className="inline-flex items-center gap-2 font-heading font-bold text-sm uppercase
                                   tracking-widest text-brutal-dark hover:text-brutal-red transition-colors
                                   duration-300 group/link"
                    >
                        Explore All Projects
                        <ArrowRight size={16} className="group-hover/link:translate-x-1 transition-transform duration-300" />
                    </Link>
                </div>
            </div>
        </section>
    );
}
