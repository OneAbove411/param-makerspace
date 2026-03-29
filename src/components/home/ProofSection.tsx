import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { Link } from 'react-router-dom';
import { ChevronDown, ArrowRight } from 'lucide-react';
import { RANK_ORDER } from '../../lib/xpEngine';
import { getBadgeIcon } from '../../lib/badgeIcons';
import { useReveal } from '../../hooks/useReveal';

/**
 * ProofSection — FeaturedProjects + RankPath
 * CSS IntersectionObserver reveal, no GSAP scroll triggers
 */

const FEATURED_PROJECTS = [
  { id: 'p1', title: 'Solar Powered Kiln v2', domain: 'Fabrication', maker: 'Elena K.', image: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=600&auto=format&fit=crop&q=80', summary: 'A solar-thermal kiln for ceramic firing, built entirely from reclaimed materials.' },
  { id: 'p2', title: 'Autonomous Navigation Drone', domain: 'Robotics', maker: 'Julian V.', image: 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=600&auto=format&fit=crop&q=80', summary: 'Carbon-fiber quadcopter with SLAM-based indoor navigation and obstacle avoidance.' },
  { id: 'p3', title: 'Neural Interface PCB v3', domain: 'Electronics', maker: 'Sarah J.', image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop&q=80', summary: 'Custom PCB for low-latency bio-signal processing in wearable devices.' },
];

const RANK_DETAILS: Record<string, { threshold: number; description: string }> = {
  'Curious': { threshold: 0, description: 'Where everyone starts. Show up, explore, attend your first workshop.' },
  'Tinkerer': { threshold: 50, description: 'You\'ve completed a few projects and proved you can finish what you start.' },
  'Builder': { threshold: 150, description: 'You lead small teams and help others learn. 10+ builds under your belt.' },
  'Maker': { threshold: 300, description: 'You\'ve mastered advanced tools and contribute knowledge back to the community.' },
  'Innovator': { threshold: 500, description: 'You\'ve created something original — an open-source tool, a new technique, a program.' },
  'Lab Pro': { threshold: 800, description: 'The highest rank. You teach, mentor, and help run the lab itself.' },
};

function RankNode({ rank, isExpanded, onClick }: { rank: string; isExpanded: boolean; onClick: () => void }) {
  const Icon = getBadgeIcon({ name: rank, badge_type: 'achievement', domain: 'General' });
  const data = RANK_DETAILS[rank];
  const expandRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!expandRef.current) return;
    gsap.to(expandRef.current, {
      height: isExpanded ? 'auto' : 0,
      duration: isExpanded ? 0.4 : 0.3,
      ease: isExpanded ? 'power2.out' : 'power2.inOut',
    });
  }, [isExpanded]);

  return (
    <div className="flex flex-col items-center text-center cursor-pointer" onClick={onClick}>
      <div className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all duration-300 ${isExpanded ? 'bg-brutal-red/15 border-brutal-red/50' : 'bg-brutal-bg/5 border-brutal-bg/10 hover:bg-brutal-bg/8'}`}>
        <Icon size={20} className={`transition-colors duration-300 ${isExpanded ? 'text-brutal-red' : 'text-brutal-bg/35'}`} strokeWidth={1.5} />
      </div>
      <h3 className={`font-heading font-bold text-xs uppercase mt-3 tracking-tight transition-colors duration-300 ${isExpanded ? 'text-brutal-red' : 'text-brutal-bg/45'}`}>{rank}</h3>
      <div ref={expandRef} className="overflow-hidden mt-1.5" style={{ height: 0 }}>
        <span className="font-data text-[10px] text-brutal-red uppercase tracking-widest block mb-1.5">{data.threshold} XP</span>
        <p className="font-data text-[10px] leading-relaxed max-w-[140px] text-brutal-bg/50">{data.description}</p>
      </div>
    </div>
  );
}

export function ProofSection() {
  const { ref: sectionRef, visible } = useReveal(0.1);
  const [expandedPanel, setExpandedPanel] = useState<'projects' | 'ranks' | null>(null);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [expandedRank, setExpandedRank] = useState<string | null>(null);
  const projectsPanelRef = useRef<HTMLDivElement>(null);
  const rankPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!projectsPanelRef.current) return;
    gsap.to(projectsPanelRef.current, {
      height: expandedPanel === 'projects' ? 'auto' : 0,
      duration: expandedPanel === 'projects' ? 0.4 : 0.3,
      ease: expandedPanel === 'projects' ? 'power2.out' : 'power2.inOut',
    });
  }, [expandedPanel]);

  useEffect(() => {
    if (!rankPanelRef.current) return;
    gsap.to(rankPanelRef.current, {
      height: expandedPanel === 'ranks' ? 'auto' : 0,
      duration: expandedPanel === 'ranks' ? 0.4 : 0.3,
      ease: expandedPanel === 'ranks' ? 'power2.out' : 'power2.inOut',
    });
  }, [expandedPanel]);

  return (
    <section ref={sectionRef} className="py-20 md:py-28 px-6 md:px-12 lg:px-24 bg-brutal-dark text-brutal-bg">
      <div className={`max-w-6xl mx-auto transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        {/* Header + Stats */}
        <div className="mb-12">
          <h2 className="font-heading font-bold text-2xl sm:text-3xl md:text-5xl lg:text-6xl uppercase tracking-tight mb-6">Built by Makers</h2>
          <div className="flex flex-wrap gap-4 md:gap-8 lg:gap-10 p-4 sm:p-5 md:p-6 bg-brutal-dark border border-brutal-bg/8 rounded-xl">
            <div>
              <span className="font-data text-2xl sm:text-3xl md:text-4xl font-bold text-brutal-bg tabular-nums block">47</span>
              <p className="font-data text-[10px] text-brutal-bg/35 uppercase tracking-widest mt-0.5">Projects Built</p>
            </div>
            <div className="w-px bg-brutal-bg/8 hidden md:block" />
            <div>
              <span className="font-data text-2xl sm:text-3xl md:text-4xl font-bold text-brutal-bg tabular-nums block">12</span>
              <p className="font-data text-[10px] text-brutal-bg/35 uppercase tracking-widest mt-0.5">Active Makers</p>
            </div>
          </div>
        </div>

        {/* Panels */}
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-5 transition-all duration-700 delay-150 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          {/* Projects */}
          <div className="border border-brutal-bg/10 rounded-2xl overflow-hidden bg-brutal-dark">
            <button onClick={() => setExpandedPanel(expandedPanel === 'projects' ? null : 'projects')} className="w-full flex items-center justify-between p-6 md:p-8 hover:bg-brutal-bg/[0.03] transition-colors duration-200">
              <div className="text-left">
                <h3 className="font-heading font-bold text-base uppercase tracking-tight">Featured Projects</h3>
                {expandedPanel !== 'projects' && <p className="font-data text-xs text-brutal-bg/40 mt-1.5">{FEATURED_PROJECTS.length} projects</p>}
              </div>
              <ChevronDown size={18} className={`flex-shrink-0 text-brutal-bg/40 transition-transform duration-300 ${expandedPanel === 'projects' ? 'rotate-180' : ''}`} />
            </button>
            <div ref={projectsPanelRef} className="overflow-hidden" style={{ height: 0 }}>
              <div className="px-6 md:px-8 pb-6 md:pb-8 border-t border-brutal-bg/8 pt-5 space-y-4">
                {FEATURED_PROJECTS.map((project) => (
                  <div key={project.id} className="bg-brutal-dark border border-brutal-bg/8 rounded-xl overflow-hidden cursor-pointer hover:border-brutal-red/20 transition-all duration-300"
                    onClick={() => setExpandedProject(expandedProject === project.id ? null : project.id)}>
                    <div className="aspect-[4/3] overflow-hidden">
                      <img src={project.image} alt={project.title} className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" loading="lazy" />
                    </div>
                    <div className="p-4">
                      <span className="font-data text-[10px] text-brutal-red uppercase tracking-widest">#{project.domain}</span>
                      <h4 className="font-heading font-bold text-sm mt-1 tracking-tight">{project.title}</h4>
                      {expandedProject === project.id && (
                        <div className="mt-2 animate-[fadeIn_0.3s_ease-out]">
                          <p className="font-data text-xs text-brutal-bg/50 leading-relaxed">{project.summary}</p>
                          <p className="font-data text-[10px] text-brutal-bg/35 mt-1.5 uppercase tracking-widest">Built by {project.maker}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <Link to="/projects" className="inline-flex items-center gap-2 font-heading font-bold text-xs uppercase tracking-widest text-brutal-red hover:text-brutal-bg/60 transition-colors duration-300">
                  View All <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          </div>

          {/* Ranks */}
          <div className="border border-brutal-bg/10 rounded-2xl overflow-hidden bg-brutal-dark">
            <button onClick={() => setExpandedPanel(expandedPanel === 'ranks' ? null : 'ranks')} className="w-full flex items-center justify-between p-6 md:p-8 hover:bg-brutal-bg/[0.03] transition-colors duration-200">
              <div className="text-left">
                <h3 className="font-heading font-bold text-base uppercase tracking-tight">Rank Progression</h3>
                {expandedPanel !== 'ranks' && <p className="font-data text-xs text-brutal-bg/40 mt-1.5">6 ranks to unlock</p>}
              </div>
              <ChevronDown size={18} className={`flex-shrink-0 text-brutal-bg/40 transition-transform duration-300 ${expandedPanel === 'ranks' ? 'rotate-180' : ''}`} />
            </button>
            <div ref={rankPanelRef} className="overflow-hidden" style={{ height: 0 }}>
              <div className="px-6 md:px-8 pb-6 md:pb-8 border-t border-brutal-bg/8 pt-5">
                <div className="grid grid-cols-3 gap-4">
                  {RANK_ORDER.map((rank) => (
                    <RankNode key={rank} rank={rank} isExpanded={expandedRank === rank} onClick={() => setExpandedRank(expandedRank === rank ? null : rank)} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
