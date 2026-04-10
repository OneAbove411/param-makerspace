import React from 'react';

const RecapToC = ({ sections }: { sections: { id: string; label: string }[] }) => (
    <nav className="sticky top-28 space-y-1">
        <span className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-dark/30 mb-3 block">Contents</span>
        {sections.map(s => (
            <a
                key={s.id}
                href={`#${s.id}`}
                className="block font-data text-xs text-brutal-dark/50 hover:text-brutal-red transition-colors py-1.5 border-l-2 border-brutal-dark/10 hover:border-brutal-red pl-3"
            >
                {s.label}
            </a>
        ))}
    </nav>
);

export default RecapToC;
export { RecapToC };
