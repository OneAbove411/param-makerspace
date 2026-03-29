import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Calendar, ArrowRight, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

gsap.registerPlugin(ScrollTrigger);

/**
 * LivePulse — Section 8
 *
 * Fetches REAL activity (recent XP events) and REAL upcoming events from Supabase.
 * Both panels are always open — no accordion toggle.
 * Events with past dates show as "Completed".
 */

interface ActivityItem {
    time: string;
    text: string;
}

interface UpcomingEvent {
    id: string;
    day: string;
    month: string;
    title: string;
    time: string;
    completed: boolean;
}

const FALLBACK_ACTIVITY: ActivityItem[] = [
    { time: '5 min ago', text: 'elena_k uploaded a blueprint for "Solar Kiln v3"' },
    { time: '12 min ago', text: 'julian_v earned the "Mechanical Kinematics" badge' },
    { time: '1 hr ago', text: 'Main Lab 3D Printer v2 is now available' },
    { time: '3 hr ago', text: 'sarah_j completed the "Neural Interface" challenge' },
];

const FALLBACK_EVENTS: UpcomingEvent[] = [
    { id: '', day: '24', month: 'MAR', title: 'Plasma Cutting Workshop', time: '1:00 – 3:00 PM', completed: true },
    { id: '', day: '28', month: 'MAR', title: 'Arduino Night', time: '7:00 – 9:00 PM', completed: false },
];

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

const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

function ActivityFeed({ items }: { items: ActivityItem[] }) {
    const [visibleItems, setVisibleItems] = useState(0);

    useEffect(() => {
        if (visibleItems >= items.length) return;
        const timeout = setTimeout(() => {
            setVisibleItems(prev => prev + 1);
        }, 800);
        return () => clearTimeout(timeout);
    }, [visibleItems, items.length]);

    return (
        <div className="space-y-5">
            {items.slice(0, visibleItems).map((item, i) => (
                <div
                    key={i}
                    className="flex gap-4 items-start animate-[fadeSlideIn_0.4s_ease-out_forwards]"
                >
                    <span className="font-data text-[10px] text-brutal-bg/30 uppercase tracking-wider whitespace-nowrap flex-shrink-0 mt-0.5 w-16">
                        {item.time}
                    </span>
                    <p className="font-data text-sm text-brutal-bg/70 leading-relaxed">
                        {item.text}
                    </p>
                </div>
            ))}
            {visibleItems < items.length && (
                <div className="flex items-center gap-2 ml-20">
                    <div className="w-1.5 h-1.5 bg-brutal-red rounded-full animate-pulse" />
                    <span className="font-data text-[10px] text-brutal-bg/30 uppercase tracking-widest">
                        Loading feed...
                    </span>
                </div>
            )}
        </div>
    );
}

