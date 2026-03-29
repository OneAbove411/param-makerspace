import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { WelcomeHero } from '../components/home/WelcomeHero';
import { BuildQuestion } from '../components/home/BuildQuestion';
// WhyParam removed per redesign
import { WhatIsParam } from '../components/home/WhatIsParam';
import { MakerLoop } from '../components/home/MakerLoop';
import { FeaturedProjects } from '../components/home/FeaturedProjects';
import { RankPath } from '../components/home/RankPath';
import { LivePulse } from '../components/home/LivePulse';
import { ClosingCTA } from '../components/home/ClosingCTA';

gsap.registerPlugin(ScrollTrigger);

/**
 * Home — The newcomer journey (v3)
 *
 * Design philosophy (gsap.com-inspired):
 * - Each section has ONE focal animation or interactive element
 * - Scroll-triggered entrances, then STATIC (no continuous noise)
 * - Expandable only WHERE content is genuinely long
 * - Consistent animation language: power2.out entrances, 0.3-0.8s durations
 * - No decorative animations that compete with content
 *
 * Section flow:
 *   1. WelcomeHero     → Hook: "Welcome to Param Makersadda." (char-by-char reveal)
 *   2. BuildQuestion    → Spark: "What would you build?" (rotating word + orbit carousel)
 *   3. WhyParam         → Values: 3 statement pairs, all visible (no expand needed)
 *   4. WhatIsParam      → Explain: 3 pillar cards, all visible (content is short)
 *   5. MakerLoop        → Process: 3 steps with VISIBLE interactive demos
 *   6. FeaturedProjects  → Proof: real projects (expandable — images + summaries)
 *   7. RankPath         → Growth: 6 ranks (expandable — justified for 6 items)
 *   8. LivePulse        → Activity: live feed + events (expandable — feed is long)
 *   9. ClosingCTA       → Convert: clean dark section, one button
 */

export function Home() {
    return (
        <div className="flex-1 w-full bg-brutal-bg overflow-hidden relative">
            <WelcomeHero />
            <BuildQuestion />
            <WhatIsParam />
            <MakerLoop />
            <FeaturedProjects />
            <RankPath />
            <LivePulse />
            <ClosingCTA />
        </div>
    );
}
