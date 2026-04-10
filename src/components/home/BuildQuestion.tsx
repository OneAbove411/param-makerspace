import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { supabase } from '../../lib/supabase';
import { Skeleton } from '../ui/Skeleton';
import { MagneticCard } from '../ui/MagneticCard';

gsap.registerPlugin(ScrollTrigger);

/**
 * BuildQuestion — Section 1B
 *
 * Implements the audit findings from UX_MASTER section 1B:
 *  - Skeletons reserve grid space until projects load (no CLS).
 *  - Rotating verb pool ≥ 12 maker-flavored entries with a ghost mono badge.
 *  - Verb rotation respects prefers-reduced-motion, settles after 3 cycles or
 *    12s in-view, and exposes a manual shuffle button.
 *  - Each tile is wrapped in MagneticCard with a parallax thumbnail on hover.
 *  - Reads picked intent from sessionStorage (set by WelcomeHero) to bias
 *    matching projects to the front and pre-highlight the first match.
 *  - Click navigates to /projects/:id with view-transition where supported.
 *  - Mobile collapses to a 2-column grid with a clamp()'d verb font size.
 */

interface CarouselProject {
    id: string;
    title: string;
    domain: string;
    image: string;
}

const DOMAIN_ICONS: Record<string, string> = {
    'Robotics': '🤖',
    'IoT': '📡',
    'AI / ML': '🧠',
    '3D Printing': '🖨️',
    'Electronics': '⚡',
};

// Placeholder projects shown when Supabase has no public/active projects yet.
// Images sourced from Pexels (free for commercial use, no attribution required).
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

// ── Verb pool (≥ 12, maker-flavored). Each verb gets a ghost 1-letter badge ──
const ROTATING_WORDS = [
    'build', 'solder', 'prototype', 'flash', 'print', 'wire',
    'code', 'cast', 'mill', 'weld', 'etch', 'ship',
];
const SETTLE_VERB = 'build';

