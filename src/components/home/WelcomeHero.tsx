import { useEffect, useRef, useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import {
    ChevronDown, ArrowRight, Sparkles,
    Bot, Lightbulb, Cpu, Gamepad2,
} from 'lucide-react';
import { InteractiveRobotSpline } from '../ui/interactive-3d-robot';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';

/**
 * Build-prompt chips — first-touch micro-commitment for the logged-out hero.
 * Deliberately maker-flavored, mostly concrete, one wildcard. Each chip carries
 * a Lucide icon for fast visual scanning (SOTA pattern from Linear / Vercel /
 * Notion chip and template grids — icon + label reads in ~100ms vs ~300ms
 * for text-only). The "Surprise me" wildcard uses Sparkles + a red accent to
 * mark its different role without breaking the row grid.
 */
interface BuildIntent {
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
    wildcard?: boolean;
}
const BUILD_INTENTS: BuildIntent[] = [
    { label: 'a Robot',      icon: Bot },
    { label: 'a Smart Lamp', icon: Lightbulb },
    { label: 'an IoT Sensor', icon: Cpu },
    { label: 'a Game',       icon: Gamepad2 },
    { label: 'Surprise me',  icon: Sparkles, wildcard: true },
];

/**
 * WelcomeHero — Viewport 1 (auth-contextual)
 *
 * Logged out (marketing): italic serif "Welcome to Param Makersadda" — the
 *   ONE place in the entire app where the dramatic serif voice is allowed.
 *   Scroll cue, secondary CTA, breathing accent line. Optimized for first
 *   impression / conversion.
 *
 * Logged in (HUD mode): the greeting is redundant — the navbar HUD pill
 *   already says hi. The hero pivots to an action headline ("THE LAB IS OPEN,
 *   {NAME}.") with a Dashboard primary CTA. No scroll cue, no red accent
 *   line — fewer red touches per viewport, per the audit.
 *
 * The 3D robot is always present and untouched in either state.
 */

export function WelcomeHero() {
    const sectionRef = useRef<HTMLDivElement>(null);
    const glowRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const { user, isLoading } = useAuth();

    // Logged-out micro-commitment state — drives the Zeigarnik hook
    const [pickedIntent, setPickedIntent] = useState<string | null>(null);

    // Live credibility marker — distinct makers active in the lab in the
    // last 24h, sourced directly from Supabase. Renders only when the count
    // is real and > 0. No fabrication.
    const [activeMakers, setActiveMakers] = useState<number | null>(null);
    const credCounterRef = useRef<HTMLSpanElement>(null);

    // First name for personalized HUD greeting
    const firstName = user?.name?.split(' ')[0]?.toUpperCase() || 'MAKER';

    // Fetch active maker count for the logged-out credibility marker
    useEffect(() => {
        if (user) return;
        let cancelled = false;
        async function fetchActiveMakers() {
            const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            const { data } = await supabase
                .from('xp_event')
                .select('user_id')
                .gte('created_at', since);
            if (cancelled) return;
            if (data) {
                const distinct = new Set(data.map((r: any) => r.user_id)).size;
                setActiveMakers(distinct);
            }
        }
        fetchActiveMakers();
        return () => { cancelled = true; };
    }, [user]);

    // Roll the credibility counter from 0 → real value once it lands
    useEffect(() => {
        if (activeMakers === null || !credCounterRef.current) return;
        const obj = { val: 0 };
        gsap.to(obj, {
            val: activeMakers,
            duration: 1.4,
            ease: 'power2.out',
            onUpdate: () => {
                if (credCounterRef.current) {
                    credCounterRef.current.textContent = String(Math.round(obj.val));
                }
            },
        });
    }, [activeMakers]);

    useEffect(() => {
        // Don't run animations until auth state is resolved — prevents the
        // logged-out hero flashing for a frame before the logged-in hero takes over.
        if (isLoading) return;

        const ctx = gsap.context(() => {
            if (!user) {
                // ─── Logged-out marketing hero animation ───
                gsap.fromTo('.welcome-char',
                    { opacity: 0, y: 80, rotateX: -90, transformOrigin: '50% 100%' },
                    {
                        opacity: 1, y: 0, rotateX: 0,
                        duration: 0.7, stagger: 0.04,
                        ease: 'power2.out', delay: 0.2,
                    }
                );
                gsap.fromTo('.welcome-subtitle',
                    { opacity: 0, y: 30 },
                    { opacity: 1, y: 0, duration: 1, ease: 'power2.out', delay: 0.8 }
                );
                gsap.fromTo('.welcome-tagline',
                    { opacity: 0, y: 15 },
                    { opacity: 0.5, y: 0, duration: 1, ease: 'power2.out', delay: 1.2 }
                );
                gsap.fromTo('.welcome-cred',
                    { opacity: 0, y: 12 },
                    { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out', delay: 1.4 }
                );
                gsap.fromTo('.welcome-prompt-label',
                    { opacity: 0, y: 12 },
                    { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out', delay: 1.6 }
                );
                gsap.fromTo('.welcome-chip',
                    { opacity: 0, y: 18, scale: 0.92 },
                    {
                        opacity: 1, y: 0, scale: 1,
                        duration: 0.55, stagger: 0.07,
                        ease: 'back.out(1.6)', delay: 1.8,
                    }
                );
                gsap.fromTo('.welcome-skip',
                    { opacity: 0, y: 8 },
                    { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out', delay: 2.1 }
                );
                gsap.fromTo('.welcome-trust',
                    { opacity: 0 },
                    { opacity: 1, duration: 0.7, ease: 'power2.out', delay: 2.25 }
                );
                gsap.fromTo('.welcome-scroll',
                    { opacity: 0 },
                    { opacity: 1, duration: 1, delay: 2.5 }
                );
            } else {
                // ─── Logged-in action hero animation ───
                gsap.fromTo('.hud-eyebrow',
                    { opacity: 0, y: 20 },
                    { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out', delay: 0.15 }
                );
                gsap.fromTo('.hud-headline',
                    { opacity: 0, y: 40 },
                    { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', delay: 0.3 }
                );
                gsap.fromTo('.hud-sub',
                    { opacity: 0, y: 20 },
                    { opacity: 0.6, y: 0, duration: 0.8, ease: 'power2.out', delay: 0.6 }
                );
                gsap.fromTo('.hud-cta',
                    { opacity: 0, y: 15 },
                    { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out', delay: 0.8 }
                );
            }

            // Dot grid drift — both states
            gsap.to('.hero-grid', {
                backgroundPosition: '64px 64px',
                duration: 25,
                repeat: -1,
                ease: 'none',
            });
        }, sectionRef);
        return () => ctx.revert();
    }, [isLoading, user]);

    // Cursor glow — subtle radial gradient follows mouse
    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!glowRef.current) return;
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        glowRef.current.style.background =
            `radial-gradient(circle 600px at ${x}px ${y}px, rgba(196,41,30,0.04) 0%, transparent 70%)`;
    }, []);

    const handleMouseLeave = useCallback(() => {
        if (glowRef.current) {
            gsap.to(glowRef.current, {
                opacity: 0, duration: 0.8, ease: 'power2.out',
                onComplete: () => {
                    if (glowRef.current) {
                        glowRef.current.style.background = 'transparent';
                        gsap.set(glowRef.current, { opacity: 1 });
                    }
                }
            });
        }
    }, []);

    const scrollDown = () => {
        document.getElementById('build-question')?.scrollIntoView({ behavior: 'smooth' });
    };

    // Handle chip click — Zeigarnik hook. The lurker has now "started" something;
    // signing up becomes the natural step to *finish* it. We pass the intent
    // through to /register as a query param so it can be displayed on the page
    // ("Saving 'a Robot' to your maker journey...") if Register is wired for it.
    const handleChipClick = (intent: string) => {
        let resolved = intent;
        if (intent === 'Surprise me') {
            // Pick one of the concrete intents at random
            const concrete = BUILD_INTENTS.filter(i => i.label !== 'Surprise me');
            resolved = concrete[Math.floor(Math.random() * concrete.length)].label;
        }
        setPickedIntent(resolved);
    };

    const handlePromptCommit = () => {
        if (!pickedIntent) return;
        navigate(`/register?intent=${encodeURIComponent(pickedIntent)}`);
    };

    // Split "Welcome" into chars (logged-out only)
    const welcomeChars = 'Welcome'.split('').map((char, i) => (
        <span
            key={i}
            className="welcome-char inline-block"
            style={{ perspective: '800px' }}
        >
            {char}
        </span>
    ));

    return (
        <section
            ref={sectionRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="min-h-[100dvh] w-full relative flex items-center px-6 md:px-12 lg:px-24 py-20 md:py-0"
        >
            {/* Dark bg with dot grid */}
            <div
                className="hero-grid absolute inset-0 bg-brutal-dark"
                style={{
                    backgroundImage: 'radial-gradient(circle, rgba(245,243,238,0.04) 1px, transparent 1px)',
                    backgroundSize: '32px 32px',
                }}
            />

            {/* Cursor glow */}
            <div
                ref={glowRef}
                className="absolute inset-0 pointer-events-none z-[1]"
            />

            {/* 3D Robot — always present, never touched */}
            <div className="hidden md:block absolute top-0 bottom-0 left-0 right-0 z-[2]">
                <InteractiveRobotSpline
                    scene="https://prod.spline.design/PyzDhpQ9E5f1E3MT/scene.splinecode"
                    className="w-full h-full"
                />
            </div>

            {/* Content — text sits above the robot canvas */}
            <div className="relative z-10 w-full max-w-7xl mx-auto pointer-events-none">
                <div className="w-full md:w-3/5 lg:w-1/2 max-w-3xl pointer-events-auto">

                    {!user ? (
                        // ─── LOGGED-OUT: italic-serif marketing hero ───
                        <>
                            <h1 className="font-drama italic text-4xl sm:text-6xl md:text-8xl lg:text-[8rem] text-brutal-bg leading-[0.95] tracking-tight">
                                {welcomeChars}
                            </h1>

                            <p className="welcome-subtitle font-drama italic text-xl sm:text-3xl md:text-5xl lg:text-6xl text-brutal-bg/70 leading-[1.1] mt-2 md:mt-4">
                                to <span className="text-brutal-bg">Param</span>{' '}
                                <span className="text-brutal-red">Makersadda.</span>
                            </p>

                            <p className="welcome-tagline font-data text-xs sm:text-sm md:text-base text-brutal-bg/50 mt-5 sm:mt-8 max-w-lg leading-relaxed">
                                Where makers build the future, together.
                            </p>

                            {/* ─── Live credibility marker ───
                                SOTA hero pattern (Linear, Stripe, Vercel, Layer3): a
                                single trust signal in the first viewport. Real Supabase
                                data — distinct makers active in the last 24h. Counter
                                rolls 0 → real value once it lands. Never renders if
                                the count is 0 (no fake credibility). */}
                            {activeMakers !== null && activeMakers > 0 && (
                                <div className="welcome-cred mt-6 sm:mt-7 inline-flex items-center gap-2.5 pl-3 pr-3.5 py-1.5
                                                rounded-full border border-brutal-bg/15 bg-brutal-bg/5
                                                backdrop-blur-sm">
                                    <span className="relative flex h-2 w-2 flex-shrink-0">
                                        <span className="absolute inline-flex h-full w-full rounded-full bg-brutal-red opacity-60 animate-ping" />
                                        <span className="relative inline-flex h-2 w-2 rounded-full bg-brutal-red" />
                                    </span>
                                    <span className="font-data text-[10px] sm:text-[11px] text-brutal-bg/75 uppercase tracking-wider">
                                        <span ref={credCounterRef} className="font-bold text-brutal-bg tabular-nums">0</span>
                                        <span className="text-brutal-bg/55">{' '}makers active in the lab today</span>
                                    </span>
                                </div>
                            )}

                            {/* ─── Build-prompt micro-commitment (Zeigarnik hook) ───
                                Replaces the old "See What's Possible" scroll button.
                                A first touch that costs the user nothing and turns
                                the eventual signup into "finish what you started." */}
                            <div className="mt-7 sm:mt-8 max-w-2xl">
                                {pickedIntent === null ? (
                                    <>
                                        <p className="welcome-prompt-label font-data text-[11px] sm:text-xs text-brutal-bg/55 uppercase tracking-[0.2em] mb-3 sm:mb-4">
                                            I want to build...
                                        </p>
                                        <div className="flex flex-wrap gap-2 sm:gap-2.5">
                                            {BUILD_INTENTS.map((intent) => {
                                                const Icon = intent.icon;
                                                return (
                                                    <button
                                                        key={intent.label}
                                                        onClick={() => handleChipClick(intent.label)}
                                                        className={`welcome-chip group/chip inline-flex items-center gap-1.5
                                                                    px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full
                                                                    border font-data text-xs sm:text-sm font-bold
                                                                    transition-all duration-300 hover:-translate-y-0.5
                                                                    ${intent.wildcard
                                                                        ? 'border-brutal-red/40 bg-brutal-red/10 text-brutal-bg hover:bg-brutal-red/20 hover:border-brutal-red/70'
                                                                        : 'border-brutal-bg/15 bg-brutal-bg/5 text-brutal-bg/85 hover:bg-brutal-bg/12 hover:border-brutal-bg/40 hover:text-brutal-bg'
                                                                    }`}
                                                    >
                                                        <Icon
                                                            size={13}
                                                            strokeWidth={2}
                                                            className={`${intent.wildcard ? 'text-brutal-red' : 'text-brutal-bg/55 group-hover/chip:text-brutal-bg/85'} transition-colors duration-300`}
                                                        />
                                                        {intent.label}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {/* Fast-path: skip the chip game and go straight to signup.
                                            SOTA primary+secondary CTA pattern. Honors users who are
                                            already convinced. */}
                                        <Link
                                            to="/register"
                                            className="welcome-skip group/skip inline-flex items-center gap-1.5 mt-5 sm:mt-6
                                                       font-data text-[11px] sm:text-xs font-bold text-brutal-bg/55
                                                       hover:text-brutal-bg uppercase tracking-[0.18em]
                                                       underline-offset-4 hover:underline transition-colors duration-300"
                                        >
                                            Or just join the lab
                                            <ArrowRight size={12} className="group-hover/skip:translate-x-0.5 transition-transform duration-300" />
                                        </Link>

                                        {/* Trust micro-text — anxiety reduction below the CTA pair.
                                            Smallest text on the page, but does the heavy lifting of
                                            dispelling hidden-friction worry (CRO best practice). */}
                                        <p className="welcome-trust mt-3 font-data text-[10px] text-brutal-bg/35 lowercase tracking-wide">
                                            free forever · no credit card · 10 second signup
                                        </p>
                                    </>
                                ) : (
                                    // Picked-state: chip lifts, soft commit prompt appears
                                    <div className="animate-[fadeSlideIn_0.5s_ease-out_forwards]">
                                        <p className="font-data text-[11px] sm:text-xs text-brutal-bg/55 uppercase tracking-[0.2em] mb-3 sm:mb-4">
                                            You picked
                                        </p>
                                        <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full
                                                        border border-brutal-red/60 bg-brutal-red/15
                                                        font-data text-sm font-bold text-brutal-bg
                                                        shadow-[0_0_30px_rgba(196,41,30,0.25)]">
                                            <Sparkles size={13} className="text-brutal-red" />
                                            {pickedIntent}
                                        </div>

                                        <button
                                            onClick={handlePromptCommit}
                                            className="group/commit mt-5 inline-flex items-center gap-2.5
                                                       px-6 py-3 sm:px-7 sm:py-3.5 rounded-full
                                                       bg-brutal-red text-brutal-bg
                                                       font-heading font-bold text-xs sm:text-sm uppercase tracking-widest
                                                       hover:bg-brutal-bg hover:text-brutal-dark
                                                       transition-all duration-500"
                                        >
                                            Save it. Join in 10 seconds
                                            <ArrowRight size={14} className="group-hover/commit:translate-x-1 transition-transform duration-300" />
                                        </button>

                                        <button
                                            onClick={() => setPickedIntent(null)}
                                            className="block mt-3 font-data text-[11px] text-brutal-bg/45
                                                       hover:text-brutal-bg/80 underline-offset-4 hover:underline
                                                       transition-colors duration-300"
                                        >
                                            Pick something else
                                        </button>

                                        {/* Trust micro-text — same reassurance in picked state.
                                            Anxiety reduction at the moment of decision. */}
                                        <p className="mt-4 font-data text-[10px] text-brutal-bg/35 lowercase tracking-wide">
                                            free forever · no credit card · 10 second signup
                                        </p>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        // ─── LOGGED-IN: action HUD hero ───
                        <>
                            <p className="hud-eyebrow font-data text-[11px] text-brutal-red uppercase tracking-[0.25em] mb-5">
                                The Lab Is Open
                            </p>

                            <h1 className="hud-headline font-heading font-bold uppercase tracking-tight-heading
                                           text-brutal-bg leading-[0.95]
                                           text-4xl sm:text-6xl md:text-7xl lg:text-[6rem]">
                                Build something
                                <br />
                                <span className="text-brutal-red">today, {firstName}.</span>
                            </h1>

                            <p className="hud-sub font-data text-xs sm:text-sm md:text-base text-brutal-bg leading-relaxed mt-6 max-w-md">
                                Pick up where you left off, or start a new challenge. The community is active right now.
                            </p>

                            <div className="hud-cta mt-8 sm:mt-10 flex items-center gap-4 flex-wrap">
                                <button
                                    onClick={() => navigate('/dashboard')}
                                    className="group/cta px-6 py-3 sm:px-8 sm:py-4 rounded-full bg-brutal-red text-brutal-bg
                                               font-heading font-bold text-xs sm:text-sm uppercase tracking-widest
                                               hover:bg-brutal-bg hover:text-brutal-dark
                                               transition-all duration-500 inline-flex items-center gap-2"
                                >
                                    Go to Dashboard
                                    <ArrowRight size={14} className="group-hover/cta:translate-x-1 transition-transform duration-300" />
                                </button>
                                <button
                                    onClick={() => navigate('/challenges')}
                                    className="font-data text-xs sm:text-sm font-bold text-brutal-bg/60 hover:text-brutal-bg
                                               uppercase tracking-widest underline-offset-4 hover:underline
                                               transition-colors duration-300"
                                >
                                    Browse Challenges →
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Scroll indicator — logged-out only. Logged-in users have an action,
                they don't need to be told to keep scrolling. */}
            {!user && (
                <div className="welcome-scroll absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2">
                    <span className="font-data text-[10px] font-bold text-brutal-bg/70 uppercase tracking-[0.3em]">Scroll</span>
                    <ChevronDown size={18} className="text-brutal-bg/70 animate-bounce" />
                </div>
            )}
        </section>
    );
}
