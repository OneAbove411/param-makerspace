import React, { useState } from 'react';
import { useEvents } from '../lib/hooks';
import { Card } from '../components/ui/Card';
import { Link } from 'react-router-dom';
import { MapPin, Calendar, Users } from 'lucide-react';

export function Events() {
    const [filter, setFilter] = useState('All');
    const types = ['All', 'build_challenge', 'maker_meetup', 'tech_tuesday'];
    const { data: events, loading } = useEvents(filter);

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
                            {t.replace(/_/g, ' ')}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="py-20 text-center font-data text-brutal-dark/50">Loading events...</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-32">
                        {(events || []).map(event => {
                            const date = new Date(event.date);
                            const capacityRemaining = event.capacity ? event.capacity - event.registration_count : null;
                            return (
                                <Link key={event.id} to={`/events/${event.id}`} className="group interactive-lift block">
                                    <Card className="h-full flex flex-col group-hover:border-brutal-red transition-colors duration-300 pointer-events-auto">
                                        <div className="h-48 w-full overflow-hidden bg-brutal-dark relative">
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
                                                <span className="bg-brutal-bg text-brutal-dark px-2 py-1 text-xs font-bold font-data rounded border border-brutal-dark/10 shadow-sm uppercase">{event.event_type.replace(/_/g, ' ')}</span>
                                            </div>
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
                                                        {event.location}
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
                                                {event.registration_status === 'open' && (capacityRemaining === null || capacityRemaining > 0) && (
                                                    <span className="font-data text-xs font-bold uppercase text-green-600 bg-green-100 px-2 py-1 rounded">Open</span>
                                                )}
                                            </div>
                                        </div>
                                    </Card>
                                </Link>
                            )
                        })}

                        {(events || []).length === 0 && !loading && (
                            <div className="col-span-full py-20 text-center font-data text-brutal-dark/50 border-2 border-dashed border-brutal-dark/20 rounded-2xl">
                                No events found.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
