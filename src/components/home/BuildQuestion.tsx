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

// Fallback projects shown while real data loads
const FALLBACK_PROJECTS = [
    { id: '', title: 'Robotic Arm Build', domain: 'Robotics', image: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=500&auto=format&fit=crop&q=80' },
    { id: '', title: 'LED Matrix Art', domain: 'Electronics', image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=500&auto=format&fit=crop&q=80' },
    { id: '', title: 'Bio-Reactor v2', domain: 'Bio', image: 'https://images.unsplash.com/photo-1582719471384-894fbb16f461?w=500&auto=format&fit=crop&q=80' },
    { id: '', title: 'CNC Sculpture', domain: 'Fabrication', image: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=500&auto=format&fit=crop&q=80' },
    { id: '', title: 'Custom PCB Array', domain: 'Electronics', image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=500&auto=format&fit=crop&q=80' },
    { id: '', title: '3D Print Lattice', domain: 'Design', image: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=500&auto=format&fit=crop&q=80' },
];

interface CarouselProject {
    id: string;
    title: string;
    domain: string;
    image: string;
}

// ─── Orbit Carousel — the ONE interactive element ───
function OrbitCarousel({ projects }: { projects: CarouselProject[] }) {
    const [angle, setAngle] = useState(0);
    const animRef = useRef<number>(0);

    useEffect(() => {
        let lastTime = performance.now();
        const animate = (time: number) => {
            const delta = time - lastTime;
            lastTime = time;
            setAngle(prev => (prev + delta * 0.01) % 360);
            animRef.current = requestAnimationFrame(animate);
        };
        animRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animRef.current);
    }, []);

    const count = projects.length;
    const radiusX = typeof window !== 'undefined' && window.innerWidth < 640 ? 130 : 240;
    const radiusY = typeof window !== 'undefined' && window.innerWidth < 640 ? 25 : 45;

    return (
        <div
            className="relative w-full h-48 md:h-60 flex items-center justify-center overflow-hidden"
            style={{ perspective: '800px' }}
        >
            {projects.map((project, i) => {
                const theta = ((360 / count) * i + angle) * (Math.PI / 180);
                const x = Math.sin(theta) * radiusX;
                const z = Math.cos(theta) * radiusY;
                const normalizedZ = (z + radiusY) / (radiusY * 2);
                const scale = 0.6 + normalizedZ * 0.5;
                const opacity = 0.25 + normalizedZ * 0.75;
                const zIndex = Math.round(normalizedZ * 100);
                const blur = normalizedZ < 0.25 ? 2 : 0;

                const cardContent = (
                    <div
                        className="absolute rounded-xl overflow-hidden border border-brutal-bg/10
                                   bg-brutal-dark/60 backdrop-blur-sm cursor-pointer
                                   hover:border-brutal-red/40 transition-colors duration-300"
                        style={{
                            width: typeof window !== 'undefined' && window.innerWidth < 640 ? '95px' : '130px',
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
                        <div className="p-2 bg-brutal-dark/80">
                            <span className="font-data text-[8px] text-brutal-red uppercase tracking-widest block">
                                {project.domain}
                            </span>
                            <p className="font-heading font-bold text-[10px] md:text-xs text-brutal-bg/80 mt-0.5 truncate">
                                {project.title}
                            </p>
                        </div>
                    </div>
                );

                // Only wrap in Link if we have a real project id
                if (project.id) {
                    return (
                        <Link key={project.id} to={`/projects/${project.id}`} className="contents">
                            {cardContent}
                        </Link>
                    );
                }
                return <div key={project.title + i}>{cardContent}</div>;
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
    const [carouselProjects, setCarouselProjects] = useState<CarouselProject[]>(FALLBACK_PROJECTS);

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
                image: imageMap[p.id] || FALLBACK_PROJECTS[i % FALLBACK_PROJECTS.length].image,
            }));

            // Ensure we have at least 4 cards for the carousel to look good
            if (real.length >= 4) {
                setCarouselProjects(real);
            } else if (real.length > 0) {
                // Pad with fallback if too few real projects
                const padded = [...real, ...FALLBACK_PROJECTS.slice(0, 6 - real.length)];
                setCarouselProjects(padded);
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

            // Carousel fades in after headline
            gsap.fromTo('.bq-carousel',
                { opacity: 0, y: 30 },
                {
                    opacity: 1, y: 0,
                    duration: 1, ease: 'power2.out',
                    scrollTrigger: { trigger: sectionRef.current, start: 'top 50%' },
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
                {/* Question headline */}
                <div className="bq-headline">
                    <h2 className="font-drama italic text-3xl sm:text-5xl md:text-7xl lg:text-[5.5rem] text-brutal-bg leading-[1.05]">
                        What would you
                    </h2>
                    <div className="mt-1 md:mt-2">
                        <span
                            className="font-drama italic text-3xl sm:text-5xl md:text-7xl lg:text-[5.5rem] leading-[1.05]"
                            style={{ perspective: '600px' }}
                        >
                            <RotatingWord />
                            <span className="text-brutal-bg">?</span>
                        </span>
                    </div>
                </div>

                {/* Carousel */}
                <div className="bq-carousel mt-10 md:mt-14 w-full">
                    <OrbitCarousel projects={carouselProjects} />
                </div>

                {/* Subtitle — static, no fading */}
                <p className="bq-sub font-data text-xs md:text-sm text-brutal-bg/35 mt-6 max-w-md leading-relaxed">
                    Real projects built by makers in the lab. Click any to explore.
                </p>
            </div>
        </section>
    );
}
