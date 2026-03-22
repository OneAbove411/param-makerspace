import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Calendar, ArrowRight } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

// ─── Activity feed data ───

const ACTIVITY_FEED = [
    { time: '5 min ago',  text: 'elena_k uploaded a blueprint for "Solar Kiln v3"' },
    { time: '12 min ago', text: 'julian_v earned the "Mechanical Kinematics" badge' },
    { time: '1 hr ago',   text: 'Main Lab 3D Printer v2 is now available' },
    { time: '3 hr ago',   text: 'sarah_j completed the "Neural Interface" challenge' },
];

const UPCOMING_EVENTS = [
    { day: '24', month: 'MAR', title: 'Plasma Cutting Workshop', time: '1:00 – 3:00 PM' },
    { day: '28', month: 'MAR', title: 'Arduino Night',           time: '7:00 – 9:00 PM' },
];

// ─── Streaming activity feed (inspired by TelemetryTypewriter pattern) ───

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

// ─── Main Component ───

export function LivePulse() {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.fromTo('.lp-header',
                { y: 40, opacity: 0 },
                {
                    y: 0, opacity: 1,
                    duration: 0.8, stagger: 0.1,
                    ease: 'power3.out',
                    scrollTrigger: { trigger: containerRef.current, start: 'top 75%' }
                }
            );

            gsap.fromTo('.pulse-col',
                { y: 60, opacity: 0 },
                {
                    y: 0, opacity: 1,
                    duration: 0.8, stagger: 0.2,
                    ease: 'power3.out',
                    scrollTrigger: { trigger: '.pulse-col', start: 'top 80%' }
                }
            );
        }, containerRef);
        return () => ctx.revert();
    }, []);

    return (
        <section ref={containerRef} className="py-32 md:py-40 px-6 md:px-12 lg:px-24 bg-brutal-bg">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-16">
                    <p className="lp-header font-data text-xs text-brutal-red uppercase tracking-[0.2em] mb-4">
                        Right Now
                    </p>
                    <h2 className="lp-header font-heading font-bold text-4xl md:text-6xl uppercase tracking-tight-heading">
                        Live Pulse
                    </h2>
                </div>

                {/* Two columns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Left: Activity Feed */}
                    <Card className="pulse-col bg-brutal-dark text-brutal-bg p-8 md:p-10 border-brutal-dark">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="font-heading font-bold text-sm uppercase tracking-tight-heading text-brutal-bg">
                                Live Activity
                            </h3>
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-brutal-bg/8 rounded-full">
                                <div className="w-2 h-2 bg-brutal-red rounded-full animate-pulse" />
                                <span className="font-data text-[10px] tracking-widest uppercase text-brutal-bg/60">
                                    Live
                                </span>
                            </div>
                        </div>
                        <ActivityFeed />
                    </Card>

                    {/* Right: Upcoming Events */}
                    <Card className="pulse-col p-8 md:p-10">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="font-heading font-bold text-sm uppercase tracking-tight-heading">
                                Upcoming
                            </h3>
                            <Calendar size={16} className="text-brutal-dark/30" />
                        </div>

                        <div className="space-y-8">
                            {UPCOMING_EVENTS.map((event) => (
                                <div key={event.day} className="flex gap-6 items-start group/event">
                                    {/* Date block */}
                                    <div className="flex-shrink-0 w-14 text-center">
                                        <span className="font-data text-3xl font-bold text-brutal-red block leading-none">
                                            {event.day}
                                        </span>
                                        <span className="font-data text-[10px] text-brutal-dark/40 uppercase tracking-wider">
                                            {event.month}
                                        </span>
                                    </div>

                                    {/* Event details */}
                                    <div className="flex-1 pb-8 border-b border-brutal-dark/5 last:border-0 last:pb-0">
                                        <h4 className="font-heading font-bold text-lg tracking-tight-heading
                                                       group-hover/event:text-brutal-red transition-colors duration-300">
                                            {event.title}
                                        </h4>
                                        <p className="font-data text-xs text-brutal-dark/40 mt-1.5">
                                            {event.time}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <Link to="/events" className="block mt-8">
                            <Button variant="outline" size="sm" className="w-full group/btn">
                                <span className="flex items-center gap-2 justify-center">
                                    View Full Calendar
                                    <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform duration-300" />
                                </span>
                            </Button>
                        </Link>
                    </Card>
                </div>
            </div>
        </section>
    );
}
