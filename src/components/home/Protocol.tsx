import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const STEPS = [
    {
        num: '01',
        title: 'Tier 1 // Explorer',
        desc: 'Begin your journey through structured learning pathways and curated challenges.',
        type: 'gear'
    },
    {
        num: '02',
        title: 'Tier 2 // Builder',
        desc: 'Apply your skills in real-world scenarios through Build Challenges and Maker Meetups.',
        type: 'scan'
    },
    {
        num: '03',
        title: 'Tier 3 // Lab Pro',
        desc: 'Architect comprehensive systems, mentor others, and leave a permanent mark on the ecosystem.',
        type: 'wave'
    }
];

export function Protocol() {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            const cards = gsap.utils.toArray<HTMLElement>('.protocol-card');

            cards.forEach((card, index) => {
                // We do not pin the last card
                if (index === cards.length - 1) return;

                ScrollTrigger.create({
                    trigger: card,
                    start: "top top",
                    endTrigger: containerRef.current,
                    end: "bottom bottom",
                    pin: true,
                    pinSpacing: false,
                    animation: gsap.to(card, {
                        scale: 0.9,
                        opacity: 0.5,
                        filter: 'blur(20px)',
                        ease: 'none'
                    }),
                    scrub: true,
                });
            });
        }, containerRef);
        return () => ctx.revert();
    }, []);

    return (
        <div ref={containerRef} className="relative bg-brutal-bg w-full">
            {STEPS.map((step, index) => (
                <section
                    key={step.num}
                    className="protocol-card h-[100dvh] w-full flex items-center justify-center p-6 md:p-12 relative bg-brutal-bg"
                    style={{ zIndex: index }}
                >
                    <div className="absolute inset-0 bg-brutal-bg border-t-2 border-brutal-dark/10" />

                    <div className="relative w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                        <div className="flex flex-col gap-6">
                            <span className="font-data text-brutal-red text-6xl md:text-8xl font-bold">{step.num}</span>
                            <h2 className="font-heading text-4xl md:text-6xl font-bold uppercase tracking-tight-heading">{step.title}</h2>
                            <p className="font-data text-lg md:text-xl text-brutal-dark/80 max-w-md">{step.desc}</p>
                        </div>

                        <div className="h-64 md:h-96 bg-brutal-dark/5 rounded-3xl border border-brutal-dark/10 flex items-center justify-center relative overflow-hidden">
                            {step.type === 'gear' && (
                                <div className="w-32 h-32 border-[16px] border-dashed border-brutal-dark/20 rounded-full animate-[spin_10s_linear_infinite]" />
                            )}
                            {step.type === 'scan' && (
                                <div className="w-full h-full relative" style={{ backgroundImage: 'radial-gradient(circle, rgba(17,17,17,0.1) 2px, transparent 2px)', backgroundSize: '20px 20px' }}>
                                    <div className="absolute left-0 top-0 w-full h-1 bg-brutal-red shadow-[0_0_20px_#E63B2E] animate-[ping_3s_ease-in-out_infinite]" style={{ top: '50%' }} />
                                </div>
                            )}
                            {step.type === 'wave' && (
                                <svg className="w-full h-32 px-12" viewBox="0 0 100 20" preserveAspectRatio="none">
                                    <path
                                        d="M0,10 L20,10 L25,0 L30,20 L35,10 L100,10"
                                        fill="none"
                                        stroke="#E63B2E"
                                        strokeWidth="2"
                                        strokeDasharray="100"
                                        className="animate-[dash_2s_linear_infinite]"
                                    />
                                    <style>{`@keyframes dash { to { stroke-dashoffset: -100; } }`}</style>
                                </svg>
                            )}
                        </div>
                    </div>
                </section>
            ))}
        </div>
    );
}
