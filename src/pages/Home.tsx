import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { WelcomeHero } from '../components/home/WelcomeHero';
import { BuildQuestion } from '../components/home/BuildQuestion';
import { LivePulse } from '../components/home/LivePulse';
import { KnowMore } from '../components/home/KnowMore';

gsap.registerPlugin(ScrollTrigger);

/**
 * Home — The newcomer journey (v5 — Layer3 HUD pass)
 *
 * Four sections, no secondary nav slabs:
 *  1. WelcomeHero    → Auth-contextual hook. Logged-out: italic-serif "Welcome".
 *                       Logged-in: action headline "Build something today, NAME"
 *                       with Dashboard CTA. Recognition for authed users now
 *                       lives inside the Navbar via XPHudPill (no second row).
 *  2. BuildQuestion  → Spark: scatter-to-grid project tiles, "What would you
 *                       [build]?" rotating verb.
 *  3. LivePulse      → Proof of life: live activity + upcoming events.
 *  4. KnowMore       → Three connected node-cards (What is Param / The Maker
 *                       Loop / Six Ranks) collapsed by default, with the final
 *                       convert CTA strip ("You don't need permission...")
 *                       folded into its bottom — replacing the old standalone
 *                       ClosingCTA section.
 *
 * Tonal rhythm: dark (Hero + BuildQuestion) → light (LivePulse + KnowMore,
 * which closes with a dark convert strip). One major flip instead of two.
 */

export function Home() {
    return (
        <div className="flex-1 w-full bg-brutal-bg overflow-hidden relative">
            <WelcomeHero />
            <BuildQuestion />
            <LivePulse />
            <KnowMore />
        </div>
    );
}
