import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
    Lightbulb, Users, Rocket,
    Target, Wrench, TrendingUp,
    GitBranch, Star, ExternalLink, Code2,
    ArrowRight, Plus,
} from 'lucide-react';
import { RANK_ORDER, RANK_THRESHOLDS } from '../../lib/xpEngine';
import { getBadgeIcon } from '../../lib/badgeIcons';
import { useAuth } from '../../lib/auth';
import { Button } from '../ui/Button';
import { MagneticCard } from '../ui/MagneticCard';

gsap.registerPlugin(ScrollTrigger);

/**
 * KnowMore — Section 1D
 *
 * Implements the audit findings from UX_MASTER section 1D:
 *  - First node-card (`What is Param`) is open by default; the other two
 *    stay collapsed. The most common visitor question shouldn't need a click.
 *  - A dashed SVG spline now connects the three node-cards; its dash offset
 *    animates on scroll so the line "draws" as you scroll past. Reduced
 *    motion → static line.
 *  - The convert CTA strip is promoted into a pinned 600ms moment with the
 *    same italic-serif treatment as the hero, plus a MagneticCard primary
 *    button.
 *  - The CTA branches on `useAuth()` for logged-in vs logged-out copy and
 *    destinations.
 *  - WhatPanel / HowPanel / GrowPanel typography normalised:
 *      h2  → font-drama italic text-5xl md:text-7xl
 *      body → font-data text-base text-brutal-dark/75 leading-relaxed
 *      pull-quote uses the red accent line.
 *  - prefers-reduced-motion guards every entrance animation in the section.
 */

type KnowKey = 'what' | 'how' | 'grow';

interface KnowCard {
    key: KnowKey;
    eyebrow: string;
    title: string;
    teaser: string;
    icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
}

const CARDS: KnowCard[] = [
    {
        key: 'what',
        eyebrow: 'New Here?',
        title: 'What is Param?',
        teaser: 'A community of makers — not a classroom. Anyone who builds belongs here.',
        icon: Lightbulb,
    },
    {
        key: 'how',
        eyebrow: 'How It Works',
        title: 'The Maker Loop',
        teaser: 'Pick a challenge. Build it. Share what you learned. Then do it again.',
        icon: Wrench,
    },
    {
        key: 'grow',
        eyebrow: 'Your Growth',
        title: 'Six Ranks. One Journey.',
        teaser: 'Curious to Lab Pro — every project earns XP and unlocks new tools.',
        icon: TrendingUp,
    },
];

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

