import { useEffect, useRef, useState, useCallback } from 'react';
import { gsap } from 'gsap';
import { ChevronDown } from 'lucide-react';
import { RobotScene } from './RobotScene';

/**
 * HeroSection — Full viewport hero with Go2 robot
 *
 * Layout: text on left (~50%), Go2 3D model on right (~50%)
 * The Go2 is embedded IN the hero (not a fixed overlay)
 * All entrance animations use CSS @keyframes only (no GSAP fromTo)
 */

const ROTATING_WORDS = ['build', 'create', 'invent', 'explore', 'design'];

function RotatingWord() {
  const [index, setIndex] = useState(0);
  const wordRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      if (wordRef.current) {
        gsap.to(wordRef.current, {
          y: -20, opacity: 0,
          duration: 0.35, ease: 'power2.in',
          onComplete: () => {
            setIndex(prev => (prev + 1) % ROTATING_WORDS.length);
            if (wordRef.current) {
              gsap.fromTo(wordRef.current,
                { y: 20, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.4, ease: 'power2.out' }
              );
            }
          }
        });
      }
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  return (
    <span ref={wordRef} className="inline-block text-brutal-red">
      {ROTATING_WORDS[index]}
    </span>
  );
}

// CSS keyframes for hero entrance
const HERO_KEYFRAMES = `
@keyframes heroReveal {
  from { transform: translateY(24px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
@keyframes heroLineGrow {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}
@keyframes heroLinePulse {
  0%, 100% { transform: scaleX(1); opacity: 0.6; }
  50% { transform: scaleX(0.6); opacity: 0.3; }
}
@keyframes heroDots {
  from { background-position: 0 0; }
  to { background-position: 64px 64px; }
}
`;

export function HeroSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!glowRef.current) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    glowRef.current.style.background =
      `radial-gradient(circle 500px at ${e.clientX - rect.left}px ${e.clientY - rect.top}px, rgba(196,41,30,0.04) 0%, transparent 70%)`;
  }, []);

  const scrollDown = () => {
    document.getElementById('discover-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section
      ref={sectionRef}
      onMouseMove={handleMouseMove}
      className="h-[100dvh] w-full relative flex overflow-hidden"
    >
      <style>{HERO_KEYFRAMES}</style>

      {/* Background: dark + dot grid */}
      <div
        className="absolute inset-0 bg-brutal-dark"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(245,243,238,0.04) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          animation: 'heroDots 25s linear infinite',
        }}
      />

      {/* Cursor glow overlay */}
      <div ref={glowRef} className="absolute inset-0 pointer-events-none z-[1]" />

      {/* ─── Left: Text content ─── */}
      <div className="relative z-10 flex items-center w-full lg:w-1/2 pl-6 sm:pl-8 md:pl-12 lg:pl-24 pr-4 sm:pr-6 md:pr-8">
        <div className="max-w-2xl">
          {/* Welcome */}
          <h1
            className="font-drama italic text-3xl sm:text-5xl md:text-7xl lg:text-[7rem] text-brutal-bg leading-[0.95] tracking-tight"
            style={{ animation: 'heroReveal 0.7s cubic-bezier(0.33,1,0.68,1) 0.1s both' }}
          >
            Welcome
          </h1>

          {/* Subtitle */}
          <p
            className="font-drama italic text-lg sm:text-2xl md:text-4xl lg:text-5xl text-brutal-bg/70 leading-[1.1] mt-2 md:mt-3"
            style={{ animation: 'heroReveal 0.7s cubic-bezier(0.33,1,0.68,1) 0.25s both' }}
          >
            to <span className="text-brutal-bg">Param</span>{' '}
            <span className="text-brutal-red">Makersadda.</span>
          </p>

          {/* Tagline */}
          <p
            className="font-data text-sm md:text-base text-brutal-bg/45 mt-6 max-w-md leading-relaxed"
            style={{ animation: 'heroReveal 0.6s cubic-bezier(0.33,1,0.68,1) 0.45s both' }}
          >
            Where makers build the future, together.
          </p>

          {/* Rotating word */}
          <div
            className="mt-8"
            style={{ animation: 'heroReveal 0.6s cubic-bezier(0.33,1,0.68,1) 0.55s both' }}
          >
            <p className="font-drama italic text-3xl md:text-4xl lg:text-[2.8rem] text-brutal-bg/75 leading-tight">
              What would you <RotatingWord />?
            </p>
          </div>

          {/* Accent line */}
          <div
            className="w-16 md:w-20 h-px bg-brutal-red/50 mt-6 origin-left"
            style={{
              animation: 'heroLineGrow 0.8s cubic-bezier(0.33,1,0.68,1) 0.6s both, heroLinePulse 4s ease-in-out 2s infinite',
            }}
          />

          {/* CTA */}
          <div style={{ animation: 'heroReveal 0.5s cubic-bezier(0.33,1,0.68,1) 0.7s both' }}>
            <button
              onClick={scrollDown}
              className="mt-6 px-8 py-4 rounded-full bg-brutal-red text-brutal-bg
                         font-heading font-bold text-sm uppercase tracking-widest
                         hover:bg-brutal-red/90 transition-all duration-300
                         hover:shadow-[0_0_30px_rgba(196,41,30,0.3)]"
            >
              Start Exploring
            </button>
          </div>
        </div>
      </div>

      {/* ─── Right: Go2 3D Robot ─── */}
      <div
        className="hidden lg:block relative z-10 w-full lg:w-1/2 h-full pointer-events-auto"
        style={{ animation: 'heroReveal 1s cubic-bezier(0.33,1,0.68,1) 0.3s both' }}
      >
        <RobotScene />
      </div>

      {/* Scroll indicator */}
      <div
        className="absolute bottom-6 left-1/2 lg:left-1/4 -translate-x-1/2 z-10 flex flex-col items-center gap-1.5"
        style={{ animation: 'heroReveal 0.5s cubic-bezier(0.33,1,0.68,1) 1s both' }}
      >
        <span className="font-data text-[10px] text-brutal-bg/20 uppercase tracking-[0.3em]">Scroll</span>
        <ChevronDown size={16} className="text-brutal-bg/20 animate-bounce" />
      </div>
    </section>
  );
}
