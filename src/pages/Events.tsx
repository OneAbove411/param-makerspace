import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useEvents } from '../lib/hooks';
import { Link, useSearchParams } from 'react-router';
import { Calendar, Sparkles, ArrowRight } from 'lucide-react';
import type { Event } from '../lib/database.types';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { cn } from '../lib/utils';
import { EventCard } from '../components/event/EventCard';
import { ListingLayout } from '../components/shared/ListingLayout';
import { ListingSidebar } from '../components/shared/ListingSidebar';
import { SidebarSearch } from '../components/shared/SidebarSearch';
import { SidebarChipGroup, type ChipOption } from '../components/shared/SidebarChipGroup';
import { MobileFilterBar } from '../components/shared/MobileFilterBar';
import { zeroCTA } from '../lib/zeroCTA';
import { AdminEventActions } from '../components/events/AdminEventActions';
import { EventsSidebarNudge } from '../components/events/EventsSidebarNudge';

gsap.registerPlugin(ScrollTrigger);

// ─────────────────────────────────────────────────────────────
// §8.c Ecosystem Events — SPEC.md sidebar refactor.
//
// Goals:
//   • Replace horizontal category pill bar with sidebar SidebarChipGroup
//   • Add SidebarSearch (events had no search before)
//   • Add time filter (Upcoming / Past / All) via SidebarChipGroup
//   • Replace EventRow / PastMasonryCard with EventCard in a CSS Grid
//   • Add GamificationNudge to sidebar
//   • Add MobileFilterBar for mobile
//   • ALL hook wiring preserved: useEvents, split logic, counts, groupedUpcoming
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
        icon: Sparkles,
        description: 'Connect, showcase, learn in open-floor sessions.',
    },
    build_challenge: {
        label: 'Build Challenges',
        shortLabel: 'Challenges',
        icon: Sparkles,
        description: 'Compete, build, push limits in structured sprints.',
    },
    tech_tuesday: {
        label: 'Tech Tuesday',
        shortLabel: 'Tech Tue',
        icon: Sparkles,
        description: 'Weekly knowledge drops — RSVP, join, learn.',
    },
} as const;

type CategoryKey = keyof typeof CATEGORY_CONFIG;

type TimeFilter = 'all' | 'upcoming' | 'past';

// ─── Skeleton card placeholder (Luma-style shimmer) ─────────
function EventCardSkeleton() {
    return (
        <div className="animate-pulse rounded-xl overflow-hidden bg-brutal-dark/[0.06] aspect-[3/4] relative">
            <div className="absolute inset-0 bg-gradient-to-t from-brutal-dark/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5 space-y-2.5">
                <div className="h-2.5 w-24 bg-brutal-dark/[0.08] rounded-full" />
                <div className="h-4 w-4/5 bg-brutal-dark/[0.08] rounded-full" />
                <div className="h-3 w-1/2 bg-brutal-dark/[0.05] rounded-full" />
            </div>
        </div>
    );
}

