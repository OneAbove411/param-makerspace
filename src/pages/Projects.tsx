import { useState, useEffect, useRef } from 'react';
import { useProjects } from '../lib/hooks';
import { Card } from '../components/ui/Card';
import { MagneticCard } from '../components/ui/MagneticCard';
import { Link, useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight, Plus, ChevronDown } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const DOMAINS = ['All', 'Software & Robotics', 'Fabrication', 'Electronics'];

// ─── Featured Project Banner ───

function FeaturedBanner({ project }: { project: any }) {
    const bannerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!bannerRef.current) return;
        const ctx = gsap.context(() => {
            gsap.fromTo('.feat-text',
                { y: 30, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.8, stagger: 0.1, ease: 'power3.out', delay: 0.3 }
            );
        }, bannerRef);
        return () => ctx.revert();
    }, [project?.id]);

    if (!project) return null;

    const coverImage = (project as any).cover_image_url || (project as any).coverImage;

    return (
        <Link to={`/projects/${project.id}`} className="block group">
            <div
                ref={bannerRef}
                className="relative rounded-[2rem] overflow-hidden h-[340px] md:h-[420px] bg-brutal-dark mb-16"
            >
                {/* Background image */}
                {coverImage ? (
                    <img
                        src={coverImage}
                        alt={project.title}
                        className="absolute inset-0 w-full h-full object-cover opacity-60
                                   group-hover:opacity-75 group-hover:scale-105 transition-all duration-700 ease-out"
                    />
                ) : (
                    <div
                        className="absolute inset-0"
                        style={{
                            backgroundImage: 'radial-gradient(circle, rgba(245,243,238,0.05) 1px, transparent 1px)',
                            backgroundSize: '24px 24px',
                        }}
                    />
                )}

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-brutal-dark via-brutal-dark/50 to-transparent" />

                {/* Content */}
                <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12 flex items-end justify-between">
                    <div className="max-w-2xl">
                        <span className="feat-text inline-block bg-brutal-red text-brutal-bg px-3 py-1 font-data text-[10px]
                                        font-bold uppercase tracking-widest rounded mb-4">
                            Featured Project
                        </span>
                        <h2 className="feat-text font-drama italic text-3xl md:text-5xl text-brutal-bg leading-tight">
                            {project.title}
                        </h2>
                        {project.domain && (
                            <p className="feat-text font-data text-xs text-brutal-red mt-3 uppercase tracking-widest">
                                #{project.domain}
                            </p>
                        )}
                    </div>
                    <div className="feat-text hidden md:flex items-center gap-2 bg-brutal-bg/10 backdrop-blur-sm
                                    border border-brutal-bg/20 rounded-full px-6 py-3 font-heading font-bold text-sm
                                    text-brutal-bg uppercase tracking-widest group-hover:bg-brutal-bg/20
                                    transition-colors duration-300">
                        View Project
                        <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform duration-300" />
                    </div>
                </div>
            </div>
        </Link>
    );
}

// ─── "Propose a Project" CTA Card ───

function ProposeCTA() {
    const navigate = useNavigate();
    return (
        <div
            onClick={() => navigate('/dashboard')}
            className="group cursor-pointer h-full"
        >
            <Card className="h-full flex flex-col items-center justify-center p-8 border-dashed
                             border-brutal-dark/15 hover:border-brutal-red/40 transition-all duration-500
                             bg-brutal-bg hover:bg-brutal-red/[0.03] min-h-[320px]">
                <div className="w-14 h-14 rounded-full border-2 border-brutal-dark/10 flex items-center justify-center
                                group-hover:border-brutal-red/30 group-hover:bg-brutal-red/5 transition-all duration-500">
                    <Plus size={24} className="text-brutal-dark/25 group-hover:text-brutal-red transition-colors duration-500" />
                </div>
                <h3 className="font-heading font-bold text-lg mt-6 text-brutal-dark/50
                               group-hover:text-brutal-dark transition-colors duration-500 text-center">
                    Be the first to build<br />something
                </h3>
                <p className="font-data text-[10px] text-brutal-dark/30 uppercase tracking-[0.15em] mt-3
                              group-hover:text-brutal-dark/50 transition-colors duration-500">
                    Start your own legacy
                </p>
                <div className="mt-6 px-5 py-2.5 rounded-full border-2 border-brutal-dark/15 font-heading font-bold
                                text-xs uppercase tracking-widest text-brutal-dark/40
                                group-hover:bg-brutal-dark group-hover:text-brutal-bg group-hover:border-brutal-dark
                                transition-all duration-500 flex items-center gap-2">
                    Propose a Project
                    <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform duration-300" />
                </div>
            </Card>
        </div>
    );
}

