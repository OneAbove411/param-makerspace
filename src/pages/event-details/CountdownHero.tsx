import React, { useState, useEffect } from 'react';

const CountdownHero = ({ date }: { date: string }) => {
    const [parts, setParts] = useState({ d: 0, h: 0, m: 0, s: 0 });
    const [expired, setExpired] = useState(false);

    useEffect(() => {
        const update = () => {
            const diff = new Date(date).getTime() - Date.now();
            if (diff <= 0) { setExpired(true); return; }
            setParts({
                d: Math.floor(diff / (1000 * 60 * 60 * 24)),
                h: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                m: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
                s: Math.floor((diff % (1000 * 60)) / 1000),
            });
        };
        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [date]);

    if (expired) return null;

    const blocks = [
        { label: 'Days', value: parts.d },
        { label: 'Hours', value: parts.h },
        { label: 'Minutes', value: parts.m },
        { label: 'Seconds', value: parts.s },
    ];

    return (
        <div className="flex gap-2">
            {blocks.map(b => (
                <div key={b.label} className="text-center">
                    <div className="bg-brutal-dark text-brutal-bg w-12 h-12 md:w-14 md:h-14 rounded-lg flex flex-col items-center justify-center shadow-[3px_3px_0px_rgba(196,41,30,0.4)]">
                        <span className="font-heading font-bold text-lg md:text-xl leading-none">{String(b.value).padStart(2, '0')}</span>
                        <span className="font-data text-[7px] font-bold uppercase tracking-widest text-brutal-bg/40 mt-0.5">{b.label}</span>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default CountdownHero;
