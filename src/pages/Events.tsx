import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useEvents } from '../lib/hooks';
import { Card } from '../components/ui/Card';
import { Link } from 'react-router-dom';
import { MapPin, Calendar, Users, ArrowRight, Wrench, Trophy, BookOpen, Clock, Flame, Sparkles } from 'lucide-react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { cn } from '../lib/utils';

gsap.registerPlugin(ScrollTrigger);

// ─────────────────────────────────────────────────────────────
// §8.c Ecosystem Events — Phase-3 "Low-scroll" redesign.
//
// Goals (driven by user brief + Luma / Meetup / Devpost research):
//   • Keep page heading identity: "N happenings · meet, build, learn"
//   • Shrink category bento tiles ≈50 %, turn them into stat+filter pills
//   • Add an [All] tile as default, supplying unified chronological feed
//   • Default feed = compact list grouped by "This Week / This Month / Later"
//   • Past events = compact masonry grid (no huge cards)
//   • Zero scroll fatigue: one screen should show filters + several events
//   • All hook wiring (useEvents) untouched
// ─────────────────────────────────────────────────────────────

export const formatEventType = (type: string) => ({
    build_challenge: 'Build Challenge',
    maker_meetup: 'Maker Meetup',
    tech_tuesday: 'Tech Tuesday',
    workshop: 'Workshop',
    hackathon: 'Hackathon',
    demo_day: 'Demo Day',
}[type] || type);

const CATEGORY_CONFIG = {
    all: {
        label: 'All Events',
        shortLabel: 'All',
        icon: Sparkles,
        description: 'Everything happening at the makerspace, in order.',
    },
    maker_meetup: {
        label: 'Maker Meetups',
        shortLabel: 'Meetups',
        icon: Wrench,
        description: 'Connect, showcase, learn in open-floor sessions.',
    },
    build_challenge: {
        label: 'Build Challenges',
        shortLabel: 'Challenges',
        icon: Trophy,
        description: 'Compete, build, push limits in structured sprints.',
    },
    tech_tuesday: {
        label: 'Tech Tuesday',
        shortLabel: 'Tech Tue',
        icon: BookOpen,
        description: 'Weekly knowledge drops — RSVP, join, learn.',
    },
} as const;

type CategoryKey = keyof typeof CATEGORY_CONFIG;
const CATEGORIES: CategoryKey[] = ['all', 'maker_meetup', 'build_challenge', 'tech_tuesday'];

// ─── Skeleton row (compact list row placeholder) ───────────────
function EventRowSkeleton() {
    return (
        <div className="animate-pulse flex items-center gap-4 p-3 border-2 border-brutal-dark/10 rounded-xl">
            <div className="w-16 h-16 bg-brutal-dark/5 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-2">
                <div className="h-3 w-16 bg-brutal-dark/8 rounded" />
                <div className="h-4 w-3/4 bg-brutal-dark/8 rounded" />
                <div className="h-3 w-1/2 bg-brutal-dark/5 rounded" />
            </div>
        </div>
    );
}

// ─── Countdown badge (unchanged logic, more compact) ───────────
function CountdownBadge({ date, variant = 'overlay' }: { date: string; variant?: 'overlay' | 'inline' }) {
    const now = new Date();
    const eventDate = new Date(date);
    const diff = eventDate.getTime() - now.getTime();
    if (diff <= 0) return null;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const label =
        days === 0 ? (hours <= 1 ? 'Now' : `${hours}h`) :
        days === 1 ? 'Tmrw' :
        days <= 7 ? `${days}d` :
        days <= 30 ? `${days}d` :
        `${Math.round(days / 7)}w`;

    if (variant === 'inline') {
        return (
            <span className="inline-flex items-center gap-1 font-data text-[10px] font-bold uppercase tracking-wider text-brutal-red">
                <Clock size={10} /> {label}
            </span>
        );
    }
    return (
        <span className="absolute top-2 right-2 bg-brutal-red text-brutal-bg text-[9px] font-data font-bold uppercase px-2 py-0.5 rounded flex items-center gap-1 z-10 tracking-wider">
            <Clock size={9} /> {label}
        </span>
    );
}

