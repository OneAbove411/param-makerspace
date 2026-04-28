import React from 'react';
import { Mic2 } from 'lucide-react';
import type { Event } from '../../../lib/database.types';

/**
 * TechTuesdaySpeakerBlock — compact speaker card for the past-event
 * page. Shows presenter name + short bio + topic summary if present.
 * Renders nothing if no speaker fields are populated (legacy rows).
 */

interface TechTuesdaySpeakerBlockProps {
    event: Event;
}

export function TechTuesdaySpeakerBlock({ event }: TechTuesdaySpeakerBlockProps) {
    if (!event.speaker_name && !event.topic_summary) return null;

    return (
        <div className="p-6 bg-brutal-bg border-4 border-brutal-dark shadow-[4px_4px_0px_#111] rounded-lg space-y-4">
            <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-brutal-red/10 flex items-center justify-center flex-shrink-0">
                    <Mic2 className="w-5 h-5 text-brutal-red" />
                </div>
                <div className="flex-1 min-w-0">
                    {event.speaker_name && (
                        <>
                            <div className="font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/40 mb-1">
                                Presenter
                            </div>
                            <div className="font-heading font-bold text-xl leading-tight uppercase tracking-tight">
                                {event.speaker_name}
                            </div>
                            {event.speaker_bio_short && (
                                <p className="font-data text-sm text-brutal-dark/70 mt-1.5">
                                    {event.speaker_bio_short}
                                </p>
                            )}
                        </>
                    )}
                </div>
            </div>
            {event.topic_summary && (
                <div className="pt-3 border-t border-brutal-dark/10">
                    <div className="font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/40 mb-1">
                        Topic
                    </div>
                    <p className="font-data text-sm text-brutal-dark/80">
                        {event.topic_summary}
                    </p>
                </div>
            )}
        </div>
    );
}

export default TechTuesdaySpeakerBlock;
