import React from 'react';

const SectionAnchor = ({ id, title, icon, dark, number }: { id: string; number?: string; title: string; icon?: React.ReactNode; dark?: boolean }) => (
    <div id={id} className="scroll-mt-24 mb-5">
        <div className={`w-10 h-px ${dark ? 'bg-brutal-bg/15' : 'bg-brutal-dark/15'} mb-2`} />
        <div className="flex items-center gap-3">
            {number && <span className="font-data text-xs font-bold text-brutal-dark/30">{number}</span>}
            <h2 className={`font-heading font-bold text-base md:text-lg uppercase tracking-tight-heading flex items-center gap-2 ${dark ? 'text-brutal-bg' : ''}`}>
                {icon} {title}
            </h2>
        </div>
    </div>
);

export default SectionAnchor;
export { SectionAnchor };
