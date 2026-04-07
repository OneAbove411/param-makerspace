import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { supabase } from '../../lib/supabase';

gsap.registerPlugin(ScrollTrigger);

/**
 * BuildQuestion — Viewport 2
 *
 * Design rationale:
 * - ONE focal point: the question "What would you [build]?" with rotating word
 * - ONE supporting element: the orbiting project carousel with REAL projects
 * - Carousel cards are clickable — link to actual project pages
 * - Falls back to placeholder cards while loading
 */

interface CarouselProject {
    id: string;
    title: string;
    domain: string;
    image: string;
}

// Placeholder projects shown when no real projects exist yet
// Images sourced from Pexels (free for commercial use, no attribution required)
const PLACEHOLDER_PROJECTS: CarouselProject[] = [
    {
        id: '', title: 'Line-Following Bot', domain: 'Robotics',
        image: 'https://images.pexels.com/photos/7869085/pexels-photo-7869085.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop',
    },
    {
        id: '', title: 'Smart Plant Monitor', domain: 'IoT',
        image: 'https://images.pexels.com/photos/270621/pexels-photo-270621.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop',
    },
    {
        id: '', title: 'AI Waste Sorter', domain: 'AI / ML',
        image: 'https://images.pexels.com/photos/2682683/pexels-photo-2682683.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop',
    },
    {
        id: '', title: '3D Printed Prosthetic', domain: '3D Printing',
        image: 'https://images.pexels.com/photos/6153354/pexels-photo-6153354.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop',
    },
    {
        id: '', title: 'Solar USB Charger', domain: 'Electronics',
        image: 'https://images.pexels.com/photos/356049/pexels-photo-356049.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop',
    },
    {
        id: '', title: 'Gesture-Controlled Drone', domain: 'Robotics',
        image: 'https://images.pexels.com/photos/724921/pexels-photo-724921.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop',
    },
];

// Domain → emoji icon mapping for placeholder cards
const DOMAIN_ICONS: Record<string, string> = {
    'Robotics': '🤖',
    'IoT': '📡',
    'AI / ML': '🧠',
    '3D Printing': '🖨️',
    'Electronics': '⚡',
};

// Random scatter positions for each card (pre-computed for consistency)
const SCATTER_TRANSFORMS = [
    { x: -180, y: -120, rotate: -12, scale: 0.7 },
    { x: 140, y: -90, rotate: 8, scale: 0.65 },
    { x: -100, y: 80, rotate: 15, scale: 0.75 },
    { x: 200, y: 60, rotate: -6, scale: 0.6 },
    { x: -220, y: 30, rotate: 10, scale: 0.7 },
    { x: 160, y: 110, rotate: -14, scale: 0.65 },
];

