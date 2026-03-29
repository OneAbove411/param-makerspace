import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Target, Wrench, TrendingUp, GitBranch, Star, ExternalLink, Code2, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

gsap.registerPlugin(ScrollTrigger);

/**
 * MakerLoop — Section 5 "How It Works"
 *
 * Three steps: Pick a Challenge → Build & Share → Grow Your Skills
 * Each card has a repo-link style preview showing example project repos.
 * Cards are interactable with hover effects and link through to Projects page.
 */

interface RepoCard {
    name: string;
    desc: string;
    lang: string;
    langColor: string;
    stars: number;
    contributors: number;
}

const STEP_REPOS: RepoCard[][] = [
    // Step 01 — Pick a Challenge: browseable challenge repos
    [
        { name: 'led-matrix-challenge', desc: 'Drive an 8x8 LED matrix with custom patterns', lang: 'C++', langColor: '#f34b7d', stars: 12, contributors: 4 },
        { name: 'line-follower-bot', desc: 'Build a line-following robot from scratch', lang: 'Python', langColor: '#3572A5', stars: 8, contributors: 3 },
    ],
    // Step 02 — Build & Share: project repos in progress
    [
        { name: 'bio-lamp-v2', desc: 'Bioluminescent desk lamp — build log & schematics', lang: 'Arduino', langColor: '#bd79d1', stars: 15, contributors: 2 },
        { name: 'cnc-pen-plotter', desc: 'DIY CNC plotter using stepper motors', lang: 'G-code', langColor: '#e4cc98', stars: 21, contributors: 5 },
    ],
    // Step 03 — Grow Your Skills: community showcase repos
    [
        { name: 'smart-greenhouse', desc: 'IoT greenhouse with auto climate control', lang: 'TypeScript', langColor: '#3178c6', stars: 34, contributors: 8 },
        { name: 'robot-arm-6dof', desc: '6-DOF robotic arm with inverse kinematics', lang: 'Python', langColor: '#3572A5', stars: 47, contributors: 12 },
    ],
];

