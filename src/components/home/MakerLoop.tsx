import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Target, Wrench, TrendingUp } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

/**
 * MakerLoop — Section 5 "How It Works"
 *
 * Design critique of previous version:
 * - Interactive visuals (QuestCardStack, BuildProgress, XPCounter) were HIDDEN
 *   behind "Tap to explore" accordion. These ARE the selling point! A goldfish
 *   user never clicks to discover them.
 * - "Fading icons don't show the full picture" — the icons were behind a click
 *   and faded in/out with inconsistent timing.
 *
 * New approach:
 * - Everything visible. Three columns, each showing:
 *   step number + title + description + interactive visual
 * - Interactive visuals run continuously and are ALWAYS visible
 * - No accordion, no "tap to explore"
 * - Scroll-triggered entrance: cards stagger up
 * - The interactive visuals ARE the animation — no additional decorative
 *   pulsing/floating/bouncing needed. The QuestCardStack shuffles,
 *   the BuildProgress fills, the XPCounter ticks. That IS engagement.
 */

const QUEST_CARDS = [
    { title: 'LED Matrix Challenge', domain: 'Electronics', xp: 50 },
    { title: 'Line-Following Robot', domain: 'Robotics', xp: 50 },
    { title: 'Bio Luminescence', domain: 'Bio', xp: 50 },
];

function QuestCardStack() {
    const [cards, setCards] = useState(QUEST_CARDS);

    useEffect(() => {
        const interval = setInterval(() => {
            setCards(prev => {
                const next = [...prev];
                const last = next.pop();
                if (last) next.unshift(last);
                return next;
            });
        }, 2500);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="relative w-full h-full flex items-center justify-center">
            {cards.map((c, i) => (
                <div
                    key={c.title}
                    className="absolute w-[85%] bg-brutal-dark text-brutal-bg rounded-xl p-4
                               transition-all duration-700 ease-spring border border-brutal-bg/10"
                    style={{
                        transform: `translateY(${i * 10}px) scale(${1 - i * 0.04})`,
                        zIndex: 3 - i,
                        opacity: 1 - i * 0.2,
                    }}
                >
                    <span className="font-data text-[10px] text-brutal-red uppercase tracking-widest">
                        {c.domain}
                    </span>
                    <h4 className="font-heading font-bold text-sm mt-1">{c.title}</h4>
                    <div className="flex items-center gap-1 mt-2">
                        <span className="font-data text-[10px] text-brutal-bg/50">★ {c.xp} XP</span>
                    </div>
                </div>
            ))}
        </div>
    );
}

function BuildProgress() {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setProgress(prev => (prev >= 100 ? 0 : prev + 1));
        }, 60);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="w-full px-4 flex flex-col items-center justify-center h-full gap-4">
            <div className="w-full space-y-3">
                {['Idea sketched out', 'First prototype built', 'Shared with community'].map((step, i) => (
                    <div key={step} className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors duration-500
                            ${progress > (i + 1) * 30 ? 'bg-brutal-red border-brutal-red' : 'border-brutal-dark/20'}`}>
                            {progress > (i + 1) * 30 && (
                                <svg className="w-2.5 h-2.5 text-brutal-bg" viewBox="0 0 12 12" fill="none">
                                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            )}
                        </div>
                        <span className={`font-data text-xs transition-colors duration-500
                            ${progress > (i + 1) * 30 ? 'text-brutal-dark' : 'text-brutal-dark/30'}`}>
                            {step}
                        </span>
                    </div>
                ))}
            </div>
            <div className="w-full h-1.5 bg-brutal-dark/10 rounded-full overflow-hidden">
                <div
                    className="h-full bg-brutal-red rounded-full transition-all duration-100"
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
    );
}

function XPCounter() {
    const [xp, setXP] = useState(0);
    const target = 120;

    useEffect(() => {
        const interval = setInterval(() => {
            setXP(prev => (prev >= target ? 0 : prev + 2));
        }, 50);
        return () => clearInterval(interval);
    }, []);

    const rank = xp < 60 ? 'Curious' : 'Tinkerer';

    return (
        <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="font-data text-3xl font-bold text-brutal-dark tabular-nums">
                {xp} <span className="text-sm text-brutal-dark/40">XP</span>
            </div>
            <div className="w-32 h-1.5 bg-brutal-dark/10 rounded-full overflow-hidden">
                <div
                    className="h-full bg-brutal-red rounded-full transition-all duration-100"
                    style={{ width: `${Math.min(100, (xp / 60) * 100)}%` }}
                />
            </div>
            <span className={`font-data text-xs font-bold uppercase tracking-widest transition-all duration-300
                ${rank === 'Tinkerer' ? 'text-brutal-red' : 'text-brutal-dark/50'}`}>
                {rank}
            </span>
            {xp >= 60 && (
                <span className="font-data text-[10px] text-brutal-red animate-pulse">
                    ★ Rank Up!
                </span>
            )}
        </div>
    );
}

const STEPS = [
    {
        num: '01',
        title: 'Pick a Challenge',
        desc: 'Browse beginner-friendly challenges across electronics, robotics, design, and more. Each one tells you exactly what to build.',
        icon: Target,
        visual: <QuestCardStack />,
    },
    {
        num: '02',
        title: 'Build & Share',
        desc: 'Work at your own pace. Document what you tried, what broke, and what worked — the journey matters as much as the result.',
        icon: Wrench,
        visual: <BuildProgress />,
    },
    {
        num: '03',
        title: 'Grow Your Skills',
        desc: 'Every project earns XP and unlocks new ranks. Start as "Curious" and work your way up. The more you build, the more doors open.',
        icon: TrendingUp,
        visual: <XPCounter />,
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
                    <h2 className="loop-header font-heading font-bold text-3xl md:text-5xl uppercase tracking-tight-heading">
                        Three steps to start building.
                    </h2>
                    <p className="loop-header font-data text-sm text-brutal-dark/50 mt-4 max-w-lg">
                        Pick something to build, make it real, learn from the process. Then do it again.
                    </p>
                </div>

                {/* Step cards — all content + visuals always visible */}
                <div className="loop-grid grid grid-cols-1 md:grid-cols-3 gap-8">
                    {STEPS.map((step) => {
                        const Icon = step.icon;
                        return (
                            <div
                                key={step.num}
                                className="loop-card bg-brutal-bg border-2 border-brutal-dark/8 rounded-2xl
                                           overflow-hidden hover:border-brutal-red/20
                                           transition-all duration-500
                                           hover:shadow-[0_12px_40px_rgba(196,41,30,0.06)]
                                           hover:-translate-y-1"
                            >
                                {/* Text content */}
                                <div className="p-8 pb-6">
                                    <div className="flex items-start justify-between mb-4">
                                        <span className="font-data text-5xl font-bold text-brutal-red/20 leading-none">
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

                                {/* Interactive visual — always visible, always running */}
                                <div className="min-h-[160px] bg-brutal-bg border-t border-brutal-dark/5
                                                flex items-center justify-center px-4 py-6">
                                    {step.visual}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
