import { useRef, useState, useEffect } from 'react';
import { gsap } from 'gsap';
import { ChevronDown, Lightbulb, Users, Rocket, Target, Wrench, TrendingUp, Globe } from 'lucide-react';
import { useReveal } from '../../hooks/useReveal';

/**
 * DiscoverSection — 3 expandable cards
 * Uses CSS IntersectionObserver for reveal (no GSAP scroll triggers)
 */

const PHILOSOPHY_STATEMENTS = [
  { left: 'Curiosity in.', right: 'Innovation out.' },
  { left: 'No degrees required.', right: 'No gatekeeping.' },
  { left: 'Build real things.', right: 'Ship to the real world.' },
];

const PILLARS = [
  { icon: Lightbulb, title: 'A Maker is anyone who builds.', desc: 'You don\'t need a degree, fancy tools, or years of experience. If you\'re curious enough to try — you\'re already a maker.' },
  { icon: Users, title: 'A community, not a classroom.', desc: 'No lectures. You learn by doing — picking projects, getting stuck, asking for help, and figuring it out together.' },
  { icon: Rocket, title: 'Real projects, real impact.', desc: 'The things you build here — from 3D-printed prosthetics to interactive art — solve real problems and go out into the world.' },
];

const STEPS = [
  { num: '01', title: 'Pick a Challenge', desc: 'Browse beginner-friendly challenges across electronics, robotics, design, and more.', icon: Target },
  { num: '02', title: 'Build & Share', desc: 'Work at your own pace. Document what you tried, what broke, and what worked.', icon: Wrench },
  { num: '03', title: 'Grow Your Skills', desc: 'Every project earns XP and unlocks new ranks. Start as "Curious" and work your way up.', icon: TrendingUp },
];