// ─── Scatter-to-Grid — projects scatter in, then settle into a masonry grid ───
function ScatterGrid({ projects }: { projects: CarouselProject[] }) {
    const gridRef = useRef<HTMLDivElement>(null);
    const cardsRef = useRef<(HTMLDivElement | null)[]>([]);
    const hasAnimated = useRef(false);

    useEffect(() => {
        if (!gridRef.current || hasAnimated.current) return;

        const cards = cardsRef.current.filter(Boolean) as HTMLElement[];
        if (cards.length === 0) return;

        // Set initial scattered state
        cards.forEach((card, i) => {
            const scatter = SCATTER_TRANSFORMS[i % SCATTER_TRANSFORMS.length];
            gsap.set(card, {
                x: scatter.x,
                y: scatter.y,
                rotation: scatter.rotate,
                scale: scatter.scale,
                opacity: 0,
            });
        });

        // Create scroll-triggered animation: scatter → grid
        const tl = gsap.timeline({
            scrollTrigger: {
                trigger: gridRef.current,
                start: 'top 65%',
                once: true,
            },
            onComplete: () => { hasAnimated.current = true; },
        });

        // Phase 1: Cards appear at scattered positions
        tl.to(cards, {
            opacity: 1,
            scale: (i: number) => SCATTER_TRANSFORMS[i % SCATTER_TRANSFORMS.length].scale,
            duration: 0.4,
            stagger: 0.06,
            ease: 'power2.out',
        });

        // Phase 2: Cards settle into grid positions
        tl.to(cards, {
            x: 0,
            y: 0,
            rotation: 0,
            scale: 1,
            duration: 0.9,
            stagger: 0.08,
            ease: 'power3.out',
            delay: 0.3,
        });

        return () => {
            tl.kill();
        };
    }, [projects]);

    return (
        <div
            ref={gridRef}
            className="relative w-full grid grid-cols-2 sm:grid-cols-3 gap-4 md:gap-5 max-w-2xl mx-auto"
        >
            {projects.map((project, i) => {
                const icon = DOMAIN_ICONS[project.domain] || '🔧';

                const cardInner = (
                    <div
                        ref={el => { cardsRef.current[i] = el; }}
                        className="rounded-xl overflow-hidden border border-brutal-bg/10
                                   bg-brutal-dark/60 backdrop-blur-sm cursor-pointer
                                   hover:border-brutal-red/40 hover:-translate-y-1
                                   transition-all duration-300 will-change-transform"
                    >
                        <div className="aspect-[4/3] overflow-hidden bg-brutal-bg/5 flex items-center justify-center">
                            {project.image ? (
                                <img
                                    src={project.image}
                                    alt={project.title}
                                    className="w-full h-full object-cover"
                                    loading="eager"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                        (e.target as HTMLImageElement).parentElement!.querySelector('span')!.style.display = '';
                                    }}
                                />
                            ) : null}
                            <span className="text-3xl md:text-4xl opacity-60 select-none" style={project.image ? { display: 'none' } : {}}>
                                {icon}
                            </span>
                        </div>
                        <div className="p-2.5 md:p-3 bg-brutal-dark/80">
                            <span className="font-data text-[9px] md:text-[10px] text-brutal-red uppercase tracking-widest block">
                                {project.domain || 'Maker'}
                            </span>
                            <p className="font-heading font-bold text-xs md:text-sm text-brutal-bg/80 mt-0.5 truncate">
                                {project.title || 'Untitled Project'}
                            </p>
                        </div>
                    </div>
                );

                if (project.id) {
                    return (
                        <Link key={project.id} to={`/projects/${project.id}`}>
                            {cardInner}
                        </Link>
                    );
                }
                return <div key={`placeholder-${i}`}>{cardInner}</div>;
            })}
        </div>
    );
}

// ─── Rotating word — smooth crossfade ───
const ROTATING_WORDS = ['build', 'create', 'invent', 'explore', 'design'];

function RotatingWord() {
    const [index, setIndex] = useState(0);
    const wordRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        const interval = setInterval(() => {
            if (wordRef.current) {
                gsap.to(wordRef.current, {
                    y: -25, opacity: 0, rotateX: -30,
                    duration: 0.4, ease: 'power2.in',
                    onComplete: () => {
                        setIndex(prev => (prev + 1) % ROTATING_WORDS.length);
                        if (wordRef.current) {
                            gsap.fromTo(wordRef.current,
                                { y: 25, opacity: 0, rotateX: 30 },
                                { y: 0, opacity: 1, rotateX: 0, duration: 0.5, ease: 'power2.out' }
                            );
                        }
                    }
                });
            }
        }, 2600);
        return () => clearInterval(interval);
    }, []);

    return (
        <span ref={wordRef} className="inline-block text-brutal-red" style={{ perspective: '600px' }}>
            {ROTATING_WORDS[index]}
        </span>
    );
}

