import React from 'react';
import { Link } from 'react-router';
import { Wrench, ArrowRight } from 'lucide-react';
import { XP_REWARDS } from '../../lib/constants';
import { cn } from '../../lib/utils';

interface PostEventProjectBridgeProps {
    eventId: string;
    eventTitle: string;
}

/**
 * "Did you build something at this event?" CTA block for past events.
 * Bridges the event experience to the Maker Flywheel (project creation).
 */
export function PostEventProjectBridge({ eventId, eventTitle }: PostEventProjectBridgeProps) {
    return (
        <section
            className={cn(
                'ed-section border-2 border-brutal-dark bg-brutal-paper p-6 md:p-8 my-8',
                'shadow-[6px_6px_0_0_rgba(196,41,30,0.3)]',
            )}
        >
            <div className="flex flex-col md:flex-row items-start md:items-center gap-5">
                <div className="w-14 h-14 rounded-xl bg-brutal-red/10 border-2 border-brutal-red/20 flex items-center justify-center flex-shrink-0">
                    <Wrench size={24} className="text-brutal-red" />
                </div>

                <div className="flex-1 min-w-0">
                    <h3 className="font-heading font-bold text-lg md:text-xl uppercase tracking-tight-heading text-brutal-dark mb-1">
                        Did you build something at this event?
                    </h3>
                    <p className="font-data text-sm text-brutal-dark/60">
                        Document your project and earn +{XP_REWARDS.project_approved} XP toward your next badge.
                    </p>
                </div>

                <Link
                    to="/dashboard"
                    className={cn(
                        'flex items-center gap-2 px-6 py-3 rounded-lg flex-shrink-0',
                        'bg-brutal-dark text-brutal-bg font-heading text-sm font-bold uppercase tracking-widest',
                        'border-2 border-brutal-dark',
                        'hover:bg-brutal-red hover:border-brutal-red transition-colors duration-200',
                        'shadow-[3px_3px_0_0_rgba(196,41,30,0.3)]',
                    )}
                >
                    Post Your Project <ArrowRight size={14} />
                </Link>
            </div>
        </section>
    );
}
