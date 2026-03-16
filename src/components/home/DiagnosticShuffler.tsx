import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';

const LEVELS = [
    { id: 1, title: 'Tier 1 // Explorer', desc: 'Curious beginner.' },
    { id: 2, title: 'Tier 2 // Builder', desc: 'Active execution.' },
    { id: 3, title: 'Tier 3 // Lab Pro', desc: 'Architect level.' }
];

export function DiagnosticShuffler() {
    const [cards, setCards] = useState(LEVELS);

    useEffect(() => {
        const interval = setInterval(() => {
            setCards(prev => {
                const next = [...prev];
                const last = next.pop();
                if (last) next.unshift(last);
                return next;
            });
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    return (
        <Card className="h-80 relative flex flex-col p-6 isolate group">
            <div className="mb-4">
                <h3 className="font-heading font-bold text-xl uppercase tracking-tight-heading">Structured Progression</h3>
                <p className="font-data text-xs text-brutal-dark/60">Explorer Hub routing</p>
            </div>

            <div className="flex-1 relative w-full flex items-center justify-center pt-8">
                {cards.map((c, i) => {
                    const isTop = i === 0;
                    return (
                        <div
                            key={c.id}
                            className="absolute w-[90%] bg-brutal-dark text-brutal-bg rounded-xl p-4 transition-all duration-700 ease-spring border border-brutal-bg/20"
                            style={{
                                transform: `translateY(${i * 15}px) scale(${1 - i * 0.05})`,
                                zIndex: 3 - i,
                                opacity: 1 - i * 0.2
                            }}
                        >
                            <div className="flex justify-between items-center mb-2">
                                <span className="font-data text-xs opacity-50">SYS.LVL.{c.id}</span>
                                {isTop && <span className="w-2 h-2 rounded-full bg-brutal-red animate-pulse" />}
                            </div>
                            <h4 className="font-heading font-bold">{c.title}</h4>
                            <p className="font-data text-xs opacity-80 mt-1">{c.desc}</p>
                        </div>
                    );
                })}
            </div>
        </Card>
    );
}
