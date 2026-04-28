import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar as CalendarIcon, Clock, User, ExternalLink, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { Event, EventApplication, EventInterviewSlot } from '../../../lib/database.types';
import {
    bookSlot,
    fetchMyBookedSlotForEvent,
    fetchSlotsForEvent,
} from '../../../lib/api/makerMeetup';
import { fetchUsersByIds } from '../../../lib/api/buildChallenge';

interface UserLite {
    id: string;
    name: string | null;
    email: string | null;
}

interface SlotBookingPanelProps {
    event: Event;
    application: EventApplication;
}

/**
 * SlotBookingPanel — shown to shortlisted applicants after the
 * application_deadline. Lets them pick exactly one open interview
 * slot. Already-booked users see a confirmation card instead.
 *
 * Business rules enforced:
 *   • The applicant can only claim one slot per application (partial
 *     unique index on the table is the hard guard).
 *   • Booking races lose gracefully — bookSlot's WHERE status='open'
 *     filter + the unique index mean a second booker gets a null
 *     result and we re-render the list.
 */
export function SlotBookingPanel({ event, application }: SlotBookingPanelProps) {
    const [mySlot, setMySlot] = useState<EventInterviewSlot | null>(null);
    const [allSlots, setAllSlots] = useState<EventInterviewSlot[]>([]);
    const [mentors, setMentors] = useState<Record<string, UserLite>>({});
    const [loading, setLoading] = useState(true);
    const [bookingId, setBookingId] = useState<string | null>(null);
    const [banner, setBanner] = useState<{ tone: 'ok' | 'error'; message: string } | null>(null);

    // ─── Load slots + resolve mentor names ───────────────────
    const reload = useCallback(async () => {
        setLoading(true);
        const [mineRes, allRes] = await Promise.all([
            fetchMyBookedSlotForEvent(event.id, application.id),
            fetchSlotsForEvent(event.id),
        ]);
        if (mineRes.error && allRes.error) {
            setBanner({ tone: 'error', message: `Failed to load slots: ${mineRes.error.message}` });
            setLoading(false);
            return;
        }
        const mine = (mineRes.data as EventInterviewSlot | null) ?? null;
        const all = (allRes.data as EventInterviewSlot[] | null) ?? [];
        setMySlot(mine);
        setAllSlots(all);

        const mentorIds = Array.from(new Set(all.map((s) => s.mentor_user_id)));
        if (mentorIds.length > 0) {
            const { data: users } = await fetchUsersByIds(mentorIds);
            if (users) {
                const map: Record<string, UserLite> = {};
                (users as UserLite[]).forEach((u) => {
                    map[u.id] = u;
                });
                setMentors(map);
            }
        }
        setLoading(false);
    }, [application.id, event.id]);

    useEffect(() => {
        void reload();
    }, [reload]);

    // ─── Filter openSlots (hide past ones) ───────────────────
    const openSlots = useMemo(() => {
        const now = Date.now();
        return allSlots
            .filter((s) => s.status === 'open' && Date.parse(s.start_at) > now)
            .sort((a, b) => Date.parse(a.start_at) - Date.parse(b.start_at));
    }, [allSlots]);

    // ─── Book ─────────────────────────────────────────────────
    const handleBook = useCallback(
        async (slot: EventInterviewSlot) => {
            setBanner(null);
            setBookingId(slot.id);
            const { data, error } = await bookSlot(slot.id, application.id);
            setBookingId(null);
            if (error) {
                // 23505 = unique violation (concurrent booker raced in,
                // or this applicant already had a booked slot).
                if (error.code === '23505') {
                    setBanner({ tone: 'error', message: 'That slot was just taken by someone else. Pick another.' });
                } else {
                    setBanner({ tone: 'error', message: `Booking failed: ${error.message}` });
                }
                void reload();
                return;
            }
            if (!data) {
                // Filter matched nothing — slot was no longer open.
                setBanner({ tone: 'error', message: 'That slot was just taken by someone else. Pick another.' });
                void reload();
                return;
            }
            setBanner({ tone: 'ok', message: 'Interview slot booked.' });
            void reload();
        },
        [application.id, reload],
    );

    if (loading) {
        return (
            <div className="flex items-center gap-2 p-6 font-data text-sm text-brutal-dark/50">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading interview slots…
            </div>
        );
    }

    // Already booked → confirmation
    if (mySlot && mySlot.status !== 'open') {
        const mentor = mentors[mySlot.mentor_user_id];
        const start = new Date(mySlot.start_at);
        const end = new Date(mySlot.end_at);
        return (
            <section className="border-2 border-green-500 bg-green-50 p-6 space-y-3">
                <header className="flex items-center gap-2">
                    <CheckCircle2 className="w-6 h-6 text-green-700" />
                    <h3 className="font-heading font-bold text-xl uppercase text-green-900">Interview booked</h3>
                </header>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-data text-sm">
                    <div>
                        <dt className="text-[11px] uppercase tracking-wide text-green-900/60 font-bold">Interviewer</dt>
                        <dd className="flex items-center gap-1 mt-0.5 text-brutal-dark">
                            <User className="w-3 h-3" />
                            {mentor?.name || mentor?.email || 'Mentor'}
                        </dd>
                    </div>
                    <div>
                        <dt className="text-[11px] uppercase tracking-wide text-green-900/60 font-bold">Date &amp; time</dt>
                        <dd className="flex items-center gap-1 mt-0.5 text-brutal-dark">
                            <Clock className="w-3 h-3" />
                            {start.toLocaleString()} — {end.toLocaleTimeString()}
                        </dd>
                    </div>
                    {event.meeting_url && (
                        <div className="sm:col-span-2">
                            <dt className="text-[11px] uppercase tracking-wide text-green-900/60 font-bold">Meeting link</dt>
                            <dd className="mt-0.5">
                                <a
                                    href={event.meeting_url}
                                    target="_blank"
                                    rel="noreferrer noopener"
                                    className="inline-flex items-center gap-1 text-brutal-red hover:underline"
                                >
                                    <ExternalLink className="w-3 h-3" /> {event.meeting_url}
                                </a>
                            </dd>
                        </div>
                    )}
                    {!event.meeting_url && event.location && (
                        <div className="sm:col-span-2">
                            <dt className="text-[11px] uppercase tracking-wide text-green-900/60 font-bold">Location</dt>
                            <dd className="mt-0.5 text-brutal-dark">{event.location}</dd>
                        </div>
                    )}
                </dl>
                <p className="font-data text-xs text-green-900/70">
                    Please reach out via the chat if you need to reschedule.
                </p>
            </section>
        );
    }

    // Not yet booked → slot list
    return (
        <section className="border-2 border-brutal-dark bg-white p-6 space-y-4">
            <header>
                <h3 className="font-heading font-bold text-2xl uppercase flex items-center gap-2">
                    <CalendarIcon className="w-6 h-6 text-brutal-red" />
                    Book your interview slot
                </h3>
                <p className="font-data text-sm text-brutal-dark/60 mt-1">
                    Pick one open slot. You can't change it once booked, so choose carefully.
                </p>
            </header>

            {banner && (
                <div
                    className={
                        'flex items-start gap-2 p-3 border-2 font-data text-sm ' +
                        (banner.tone === 'ok'
                            ? 'border-green-500 bg-green-50 text-green-800'
                            : 'border-brutal-red bg-brutal-red/5 text-brutal-red')
                    }
                >
                    {banner.tone === 'ok' ? <CheckCircle2 className="w-4 h-4 mt-0.5" /> : <AlertCircle className="w-4 h-4 mt-0.5" />}
                    <span>{banner.message}</span>
                </div>
            )}

            {openSlots.length === 0 ? (
                <div className="p-6 border-2 border-brutal-dark/30 bg-brutal-bg font-data text-sm text-brutal-dark/60 text-center">
                    No open slots right now. Check back soon — the host is setting up the schedule.
                </div>
            ) : (
                <ul className="divide-y divide-brutal-dark/10 border-2 border-brutal-dark/20">
                    {openSlots.map((slot) => {
                        const mentor = mentors[slot.mentor_user_id];
                        const start = new Date(slot.start_at);
                        const end = new Date(slot.end_at);
                        const isBooking = bookingId === slot.id;
                        return (
                            <li key={slot.id} className="flex items-center gap-3 p-3">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 font-data text-sm">
                                        <Clock className="w-3 h-3 text-brutal-dark/40" />
                                        <span className="font-bold">{start.toLocaleString()}</span>
                                        <span className="text-brutal-dark/50">– {end.toLocaleTimeString()}</span>
                                    </div>
                                    <div className="flex items-center gap-1 font-data text-xs text-brutal-dark/60 mt-0.5">
                                        <User className="w-3 h-3" />
                                        With {mentor?.name || mentor?.email || 'mentor'}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => void handleBook(slot)}
                                    disabled={isBooking}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 border-2 border-brutal-dark bg-brutal-dark text-white hover:bg-brutal-dark/90 font-data text-xs font-bold transition-colors disabled:opacity-40"
                                >
                                    {isBooking ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                                    Book
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </section>
    );
}
