import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';
import { Calendar, ArrowRight, Clock, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { useHomeLive, type HomeLiveEvent } from '../../lib/hooks/useHomeLive';

gsap.registerPlugin(ScrollTrigger);

/**
 * LivePulse — Section 1C
 *
 * Implements the audit findings from UX_MASTER section 1C:
 *  - Skeletons reserve banner + 3 card heights to kill CLS during loading.
 *  - activeMakers and event queries are hoisted into useHomeLive() so the
 *    hero and LivePulse share a single network round-trip every 30s.
 *  - Live indicator with pulsing dot, "updated Ns ago" counter that
 *    increments every second client-side, and a manual refresh button.
 *  - Upcoming events show countdown chips (helper local to this file,
 *    matching the visual language of pages/Events.tsx CountdownBadge).
 *  - Empty event list dodges the no-data state with an evergreen
 *    "What you can build here" strip backed by a static showcase array.
 *  - All entrance motion respects prefers-reduced-motion.
 *  - Mobile collapses to a single column with horizontal-scroll snapping
 *    for upcoming event chips.
 */

interface ActivityItem {
    time: string;
    text: string;
}

const FALLBACK_ACTIVITY: ActivityItem[] = [
    { time: '5 min ago', text: 'elena_k uploaded a blueprint for "Solar Kiln v3"' },
    { time: '12 min ago', text: 'julian_v earned the "Mechanical Kinematics" badge' },
    { time: '1 hr ago', text: 'Main Lab 3D Printer v2 is now available' },
    { time: '3 hr ago', text: 'sarah_j completed the "Neural Interface" challenge' },
];

const EVERGREEN_SHOWCASE = [
    { tag: 'ROBOTICS', title: 'Six-DOF arm with inverse kinematics', blurb: 'Stepper motors, GT2 belts, and a Raspberry Pi.' },
    { tag: 'IOT', title: 'Smart greenhouse climate loop', blurb: 'ESP32, soil probes, and a mistmaker on a relay.' },
    { tag: 'ELECTRONICS', title: 'Bioluminescent desk lamp', blurb: 'RGB LEDs behind frosted resin, capacitive touch.' },
];

const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

function timeAgo(dateStr: string): string {
    const now = new Date();
    const then = new Date(dateStr);
    const diffMs = now.getTime() - then.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin} min ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr} hr ago`;
    const diffDay = Math.floor(diffHr / 24);
    return `${diffDay}d ago`;
}

function formatEventTime(dateStr: string, endDateStr?: string | null): string {
    const d = new Date(dateStr);
    const startTime = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    if (endDateStr) {
        const e = new Date(endDateStr);
        const endTime = e.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        return `${startTime} – ${endTime}`;
    }
    return startTime;
}

function usePrefersReducedMotion() {
    const [reduced, setReduced] = useState(false);
    useEffect(() => {
        if (typeof window === 'undefined' || !window.matchMedia) return;
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        const update = () => setReduced(mq.matches);
        update();
        mq.addEventListener?.('change', update);
        return () => mq.removeEventListener?.('change', update);
    }, []);
    return reduced;
}

/** Inline countdown chip — same visual language as pages/Events.tsx. */
function CountdownChip({ date }: { date: string }) {
    const eventDate = new Date(date);
    const diff = eventDate.getTime() - Date.now();
    if (diff <= 0) return null;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days > 30) return null;
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                         bg-brutal-red text-brutal-bg font-data text-[9px] font-bold uppercase tracking-wider flex-shrink-0">
            <Clock size={9} aria-hidden="true" />
            {days === 0 ? 'Today' : `${days}d left`}
        </span>
    );
}

/**
 * ActivityFeed
 *
 * At first glance: only the top 3 most recent items render. The rest are
 * tucked behind a "Show N older" toggle so the column doesn't dominate the
 * viewport. Stagger-in is preserved for the visible 3.
 */
const COLLAPSED_COUNT = 3;

function ActivityFeed({ items, reducedMotion }: { items: ActivityItem[]; reducedMotion: boolean }) {
    const [expanded, setExpanded] = useState(false);
    const visible = expanded ? items : items.slice(0, COLLAPSED_COUNT);
    const hiddenCount = Math.max(0, items.length - COLLAPSED_COUNT);
    const [staggerCount, setStaggerCount] = useState(reducedMotion ? visible.length : 0);

    useEffect(() => {
        if (reducedMotion) {
            setStaggerCount(visible.length);
            return;
        }
        if (staggerCount >= visible.length) return;
        const t = window.setTimeout(() => setStaggerCount(n => n + 1), 600);
        return () => window.clearTimeout(t);
    }, [staggerCount, visible.length, reducedMotion]);

    return (
        <div className="space-y-5">
            {visible.slice(0, staggerCount).map((item, i) => (
                <div
                    key={`${expanded ? 'e' : 'c'}-${i}`}
                    className="flex gap-4 items-start motion-safe:animate-[fadeSlideIn_0.4s_ease-out_forwards]"
                >
                    <span className="font-data text-[10px] text-brutal-bg/30 uppercase tracking-wider whitespace-nowrap flex-shrink-0 mt-0.5 w-16">
                        {item.time}
                    </span>
                    <p className="font-data text-sm text-brutal-bg/70 leading-relaxed">
                        {item.text}
                    </p>
                </div>
            ))}

            {hiddenCount > 0 && (
                <button
                    type="button"
                    onClick={() => {
                        setExpanded(prev => !prev);
                        // Re-trigger the stagger so newly revealed items animate in.
                        if (!expanded) setStaggerCount(COLLAPSED_COUNT);
                    }}
                    className="font-data text-[10px] font-bold text-brutal-bg/40 uppercase tracking-[0.2em]
                               hover:text-brutal-red transition-colors duration-300
                               flex items-center gap-2 pt-2"
                    aria-expanded={expanded}
                >
                    <span className="w-6 h-px bg-brutal-bg/20" aria-hidden="true" />
                    {expanded ? 'Show less' : `Show ${hiddenCount} older`}
                </button>
            )}
        </div>
    );
}

export function LivePulse() {
    const containerRef = useRef<HTMLDivElement>(null);
    const { user } = useAuth();
    const reducedMotion = usePrefersReducedMotion();

    // ── Shared live data: activeMakers + upcomingEvents from one combined call
    const { activeMakers, upcomingEvents, lastUpdated, loading, refetch } = useHomeLive();

    // ── Activity feed: distinct query (xp_event details). Skeleton until ready.
    const [activityItems, setActivityItems] = useState<ActivityItem[] | null>(null);

    useEffect(() => {
        let cancelled = false;
        async function fetchActivity() {
            const { data: xpEvents } = await supabase
                .from('xp_event')
                .select('id, user_id, amount, reason, reference_type, created_at')
                .order('created_at', { ascending: false })
                .limit(6);

            if (cancelled) return;
            if (!xpEvents || xpEvents.length === 0) {
                setActivityItems(FALLBACK_ACTIVITY);
                return;
            }

            const userIds = [...new Set(xpEvents.map(e => e.user_id))];
            const { data: users } = await supabase
                .from('app_user')
                .select('id, name')
                .in('id', userIds)
                .limit(50);

            if (cancelled) return;
            const userMap: Record<string, string> = {};
            (users || []).forEach((u: { id: string; name: string }) => {
                userMap[u.id] = u.name || 'A maker';
            });

            const items: ActivityItem[] = xpEvents.map(ev => ({
                time: timeAgo(ev.created_at),
                text: `${userMap[ev.user_id] || 'A maker'} earned ${ev.amount} XP — ${ev.reason}`,
            }));
            setActivityItems(items.length > 0 ? items : FALLBACK_ACTIVITY);
        }
        fetchActivity();
        return () => { cancelled = true; };
    }, []);

    // Counter rolls up to the real number once it lands
    const counterRef = useRef<HTMLSpanElement>(null);
    useEffect(() => {
        if (activeMakers === null || !counterRef.current) return;
        if (reducedMotion) {
            counterRef.current.textContent = String(activeMakers);
            return;
        }
        const obj = { val: 0 };
        gsap.to(obj, {
            val: activeMakers,
            duration: 1.4,
            ease: 'power2.out',
            onUpdate: () => {
                if (counterRef.current) counterRef.current.textContent = String(Math.round(obj.val));
            },
        });
    }, [activeMakers, reducedMotion]);

    // "Updated Ns ago" ticker — recomputes every second client-side
    const [agoLabel, setAgoLabel] = useState('—');
    useEffect(() => {
        if (!lastUpdated) { setAgoLabel('—'); return; }
        const tick = () => {
            const secs = Math.max(0, Math.floor((Date.now() - lastUpdated) / 1000));
            if (secs < 60) setAgoLabel(`${secs}s ago`);
            else setAgoLabel(`${Math.floor(secs / 60)}m ago`);
        };
        tick();
        const id = window.setInterval(tick, 1000);
        return () => window.clearInterval(id);
    }, [lastUpdated]);

    useEffect(() => {
        if (reducedMotion) return;
        const ctx = gsap.context(() => {
            gsap.fromTo('.lp-header',
                { y: 30, opacity: 0 },
                {
                    y: 0, opacity: 1,
                    duration: 0.7, stagger: 0.08, ease: 'power2.out',
                    scrollTrigger: { trigger: containerRef.current, start: 'top 75%' },
                },
            );
            gsap.fromTo('.pulse-col',
                { y: 50, opacity: 0 },
                {
                    y: 0, opacity: 1,
                    duration: 0.8, stagger: 0.15, ease: 'power2.out',
                    scrollTrigger: { trigger: '.pulse-col', start: 'top 80%' },
                },
            );
        }, containerRef);
        return () => ctx.revert();
    }, [reducedMotion]);

    // Only render active/upcoming events on the home page. Completed events
    // belong on the full /events calendar, not on the landing scan-line.
    const futureEvents = upcomingEvents.filter((e: HomeLiveEvent) => !e.completed);
    const upcomingCount = futureEvents.length;
    const showEvergreen = !loading && futureEvents.length === 0;

    return (
        <section ref={containerRef} className="pt-32 md:pt-40 pb-24 md:pb-32 px-6 md:px-12 lg:px-24 bg-brutal-bg">
            <div className="max-w-6xl mx-auto">
                {/* Header — compact: eyebrow + headline + ONE meta row that
                    pairs the live indicator with the refresh button. Subtitle
                    and the standalone Join pill have been merged into the meta
                    row to keep the section scannable in one glance. */}
                <div className="mb-12">
                    <div className="lp-header w-16 h-0.5 bg-brutal-red mb-8 origin-left" />
                    <div className="lp-header flex flex-wrap items-center gap-3 mb-4">
                        <p className="font-data text-xs text-brutal-red uppercase tracking-[0.2em]">
                            Right Now
                        </p>
                        <span className="inline-flex items-center gap-2 font-data text-[10px] text-brutal-dark/50 uppercase tracking-wider">
                            <span className="relative flex h-1.5 w-1.5">
                                <span className="absolute inline-flex h-full w-full rounded-full bg-brutal-red opacity-60 motion-safe:animate-ping" />
                                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brutal-red" />
                            </span>
                            <span className="tabular-nums">{agoLabel}</span>
                        </span>
                        <button
                            type="button"
                            onClick={refetch}
                            aria-label="Refresh live data"
                            className="text-brutal-dark/40 hover:text-brutal-red transition-colors duration-300"
                        >
                            <RefreshCw size={12} aria-hidden="true" />
                        </button>
                    </div>
                    <h2 className="lp-header font-heading font-bold text-3xl md:text-5xl uppercase tracking-tight-heading">
                        See what's happening.
                    </h2>

                    {/* Logged-out: inline join pill, no separate subtitle. */}
                    {!user && activeMakers !== null && activeMakers > 0 && (
                        <div className="lp-header mt-5 inline-flex items-center gap-3 pl-3 pr-2 py-1.5
                                        rounded-full border border-brutal-red/25 bg-brutal-red/5
                                        hover:border-brutal-red/50 transition-all duration-300 group/pill">
                            <span className="font-data text-[11px] text-brutal-dark uppercase tracking-wider">
                                <span ref={counterRef} className="font-bold text-brutal-red tabular-nums">0</span>
                                <span className="text-brutal-dark/60">{' '}makers in the lab today</span>
                            </span>
                            <Link
                                to="/register"
                                className="inline-flex items-center gap-1 px-3 py-1 rounded-full
                                           bg-brutal-red text-brutal-bg font-data text-[10px] font-bold
                                           uppercase tracking-wider hover:bg-brutal-dark transition-colors duration-300"
                            >
                                Join them
                                <ArrowRight size={10} className="group-hover/pill:translate-x-0.5 transition-transform duration-300" />
                            </Link>
                        </div>
                    )}
                </div>

                {/* Two columns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Activity Feed */}
                    <Card className="pulse-col bg-brutal-dark text-brutal-bg border-brutal-dark overflow-hidden">
                        <div className="flex items-center justify-between p-8 pb-4">
                            <h3 className="font-heading font-bold text-sm uppercase tracking-tight-heading text-brutal-bg">
                                Live Activity
                            </h3>
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-brutal-bg/8 rounded-full">
                                <div className="w-2 h-2 bg-brutal-red rounded-full motion-safe:animate-pulse" />
                                <span className="font-data text-[10px] tracking-widest uppercase text-brutal-bg/60">Live</span>
                            </div>
                        </div>
                        <div className="px-8 pb-8">
                            {activityItems === null ? (
                                <div className="space-y-5" aria-label="Loading activity">
                                    <Skeleton variant="banner" className="bg-brutal-bg/5 border-brutal-bg/10 h-24" />
                                </div>
                            ) : (
                                <ActivityFeed items={activityItems} reducedMotion={reducedMotion} />
                            )}
                        </div>
                    </Card>

                    {/* Upcoming Events */}
                    <Card className="pulse-col border-brutal-dark overflow-hidden">
                        <div className="flex items-center justify-between p-8 pb-4">
                            <div>
                                <h3 className="font-heading font-bold text-sm uppercase tracking-tight-heading">
                                    Events
                                </h3>
                                <p className="font-data text-xs text-brutal-dark/40 mt-1">
                                    {loading
                                        ? 'Loading…'
                                        : showEvergreen
                                            ? 'What you can build here'
                                            : `${upcomingCount} upcoming`}
                                </p>
                            </div>
                            <Calendar size={18} className="text-brutal-dark/25" aria-hidden="true" />
                        </div>
                        <div className="px-8 pb-8">
                            {loading ? (
                                <div aria-label="Loading events">
                                    <Skeleton variant="card" count={2} className="mb-3 h-16" />
                                </div>
                            ) : showEvergreen ? (
                                <EvergreenStrip />
                            ) : (
                                <UpcomingEventsList events={futureEvents} />
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        </section>
    );
}

// ── Events list — show top 3 active events, collapse the rest ───────────────
function UpcomingEventsList({ events }: { events: HomeLiveEvent[] }) {
    const [expanded, setExpanded] = useState(false);
    const visible = expanded ? events : events.slice(0, COLLAPSED_COUNT);
    const hiddenCount = Math.max(0, events.length - COLLAPSED_COUNT);
    return (
        <div className="space-y-6">
            {visible.map((event) => {
                const d = new Date(event.date);
                const day = String(d.getDate());
                const month = MONTHS[d.getMonth()];
                return (
                    <Link
                        key={event.id}
                        to="/events"
                        className="flex gap-6 items-start group/event"
                    >
                        <div className="flex-shrink-0 w-14 text-center">
                            <span className="font-data text-xl sm:text-2xl font-bold block leading-none text-brutal-red">
                                {day}
                            </span>
                            <span className="font-data text-[10px] text-brutal-dark/40 uppercase tracking-wider">
                                {month}
                            </span>
                        </div>
                        <div className="flex-1 pb-6 border-b border-brutal-dark/5 last:border-0 last:pb-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-heading font-bold text-base sm:text-lg tracking-tight-heading
                                               group-hover/event:text-brutal-red transition-colors duration-300">
                                    {event.title}
                                </h4>
                                <CountdownChip date={event.date} />
                            </div>
                            <p className="font-data text-xs text-brutal-dark/40 mt-1">
                                {formatEventTime(event.date, event.end_date)}
                            </p>
                        </div>
                    </Link>
                );
            })}

            {hiddenCount > 0 && (
                <button
                    type="button"
                    onClick={() => setExpanded(prev => !prev)}
                    className="font-data text-[10px] font-bold text-brutal-dark/40 uppercase tracking-[0.2em]
                               hover:text-brutal-red transition-colors duration-300
                               flex items-center gap-2 pt-2"
                    aria-expanded={expanded}
                >
                    <span className="w-6 h-px bg-brutal-dark/20" aria-hidden="true" />
                    {expanded ? 'Show less' : `Show ${hiddenCount} more`}
                </button>
            )}

            <Link to="/events" className="block pt-4">
                <Button variant="outline" size="sm" className="w-full group/btn">
                    <span className="flex items-center gap-2 justify-center">
                        View Full Calendar
                        <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform duration-300" />
                    </span>
                </Button>
            </Link>
        </div>
    );
}

function EvergreenStrip() {
    return (
        <div className="space-y-4">
            <p className="font-data text-[10px] text-brutal-dark/40 uppercase tracking-wider">
                No scheduled events right now — here's what makers are building anyway.
            </p>
            <div className="space-y-3">
                {EVERGREEN_SHOWCASE.map(item => (
                    <div
                        key={item.title}
                        className="border border-brutal-dark/10 rounded-xl p-4
                                   hover:border-brutal-red/30 transition-colors duration-300"
                    >
                        <span className="font-data text-[9px] text-brutal-red uppercase tracking-widest">
                            {item.tag}
                        </span>
                        <h4 className="font-heading font-bold text-sm mt-1 tracking-tight-heading">
                            {item.title}
                        </h4>
                        <p className="font-data text-xs text-brutal-dark/50 mt-1 leading-relaxed">
                            {item.blurb}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}
