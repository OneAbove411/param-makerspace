import React, { useState } from 'react';
import { useEvents } from '../lib/hooks';
import { Card } from '../components/ui/Card';
import { Link } from 'react-router-dom';
import { MapPin, Calendar, Users, ArrowRight } from 'lucide-react';

export const formatEventType = (type: string) => ({
    build_challenge: 'Build Challenge',
    maker_meetup: 'Maker Meetup',
    tech_tuesday: 'Tech Tuesday',
}[type] || type)

export function Events() {
    const [filter, setFilter] = useState('All');
    const types = ['All', 'build_challenge', 'maker_meetup', 'tech_tuesday'];
    const { data: events, loading } = useEvents(filter);

    const now = new Date();
    const upcomingEvents = (events || []).filter(e => new Date(e.date) >= now);
    const pastEvents = (events || []).filter(e => new Date(e.date) < now);
    const pastTechTuesdays = pastEvents.filter(e => e.event_type === 'tech_tuesday');

    const getCardStyle = (type: string) => {
        switch(type) {
            case 'build_challenge': return 'border-t-4 border-t-brutal-red';
            case 'maker_meetup': return 'border-t-4 border-t-brutal-dark';
            case 'tech_tuesday': return 'border-t-4 border-t-brutal-dark/30';
            default: return '';
        }
    }
    const getBadgeStyle = (type: string) => {
        switch(type) {
            case 'build_challenge': return 'bg-brutal-red text-brutal-bg';
            case 'maker_meetup': return 'bg-brutal-dark text-brutal-bg';
            case 'tech_tuesday': return 'bg-brutal-dark/10 text-brutal-dark';
            default: return 'bg-brutal-bg text-brutal-dark';
        }
    }

    const renderEventCard = (event: any, isPast: boolean) => {
        const date = new Date(event.date);
        const capacityRemaining = event.capacity ? event.capacity - event.registration_count : null;
        return (
            <Link key={event.id} to={`/events/${event.id}`} className={`group interactive-lift block ${isPast ? 'opacity-75' : ''}`}>
                <Card className={`h-full flex flex-col group-hover:border-brutal-red transition-colors duration-300 pointer-events-auto ${getCardStyle(event.event_type)}`}>
                    <div className="h-48 w-full overflow-hidden bg-brutal-dark relative flex-shrink-0">
                        {event.cover_image_url ? (
                            <img
                                src={event.cover_image_url}
                                alt={event.title}
                                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500 ease-out"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center font-data text-brutal-bg/20">NO IMAGE</div>
                        )}
                        <div className="absolute top-4 left-4 flex gap-2">
                            <span className={`px-2 py-1 text-xs font-bold font-data rounded border ${event.event_type === 'tech_tuesday' ? 'border-brutal-dark/20' : 'border-brutal-dark/10'} shadow-sm uppercase ${getBadgeStyle(event.event_type)}`}>
                                {formatEventType(event.event_type)}
                            </span>
                        </div>
                        {isPast && event.event_type === 'tech_tuesday' && (
                            <div className="absolute bottom-4 left-4 bg-brutal-dark/60 text-brutal-bg text-[10px] font-data font-bold uppercase px-2 py-1 rounded shadow-sm backdrop-blur-sm">
                                PAST SESSION
                            </div>
                        )}
                        {isPast && event.event_type !== 'tech_tuesday' && (
                            <div className="absolute top-4 right-4 bg-brutal-dark/20 text-brutal-dark rounded-full px-2 py-0.5 text-[10px] font-bold font-data uppercase backdrop-blur-md border border-brutal-dark/10">
                                PAST
                            </div>
                        )}
                    </div>

                    <div className="p-6 flex-1 flex flex-col">
                        <h3 className="font-heading font-bold text-2xl mb-4 leading-tight">{event.title}</h3>

                        <div className="space-y-3 flex-1">
                            <div className="flex items-center gap-2 font-data text-sm text-brutal-dark/70">
                                <Calendar className="w-4 h-4 text-brutal-red" />
                                {date.toLocaleDateString()} at {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            {event.location && (
                                <div className="flex items-center gap-2 font-data text-sm text-brutal-dark/70">
                                    <MapPin className="w-4 h-4 text-brutal-red" />
                                    {event.location.startsWith('rsvp:') ? 'External Location' : event.location}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-between border-t border-brutal-dark/10 pt-4 mt-6">
                            <div className="flex items-center gap-2 font-data text-xs font-bold">
                                <Users className="w-4 h-4" />
                                {capacityRemaining !== null ? (
                                    capacityRemaining > 0 ? (
                                        <span className="text-brutal-dark/60">{capacityRemaining} spots remaining</span>
                                    ) : (
                                        <span className="text-brutal-red uppercase">Full</span>
                                    )
                                ) : (
                                    <span className="text-brutal-dark/60">{event.registration_count} registered</span>
                                )}
                            </div>
                            {!isPast && event.registration_status === 'open' && (capacityRemaining === null || capacityRemaining > 0) && (
                                <span className="font-data text-xs font-bold uppercase text-green-600 bg-green-100 px-2 py-1 rounded">Open</span>
                            )}
                        </div>
                    </div>
                </Card>
            </Link>
        )
    }

    return (
        <div className="flex-1 w-full bg-brutal-bg pt-32 px-6 md:px-12 lg:px-24 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <h1 className="font-heading font-bold text-5xl md:text-7xl uppercase tracking-tight-heading mb-8">
                    Ecosystem Events
                </h1>

                {/* Filters */}
                <div className="flex flex-wrap gap-4 mb-12 border-b-2 border-brutal-dark/10 pb-6">
                    {types.map(t => (
                        <button
                            key={t}
                            onClick={() => setFilter(t)}
                            className={`px-4 py-2 font-data text-sm rounded-full transition-colors border-2 uppercase ${filter === t
                                    ? 'bg-brutal-dark text-brutal-bg border-brutal-dark'
                                    : 'border-brutal-dark/20 text-brutal-dark hover:border-brutal-dark hover:bg-brutal-dark/5'
                                }`}
                        >
                            {t === 'All' ? 'All' : formatEventType(t)}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="py-20 text-center font-data text-brutal-dark/50">Loading events...</div>
                ) : (
                    <div className="space-y-16 pb-32">
                        {/* Upcoming Events */}
                        <section>
                            <h2 className="font-heading font-bold text-3xl mb-6 uppercase tracking-tight-heading">Upcoming Events</h2>
                            {upcomingEvents.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {upcomingEvents.map(event => renderEventCard(event, false))}
                                </div>
                            ) : (
                                <div className="py-20 text-center font-data text-brutal-dark/50 border-2 border-dashed border-brutal-dark/20 rounded-2xl">
                                    No upcoming events for this filter. Check the past sessions below.
                                </div>
                            )}
                        </section>

                        {/* Past Tech Tuesday horizontal scroll */}
                        {pastTechTuesdays.length > 0 && (
                            <section className="bg-brutal-dark/5 -mx-6 md:-mx-12 lg:-mx-24 px-6 md:px-12 lg:px-24 py-12 border-y border-brutal-dark/10">
                                <h2 className="font-heading font-bold text-3xl mb-6 uppercase tracking-tight-heading text-brutal-dark/80">Past Tech Tuesdays</h2>
                                <div className="flex gap-4 overflow-x-auto pb-6 snap-x">
                                    {pastTechTuesdays.map((event: any) => (
                                        <Link key={event.id} to={`/events/${event.id}`} className="snap-start shrink-0 w-72 lg:w-80 group">
                                            <div className="p-4 bg-white border border-brutal-dark/10 rounded-xl group-hover:border-brutal-red transition-colors h-full flex flex-col justify-between interactive-lift">
                                                <div>
                                                    <div className="font-data text-[10px] font-bold uppercase text-brutal-dark/50 mb-1">
                                                        {new Date(event.date).toLocaleDateString()}
                                                    </div>
                                                    <h4 className="font-heading font-bold text-xl leading-tight mb-2 line-clamp-2">{event.title}</h4>
                                                </div>
                                                <div className="font-data text-xs font-bold uppercase text-brutal-red flex items-center gap-1 mt-4">
                                                    View Recap <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Past Events Grid */}
                        {pastEvents.length > 0 && (
                            <section>
                                <h2 className="font-heading font-bold text-3xl mb-6 uppercase tracking-tight-heading text-brutal-dark/60">Past Events</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
