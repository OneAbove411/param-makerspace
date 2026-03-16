import React, { useEffect, useRef } from 'react';
import { Card } from '../ui/Card';
import { gsap } from 'gsap';
import { MousePointer2 } from 'lucide-react';

export function CursorProtocolScheduler() {
    const cursorRef = useRef<HTMLDivElement>(null);
    const targetDayRef = useRef<HTMLDivElement>(null);
    const saveBtnRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            const tl = gsap.timeline({ repeat: -1, repeatDelay: 1 });

            // Starting position (bottom right)
            tl.set(cursorRef.current, { x: 250, y: 150, opacity: 0 });

            // Enter
            tl.to(cursorRef.current, { x: 180, y: 100, opacity: 1, duration: 0.8, ease: "power2.out" });

            // Move to target day (Thursday)
            tl.to(cursorRef.current, {
                x: targetDayRef.current?.offsetLeft || 140,
                y: targetDayRef.current?.offsetTop || 50,
                duration: 1.2,
                ease: "power2.inOut"
            });

            // Click day
            tl.to(cursorRef.current, { scale: 0.8, duration: 0.1 });
            tl.to(targetDayRef.current, { backgroundColor: '#E63B2E', color: '#F5F3EE', duration: 0.2 }, "<");
            tl.to(cursorRef.current, { scale: 1, duration: 0.2 });

            // Move to save button
            tl.to(cursorRef.current, {
                x: saveBtnRef.current?.offsetLeft ? saveBtnRef.current.offsetLeft + 20 : 50,
                y: saveBtnRef.current?.offsetTop ? saveBtnRef.current.offsetTop + 10 : 150,
                duration: 1,
                ease: "power2.inOut",
                delay: 0.3
            });

            // Click save
            tl.to(cursorRef.current, { scale: 0.8, duration: 0.1 });
            tl.to(saveBtnRef.current, { scale: 0.95, backgroundColor: '#111111', color: '#F5F3EE', duration: 0.1 }, "<");
            tl.to(cursorRef.current, { scale: 1, opacity: 0, duration: 0.4 });
            tl.to(saveBtnRef.current, { scale: 1, duration: 0.2 });

            // Reset day
            tl.to(targetDayRef.current, { backgroundColor: 'transparent', color: '#111111', duration: 0.5 }, "+=0.5");
            tl.to(saveBtnRef.current, { backgroundColor: 'transparent', color: '#111111', duration: 0.5 }, "<");

        });
        return () => ctx.revert();
    }, []);

    const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    return (
        <Card className="h-80 flex flex-col p-6 relative overflow-hidden">
            <div className="mb-6 relative z-10">
                <h3 className="font-heading font-bold text-xl uppercase tracking-tight-heading">Mentored Execution</h3>
                <p className="font-data text-xs text-brutal-dark/60">Independent & Tier-Based Projects</p>
            </div>

            <div className="flex-1 flex flex-col justify-center items-center gap-6 relative z-0">
                <div className="flex gap-1">
                    {days.map((d, i) => (
                        <div
                            key={i}
                            ref={i === 4 ? targetDayRef : null}
                            className="w-8 h-8 flex items-center justify-center font-data text-xs font-bold rounded-md border border-brutal-dark/20"
                        >
                            {d}
                        </div>
                    ))}
                </div>

                <button
                    ref={saveBtnRef}
                    className="px-6 py-2 border-2 border-brutal-dark rounded-full font-heading text-sm font-bold w-full uppercase"
                >
                    Propose Project
                </button>
            </div>

            {/* SVG Cursor mapping to the timeline */}
            <div ref={cursorRef} className="absolute top-0 left-0 z-50 pointer-events-none drop-shadow-md origin-top-left">
                <MousePointer2 className="w-6 h-6 text-brutal-dark fill-brutal-bg" />
            </div>
        </Card>
    );
}