// ─── Skeleton loader ───

function ProjectSkeleton() {
    return (
        <Card className="h-full flex flex-col animate-pulse">
            <div className="h-48 bg-brutal-dark/5" />
            <div className="p-6 space-y-4 flex-1">
                <div className="h-3 w-20 bg-brutal-dark/8 rounded" />
                <div className="h-6 w-3/4 bg-brutal-dark/8 rounded" />
                <div className="h-3 w-full bg-brutal-dark/5 rounded" />
                <div className="h-3 w-2/3 bg-brutal-dark/5 rounded" />
            </div>
        </Card>
    );
}

// ─── Main Projects Page ───

export function Projects() {
    const [filter, setFilter] = useState('All');
    const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
    const { data: projects, loading } = useProjects(filter, sortBy);
    const pageRef = useRef<HTMLDivElement>(null);
    const hasAnimated = useRef(false);

    // GSAP scroll animations
    useEffect(() => {
        if (loading || hasAnimated.current) return;
        hasAnimated.current = true;

        const ctx = gsap.context(() => {
            // Page title entrance
            gsap.fromTo('.archive-title',
                { y: 60, opacity: 0 },
                { y: 0, opacity: 1, duration: 1, ease: 'power3.out', delay: 0.1 }
            );

            // Filter bar entrance
            gsap.fromTo('.filter-bar',
                { y: 30, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out', delay: 0.25 }
            );

            // Project cards stagger in
            gsap.fromTo('.project-card-animated',
                { y: 60, opacity: 0 },
                {
                    y: 0, opacity: 1,
                    duration: 0.7, stagger: 0.08,
                    ease: 'power3.out',
                    scrollTrigger: { trigger: '.project-grid', start: 'top 80%' }
                }
            );
        }, pageRef);

        return () => ctx.revert();
    }, [loading]);

    // Re-trigger card animations on filter change
    useEffect(() => {
        if (loading) return;
        const cards = document.querySelectorAll('.project-card-animated');
        gsap.fromTo(cards,
            { y: 40, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.5, stagger: 0.06, ease: 'power3.out' }
        );
    }, [filter, sortBy, loading]);

    const featuredProject = projects && projects.length > 0 ? projects[0] : null;
    const gridProjects = projects ? projects.slice(1) : [];

    return (
        <div ref={pageRef} className="flex-1 w-full bg-brutal-bg pt-28 md:pt-32 px-6 md:px-12 lg:px-24 min-h-screen">
            <div className="max-w-7xl mx-auto">

                {/* ─── Page Title ─── */}
                <h1 className="archive-title font-heading font-bold text-5xl md:text-7xl uppercase
                               tracking-tight-heading mb-4">
                    Project Archive
                </h1>

                {/* ─── Filter Bar ─── */}
                <div className="filter-bar flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12
                                border-b border-brutal-dark/10 pb-6 mt-10">
                    {/* Domain pills */}
                    <div className="flex flex-wrap gap-3">
                        {DOMAINS.map(d => (
                            <button
                                key={d}
                                onClick={() => setFilter(d)}
                                className={`px-5 py-2 font-data text-xs font-bold uppercase tracking-wider
                                           rounded-full transition-all duration-300 border-2
                                           ${filter === d
                                        ? 'bg-brutal-dark text-brutal-bg border-brutal-dark shadow-[0_2px_12px_rgba(17,17,17,0.15)]'
                                        : 'border-brutal-dark/15 text-brutal-dark/60 hover:border-brutal-dark/40 hover:text-brutal-dark'
                                    }`}
                            >
                                {d}
                            </button>
                        ))}
                    </div>

                    {/* Sort dropdown */}
                    <div className="flex items-center gap-3">
                        <span className="font-data text-[10px] font-bold uppercase text-brutal-dark/40 tracking-widest">
                            Sort by:
                        </span>
                        <div className="relative">
                            <select
                                className="appearance-none bg-brutal-bg border-2 border-brutal-dark/15 rounded-full
                                           px-5 py-2 pr-9 font-data text-xs font-bold uppercase tracking-wider
                                           focus:outline-none focus:border-brutal-dark transition-colors cursor-pointer"
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest')}
                            >
                                <option value="newest">Newest First</option>
                                <option value="oldest">Oldest First</option>
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-brutal-dark/40 pointer-events-none" />
                        </div>
                    </div>
                </div>

                {/* ─── Featured Project Banner ─── */}
                {!loading && featuredProject && <FeaturedBanner project={featuredProject} />}

                {/* ─── Project Grid ─── */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-32">
                        {[...Array(6)].map((_, i) => <ProjectSkeleton key={i} />)}
                    </div>
                ) : (
                    <div className="project-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-32">
                        {gridProjects.map((project) => {
                            const coverImage = (project as any).cover_image_url || (project as any).coverImage;

                            return (
                                <MagneticCard
                                    key={project.id}
                                    intensity={4}
                                    glowOnHover
                                    className="project-card-animated"
                                >
                                    <Link to={`/projects/${project.id}`} className="block h-full group">
                                        <Card className="h-full flex flex-col group-hover:border-brutal-red/30
                                                        transition-colors duration-500">
                                            {/* Image */}
                                            <div className="h-52 w-full overflow-hidden bg-brutal-dark relative">
                                                {coverImage ? (
                                                    <img
                                                        src={coverImage}
                                                        alt={project.title}
                                                        className="w-full h-full object-cover opacity-75
                                                                   group-hover:opacity-100 group-hover:scale-105
                                                                   transition-all duration-700 ease-out"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center"
                                                         style={{
                                                             backgroundImage: 'radial-gradient(circle, rgba(245,243,238,0.08) 1px, transparent 1px)',
                                                             backgroundSize: '20px 20px',
                                                         }}>
                                                        <span className="font-data text-brutal-bg/15 text-xs uppercase tracking-widest">
                                                            No Preview
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Tier badge */}
                                                <div className="absolute top-4 left-4 flex gap-2">
                                                    {project.tier === 'Tier 3' ? (
                                                        <span className="bg-brutal-red text-brutal-bg px-3 py-1 text-[9px] font-bold
                                                                        font-data rounded-full uppercase tracking-wider shadow-md">
                                                            T3 Architect
                                                        </span>
                                                    ) : (
                                                        <span className="bg-brutal-bg/90 text-brutal-dark/60 px-3 py-1 text-[9px] font-bold
                                                                        font-data rounded-full uppercase tracking-wider shadow-sm
                                                                        border border-brutal-dark/5 backdrop-blur-sm">
                                                            Independent
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Hover arrow overlay */}
                                                <div className="absolute bottom-4 right-4 w-8 h-8 rounded-full bg-brutal-bg/0
                                                                group-hover:bg-brutal-bg/90 flex items-center justify-center
                                                                transition-all duration-500 opacity-0 group-hover:opacity-100
                                                                translate-y-2 group-hover:translate-y-0">
                                                    <ArrowRight size={14} className="text-brutal-dark" />
                                                </div>
                                            </div>

                                            {/* Content */}
                                            <div className="p-6 flex-1 flex flex-col">
                                                {project.domain && (
                                                    <span className="text-[10px] font-data font-bold uppercase tracking-[0.15em] text-brutal-red mb-3">
                                                        #{project.domain}
                                                    </span>
                                                )}

                                                <h3 className="font-heading font-bold text-xl mb-2 line-clamp-2 leading-tight
                                                               tracking-tight-heading group-hover:text-brutal-red transition-colors duration-300">
                                                    {project.title}
                                                </h3>
                                                <p className="font-data text-sm text-brutal-dark/50 line-clamp-2 mb-6 flex-1 leading-relaxed">
                                                    {project.summary}
                                                </p>

                                                <div className="flex items-center justify-between border-t border-brutal-dark/5 pt-4 mt-auto">
                                                    <div className="font-data text-[10px] font-bold text-brutal-dark/35 uppercase tracking-widest">
                                                        {project.duration || 'Ongoing'}
                                                    </div>
                                                </div>
                                            </div>
                                        </Card>
                                    </Link>
                                </MagneticCard>
                            );
                        })}

                        {/* Propose a Project CTA card — always last in grid */}
                        <div className="project-card-animated">
                            <ProposeCTA />
                        </div>

                        {/* Empty state */}
                        {gridProjects.length === 0 && !featuredProject && (
                            <div className="col-span-full py-24 text-center space-y-4">
                                <div className="font-heading font-bold text-5xl text-brutal-dark/10 uppercase tracking-tight-heading">
                                    No Projects Yet
                                </div>
                                <p className="font-data text-sm text-brutal-dark/30">
                                    {filter !== 'All'
                                        ? `No ${filter} projects found. Try a different domain.`
                                        : 'Be the first to propose a project and start building.'}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* ─── Load More (placeholder for pagination) ─── */}
                {projects && projects.length > 7 && (
                    <div className="text-center pb-20 -mt-16">
                        <button className="font-data text-xs font-bold uppercase tracking-[0.2em] text-brutal-dark/40
                                           hover:text-brutal-dark transition-colors border-t border-brutal-dark/10 pt-6 px-8">
                            Load Archive Files ({projects.length - 7} remaining)
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
