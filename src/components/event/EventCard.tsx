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
 * X.company-inspired tall portrait event card.
 *
 * At rest: full-bleed image + title at bottom.
 * On hover: dark panel slides up covering the full card,
 *           showing title (large) + date/location/registration.
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
                    'relative overflow-hidden rounded-lg bg-brutal-dark aspect-[3/4]',
                    isPast && 'opacity-75 hover:opacity-100',
                    isImminent && 'ring-2 ring-brutal-red/50',
                )}
            >
                {/* ── Image layer ── */}
                <div className={cn(
                    'absolute inset-0',
                    isPast && 'grayscale-[20%] group-hover:grayscale-0 transition-all duration-500',
                )}>
                    {event.cover_image_url ? (
                        <img
                            src={event.cover_image_url}
                            alt={event.title}
                            loading="lazy"
                            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                        />
                    ) : (
                        <div
                            className="w-full h-full flex items-center justify-center"
                            style={{
                                backgroundImage: 'radial-gradient(circle, rgba(245,243,238,0.08) 1px, transparent 1px)',
                                backgroundSize: '24px 24px',
                            }}
                        >
                            <Sparkles size={32} className="text-white/10" />
                        </div>
                    )}
                </div>

                {/* ── Resting gradient ── */}
                <div className="absolute inset-0 bg-gradient-to-t from-brutal-dark/80 via-brutal-dark/20 to-transparent transition-opacity duration-500 group-hover:opacity-0" />

                {/* ── Top badges (fade on hover) ── */}
                <div className="absolute top-3 left-3 z-20 transition-opacity duration-400 group-hover:opacity-0">
                    <span className="bg-black/50 backdrop-blur-md text-white font-data text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border border-white/20">
                        {formatEventType(event.event_type)}
                    </span>
                </div>

                {/* ── Countdown / concluded badge top-right (fade on hover) ── */}
                <div className="absolute top-3 right-3 z-20 transition-opacity duration-400 group-hover:opacity-0">
                    {!isPast && countdown && (
                        <span className="bg-brutal-red text-white text-[9px] font-data font-bold uppercase px-2 py-0.5 rounded-full flex items-center gap-1 tracking-wider">
                            <Clock size={9} /> {countdown}
                        </span>
                    )}
                    {isPast && (
                        <span className="bg-black/50 backdrop-blur-md text-white/80 text-[9px] font-data font-medium uppercase px-2 py-0.5 rounded-full border border-white/20 tracking-wider">
                            Concluded
                        </span>
                    )}
                </div>

                {/* ── Resting state: title at bottom ── */}
                <div className="absolute inset-x-0 bottom-0 z-20 p-4 transition-opacity duration-400 group-hover:opacity-0">
                    <h3 className="font-heading font-bold text-base uppercase tracking-tight-heading leading-tight line-clamp-2 text-white">
                        {event.title}
                    </h3>
                    <div className="flex items-center justify-between mt-2">
                        <span className="font-data text-[9px] font-bold uppercase tracking-widest text-white/40">Event</span>
                        <span className="font-data text-[10px] font-bold uppercase tracking-wider text-brutal-red flex items-center gap-1">
                            {isPast ? 'Recap' : 'View'} <ArrowRight size={10} />
                        </span>
                    </div>
                </div>

                {/* ── Hover panel: crossfade over image ── */}
                <div className="absolute inset-0 z-20 bg-brutal-dark flex flex-col justify-end p-5 gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-in-out">
                    {/* Event type label */}
                    <span className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-red/80">
                        {formatEventType(event.event_type)}
                    </span>

                    {/* Title — large */}
                    <h3 className="font-heading font-bold text-xl md:text-2xl uppercase tracking-tight-heading leading-[1.05] text-white">
                        {event.title}
                    </h3>

                    {/* Description */}
                    {event.description && (
                        <p className="font-data text-[12px] text-white/60 leading-relaxed line-clamp-4">
                            {event.description}
                        </p>
                    )}

                    {/* Metadata */}
                    <div className="flex flex-col gap-1.5">
                        <span className="flex items-center gap-1.5 font-data text-[11px] text-white/55">
                            <Calendar size={11} className="text-brutal-red/60 flex-shrink-0" />
                            {date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        {event.location && !event.location.startsWith('rsvp:') && (
                            <span className="flex items-center gap-1.5 font-data text-[11px] text-white/55">
                                <MapPin size={11} className="text-brutal-red/60 flex-shrink-0" />
                                {event.location}
                            </span>
                        )}
                        <span className="flex items-center gap-1.5 font-data text-[11px] text-white/40">
                            <Users size={11} className="flex-shrink-0" />
                            {regCTA.isZero ? (
                                <span className="italic text-white/25">{regCTA.label}</span>
                            ) : capacityRemaining !== null ? (
                                capacityRemaining > 0 ? `${capacityRemaining} spots left` : 'Fully booked'
                            ) : (
                                `${event.registration_count} registered`
                            )}
                        </span>
                    </div>

                    {/* Footer */}
                    <div className="pt-1 border-t border-white/8">
                        <span className="font-data text-[10px] font-bold uppercase tracking-wider text-brutal-red flex items-center gap-1">
                            {isPast ? 'View Recap' : 'View Event'} <ArrowRight size={10} />
                        </span>
                    </div>
                </div>
            </div>
        </Link>
    );
}