// ─── Bucket date helper ───────────────────────────────────────
function bucketOf(date: Date): 'today' | 'thisWeek' | 'thisMonth' | 'later' {
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    const sameDay = date.toDateString() === now.toDateString();
    if (sameDay) return 'today';
    if (diffDays <= 7) return 'thisWeek';
    if (diffDays <= 31) return 'thisMonth';
    return 'later';
}

const BUCKET_LABELS: Record<ReturnType<typeof bucketOf>, string> = {
    today: 'Today',
    thisWeek: 'This Week',
    thisMonth: 'This Month',
    later: 'Later',
};

export function Events() {
    const [activeTab, setActiveTab] = useState<CategoryKey>('all');
    const { data: events, loading } = useEvents();
    const pageRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    // ─── Categorize ────────────────────────────────────────────
    const split = useMemo(() => {
        const now = Date.now();
        const all = events || [];
        const upcoming = all
            .filter(e => new Date(e.date).getTime() >= now)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const past = all
            .filter(e => new Date(e.date).getTime() < now)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return { upcoming, past, all };
    }, [events]);

    // Counts per category tile
    const counts = useMemo(() => {
        const c: Record<CategoryKey, { upcoming: number; total: number }> = {
            all: { upcoming: split.upcoming.length, total: split.all.length },
            maker_meetup: { upcoming: 0, total: 0 },
            build_challenge: { upcoming: 0, total: 0 },
            tech_tuesday: { upcoming: 0, total: 0 },
        };
        split.all.forEach(e => {
            const k = e.event_type as CategoryKey;
            if (c[k]) c[k].total += 1;
        });
        split.upcoming.forEach(e => {
            const k = e.event_type as CategoryKey;
            if (c[k]) c[k].upcoming += 1;
        });
        return c;
    }, [split]);

    // Filtered by active tab
    const filteredUpcoming = useMemo(() =>
        activeTab === 'all' ? split.upcoming : split.upcoming.filter(e => e.event_type === activeTab)
    , [activeTab, split]);

    const filteredPast = useMemo(() =>
        activeTab === 'all' ? split.past : split.past.filter(e => e.event_type === activeTab)
    , [activeTab, split]);

    // Group upcoming by time bucket (chronological)
    const groupedUpcoming = useMemo(() => {
        const groups: Record<string, any[]> = { today: [], thisWeek: [], thisMonth: [], later: [] };
        filteredUpcoming.forEach(e => {
            const b = bucketOf(new Date(e.date));
            groups[b].push(e);
        });
        return groups;
    }, [filteredUpcoming]);

    // Featured = first upcoming
    const featured = filteredUpcoming[0] || null;

    // ─── Animations ────────────────────────────────────────────
    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.fromTo('.ev-hero-text',
                { y: 20, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.5, stagger: 0.06, ease: 'power3.out' }
            );
            gsap.fromTo('.ev-pill',
                { y: 16, opacity: 0 },
                {
                    y: 0, opacity: 1, duration: 0.45, stagger: 0.05, ease: 'power3.out',
                    scrollTrigger: { trigger: '.ev-pill-row', start: 'top 92%' },
                }
            );
        }, pageRef);
        return () => ctx.revert();
    }, []);

    useEffect(() => {
        if (loading || !events?.length) return;
        const ctx = gsap.context(() => {
            gsap.fromTo('.ev-row',
                { y: 16, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.4, stagger: 0.035, ease: 'power3.out' }
            );
        }, contentRef);
        return () => ctx.revert();
    }, [loading, events?.length, activeTab]);

    // ─── Featured strip (small hero — only when events exist) ───
    const FeaturedStrip = ({ event }: { event: any }) => {
        const date = new Date(event.date);
        const capacityRemaining = event.capacity ? event.capacity - event.registration_count : null;
        const Icon = CATEGORY_CONFIG[event.event_type as CategoryKey]?.icon || Sparkles;
        return (
            <Link
                to={`/events/${event.id}`}
                className="ev-featured block group focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brutal-red rounded-2xl"
            >
                <Card className={cn(
                    'overflow-hidden flex flex-col md:flex-row',
                    'border-2 border-brutal-red/40',
                    'shadow-[8px_8px_0_0_rgba(196,41,30,0.22)]',
                    'transition-all duration-300',
                    'hover:shadow-[10px_10px_0_0_rgba(196,41,30,0.32)] hover:border-brutal-red/60',
                )}>
                    {/* Cover — fixed shorter height */}
                    <div className="relative md:w-[38%] md:flex-shrink-0 md:min-h-[180px] overflow-hidden bg-brutal-dark">
                        {event.cover_image_url ? (
                            <img
                                src={event.cover_image_url}
                                alt={event.title}
                                loading="lazy"
                                className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-[1.03] transition-all duration-500 ease-out"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center" style={{
                                backgroundImage: 'radial-gradient(circle, rgba(245,243,238,0.08) 1px, transparent 1px)',
                                backgroundSize: '24px 24px',
                            }}>
                                <Icon size={48} className="text-brutal-bg/15" />
                            </div>
                        )}
                        <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-brutal-dark/60 to-transparent pointer-events-none" />
                        <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 bg-brutal-red text-brutal-bg font-data text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full shadow-[2px_2px_0_0_rgba(0,0,0,0.15)]">
                            <Flame size={10} aria-hidden /> Next Up
                        </span>
                        <CountdownBadge date={event.date} />
                        <div className="block md:hidden pb-[48%]" aria-hidden />
                    </div>

                    {/* Body — compact */}
                    <div className="flex-1 p-5 md:p-6 flex flex-col gap-2.5 min-w-0">
                        <span className="font-data text-[10px] font-bold uppercase tracking-widest text-brutal-red">
                            #{formatEventType(event.event_type)}
                        </span>
                        <h3 className="font-drama italic text-2xl md:text-3xl leading-[1] text-brutal-dark tracking-tight-heading line-clamp-2 group-hover:text-brutal-red transition-colors">
                            {event.title}
                        </h3>
                        {event.tagline && (
                            <p className="font-data text-xs text-brutal-dark/60 leading-snug line-clamp-1">{event.tagline}</p>
                        )}

                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                            <div className="flex items-center gap-1.5 font-data text-[11px] text-brutal-dark/70">
                                <Calendar size={12} className="text-brutal-red flex-shrink-0" />
                                {date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            {event.location && !event.location.startsWith('rsvp:') && (
                                <div className="flex items-center gap-1.5 font-data text-[11px] text-brutal-dark/70">
                                    <MapPin size={12} className="text-brutal-red flex-shrink-0" />
                                    <span className="line-clamp-1">{event.location}</span>
                                </div>
                            )}
                            <div className="flex items-center gap-1.5 font-data text-[11px] font-bold tabular-nums text-brutal-dark/55">
                                <Users size={12} />
                                {capacityRemaining !== null
                                    ? (capacityRemaining > 0 ? `${capacityRemaining} spots` : 'Full')
                                    : `${event.registration_count} in`}
                            </div>
                        </div>

                        <div className="flex items-center justify-between gap-3 mt-auto pt-2">
                            {event.registration_status === 'open' && (capacityRemaining === null || capacityRemaining > 0) ? (
                                <span className="font-data text-[10px] font-bold uppercase tracking-wider text-green-700 bg-green-50 border border-green-200 px-2.5 py-0.5 rounded-full">Registration Open</span>
                            ) : <span />}
                            <span className="font-data text-[10px] font-bold uppercase tracking-wider text-brutal-red flex items-center gap-1 group-hover:gap-2 transition-all">
                                View event <ArrowRight size={11} />
                            </span>
                        </div>
                    </div>
                </Card>
            </Link>
        );
    };

    // ─── Compact list row (the core low-scroll component) ──────
    const EventListRow = ({ event, isPast }: { event: any; isPast: boolean }) => {
        const date = new Date(event.date);
        const capacityRemaining = event.capacity ? event.capacity - event.registration_count : null;
        const Icon = CATEGORY_CONFIG[event.event_type as CategoryKey]?.icon || Sparkles;

        return (
            <Link
                to={`/events/${event.id}`}
                className={cn(
                    'ev-row group block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brutal-red',
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

                    {/* Thumbnail — small, present when image exists */}
                    <div className="flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden border border-brutal-dark/10 bg-brutal-dark hidden sm:block relative">
                        {event.cover_image_url ? (
                            <img
                                src={event.cover_image_url}
                                alt=""
                                loading="lazy"
                                className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-500"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <Icon size={22} className="text-brutal-bg/30" />
                            </div>
                        )}
                    </div>

                    {/* Main text block */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-red">
                                #{formatEventType(event.event_type)}
                            </span>
                            {!isPast && <CountdownBadge date={event.date} variant="inline" />}
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
    };

    // ─── Past masonry card (compact) ───────────────────────────
    const PastMasonryCard = ({ event }: { event: any }) => {
        const date = new Date(event.date);
        const Icon = CATEGORY_CONFIG[event.event_type as CategoryKey]?.icon || Sparkles;
        return (
            <Link
                to={`/events/${event.id}`}
                className="ev-row group block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brutal-red"
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
                            <div className="w-full h-full flex items-center justify-center">
                                <Icon size={30} className="text-brutal-bg/20" />
                            </div>
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
    };

    const totalEvents = split.all.length;

    return (
        <div ref={pageRef} className="flex-1 w-full bg-brutal-bg pt-28 md:pt-32 px-6 md:px-12 lg:px-24 min-h-screen">
            <div className="max-w-7xl mx-auto">
                {/* PAGE IDENTITY — HEADING STAYS */}
                <div className="flex items-end justify-between mb-5 md:mb-6">
                    <div>
                        <p className="ev-hero-text font-data text-[10px] font-bold uppercase tracking-[0.25em] text-brutal-dark/50 mb-2">
                            Ecosystem Events
                        </p>
                        <h1 className="ev-hero-text font-heading font-bold text-3xl md:text-4xl uppercase tracking-tight-heading text-brutal-dark">
                            {totalEvents} happening{totalEvents === 1 ? '' : 's'}
                            <span className="text-brutal-dark/30"> · meet, build, learn</span>
                        </h1>
                    </div>
                </div>

                {/* SHRUNKEN CATEGORY PILL TILES — doubles as filter + stat */}
                <div
                    role="tablist"
                    aria-label="Filter events by category"
                    className="ev-pill-row grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4 mb-8"
                >
                    {CATEGORIES.map((cat) => {
                        const c = CATEGORY_CONFIG[cat];
                        const CatIcon = c.icon;
                        const { upcoming: up, total } = counts[cat];
                        const isActive = activeTab === cat;

                        return (
                            <button
                                key={cat}
                                type="button"
                                role="tab"
                                aria-selected={isActive}
                                onClick={() => setActiveTab(cat)}
                                aria-label={`${c.label}: ${total} total, ${up} upcoming. ${isActive ? 'Active filter.' : 'Click to filter.'}`}
                                className={cn(
                                    'ev-pill group relative rounded-xl text-left p-3 md:p-3.5',
                                    'border-2',
                                    'transition-all duration-150 ease-out',
                                    'hover:translate-x-[-2px] hover:translate-y-[-2px]',
                                    'motion-reduce:hover:translate-x-0 motion-reduce:hover:translate-y-0 motion-reduce:transition-none',
                                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brutal-red',
                                    'flex flex-col gap-1.5',
                                    isActive
                                        ? 'bg-brutal-dark text-brutal-bg border-brutal-dark shadow-[5px_5px_0_0_rgba(196,41,30,0.9)] hover:shadow-[7px_7px_0_0_rgba(196,41,30,1)]'
                                        : 'bg-brutal-bg border-brutal-dark/15 shadow-[5px_5px_0_0_rgba(196,41,30,0.15)] hover:shadow-[7px_7px_0_0_rgba(196,41,30,0.25)] hover:border-brutal-red/40',
                                )}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <CatIcon
                                            className={cn('w-4 h-4 flex-shrink-0', isActive ? 'text-brutal-bg/80' : 'text-brutal-red')}
                                            aria-hidden
                                        />
                                        <span className={cn(
                                            'font-heading font-bold text-[13px] md:text-sm uppercase tracking-tight-heading leading-none truncate',
                                            isActive ? 'text-brutal-bg' : 'text-brutal-dark',
                                        )}>
                                            {c.shortLabel}
                                        </span>
                                    </div>
                                    <span className={cn(
                                        'font-heading font-bold text-xl md:text-2xl tabular-nums leading-none',
                                        isActive ? 'text-brutal-bg' : 'text-brutal-dark',
                                    )}>
                                        {total}
                                    </span>
                                </div>
                                <div className={cn(
                                    'font-data text-[10px] font-bold uppercase tracking-widest',
                                    isActive ? 'text-brutal-bg/65' : 'text-brutal-dark/55',
                                )}>
                                    {up > 0 ? `${up} upcoming` : 'No upcoming'}
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Content */}
                <div ref={contentRef} className="pb-24">
                    {loading ? (
                        <div className="space-y-3">
                            {[...Array(6)].map((_, i) => <EventRowSkeleton key={i} />)}
                        </div>
                    ) : (
                        <div className="space-y-12">
                            {/* ── UPCOMING ─────────────────────────────── */}
                            <section>
                                <div className="flex items-center gap-3 mb-5">
                                    <span className="font-data text-[10px] text-brutal-dark/30 font-bold uppercase tracking-widest">01</span>
                                    <h2 className="font-heading font-bold text-base md:text-lg uppercase tracking-tight-heading">
                                        Upcoming{activeTab !== 'all' ? ` · ${CATEGORY_CONFIG[activeTab].label}` : ''}
                                    </h2>
                                    {filteredUpcoming.length > 0 && (
                                        <span className="bg-green-50 text-green-700 border border-green-200 text-[9px] font-data font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                            {filteredUpcoming.length} Active
                                        </span>
                                    )}
                                </div>

                                {filteredUpcoming.length > 0 ? (
                                    <div className="space-y-6">
                                        {/* Featured strip (small) */}
                                        {featured && <FeaturedStrip event={featured} />}

                                        {/* Grouped chronological list (excluding the featured one) */}
                                        <div className="space-y-5">
                                            {(['today', 'thisWeek', 'thisMonth', 'later'] as const).map(bucket => {
                                                const items = (groupedUpcoming[bucket] || []).filter(e => e.id !== featured?.id);
                                                if (items.length === 0) return null;
                                                return (
                                                    <div key={bucket}>
                                                        <div className="flex items-center gap-2 mb-2.5">
                                                            <span className="font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/45">
                                                                {BUCKET_LABELS[bucket]}
                                                            </span>
                                                            <span className="flex-1 h-px bg-brutal-dark/10" />
                                                            <span className="font-data text-[9px] font-bold text-brutal-dark/35 tabular-nums">
                                                                {items.length}
                                                            </span>
                                                        </div>
                                                        <div className="space-y-2.5">
                                                            {items.map(e => (
                                                                <EventListRow key={e.id} event={e} isPast={false} />
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="py-12 text-center font-data text-sm text-brutal-dark/40 border-2 border-dashed border-brutal-dark/10 rounded-2xl">
                                        <Calendar size={28} className="mx-auto mb-3 text-brutal-dark/15" />
                                        <p className="mb-1">
                                            No upcoming {activeTab === 'all' ? 'events' : CATEGORY_CONFIG[activeTab].label.toLowerCase()} scheduled.
                                        </p>
                                        <p className="font-data text-[11px] text-brutal-dark/35">
                                            Have an idea? Propose one — talk to a mentor at the lab.
                                        </p>
                                    </div>
                                )}
                            </section>

                            {/* ── PAST ─────────────────────────────────── */}
                            {filteredPast.length > 0 && (
                                <section>
                                    <div className="flex items-center gap-3 mb-5">
                                        <span className="font-data text-[10px] text-brutal-dark/30 font-bold uppercase tracking-widest">02</span>
                                        <h2 className="font-heading font-bold text-base md:text-lg uppercase tracking-tight-heading text-brutal-dark/60">
                                            Past {activeTab !== 'all' ? CATEGORY_CONFIG[activeTab].label : 'Events'}
                                        </h2>
                                        <span className="bg-brutal-dark/5 text-brutal-dark/50 border border-brutal-dark/10 text-[9px] font-data font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                            {filteredPast.length}
                                        </span>
                                    </div>
                                    {/* Compact masonry grid */}
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
                                        {filteredPast.map(event => (
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