export function KnowMore() {
    const containerRef = useRef<HTMLDivElement>(null);
    const convertRef = useRef<HTMLDivElement>(null);
    // All three cards collapsed by default — minimalism first, expansion is
    // reserved for the curious. Click any card to reveal its panel.
    const [openKey, setOpenKey] = useState<KnowKey | null>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const panelInnerRef = useRef<HTMLDivElement>(null);
    const splineRef = useRef<SVGPathElement>(null);
    const navigate = useNavigate();
    const { user } = useAuth();
    const reducedMotion = usePrefersReducedMotion();

    // Section entrance — match RankPath/MakerLoop timing exactly
    useEffect(() => {
        if (reducedMotion) return;
        const ctx = gsap.context(() => {
            gsap.fromTo('.km-line',
                { scaleX: 0 },
                {
                    scaleX: 1, duration: 1, ease: 'power2.inOut',
                    scrollTrigger: { trigger: containerRef.current, start: 'top 75%' },
                },
            );
            gsap.fromTo('.km-header',
                { y: 30, opacity: 0 },
                {
                    y: 0, opacity: 1,
                    duration: 0.7, stagger: 0.08, ease: 'power2.out',
                    scrollTrigger: { trigger: containerRef.current, start: 'top 70%' },
                },
            );
            gsap.fromTo('.km-node',
                { y: 50, opacity: 0, scale: 0.95 },
                {
                    y: 0, opacity: 1, scale: 1,
                    duration: 0.7, stagger: 0.12, ease: 'power2.out',
                    scrollTrigger: { trigger: '.km-grid', start: 'top 80%' },
                },
            );

            // Dashed SVG spline draws on scroll. Uses dash-offset animation
            // tied to a scrub trigger so the line "writes itself" as the user
            // scrolls past the row.
            if (splineRef.current) {
                const path = splineRef.current;
                const length = path.getTotalLength();
                gsap.set(path, { strokeDasharray: `6 6`, strokeDashoffset: length });
                gsap.to(path, {
                    strokeDashoffset: 0,
                    ease: 'none',
                    scrollTrigger: {
                        trigger: '.km-grid',
                        start: 'top 85%',
                        end: 'bottom 60%',
                        scrub: 0.6,
                    },
                });
            }

            // Convert strip — folded-in ClosingCTA. Plain scroll-in reveal,
            // no pin (the pin broke the next section's scroll and ate space
            // on mobile). The headline + magnetic button still feel like a
            // moment because of the dark slab + the staggered fade.
            gsap.fromTo('.convert-element',
                { y: 40, opacity: 0 },
                {
                    y: 0, opacity: 1,
                    duration: 0.8, stagger: 0.1, ease: 'power2.out',
                    scrollTrigger: { trigger: convertRef.current, start: 'top 80%' },
                },
            );
        }, containerRef);
        return () => ctx.revert();
    }, [reducedMotion]);

    // Desktop inline expand panel. This is the ORIGINAL animation, scoped to
    // `md:` and up (we hide the panel on mobile and render an inline panel
    // directly below each card instead — see the mobile branch in the JSX).
    useEffect(() => {
        if (!panelRef.current || !panelInnerRef.current) return;
        // Mobile uses per-card inline rendering, so the desktop panel's
        // height animation must be inert below md — skip the whole effect
        // when the desktop panel is display:none.
        if (typeof window !== 'undefined' && !window.matchMedia('(min-width: 768px)').matches) {
            return;
        }
        if (openKey) {
            const target = panelInnerRef.current.scrollHeight;
            if (reducedMotion) {
                gsap.set(panelRef.current, { height: target });
                gsap.set(panelInnerRef.current, { opacity: 1, y: 0 });
            } else {
                gsap.to(panelRef.current, {
                    height: target,
                    duration: 0.5,
                    ease: 'power2.out',
                    overwrite: 'auto',
                });
                gsap.fromTo(panelInnerRef.current,
                    { opacity: 0, y: 12 },
                    { opacity: 1, y: 0, duration: 0.5, delay: 0.1, ease: 'power2.out', overwrite: 'auto' },
                );
            }
        } else {
            if (reducedMotion) {
                gsap.set(panelRef.current, { height: 0 });
            } else {
                gsap.to(panelRef.current, {
                    height: 0,
                    duration: 0.35,
                    ease: 'power2.inOut',
                    overwrite: 'auto',
                });
            }
        }
    }, [openKey, reducedMotion]);

    // Refs to each card wrapper (mobile) so we can scroll the newly opened
    // card into view. This fixes the bug where tapping a card on mobile
    // silently opened content below the next two cards, so the user thought
    // nothing happened.
    const cardWrapperRefs = useRef<Partial<Record<KnowKey, HTMLDivElement | null>>>({});

    const handleToggle = (key: KnowKey) => {
        setOpenKey((prev) => {
            const next = prev === key ? null : key;
            // On mobile, when OPENING a card, scroll it into view on the next
            // frame (after the panel has laid out) so the user can actually
            // SEE the expanded content without having to manually scroll down
            // past the two stacked sibling cards.
            if (next && typeof window !== 'undefined') {
                const isMobile = !window.matchMedia('(min-width: 768px)').matches;
                if (isMobile) {
                    // Wait two frames: one for React to commit, one for GSAP
                    // / CSS to start laying the panel out.
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            const el = cardWrapperRefs.current[next];
                            if (el && typeof el.scrollIntoView === 'function') {
                                el.scrollIntoView({
                                    behavior: reducedMotion ? 'auto' : 'smooth',
                                    block: 'start',
                                });
                            }
                        });
                    });
                }
            }
            return next;
        });
    };

    // Render helper: the inline-panel content for a given card key. Shared
    // between the desktop single-panel and the mobile per-card panel.
    const renderPanelContent = (key: KnowKey) => {
        if (key === 'what') return <WhatPanel />;
        if (key === 'how') return <HowPanel />;
        return <GrowPanel />;
    };

    return (
        <section
            ref={containerRef}
            // Mobile-first top padding: pt-20 (80px) on phones gives breathing
            // room without wasting a full viewport, scaling up on larger screens.
            className="pt-20 sm:pt-28 md:pt-40 bg-brutal-bg"
        >
            <div className="max-w-6xl mx-auto px-5 sm:px-6 md:px-12 lg:px-24">
                {/* Header — accent line + eyebrow + heading rhythm */}
                <div className="km-line w-16 h-0.5 bg-brutal-red mb-8 origin-left" />
                <p className="km-header font-data text-xs text-brutal-red uppercase tracking-[0.2em] mb-4">
                    Know More
                </p>
                <h2 className="km-header font-drama italic text-[2rem] leading-[1.08] sm:text-4xl md:text-6xl md:leading-[1.05] text-brutal-dark mb-4 break-words">
                    Three things to understand
                    <span className="text-brutal-red"> before you build.</span>
                </h2>
                <p className="km-header font-data text-sm sm:text-base text-brutal-dark/75 leading-relaxed mt-4 max-w-lg">
                    Open one at a time. The rest stay quiet.
                </p>

                {/* Node row + dashed SVG spline */}
                <div className="km-grid mt-10 sm:mt-14 relative">
                    {/* SVG spline — draws on scroll. Reduced-motion → static dashed line. */}
                    <svg
                        className="hidden md:block absolute top-9 left-[12%] right-[12%] h-px pointer-events-none w-[76%]"
                        viewBox="0 0 1000 2"
                        preserveAspectRatio="none"
                        aria-hidden="true"
                    >
                        <path
                            ref={splineRef}
                            d="M 0 1 Q 250 -10 500 1 T 1000 1"
                            stroke="rgba(196,41,30,0.4)"
                            strokeWidth="1"
                            fill="none"
                            strokeDasharray="6 6"
                        />
                    </svg>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 md:gap-8 relative">
                        {CARDS.map((card) => (
                            <div
                                key={card.key}
                                ref={(el) => {
                                    cardWrapperRefs.current[card.key] = el;
                                }}
                                // `contents` on mobile would break scroll
                                // target measurements, so we use a real wrapper.
                                className="flex flex-col"
                            >
                                <NodeCard
                                    card={card}
                                    isOpen={openKey === card.key}
                                    onToggle={() => handleToggle(card.key)}
                                />
                                {/* Mobile-only: inline expand panel directly
                                    below the clicked card. Hidden on md+ —
                                    desktop uses the single panel below the
                                    grid. This fixes the "clicked the card and
                                    nothing happened" mobile UX bug where the
                                    panel was rendering far below, off-screen. */}
                                {openKey === card.key && (
                                    <div
                                        className="md:hidden mt-4 animate-km-expand"
                                        aria-live="polite"
                                    >
                                        <div className="border-t-2 border-brutal-red/15 pt-6">
                                            {renderPanelContent(card.key)}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Desktop-only inline expand panel. Hidden on mobile — the
                    per-card mobile panels above handle the small-screen UX. */}
                <div ref={panelRef} className="hidden md:block overflow-hidden mt-6 sm:mt-8" style={{ height: 0 }}>
                    <div ref={panelInnerRef}>
                        <div className="border-t-2 border-brutal-red/15 pt-10">
                            {openKey && renderPanelContent(openKey)}
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── Final Convert Strip — magnetic, branching on auth ─── */}
            <div
                ref={convertRef}
                className="mt-16 sm:mt-20 md:mt-32 bg-brutal-dark text-brutal-bg px-5 sm:px-6 md:px-12 lg:px-24 py-14 sm:py-20 md:py-28 relative overflow-hidden"
            >
                    <div className="max-w-3xl mx-auto flex flex-col items-center text-center">
                        <p className="convert-element font-data text-[11px] sm:text-xs text-brutal-bg/30 uppercase tracking-[0.2em] mb-5 sm:mb-6">
                            {user ? 'Keep building' : 'Ready to start?'}
                        </p>

                        <h2 className="convert-element font-drama italic text-[1.75rem] leading-[1.1] sm:text-5xl md:text-6xl md:leading-[1.05] text-brutal-bg break-words">
                            {user
                                ? 'Your next build is waiting.'
                                : "You don't need permission to build something amazing."}
                        </h2>

                        {/* Red accent pull-quote line */}
                        <div className="convert-element mt-5 sm:mt-6 w-12 h-0.5 bg-brutal-red" aria-hidden="true" />

                        <p className="convert-element font-data text-sm sm:text-base text-brutal-bg/75 leading-relaxed mt-5 sm:mt-6 max-w-md">
                            {user
                                ? 'Pick up a fresh challenge or jump back into your dashboard. The lab is always open.'
                                : 'Join a community of makers who started exactly where you are now — curious, excited, and ready to learn by doing.'}
                        </p>

                        <div className="convert-element mt-8 sm:mt-10 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                            <MagneticCard intensity={5}>
                                <Button
                                    size="lg"
                                    onClick={() => navigate(user ? '/dashboard' : '/register')}
                                    className="uppercase font-bold text-sm tracking-widest
                                               shadow-[0_0_40px_rgba(196,41,30,0.2)]
                                               hover:shadow-[0_0_60px_rgba(196,41,30,0.4)]
                                               transition-shadow duration-500
                                               group/cta"
                                >
                                    <span className="flex items-center gap-2">
                                        {user ? 'Open dashboard' : 'Join the lab'}
                                        <ArrowRight size={16} className="group-hover/cta:translate-x-1 transition-transform duration-300" />
                                    </span>
                                </Button>
                            </MagneticCard>
                            <Link
                                to={user ? '/challenges' : '/login'}
                                className="font-data text-sm text-brutal-bg/55 hover:text-brutal-bg
                                           uppercase tracking-wider underline-offset-4 hover:underline transition-colors duration-300"
                            >
                            {user ? 'Browse challenges' : 'Sign in'}
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}

// ─── Node card ───
interface NodeCardProps {
    card: KnowCard;
    isOpen: boolean;
    onToggle: () => void;
}

function NodeCard({ card, isOpen, onToggle }: NodeCardProps) {
    const Icon = card.icon;
    return (
        <button
            type="button"
            onClick={onToggle}
            className={`km-node group/node w-full text-left bg-brutal-bg border-2 rounded-2xl p-5 sm:p-6 md:p-7
                       transition-all duration-500 cursor-pointer relative min-h-[44px]
                       focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brutal-red
                       ${isOpen
                           ? 'border-brutal-red/60 shadow-[0_12px_40px_rgba(196,41,30,0.10)]'
                           : 'border-brutal-dark/10 hover:border-brutal-red/30 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(196,41,30,0.06)]'
                       }`}
            aria-expanded={isOpen}
        >
            {isOpen && (
                <span
                    aria-hidden="true"
                    className="hidden md:block absolute left-1/2 -translate-x-1/2 -bottom-[14px] w-0 h-0
                               border-l-[12px] border-l-transparent
                               border-r-[12px] border-r-transparent
                               border-t-[12px] border-t-brutal-red/60"
                />
            )}
            <div
                className={`w-14 h-14 rounded-full flex items-center justify-center relative z-10 mb-5
                            border-2 transition-all duration-300
                            ${isOpen
                                ? 'bg-brutal-red/15 border-brutal-red/60'
                                : 'bg-brutal-bg border-brutal-dark/15 group-hover/node:border-brutal-red/40 group-hover/node:bg-brutal-red/5'
                            }`}
            >
                <Icon
                    size={22}
                    strokeWidth={1.8}
                    className={`transition-colors duration-300 ${isOpen ? 'text-brutal-red' : 'text-brutal-dark/50 group-hover/node:text-brutal-red'}`}
                />
            </div>

            <p className="font-data text-[10px] text-brutal-red uppercase tracking-[0.2em] mb-2">
                {card.eyebrow}
            </p>
            <h3 className="font-heading font-bold text-lg uppercase tracking-tight-heading mb-3 leading-snug">
                {card.title}
            </h3>
            <p className="font-data text-base text-brutal-dark/75 leading-relaxed mb-5">
                {card.teaser}
            </p>

            <div className={`flex items-center gap-2 font-data text-[10px] font-bold uppercase tracking-[0.2em]
                            transition-colors duration-300
                            ${isOpen ? 'text-brutal-red' : 'text-brutal-dark/40 group-hover/node:text-brutal-red'}`}>
                <span>{isOpen ? 'Close' : 'Know More'}</span>
                <Plus
                    size={12}
                    strokeWidth={3}
                    className={`transition-transform duration-300 ${isOpen ? 'rotate-45' : 'group-hover/node:rotate-90'}`}
                />
            </div>
        </button>
    );
}

// ─── Panel 1: What is Param ───
const PILLARS = [
    {
        icon: Lightbulb,
        title: 'A Maker is anyone who builds.',
        desc: "You don't need a degree, fancy tools, or years of experience. If you're curious enough to try — you're already a maker.",
    },
    {
        icon: Users,
        title: 'A community, not a classroom.',
        desc: 'No lectures. You learn by doing — picking projects, getting stuck, asking for help, and figuring it out together.',
    },
    {
        icon: Rocket,
        title: 'Real projects, real impact.',
        desc: 'The things you build here — from 3D-printed prosthetics to interactive art — solve real problems and go out into the world.',
    },
];

function WhatPanel() {
    return (
        <div>
            {/* Pull-quote with red accent line */}
            <div className="border-l-2 border-brutal-red pl-5 mb-10 max-w-2xl">
                <p className="font-drama italic text-2xl md:text-3xl text-brutal-dark leading-snug">
                    Param is a community, not a classroom.
                </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {PILLARS.map((p) => {
                    const Icon = p.icon;
                    return (
                        <div
                            key={p.title}
                            className="bg-brutal-bg border-2 border-brutal-dark/8 rounded-2xl p-6
                                       hover:border-brutal-red/20 transition-all duration-500"
                        >
                            <div className="w-11 h-11 rounded-full bg-brutal-red/10 flex items-center justify-center mb-5">
                                <Icon size={20} className="text-brutal-red" strokeWidth={1.8} />
                            </div>
                            <h4 className="font-heading font-bold text-base tracking-tight-heading leading-snug mb-3">
                                {p.title}
                            </h4>
                            <p className="font-data text-base text-brutal-dark/75 leading-relaxed">
                                {p.desc}
                            </p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Panel 2: How it works ───
interface RepoCard {
    name: string;
    desc: string;
    lang: string;
    langColor: string;
    stars: number;
}

const STEP_REPOS: RepoCard[][] = [
    [
        { name: 'led-matrix-challenge', desc: 'Drive an 8x8 LED matrix with custom patterns', lang: 'C++', langColor: '#f34b7d', stars: 12 },
        { name: 'line-follower-bot', desc: 'Build a line-following robot from scratch', lang: 'Python', langColor: '#3572A5', stars: 8 },
    ],
    [
        { name: 'bio-lamp-v2', desc: 'Bioluminescent desk lamp — build log & schematics', lang: 'Arduino', langColor: '#bd79d1', stars: 15 },
        { name: 'cnc-pen-plotter', desc: 'DIY CNC plotter using stepper motors', lang: 'G-code', langColor: '#e4cc98', stars: 21 },
    ],
    [
        { name: 'smart-greenhouse', desc: 'IoT greenhouse with auto climate control', lang: 'TypeScript', langColor: '#3178c6', stars: 34 },
        { name: 'robot-arm-6dof', desc: '6-DOF robotic arm with inverse kinematics', lang: 'Python', langColor: '#3572A5', stars: 47 },
    ],
];

const STEPS = [
    {
        num: '01', title: 'Pick a Challenge', icon: Target,
        desc: 'Browse beginner-friendly challenges across electronics, robotics, design, and more. Each one tells you exactly what to build.',
        repos: STEP_REPOS[0],
    },
    {
        num: '02', title: 'Build & Share', icon: Wrench,
        desc: 'Work at your own pace. Document what you tried, what broke, and what worked — upload your files and share your repo.',
        repos: STEP_REPOS[1],
    },
    {
        num: '03', title: 'Grow Your Skills', icon: TrendingUp,
        desc: 'Every project earns XP and unlocks new ranks. Collaborate, fork, and learn from what others have built.',
        repos: STEP_REPOS[2],
    },
];

function HowPanel() {
    return (
        <div>
            <div className="border-l-2 border-brutal-red pl-5 mb-10 max-w-2xl">
                <p className="font-drama italic text-2xl md:text-3xl text-brutal-dark leading-snug">
                    Pick. Build. Share. Repeat.
                </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {STEPS.map((step) => {
                    const Icon = step.icon;
                    return (
                        <Link
                            to="/projects"
                            key={step.num}
                            className="bg-brutal-bg border-2 border-brutal-dark/8 rounded-2xl overflow-hidden
                                       hover:border-brutal-red/30 transition-all duration-500
                                       hover:shadow-[0_12px_40px_rgba(196,41,30,0.08)] block no-underline"
                        >
                            <div className="p-6 pb-4">
                                <div className="flex items-start justify-between mb-4">
                                    <span className="font-data text-3xl md:text-4xl font-black text-brutal-red/60 leading-none select-none">
                                        {step.num}
                                    </span>
                                    <div className="w-10 h-10 rounded-full bg-brutal-dark/5 flex items-center justify-center flex-shrink-0">
                                        <Icon size={17} className="text-brutal-dark/40" />
                                    </div>
                                </div>
                                <h4 className="font-heading font-bold text-base uppercase tracking-tight-heading mb-2">
                                    {step.title}
                                </h4>
                                <p className="font-data text-base text-brutal-dark/75 leading-relaxed">
                                    {step.desc}
                                </p>
                            </div>

                            <div className="border-t border-brutal-dark/5 bg-brutal-bg">
                                <div className="flex items-center gap-2 px-4 pt-3 pb-0">
                                    <GitBranch size={11} className="text-brutal-dark/25" />
                                    <span className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-dark/30">
                                        Example Repos
                                    </span>
                                </div>
                                <div className="px-3 pb-3 pt-2 space-y-2">
                                    {step.repos.map((repo) => (
                                        <div
                                            key={repo.name}
                                            className="bg-brutal-dark/[0.03] border border-brutal-dark/8 rounded-lg p-3
                                                       transition-all duration-300 hover:border-brutal-red/30"
                                        >
                                            <div className="flex items-center gap-2 mb-1">
                                                <Code2 size={11} className="text-brutal-dark/30 flex-shrink-0" />
                                                <span className="font-data text-[11px] font-bold text-brutal-dark/80 truncate">
                                                    {repo.name}
                                                </span>
                                                <ExternalLink size={9} className="text-brutal-dark/20 ml-auto flex-shrink-0" />
                                            </div>
                                            <p className="font-data text-[10px] text-brutal-dark/40 leading-relaxed mb-1.5 line-clamp-1">
                                                {repo.desc}
                                            </p>
                                            <div className="flex items-center gap-3">
                                                <span className="flex items-center gap-1">
                                                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: repo.langColor }} />
                                                    <span className="font-data text-[9px] text-brutal-dark/40">{repo.lang}</span>
                                                </span>
                                                <span className="flex items-center gap-0.5 font-data text-[9px] text-brutal-dark/30">
                                                    <Star size={8} /> {repo.stars}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Panel 3: Six Ranks ───
const RANK_DETAILS: Record<string, string> = {
    'Curious': 'Where everyone starts. Show up, explore, attend your first workshop.',
    'Tinkerer': "You've completed a few projects and proved you can finish what you start.",
    'Builder': 'You lead small teams and help others learn. 10+ builds under your belt.',
    'Maker': "You've mastered advanced tools and contribute knowledge back to the community.",
    'Innovator': "You've created something original — an open-source tool, a new technique, a program.",
    'Lab Pro': 'The highest rank. You teach, mentor, and help run the lab itself.',
};

function GrowPanel() {
    const [activeRank, setActiveRank] = useState<string>('Curious');
    return (
        <div>
            <div className="border-l-2 border-brutal-red pl-5 mb-10 max-w-2xl">
                <p className="font-drama italic text-2xl md:text-3xl text-brutal-dark leading-snug">
                    Everyone starts at Curious. Where you go is up to you.
                </p>
            </div>

            {/* Rank rail */}
            <div className="relative">
                <div className="hidden md:block absolute top-7 left-[8%] right-[8%] h-px pointer-events-none">
                    <div className="w-full h-full bg-gradient-to-r from-brutal-red/40 via-brutal-dark/10 to-brutal-red/40" />
                </div>

                <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                    {RANK_ORDER.map((rank) => {
                        const Icon = getBadgeIcon({ name: rank, badge_type: 'achievement', domain: 'General' });
                        const isActive = activeRank === rank;
                        return (
                            <button
                                type="button"
                                key={rank}
                                onClick={() => setActiveRank(rank)}
                                aria-pressed={isActive}
                                aria-label={`View ${rank} rank details`}
                                className="flex flex-col items-center text-center cursor-pointer group/rank min-h-[44px] rounded-lg p-1
                                           focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brutal-red"
                            >
                                <div
                                    className={`
                                        w-14 h-14 rounded-full flex items-center justify-center relative z-10
                                        border-2 transition-all duration-300
                                        ${isActive
                                            ? 'bg-brutal-red/15 border-brutal-red/60'
                                            : 'bg-brutal-bg border-brutal-dark/15 group-hover/rank:bg-brutal-red/5 group-hover/rank:border-brutal-red/30'
                                        }
                                    `}
                                >
                                    <Icon
                                        size={22}
                                        className={`transition-colors duration-300 ${isActive ? 'text-brutal-red' : 'text-brutal-dark/50'}`}
                                        strokeWidth={1.5}
                                    />
                                </div>
                                <h4 className={`font-heading font-bold text-xs md:text-sm uppercase mt-3 tracking-tight-heading
                                    transition-colors duration-300
                                    ${isActive ? 'text-brutal-red' : 'text-brutal-dark/55'}`}>
                                    {rank}
                                </h4>
                                <span className="font-data text-[9px] text-brutal-dark/35 uppercase tracking-widest mt-1">
                                    {RANK_THRESHOLDS[rank]} XP
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Active rank description */}
            <div className="mt-10 max-w-xl">
                <p className="font-data text-[10px] font-bold text-brutal-red uppercase tracking-[0.2em] mb-2">
                    {activeRank} · {RANK_THRESHOLDS[activeRank]} XP
                </p>
                <p className="font-data text-base text-brutal-dark/75 leading-relaxed">
                    {RANK_DETAILS[activeRank]}
                </p>
            </div>

            <Link
                to="/badges"
                className="inline-flex items-center gap-2 mt-8 font-data text-[11px] font-bold text-brutal-red uppercase tracking-[0.2em] hover:gap-3 transition-all"
            >
                Explore the badge catalog <ArrowRight size={13} />
            </Link>
        </div>
    );
}
