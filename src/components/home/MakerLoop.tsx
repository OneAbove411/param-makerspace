import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Card } from '../ui/Card';
import { MagneticCard } from '../ui/MagneticCard';
import { Target, Wrench, TrendingUp } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

// ─── Step 1 visual: Mini challenge cards that shuffle (reuses DiagnosticShuffler pattern) ───

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
                        transform: `translateY(${i * 12}px) scale(${1 - i * 0.04})`,
                        zIndex: 3 - i,
                        opacity: 1 - i * 0.25,
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

// ─── Step 2 visual: Progress bar that fills on loop ───

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
                {['Blueprint uploaded', 'Milestone 1 logged', 'Peer review passed'].map((step, i) => (
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

// ─── Step 3 visual: XP counter ticking up ───

function XPCounter() {
    const [xp, setXP] = useState(0);
    const target = 120;

    useEffect(() => {
        const interval = setInterval(() => {
            setXP(prev => {
                if (prev >= target) return 0;
                return prev + 2;
            });
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
                ${rank === 'Tinkerer' ? 'text-brutal-red scale-110' : 'text-brutal-dark/50'}`}>
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

// ─── Main Component ───

const STEPS = [
    {
        num: '01',
        title: 'Pick a Quest',
        desc: 'Browse challenges matched to your skill level. Start with Tier 1 Explorer missions and work your way up.',
        icon: Target,
        visual: <QuestCardStack />,
    },
    {
        num: '02',
        title: 'Build & Document',
        desc: 'Log your milestones in the Maker Notebook. Sharing your failures is just as valuable as your wins.',
        icon: Wrench,
        visual: <BuildProgress />,
    },
    {
        num: '03',
        title: 'Level Up',
        desc: 'Earn XP and climb the ranks. Curious → Tinkerer → Builder → Maker → Innovator → Lab Pro.',
        icon: TrendingUp,
        visual: <XPCounter />,
    },
];

export function MakerLoop() {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            // Section header entrance
            gsap.fromTo('.loop-header',
                { y: 40, opacity: 0 },
                {
                    y: 0, opacity: 1,
                    duration: 0.8, stagger: 0.1,
                    ease: 'power3.out',
                    scrollTrigger: { trigger: containerRef.current, start: 'top 75%' }
                }
            );

            // Cards stagger in
            gsap.fromTo('.loop-card',
                { y: 60, opacity: 0 },
                {
                    y: 0, opacity: 1,
                    duration: 0.8, stagger: 0.15,
                    ease: 'power3.out',
                    scrollTrigger: { trigger: '.loop-card', start: 'top 80%' }
                }
            );
        }, containerRef);
        return () => ctx.revert();
    }, []);

    return (
        <section
            id="maker-loop"
            ref={containerRef}
            className="py-32 md:py-40 px-6 md:px-12 lg:px-24 bg-brutal-bg"
        >
            <div className="max-w-6xl mx-auto">
                {/* Section header */}
                <div className="mb-16">
                    <p className="loop-header font-data text-xs text-brutal-red uppercase tracking-[0.2em] mb-4">
                        How It Works
                    </p>
                    <h2 className="loop-header font-heading font-bold text-4xl md:text-6xl uppercase tracking-tight-heading">
                        The Maker Loop
                    </h2>
                    <p className="loop-header font-data text-sm text-brutal-dark/50 mt-4 max-w-lg">
                        Three steps. One cycle. Repeat until you've built something the world hasn't seen.
                    </p>
                </div>

                {/* Step cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {STEPS.map((step) => {
                        const Icon = step.icon;
                        return (
                            <MagneticCard
                                key={step.num}
                                intensity={6}
                                glowOnHover
                                className="loop-card"
                            >
                                <Card className="h-full p-8 flex flex-col gap-5 group">
                                    {/* Step number + icon */}
                                    <div className="flex items-center justify-between">
                                        <span className="font-data text-4xl font-bold text-brutal-red">
                                            {step.num}
                                        </span>
                                        <div className="w-10 h-10 rounded-full bg-brutal-dark/5 flex items-center justify-center
                                                        group-hover:bg-brutal-red/10 transition-colors duration-300">
                                            <Icon size={18} className="text-brutal-dark/40 group-hover:text-brutal-red transition-colors duration-300" />
                                        </div>
                                    </div>

                                    {/* Title + description */}
                                    <h3 className="font-heading font-bold text-xl uppercase tracking-tight-heading">
                                        {step.title}
                                    </h3>
                                    <p className="font-data text-sm text-brutal-dark/60 leading-relaxed">
                                        {step.desc}
                                    </p>

                                    {/* Visual zone */}
                                    <div className="flex-1 min-h-[160px] bg-brutal-bg rounded-xl border border-brutal-dark/5
                                                    flex items-center justify-center overflow-hidden mt-2">
                                        {step.visual}
                                    </div>
                                </Card>
                            </MagneticCard>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
