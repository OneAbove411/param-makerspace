import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { useNavigate, Link } from 'react-router-dom';
import { ChevronDown, ArrowRight } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { useReveal } from '../../hooks/useReveal';

/**
 * JoinSection — LivePulse + ClosingCTA
 * CSS IntersectionObserver reveal, no GSAP scroll triggers
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
    const t = setTimeout(() => setVisibleItems(v => v + 1), 600);
    return () => clearTimeout(t);
  }, [visibleItems]);

  return (
    <div className="space-y-4">
      {ACTIVITY_FEED.slice(0, visibleItems).map((item, i) => (
        <div key={i} className="flex gap-3 items-start">
          <span className="font-data text-[10px] text-brutal-bg/25 uppercase tracking-wider whitespace-nowrap flex-shrink-0 mt-0.5 w-14">{item.time}</span>
          <p className="font-data text-sm text-brutal-bg/60 leading-relaxed">{item.text}</p>
        </div>
      ))}
      {visibleItems < ACTIVITY_FEED.length && (
        <div className="flex items-center gap-2 ml-16">
          <div className="w-1.5 h-1.5 bg-brutal-red rounded-full animate-pulse" />
          <span className="font-data text-[10px] text-brutal-bg/25 uppercase tracking-widest">Loading...</span>
        </div>
      )}
    </div>
  );
}

export function JoinSection() {
  const { ref: sectionRef, visible } = useReveal(0.1);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [expandedPanel, setExpandedPanel] = useState<'activity' | 'events' | null>(null);
  const activityRef = useRef<HTMLDivElement>(null);
  const eventsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activityRef.current) return;
    gsap.to(activityRef.current, {
      height: expandedPanel === 'activity' ? 'auto' : 0,
      duration: expandedPanel === 'activity' ? 0.4 : 0.3,
      ease: expandedPanel === 'activity' ? 'power2.out' : 'power2.inOut',
    });
  }, [expandedPanel]);

  useEffect(() => {
    if (!eventsRef.current) return;
    gsap.to(eventsRef.current, {
      height: expandedPanel === 'events' ? 'auto' : 0,
      duration: expandedPanel === 'events' ? 0.4 : 0.3,
      ease: expandedPanel === 'events' ? 'power2.out' : 'power2.inOut',
    });
  }, [expandedPanel]);

  return (
    <section ref={sectionRef} className="min-h-[90dvh] bg-brutal-dark text-brutal-bg flex flex-col items-center justify-center px-6 md:px-12 lg:px-24 py-16">
      <div className={`relative z-10 flex flex-col items-center text-center w-full max-w-3xl transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        {/* Headline */}
        <h2 className="font-drama italic text-2xl sm:text-3xl md:text-5xl lg:text-6xl text-brutal-bg leading-tight mb-6">
          You don't need permission to build something amazing.
        </h2>
        <p className="font-data text-sm text-brutal-bg/40 mb-10 max-w-xl leading-relaxed">
          Join a community of makers who started exactly where you are now — curious, excited, and ready to learn by doing.
        </p>

        {/* Panels */}
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-5 w-full mb-10 transition-all duration-700 delay-200 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          {/* Activity */}
          <div className="border border-brutal-bg/10 rounded-2xl overflow-hidden bg-brutal-dark/50">
            <button onClick={() => setExpandedPanel(expandedPanel === 'activity' ? null : 'activity')} className="w-full flex items-center justify-between p-5 hover:bg-brutal-bg/[0.03] transition-colors duration-200">
              <div className="text-left">
                <h3 className="font-heading font-bold text-sm uppercase tracking-tight">Live Activity</h3>
                {expandedPanel !== 'activity' && <p className="font-data text-xs text-brutal-bg/40 mt-1">{ACTIVITY_FEED.length} updates</p>}
              </div>
              <div className="flex items-center gap-2">
                {expandedPanel !== 'activity' && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-brutal-bg/5 rounded-full">
                    <div className="w-1.5 h-1.5 bg-brutal-red rounded-full animate-pulse" />
                    <span className="font-data text-[10px] tracking-widest uppercase text-brutal-bg/50">Live</span>
                  </div>
                )}
                <ChevronDown size={16} className={`text-brutal-bg/40 transition-transform duration-300 ${expandedPanel === 'activity' ? 'rotate-180' : ''}`} />
              </div>
            </button>
            <div ref={activityRef} className="overflow-hidden" style={{ height: 0 }}>
              <div className="px-5 pb-5 border-t border-brutal-bg/8 pt-4"><ActivityFeed /></div>
            </div>
          </div>

          {/* Events */}
          <div className="border border-brutal-bg/10 rounded-2xl overflow-hidden bg-brutal-dark/50">
            <button onClick={() => setExpandedPanel(expandedPanel === 'events' ? null : 'events')} className="w-full flex items-center justify-between p-5 hover:bg-brutal-bg/[0.03] transition-colors duration-200">
              <div className="text-left">
                <h3 className="font-heading font-bold text-sm uppercase tracking-tight">Upcoming Events</h3>
                {expandedPanel !== 'events' && <p className="font-data text-xs text-brutal-bg/40 mt-1">{UPCOMING_EVENTS.length} events this week</p>}
              </div>
              <ChevronDown size={16} className={`text-brutal-bg/40 transition-transform duration-300 ${expandedPanel === 'events' ? 'rotate-180' : ''}`} />
            </button>
            <div ref={eventsRef} className="overflow-hidden" style={{ height: 0 }}>
              <div className="px-5 pb-5 border-t border-brutal-bg/8 pt-4">
                <div className="space-y-5">
                  {UPCOMING_EVENTS.map((ev) => (
                    <div key={ev.day} className="flex gap-5 items-start">
                      <div className="flex-shrink-0 w-12 text-center">
                        <span className="font-data text-xl sm:text-2xl font-bold text-brutal-red block leading-none">{ev.day}</span>
                        <span className="font-data text-[10px] text-brutal-bg/35 uppercase tracking-wider">{ev.month}</span>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-heading font-bold text-sm tracking-tight">{ev.title}</h4>
                        <p className="font-data text-xs text-brutal-bg/35 mt-0.5">{ev.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <Link to="/events" className="block mt-5">
                  <button className="w-full px-4 py-2 bg-brutal-dark border border-brutal-bg/15 rounded-lg font-heading font-bold text-xs uppercase tracking-widest text-brutal-bg hover:bg-brutal-bg/5 transition-all duration-300 flex items-center justify-center gap-2">
                    View Full Calendar <ArrowRight size={11} />
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className={`transition-all duration-700 delay-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <button
            onClick={() => navigate(user ? '/dashboard' : '/register')}
            className="px-10 py-5 rounded-full bg-brutal-red text-brutal-bg font-heading font-bold text-sm uppercase tracking-widest hover:bg-brutal-red/90 transition-all duration-300 shadow-[0_0_30px_rgba(196,41,30,0.15)] hover:shadow-[0_0_50px_rgba(196,41,30,0.3)]"
          >
            <span className="flex items-center gap-2">
              {user ? 'Go to Dashboard' : 'Create Free Account'}
              <ArrowRight size={15} />
            </span>
          </button>
        </div>
        <Link to="/challenges" className="mt-5 font-data text-sm text-brutal-bg/30 hover:text-brutal-bg/50 transition-colors duration-300 underline-offset-4 hover:underline">
          Or browse challenges first
        </Link>
      </div>
    </section>
  );
}
