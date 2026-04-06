import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useEvents } from '../lib/hooks';
import { Card } from '../components/ui/Card';
import { MagneticCard } from '../components/ui/MagneticCard';
import { Link } from 'react-router-dom';
import { MapPin, Calendar, Users, ArrowRight, Wrench, Trophy, BookOpen, Clock } from 'lucide-react';
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

const CATEGORY_CONFIG = {
    maker_meetup: {
        label: 'Maker Meetups',
        shortLabel: 'Meetups',
        icon: Wrench,
        bgAccent: 'bg-brutal-dark',
        borderAccent: 'border-brutal-dark',
        description: 'Connect, showcase, and learn from fellow makers in open-floor sessions.',
    },
    build_challenge: {
        label: 'Build Challenges',
        shortLabel: 'Challenges',
        icon: Trophy,
        bgAccent: 'bg-brutal-red',
        borderAccent: 'border-brutal-red',
        description: 'Compete, build, and push your limits in structured hackathon-style events.',
    },
    tech_tuesday: {
        label: 'Tech Tuesday',
        shortLabel: 'Tech Tue',
        icon: BookOpen,
        bgAccent: 'bg-brutal-dark/80',
        borderAccent: 'border-brutal-dark/40',
        description: 'Weekly knowledge drops — RSVP, join, connect, and learn.',
    },
} as const;

type CategoryKey = keyof typeof CATEGORY_CONFIG;
const CATEGORIES: CategoryKey[] = ['maker_meetup', 'build_challenge', 'tech_tuesday'];

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

function CountdownBadge({ date }: { date: string }) {
    const now = new Date();
    const eventDate = new Date(date);
    const diff = eventDate.getTime() - now.getTime();
    if (diff <= 0) return null;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days > 30) return null;
    return (
        <span className="absolute top-3 right-3 bg-brutal-red text-brutal-bg text-[9px] font-data font-bold uppercase px-2 py-0.5 rounded backdrop-blur-sm flex items-center gap-1 z-10">
            <Clock size={9} /> {days === 0 ? 'Today' : `${days}d left`}
        </span>
    );
}