// ─── Featured "Next Up" event hero ──────────────────────────
function FeaturedEventBanner({ event }: { event: EventListItem }) {
    const date = new Date(event.date);
    const month = date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    const day = date.getDate();
    const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });

    return (
        <Link to={`/events/${event.id}`} className="group block mb-8">
            <div className="relative overflow-hidden rounded-xl bg-brutal-dark h-[220px] md:h-[260px]">
                {/* Background image */}
                {event.cover_image_url && (
                    <img
                        src={event.cover_image_url}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-50 group-hover:scale-105 transition-all duration-700"
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-r from-brutal-dark via-brutal-dark/80 to-transparent" />

                {/* Content */}
                <div className="relative z-10 flex items-center h-full px-6 md:px-10 gap-6 md:gap-8">
                    {/* Luma-style calendar date block */}
                    <div className="flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 flex flex-col items-center justify-center">
                        <span className="font-data text-[10px] font-bold uppercase tracking-wider text-brutal-red">{month}</span>
                        <span className="font-heading text-2xl md:text-3xl font-bold text-white leading-none">{day}</span>
                    </div>

                    {/* Event info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="bg-brutal-red text-white font-data text-[9px] font-bold uppercase tracking-[0.14em] px-2 py-0.5 rounded-full">
                                Next Up
                            </span>
                            <span className="font-data text-[10px] font-bold uppercase tracking-wider text-white/40">
                                {formatEventType(event.event_type)}
                            </span>
                        </div>
                        <h2 className="font-heading font-bold text-xl md:text-2xl text-white leading-tight line-clamp-2 mb-2 group-hover:text-brutal-red/90 transition-colors">
                            {event.title}
                        </h2>
                        <div className="flex items-center gap-4 flex-wrap">
                            <span className="flex items-center gap-1.5 font-body text-[12px] text-white/50">
                                <Calendar size={12} className="text-white/30" />
                                {weekday}, {month.charAt(0) + month.slice(1).toLowerCase()} {day} · {time}
                            </span>
                            {event.location && !event.location.startsWith('rsvp:') && (
                                <span className="flex items-center gap-1.5 font-body text-[12px] text-white/50">
                                    <span className="text-white/30">·</span>
                                    {event.location}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Arrow */}
                    <div className="hidden md:flex flex-shrink-0 w-10 h-10 rounded-full bg-white/5 items-center justify-center group-hover:bg-brutal-red/20 transition-colors">
                        <ArrowRight size={16} className="text-white/60 group-hover:text-brutal-red transition-colors" />
                    </div>
                </div>
            </div>
        </Link>
    );
}

type EventListItem = Event & { registration_count: number };

export function Events() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
    const { data: events, loading } = useEvents();
    const pageRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    // ─── URL state parsing ────────────────────────────────────
    const activeTab = (searchParams.get('cat') as CategoryKey) || 'all';
    const timeFilter = (searchParams.get('when') as TimeFilter) || 'upcoming';
    const searchQuery = searchParams.get('q') || '';

    const updateParams = useCallback(
        (mutator: (p: URLSearchParams) => void) => {
            const p = new URLSearchParams(searchParams);
            mutator(p);
            setSearchParams(p, { replace: true });
        },
        [searchParams, setSearchParams]
    );

    const setActiveTab = (cat: CategoryKey) =>
        updateParams((p) => {
            if (cat === 'all') p.delete('cat');
            else p.set('cat', cat);
        });

    const setTimeFilter = (when: TimeFilter) =>
        updateParams((p) => {
            if (when === 'upcoming') p.delete('when');
            else p.set('when', when);
        });

    const setSearchQuery = (q: string) =>
        updateParams((p) => {
            if (!q) p.delete('q');
            else p.set('q', q);
        });

    // ─── Categorize (preserved from original) ─────────────────
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

    // Counts per category (preserved from original)
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

    // Category chip options for sidebar (Directive 2C: hide empty categories)
    const categoryChipOptions = useMemo<ChipOption[]>(() => {
        return (['maker_meetup', 'build_challenge', 'tech_tuesday'] as const).map(cat => ({
            value: cat,
            label: CATEGORY_CONFIG[cat].shortLabel,
            count: counts[cat].total,
        }));
    }, [counts]);

    // Time filter chip options
    const timeChipOptions = useMemo<ChipOption[]>(() => [
        { value: 'upcoming', label: 'Upcoming', count: split.upcoming.length },
        { value: 'past', label: 'Past', count: split.past.length },
        { value: 'all', label: 'All', count: split.all.length },
    ], [split]);

    // Filter by category
    const filteredByCategory = useMemo(() => {
        const base = timeFilter === 'upcoming' ? split.upcoming
            : timeFilter === 'past' ? split.past
            : split.all;
        if (activeTab === 'all') return base;
        return base.filter(e => e.event_type === activeTab);
    }, [activeTab, timeFilter, split]);

    // Filter by search query
    const filteredEvents = useMemo(() => {
        if (!searchQuery.trim()) return filteredByCategory;
        const q = searchQuery.toLowerCase();
        return filteredByCategory.filter(e =>
            e.title.toLowerCase().includes(q) ||
            (e.tagline && e.tagline.toLowerCase().includes(q)) ||
            formatEventType(e.event_type).toLowerCase().includes(q) ||
            (e.location && e.location.toLowerCase().includes(q))
        );
    }, [filteredByCategory, searchQuery]);

    // Determine isPast for each event
    const now = Date.now();

    // Featured = first upcoming in current filter set
    const featured = useMemo(() => {
        if (timeFilter === 'past') return null;
        return filteredEvents.find(e => new Date(e.date).getTime() >= now) || null;
    }, [filteredEvents, now, timeFilter]);

    const totalEvents = split.all.length;

    // ─── Animations (preserved from original) ─────────────────
    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.fromTo('.ev-hero-text',
                { y: 20, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.5, stagger: 0.06, ease: 'power3.out' }
            );
        }, pageRef);
        return () => ctx.revert();
    }, []);

    useEffect(() => {
        if (loading || !events?.length) return;
        const ctx = gsap.context(() => {
            gsap.fromTo('.ev-card',
                { y: 16, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.4, stagger: 0.035, ease: 'power3.out' }
            );
        }, contentRef);
        return () => ctx.revert();
    }, [loading, events?.length, activeTab, timeFilter, searchQuery]);

    // ─── Sidebar category handler ────────────────────────────
    const handleCategoryChange = (next: string[]) => {
        // Single-select: pick the one value, or fall back to 'all'
        setActiveTab(next.length > 0 ? (next[0] as CategoryKey) : 'all');
    };

    const handleTimeChange = (next: string[]) => {
        setTimeFilter(next.length > 0 ? (next[0] as TimeFilter) : 'upcoming');
    };

    // ─── Mobile filter sheet (simple inline panel) ────────────
    const MobileFilterPanel = () => {
        if (!mobileFiltersOpen) return null;
        return (
            <div className="lg:hidden px-4 py-4 border-b-2 border-brutal-dark/10 bg-brutal-bg space-y-4">
                <SidebarChipGroup
                    label="Category"
                    options={categoryChipOptions}
                    selected={activeTab === 'all' ? [] : [activeTab]}
                    onChange={handleCategoryChange}
                    singleSelect
                />
                <SidebarChipGroup
                    label="When"
                    options={timeChipOptions}
                    selected={[timeFilter]}
                    onChange={handleTimeChange}
                    singleSelect
                />
            </div>
        );
    };

    // ─── Sidebar content ─────────────────────────────────────
    const sidebar = (
        <ListingSidebar>
            <SidebarSearch
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search events..."
            />
            <SidebarChipGroup
                label="Category"
                options={categoryChipOptions}
                selected={activeTab === 'all' ? [] : [activeTab]}
                onChange={handleCategoryChange}
                singleSelect
            />
            <SidebarChipGroup
                label="When"
                options={timeChipOptions}
                selected={[timeFilter]}
                onChange={handleTimeChange}
                singleSelect
            />
            <EventsSidebarNudge nextEvent={split.upcoming[0] ?? null} />
        </ListingSidebar>
    );

    return (
        <div ref={pageRef} className="flex-1 w-full bg-brutal-bg min-h-screen pt-28 md:pt-32">
            <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-0">
                {/* ── PAGE HEADER ── */}
                <div className="px-0 lg:px-8 mb-6 md:mb-8">
                    <div className="flex items-end justify-between gap-4 flex-wrap">
                        <div>
                            <div className="ev-hero-text flex items-center gap-2 mb-3">
                                <span className="inline-block w-6 h-[3px] bg-brutal-red" aria-hidden />
                                <p className="font-data text-[10px] font-bold uppercase tracking-[0.25em] text-brutal-dark/60">
                                    Ecosystem Events
                                </p>
                            </div>
                            <h1 className="ev-hero-text font-heading font-bold text-3xl md:text-4xl uppercase tracking-tight-heading text-brutal-dark">
                                {totalEvents} happening{totalEvents === 1 ? '' : 's'}
                                <span className="text-brutal-dark/30"> · meet, build, learn</span>
                            </h1>
                            <p className="ev-hero-text font-data text-xs text-brutal-dark/55 mt-3 max-w-lg leading-relaxed">
                                Meetups, build sprints, and knowledge drops. Show up, plug in, make things happen.
                            </p>
                        </div>
                        {/* Mentor/admin shortcut — renders nothing for public visitors.
                            Intentionally not decorated with .ev-hero-text: the GSAP
                            animation leaves an inline transform on that class, which
                            creates a new stacking context and traps the dropdown menu
                            behind the event cards below. */}
                        <div>
                            <AdminEventActions />
                        </div>
                    </div>
                </div>

                {/* Mobile filter bar */}
                <MobileFilterBar
                    searchValue={searchQuery}
                    onSearch={setSearchQuery}
                    onOpenFilters={() => setMobileFiltersOpen(o => !o)}
                    placeholder="Search events..."
                />
                <MobileFilterPanel />

                <ListingLayout sidebar={sidebar}>
                    <div className="max-w-6xl">

                        {/* Active filter summary */}
                        {(activeTab !== 'all' || searchQuery) && (
                            <div className="flex items-center gap-2 mb-4 flex-wrap">
                                {activeTab !== 'all' && (
                                    <span className="inline-flex items-center gap-1.5 font-data text-[10px] font-bold uppercase tracking-wider bg-brutal-red/10 text-brutal-red border border-brutal-red/20 px-2.5 py-1 rounded-lg">
                                        {CATEGORY_CONFIG[activeTab].shortLabel}
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab('all')}
                                            className="ml-0.5 hover:text-brutal-dark"
                                            aria-label="Clear category filter"
                                        >
                                            ×
                                        </button>
                                    </span>
                                )}
                                {searchQuery && (
                                    <span className="inline-flex items-center gap-1.5 font-data text-[10px] font-bold tracking-wider bg-brutal-dark/5 text-brutal-dark/60 border border-brutal-dark/10 px-2.5 py-1 rounded-lg">
                                        "{searchQuery}"
                                        <button
                                            type="button"
                                            onClick={() => setSearchQuery('')}
                                            className="ml-0.5 hover:text-brutal-red"
                                            aria-label="Clear search"
                                        >
                                            ×
                                        </button>
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Content */}
                        <div ref={contentRef}>
                            {loading ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                    {[...Array(6)].map((_, i) => <EventCardSkeleton key={i} />)}
                                </div>
                            ) : filteredEvents.length === 0 ? (
                                <div className="py-16 text-center border border-brutal-dark/[0.06] rounded-xl bg-brutal-dark/[0.02]">
                                    <Calendar size={32} className="mx-auto mb-4 text-brutal-dark/10" />
                                    <p className="font-body text-sm text-brutal-dark/40 mb-1">
                                        {searchQuery
                                            ? `No events match "${searchQuery}".`
                                            : `No ${timeFilter === 'all' ? '' : timeFilter + ' '}${activeTab === 'all' ? 'events' : CATEGORY_CONFIG[activeTab].label.toLowerCase()} found.`
                                        }
                                    </p>
                                    <p className="font-body text-xs text-brutal-dark/30 mt-1">
                                        Have an idea? Propose one — talk to a mentor at the lab.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* Featured "Next Up" banner — only for upcoming view with no filters */}
                                    {featured && activeTab === 'all' && timeFilter === 'upcoming' && !searchQuery && (
                                        <FeaturedEventBanner event={featured} />
                                    )}

                                    {/* Event card grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                        {filteredEvents.map(event => (
                                            <div key={event.id} className="ev-card">
                                                <EventCard
                                                    event={event}
                                                    isPast={new Date(event.date).getTime() < now}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </ListingLayout>
            </div>

            {/* Mobile gamification nudge — events-flavored: surfaces the
                next upcoming event, falling back to /speak when empty. */}
            <EventsSidebarNudge variant="mobile-bar" nextEvent={split.upcoming[0] ?? null} />
        </div>
    );
}
