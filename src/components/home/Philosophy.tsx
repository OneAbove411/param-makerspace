import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function Philosophy() {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.fromTo('.philosophy-word',
                { opacity: 0, y: 30 },
                {
                    opacity: 1,
                    y: 0,
                    duration: 0.8,
                    stagger: 0.1,
                    ease: 'power3.out',
                    scrollTrigger: {
                        trigger: containerRef.current,
                        start: 'top 60%',
                    }
                }
            );
        }, containerRef);
        return () => ctx.revert();
    }, []);

    const firstLine = "Most platforms focus on: scattered tools and isolated learning.".split(" ");
    const secondLine = "We focus on: precision mechanics and architect-level execution.".split(" ");

    return (
        <section ref={containerRef} className="py-32 px-6 md:px-12 lg:px-24 bg-brutal-dark text-brutal-bg relative overflow-hidden">
            {/* Texture background */}
            <div className="absolute inset-0 z-0 opacity-10">
                <img
                    src="https://images.unsplash.com/photo-1541888086425-d81bb19240f5?q=80&w=2070&auto=format&fit=crop"
                    alt="Concrete texture"
                    loading="lazy"
                    className="w-full h-full object-cover"
                />
            </div>

            <div className="relative z-10 max-w-6xl mx-auto flex flex-col gap-12">
                <h2 className="font-heading font-medium text-xl md:text-3xl text-brutal-bg/60 uppercase tracking-tight-heading flex flex-wrap gap-x-2 gap-y-1">
                    {firstLine.map((word, i) => (
                        <span key={'l1-' + i} className="philosophy-word inline-block">{word}</span>
                    ))}
                </h2>

                <h2 className="font-drama italic text-2xl sm:text-3xl md:text-6xl lg:text-8xl text-brutal-bg leading-tight flex flex-wrap gap-x-1 sm:gap-x-2 md:gap-x-3 gap-y-1 md:gap-y-2">
                    {secondLine.map((word, i) => {
                        const isHighlight = word.toLowerCase().includes("precision") || word.toLowerCase().includes("architect");
                        return (
                            <span
                                key={'l2-' + i}
                                className={`philosophy-word inline-block ${isHighlight ? 'text-brutal-red' : ''}`}
                            >
                                {word}
                            </span>
                        );
                    })}
                </h2>
            </div>
        </section>
    );
}