import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';

const FEED = [
    "> INITIALIZING EVENT SUBSYSTEM...",
    "> LOADING BUILD CHALLENGES...",
    "> SYNCING MAKER MEETUPS...",
    "> LOCATING TECH TUESDAYS...",
    "> SYSTEM READY: COMMUNITY ACTIVE."
];

export function TelemetryTypewriter() {
    const [text, setText] = useState('');
    const [lineIndex, setLineIndex] = useState(0);
    const [charIndex, setCharIndex] = useState(0);

    useEffect(() => {
        if (lineIndex >= FEED.length) return;

        const currentLine = FEED[lineIndex];

        if (charIndex < currentLine.length) {
            const timeout = setTimeout(() => {
                setText(prev => prev + currentLine[charIndex]);
                setCharIndex(c => c + 1);
            }, Math.random() * 50 + 30);
            return () => clearTimeout(timeout);
        } else {
            const timeout = setTimeout(() => {
                setText(prev => prev + '\n');
                setLineIndex(l => l + 1);
                setCharIndex(0);
            }, 1000);
            return () => clearTimeout(timeout);
        }
    }, [charIndex, lineIndex]);

    return (
        <Card className="h-80 flex flex-col p-6 bg-brutal-dark text-brutal-bg">
            <div className="flex justify-between items-start mb-6 border-b border-brutal-bg/20 pb-4">
                <div>
                    <h3 className="font-heading font-bold text-xl uppercase tracking-tight-heading text-brutal-bg">Community Events</h3>
                    <p className="font-data text-xs text-brutal-bg/60">Active Ecosystem Participation</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-brutal-bg/10 rounded-full">
                    <div className="w-2 h-2 bg-brutal-red rounded-full animate-pulse" />
                    <span className="font-data text-[10px] tracking-widest uppercase">Live Feed</span>
                </div>
            </div>

            <div className="flex-1 font-data text-sm whitespace-pre-wrap text-brutal-bg/80 relative">
                {text}
                <span className="inline-block w-2 bg-brutal-red ml-1 animate-pulse" style={{ height: '1em', verticalAlign: 'text-bottom' }}></span>
            </div>
        </Card>
    );
}
