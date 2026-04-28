import React, { useMemo } from 'react';
import { useEvents } from '../lib/hooks';
import { Link } from 'react-router';
import { Calendar, ArrowLeft, Trophy, BookOpen, Wrench } from 'lucide-react';
import { EventCard } from '../components/event/EventCard';

// ─────────────────────────────────────────────────────────────
// EventsByType — thin filtered-view for a single event type.
// Used by /events/build-challenges, /events/tech-tuesdays, /events/meetups.
//
// Unified with the main /events listing: same EventCard component, same
// grid, same visual language. The only differences are the hero (icon +
// title + subtitle) and the fact that category is locked.
// ─────────────────────────────────────────────────────────────

type EventType = 'build_challenge' | 'maker_meetup' | 'tech_tuesday';

// ─── Skeleton card placeholder (matches Events.tsx) ───────────
function EventCardSkeleton() {
    return (
        <div className="animate-pulse rounded-lg overflow-hidden bg-brutal-dark/10 aspect-[3/4] relative">
            <div className="absolute inset-x-0 bottom-0 p-4 space-y-2">
                <div className="h-3 w-16 bg-white/10 rounded" />
                <div className="h-4 w-3/4 bg-white/10 rounded" />
                <div className="h-3 w-1/2 bg-white/5 rounded" />
            </div>
        </div>
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

    const now = Date.now();

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
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[...Array(6)].map((_, i) => <EventCardSkeleton key={i} />)}
                        </div>
                    ) : (split.upcoming.length === 0 && split.past.length === 0) ? (
                        <div className="py-12 text-center border-2 border-dashed border-brutal-dark/10 rounded-2xl bg-brutal-bg">
                            <Calendar size={28} className="mx-auto mb-3 text-brutal-dark/15" />
                            <p className="font-data text-sm text-brutal-dark/40 mb-1">
                                No {title.toLowerCase()} scheduled yet.
                            </p>
                            <p className="font-data text-[11px] text-brutal-dark/35">
                                Have an idea? Propose one — talk to a mentor at the lab.
                            </p>
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
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {split.upcoming.map(event => (
                                            <EventCard key={event.id} event={event} isPast={false} />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-10 text-center font-data text-sm text-brutal-dark/40 border-2 border-dashed border-brutal-dark/10 rounded-2xl">
                                        <Calendar size={24} className="mx-auto mb-2 text-brutal-dark/15" />
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
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {split.past.map(event => (
                                            <EventCard
                                                key={event.id}
                                                event={event}
                                                isPast={new Date(event.date).getTime() < now}
                                            />
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