export function Events() {
    const [activeTab, setActiveTab] = useState<CategoryKey>('maker_meetup');
    const { data: events, loading } = useEvents();
    const pageRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    const categorizedEvents = useMemo(() => {
        const now = Date.now();
        const all = events || [];
        const result: Record<CategoryKey, { upcoming: typeof all; past: typeof all }> = {
            maker_meetup: { upcoming: [], past: [] },
            build_challenge: { upcoming: [], past: [] },
            tech_tuesday: { upcoming: [], past: [] },
        };
        all.forEach(e => {
            const key = e.event_type as CategoryKey;
            if (!result[key]) return;
            if (new Date(e.date).getTime() >= now) {
                result[key].upcoming.push(e);
            } else {
                result[key].past.push(e);
            }
        });
        return result;
    }, [events]);

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
                { y: 0, opacity: 1, duration: 0.5, stagger: 0.06, ease: 'power3.out' }
            );
        }, contentRef);
        return () => ctx.revert();
    }, [loading, events?.length, activeTab]);

    const config = CATEGORY_CONFIG[activeTab];
    const { upcoming, past } = categorizedEvents[activeTab];
    const Icon = config.icon;

    const renderEventCard = (event: any, isPast: boolean) => {
        const date = new Date(event.date);
        const capacityRemaining = event.capacity ? event.capacity - event.registration_count : null;

        return (
            <MagneticCard key={event.id} className="ev-card" glowOnHover intensity={5}>
                <Link to={`/events/${event.id}`} className={`block h-full ${isPast ? 'opacity-75 hover:opacity-100 transition-opacity' : ''}`}>
                    <Card className={`h-full flex flex-col hover:border-brutal-dark/25 transition-colors duration-300
                        ${event.event_type === 'build_challenge' ? 'border-t-2 border-t-brutal-red' :
                          event.event_type === 'maker_meetup' ? 'border-t-2 border-t-brutal-dark' :
                          'border-t-2 border-t-brutal-dark/30'}`}>
                        <div className="h-48 w-full overflow-hidden bg-brutal-dark relative group">
                            {event.cover_image_url ? (
                                <img src={event.cover_image_url} alt={event.title}
                                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700 ease-out" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center" style={{
                                    backgroundImage: 'radial-gradient(circle, rgba(245,243,238,0.06) 1px, transparent 1px)',
                                    backgroundSize: '20px 20px',
                                }}>
                                    <Icon size={48} className="text-brutal-bg/10" />
                                </div>
                            )}
                            {!isPast && <CountdownBadge date={event.date} />}
                            {isPast && (
                                <div className="absolute top-3 right-3 bg-brutal-dark/50 text-brutal-bg text-[9px] font-data font-bold uppercase px-2 py-0.5 rounded backdrop-blur-sm z-10">
                                    Past
                                </div>
                            )}
                        </div>

                        <div className="p-5 flex-1 flex flex-col">
                            <h3 className="font-heading font-bold text-lg mb-1 leading-tight line-clamp-2">{event.title}</h3>
                            {event.tagline && (
                                <p className="font-data text-[10px] text-brutal-dark/50 mb-3 line-clamp-1">{event.tagline}</p>
                            )}
                            <div className="space-y-2 flex-1">
                                <div className="flex items-center gap-2 font-data text-xs text-brutal-dark/60">
                                    <Calendar size={13} className="text-brutal-red flex-shrink-0" />
                                    {date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} at {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                                {event.location && !event.location.startsWith('rsvp:') && (
                                    <div className="flex items-center gap-2 font-data text-xs text-brutal-dark/60">
                                        <MapPin size={13} className="text-brutal-red flex-shrink-0" />
                                        {event.location}
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center justify-between border-t border-brutal-dark/5 pt-3 mt-3">
                                <div className="flex items-center gap-1.5 font-data text-[10px] font-bold text-brutal-dark/40">
                                    <Users size={12} />
                                    {capacityRemaining !== null ? (
                                        capacityRemaining > 0 ? `${capacityRemaining} spots left` : 'Full'
                                    ) : (
                                        `${event.registration_count} registered`
                                    )}
                                </div>
                                {!isPast && event.registration_status === 'open' && (capacityRemaining === null || capacityRemaining > 0) ? (
                                    <span className="font-data text-[9px] font-bold uppercase text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Open</span>
                                ) : isPast ? (
                                    <span className="font-data text-[9px] font-bold uppercase text-brutal-dark/40 flex items-center gap-1">
                                        View Recap <ArrowRight size={9} />
                                    </span>
                                ) : null}
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
            <section className="pt-36 pb-8 px-6 md:px-12 lg:px-24 max-w-7xl mx-auto">
                <h1 className="ev-hero-text font-heading font-bold text-3xl sm:text-5xl md:text-7xl uppercase tracking-tight-heading mb-4">
                    Ecosystem Events
                </h1>
                <p className="ev-hero-text font-data text-sm text-brutal-dark/50 max-w-xl">
                    Where ideas meet action. Join meetups, compete in challenges, or learn something new every Tuesday.
                </p>
            </section>

            {/* Category Tabs */}
            <section className="px-6 md:px-12 lg:px-24 max-w-7xl mx-auto mb-8">
                <div className="ev-hero-text flex gap-1 border-b-2 border-brutal-dark/10">
                    {CATEGORIES.map(cat => {
                        const c = CATEGORY_CONFIG[cat];
                        const CatIcon = c.icon;
                        const isActive = activeTab === cat;
                        const totalEvents = (categorizedEvents[cat].upcoming.length + categorizedEvents[cat].past.length);

                        return (
                            <button
                                key={cat}
                                onClick={() => setActiveTab(cat)}
                                className={`relative flex items-center gap-2 px-5 py-3.5 font-data text-xs font-bold uppercase tracking-wider transition-all duration-300 rounded-t-xl
                                    ${isActive
                                        ? `${c.bgAccent} text-brutal-bg shadow-lg -mb-[2px] border-b-2 ${c.borderAccent}`
                                        : 'text-brutal-dark/40 hover:text-brutal-dark/70 hover:bg-brutal-dark/5'
                                    }`}
                            >
                                <CatIcon size={14} />
                                <span className="hidden sm:inline">{c.label}</span>
                                <span className="sm:hidden">{c.shortLabel}</span>
                                {totalEvents > 0 && (
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                                        isActive ? 'bg-brutal-bg/20 text-brutal-bg' : 'bg-brutal-dark/10 text-brutal-dark/40'
                                    }`}>
                                        {totalEvents}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </section>

            {/* Content */}
            <div ref={contentRef} className="px-6 md:px-12 lg:px-24 max-w-7xl mx-auto pb-32">
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
                                <h2 className="font-heading font-bold text-lg uppercase tracking-tight-heading">Upcoming</h2>
                                {upcoming.length > 0 && (
                                    <span className="ml-2 bg-green-50 text-green-700 text-[9px] font-data font-bold px-2 py-0.5 rounded-full uppercase">
                                        {upcoming.length} Active
                                    </span>
                                )}
                            </div>
                            {upcoming.length > 0 ? (
                                <div className="ev-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {upcoming.map(event => renderEventCard(event, false))}
                                </div>
                            ) : (
                                <div className="py-16 text-center font-data text-sm text-brutal-dark/30 border border-dashed border-brutal-dark/10 rounded-2xl">
                                    <Icon size={32} className="mx-auto mb-3 text-brutal-dark/10" />
                                    No upcoming {config.label.toLowerCase()} scheduled yet.
                                </div>
                            )}
                        </section>

                        {/* Past Events */}
                        {past.length > 0 && (
                            <section className="bg-brutal-dark/[0.02] -mx-6 md:-mx-12 lg:-mx-24 px-6 md:px-12 lg:px-24 py-10 border-y border-brutal-dark/8">
                                <div className="flex items-center gap-3 mb-6">
                                    <span className="font-data text-[10px] text-brutal-dark/30 font-bold uppercase tracking-widest">02</span>
                                    <h2 className="font-heading font-bold text-lg uppercase tracking-tight-heading text-brutal-dark/50">Past {config.label}</h2>
                                </div>
                                {activeTab === 'tech_tuesday' ? (
                                    <div className="flex gap-4 overflow-x-auto pb-4 snap-x">
                                        {past.map((event: any) => (
                                            <Link key={event.id} to={`/events/${event.id}`} className="snap-start shrink-0 w-72 group">
                                                <div className="p-4 bg-brutal-bg border border-brutal-dark/10 rounded-xl group-hover:border-brutal-red/30 transition-colors h-full flex flex-col justify-between">
                                                    <div>
                                                        <span className="font-data text-[10px] font-bold uppercase text-brutal-dark/35 block mb-1">
                                                            {new Date(event.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                        </span>
                                                        <h4 className="font-heading font-bold text-base leading-tight mb-2 line-clamp-2">{event.title}</h4>
                                                    </div>
                                                    <span className="font-data text-[10px] font-bold uppercase text-brutal-red flex items-center gap-1 mt-3">
                                                        View Learnings <ArrowRight size={10} className="group-hover:translate-x-1 transition-transform" />
                                                    </span>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                                        {past.map(event => renderEventCard(event, true))}
                                    </div>
                                )}
                            </section>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
