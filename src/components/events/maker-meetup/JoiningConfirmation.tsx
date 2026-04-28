import React, { useEffect, useState } from 'react';
import {
    PartyPopper,
    Calendar as CalendarIcon,
    Clock,
    MapPin,
    ExternalLink,
    User,
    Loader2,
    Info,
} from 'lucide-react';
import type { Event, EventApplication, EventInterviewSlot } from '../../../lib/database.types';
import { fetchMyBookedSlotForEvent } from '../../../lib/api/makerMeetup';
import { fetchUsersByIds } from '../../../lib/api/buildChallenge';
import { EventBody } from '../EventBody';

interface JoiningConfirmationProps {
    event: Event;
    application: EventApplication;
}

interface UserLite {
    id: string;
    name: string | null;
    email: string | null;
}

/**
 * JoiningConfirmation — shown to applicants whose application.status === 'selected'
 * after event.selection_published_at has flipped. This is the "You're in —
 * event joining details" view (venue, timing, what-to-bring).
 *
 * We re-show the applicant's interview slot (mentor + time) for context so the
 * page feels continuous with the booking step — once selected, the interview
 * slot row stays attached to the application (status='done') and still carries
 * the mentor relationship we want to surface.
 *
 * "What to bring" falls back to event.description_blocks (or event.description)
 * so hosts don't need a dedicated column; they can put prep notes in the body
 * or add a 'list' / 'callout' block.
 */
export function JoiningConfirmation({ event, application }: JoiningConfirmationProps) {
    const [slot, setSlot] = useState<EventInterviewSlot | null>(null);
    const [mentor, setMentor] = useState<UserLite | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const { data } = await fetchMyBookedSlotForEvent(event.id, application.id);
            if (cancelled) return;
            const s = (data as EventInterviewSlot | null) ?? null;
            setSlot(s);
            if (s?.mentor_user_id) {
                const { data: users } = await fetchUsersByIds([s.mentor_user_id]);
                if (cancelled) return;
                const list = (users as UserLite[] | null) ?? [];
                setMentor(list[0] ?? null);
            }
            setLoading(false);
        })();
        return () => {
            cancelled = true;
        };
    }, [application.id, event.id]);

    const start = new Date(event.date);
    const end = event.end_date ? new Date(event.end_date) : null;

    return (
        <section className="border-2 border-brutal-dark bg-white p-6 space-y-5">
            {/* Celebratory header */}
            <header className="border-2 border-green-500 bg-green-50 p-4 flex items-start gap-3">
                <PartyPopper className="w-7 h-7 text-green-700 flex-shrink-0 mt-0.5" />
                <div>
                    <h3 className="font-heading font-bold text-2xl uppercase text-green-900">
                        You're in
                    </h3>
                    <p className="font-data text-sm text-green-900/80 mt-1">
                        Your application for <span className="font-bold">{event.title}</span> has
                        been selected. Here's everything you need to join.
                    </p>
                </div>
            </header>

            {/* Joining details */}
            <div className="space-y-3">
                <h4 className="font-heading font-bold text-lg uppercase text-brutal-dark">
                    Event details
                </h4>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-data text-sm">
                    <div>
                        <dt className="text-[11px] uppercase tracking-wide text-brutal-dark/50 font-bold">
                            When
                        </dt>
                        <dd className="flex items-start gap-1 mt-0.5 text-brutal-dark">
                            <CalendarIcon className="w-3 h-3 mt-1 flex-shrink-0" />
                            <span>
                                {start.toLocaleString()}
                                {end && (
                                    <>
                                        {' '}
                                        <span className="text-brutal-dark/50">
                                            — {end.toLocaleString()}
                                        </span>
                                    </>
                                )}
                            </span>
                        </dd>
                    </div>
                    {event.location && (
                        <div>
                            <dt className="text-[11px] uppercase tracking-wide text-brutal-dark/50 font-bold">
                                Where
                            </dt>
                            <dd className="flex items-start gap-1 mt-0.5 text-brutal-dark">
                                <MapPin className="w-3 h-3 mt-1 flex-shrink-0" />
                                <span>{event.location}</span>
                            </dd>
                        </div>
                    )}
                    {event.meeting_url && (
                        <div className="sm:col-span-2">
                            <dt className="text-[11px] uppercase tracking-wide text-brutal-dark/50 font-bold">
                                Meeting link
                            </dt>
                            <dd className="mt-0.5">
                                <a
                                    href={event.meeting_url}
                                    target="_blank"
                                    rel="noreferrer noopener"
                                    className="inline-flex items-center gap-1 text-brutal-red hover:underline break-all"
                                >
                                    <ExternalLink className="w-3 h-3 flex-shrink-0" />{' '}
                                    {event.meeting_url}
                                </a>
                            </dd>
                        </div>
                    )}
                </dl>
            </div>

            {/* Interview-slot context (if we have one) */}
            {!loading && slot && (
                <div className="border-t-2 border-brutal-dark/10 pt-4 space-y-2">
                    <h4 className="font-heading font-bold text-lg uppercase text-brutal-dark">
                        Your interview
                    </h4>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-data text-sm">
                        <div>
                            <dt className="text-[11px] uppercase tracking-wide text-brutal-dark/50 font-bold">
                                Interviewer
                            </dt>
                            <dd className="flex items-center gap-1 mt-0.5 text-brutal-dark">
                                <User className="w-3 h-3" />
                                {mentor?.name || mentor?.email || 'Mentor'}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-[11px] uppercase tracking-wide text-brutal-dark/50 font-bold">
                                Slot
                            </dt>
                            <dd className="flex items-center gap-1 mt-0.5 text-brutal-dark">
                                <Clock className="w-3 h-3" />
                                {new Date(slot.start_at).toLocaleString()}
                            </dd>
                        </div>
                    </dl>
                </div>
            )}

            {loading && (
                <div className="flex items-center gap-2 font-data text-xs text-brutal-dark/50">
                    <Loader2 className="w-3 h-3 animate-spin" /> Loading interview details…
                </div>
            )}

            {/* What to bring / prep notes — pulled from the event body */}
            {(event.description_blocks && event.description_blocks.length > 0) ||
            event.description ? (
                <div className="border-t-2 border-brutal-dark/10 pt-4 space-y-2">
                    <h4 className="font-heading font-bold text-lg uppercase text-brutal-dark flex items-center gap-2">
                        <Info className="w-5 h-5 text-brutal-red" />
                        What to bring &amp; know
                    </h4>
                    {event.description_blocks && event.description_blocks.length > 0 ? (
                        <EventBody blocks={event.description_blocks} />
                    ) : (
                        <p className="font-data text-sm text-brutal-dark/80 whitespace-pre-wrap">
                            {event.description}
                        </p>
                    )}
                </div>
            ) : null}

            <p className="font-data text-xs text-brutal-dark/60 border-t-2 border-brutal-dark/10 pt-3">
                Questions? Reach out via the chat. See you soon.
            </p>
        </section>
    );
}