export function LivePulse() {
    const containerRef = useRef<HTMLDivElement>(null);
    const [activityItems, setActivityItems] = useState<ActivityItem[]>(FALLBACK_ACTIVITY);
    const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>(FALLBACK_EVENTS);

    // Fetch real activity and events
    useEffect(() => {
        async function fetchActivity() {
            const { data: xpEvents } = await supabase
                .from('xp_event')
                .select('id, user_id, amount, reason, reference_type, created_at')
                .order('created_at', { ascending: false })
                .limit(6);

            if (xpEvents && xpEvents.length > 0) {
                const userIds = [...new Set(xpEvents.map(e => e.user_id))];
                const { data: users } = await supabase
                    .from('app_user')
                    .select('id, name')
                    .in('id', userIds);

                const userMap: Record<string, string> = {};
                (users || []).forEach((u: any) => {
                    userMap[u.id] = u.name || 'A maker';
                });

                const items: ActivityItem[] = xpEvents.map(ev => ({
                    time: timeAgo(ev.created_at),
                    text: `${userMap[ev.user_id] || 'A maker'} earned ${ev.amount} XP — ${ev.reason}`,
                }));

                if (items.length > 0) setActivityItems(items);
            }
        }

        async function fetchEvents() {
            // Fetch both upcoming AND recent past events (last 30 days) to show completed status
            const now = new Date();
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
            const { data: events } = await supabase
                .from('event')
                .select('id, title, date, end_date')
                .gte('date', thirtyDaysAgo)
                .order('date', { ascending: true })
                .limit(6);

            if (events && events.length > 0) {
                const mapped: UpcomingEvent[] = events.map(ev => {
                    const d = new Date(ev.date);
                    const endDate = ev.end_date ? new Date(ev.end_date) : d;
                    const isCompleted = endDate < now;
                    return {
                        id: ev.id,
                        day: String(d.getDate()),
                        month: MONTHS[d.getMonth()],
                        title: ev.title,
                        time: formatEventTime(ev.date, ev.end_date),
                        completed: isCompleted,
                    };
                });
                setUpcomingEvents(mapped);
            }
        }

        fetchActivity();
        fetchEvents();
    }, []);

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.fromTo('.lp-header',
                { y: 30, opacity: 0 },
                {
                    y: 0, opacity: 1,
                    duration: 0.7, stagger: 0.08, ease: 'power2.out',
                    scrollTrigger: { trigger: containerRef.current, start: 'top 75%' }
                }
            );

            gsap.fromTo('.pulse-col',
                { y: 50, opacity: 0 },
                {
                    y: 0, opacity: 1,
                    duration: 0.8, stagger: 0.15, ease: 'power2.out',
                    scrollTrigger: { trigger: '.pulse-col', start: 'top 80%' }
                }
            );
        }, containerRef);
        return () => ctx.revert();
    }, []);

    const upcomingCount = upcomingEvents.filter(e => !e.completed).length;
    const completedCount = upcomingEvents.filter(e => e.completed).length;

    return (
        <section ref={containerRef} className="py-24 md:py-32 px-6 md:px-12 lg:px-24 bg-brutal-bg">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-14">
                    <div className="lp-header w-16 h-0.5 bg-brutal-red mb-8 origin-left" />
                    <p className="lp-header font-data text-xs text-brutal-red uppercase tracking-[0.2em] mb-4">
                        Right Now
                    </p>
                    <h2 className="lp-header font-heading font-bold text-3xl md:text-5xl uppercase tracking-tight-heading">
                        See what's happening.
                    </h2>
                    <p className="lp-header font-data text-sm text-brutal-dark/50 mt-4 max-w-lg">
                        The lab is always active. Here's a live look at what makers are building and sharing.
                    </p>
                </div>

                {/* Two columns — both always open */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Activity Feed — always expanded */}
                    <Card className="pulse-col bg-brutal-dark text-brutal-bg border-brutal-dark overflow-hidden">
                        <div className="flex items-center justify-between p-8 pb-4">
                            <h3 className="font-heading font-bold text-sm uppercase tracking-tight-heading text-brutal-bg">
                                Live Activity
                            </h3>
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-brutal-bg/8 rounded-full">
                                <div className="w-2 h-2 bg-brutal-red rounded-full animate-pulse" />
                                <span className="font-data text-[10px] tracking-widest uppercase text-brutal-bg/60">Live</span>
                            </div>
                        </div>
                        <div className="px-8 pb-8">
                            <ActivityFeed items={activityItems} />
                        </div>
                    </Card>

                    {/* Upcoming Events — always expanded, with completed status */}
                    <Card className="pulse-col border-brutal-dark overflow-hidden">
                        <div className="flex items-center justify-between p-8 pb-4">
                            <div>
                                <h3 className="font-heading font-bold text-sm uppercase tracking-tight-heading">
                                    Events
                                </h3>
                                <p className="font-data text-xs text-brutal-dark/40 mt-1">
                                    {upcomingCount} upcoming{completedCount > 0 ? ` · ${completedCount} completed` : ''}
                                </p>
                            </div>
                            <Calendar size={18} className="text-brutal-dark/25" />
                        </div>
                        <div className="px-8 pb-8">
                            <div className="space-y-6">
                                {upcomingEvents.map((event) => (
                                    <Link
                                        key={event.id || event.day + event.title}
                                        to="/events"
                                        className="flex gap-6 items-start group/event block"
                                    >
                                        <div className="flex-shrink-0 w-14 text-center">
                                            <span className={`font-data text-xl sm:text-2xl font-bold block leading-none ${
                                                event.completed ? 'text-brutal-dark/20' : 'text-brutal-red'
                                            }`}>
                                                {event.day}
                                            </span>
                                            <span className="font-data text-[10px] text-brutal-dark/40 uppercase tracking-wider">
                                                {event.month}
                                            </span>
                                        </div>
                                        <div className="flex-1 pb-6 border-b border-brutal-dark/5 last:border-0 last:pb-0">
                                            <div className="flex items-center gap-2">
                                                <h4 className={`font-heading font-bold text-base sm:text-lg tracking-tight-heading
                                                               group-hover/event:text-brutal-red transition-colors duration-300
                                                               ${event.completed ? 'text-brutal-dark/40 line-through decoration-brutal-dark/15' : ''}`}>
                                                    {event.title}
                                                </h4>
                                                {event.completed && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brutal-dark/5
                                                                     font-data text-[9px] font-bold text-brutal-dark/30 uppercase tracking-wider flex-shrink-0">
                                                        <CheckCircle2 size={9} />
                                                        Done
                                                    </span>
                                                )}
                                            </div>
                                            <p className="font-data text-xs text-brutal-dark/40 mt-1">
                                                {event.time}
                                            </p>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                            <Link to="/events" className="block mt-6">
                                <Button variant="outline" size="sm" className="w-full group/btn">
                                    <span className="flex items-center gap-2 justify-center">
                                        View Full Calendar
                                        <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform duration-300" />
                                    </span>
                                </Button>
                            </Link>
                        </div>
                    </Card>
                </div>
            </div>
        </section>
    );
}
