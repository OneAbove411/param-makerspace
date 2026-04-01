import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useEvents } from '../lib/hooks';
import { Card } from '../components/ui/Card';
import { MagneticCard } from '../components/ui/MagneticCard';
import { Link } from 'react-router-dom';
import { MapPin, Calendar, Users, ArrowRight, ChevronDown } from 'lucide-react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export const formatEventType = (type: string) => ({
    build_challenge: 'Build Challenge',
    maker_meetup: 'Maker Meetup',
    tech_tuesday: 'Tech Tuesday',
    workshop: 'Workshop',
    hackathon: 'Hackathon',
    demo_day: 'Demo Day',
}[type] || type);

const TYPE_BADGE_STYLE: Record<string, string> = {
    build_challenge: 'bg-brutal-red text-brutal-bg',
    maker_meetup: 'bg-brutal-dark text-brutal-bg',
    tech_tuesday: 'bg-brutal-dark/10 text-brutal-dark',
};

function EventSkeleton() {
    return (
        <div className="rounded-2xl border-2 border-brutal-dark/5 overflow-hidden animate-pulse">
            <div className="h-48 bg-brutal-dark/5" />
            <div className="p-5 space-y-3">
                <div className="h-5 w-3/4 bg-brutal-dark/5 rounded" />
                <div className="h-3 w-1/2 bg-brutal-dark/[0.03] rounded" />
            </div>
        </div>
    );
}

