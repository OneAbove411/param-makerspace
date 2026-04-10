import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';

gsap.registerPlugin(ScrollTrigger);

/**
 * FeaturedProjects — Section 6
 *
 * Now fetches REAL projects from Supabase with real images and maker names.
 * Stats (project count, maker count) are live from the database.
 * Cards link to actual project detail pages.
 * Falls back to placeholder data if DB is empty.
 */

interface FeaturedProject {
    id: string;
    title: string;
    domain: string;
    summary: string;
    maker: string;
    image: string;
}

const FALLBACK_PROJECTS: FeaturedProject[] = [
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
    const [projects, setProjects] = useState<FeaturedProject[]>(FALLBACK_PROJECTS);
    const [projectCount, setProjectCount] = useState(0);
    const [makerCount, setMakerCount] = useState(0);
    const statsReady = useRef(false);

    // Fetch real projects and stats
    useEffect(() => {
        async function fetchData() {
            // Fetch 3 featured projects with owner name
            const { data: dbProjects } = await supabase
                .from('project')
                .select('id, title, domain, summary, owner_id')
                .eq('status', 'active')
                .eq('visibility', 'public')
                .order('created_at', { ascending: false })
                .limit(3);

            if (dbProjects && dbProjects.length > 0) {
                // Fetch images and owner names in parallel
                const projectIds = dbProjects.map(p => p.id);
                const ownerIds = [...new Set(dbProjects.map(p => p.owner_id))];

                const [imagesRes, ownersRes] = await Promise.all([
                    supabase
                        .from('project_image')
                        .select('project_id, image_url')
                        .in('project_id', projectIds)
                        .order('display_order', { ascending: true }),
                    supabase
                        .from('app_user')
                        .select('id, name')
                        .in('id', ownerIds),
                ]);

                // Map first image per project
                const imageMap: Record<string, string> = {};
                (imagesRes.data || []).forEach(img => {
                    if (!imageMap[img.project_id]) {
                        imageMap[img.project_id] = img.image_url;
                    }
                });

                // Map owner names
                const ownerMap: Record<string, string> = {};
                (ownersRes.data || []).forEach((u: any) => {
                    ownerMap[u.id] = u.name || 'Unknown';
                });

                const real: FeaturedProject[] = dbProjects.map((p, i) => ({
                    id: p.id,
                    title: p.title,
                    domain: p.domain || 'Maker',
                    summary: p.summary || '',
                    maker: ownerMap[p.owner_id] || 'Unknown',
                    image: imageMap[p.id] || FALLBACK_PROJECTS[i % FALLBACK_PROJECTS.length].image,
                }));

                setProjects(real);
            }

            // Fetch total project count
            const { count: totalProjects } = await supabase
                .from('project')
                .select('id', { count: 'exact', head: true })
                .eq('status', 'active')
                .eq('visibility', 'public');

            // Fetch active maker count (public profiles)
            const { count: totalMakers } = await supabase
                .from('maker_profile')
                .select('id', { count: 'exact', head: true })
                .eq('is_public', true);

            setProjectCount(totalProjects || 0);
            setMakerCount(totalMakers || 0);
            statsReady.current = true;
        }
        fetchData();
    }, []);

    const handleCardClick = (id: string) => {
        setExpandedId(expandedId === id ? null : id);
    };

    // Animate expand/collapse
    useEffect(() => {
        projects.forEach((project) => {
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
    }, [expandedId, projects]);

    // Entrance animations (run once on mount)
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

    // Stat count-up — runs AFTER data loads so data-target has real values
    // Uses ScrollTrigger if section is below viewport, or animates immediately
    // if the user already scrolled past it before data arrived.
    useEffect(() => {
        if (projectCount === 0 && makerCount === 0) return;
        const ctx = gsap.context(() => {
            gsap.utils.toArray<HTMLElement>('.stat-number').forEach((el) => {
                const target = parseInt(el.dataset.target || '0', 10);
                if (target === 0) return;

                // Check if element is already in or above the viewport
                const rect = el.getBoundingClientRect();
                const alreadyVisible = rect.top < window.innerHeight * 0.85;

                if (alreadyVisible) {
                    // Already scrolled past — animate immediately
                    gsap.fromTo(el,
                        { innerText: 0 },
                        {
                            innerText: target,
                            duration: 1.8, ease: 'power2.out',
                            snap: { innerText: 1 },
                        }
                    );
                } else {
                    // Not yet visible — use scroll trigger
                    gsap.fromTo(el,
                        { innerText: 0 },
                        {
                            innerText: target,
                            duration: 1.8, ease: 'power2.out',
                            snap: { innerText: 1 },
                            scrollTrigger: { trigger: el, start: 'top 85%' }
                        }
                    );
                }
            });
        }, containerRef);
        return () => ctx.revert();
    }, [projectCount, makerCount]);

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
                    <div className="fp-header flex gap-6 sm:gap-10 md:gap-14">
                        <Link to="/projects" className="group hover:opacity-80 transition-opacity">
                            <span className="stat-number font-data text-4xl md:text-5xl font-bold text-brutal-dark tabular-nums" data-target={projectCount || 0}>0</span>
                            <p className="font-data text-[10px] text-brutal-dark/40 uppercase tracking-widest mt-1 group-hover:text-brutal-red transition-colors">Projects Built</p>
                        </Link>
                        <div className="w-px bg-brutal-dark/10 hidden md:block" />
                        <Link to="/makers" className="group hover:opacity-80 transition-opacity">
                            <span className="stat-number font-data text-4xl md:text-5xl font-bold text-brutal-dark tabular-nums" data-target={makerCount || 0}>0</span>
                            <p className="font-data text-[10px] text-brutal-dark/40 uppercase tracking-widest mt-1 group-hover:text-brutal-red transition-colors">Active Makers</p>
                        </Link>
                    </div>
                </div>

                {/* Project cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {projects.map((project) => (
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
                            {/* Image — clicking the image navigates to project */}
                            <Link to={`/projects/${project.id}`} onClick={(e) => e.stopPropagation()}>
                                <div className="aspect-[4/3] bg-brutal-dark/10 overflow-hidden">
                                    <img
                                        src={project.image}
                                        alt={project.title}
                                        className="w-full h-full object-cover group-hover:scale-105
                                                   transition-transform duration-700 ease-out"
                                        loading="lazy"
                                    />
                                </div>
                            </Link>

                            {/* Content */}
                            <div className="p-6">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1">
                                        <span className="font-data text-[10px] text-brutal-red uppercase tracking-[0.15em] font-bold">
                                            #{project.domain}
                                        </span>
                                        <Link to={`/projects/${project.id}`} onClick={(e) => e.stopPropagation()}>
                                            <h3 className="font-heading font-bold text-lg mt-2 tracking-tight-heading
                                                           group-hover:text-brutal-red transition-colors duration-300">
                                                {project.title}
                                            </h3>
                                        </Link>
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
                                    <Link
                                        to={`/projects/${project.id}`}
                                        onClick={(e) => e.stopPropagation()}
                                        className="inline-flex items-center gap-1 font-data text-xs font-bold text-brutal-red
                                                   hover:underline mt-3"
                                    >
                                        View Project <ArrowRight size={12} />
                                    </Link>
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
                        Explore Project Archive
                        <ArrowRight size={16} className="group-hover/link:translate-x-1 transition-transform duration-300" />
                    </Link>
                </div>
            </div>
        </section>
    );
}
