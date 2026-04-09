import { useEffect, useRef, useCallback, useState, lazy, Suspense } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import {
    ChevronDown, ArrowRight, Sparkles,
    Bot, Lightbulb, Cpu, Gamepad2,
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { Skeleton } from '../ui/Skeleton';
import { useHomeLive } from '../../lib/hooks/useHomeLive';
import { AUTH } from '../../lib/copy';

// Lazy-mount the 3D scene so it never blocks LCP. The headline GSAP timeline
// lands at ~2.5s — we boot the canvas after the headline reveal so the
// largest contentful paint is the italic-serif "Welcome", not the GLB load.
const InteractiveRobotSpline = lazy(() =>
    import('../ui/interactive-3d-robot').then((m) => ({ default: m.InteractiveRobotSpline }))
);

/**
 * Build-prompt chips — first-touch micro-commitment for the logged-out hero.
 * Same five originals, plus a sixth idle-rotating "the next thing" slot. The
 * rotation pool drives the sixth chip's label every 4s while idle, paused on
 * any chip hover/focus and frozen entirely under prefers-reduced-motion.
 */
interface BuildIntent {
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
    wildcard?: boolean;
    rotating?: boolean;
}
const BUILD_INTENTS: BuildIntent[] = [
    { label: 'a Robot',      icon: Bot },
    { label: 'a Smart Lamp', icon: Lightbulb },
    { label: 'an IoT Sensor', icon: Cpu },
    { label: 'a Game',       icon: Gamepad2 },
    { label: 'Surprise me',  icon: Sparkles, wildcard: true },
];
const ROTATING_POOL = [
    'the next thing', 'a wearable', 'a drone', 'a synth', 'a robotic arm',
    'an AR toy', 'a kinetic sculpture', 'a weather station', 'a chess engine',
];

// Wall-E / horror-house flicker — broken fluorescent tube struggling to live.
// Three acts over ~4.5s:
//   ACT I (0.00 → 0.25): brief sputters — short hits at varying mid intensities,
//     mostly dark, the bulb is "trying to come on".
//   ACT II (0.25 → 0.70): unstable sustained glow — mostly lit but the
//     intensity wavers continuously between 0.35 and 0.85, with two or three
//     dropouts to near-dark for 60-100ms each. This is the "horror room
//     overhead light" beat where you can SEE the room but it's not stable.
//   ACT III (0.70 → 1.00): the death — one last flare, two dim sputters,
//     dark.
// Each segment is held with a step ease so the value snaps at the END of
// the segment with no in-between tweening — the unevenness lives in the
// VALUES (varying mid-range), not in tween smoothness.
const FLICKER_KEYFRAMES: { t: number; o: number }[] = [
    // ACT I — sputters
    { t: 0.00, o: 0.00 },
    { t: 0.03, o: 0.55 },
    { t: 0.05, o: 0.00 },
    { t: 0.08, o: 0.20 },
    { t: 0.10, o: 0.00 },
    { t: 0.14, o: 0.70 },
    { t: 0.17, o: 0.10 },
    { t: 0.21, o: 0.45 },
    { t: 0.25, o: 0.00 },

    // ACT II — unstable sustained glow (mostly lit, varying mid intensities)
    { t: 0.28, o: 0.65 },
    { t: 0.31, o: 0.50 },
    { t: 0.34, o: 0.75 },
    { t: 0.36, o: 0.40 },
    { t: 0.39, o: 0.85 },
    { t: 0.41, o: 0.05 },  // dropout
    { t: 0.44, o: 0.70 },
    { t: 0.47, o: 0.55 },
    { t: 0.50, o: 0.80 },
    { t: 0.53, o: 0.45 },
    { t: 0.56, o: 0.10 },  // dropout
    { t: 0.58, o: 0.65 },
    { t: 0.62, o: 0.50 },
    { t: 0.65, o: 0.75 },
    { t: 0.68, o: 0.35 },
    { t: 0.70, o: 0.05 },  // dropout

    // ACT III — death
    { t: 0.74, o: 0.90 },  // last flare
    { t: 0.78, o: 0.00 },
    { t: 0.83, o: 0.30 },  // dim sputter
    { t: 0.86, o: 0.00 },
    { t: 0.91, o: 0.15 },  // dim sputter
    { t: 0.94, o: 0.00 },
    { t: 1.00, o: 0.00 },  // dead
];
const FLICKER_INTRO_DURATION = 4.5;

// Activity ticker shape — joined client-side to avoid PostgREST embed quirks
interface TickerEntry {
    name: string;
    title: string;
    minutesAgo: number;
}

/**
 * WelcomeHero — Viewport 1 (auth-contextual)
 *
 * Logged out (marketing): italic serif "Welcome to Param Makersadda" — the
 *   ONE place in the entire app where the dramatic serif voice is allowed.
 *   Now layered with: Wall-E flicker bulb on the robot's CLICK ME hand,
 *   cursor-reactive headline chars, second-row activity ticker, sixth
 *   rotating chip, picked-intent echo, and a mobile inline-SVG robot for
 *   the <md breakpoint where the GLB scene is cost-prohibitive.
 *
 * Logged in (HUD mode): unchanged — the navbar HUD pill already greets the
 *   user, so the hero pivots to action ("BUILD SOMETHING TODAY, {NAME}.").
 *
 * Every motion respects prefers-reduced-motion: the bulb freezes at 0.55,
 * the headline reveal lands instantly, the chip rotation freezes on the
 * first label, and the cursor glow disables.
 */

export function WelcomeHero() {
    const sectionRef = useRef<HTMLDivElement>(null);
    const glowRef = useRef<HTMLDivElement>(null);
    const headlineRef = useRef<HTMLHeadingElement>(null);
    const navigate = useNavigate();
    const { user, isLoading } = useAuth();

    // ── Reduced-motion gate ── one source of truth for every animation below
    const [reducedMotion, setReducedMotion] = useState(false);
    useEffect(() => {
        if (typeof window === 'undefined' || !window.matchMedia) return;
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        setReducedMotion(mq.matches);
        const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);

    // Touch detection — disables magnetic headline hover on phones
    const [isTouch, setIsTouch] = useState(false);
    useEffect(() => {
        if (typeof window === 'undefined') return;
        setIsTouch(window.matchMedia('(hover: none), (pointer: coarse)').matches);
    }, []);

    // Logged-out micro-commitment state — drives the Zeigarnik hook
    const [pickedIntent, setPickedIntent] = useState<string | null>(null);
    const [previewVisible, setPreviewVisible] = useState(false);

    // Live credibility marker — distinct makers active in the lab in the
    // last 24h, sourced directly from Supabase. Renders only when the count
    // is real and > 0. No fabrication.
    const [activeMakers, setActiveMakers] = useState<number | null>(null);
    const credCounterRef = useRef<HTMLSpanElement>(null);

    // Live activity ticker — most recent project-shipped events, joined
    // client-side to project titles and user names.
    const [tickerEntries, setTickerEntries] = useState<TickerEntry[] | null>(null);
    const [tickerIdx, setTickerIdx] = useState(0);

    // Sixth rotating chip — idle label cycles through ROTATING_POOL
    const [rotatingIdx, setRotatingIdx] = useState(0);
    const [chipRowHover, setChipRowHover] = useState(false);

    // Flicker amplitude (0..1) — written every rAF tick by the GSAP master,
    // read by the robot canvas to scale the EYE LIGHTS + headlight cone
    // opacity. The robot's existing flashlight system already knows how to
    // render the lights; we just feed it a non-uniform Wall-E flicker on
    // intro. After the intro the lights die and the head wakes up.
    const flickerRef = useRef(0);
    // Locked false until the flicker intro completes. The robot canvas
    // reads this and keeps the head looking DOWN (asleep) while the flicker
    // is running, then smoothly lerps back to cursor tracking after.
    const introDoneRef = useRef(false);

    // Lazy mount the heavy canvas after a small delay so it never blocks LCP.
    // `shouldMountCanvas` is a LATCH: once it goes true it stays true for the
    // lifetime of this component, even if `user` / `isLoading` later change.
    // That prevents React from tearing down the Suspense boundary (and with
    // it the Three.js WebGL context) on auth state transitions, which was
    // causing repeating "WebGLRenderer: Context Lost" + "THREE.Clock / PCF
    // SoftShadowMap deprecated" warnings once per remount.
    const [shouldMountCanvas, setShouldMountCanvas] = useState(false);
    useEffect(() => {
        if (shouldMountCanvas) return;          // already latched on
        if (isLoading) return;                  // wait for auth to resolve
        // Logged-out: delay 400ms so the headline wins LCP.
        // Logged-in: mount immediately (same behavior as the old else-branch).
        if (user) {
            setShouldMountCanvas(true);
            return;
        }
        const id = window.setTimeout(() => setShouldMountCanvas(true), 400);
        return () => window.clearTimeout(id);
    }, [user, isLoading, shouldMountCanvas]);

    // First name for personalized HUD greeting
    const firstName = user?.name?.split(' ')[0]?.toUpperCase() || 'MAKER';

    // ── Fetch active maker count — now sourced from the shared useHomeLive
    // hook so the hero and LivePulse share a single network call (see
    // src/lib/hooks/useHomeLive.ts). Keeps identical semantics: logged-in
    // users don't see the count, and we only surface it when > 0.
    const { activeMakers: sharedActiveMakers } = useHomeLive();
    useEffect(() => {
        if (user) return;
        if (sharedActiveMakers !== null) setActiveMakers(sharedActiveMakers);
    }, [user, sharedActiveMakers]);

    // ── Fetch live activity ticker — recent project-shipped xp_events, joined
    // client-side to project title and user name. NEVER fabricates: if the
    // join yields zero entries we set [] and the ticker simply doesn't render.
    useEffect(() => {
        if (user) return;
        let cancelled = false;
        async function fetchTicker() {
            const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
            const { data: events } = await supabase
                .from('xp_event')
                .select('user_id, reference_id, created_at, reference_type')
                .eq('reference_type', 'project')
                .gte('created_at', since)
                .order('created_at', { ascending: false })
                .limit(8);
            if (cancelled || !events || events.length === 0) {
                if (!cancelled) setTickerEntries([]);
                return;
            }
            const userIds = Array.from(new Set(events.map((e: any) => e.user_id).filter(Boolean)));
            const projectIds = Array.from(new Set(events.map((e: any) => e.reference_id).filter(Boolean)));
            const [{ data: users }, { data: projects }] = await Promise.all([
                supabase.from('app_user').select('id, name').in('id', userIds),
                supabase.from('project').select('id, title').in('id', projectIds),
            ]);
            if (cancelled) return;
            const userMap = new Map<string, string>((users || []).map((u: any) => [u.id, u.name]));
            const projectMap = new Map<string, string>((projects || []).map((p: any) => [p.id, p.title]));
            const now = Date.now();
            const built: TickerEntry[] = [];
            for (const ev of events as any[]) {
                const name = userMap.get(ev.user_id);
                const title = projectMap.get(ev.reference_id);
                if (!name || !title) continue;
                const minutesAgo = Math.max(1, Math.round((now - new Date(ev.created_at).getTime()) / 60000));
                built.push({ name: name.split(' ')[0], title, minutesAgo });
                if (built.length === 5) break;
            }
            setTickerEntries(built);
        }
        fetchTicker().catch(() => {
            // Network or RLS error → render nothing rather than fake content
            if (!cancelled) setTickerEntries([]);
        });
        return () => { cancelled = true; };
    }, [user]);

    // Crossfade ticker every 5s. Skipped under reduced motion (shows entry 0).
    useEffect(() => {
        if (!tickerEntries || tickerEntries.length < 2 || reducedMotion) return;
        const id = window.setInterval(() => {
            setTickerIdx((i) => (i + 1) % tickerEntries.length);
        }, 5000);
        return () => window.clearInterval(id);
    }, [tickerEntries, reducedMotion]);

    // Sixth chip — rotate label every 4s while idle, freeze on hover/focus or RM
    useEffect(() => {
        if (reducedMotion || chipRowHover || pickedIntent !== null || user) return;
        const id = window.setInterval(() => {
            setRotatingIdx((i) => (i + 1) % ROTATING_POOL.length);
        }, 4000);
        return () => window.clearInterval(id);
    }, [reducedMotion, chipRowHover, pickedIntent, user]);

    // ── Roll the credibility counter from 0 → real value once it lands,
    // and fade the pill in at the same time. The pill's entrance is owned
    // here (not in the master timeline) because it only renders after the
    // activeMakers query resolves — by then the master timeline has already
    // run, so we animate it on arrival instead of leaving it ungoverned. ──
    useEffect(() => {
        if (activeMakers === null || !credCounterRef.current) return;
        const credPill = sectionRef.current?.querySelector('.welcome-cred');
        if (reducedMotion) {
            credCounterRef.current.textContent = String(activeMakers);
            if (credPill) gsap.set(credPill, { opacity: 1, y: 0 });
            return;
        }
        if (credPill) {
            gsap.fromTo(
                credPill,
                { opacity: 0, y: 12 },
                { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out' },
            );
        }
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
    }, [activeMakers, reducedMotion]);

    // ── Master GSAP timeline — preserves every existing reveal verbatim,
    // then layers in the bulb flicker. The bulb writes amplitude into both
    // the overlay refs (HTML opacity) AND flickerRef (canvas Botón emissive)
    // so they stay perfectly in sync.
    useEffect(() => {
        if (isLoading) return;

        const ctx = gsap.context(() => {
            // Only tween selectors that actually match at least one element
            // in the section. Some welcome-* classes render conditionally
            // (e.g. .welcome-cred only when activeMakers > 0), so a naked
            // gsap.fromTo('.welcome-cred', ...) would log "GSAP target not
            // found" while that data is still loading.
            const root = sectionRef.current;
            type TweenVars = Parameters<typeof gsap.to>[1];
            const safeFromTo = (selector: string, fromVars: TweenVars, toVars: TweenVars) => {
                if (!root || root.querySelector(selector) == null) return;
                gsap.fromTo(selector, fromVars, toVars);
            };
            const safeSet = (selectors: string[], vars: TweenVars) => {
                if (!root) return;
                const existing = selectors.filter((s) => root.querySelector(s) != null);
                if (existing.length) gsap.set(existing, vars);
            };
            if (!user) {
                if (reducedMotion) {
                    // Freeze every existing reveal at its end state
                    safeSet([
                        '.welcome-char', '.welcome-subtitle', '.welcome-tagline',
                        '.welcome-cred', '.welcome-prompt-label', '.welcome-chip',
                        '.welcome-skip', '.welcome-signin', '.welcome-ticker',
                        '.welcome-scroll',
                    ], { opacity: 1, y: 0, rotateX: 0, scale: 1 });
                    // Reduced motion: skip the flicker entirely, lights start OFF
                    // (the user can still click the robot to turn them on).
                    // Head wakes up immediately — no "sleep" beat under RM.
                    flickerRef.current = 0;
                    introDoneRef.current = true;
                } else {
                    // ─── Logged-out marketing hero animation (preserved verbatim) ───
                    safeFromTo('.welcome-char',
                        { opacity: 0, y: 80, rotateX: -90, transformOrigin: '50% 100%' },
                        { opacity: 1, y: 0, rotateX: 0, duration: 0.7, stagger: 0.04, ease: 'power2.out', delay: 0.2 }
                    );
                    safeFromTo('.welcome-subtitle',
                        { opacity: 0, y: 30 },
                        { opacity: 1, y: 0, duration: 1, ease: 'power2.out', delay: 0.8 }
                    );
                    safeFromTo('.welcome-tagline',
                        { opacity: 0, y: 15 },
                        { opacity: 0.5, y: 0, duration: 1, ease: 'power2.out', delay: 1.2 }
                    );
                    safeFromTo('.welcome-cred',
                        { opacity: 0, y: 12 },
                        { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out', delay: 1.4 }
                    );
                    safeFromTo('.welcome-ticker',
                        { opacity: 0, y: 8 },
                        { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out', delay: 1.55 }
                    );
                    safeFromTo('.welcome-prompt-label',
                        { opacity: 0, y: 12 },
                        { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out', delay: 1.6 }
                    );
                    safeFromTo('.welcome-chip',
                        { opacity: 0, y: 18, scale: 0.92 },
                        { opacity: 1, y: 0, scale: 1, duration: 0.55, stagger: 0.07, ease: 'back.out(1.6)', delay: 1.8 }
                    );
                    safeFromTo('.welcome-skip',
                        { opacity: 0, y: 8 },
                        { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out', delay: 2.1 }
                    );
                    safeFromTo('.welcome-signin',
                        { opacity: 0 },
                        { opacity: 1, duration: 0.6, ease: 'power2.out', delay: 2.25 }
                    );
                    safeFromTo('.welcome-scroll',
                        { opacity: 0 },
                        { opacity: 1, duration: 1, delay: 2.5 }
                    );

                    // ─── Wall-E flicker intro: ~3s of random hard on/off
                    // flashes, then DEAD. Each segment uses steps(1) so the
                    // value snaps at the END of the segment with no tweening
                    // — that's what gives the broken-bulb feel instead of a
                    // smooth ramp. Final value is 0 so the headlights die. ───
                    const tl = gsap.timeline();
                    for (let i = 1; i < FLICKER_KEYFRAMES.length; i++) {
                        const prev = FLICKER_KEYFRAMES[i - 1];
                        const cur = FLICKER_KEYFRAMES[i];
                        const segDuration = Math.max(0.001, (cur.t - prev.t) * FLICKER_INTRO_DURATION);
                        tl.to(flickerRef, {
                            current: cur.o,
                            duration: segDuration,
                            ease: 'steps(1)',
                        });
                    }
                    // Hard kill — make sure we land at exactly 0, then wake
                    // the robot's head up so it starts tracking the cursor.
                    tl.set(flickerRef, { current: 0 });
                    tl.call(() => { introDoneRef.current = true; });
                }
            } else {
                // Logged-in users skip the flicker beat entirely — head
                // tracks the cursor from frame 0.
                introDoneRef.current = true;
                // ─── Logged-in action hero animation (unchanged) ───
                if (reducedMotion) {
                    safeSet(['.hud-eyebrow', '.hud-headline', '.hud-sub', '.hud-cta'],
                        { opacity: 1, y: 0 });
                } else {
                    safeFromTo('.hud-eyebrow',
                        { opacity: 0, y: 20 },
                        { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out', delay: 0.15 }
                    );
                    safeFromTo('.hud-headline',
                        { opacity: 0, y: 40 },
                        { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', delay: 0.3 }
                    );
                    safeFromTo('.hud-sub',
                        { opacity: 0, y: 20 },
                        { opacity: 0.6, y: 0, duration: 0.8, ease: 'power2.out', delay: 0.6 }
                    );
                    safeFromTo('.hud-cta',
                        { opacity: 0, y: 15 },
                        { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out', delay: 0.8 }
                    );
                }
            }

            // Dot grid drift — disabled under reduced motion
            if (!reducedMotion) {
                gsap.to('.hero-grid', {
                    backgroundPosition: '64px 64px',
                    duration: 25,
                    repeat: -1,
                    ease: 'none',
                });
            }
        }, sectionRef);
        return () => ctx.revert();
    }, [isLoading, user, reducedMotion]);

    // ── Cursor glow + magnetic headline ──
    // Reduced motion → no movement at all. Touch → no hover effect.
    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (reducedMotion) return;
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        if (glowRef.current) {
            glowRef.current.style.background =
                `radial-gradient(circle 600px at ${x}px ${y}px, rgba(196,41,30,0.04) 0%, transparent 70%)`;
        }
        // Magnetic headline: pass cursor position into CSS vars on the H1
        if (headlineRef.current && !isTouch) {
            const hRect = headlineRef.current.getBoundingClientRect();
            const mx = ((e.clientX - hRect.left) / hRect.width - 0.5) * 2;
            const my = ((e.clientY - hRect.top) / hRect.height - 0.5) * 2;
            headlineRef.current.style.setProperty('--mx', String(mx));
            headlineRef.current.style.setProperty('--my', String(my));
        }
    }, [reducedMotion, isTouch]);

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
        if (headlineRef.current) {
            headlineRef.current.style.setProperty('--mx', '0');
            headlineRef.current.style.setProperty('--my', '0');
        }
    }, []);

    const scrollDown = () => {
        document.getElementById('build-question')?.scrollIntoView({ behavior: 'smooth' });
    };

    // Handle chip click — Zeigarnik hook. The lurker has now "started" something;
    // signing up becomes the natural step to *finish* it. Picked-state echoes
    // the choice for 1.2s before exposing the commit button.
    const handleChipClick = (intent: string) => {
        let resolved = intent;
        if (intent === 'Surprise me') {
            const concrete = BUILD_INTENTS.filter(i => i.label !== 'Surprise me');
            resolved = concrete[Math.floor(Math.random() * concrete.length)].label;
        }
        setPickedIntent(resolved);
        setPreviewVisible(false);
        // Persist intent so downstream home sections (BuildQuestion) can bias
        // their content toward what the user just picked. sessionStorage only —
        // no cross-tab leakage, cleared when the tab closes.
        try {
            window.sessionStorage.setItem('param:pickedIntent', resolved);
        } catch { /* ignore */ }
        // Echo step: hold the picked state for 1.2s, then reveal the preview line
        const delay = reducedMotion ? 0 : 1200;
        window.setTimeout(() => setPreviewVisible(true), delay);
    };

    const handlePromptCommit = () => {
        if (!pickedIntent) return;
        navigate(`/register?intent=${encodeURIComponent(pickedIntent)}`);
    };

    // Split "Welcome" into chars (logged-out only). Each char gets its own
    // CSS-var-driven micro-translate so the headline reacts to the cursor.
    // Capped at 4px per axis so it never feels gimmicky. Disabled on touch
    // and on reduced motion via the parent --mx/--my vars staying at 0.
    const welcomeChars = 'Welcome'.split('').map((char, i) => (
        <span
            key={i}
            className="welcome-char inline-block"
            style={{
                perspective: '800px',
                transform: 'translate(calc(var(--mx, 0) * 4px), calc(var(--my, 0) * 4px))',
                transition: 'transform 200ms ease-out',
                textShadow:
                    'calc(var(--mx, 0) * 6px) calc(var(--my, 0) * 6px) 24px rgba(196,41,30,0.18)',
            }}
        >
            {char}
        </span>
    ));

    // Active ticker entry (with reduced-motion safe fallback to entry 0)
    const activeTicker =
        tickerEntries && tickerEntries.length > 0
            ? tickerEntries[reducedMotion ? 0 : tickerIdx % tickerEntries.length]
            : null;

    return (
        <section
            ref={sectionRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="min-h-[100dvh] w-full relative flex items-center px-6 md:px-12 lg:px-24 py-20 md:py-0"
        >
            {/* Dark bg with dot grid */}
            <div
                aria-hidden="true"
                className="hero-grid absolute inset-0 bg-brutal-dark"
                style={{
                    backgroundImage: 'radial-gradient(circle, rgba(245,243,238,0.04) 1px, transparent 1px)',
                    backgroundSize: '32px 32px',
                }}
            />

            {/* Cursor glow — decorative, hidden from AT */}
            <div
                ref={glowRef}
                aria-hidden="true"
                className="absolute inset-0 pointer-events-none z-[1]"
            />

            {/* 3D Robot — desktop only (md+). Lazy-mounted after the headline
                reveal so it cannot become the LCP villain. A still poster
                stands in until the canvas boots, reserving layout.

                IMPORTANT: the canvas is kept in a SINGLE <Suspense> boundary
                and gated by a single `shouldMountCanvas` flag so React never
                unmounts/remounts the Three.js renderer across auth / loading
                transitions. Every remount would destroy the WebGL context
                (the browser logs "THREE.WebGLRenderer: Context Lost") and
                re-run Three's module init, re-printing deprecation warnings.
                Holding the same element tree across state flips eliminates
                both symptoms. */}
            <div className="hidden md:block absolute top-0 bottom-0 left-0 right-0 z-[2]">
                {shouldMountCanvas ? (
                    <Suspense fallback={<RobotPoster />}>
                        <InteractiveRobotSpline
                            scene="https://prod.spline.design/PyzDhpQ9E5f1E3MT/scene.splinecode"
                            className="w-full h-full"
                            flickerRef={flickerRef}
                            introDoneRef={introDoneRef}
                        />
                    </Suspense>
                ) : (
                    <RobotPoster />
                )}

                {/* The flicker is rendered entirely inside the canvas via the
                    existing eye-light + cone shader, driven by flickerRef.
                    No HTML overlay — keeps the look consistent with the
                    intentional yellow headlight beams. */}
            </div>

            {/* ── Mobile robot (Option A) ──
                Inline SVG stylized robot above the headline on <md so the
                visual hierarchy stays robot → headline → tagline → chips → CTA.
                No new deps, ~3KB inline. Decorative for AT. */}
            {!user && (
                <div className="md:hidden absolute top-6 right-6 z-[3] pointer-events-none" aria-hidden="true">
                    <MobileRobot />
                </div>
            )}

            {/* Content — text sits above the robot canvas */}
            <div className="relative z-10 w-full max-w-7xl mx-auto pointer-events-none">
                <div className="w-full md:w-3/5 lg:w-1/2 max-w-3xl pointer-events-auto">

                    {!user ? (
                        // ─── LOGGED-OUT: italic-serif marketing hero ───
                        <>
                            <h1
                                ref={headlineRef}
                                className="font-drama italic text-4xl sm:text-6xl md:text-8xl lg:text-[8rem] text-brutal-bg leading-[0.95] tracking-tight"
                                style={{ ['--mx' as any]: 0, ['--my' as any]: 0 }}
                            >
                                {welcomeChars}
                            </h1>

                            <p className="welcome-subtitle font-drama italic text-xl sm:text-3xl md:text-5xl lg:text-6xl text-brutal-bg/70 leading-[1.1] mt-2 md:mt-4">
                                to <span className="text-brutal-bg">Param</span>{' '}
                                <span className="text-brutal-red">Makersadda.</span>
                            </p>

                            <p className="welcome-tagline font-data text-xs sm:text-sm md:text-base text-brutal-bg/50 mt-5 sm:mt-8 max-w-lg leading-relaxed">
                                Where makers build the future, together.
                            </p>

                            {/* ─── Live credibility marker (unchanged) ───
                                Real Supabase data, never renders if 0. The
                                pill is now wrapped in role=status / aria-live
                                so screen readers announce the count update. */}
                            {activeMakers !== null && activeMakers > 0 && (
                                <div
                                    role="status"
                                    aria-live="polite"
                                    className="welcome-cred mt-6 sm:mt-7 inline-flex items-center gap-2.5 pl-3 pr-3.5 py-1.5
                                                rounded-full border border-brutal-bg/15 bg-brutal-bg/5
                                                backdrop-blur-sm"
                                >
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

                            {/* ─── Live activity ticker (NEW) ──
                                Second row of credibility — most recent
                                project-shipped event from real xp_event data.
                                Crossfades every 5s. Reserves min-h so loading
                                doesn't cause CLS. Skeleton on first paint,
                                nothing rendered if the join yields 0. */}
                            <div className="welcome-ticker mt-3" style={{ minHeight: 22 }}>
                                {tickerEntries === null ? (
                                    <Skeleton variant="line" className="h-[14px] w-64" />
                                ) : activeTicker ? (
                                    <p
                                        role="status"
                                        aria-live="polite"
                                        key={tickerIdx}
                                        className="font-data text-[10px] sm:text-[11px] text-brutal-bg/55 uppercase tracking-wider animate-[fadeSlideIn_0.6s_ease-out_forwards]"
                                    >
                                        <span className="text-brutal-bg/85 font-bold">{activeTicker.name}</span>
                                        {' shipped '}
                                        <span className="text-brutal-bg/85">"{activeTicker.title}"</span>
                                        <span className="text-brutal-bg/40">{' · '}{activeTicker.minutesAgo} min ago</span>
                                    </p>
                                ) : null}
                            </div>

                            {/* ─── Build-prompt micro-commitment (Zeigarnik hook) ─── */}
                            <div className="mt-7 sm:mt-8 max-w-2xl">
                                {pickedIntent === null ? (
                                    <>
                                        <p className="welcome-prompt-label font-data text-[11px] sm:text-xs text-brutal-bg/55 uppercase tracking-[0.2em] mb-3 sm:mb-4">
                                            I want to build...
                                        </p>
                                        <div
                                            className="flex flex-wrap gap-2 sm:gap-2.5"
                                            onMouseEnter={() => setChipRowHover(true)}
                                            onMouseLeave={() => setChipRowHover(false)}
                                            onFocus={() => setChipRowHover(true)}
                                            onBlur={() => setChipRowHover(false)}
                                        >
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
                                                                    focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brutal-red
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

                                            {/* Sixth idle-rotating chip — italic, slight offset.
                                                Label cycles every 4s; freezes on hover/focus and
                                                under reduced motion. Click resolves to whatever
                                                label is currently shown. */}
                                            <button
                                                onClick={() => handleChipClick(ROTATING_POOL[rotatingIdx])}
                                                className="welcome-chip group/chip inline-flex items-center gap-1.5
                                                            px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full
                                                            border italic font-drama text-xs sm:text-sm
                                                            border-brutal-bg/12 bg-transparent text-brutal-bg/70
                                                            hover:bg-brutal-bg/8 hover:border-brutal-bg/30 hover:text-brutal-bg
                                                            transition-all duration-300 -translate-y-px
                                                            focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brutal-red"
                                                aria-label={`Suggest ${ROTATING_POOL[rotatingIdx]}`}
                                            >
                                                <ArrowRight size={11} className="opacity-60" />
                                                <span
                                                    key={rotatingIdx}
                                                    className="animate-[fadeSlideIn_0.5s_ease-out_forwards]"
                                                >
                                                    {ROTATING_POOL[rotatingIdx]}
                                                </span>
                                            </button>
                                        </div>

                                        {/* Fast-path: skip the chip game */}
                                        <Link
                                            to="/register"
                                            className="welcome-skip group/skip inline-flex items-center gap-1.5 mt-5 sm:mt-6
                                                       font-data text-[11px] sm:text-xs font-bold text-brutal-bg/55
                                                       hover:text-brutal-bg uppercase tracking-[0.18em]
                                                       underline-offset-4 hover:underline transition-colors duration-300
                                                       focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brutal-red"
                                        >
                                            Or just join the lab
                                            <ArrowRight size={12} className="group-hover/skip:translate-x-0.5 transition-transform duration-300" />
                                        </Link>

                                        {/* Returning member affordance — secondary, never competes */}
                                        <Link
                                            to="/login"
                                            className="welcome-signin block mt-2 font-data text-[10px] text-brutal-bg/35
                                                       hover:text-brutal-bg/80 transition-colors duration-300
                                                       focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brutal-red"
                                        >
                                            Already a member? {AUTH.signIn} →
                                        </Link>

                                        {/* SaaS trust line removed entirely per UX_MASTER §1A action plan step 1. */}
                                    </>
                                ) : (
                                    // Picked-state: chip lifts, soft commit prompt appears
                                    <div className="animate-[fadeSlideIn_0.5s_ease-out_forwards]">
                                        <p
                                            role="status"
                                            aria-live="polite"
                                            className="font-data text-[11px] sm:text-xs text-brutal-bg/55 uppercase tracking-[0.2em] mb-3 sm:mb-4"
                                        >
                                            You picked
                                        </p>
                                        <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full
                                                        border border-brutal-red/60 bg-brutal-red/15
                                                        font-data text-sm font-bold text-brutal-bg
                                                        shadow-[0_0_30px_rgba(196,41,30,0.25)]">
                                            <Sparkles size={13} className="text-brutal-red" />
                                            {pickedIntent}
                                        </div>

                                        {/* Echo line — held for 1.2s, then revealed. Widens
                                            the Zeigarnik gap by giving the user a visible
                                            artifact to "lose" if they bounce. */}
                                        {previewVisible && (
                                            <p className="mt-4 font-drama italic text-base sm:text-lg text-brutal-bg/75 animate-[fadeSlideIn_0.5s_ease-out_forwards]">
                                                we'll save{' '}
                                                <span className="text-brutal-bg">"{pickedIntent.toLowerCase()}"</span>
                                                {' '}to your maker journey →
                                            </p>
                                        )}

                                        <button
                                            onClick={handlePromptCommit}
                                            className="group/commit mt-5 inline-flex items-center gap-2.5
                                                       px-6 py-3 sm:px-7 sm:py-3.5 rounded-full
                                                       bg-brutal-red text-brutal-bg
                                                       font-heading font-bold text-xs sm:text-sm uppercase tracking-widest
                                                       hover:bg-brutal-bg hover:text-brutal-dark
                                                       transition-all duration-500
                                                       focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brutal-bg"
                                        >
                                            Save it. Join in 10 seconds
                                            <ArrowRight size={14} className="group-hover/commit:translate-x-1 transition-transform duration-300" />
                                        </button>

                                        <button
                                            onClick={() => { setPickedIntent(null); setPreviewVisible(false); }}
                                            className="block mt-3 font-data text-[11px] text-brutal-bg/45
                                                       hover:text-brutal-bg/80 underline-offset-4 hover:underline
                                                       transition-colors duration-300
                                                       focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brutal-red"
                                        >
                                            Pick something else
                                        </button>

                                        {/* SaaS trust line removed entirely per UX_MASTER §1A action plan step 1. */}
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        // ─── LOGGED-IN: action HUD hero (unchanged) ───
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
                                               transition-all duration-500 inline-flex items-center gap-2
                                               focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brutal-bg"
                                >
                                    Go to Dashboard
                                    <ArrowRight size={14} className="group-hover/cta:translate-x-1 transition-transform duration-300" />
                                </button>
                                <button
                                    onClick={() => navigate('/challenges')}
                                    className="font-data text-xs sm:text-sm font-bold text-brutal-bg/60 hover:text-brutal-bg
                                               uppercase tracking-widest underline-offset-4 hover:underline
                                               transition-colors duration-300
                                               focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brutal-red"
                                >
                                    Browse Challenges →
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Scroll indicator — logged-out only */}
            {!user && (
                <button
                    type="button"
                    onClick={scrollDown}
                    aria-label="Scroll to next section"
                    className="welcome-scroll absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2
                               focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brutal-red rounded"
                >
                    <span className="font-data text-[10px] font-bold text-brutal-bg/70 uppercase tracking-[0.3em]">Scroll</span>
                    <ChevronDown size={18} className="text-brutal-bg/70 animate-bounce" />
                </button>
            )}

            {/* Local keyframes — fadeSlideIn used by ticker, picked state, and rotating chip */}
            <style>{`
                @keyframes fadeSlideIn {
                    from { opacity: 0; transform: translateY(6px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @media (prefers-reduced-motion: reduce) {
                    .welcome-chip,
                    .welcome-scroll svg,
                    .hero-grid {
                        animation: none !important;
                        transition: none !important;
                    }
                }
            `}</style>
        </section>
    );
}

// ─── Robot poster placeholder ───
// Pure-CSS still that reserves the canvas slot before the lazy GLB boots.
// Prevents CLS and gives the LCP an immediate visual anchor on the right.
function RobotPoster() {
    return (
        <div
            aria-hidden="true"
            className="w-full h-full flex items-center justify-center"
        >
            <div
                style={{
                    width: 220,
                    height: 220,
                    borderRadius: '50%',
                    background:
                        'radial-gradient(circle, rgba(196,41,30,0.08) 0%, rgba(196,41,30,0) 70%)',
                    filter: 'blur(20px)',
                }}
            />
        </div>
    );
}

// ─── Mobile robot (Option A) ───
// Inline SVG stylized robot ~2KB, no new dependency. Sits above the headline
// on <md so the visual hierarchy on phones becomes robot → headline →
// tagline → chips → CTA. Yellow eye headlights match the desktop canvas.
function MobileRobot() {
    return (
        <div className="relative" style={{ width: 96, height: 96 }}>
            <svg viewBox="0 0 96 96" width={96} height={96} fill="none" aria-hidden="true">
                {/* Antenna */}
                <line x1="48" y1="6" x2="48" y2="16" stroke="#aaaaaa" strokeWidth="2" />
                <circle cx="48" cy="5" r="2" fill="#c4291e" />
                {/* Head */}
                <rect x="28" y="16" width="40" height="30" rx="6" fill="#cccccc" stroke="#888" strokeWidth="1.5" />
                {/* Eyes — random hard flicker for ~3s, then DEAD (calcMode discrete = no tweening) */}
                <circle cx="40" cy="32" r="4" fill="#ffcc00">
                    <animate
                        attributeName="opacity"
                        values="0;0.55;0;0.2;0;0.7;0.1;0.45;0;0.65;0.5;0.75;0.4;0.85;0.05;0.7;0.55;0.8;0.45;0.1;0.65;0.5;0.75;0.35;0.05;0.9;0;0.3;0;0.15;0;0"
                        keyTimes="0;0.03;0.05;0.08;0.10;0.14;0.17;0.21;0.25;0.28;0.31;0.34;0.36;0.39;0.41;0.44;0.47;0.50;0.53;0.56;0.58;0.62;0.65;0.68;0.70;0.74;0.78;0.83;0.86;0.91;0.94;1"
                        calcMode="discrete"
                        dur="4.5s"
                        begin="0s"
                        fill="freeze"
                    />
                </circle>
                <circle cx="56" cy="32" r="4" fill="#ffcc00">
                    <animate
                        attributeName="opacity"
                        values="0;0.55;0;0.2;0;0.7;0.1;0.45;0;0.65;0.5;0.75;0.4;0.85;0.05;0.7;0.55;0.8;0.45;0.1;0.65;0.5;0.75;0.35;0.05;0.9;0;0.3;0;0.15;0;0"
                        keyTimes="0;0.03;0.05;0.08;0.10;0.14;0.17;0.21;0.25;0.28;0.31;0.34;0.36;0.39;0.41;0.44;0.47;0.50;0.53;0.56;0.58;0.62;0.65;0.68;0.70;0.74;0.78;0.83;0.86;0.91;0.94;1"
                        calcMode="discrete"
                        dur="4.5s"
                        begin="0s"
                        fill="freeze"
                    />
                </circle>
                {/* Body */}
                <rect x="32" y="48" width="32" height="28" rx="4" fill="#bbbbbb" stroke="#888" strokeWidth="1.5" />
                {/* Arms */}
                <line x1="32" y1="54" x2="22" y2="66" stroke="#aaaaaa" strokeWidth="3" strokeLinecap="round" />
                <line x1="64" y1="54" x2="74" y2="66" stroke="#aaaaaa" strokeWidth="3" strokeLinecap="round" />
                {/* Feet */}
                <rect x="34" y="76" width="10" height="6" rx="1" fill="#888" />
                <rect x="52" y="76" width="10" height="6" rx="1" fill="#888" />
            </svg>
        </div>
    );
}
