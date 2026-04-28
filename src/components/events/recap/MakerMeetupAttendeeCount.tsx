import React, { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

/**
 * MakerMeetupAttendeeCount — privacy-preserving "who came" block for
 * the past-event page. Counts `event_application` rows whose status
 * reached 'selected' (i.e. went through the full interview → invite
 * pipeline) and only surfaces the NUMBER, never identities.
 *
 * Per Prompt 12 spec: opt-in only, show count only.
 */

interface MakerMeetupAttendeeCountProps {
    eventId: string;
}

export function MakerMeetupAttendeeCount({ eventId }: MakerMeetupAttendeeCountProps) {
    const [count, setCount] = useState<number | null>(null);

    useEffect(() => {
        let cancelled = false;
        const run = async () => {
            const { count: n, error } = await supabase
                .from('event_application')
                .select('id', { count: 'exact', head: true })
                .eq('event_id', eventId)
                .eq('status', 'selected');
            if (cancelled) return;
            if (error) { setCount(null); return; }
            setCount(n ?? 0);
        };
        void run();
        return () => { cancelled = true; };
    }, [eventId]);

    if (count === null || count === 0) return null;

    return (
        <div className="p-6 bg-brutal-bg border-4 border-brutal-dark shadow-[4px_4px_0px_#111] rounded-lg">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brutal-dark/10 flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 text-brutal-dark/60" />
                </div>
                <div>
                    <div className="font-heading font-bold text-2xl leading-none tracking-tight">
                        {count}
                    </div>
                    <div className="font-data text-[11px] font-bold uppercase tracking-widest text-brutal-dark/50 mt-1">
                        makers attended
                    </div>
                </div>
            </div>
        </div>
    );
}

export default MakerMeetupAttendeeCount;