// Random scatter positions per card
const SCATTER_TRANSFORMS = [
    { x: -180, y: -120, rotate: -12, scale: 0.7 },
    { x: 140, y: -90, rotate: 8, scale: 0.65 },
    { x: -100, y: 80, rotate: 15, scale: 0.75 },
    { x: 200, y: 60, rotate: -6, scale: 0.6 },
    { x: -220, y: 30, rotate: 10, scale: 0.7 },
    { x: 160, y: 110, rotate: -14, scale: 0.65 },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function usePrefersReducedMotion() {
    const [reduced, setReduced] = useState(false);
    useEffect(() => {
        if (typeof window === 'undefined' || !window.matchMedia) return;
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        const update = () => setReduced(mq.matches);
        update();
        mq.addEventListener?.('change', update);
        return () => mq.removeEventListener?.('change', update);
    }, []);
    return reduced;
}

/** Map a picked intent label like "a Robot" to a project domain string. */
function intentToDomain(intent: string | null): string | null {
    if (!intent) return null;
    const t = intent.toLowerCase();
    if (t.includes('robot')) return 'Robotics';
    if (t.includes('lamp') || t.includes('light')) return 'Electronics';
    if (t.includes('iot') || t.includes('sensor')) return 'IoT';
    if (t.includes('game')) return 'AI / ML';
    if (t.includes('drone') || t.includes('arm')) return 'Robotics';
    return null;
}

function navigateWithViewTransition(href: string, navigate: () => void) {
    const doc = document as Document & {
        startViewTransition?: (cb: () => void) => void;
    };
    if (typeof doc.startViewTransition === 'function') {
        doc.startViewTransition(() => navigate());
    } else {
        navigate();
    }
}

// ── Scatter-to-grid tile renderer ────────────────────────────────────────────

interface ScatterGridProps {
    projects: CarouselProject[];
    highlightId: string | null;
    reducedMotion: boolean;
}

function ScatterGrid({ projects, highlightId, reducedMotion }: ScatterGridProps) {
    const gridRef = useRef<HTMLDivElement>(null);
    const cardsRef = useRef<(HTMLDivElement | null)[]>([]);
    const hasAnimated = useRef(false);

    useEffect(() => {
        if (!gridRef.current || hasAnimated.current) return;
        const cards = cardsRef.current.filter(Boolean) as HTMLElement[];
        if (cards.length === 0) return;

        // Reduced-motion: just fade in without scatter.
        if (reducedMotion) {
            gsap.set(cards, { opacity: 1, x: 0, y: 0, rotation: 0, scale: 1 });
            hasAnimated.current = true;
            return;
        }

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

        const tl = gsap.timeline({
            scrollTrigger: { trigger: gridRef.current, start: 'top 65%', once: true },
            onComplete: () => { hasAnimated.current = true; },
        });

        tl.to(cards, {
            opacity: 1,
            scale: (i: number) => SCATTER_TRANSFORMS[i % SCATTER_TRANSFORMS.length].scale,
            duration: 0.4,
            stagger: 0.06,
            ease: 'power2.out',
        });
        tl.to(cards, {
            x: 0, y: 0, rotation: 0, scale: 1,
            duration: 0.9, stagger: 0.08, ease: 'power3.out', delay: 0.3,
        });

        return () => { tl.kill(); };
    }, [projects, reducedMotion]);

    const handleClick = (e: React.MouseEvent, href: string) => {
        e.preventDefault();
        navigateWithViewTransition(href, () => {
            // Use full navigation to keep view-transition snapshots consistent.
            window.history.pushState({}, '', href);
            window.dispatchEvent(new PopStateEvent('popstate'));
        });
    };

    return (
        <div
            ref={gridRef}
            className="relative w-full grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-5 max-w-2xl mx-auto"
        >
            {projects.map((project, i) => {
                const icon = DOMAIN_ICONS[project.domain] || '🔧';
                const isHighlight = highlightId !== null && project.id === highlightId;

                const tile = (
                    <MagneticCard
                        intensity={4}
                        liftOnHover={!reducedMotion}
                        className="rounded-xl"
                    >
                        <div
                            ref={el => { cardsRef.current[i] = el; }}
                            data-tile
                            className={`group/tile rounded-xl overflow-hidden border
                                       bg-brutal-dark/60 backdrop-blur-sm cursor-pointer
                                       transition-colors duration-300 will-change-transform
                                       ${isHighlight
                                           ? 'border-brutal-red/70 shadow-[0_0_0_1px_rgba(196,41,30,0.5)]'
                                           : 'border-brutal-bg/10 hover:border-brutal-red/40'
                                       }`}
                        >
                            <div className="aspect-[4/3] overflow-hidden bg-brutal-bg/5 flex items-center justify-center">
                                {project.image ? (
                                    <img
                                        src={project.image}
                                        alt={project.title}
                                        className="w-full h-full object-cover transition-transform duration-500 ease-out
                                                   motion-safe:group-hover/tile:-translate-y-1"
                                        loading="lazy"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none';
                                            const parent = (e.target as HTMLImageElement).parentElement;
                                            const fallback = parent?.querySelector('span');
                                            if (fallback) (fallback as HTMLElement).style.display = '';
                                        }}
                                    />
                                ) : null}
                                <span
                                    className="text-3xl md:text-4xl opacity-60 select-none"
                                    style={project.image ? { display: 'none' } : {}}
                                    aria-hidden="true"
                                >
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
                    </MagneticCard>
                );

                if (project.id) {
                    const href = `/projects/${project.id}`;
                    return (
                        <Link
                            key={project.id}
                            to={href}
                            onClick={(e) => handleClick(e, href)}
                            aria-label={`Open project ${project.title}`}
                        >
                            {tile}
                        </Link>
                    );
                }
                return <div key={`placeholder-${i}`}>{tile}</div>;
            })}
        </div>
    );
}

// ── Rotating verb — starts at "build", loops forever, smooth crossfade ───
// Reduced-motion: locks to "build" with no animation. No more ghost letter
// badge, no settle clock, no shuffle button — just a clean recursive loop.

interface RotatingWordProps {
    reducedMotion: boolean;
}

