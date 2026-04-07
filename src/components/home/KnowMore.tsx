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

gsap.registerPlugin(ScrollTrigger);

/**
 * KnowMore — collapses WhatIsParam, MakerLoop, and RankPath into a single
 * white-background section with three connected node-cards. Default state
 * is collapsed (~280px tall row); click any card to expand its panel
 * inline beneath the row using the same GSAP height-animation language
 * as RankPath.
 *
 * Visual language matches the rest of the home — accent line, uppercase
 * eyebrow, brutal sans heading, red accents — and reuses the rank-rail
 * "node + connector" idea so the three topics feel like a single journey
 * instead of three separate slabs.
 *
 * No information is lost from the original three sections; the content is
 * inlined here in three panel components.
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

export function KnowMore() {
    const containerRef = useRef<HTMLDivElement>(null);
    const convertRef = useRef<HTMLDivElement>(null);
    const [openKey, setOpenKey] = useState<KnowKey | null>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const panelInnerRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const { user } = useAuth();

    // Section entrance — match RankPath/MakerLoop timing exactly
    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.fromTo('.km-line',
                { scaleX: 0 },
                {
                    scaleX: 1, duration: 1, ease: 'power2.inOut',
                    scrollTrigger: { trigger: containerRef.current, start: 'top 75%' }
                }
            );
            gsap.fromTo('.km-header',
                { y: 30, opacity: 0 },
                {
                    y: 0, opacity: 1,
                    duration: 0.7, stagger: 0.08, ease: 'power2.out',
                    scrollTrigger: { trigger: containerRef.current, start: 'top 70%' }
                }
            );
            gsap.fromTo('.km-node',
                { y: 50, opacity: 0, scale: 0.95 },
                {
                    y: 0, opacity: 1, scale: 1,
                    duration: 0.7, stagger: 0.12, ease: 'power2.out',
                    scrollTrigger: { trigger: '.km-grid', start: 'top 80%' }
                }
            );
            gsap.fromTo('.km-connector',
                { scaleX: 0 },
                {
                    scaleX: 1, duration: 1.2, ease: 'power2.inOut',
                    scrollTrigger: { trigger: '.km-grid', start: 'top 80%' }
                }
            );
            // Convert strip — folded-in ClosingCTA
            gsap.fromTo('.convert-element',
                { y: 40, opacity: 0 },
                {
                    y: 0, opacity: 1,
                    duration: 0.8, stagger: 0.1, ease: 'power2.out',
                    scrollTrigger: { trigger: convertRef.current, start: 'top 80%' }
                }
            );
        }, containerRef);
        return () => ctx.revert();
    }, []);

    // Inline expand panel — RankPath language: animate height to scrollHeight on open
    useEffect(() => {
        if (!panelRef.current || !panelInnerRef.current) return;
        if (openKey) {
            const target = panelInnerRef.current.scrollHeight;
            gsap.to(panelRef.current, {
                height: target,
                duration: 0.5,
                ease: 'power2.out',
                overwrite: 'auto',
            });
            // Fade in inner content
            gsap.fromTo(panelInnerRef.current,
                { opacity: 0, y: 12 },
                { opacity: 1, y: 0, duration: 0.5, delay: 0.1, ease: 'power2.out', overwrite: 'auto' }
            );
        } else {
            gsap.to(panelRef.current, {
                height: 0,
                duration: 0.35,
                ease: 'power2.inOut',
                overwrite: 'auto',
            });
        }
    }, [openKey]);

    const handleToggle = (key: KnowKey) => {
        setOpenKey(prev => (prev === key ? null : key));
    };

    return (
        <section
            ref={containerRef}
            className="pt-32 md:pt-40 bg-brutal-bg"
        >
            <div className="max-w-6xl mx-auto px-6 md:px-12 lg:px-24">
                {/* Header — same accent line + eyebrow + heading rhythm as the rest */}
                <div className="km-line w-16 h-0.5 bg-brutal-red mb-8 origin-left" />
                <p className="km-header font-data text-xs text-brutal-red uppercase tracking-[0.2em] mb-4">
                    Know More
                </p>
                <h2 className="km-header font-heading font-bold text-2xl sm:text-3xl md:text-5xl uppercase tracking-tight-heading">
                    Three things to understand
                    <span className="text-brutal-red"> before you build.</span>
                </h2>
                <p className="km-header font-data text-sm text-brutal-dark/50 mt-4 max-w-lg">
                    Open one at a time. The rest stay quiet.
                </p>

                {/* Node row — connected by a faint horizontal line, like the rank rail */}
                <div className="km-grid mt-14 relative">
                    {/* Connector line, desktop only */}
                    <div className="hidden md:block absolute top-9 left-[12%] right-[12%] h-px pointer-events-none">
                        <div className="km-connector w-full h-full bg-gradient-to-r from-brutal-red/40 via-brutal-dark/15 to-brutal-red/40 origin-left" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 relative">
                        {CARDS.map((card) => (
                            <NodeCard
                                key={card.key}
                                card={card}
                                isOpen={openKey === card.key}
                                onToggle={() => handleToggle(card.key)}
                            />
                        ))}
                    </div>
                </div>

                {/* Inline expand panel — single shared panel beneath the row */}
                <div ref={panelRef} className="overflow-hidden mt-8" style={{ height: 0 }}>
                    <div ref={panelInnerRef}>
                        <div className="border-t-2 border-brutal-red/15 pt-10">
                            {openKey === 'what' && <WhatPanel />}
                            {openKey === 'how' && <HowPanel />}
                            {openKey === 'grow' && <GrowPanel />}
                        </div>
                    </div>
                </div>

            </div>

            {/* ─── Final Convert Strip ───
                Folded in from the old standalone ClosingCTA section. Sits at the
                end of KnowMore as a full-bleed dark slab with one strong line and
                one button. Lives outside max-w-6xl so it bleeds edge to edge. */}
            <div
                ref={convertRef}
                className="mt-24 md:mt-32 bg-brutal-dark text-brutal-bg px-6 md:px-12 lg:px-24 py-20 md:py-28 relative overflow-hidden"
            >
                <div className="max-w-3xl mx-auto flex flex-col items-center text-center">
                    <p className="convert-element font-data text-xs text-brutal-bg/30 uppercase tracking-[0.2em] mb-6">
                        {user ? 'Keep building' : 'Ready to start?'}
                    </p>

                    <h2 className="convert-element font-heading font-bold text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-brutal-bg leading-[1.1] uppercase tracking-tight-heading">
                        {user
                            ? "Your next build is waiting."
                            : "You don't need permission to build something amazing."}
                    </h2>

                    <p className="convert-element font-data text-sm text-brutal-bg/35 mt-6 max-w-md leading-relaxed">
                        {user
                            ? 'Pick up a fresh challenge or jump back into your dashboard. The lab is always open.'
                            : 'Join a community of makers who started exactly where you are now — curious, excited, and ready to learn by doing.'}
                    </p>

                    <div className="convert-element mt-10">
                        <Button
                            size="lg"
                            onClick={() => navigate(user ? '/challenges' : '/register')}
                            className="uppercase font-bold text-sm tracking-widest
                                       shadow-[0_0_40px_rgba(196,41,30,0.2)]
                                       hover:shadow-[0_0_60px_rgba(196,41,30,0.4)]
                                       transition-shadow duration-500
                                       group/cta"
                        >
                            <span className="flex items-center gap-2">
                                {user ? 'Browse Challenges' : 'Create Your Free Account'}
                                <ArrowRight size={16} className="group-hover/cta:translate-x-1 transition-transform duration-300" />
                            </span>
                        </Button>
                    </div>

                    <Link
                        to={user ? '/projects' : '/challenges'}
                        className="convert-element mt-5 font-data text-sm text-brutal-bg/35
                                   hover:text-brutal-bg/60 transition-colors duration-300
                                   underline-offset-4 hover:underline"
                    >
                        {user ? 'Or explore the project gallery →' : 'Or browse challenges first →'}
                    </Link>
                </div>
            </div>
        </section>
    );
}

