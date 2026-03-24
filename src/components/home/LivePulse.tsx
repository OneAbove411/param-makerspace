import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Calendar, ArrowRight, ChevronDown } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

/**
 * LivePulse — Section 8
 *
 * Design critique of previous version:
 * - Column cards had continuous float (y: -3, yoyo) — distracting when
 *   you're reading event dates/times.
 * - Live indicator dot had BOTH CSS animate-pulse AND GSAP scale pulse → double animation.
 * - Event date numbers had continuous scale pulse — unnecessary.
 * - Accent line had breathing animation — this section is informational,
 *   not atmospheric. Breathing line = distraction.
 *
 * New approach:
 * - Expandable panels are JUSTIFIED here — there's a feed of updates and
 *   a list of events. Collapsing saves space and the summary counts
 *   ("4 updates", "2 events") give the user enough to decide if they care.
 * - NO continuous GSAP animations. The ActivityFeed streaming effect
 *   (items appearing one by one) IS the animation — it's purposeful and
 *   matches the "live" context.
 * - Live dot: CSS animate-pulse only (one animation system, not two).
 * - Clean scroll-triggered entrance, then static.
 */

const ACTIVITY_FEED = [
    { time: '5 min ago', text: 'elena_k uploaded a blueprint for "Solar Kiln v3"' },
    { time: '12 min ago', text: 'julian_v earned the "Mechanical Kinematics" badge' },
    { time: '1 hr ago', text: 'Main Lab 3D Printer v2 is now available' },
    { time: '3 hr ago', text: 'sarah_j completed the "Neural Interface" challenge' },
];

const UPCOMING_EVENTS = [
    { day: '24', month: 'MAR', title: 'Plasma Cutting Workshop', time: '1:00 – 3:00 PM' },
    { day: '28', month: 'MAR', title: 'Arduino Night', time: '7:00 – 9:00 PM' },
];