function RotatingWord({ reducedMotion }: RotatingWordProps) {
    // Always start at "build" so the headline reads correctly on first paint.
    const buildIdx = Math.max(0, ROTATING_WORDS.indexOf(SETTLE_VERB));
    const [index, setIndex] = useState(buildIdx);
    const wordRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        if (reducedMotion) {
            setIndex(buildIdx);
            return;
        }
        const interval = window.setInterval(() => {
            if (!wordRef.current) return;
            gsap.to(wordRef.current, {
                y: -25, opacity: 0, rotateX: -30,
                duration: 0.4, ease: 'power2.in',
                onComplete: () => {
                    setIndex(prev => (prev + 1) % ROTATING_WORDS.length);
                    if (wordRef.current) {
                        gsap.fromTo(
                            wordRef.current,
                            { y: 25, opacity: 0, rotateX: 30 },
                            { y: 0, opacity: 1, rotateX: 0, duration: 0.5, ease: 'power2.out' },
                        );
                    }
                },
            });
        }, 2600);
        return () => window.clearInterval(interval);
    }, [reducedMotion, buildIdx]);

    const verb = ROTATING_WORDS[index] ?? SETTLE_VERB;

    return (
        <span
            ref={wordRef}
            className="inline-block text-brutal-red"
            style={{ perspective: '600px' }}
            aria-live="polite"
            aria-atomic="true"
        >
            {verb}
        </span>
    );
}

// ── Main component ───────────────────────────────────────────────────────────