function RepoPreview({ repos }: { repos: RepoCard[] }) {
    const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

    return (
        <div className="w-full px-4 py-3 space-y-2.5">
            {repos.map((repo, i) => (
                <div
                    key={repo.name}
                    onMouseEnter={() => setHoveredIdx(i)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    className={`
                        group/repo bg-brutal-dark/[0.03] border border-brutal-dark/8 rounded-lg p-3.5
                        cursor-pointer transition-all duration-300
                        ${hoveredIdx === i ? 'border-brutal-red/30 bg-brutal-dark/[0.06] shadow-sm' : 'hover:border-brutal-dark/15'}
                    `}
                >
                    {/* Repo name */}
                    <div className="flex items-center gap-2 mb-1.5">
                        <Code2 size={13} className="text-brutal-dark/30 flex-shrink-0" />
                        <span className="font-data text-xs font-bold text-brutal-dark/80 group-hover/repo:text-brutal-red transition-colors truncate">
                            {repo.name}
                        </span>
                        <ExternalLink size={10} className="text-brutal-dark/20 group-hover/repo:text-brutal-red/50 transition-colors ml-auto flex-shrink-0" />
                    </div>

                    {/* Description */}
                    <p className="font-data text-[10px] text-brutal-dark/40 leading-relaxed mb-2 line-clamp-1">
                        {repo.desc}
                    </p>

                    {/* Meta row */}
                    <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: repo.langColor }} />
                            <span className="font-data text-[9px] text-brutal-dark/40">{repo.lang}</span>
                        </span>
                        <span className="flex items-center gap-0.5 font-data text-[9px] text-brutal-dark/30">
                            <Star size={9} /> {repo.stars}
                        </span>
                        <span className="flex items-center gap-0.5 font-data text-[9px] text-brutal-dark/30">
                            <Users size={9} /> {repo.contributors}
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
}

const STEPS = [
    {
        num: '01',
        title: 'Pick a Challenge',
        desc: 'Browse beginner-friendly challenges across electronics, robotics, design, and more. Each one tells you exactly what to build.',
        icon: Target,
        repos: STEP_REPOS[0],
    },
    {
        num: '02',
        title: 'Build & Share',
        desc: 'Work at your own pace. Document what you tried, what broke, and what worked — upload your files and share your repo.',
        icon: Wrench,
        repos: STEP_REPOS[1],
    },
    {
        num: '03',
        title: 'Grow Your Skills',
        desc: 'Every project earns XP and unlocks new ranks. Collaborate, fork, and learn from what others have built.',
        icon: TrendingUp,
        repos: STEP_REPOS[2],
    },
];

export function MakerLoop() {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            // Accent line
            gsap.fromTo('.loop-line',
                { scaleX: 0 },
                {
                    scaleX: 1, duration: 1, ease: 'power2.inOut',
                    scrollTrigger: { trigger: containerRef.current, start: 'top 75%' }
                }
            );

            // Header
            gsap.fromTo('.loop-header',
                { y: 30, opacity: 0 },
                {
                    y: 0, opacity: 1,
                    duration: 0.7, stagger: 0.08, ease: 'power2.out',
                    scrollTrigger: { trigger: containerRef.current, start: 'top 70%' }
                }
            );

            // Cards stagger in
            gsap.fromTo('.loop-card',
                { y: 60, opacity: 0 },
                {
                    y: 0, opacity: 1,
                    duration: 0.8, stagger: 0.15, ease: 'power2.out',
                    scrollTrigger: { trigger: '.loop-grid', start: 'top 80%' }
                }
            );
        }, containerRef);
        return () => ctx.revert();
    }, []);

    return (
        <section
            id="maker-loop"
            ref={containerRef}
            className="py-24 md:py-32 px-6 md:px-12 lg:px-24 bg-brutal-bg"
        >
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-14">
                    <div className="loop-line w-16 h-0.5 bg-brutal-red mb-8 origin-left" />
                    <p className="loop-header font-data text-xs text-brutal-red uppercase tracking-[0.2em] mb-4">
                        How It Works
                    </p>
                    <h2 className="loop-header font-heading font-bold text-2xl sm:text-3xl md:text-5xl uppercase tracking-tight-heading">
                        Three steps to start building.
                    </h2>
                    <p className="loop-header font-data text-sm text-brutal-dark/50 mt-4 max-w-lg">
                        Pick something to build, make it real, learn from the process. Then do it again.
                    </p>
                </div>

                {/* Step cards — repo-link style previews */}
                <div className="loop-grid grid grid-cols-1 md:grid-cols-3 gap-8">
                    {STEPS.map((step) => {
                        const Icon = step.icon;
                        return (
                            <Link
                                to="/projects"
                                key={step.num}
                                className="loop-card bg-brutal-bg border-2 border-brutal-dark/8 rounded-2xl
                                           overflow-hidden hover:border-brutal-red/30
                                           transition-all duration-500
                                           hover:shadow-[0_12px_40px_rgba(196,41,30,0.08)]
                                           hover:-translate-y-1 block no-underline"
                            >
                                {/* Text content */}
                                <div className="p-8 pb-5">
                                    <div className="flex items-start justify-between mb-4">
                                        <span className="font-data text-3xl sm:text-4xl md:text-5xl font-black text-brutal-red/60 leading-none select-none">
                                            {step.num}
                                        </span>
                                        <div className="w-10 h-10 rounded-full bg-brutal-dark/5 flex items-center justify-center flex-shrink-0">
                                            <Icon size={18} className="text-brutal-dark/40" />
                                        </div>
                                    </div>
                                    <h3 className="font-heading font-bold text-lg uppercase tracking-tight-heading mb-3">
                                        {step.title}
                                    </h3>
                                    <p className="font-data text-sm text-brutal-dark/50 leading-relaxed">
                                        {step.desc}
                                    </p>
                                </div>

                                {/* Repo preview area */}
                                <div className="border-t border-brutal-dark/5 bg-brutal-bg">
                                    <div className="flex items-center gap-2 px-4 pt-3 pb-0">
                                        <GitBranch size={12} className="text-brutal-dark/25" />
                                        <span className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-dark/30">
                                            Example Repos
                                        </span>
                                    </div>
                                    <RepoPreview repos={step.repos} />
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
