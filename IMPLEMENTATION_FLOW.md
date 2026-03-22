# Landing Page Implementation Flow
### Zero-breakage, section-by-section rebuild

---

## Ground Rules

1. **No file is deleted.** Old components get commented out of `Home.tsx`, not removed from disk. They can be restored in one undo.
2. **No shared component is modified** — `Button`, `Card`, `Input`, `ParamLogo`, `RankBadge`, `Navbar`, `Footer`, `RootLayout` stay exactly as they are.
3. **No Tailwind token changes.** Same `brutal-bg`, `brutal-dark`, `brutal-red`, `brutal-paper`. Same `font-heading`, `font-drama`, `font-data`. Same `ease-magnetic`, `ease-spring`.
4. **No new npm dependencies.** Everything is built with what's already installed: GSAP 3.14.2 + ScrollTrigger, React 19, Tailwind 3.4, lucide-react.
5. **Every new component follows the exact same pattern** as existing ones: GSAP context with `ctx.revert()` cleanup, `useRef` for container scoping, ScrollTrigger registered at module level.

---

## Current Home.tsx Rendering Order

```
Home.tsx
│
├── Hero (100dvh)
│   ├── Background: Unsplash image + gradient overlay
│   ├── GSAP: .hero-text stagger (y:40→0, opacity:0→1, 1s, power3.out, stagger 0.08)
│   ├── Headline: "A Platform to build the Future."
│   ├── Paragraph: long mission statement
│   └── CTA: Button "Start As Curious" → /register
│
├── Features Section (py-32)
│   ├── Heading: "Core Capabilities Overview"
│   └── 3-col grid:
│       ├── DiagnosticShuffler (card-stack animation, 3s interval, ease-spring 700ms)
│       ├── TelemetryTypewriter (character-by-character, random 30-80ms per char)
│       └── CursorProtocolScheduler (GSAP timeline loop, multi-step cursor)
│
├── Philosophy (py-32, bg-brutal-dark)
│   ├── Background: Unsplash texture at 10% opacity
│   └── GSAP ScrollTrigger: .philosophy-word stagger (y:30→0, 0.8s, power3.out, start: top 60%)
│
└── Protocol (3 × 100dvh pinned cards)
    ├── GSAP ScrollTrigger: pin + scrub (scale→0.9, opacity→0.5, blur→20px)
    ├── Card 1: Tier 1 Explorer + spinning gear
    ├── Card 2: Tier 2 Builder + scanning line
    └── Card 3: Tier 3 Lab Pro + animated wave
```

---

## New Home.tsx Rendering Order

```
Home.tsx (rebuilt)
│
├── Section 1: Hero (100dvh)                    ← MODIFIED (same div, new content)
├── Section 2: MakerLoop (auto-height)          ← NEW component
├── Section 3: FeaturedProjects (auto-height)   ← NEW component
├── Section 4: RankPath (auto-height)            ← NEW component (absorbs Philosophy animation)
├── Section 5: LivePulse (auto-height)          ← NEW component (evolves TelemetryTypewriter)
└── Section 6: ClosingCTA (100dvh)              ← NEW component
```

---

## Animation Language (Lusion-Inspired Principles Applied to Your Stack)

Lusion's signature techniques, translated into what your GSAP + Tailwind stack can actually do:

| Lusion Technique | Your Implementation | GSAP Config |
|-----------------|---------------------|-------------|
| **Slow, cinematic scroll reveals** | Every section fades up from below as it enters viewport | `fromTo(el, {y:60, opacity:0}, {y:0, opacity:1, duration:1, ease:'power3.out'})` with ScrollTrigger `start: 'top 80%'` |
| **Staggered element entrances** | Cards, text blocks, stats enter one after another | `stagger: 0.12` on grouped elements |
| **Parallax depth layers** | Project cards at different scroll speeds | `ScrollTrigger` with `scrub: true`, different `y` offsets per card |
| **Smooth, deliberate pacing** | Generous vertical padding (8rem-10rem) between sections, no cramming | Tailwind `py-32` to `py-40`, `gap-16` |
| **Micro-interactions on hover** | Cards lift, shadows bloom, buttons scale | Your existing `interactive-lift` (translateY -1px) + `magnetic-btn` (scale 1.03) |
| **Scroll-progress awareness** | Thin red progress bar at top of viewport | New: 2px `brutal-red` bar, GSAP ScrollTrigger tied to document scroll height |
| **Count-up numbers** | Stats animate from 0 to final value | `gsap.to(ref, {innerText: 47, duration:1.5, snap:{innerText:1}})` with ScrollTrigger |
| **Section transitions** | Each section has a distinct background tone that creates rhythm | Alternating: cream → cream → cream → dark → cream → dark |

