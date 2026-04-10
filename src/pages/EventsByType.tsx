import React, { useMemo } from 'react';
import { useEvents } from '../lib/hooks';
import { Link } from 'react-router';
import { Card } from '../components/ui/Card';
import { MapPin, Calendar, Users, ArrowRight, ArrowLeft, Clock, Trophy, BookOpen, Wrench } from 'lucide-react';
import { cn } from '../lib/utils';
import { formatEventType } from './Events';

// EventsByType: Thin filtered-view components for specific event types.
// Used by /events/build-challenges, /events/tech-tuesdays, /events/meetups

type EventType = 'build_challenge' | 'maker_meetup' | 'tech_tuesday';

// ─── Countdown badge (inline) ─────────────────────────────────
function CountdownBadge({ date }: { date: string }) {
    const now = new Date();
    const eventDate = new Date(date);
    const diff = eventDate.getTime() - now.getTime();
    if (diff <= 0) return null;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const label =
        days === 0 ? (hours <= 1 ? 'Now' : `${hours}h`) :
        days === 1 ? 'Tmrw' :
        `${days}d`;

    return (
        <span className="inline-flex items-center gap-1 font-data text-[10px] font-bold uppercase tracking-wider text-brutal-red">
            <Clock size={10} /> {label}
        </span>
    );
}

