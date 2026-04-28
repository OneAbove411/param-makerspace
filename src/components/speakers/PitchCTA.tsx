import React, { useState } from 'react';
import { Mic2, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { Link } from 'react-router';
import { PitchForm } from './PitchForm';
import type { EventType } from '../../lib/database.types';

/**
 * PitchCTA — compact "Pitch a talk" block shown on every public event
 * page.
 *
 * Starts collapsed: a single row with a headline + inline toggle +
 * "Open dedicated page" link. Expanding it reveals the full PitchForm
 * below. We keep it inline so people already scrolling an event page
 * don't lose their place, but we also link out to /speak for the
 * framing-rich standalone version.
 */

interface PitchCTAProps {
    /**
     * When set, the form opens with this event_type pre-selected. We
     * use event.event_type from the page context so a pitcher on a
     * Tech Tuesday page starts with Tech Tuesday picked.
     */
    defaultEventType?: EventType;
}

export function PitchCTA({ defaultEventType }: PitchCTAProps) {
    const [open, setOpen] = useState(false);

    return (
        <section className="ed-section">
            <div className="rounded-2xl border-2 border-brutal-dark/10 bg-white overflow-hidden">
                <button
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    className="w-full flex items-center gap-4 p-5 md:p-6 text-left hover:bg-brutal-dark/[0.02] transition-colors"
                    aria-expanded={open}
                >
                    <div className="w-11 h-11 rounded-xl bg-brutal-red/10 border-2 border-brutal-red/20 flex items-center justify-center flex-shrink-0">
                        <Mic2 className="w-5 h-5 text-brutal-red" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-heading font-bold text-base md:text-lg uppercase tracking-tight-heading text-brutal-dark">
                            Pitch yourself as a future speaker
                        </h3>
                        <p className="font-data text-xs md:text-sm text-brutal-dark/55 mt-0.5">
                            Got an idea worth sharing at Param? Tell us about you and your topic — we'll get back to you within a week.
                        </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                        <Link
                            to="/speak"
                            onClick={(e) => e.stopPropagation()}
                            className="hidden sm:inline-flex items-center gap-1 font-data text-[11px] font-bold uppercase tracking-widest text-brutal-dark/50 hover:text-brutal-red"
                        >
                            Open page <ExternalLink className="w-3 h-3" />
                        </Link>
                        <div className="w-8 h-8 rounded-full border-2 border-brutal-dark/15 flex items-center justify-center">
                            {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                    </div>
                </button>

                {open && (
                    <div className="border-t-2 border-brutal-dark/10 bg-brutal-dark/[0.02] p-4 md:p-6">
                        <PitchForm defaultEventType={defaultEventType} compact />
                    </div>
                )}
            </div>
        </section>
    );
}

export default PitchCTA;