export function BuildQuestion() {
    const sectionRef = useRef<HTMLDivElement>(null);
    const reducedMotion = usePrefersReducedMotion();
    const [carouselProjects, setCarouselProjects] = useState<CarouselProject[] | null>(null);
    const [pickedIntent, setPickedIntent] = useState<string | null>(null);

    // Read picked intent on mount + when sessionStorage changes within tab.
    useEffect(() => {
        try {
            const v = window.sessionStorage.getItem('param:pickedIntent');
            if (v) setPickedIntent(v);
        } catch { /* ignore */ }
        const handler = () => {
            try {
                const v = window.sessionStorage.getItem('param:pickedIntent');
                setPickedIntent(v);
            } catch { /* ignore */ }
        };
        window.addEventListener('storage', handler);
        return () => window.removeEventListener('storage', handler);
    }, []);

    // Fetch real projects, then bias by picked intent.
    useEffect(() => {
        let cancelled = false;
        // Safety net: if Supabase is unreachable or hangs, fall back to
        // placeholders after 4s so the grid never stays stuck on skeletons.
        const failsafe = window.setTimeout(() => {
            if (!cancelled) {
                setCarouselProjects(prev => prev ?? PLACEHOLDER_PROJECTS);
            }
        }, 4000);
        async function fetchProjects() {
            try {
            const { data: projects } = await supabase
                .from('project')
                .select('id, title, domain')
                .eq('status', 'active')
                .eq('visibility', 'public')
                .order('created_at', { ascending: false })
                .limit(12);

            if (cancelled) return;
            if (!projects || projects.length === 0) {
                // No real projects yet — fall back to the placeholder set so
                // the grid is never empty. Audit fix: previously this set [].
                setCarouselProjects(PLACEHOLDER_PROJECTS);
                return;
            }

            const projectIds = projects.map(p => p.id);
            const { data: images } = await supabase
                .from('project_image')
                .select('project_id, image_url')
                .in('project_id', projectIds)
                .order('display_order', { ascending: true });

            if (cancelled) return;
            const imageMap: Record<string, string> = {};
            (images || []).forEach((img: { project_id: string; image_url: string }) => {
                if (!imageMap[img.project_id]) imageMap[img.project_id] = img.image_url;
            });

            const real: CarouselProject[] = projects.map(p => ({
                id: p.id,
                title: p.title,
                domain: p.domain || 'Maker',
                image: imageMap[p.id] || '',
            }));

            setCarouselProjects(real.slice(0, 6));
            } catch {
                if (!cancelled) {
                    setCarouselProjects(prev => prev ?? PLACEHOLDER_PROJECTS);
                }
            }
        }
        fetchProjects();
        return () => {
            cancelled = true;
            window.clearTimeout(failsafe);
        };
    }, []);

    // Reorder so any project matching the picked intent's domain leads.
    const orderedProjects = useMemo(() => {
        if (!carouselProjects) return null;
        const targetDomain = intentToDomain(pickedIntent);
        if (!targetDomain) return carouselProjects;
        const matching = carouselProjects.filter(p => p.domain === targetDomain);
        const others = carouselProjects.filter(p => p.domain !== targetDomain);
        return [...matching, ...others];
    }, [carouselProjects, pickedIntent]);

    const highlightId = useMemo(() => {
        if (!orderedProjects) return null;
        const targetDomain = intentToDomain(pickedIntent);
        if (!targetDomain) return null;
        const match = orderedProjects.find(p => p.domain === targetDomain && p.id);
        return match?.id ?? null;
    }, [orderedProjects, pickedIntent]);

    // Headline / sub entrance
    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.fromTo('.bq-headline',
                { opacity: 0, y: 40 },
                {
                    opacity: 1, y: 0, duration: 0.8, ease: 'power2.out',
                    scrollTrigger: { trigger: sectionRef.current, start: 'top 60%' },
                },
            );
            gsap.fromTo('.bq-carousel',
                { opacity: 0 },
                {
                    opacity: 1, duration: 0.5, ease: 'power2.out',
                    scrollTrigger: { trigger: sectionRef.current, start: 'top 55%' },
                },
            );
            gsap.fromTo('.bq-sub',
                { opacity: 0, y: 15 },
                {
                    opacity: 0.35, y: 0, duration: 0.8, ease: 'power2.out',
                    scrollTrigger: { trigger: sectionRef.current, start: 'top 45%' },
                },
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
            {/* Dark bg with dot grid */}
            <div
                className="absolute inset-0 bg-brutal-dark"
                style={{
                    backgroundImage: 'radial-gradient(circle, rgba(245,243,238,0.03) 1px, transparent 1px)',
                    backgroundSize: '40px 40px',
                }}
                aria-hidden="true"
            />

            <div className="relative z-10 flex flex-col items-center text-center w-full max-w-4xl">
                <div className="bq-headline w-16 h-0.5 bg-brutal-red mb-8 origin-left mx-auto" />
                <p className="bq-headline font-data text-xs text-brutal-red uppercase tracking-[0.2em] mb-4">
                    The Spark
                </p>

                {/* Eyebrow that echoes the picked intent */}
                {pickedIntent && (
                    <p className="bq-headline font-data text-[11px] text-brutal-bg/55 italic mb-3">
                        because you said “{pickedIntent}” →
                    </p>
                )}

                {/* Question headline. clamp() shrinks the verb on mobile. */}
                <div className="bq-headline">
                    <h2 className="font-heading font-bold text-2xl sm:text-4xl md:text-5xl lg:text-[3.75rem] text-brutal-bg leading-[1.05] uppercase tracking-tight-heading">
                        What would you
                    </h2>
                    <div className="mt-1 md:mt-2 flex flex-wrap items-center justify-center gap-2 md:gap-3">
                        <span
                            className="font-heading font-bold leading-[1.05] uppercase tracking-tight-heading inline-flex items-baseline gap-2"
                            style={{ perspective: '600px', fontSize: 'clamp(1.75rem, 6vw, 3.75rem)' }}
                        >
                            <RotatingWord reducedMotion={reducedMotion} />
                            <span className="text-brutal-bg">?</span>
                        </span>
                    </div>
                </div>

                {/* Project Grid — skeleton until data lands, then scatter-to-grid */}
                <div className="bq-carousel mt-10 md:mt-14 w-full">
                    {orderedProjects === null ? (
                        <div
                            className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-5 max-w-2xl mx-auto"
                            aria-label="Loading featured projects"
                        >
                            <Skeleton variant="card" count={6} className="bg-brutal-bg/5 border-brutal-bg/10" />
                        </div>
                    ) : (
                        <ScatterGrid
                            projects={orderedProjects}
                            highlightId={highlightId}
                            reducedMotion={reducedMotion}
                        />
                    )}
                </div>

                <p className="bq-sub font-data text-xs md:text-sm text-brutal-bg/35 mt-6 max-w-md leading-relaxed">
                    Real projects built by makers in the lab. Click any to explore.
                </p>
            </div>
        </section>
    );
}