function ExpandableCard({
  title, subtitle, icon, isExpanded, onToggle, children, delay = 0,
}: {
  title: string; subtitle: string; icon: React.ReactNode;
  isExpanded: boolean; onToggle: () => void; children: React.ReactNode; delay?: number;
}) {
  const expandRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!expandRef.current) return;
    if (isExpanded) {
      gsap.to(expandRef.current, { height: 'auto', opacity: 1, duration: 0.4, ease: 'power2.out' });
    } else {
      gsap.to(expandRef.current, { height: 0, opacity: 0, duration: 0.3, ease: 'power2.inOut' });
    }
  }, [isExpanded]);

  return (
    <div
      className="flex flex-col border border-brutal-bg/10 rounded-2xl overflow-hidden bg-brutal-dark hover:border-brutal-red/25 transition-all duration-500"
      style={{ transitionDelay: `${delay}ms` }}
    >
      <button onClick={onToggle} className="flex items-start justify-between gap-4 p-6 md:p-8 hover:bg-brutal-bg/[0.03] transition-colors duration-200 text-left">
        <div className="flex-1 min-w-0">
          <div className="w-9 h-9 rounded-full bg-brutal-red/15 flex items-center justify-center mb-3">{icon}</div>
          <h3 className="font-heading font-bold text-base uppercase tracking-tight">{title}</h3>
          {!isExpanded && <p className="font-data text-xs text-brutal-bg/40 mt-2">{subtitle}</p>}
        </div>
        <ChevronDown size={18} className={`flex-shrink-0 mt-1 text-brutal-bg/40 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
      </button>
      <div ref={expandRef} className="overflow-hidden" style={{ height: 0, opacity: 0 }}>
        <div className="px-6 md:px-8 pb-6 md:pb-8 border-t border-brutal-bg/8 pt-5">{children}</div>
      </div>
    </div>
  );
}

export function DiscoverSection() {
  const { ref: sectionRef, visible } = useReveal(0.15);
  const [expandedCard, setExpandedCard] = useState<'philosophy' | 'pillars' | 'steps' | null>(null);

  return (
    <section
      id="discover-section"
      ref={sectionRef}
      className="py-20 md:py-28 px-6 md:px-12 lg:px-24 bg-brutal-dark text-brutal-bg"
    >
      <div className={`max-w-6xl mx-auto transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        {/* Header */}
        <div className="mb-12">
          <h2 className="font-drama italic text-2xl sm:text-3xl md:text-5xl lg:text-6xl text-brutal-bg leading-tight">Discover</h2>
          <p className="font-data text-sm text-brutal-bg/40 mt-3 max-w-xl">Everything about Param in 60 seconds.</p>
        </div>

        {/* Cards */}
        <div className={`grid grid-cols-1 md:grid-cols-3 gap-5 transition-all duration-700 delay-150 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <ExpandableCard
            title="The Philosophy" subtitle="What we believe"
            icon={<Globe size={16} className="text-brutal-red" strokeWidth={1.5} />}
            isExpanded={expandedCard === 'philosophy'}
            onToggle={() => setExpandedCard(expandedCard === 'philosophy' ? null : 'philosophy')}
            delay={0}
          >
            <div className="space-y-5">
              {PHILOSOPHY_STATEMENTS.map((s, i) => (
                <div key={i}>
                  <div className="flex flex-col md:flex-row gap-3 items-start">
                    <p className="font-heading text-sm font-bold tracking-tight flex-1">{s.left}</p>
                    <div className="hidden md:block w-6 h-px bg-brutal-red/25 flex-shrink-0 mt-2" />
                    <p className="font-heading text-sm font-bold tracking-tight text-brutal-bg/60 flex-1">{s.right}</p>
                  </div>
                  {i < PHILOSOPHY_STATEMENTS.length - 1 && <div className="my-4 h-px bg-brutal-bg/6" />}
                </div>
              ))}
              <p className="font-heading text-sm text-brutal-bg/50 mt-5 pt-5 border-t border-brutal-bg/8">Built in India. Open to the world.</p>
            </div>
          </ExpandableCard>

          <ExpandableCard
            title="New Here?" subtitle="3 key ideas"
            icon={<Lightbulb size={16} className="text-brutal-red" strokeWidth={1.8} />}
            isExpanded={expandedCard === 'pillars'}
            onToggle={() => setExpandedCard(expandedCard === 'pillars' ? null : 'pillars')}
            delay={80}
          >
            <div className="space-y-5">
              {PILLARS.map((p) => {
                const Icon = p.icon;
                return (
                  <div key={p.title}>
                    <div className="flex gap-2.5 mb-1.5">
                      <Icon size={16} className="text-brutal-red flex-shrink-0 mt-0.5" strokeWidth={1.8} />
                      <h4 className="font-heading font-bold text-xs tracking-tight leading-snug">{p.title}</h4>
                    </div>
                    <p className="font-data text-[11px] text-brutal-bg/50 leading-relaxed ml-6">{p.desc}</p>
                  </div>
                );
              })}
            </div>
          </ExpandableCard>

          <ExpandableCard
            title="How It Works" subtitle="3 simple steps"
            icon={<Target size={16} className="text-brutal-red" strokeWidth={1.8} />}
            isExpanded={expandedCard === 'steps'}
            onToggle={() => setExpandedCard(expandedCard === 'steps' ? null : 'steps')}
            delay={160}
          >
            <div className="space-y-5">
              {STEPS.map((step) => (
                <div key={step.num}>
                  <div className="flex gap-2.5 items-start mb-1.5">
                    <span className="font-data text-xs font-bold text-brutal-red flex-shrink-0">{step.num}</span>
                    <h4 className="font-heading font-bold text-xs tracking-tight">{step.title}</h4>
                  </div>
                  <p className="font-data text-[11px] text-brutal-bg/50 leading-relaxed ml-7">{step.desc}</p>
                </div>
              ))}
            </div>
          </ExpandableCard>
        </div>
      </div>
    </section>
  );
}