// ─── Node card — collapsed default state ───
interface NodeCardProps {
    card: KnowCard;
    isOpen: boolean;
    onToggle: () => void;
}

function NodeCard({ card, isOpen, onToggle }: NodeCardProps) {
    const Icon = card.icon;
    return (
        <button
            onClick={onToggle}
            className={`km-node group/node text-left bg-brutal-bg border-2 rounded-2xl p-7
                       transition-all duration-500 cursor-pointer relative
                       ${isOpen
                           ? 'border-brutal-red/60 shadow-[0_12px_40px_rgba(196,41,30,0.10)]'
                           : 'border-brutal-dark/8 hover:border-brutal-red/30 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(196,41,30,0.06)]'
                       }`}
            aria-expanded={isOpen}
        >
            {/* Active-state pointer — visually ties this card to the expanded
                panel below. Simple downward triangle made from CSS borders. */}
            {isOpen && (
                <span
                    aria-hidden="true"
                    className="hidden md:block absolute left-1/2 -translate-x-1/2 -bottom-[14px] w-0 h-0
                               border-l-[12px] border-l-transparent
                               border-r-[12px] border-r-transparent
                               border-t-[12px] border-t-brutal-red/60"
                />
            )}
            {/* Icon node — sits on the connector line */}
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
            <p className="font-data text-sm text-brutal-dark/55 leading-relaxed mb-5">
                {card.teaser}
            </p>

            {/* Know more affordance — flips to "Close" when open */}
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

// ─── Panel 1: What is Param (formerly WhatIsParam) ───
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
                        <p className="font-data text-sm text-brutal-dark/55 leading-relaxed">
                            {p.desc}
                        </p>
                    </div>
                );
            })}
        </div>
    );
}

// ─── Panel 2: How it works (formerly MakerLoop) ───
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
                            <p className="font-data text-xs text-brutal-dark/50 leading-relaxed">
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
    );
}

// ─── Panel 3: Six Ranks (formerly RankPath) ───
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
            <p className="font-drama italic text-lg md:text-xl text-brutal-dark/70 mb-8 max-w-xl">
                Everyone starts at Curious. Where you go is up to you.
            </p>

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
                                key={rank}
                                onClick={() => setActiveRank(rank)}
                                className="flex flex-col items-center text-center cursor-pointer group/rank"
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
                <p className="font-data text-sm text-brutal-dark/65 leading-relaxed">
                    {RANK_DETAILS[activeRank]}
                </p>
            </div>

            {/* Pathway to badges link */}
            <Link
                to="/badges"
                className="inline-flex items-center gap-2 mt-8 font-data text-[11px] font-bold text-brutal-red uppercase tracking-[0.2em] hover:gap-3 transition-all"
            >
                Explore the badge catalog <ArrowRight size={13} />
            </Link>
        </div>
    );
}