**Easing consistency:** All entrance animations use `power3.out` (your hero already uses this). All hover/interactive use `ease-magnetic` (your Button already uses this). Spring easing (`ease-spring`) reserved for playful elements like the card shuffler.

---

## Section-by-Section Build Spec

---

### SECTION 1: Hero (Modified)

**File:** `src/pages/Home.tsx` (edit in place)

**What changes:**
- Headline text: `"A Platform to build the"` → `"What would you build?"`
- Remove the long paragraph
- Remove `font-drama italic text-7xl "Future."` line
- CTA: `"Start As Curious"` → `"See How It Works ↓"` (scrolls to #maker-loop, not navigate)
- Background: Replace Unsplash `<img>` with CSS dot-grid pattern (no external dependency)
- Add: small `"PARAM MAKERSPACE"` wordmark above headline
- Add: 3-4 project showcase cards (static image placeholders for now)
- Add: scroll-down chevron with bounce animation
- Keep: `heroRef`, GSAP `.hero-text` stagger animation (same config, just targets new elements)

**GSAP animation (keep existing pattern):**
```
gsap.fromTo('.hero-text',
    { y: 40, opacity: 0 },
    { y: 0, opacity: 1, duration: 1, stagger: 0.08, ease: 'power3.out', delay: 0.2 }
);
```

**Layout:**
```
<div ref={heroRef} className="h-[100dvh] relative flex flex-col items-center justify-center px-6">
    {/* Dot grid background */}
    <div className="absolute inset-0 bg-brutal-dark"
         style={{backgroundImage:'radial-gradient(circle, rgba(245,243,238,0.07) 1px, transparent 1px)',
                 backgroundSize:'32px 32px'}} />

    {/* Wordmark */}
    <p className="hero-text relative z-10 font-data text-sm text-brutal-bg/50 uppercase tracking-[0.2em] mb-6">
        Param Makerspace
    </p>

    {/* Headline */}
    <h1 className="hero-text relative z-10 font-drama italic text-5xl md:text-7xl lg:text-8xl
                    text-brutal-bg text-center leading-tight max-w-4xl">
        What would you build?
    </h1>

    {/* Project showcase cards (placeholder) */}
    <div className="hero-text relative z-10 flex gap-4 mt-12 ...">
        {/* 3-4 cards with cover images, will connect to Supabase later */}
    </div>

    {/* CTA */}
    <button className="hero-text relative z-10 mt-10 ..."
            onClick={() => document.getElementById('maker-loop')?.scrollIntoView({behavior:'smooth'})}>
        See How It Works ↓
    </button>

    {/* Scroll indicator */}
    <div className="absolute bottom-8 animate-bounce">
        <ChevronDown className="w-6 h-6 text-brutal-bg/40" />
    </div>
</div>
```

**What breaks: Nothing.** Same `heroRef`, same GSAP context, same cleanup. Navbar still works (it checks `isHome` and `scrollY > 50`, both unchanged). Footer still renders after.

---

### SECTION 2: MakerLoop (New Component)

**File:** `src/components/home/MakerLoop.tsx` (new)

**Purpose:** 3-step visual explanation of the platform loop: Pick a Quest → Build & Document → Level Up

**Animation pattern:** Copies `Philosophy.tsx` scroll-trigger approach (already proven to work).

```typescript
// Same pattern as Philosophy.tsx
const containerRef = useRef<HTMLDivElement>(null);

useEffect(() => {
    const ctx = gsap.context(() => {
        gsap.fromTo('.loop-card',
            { y: 60, opacity: 0 },
            {
                y: 0, opacity: 1,
                duration: 0.8,
                stagger: 0.15,
                ease: 'power3.out',
                scrollTrigger: {
                    trigger: containerRef.current,
                    start: 'top 70%',
                }
            }
        );
    }, containerRef);
    return () => ctx.revert();
}, []);
```

**Layout:**
```
<section id="maker-loop" ref={containerRef} className="py-32 md:py-40 px-6 md:px-12 lg:px-24 bg-brutal-bg">
    <div className="max-w-6xl mx-auto">
        <h2 className="font-heading font-bold text-3xl md:text-5xl uppercase tracking-tight-heading">
            The Maker Loop
        </h2>
        <p className="font-data text-sm text-brutal-dark/50 mt-3 uppercase tracking-widest">
            How we work at Param
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            {STEPS.map(step => (
                <Card key={step.num} className="loop-card p-8 flex flex-col gap-6">
                    <span className="font-data text-4xl md:text-5xl font-bold text-brutal-red">
                        {step.num}
                    </span>
                    <h3 className="font-heading font-bold text-xl uppercase tracking-tight-heading">
                        {step.title}
                    </h3>
                    <p className="font-data text-sm text-brutal-dark/70 leading-relaxed">
                        {step.desc}
                    </p>
                    {/* Visual zone: each step has a small animation */}
                    <div className="h-40 bg-brutal-dark/5 rounded-2xl flex items-center justify-center">
                        {step.visual}
                    </div>
                </Card>
            ))}
        </div>
    </div>
</section>
```

**Step visuals (reuse existing animation patterns):**
- Step 1 "Pick a Quest": Reuse `DiagnosticShuffler` card-stack animation (same `setInterval` + `ease-spring` transition pattern) but with challenge card content instead of tier labels
- Step 2 "Build & Document": Simple animated progress bar that fills on loop (CSS keyframe, like the Protocol scan line)
- Step 3 "Level Up": XP counter that ticks up (reuse the count-up technique from Section 3) + rank badge icon

**What breaks: Nothing.** This is a new file. No existing file is touched. It's imported into Home.tsx as `<MakerLoop />`.

**Dependencies:** `Card` (already exists), `gsap` + `ScrollTrigger` (already installed).

---

### SECTION 3: FeaturedProjects (New Component)

**File:** `src/components/home/FeaturedProjects.tsx` (new)

**Purpose:** Social proof — show real projects + animated stats.

**Animation patterns used:**
- **Count-up numbers:** GSAP `innerText` snap animation (new, but trivial)
- **Card entrance stagger:** Same as MakerLoop (copy-paste ScrollTrigger pattern)
- **Parallax:** Cards at slightly different `y` offsets via `scrub: true` ScrollTrigger

```typescript
// Count-up animation for stats
useEffect(() => {
    const ctx = gsap.context(() => {
        // Stagger cards in
        gsap.fromTo('.project-card',
            { y: 60, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.8, stagger: 0.12, ease: 'power3.out',
              scrollTrigger: { trigger: containerRef.current, start: 'top 70%' } }
        );

        // Count-up stats
        gsap.from('.stat-number', {
            innerText: 0,
            duration: 1.5,
            snap: { innerText: 1 },
            ease: 'power2.out',
            scrollTrigger: { trigger: '.stat-number', start: 'top 85%' }
        });

        // Subtle parallax on cards
        gsap.utils.toArray<HTMLElement>('.project-card').forEach((card, i) => {
            gsap.to(card, {
                y: (i - 1) * -20,  // middle card stays, edges drift
                ease: 'none',
                scrollTrigger: {
                    trigger: containerRef.current,
                    start: 'top bottom',
                    end: 'bottom top',
                    scrub: 0.5,
                }
            });
        });
    }, containerRef);
    return () => ctx.revert();
}, []);
```

**Layout:**
```
<section ref={containerRef} className="py-32 md:py-40 px-6 md:px-12 lg:px-24 bg-brutal-bg">
    <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8 mb-16">
            <h2 className="font-heading font-bold text-3xl md:text-5xl uppercase tracking-tight-heading">
                What Makers Build
            </h2>
            <div className="flex gap-12">
                <div>
                    <span className="stat-number font-data text-4xl md:text-5xl font-bold">47</span>
                    <p className="font-data text-xs text-brutal-dark/50 uppercase tracking-widest mt-1">Projects Built</p>
                </div>
                <div>
                    <span className="stat-number font-data text-4xl md:text-5xl font-bold">12</span>
                    <p className="font-data text-xs text-brutal-dark/50 uppercase tracking-widest mt-1">Active Makers</p>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {FEATURED.map(project => (
                <Card key={project.id} className="project-card group overflow-hidden interactive-lift">
                    <div className="aspect-[4/3] bg-brutal-dark/10 overflow-hidden">
                        <img src={project.image} className="w-full h-full object-cover
                             group-hover:scale-105 transition-transform duration-500" />
                    </div>
                    <div className="p-6">
                        <span className="font-data text-xs text-brutal-red uppercase tracking-widest">
                            #{project.domain}
                        </span>
                        <h3 className="font-heading font-bold text-lg mt-2 tracking-tight-heading">
                            {project.title}
                        </h3>
                        <p className="font-data text-xs text-brutal-dark/50 mt-2">
                            Maker: {project.maker}
                        </p>
                    </div>
                </Card>
            ))}
        </div>

        <div className="text-center mt-12">
            <Link to="/projects" className="font-heading font-bold text-sm uppercase
                   tracking-widest text-brutal-dark hover:text-brutal-red transition-colors interactive-lift">
                Explore All Projects →
            </Link>
        </div>
    </div>
</section>
```

**Data:** Start with hardcoded `FEATURED` array (3 projects). Later, connect to `useProjects()` hook from `hooks.ts` to pull real Supabase data.

**What breaks: Nothing.** New file, new component.

---

### SECTION 4: RankPath (New Component)

**File:** `src/components/home/RankPath.tsx` (new)

**Purpose:** Show the 6-rank progression path. This replaces the old Protocol section's *content* but uses a different animation approach.

**Animation:** Absorbs the `Philosophy.tsx` word-reveal technique for the subtitle, plus a horizontal scroll reveal for the rank nodes.

**Reuses from codebase:**
- `RANK_ORDER` from `xpEngine.ts`
- `getBadgeIcon` from `badgeIcons.ts` (Compass, Wrench, Hammer, Cog, Lightbulb, Crown)
- `RANK_THRESHOLDS` for XP values

```typescript
import { RANK_ORDER, RANK_THRESHOLDS } from '../../lib/xpEngine';
import { getBadgeIcon } from '../../lib/badgeIcons';

const RANK_DETAILS: Record<string, string> = {
    'Curious':   'Attend intro workshops. Create your first maker profile.',
    'Tinkerer':  'Complete 3 basic projects. Verify 2 machine safety certs.',
    'Builder':   'Lead a small group project. Document 10 successful builds.',
    'Maker':     'Master 3 advanced fabrication tools. Contribute to the wiki.',
    'Innovator': 'Develop an original open-source tool or program.',
    'Lab Pro':   'Instruct 15 workshops. Oversee lab safety for 100+ hours.',
};
```

**Animation pattern:**
```typescript
useEffect(() => {
    const ctx = gsap.context(() => {
        // Subtitle words fade in (same as Philosophy)
        gsap.fromTo('.path-word',
            { opacity: 0, y: 20 },
            { opacity: 1, y: 0, duration: 0.6, stagger: 0.06, ease: 'power3.out',
              scrollTrigger: { trigger: containerRef.current, start: 'top 70%' } }
        );

        // Rank nodes stagger in from left
        gsap.fromTo('.rank-node',
            { x: -40, opacity: 0 },
            { x: 0, opacity: 1, duration: 0.6, stagger: 0.1, ease: 'power3.out',
              scrollTrigger: { trigger: '.rank-timeline', start: 'top 75%' } }
        );
    }, containerRef);
    return () => ctx.revert();
}, []);
```

**Layout:** Dark background section. Horizontal timeline on desktop, vertical on mobile. Each rank is a node with icon + name + unlock text.

```
<section ref={containerRef} className="py-32 md:py-40 px-6 md:px-12 lg:px-24 bg-brutal-dark text-brutal-bg relative overflow-hidden">
    {/* Subtle texture (same as Philosophy, reuse pattern) */}
    <div className="absolute inset-0 opacity-5"
         style={{backgroundImage:'radial-gradient(circle, rgba(245,243,238,0.15) 1px, transparent 1px)',
                 backgroundSize:'24px 24px'}} />

    <div className="relative z-10 max-w-6xl mx-auto">
        <h2 className="font-heading font-bold text-3xl md:text-5xl uppercase tracking-tight-heading text-brutal-bg">
            Your Path
        </h2>

        {/* Subtitle with word-reveal animation */}
        <p className="mt-4 font-drama italic text-2xl md:text-4xl text-brutal-bg/70 flex flex-wrap gap-x-2">
            {"Start as Curious. End as Lab Pro.".split(' ').map((word, i) => (
                <span key={i} className="path-word inline-block">{word}</span>
            ))}
        </p>

        {/* Rank timeline */}
        <div className="rank-timeline mt-16 flex flex-col md:flex-row gap-6 md:gap-0">
            {RANK_ORDER.map((rank, i) => {
                const Icon = getBadgeIcon({ name: rank, badge_type: 'achievement', domain: 'General' });
                return (
                    <div key={rank} className="rank-node flex-1 flex flex-col items-center text-center relative">
                        {/* Connector line (not on first) */}
                        {i > 0 && <div className="hidden md:block absolute top-6 right-1/2 w-full h-0.5 bg-brutal-red/30" />}

                        <div className="w-12 h-12 rounded-full border-2 border-brutal-bg/20 bg-brutal-bg/5
                                        flex items-center justify-center relative z-10">
                            <Icon size={20} className="text-brutal-bg/80" />
                        </div>
                        <h3 className="font-heading font-bold text-sm uppercase mt-3 tracking-tight-heading">
                            {rank}
                        </h3>
                        <p className="font-data text-xs text-brutal-bg/40 mt-2 max-w-[160px] leading-relaxed">
                            {RANK_DETAILS[rank]}
                        </p>
                        <span className="font-data text-[10px] text-brutal-red mt-2 uppercase">
                            {RANK_THRESHOLDS[rank]} XP
                        </span>
                    </div>
                );
            })}
        </div>
    </div>
</section>
```

**What breaks: Nothing.** New file. Imports only from `xpEngine.ts` and `badgeIcons.ts` which are library files not touched.

---

### SECTION 5: LivePulse (New Component)

**File:** `src/components/home/LivePulse.tsx` (new)

**Purpose:** Two-column: live activity feed + upcoming events. Shows the platform is alive.

**Reuses:**
- `TelemetryTypewriter` typewriter animation pattern (same `useState` + `setTimeout` character-by-character approach), but with **human-readable content** instead of terminal jargon
- `Card` component for both columns
- `Button` component for "View Full Calendar" link

**Activity feed data (replaces old FEED array):**
```typescript
const ACTIVITY_FEED = [
    { time: '5 min ago', text: 'elena_k uploaded a blueprint for "Solar Kiln v3"' },
    { time: '12 min ago', text: 'officerRobot.AI earned the "Laser Master" badge' },
    { time: '1 hr ago', text: 'Main Lab 3D Printer v2 is now available' },
    { time: '3 hr ago', text: 'julian_v completed the "Mechanical Kinematics" challenge' },
];

const UPCOMING_EVENTS = [
    { day: '24', month: 'MAR', title: 'Plasma Cutting Workshop', time: '1:00 – 3:00 PM' },
    { day: '28', month: 'MAR', title: 'Arduino Night', time: '7:00 – 9:00 PM' },
];
```

**Animation:** Same stagger entrance as other sections. The activity items also get a typewriter-style streaming effect (borrowed from TelemetryTypewriter's `setTimeout` pattern, simplified to reveal full lines instead of characters).

```typescript
useEffect(() => {
    const ctx = gsap.context(() => {
        gsap.fromTo('.pulse-col',
            { y: 60, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.8, stagger: 0.15, ease: 'power3.out',
              scrollTrigger: { trigger: containerRef.current, start: 'top 70%' } }
        );
    }, containerRef);
    return () => ctx.revert();
}, []);
```

**Layout:**
```
<section ref={containerRef} className="py-32 md:py-40 px-6 md:px-12 lg:px-24 bg-brutal-bg">
    <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left: Activity Feed */}
        <Card className="pulse-col bg-brutal-dark text-brutal-bg p-8">
            <div className="flex items-center gap-3 mb-8">
                <h3 className="font-heading font-bold text-sm uppercase tracking-tight-heading text-brutal-bg">
                    Live Activity
                </h3>
                <div className="flex items-center gap-2 px-3 py-1 bg-brutal-bg/10 rounded-full">
                    <div className="w-2 h-2 bg-brutal-red rounded-full animate-pulse" />
                    <span className="font-data text-[10px] tracking-widest uppercase">Live</span>
                </div>
            </div>
            {/* Activity items render here with streaming reveal */}
        </Card>

        {/* Right: Upcoming Events */}
        <Card className="pulse-col p-8">
            <h3 className="font-heading font-bold text-sm uppercase tracking-tight-heading mb-8">
                Upcoming
            </h3>
            {UPCOMING_EVENTS.map(event => (
                <div key={event.day} className="flex gap-6 items-start mb-6">
                    <div className="flex-shrink-0">
                        <span className="font-data text-3xl font-bold text-brutal-red block">{event.day}</span>
                        <span className="font-data text-xs text-brutal-dark/50 uppercase">{event.month}</span>
                    </div>
                    <div>
                        <h4 className="font-heading font-bold text-lg tracking-tight-heading">{event.title}</h4>
                        <p className="font-data text-xs text-brutal-dark/50 mt-1">{event.time}</p>
                    </div>
                </div>
            ))}
            <Link to="/events">
                <Button variant="outline" size="sm" className="w-full mt-4">
                    View Full Calendar →
                </Button>
            </Link>
        </Card>
    </div>
</section>
```

**What breaks: Nothing.** New file. `TelemetryTypewriter.tsx` is untouched on disk.

---

### SECTION 6: ClosingCTA (New Component)

**File:** `src/components/home/ClosingCTA.tsx` (new)

**Purpose:** Full-viewport closing conversion section.

**Animation:** Simple fade-in, same pattern as all other sections. Optional: reuse Philosophy word-reveal on the headline.

```typescript
useEffect(() => {
    const ctx = gsap.context(() => {
        gsap.fromTo('.cta-element',
            { y: 40, opacity: 0 },
            { y: 0, opacity: 1, duration: 1, stagger: 0.12, ease: 'power3.out',
              scrollTrigger: { trigger: containerRef.current, start: 'top 60%' } }
        );
    }, containerRef);
    return () => ctx.revert();
}, []);
```

**Layout:**
```
<section ref={containerRef} className="h-[100dvh] bg-brutal-dark text-brutal-bg
            flex flex-col items-center justify-center px-6 relative overflow-hidden">
    {/* Decorative floating shapes (pure CSS, low opacity) */}
    <div className="absolute inset-0 pointer-events-none">
        {/* 5-6 geometric shapes at 5% opacity — circles, hexagons — scattered */}
    </div>

    <h2 className="cta-element relative z-10 font-drama italic text-4xl md:text-6xl lg:text-7xl
                    text-brutal-bg text-center leading-tight max-w-3xl">
        Every Lab Pro started as Curious.
    </h2>

    <div className="cta-element relative z-10 mt-10">
        <Button size="lg" onClick={() => navigate('/register')}
                className="uppercase font-bold text-sm tracking-widest
                           shadow-[0_0_40px_rgba(196,41,30,0.3)]
                           hover:shadow-[0_0_60px_rgba(196,41,30,0.5)]">
            Create Your Account →
        </Button>
    </div>

    <Link to="/challenges"
          className="cta-element relative z-10 mt-4 font-data text-sm text-brutal-bg/50
                     hover:text-brutal-bg transition-colors underline-offset-4 hover:underline">
        Or explore challenges first →
    </Link>
</section>
```

**What breaks: Nothing.** New file. Uses existing `Button` and `navigate`.

---

### BONUS: Scroll Progress Bar (Optional, Add to RootLayout Later)

A thin 2px `brutal-red` line at the very top of the viewport. This goes in `RootLayout.tsx` eventually, but is LOW PRIORITY and can be added after all 6 sections are working.

```typescript
// In RootLayout, add after Navbar:
useEffect(() => {
    const bar = document.getElementById('scroll-progress');
    if (!bar) return;
    const update = () => {
        const h = document.documentElement.scrollHeight - window.innerHeight;
        bar.style.width = `${(window.scrollY / h) * 100}%`;
    };
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
}, []);

// JSX:
<div id="scroll-progress" className="fixed top-0 left-0 h-0.5 bg-brutal-red z-[9999] transition-none" />
```

---

## New Home.tsx (Final Structure)

```typescript
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ChevronDown } from 'lucide-react';
import { MakerLoop } from '../components/home/MakerLoop';
import { FeaturedProjects } from '../components/home/FeaturedProjects';
import { RankPath } from '../components/home/RankPath';
import { LivePulse } from '../components/home/LivePulse';
import { ClosingCTA } from '../components/home/ClosingCTA';

// Old imports — commented out, not deleted:
// import { DiagnosticShuffler } from '../components/home/DiagnosticShuffler';
// import { TelemetryTypewriter } from '../components/home/TelemetryTypewriter';
// import { CursorProtocolScheduler } from '../components/home/CursorProtocolScheduler';
// import { Philosophy } from '../components/home/Philosophy';
// import { Protocol } from '../components/home/Protocol';

gsap.registerPlugin(ScrollTrigger);

export function Home() {
    const navigate = useNavigate();
    const heroRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.fromTo('.hero-text',
                { y: 40, opacity: 0 },
                { y: 0, opacity: 1, duration: 1, stagger: 0.08, ease: 'power3.out', delay: 0.2 }
            );
        }, heroRef);
        return () => ctx.revert();
    }, []);

    return (
        <div className="flex-1 w-full bg-brutal-bg overflow-hidden relative">
            {/* S1: Hero */}
            <div ref={heroRef} className="h-[100dvh] relative flex flex-col items-center justify-center px-6">
                {/* ... hero content as specified above ... */}
            </div>

            {/* S2: Maker Loop */}
            <MakerLoop />

            {/* S3: Featured Projects */}
            <FeaturedProjects />

            {/* S4: Rank Path */}
            <RankPath />

            {/* S5: Live Pulse */}
            <LivePulse />

            {/* S6: Closing CTA */}
            <ClosingCTA />
        </div>
    );
}
```

---

## Build Order (Execute in This Sequence)

| Step | Action | Risk Level |
|------|--------|-----------|
| 1 | Create `MakerLoop.tsx` (new file, no imports change) | Zero — isolated |
| 2 | Create `FeaturedProjects.tsx` (new file) | Zero — isolated |
| 3 | Create `RankPath.tsx` (new file) | Zero — isolated |
| 4 | Create `LivePulse.tsx` (new file) | Zero — isolated |
| 5 | Create `ClosingCTA.tsx` (new file) | Zero — isolated |
| 6 | Edit `Home.tsx` — comment out old imports, add new imports, replace JSX | **Low** — this is the only edit to an existing file |
| 7 | Edit `Navbar.tsx` line 117 — "Start as Curious" → "Join the Lab" | **Trivial** — one string change |
| 8 | Test in browser — check each section renders, no console errors | Verification |
| 9 | Fine-tune animations — adjust timings, stagger values, thresholds | Polish |

Steps 1-5 can happen in parallel (all independent files). Step 6 is the only moment where the landing page visually changes. If anything goes wrong, uncommenting the old imports in Home.tsx restores the original instantly.

---

## Rollback Plan

If the new landing page has issues:

1. Open `Home.tsx`
2. Uncomment the old imports (`DiagnosticShuffler`, `TelemetryTypewriter`, `CursorProtocolScheduler`, `Philosophy`, `Protocol`)
3. Uncomment the old JSX (hero div, features section, Philosophy, Protocol)
4. Comment out the new imports and JSX

Total rollback time: ~30 seconds. No files were deleted, no shared components were changed.
