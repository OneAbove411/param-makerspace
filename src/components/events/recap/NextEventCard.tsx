import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Calendar, ArrowRight } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { Event, EventType } from '../../../lib/database.types';
import { EVENT_TYPE_LABELS } from '../../../pages/admin/event-wizard/wizardTypes';

/**
 * NextEventCard — bottom-of-recap CTA that points readers to the
 * next upcoming event of the same type. Appears on the public
 * post-event page after the recap body.
 *
 * Query: event where event_type = X AND date > now ORDER BY date
 * ASC LIMIT 1. Only published rows are considered (draft/past ones
 * would confuse public visitors).
 */

interface NextEventCardProps {
    eventType: EventType;
    /** ID of the current event so we never link back to ourselves
     *  (in case a freshly-published clone happens to share event_type). */
    excludeId: string;
}

type NextRow = Pick<Event, 'id' | 'title' | 'date' | 'tagline' | 'cover_image_url'>;

export function NextEventCard({ eventType, excludeId }: NextEventCardProps) {
    const [loading, setLoading] = useState(true);
    const [next, setNext] = useState<NextRow | null>(null);

    useEffect(() => {
        let cancelled = false;
        const run = async () => {
            const nowIso = new Date().toISOString();
            const { data } = await supabase
                .from('event')
                .select('id, title, date, tagline, cover_image_url')
                .eq('event_type', eventType)
                .gt('date', nowIso)
                .neq('id', excludeId)
                .order('date', { ascending: true })
                .limit(1)
                .maybeSingle();
            if (cancelled) return;
            setNext((data as unknown as NextRow) ?? null);
            setLoading(false);
        };
        void run();
        return () => { cancelled = true; };
    }, [eventType, excludeId]);

    if (loading || !next) return null;

    const dateStr = new Date(next.date).toLocaleDateString('en-IN', {
        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    });
    const typeLabel = EVENT_TYPE_LABELS[eventType];

    return (
        <Link
            to={`/events/${next.id}`}
            className="block rounded-2xl overflow-hidden border-4 border-brutal-dark shadow-[6px_6px_0px_#111] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_#111] transition-all bg-brutal-bg"
        >
            <div className="flex flex-col md:flex-row">
                {next.cover_image_url && (
                    <div className="md:w-48 h-32 md:h-auto flex-shrink-0 overflow-hidden">
                        <img
                            src={next.cover_image_url}
                            alt={next.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                        />
                    </div>
                )}
                <div className="flex-1 p-5 md:p-6 flex flex-col justify-center">
                    <div className="font-data text-[10px] font-bold uppercase tracking-widest text-brutal-red mb-1.5">
                        Next {typeLabel}
                    </div>
                    <div className="font-heading font-bold text-lg md:text-xl uppercase tracking-tight-heading leading-tight mb-2">
                        {next.title}
                    </div>
                    {next.tagline && (
                        <p className="font-data text-sm text-brutal-dark/65 mb-3 line-clamp-2">{next.tagline}</p>
                    )}
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 font-data text-xs text-brutal-dark/70">
                            <Calendar className="w-3.5 h-3.5" />
                            {dateStr}
                        </div>
                        <div className="flex items-center gap-1 font-data text-xs font-bold uppercase tracking-wider text-brutal-dark">
                            View <ArrowRight className="w-3.5 h-3.5" />
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
}

export default NextEventCard;
