import React from 'react';
import { Link } from 'react-router';
import { Calendar, MapPin, Users, Clock, ArrowRight, Sparkles } from 'lucide-react';
import type { Event } from '../../lib/database.types';
import { cn } from '../../lib/utils';
import { zeroCTA } from '../../lib/zeroCTA';

type EventListItem = Event & { registration_count: number };

/** Format event type for display */
function formatEventType(type: string) {
    return ({
        build_challenge: 'Build Challenge',
        maker_meetup: 'Maker Meetup',
        tech_tuesday: 'Tech Tuesday',
        workshop: 'Workshop',
        hackathon: 'Hackathon',
        demo_day: 'Demo Day',
    } as Record<string, string>)[type] || type;
}

/** Luma-style date string: "Sat, May 2 · 2:00 PM" */
function formatDateLuma(d: Date): string {
    const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
    const month = d.toLocaleDateString('en-US', { month: 'short' });
    const day = d.getDate();
    const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    return `${weekday}, ${month} ${day} · ${time}`;
}

/** Countdown label */
function countdownLabel(date: string): string | null {
    const diff = new Date(date).getTime() - Date.now();
    if (diff <= 0) return null;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days === 0) return hours <= 1 ? 'Now' : `${hours}h`;
    if (days === 1) return 'Tmrw';
    if (days <= 30) return `${days}d`;
    return `${Math.round(days / 7)}w`;
}

interface EventCardProps {
    event: EventListItem;
    isPast: boolean;
}

/**
 * Portrait event card — Luma-polished, brutalist bones.
 *
 * At rest: full-bleed image, date line + title at bottom.
 * On hover: dark panel crossfades, showing full metadata.
 */
