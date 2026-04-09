import React, { useEffect, useState } from 'react';

interface TimelineEntry {
    id: string;
    title: string;
    anchorId: string;
}

interface ProjectLogTimelineProps {
    entries: TimelineEntry[];
    activeId: string;
    onEntryClick: (anchorId: string) => void;
}

export function ProjectLogTimeline({
    entries,
    activeId,
    onEntryClick,
}: ProjectLogTimelineProps) {
    return (
        <nav className="space-y-0">
            <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-3 top-0 bottom-0 w-px bg-brutal-dark/10" />

                {/* Timeline entries */}
                <ul className="space-y-0">
                    {entries.map((entry, idx) => {
                        const isActive = entry.anchorId === activeId;
                        return (
                            <li key={entry.id}>
                                <button
                                    type="button"
                                    onClick={() => onEntryClick(entry.anchorId)}
                                    className="relative w-full text-left group py-4"
                                >
                                    {/* Dot */}
                                    <div
                                        className={`absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full
                                            transition-all duration-300 -ml-1
                                            ${isActive
                                                ? 'bg-brutal-red ring-4 ring-brutal-red/20 w-3 h-3 -ml-1.5'
                                                : 'bg-brutal-dark/20 group-hover:bg-brutal-dark/40'
                                            }`}
                                    />

                                    {/* Label */}
                                    <span
                                        className={`pl-6 font-data text-xs font-bold uppercase tracking-wider
                                            transition-colors duration-300
                                            ${isActive
                                                ? 'text-brutal-red'
                                                : 'text-brutal-dark/40 group-hover:text-brutal-dark'
                                            }`}
                                    >
                                        {entry.title}
                                    </span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </nav>
    );
}