// ─── Event list row (compact) ──────────────────────────────────
function EventListRow({ event, isPast }: { event: any; isPast: boolean }) {
    const date = new Date(event.date);
    const capacityRemaining = event.capacity ? event.capacity - event.registration_count : null;

    return (
        <Link
            to={`/events/${event.id}`}
            className={cn(
                'group block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brutal-red',
                isPast && 'opacity-75 hover:opacity-100 transition-opacity',
            )}
        >
            <div className={cn(
                'flex items-center gap-4 p-3 md:p-3.5 rounded-xl',
                'border-2 border-brutal-dark/12',
                'bg-brutal-bg',
                'shadow-[4px_4px_0_0_rgba(196,41,30,0.12)]',
                'transition-all duration-150 ease-out',
                'hover:translate-x-[-2px] hover:translate-y-[-2px]',
                'hover:shadow-[6px_6px_0_0_rgba(196,41,30,0.22)]',
                'hover:border-brutal-red/45',
                'motion-reduce:hover:translate-x-0 motion-reduce:hover:translate-y-0 motion-reduce:transition-none',
            )}>
                {/* Date tile */}
                <div className="flex-shrink-0 w-14 md:w-16 text-center bg-brutal-dark/[0.04] border border-brutal-dark/10 rounded-lg py-2">
                    <div className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-red">
                        {date.toLocaleDateString('en-IN', { month: 'short' })}
                    </div>
                    <div className="font-heading font-bold text-xl md:text-2xl leading-none text-brutal-dark tabular-nums">
                        {date.getDate()}
                    </div>
                    <div className="font-data text-[8px] font-bold uppercase tracking-widest text-brutal-dark/40 mt-0.5">
                        {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                </div>

                {/* Main text block */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-red">
                            #{formatEventType(event.event_type)}
                        </span>
                        {!isPast && <CountdownBadge date={event.date} />}
                        {isPast && (
                            <span className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-dark/40">· Past</span>
                        )}
                    </div>
                    <h3 className="font-heading font-bold text-sm md:text-base leading-tight uppercase tracking-tight-heading line-clamp-1 text-brutal-dark group-hover:text-brutal-red transition-colors">
                        {event.title}
                    </h3>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[10px] md:text-[11px] font-data text-brutal-dark/55">
                        {event.location && !event.location.startsWith('rsvp:') && (
                            <span className="flex items-center gap-1 line-clamp-1 max-w-[200px]">
                                <MapPin size={10} className="text-brutal-dark/35" /> {event.location}
                            </span>
                        )}
                        <span className="flex items-center gap-1 tabular-nums">
                            <Users size={10} className="text-brutal-dark/35" />
                            {capacityRemaining !== null
                                ? (capacityRemaining > 0 ? `${capacityRemaining} spots` : 'Full')
                                : `${event.registration_count} in`}
                        </span>
                    </div>
                </div>

                {/* Right-side CTA */}
                <div className="hidden md:flex flex-col items-end gap-1.5 flex-shrink-0 pr-1">
                    {!isPast && event.registration_status === 'open' && (capacityRemaining === null || capacityRemaining > 0) ? (
                        <span className="font-data text-[9px] font-bold uppercase tracking-wider text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">Open</span>
                    ) : isPast ? (
                        <span className="font-data text-[9px] font-bold uppercase tracking-wider text-brutal-dark/40">Recap</span>
                    ) : null}
                    <ArrowRight
                        size={14}
                        className="text-brutal-dark/25 group-hover:text-brutal-red group-hover:translate-x-0.5 transition-all"
                        aria-hidden
                    />
                </div>
            </div>
        </Link>
    );
}

// ─── Past masonry card (compact) ───────────────────────────────
function PastMasonryCard({ event }: { event: any }) {
    const date = new Date(event.date);
    return (
        <Link
            to={`/events/${event.id}`}
            className="group block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brutal-red"
        >
            <Card className={cn(
                'overflow-hidden flex flex-col',
                'border-2 border-brutal-dark/10',
                'shadow-[4px_4px_0_0_rgba(196,41,30,0.10)]',
                'hover:shadow-[6px_6px_0_0_rgba(196,41,30,0.18)] hover:border-brutal-red/35',
                'hover:translate-x-[-2px] hover:translate-y-[-2px]',
                'motion-reduce:hover:translate-x-0 motion-reduce:hover:translate-y-0',
                'transition-all duration-150 ease-out',
            )}>
                <div className="h-28 w-full overflow-hidden bg-brutal-dark relative grayscale-[25%] group-hover:grayscale-0 transition-all duration-500">
                    {event.cover_image_url ? (
                        <img
                            src={event.cover_image_url}
                            alt={event.title}
                            loading="lazy"
                            className="w-full h-full object-cover opacity-75 group-hover:opacity-100 group-hover:scale-[1.04] transition-all duration-500 ease-out"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-brutal-dark/10" />
                    )}
                    <div className="absolute top-2 right-2 bg-brutal-bg/90 text-brutal-dark text-[8px] font-data font-bold uppercase px-1.5 py-0.5 rounded backdrop-blur-sm border border-brutal-dark/10 z-10 tracking-wider">
                        Past
                    </div>
                </div>
                <div className="p-3 flex flex-col gap-1">
                    <span className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-red/80">
                        #{formatEventType(event.event_type)}
                    </span>
                    <h4 className="font-heading font-bold text-xs leading-tight line-clamp-2 uppercase tracking-tight-heading text-brutal-dark group-hover:text-brutal-red transition-colors">
                        {event.title}
                    </h4>
                    <span className="font-data text-[9px] text-brutal-dark/40 mt-0.5">
                        {date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                </div>
            </Card>
        </Link>
    );
}

// ─── Generic EventsByType component (internal) ──────────────────
interface EventsByTypeProps {
    eventType: EventType;
    title: string;
    subtitle: string;
    icon: React.ComponentType<any>;
}
function EventsByType({ eventType, title, subtitle, icon: Icon }: EventsByTypeProps) {
    const { data: events, loading } = useEvents();

    const split = useMemo(() => {
        const now = Date.now();
        const filtered = (events || []).filter(e => e.event_type === eventType);
        const upcoming = filtered
            .filter(e => new Date(e.date).getTime() >= now)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const past = filtered
            .filter(e => new Date(e.date).getTime() < now)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return { upcoming, past };
    }, [events, eventType]);

    return (
        <div className="flex-1 w-full bg-brutal-bg pt-28 md:pt-32 px-6 md:px-12 lg:px-24 min-h-screen">
            <div className="max-w-7xl mx-auto">
                {/* Back link */}
                <Link
                    to="/events"
                    className="inline-flex items-center gap-1.5 font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/50 hover:text-brutal-red transition-colors mb-8"
                >
                    <ArrowLeft size={12} /> Back to all events
                </Link>

                {/* Page heading */}
                <div className="mb-8">
                    <div className="flex items-start gap-3 mb-3">
                        <div className="p-2.5 bg-brutal-dark/[0.05] border border-brutal-dark/10 rounded-lg flex-shrink-0">
                            <Icon size={20} className="text-brutal-red" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h1 className="font-heading font-bold text-3xl md:text-4xl uppercase tracking-tight-heading text-brutal-dark mb-1">
                                {title}
                            </h1>
                            <p className="font-data text-sm md:text-base text-brutal-dark/60">
                                {subtitle}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="pb-24">
                    {loading ? (
                        <div className="space-y-3">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="animate-pulse flex items-center gap-4 p-3 border-2 border-brutal-dark/10 rounded-xl">
                                    <div className="w-16 h-16 bg-brutal-dark/5 rounded-lg flex-shrink-0" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-3 w-16 bg-brutal-dark/8 rounded" />
                                        <div className="h-4 w-3/4 bg-brutal-dark/8 rounded" />
                                        <div className="h-3 w-1/2 bg-brutal-dark/5 rounded" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-12">
                            {/* Upcoming */}
                            <section>
                                <div className="flex items-center gap-3 mb-5">
                                    <h2 className="font-heading font-bold text-base md:text-lg uppercase tracking-tight-heading">
                                        Upcoming
                                    </h2>
                                    {split.upcoming.length > 0 && (
                                        <span className="bg-green-50 text-green-700 border border-green-200 text-[9px] font-data font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                            {split.upcoming.length} Active
                                        </span>
                                    )}
                                </div>

                                {split.upcoming.length > 0 ? (
                                    <div className="space-y-2.5">
                                        {split.upcoming.map(e => (
                                            <EventListRow key={e.id} event={e} isPast={false} />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-12 text-center font-data text-sm text-brutal-dark/40 border-2 border-dashed border-brutal-dark/10 rounded-2xl">
                                        <Calendar size={28} className="mx-auto mb-3 text-brutal-dark/15" />
                                        <p className="mb-1">No upcoming {title.toLowerCase()} scheduled.</p>
                                        <p className="font-data text-[11px] text-brutal-dark/35">
                                            Check back soon or propose one to a mentor.
                                        </p>
                                    </div>
                                )}
                            </section>

                            {/* Past */}
                            {split.past.length > 0 && (
                                <section>
                                    <div className="flex items-center gap-3 mb-5">
                                        <h2 className="font-heading font-bold text-base md:text-lg uppercase tracking-tight-heading text-brutal-dark/60">
                                            Past {title}
                                        </h2>
                                        <span className="bg-brutal-dark/5 text-brutal-dark/50 border border-brutal-dark/10 text-[9px] font-data font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                            {split.past.length}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
                                        {split.past.map(event => (
                                            <PastMasonryCard key={event.id} event={event} />
                                        ))}
                                    </div>
                                </section>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Named exports ─────────────────────────────────────────────
export function BuildChallenges() {
    return <EventsByType eventType="build_challenge" title="Build Challenges" subtitle="Compete, build, push limits in structured sprints." icon={Trophy} />;
}
export function TechTuesdays() {
    return <EventsByType eventType="tech_tuesday" title="Tech Tuesdays" subtitle="Weekly knowledge drops — RSVP, join, learn." icon={BookOpen} />;
}
export function MakerMeetups() {
    return <EventsByType eventType="maker_meetup" title="Maker Meetups" subtitle="Connect, showcase, learn in open-floor sessions." icon={Wrench} />;
}