// ─── Main Component ───
export function BuildQuestion() {
    const sectionRef = useRef<HTMLDivElement>(null);
    const [carouselProjects, setCarouselProjects] = useState<CarouselProject[]>(PLACEHOLDER_PROJECTS);

    // Fetch real projects with their first image
    useEffect(() => {
        async function fetchProjects() {
            const { data: projects } = await supabase
                .from('project')
                .select('id, title, domain')
                .eq('status', 'active')
                .eq('visibility', 'public')
                .order('created_at', { ascending: false })
                .limit(6);

            if (!projects || projects.length === 0) return;

            // Fetch first image for each project
            const projectIds = projects.map(p => p.id);
            const { data: images } = await supabase
                .from('project_image')
                .select('project_id, image_url')
                .in('project_id', projectIds)
                .order('display_order', { ascending: true });

            // Map first image per project
            const imageMap: Record<string, string> = {};
            (images || []).forEach(img => {
                if (!imageMap[img.project_id]) {
                    imageMap[img.project_id] = img.image_url;
                }
            });

            const real: CarouselProject[] = projects.map((p, i) => ({
                id: p.id,
                title: p.title,
                domain: p.domain || 'Maker',
                image: imageMap[p.id] || '',
            }));

            if (real.length > 0) {
                setCarouselProjects(real);
            }
        }
        fetchProjects();
    }, []);

    useEffect(() => {
        const ctx = gsap.context(() => {
            // Headline entrance — scroll-triggered
            gsap.fromTo('.bq-headline',
                { opacity: 0, y: 40 },
                {
                    opacity: 1, y: 0,
                    duration: 0.8, ease: 'power2.out',
                    scrollTrigger: { trigger: sectionRef.current, start: 'top 60%' },
                }
            );

            // Grid container fades in (individual cards animate via ScatterGrid)
            gsap.fromTo('.bq-carousel',
                { opacity: 0 },
                {
                    opacity: 1,
                    duration: 0.5, ease: 'power2.out',
                    scrollTrigger: { trigger: sectionRef.current, start: 'top 55%' },
                }
            );

            // Subtitle
            gsap.fromTo('.bq-sub',
                { opacity: 0, y: 15 },
                {
                    opacity: 0.35, y: 0,
                    duration: 0.8, ease: 'power2.out',
                    scrollTrigger: { trigger: sectionRef.current, start: 'top 45%' },
                }
            );
        }, sectionRef);
        return () => ctx.revert();
    }, []);

    return (
        <section
            id="build-question"
            ref={sectionRef}
            className="min-h-[100dvh] w-full relative flex flex-col items-center justify-center
                       px-6 md:px-12 lg:px-24 py-24 overflow-hidden"
        >
            {/* Dark bg with dot grid — matches hero */}
            <div
                className="absolute inset-0 bg-brutal-dark"
                style={{
                    backgroundImage: 'radial-gradient(circle, rgba(245,243,238,0.03) 1px, transparent 1px)',
                    backgroundSize: '40px 40px',
                }}
            />

            <div className="relative z-10 flex flex-col items-center text-center w-full max-w-4xl">
                {/* Accent line — matches the rest of the system */}
                <div className="bq-headline w-16 h-0.5 bg-brutal-red mb-8 origin-left mx-auto" />
                <p className="bq-headline font-data text-xs text-brutal-red uppercase tracking-[0.2em] mb-4">
                    The Spark
                </p>

                {/* Question headline — uppercase brutal sans, system voice.
                    Scale dialed back so the headline supports the scatter grid
                    (the actual hook) instead of competing with it. */}
                <div className="bq-headline">
                    <h2 className="font-heading font-bold text-2xl sm:text-4xl md:text-5xl lg:text-[3.75rem] text-brutal-bg leading-[1.05] uppercase tracking-tight-heading">
                        What would you
                    </h2>
                    <div className="mt-1 md:mt-2">
                        <span
                            className="font-heading font-bold text-2xl sm:text-4xl md:text-5xl lg:text-[3.75rem] leading-[1.05] uppercase tracking-tight-heading"
                            style={{ perspective: '600px' }}
                        >
                            <RotatingWord />
                            <span className="text-brutal-bg">?</span>
                        </span>
                    </div>
                </div>

                {/* Project Grid — Scatter-to-Grid animation */}
                <div className="bq-carousel mt-10 md:mt-14 w-full">
                    <ScatterGrid projects={carouselProjects} />
                </div>

                {/* Subtitle — static, no fading */}
                <p className="bq-sub font-data text-xs md:text-sm text-brutal-bg/35 mt-6 max-w-md leading-relaxed">
                    Real projects built by makers in the lab. Click any to explore.
                </p>
            </div>
        </section>
    );
}