function ActivityFeed() {
    const [visibleItems, setVisibleItems] = useState(0);

    useEffect(() => {
        if (visibleItems >= ACTIVITY_FEED.length) return;
        const timeout = setTimeout(() => {
            setVisibleItems(prev => prev + 1);
        }, 800);
        return () => clearTimeout(timeout);
    }, [visibleItems]);

    return (
        <div className="space-y-5">
            {ACTIVITY_FEED.slice(0, visibleItems).map((item, i) => (
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
            {visibleItems < ACTIVITY_FEED.length && (
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
    const [expandedPanel, setExpandedPanel] = useState<'activity' | 'events' | null>(null);
    const activityPanelRef = useRef<HTMLDivElement>(null);
    const eventsPanelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            // Header
            gsap.fromTo('.lp-header',
                { y: 30, opacity: 0 },
                {
                    y: 0, opacity: 1,
                    duration: 0.7, stagger: 0.08, ease: 'power2.out',
                    scrollTrigger: { trigger: containerRef.current, start: 'top 75%' }
                }
            );

            // Columns
            gsap.fromTo('.pulse-col',
                { y: 50, opacity: 0 },
                {
                    y: 0, opacity: 1,
                    duration: 0.8, stagger: 0.15, ease: 'power2.out',
                    scrollTrigger: { trigger: '.pulse-col', start: 'top 80%' }
                }
            );
            // NO continuous animations. Panels are interactive — animation would compete.
        }, containerRef);
        return () => ctx.revert();
    }, []);

    // Activity panel expand/collapse
    useEffect(() => {
        if (!activityPanelRef.current) return;
        if (expandedPanel === 'activity') {
            gsap.to(activityPanelRef.current, { height: 'auto', duration: 0.4, ease: 'power2.out' });
            gsap.to('.lp-activity-feed', { opacity: 1, duration: 0.3, delay: 0.1, ease: 'power2.out' });
            gsap.to('.lp-activity-chevron', { rotation: 180, duration: 0.3, ease: 'power2.out' });
        } else {
            gsap.to(activityPanelRef.current, { height: 0, duration: 0.3, ease: 'power2.inOut' });
            gsap.to('.lp-activity-feed', { opacity: 0, duration: 0.2, ease: 'power2.out' });
            gsap.to('.lp-activity-chevron', { rotation: 0, duration: 0.3, ease: 'power2.inOut' });
        }
    }, [expandedPanel]);

    // Events panel expand/collapse
    useEffect(() => {
        if (!eventsPanelRef.current) return;
        if (expandedPanel === 'events') {
            gsap.to(eventsPanelRef.current, { height: 'auto', duration: 0.4, ease: 'power2.out' });
            gsap.to('.lp-events-content', { opacity: 1, duration: 0.3, delay: 0.1, ease: 'power2.out' });
            gsap.to('.lp-events-chevron', { rotation: 180, duration: 0.3, ease: 'power2.out' });
        } else {
            gsap.to(eventsPanelRef.current, { height: 0, duration: 0.3, ease: 'power2.inOut' });
            gsap.to('.lp-events-content', { opacity: 0, duration: 0.2, ease: 'power2.out' });
            gsap.to('.lp-events-chevron', { rotation: 0, duration: 0.3, ease: 'power2.inOut' });
        }
    }, [expandedPanel]);

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

                {/* Two columns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Activity Feed */}
                    <Card className="pulse-col bg-brutal-dark text-brutal-bg border-brutal-dark overflow-hidden">
                        <button
                            onClick={() => setExpandedPanel(expandedPanel === 'activity' ? null : 'activity')}
                            className="w-full flex items-center justify-between p-8 hover:bg-brutal-dark/80 transition-colors duration-200"
                        >
                            <div className="text-left">
                                <h3 className="font-heading font-bold text-sm uppercase tracking-tight-heading text-brutal-bg">
                                    Live Activity
                                </h3>
                                {expandedPanel !== 'activity' && (
                                    <p className="font-data text-xs text-brutal-bg/50 mt-1">
                                        {ACTIVITY_FEED.length} updates
                                    </p>
                                )}
                            </div>
                            <div className="flex items-center gap-3">
                                {expandedPanel !== 'activity' && (
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-brutal-bg/8 rounded-full">
                                        <div className="w-2 h-2 bg-brutal-red rounded-full animate-pulse" />
                                        <span className="font-data text-[10px] tracking-widest uppercase text-brutal-bg/60">Live</span>
                                    </div>
                                )}
                                <ChevronDown size={18} className="lp-activity-chevron text-brutal-bg/50" />
                            </div>
                        </button>
                        <div ref={activityPanelRef} className="overflow-hidden" style={{ height: 0 }}>
                            <div className="lp-activity-feed px-8 pb-8 opacity-0">
                                <ActivityFeed />
                            </div>
                        </div>
                    </Card>

                    {/* Upcoming Events */}
                    <Card className="pulse-col border-brutal-dark overflow-hidden">
                        <button
                            onClick={() => setExpandedPanel(expandedPanel === 'events' ? null : 'events')}
                            className="w-full flex items-center justify-between p-8 hover:bg-brutal-dark/5 transition-colors duration-200"
                        >
                            <div className="text-left">
                                <h3 className="font-heading font-bold text-sm uppercase tracking-tight-heading">
                                    Upcoming
                                </h3>
                                {expandedPanel !== 'events' && (
                                    <p className="font-data text-xs text-brutal-dark/50 mt-1">
                                        {UPCOMING_EVENTS.length} events this week
                                    </p>
                                )}
                            </div>
                            <div className="flex items-center gap-3">
                                {expandedPanel !== 'events' && (
                                    <Calendar size={16} className="text-brutal-dark/30" />
                                )}
                                <ChevronDown size={18} className="lp-events-chevron text-brutal-dark/50" />
                            </div>
                        </button>
                        <div ref={eventsPanelRef} className="overflow-hidden" style={{ height: 0 }}>
                            <div className="lp-events-content px-8 pb-8 opacity-0">
                                <div className="space-y-6">
                                    {UPCOMING_EVENTS.map((event) => (
                                        <div key={event.day} className="flex gap-6 items-start group/event">
                                            <div className="flex-shrink-0 w-14 text-center">
                                                <span className="font-data text-3xl font-bold text-brutal-red block leading-none">
                                                    {event.day}
                                                </span>
                                                <span className="font-data text-[10px] text-brutal-dark/40 uppercase tracking-wider">
                                                    {event.month}
                                                </span>
                                            </div>
                                            <div className="flex-1 pb-6 border-b border-brutal-dark/5 last:border-0 last:pb-0">
                                                <h4 className="font-heading font-bold text-lg tracking-tight-heading
                                                               group-hover/event:text-brutal-red transition-colors duration-300">
                                                    {event.title}
                                                </h4>
                                                <p className="font-data text-xs text-brutal-dark/40 mt-1">
                                                    {event.time}
                                                </p>
                                            </div>
                                        </div>
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
                        </div>
                    </Card>
                </div>
            </div>
        </section>
    );
}