export function EventCard({ event, isPast }: EventCardProps) {
    const date = new Date(event.date);
    const capacityRemaining = event.capacity ? event.capacity - event.registration_count : null;
    const countdown = isPast ? null : countdownLabel(event.date);
    const isImminent = !isPast && countdown && (countdown === 'Now' || countdown === 'Tmrw' || countdown.endsWith('h'));

    const regCTA = zeroCTA('registrations', event.registration_count);

    return (
        <Link
            to={`/events/${event.id}`}
            className="group block focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brutal-red"
        >
            <div
                className={cn(
                    'relative overflow-hidden rounded-xl bg-brutal-dark aspect-[3/4]',
                    'shadow-[0_2px_12px_-2px_rgba(17,17,17,0.12)] group-hover:shadow-[0_8px_30px_-6px_rgba(17,17,17,0.3)]',
                    'transition-all duration-500 ease-out',
                    isPast && 'opacity-70 hover:opacity-100',
                    isImminent && 'ring-2 ring-brutal-red/60 ring-offset-2 ring-offset-brutal-bg',
                )}
            >
                {/* ── Image layer ── */}
                <div className={cn(
                    'absolute inset-0',
                    isPast && 'grayscale-[30%] group-hover:grayscale-0 transition-all duration-700',
                )}>
                    {event.cover_image_url ? (
                        <img
                            src={event.cover_image_url}
                            alt={event.title}
                            loading="lazy"
                            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                        />
                    ) : (
                        <div
                            className="w-full h-full flex items-center justify-center bg-brutal-dark"
                            style={{
                                backgroundImage: 'radial-gradient(circle, rgba(245,243,238,0.06) 1px, transparent 1px)',
                                backgroundSize: '24px 24px',
                            }}
                        >
                            <Sparkles size={28} className="text-white/8" />
                        </div>
                    )}
                </div>

                {/* ── Resting gradient — deeper for legibility ── */}
                <div className="absolute inset-0 bg-gradient-to-t from-brutal-dark via-brutal-dark/40 to-transparent transition-opacity duration-500 group-hover:opacity-0" />

                {/* ── Top badges ── */}
                <div className="absolute top-3 left-3 z-20 transition-opacity duration-300 group-hover:opacity-0">
                    <span className="bg-black/40 backdrop-blur-xl text-white font-data text-[9px] font-bold uppercase tracking-[0.14em] px-2.5 py-1 rounded-full border border-white/10">
                        {formatEventType(event.event_type)}
                    </span>
                </div>

                {/* ── Countdown / concluded badge ── */}
                <div className="absolute top-3 right-3 z-20 transition-opacity duration-300 group-hover:opacity-0">
                    {!isPast && countdown && (
                        <span className="bg-brutal-red text-white text-[9px] font-data font-bold uppercase px-2.5 py-1 rounded-full flex items-center gap-1 tracking-wider shadow-lg shadow-brutal-red/20">
                            <Clock size={9} /> {countdown}
                        </span>
                    )}
                    {isPast && (
                        <span className="bg-black/40 backdrop-blur-xl text-white/70 text-[9px] font-data font-medium uppercase px-2.5 py-1 rounded-full border border-white/10 tracking-wider">
                            Concluded
                        </span>
                    )}
                </div>

                {/* ── Resting state: date + title at bottom ── */}
                <div className="absolute inset-x-0 bottom-0 z-20 p-5 transition-opacity duration-300 group-hover:opacity-0">
                    <p className="font-body text-[11px] text-white/50 mb-1.5">
                        {formatDateLuma(date)}
                    </p>
                    <h3 className="font-heading font-bold text-[15px] leading-snug line-clamp-2 text-white">
                        {event.title}
                    </h3>
                </div>

                {/* ── Hover panel ── */}
                <div className="absolute inset-0 z-20 bg-brutal-dark/95 backdrop-blur-sm flex flex-col justify-end p-5 gap-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-400 ease-in-out">
                    {/* Type */}
                    <span className="font-data text-[9px] font-bold uppercase tracking-[0.14em] text-brutal-red/80">
                        {formatEventType(event.event_type)}
                    </span>

                    {/* Title */}
                    <h3 className="font-heading font-bold text-lg md:text-xl leading-[1.1] text-white">
                        {event.title}
                    </h3>

                    {/* Description — body font for readability */}
                    {event.description && (
                        <p className="font-body text-[12px] text-white/50 leading-relaxed line-clamp-3">
                            {event.description}
                        </p>
                    )}

                    {/* Metadata rows — Luma-style spacing */}
                    <div className="flex flex-col gap-2 mt-1">
                        <span className="flex items-center gap-2 font-body text-[12px] text-white/60">
                            <Calendar size={12} className="text-brutal-red/70 flex-shrink-0" />
                            {formatDateLuma(date)}
                        </span>
                        {event.location && !event.location.startsWith('rsvp:') && (
                            <span className="flex items-center gap-2 font-body text-[12px] text-white/60">
                                <MapPin size={12} className="text-brutal-red/70 flex-shrink-0" />
                                <span className="truncate">{event.location}</span>
                            </span>
                        )}
                        <span className="flex items-center gap-2 font-body text-[12px] text-white/40">
                            <Users size={12} className="flex-shrink-0" />
                            {regCTA.isZero ? (
                                <span className="italic text-white/25">{regCTA.label}</span>
                            ) : capacityRemaining !== null ? (
                                capacityRemaining > 0 ? `${capacityRemaining} spots left` : 'Fully booked'
                            ) : (
                                `${event.registration_count} registered`
                            )}
                        </span>
                    </div>

                    {/* Footer CTA */}
                    <div className="pt-2 mt-auto border-t border-white/[0.06]">
                        <span className="font-data text-[10px] font-bold uppercase tracking-wider text-brutal-red flex items-center gap-1.5 group-hover:gap-2 transition-all">
                            {isPast ? 'View Recap' : 'View Event'} <ArrowRight size={11} />
                        </span>
                    </div>
                </div>
            </div>
        </Link>
    );
}