export function Events() {
    const [filter, setFilter] = useState('All');
    const types = ['All', 'build_challenge', 'maker_meetup', 'tech_tuesday', 'workshop', 'hackathon', 'demo_day'];
    const { data: events, loading } = useEvents(filter);
    const pageRef = useRef<HTMLDivElement>(null);

    const { upcomingEvents, pastEvents, pastTechTuesdays } = useMemo(() => {
        const now = Date.now();
        const all = events || [];
        const upcoming = all.filter(e => new Date(e.date).getTime() >= now);
        const past = all.filter(e => new Date(e.date).getTime() < now);
        const pastTT = past.filter(e => e.event_type === 'tech_tuesday');
        return { upcomingEvents: upcoming, pastEvents: past, pastTechTuesdays: pastTT };
    }, [events]);

    // GSAP
    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.fromTo('.ev-hero-text',
                { y: 40, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.8, stagger: 0.1, ease: 'power3.out', delay: 0.1 }
            );
        }, pageRef);
        return () => ctx.revert();
    }, []);

    useEffect(() => {
        if (loading || !events?.length) return;
        const ctx = gsap.context(() => {
            gsap.fromTo('.ev-card',
                { y: 35, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.6, stagger: 0.06, ease: 'power3.out',
                  scrollTrigger: { trigger: '.ev-grid', start: 'top 85%' } }
            );
        }, pageRef);
        return () => ctx.revert();
    }, [loading, events?.length, filter]);

    const renderEventCard = (event: any, isPast: boolean) => {
        const date = new Date(event.date);
        const capacityRemaining = event.capacity ? event.capacity - event.registration_count : null;
        return (
            <MagneticCard key={event.id} className="ev-card" glowOnHover intensity={5}>
                <Link to={`/events/${event.id}`} className={`block h-full ${isPast ? 'opacity-70' : ''}`}>
                    <Card className={`h-full flex flex-col hover:border-brutal-dark/25 transition-colors duration-300
                        ${event.event_type === 'build_challenge' ? 'border-t-2 border-t-brutal-red' :
                          event.event_type === 'maker_meetup' ? 'border-t-2 border-t-brutal-dark' : ''}`}>
                        <div className="h-48 w-full overflow-hidden bg-brutal-dark relative group">
                            {event.cover_image_url ? (
                                <img src={event.cover_image_url} alt={event.title}
                                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700 ease-out" />
                            ) : (
                                <div className="w-full h-full" style={{
                                    backgroundImage: 'radial-gradient(circle, rgba(245,243,238,0.06) 1px, transparent 1px)',
                                    backgroundSize: '20px 20px',
                                }} />
                            )}
                            <div className="absolute top-3 left-3 flex gap-1.5">
                                <span className={`px-2 py-0.5 text-[9px] font-bold font-data rounded uppercase tracking-wider ${TYPE_BADGE_STYLE[event.event_type] || 'bg-brutal-dark/10 text-brutal-dark'}`}>
                                    {formatEventType(event.event_type)}
                                </span>
                            </div>
                            {isPast && (
                                <div className="absolute top-3 right-3 bg-brutal-dark/50 text-brutal-bg text-[9px] font-data font-bold uppercase px-2 py-0.5 rounded backdrop-blur-sm">
                                    Past
                                </div>
                            )}
                        </div>

                        <div className="p-5 flex-1 flex flex-col">
                            <h3 className="font-heading font-bold text-lg mb-3 leading-tight line-clamp-2">{event.title}</h3>
                            <div className="space-y-2 flex-1">
                                <div className="flex items-center gap-2 font-data text-xs text-brutal-dark/60">
                                    <Calendar size={13} className="text-brutal-red flex-shrink-0" />
                                    {date.toLocaleDateString()} at {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                                {event.location && (
                                    <div className="flex items-center gap-2 font-data text-xs text-brutal-dark/60">
                                        <MapPin size={13} className="text-brutal-red flex-shrink-0" />
                                        {event.location.startsWith('rsvp:') ? 'External Location' : event.location}
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center justify-between border-t border-brutal-dark/5 pt-3 mt-4">
                                <div className="flex items-center gap-1.5 font-data text-[10px] font-bold text-brutal-dark/40">
                                    <Users size={12} />
                                    {capacityRemaining !== null ? (
                                        capacityRemaining > 0 ? `${capacityRemaining} spots left` : 'Full'
                                    ) : (
                                        `${event.registration_count} registered`
                                    )}
                                </div>
                                {!isPast && event.registration_status === 'open' && (capacityRemaining === null || capacityRemaining > 0) && (
                                    <span className="font-data text-[9px] font-bold uppercase text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Open</span>
                                )}
                            </div>
                        </div>
                    </Card>
                </Link>
            </MagneticCard>
        );
    };

    return (
        <div ref={pageRef} className="flex-1 w-full bg-brutal-bg min-h-screen">
            {/* Hero */}
            <section className="pt-36 pb-12 px-6 md:px-12 lg:px-24 max-w-7xl mx-auto">
                <h1 className="ev-hero-text font-heading font-bold text-3xl sm:text-5xl md:text-7xl uppercase tracking-tight-heading mb-6">
                    Ecosystem Events
                </h1>

                {/* Event type dropdown */}
                <div className="ev-hero-text flex items-center gap-3">
                    <span className="font-data text-[10px] font-bold uppercase text-brutal-dark/40 tracking-widest">
                        Type:
                    </span>
                    <div className="relative w-full sm:w-auto">
                        <select
                            className="appearance-none bg-brutal-bg border-2 border-brutal-dark/15 rounded-full
                                       w-full sm:w-auto px-5 py-2 pr-9 font-data text-xs font-bold uppercase tracking-wider
                                       focus:outline-none focus:border-brutal-dark transition-colors cursor-pointer"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                        >
                            {types.map(t => (
                                <option key={t} value={t}>{t === 'All' ? 'All' : formatEventType(t)}</option>
                            ))}
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-brutal-dark/40 pointer-events-none" />
                    </div>
                </div>
            </section>

            {/* Content */}
            <div className="px-6 md:px-12 lg:px-24 max-w-7xl mx-auto pb-32">
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[...Array(6)].map((_, i) => <EventSkeleton key={i} />)}
                    </div>
                ) : (
                    <div className="space-y-16">
                        {/* Upcoming */}
                        <section>
                            <div className="flex items-center gap-3 mb-6">
                                <span className="font-data text-[10px] text-brutal-dark/30 font-bold uppercase tracking-widest">01</span>
                                <h2 className="font-heading font-bold text-lg uppercase tracking-tight-heading">Upcoming Events</h2>
                            </div>
                            {upcomingEvents.length > 0 ? (
                                <div className="ev-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {upcomingEvents.map(event => renderEventCard(event, false))}
                                </div>
                            ) : (
                                <div className="py-16 text-center font-data text-sm text-brutal-dark/30 border border-dashed border-brutal-dark/10 rounded-2xl">
                                    No upcoming events for this filter.
                                </div>
                            )}
                        </section>

                        {/* Past Tech Tuesdays scroll */}
                        {pastTechTuesdays.length > 0 && (
                            <section className="bg-brutal-dark/[0.03] -mx-6 md:-mx-12 lg:-mx-24 px-6 md:px-12 lg:px-24 py-10 border-y border-brutal-dark/8">
                                <div className="flex items-center gap-3 mb-6">
                                    <span className="font-data text-[10px] text-brutal-dark/30 font-bold uppercase tracking-widest">02</span>
                                    <h2 className="font-heading font-bold text-lg uppercase tracking-tight-heading text-brutal-dark/70">Past Tech Tuesdays</h2>
                                </div>
                                <div className="flex gap-4 overflow-x-auto pb-4 snap-x">
                                    {pastTechTuesdays.map((event: any) => (
                                        <Link key={event.id} to={`/events/${event.id}`} className="snap-start shrink-0 w-72 group">
                                            <div className="p-4 bg-brutal-bg border border-brutal-dark/10 rounded-xl group-hover:border-brutal-red/30 transition-colors h-full flex flex-col justify-between">
                                                <div>
                                                    <span className="font-data text-[10px] font-bold uppercase text-brutal-dark/35 block mb-1">
                                                        {new Date(event.date).toLocaleDateString()}
                                                    </span>
                                                    <h4 className="font-heading font-bold text-base leading-tight mb-2 line-clamp-2">{event.title}</h4>
                                                </div>
                                                <span className="font-data text-[10px] font-bold uppercase text-brutal-red flex items-center gap-1 mt-3">
                                                    View Recap <ArrowRight size={10} className="group-hover:translate-x-1 transition-transform" />
                                                </span>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Past Events */}
                        {pastEvents.length > 0 && (
                            <section>
                                <div className="flex items-center gap-3 mb-6">
                                    <span className="font-data text-[10px] text-brutal-dark/30 font-bold uppercase tracking-widest">03</span>
                                    <h2 className="font-heading font-bold text-lg uppercase tracking-tight-heading text-brutal-dark/50">Past Events</h2>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                                    {pastEvents.map(event => renderEventCard(event, true))}
                                </div>
                            </section>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
