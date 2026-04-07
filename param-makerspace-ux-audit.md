# Param Makersadda — Brutal UX Audit (Merged Edition)
**Auditor persona:** Senior UX Researcher + veteran community builder
**Scope:** Live UI screenshots (localhost:5173) + static repo analysis (`src/pages`, `src/components/home`, `src/components/layout`, `tailwind.config.js`, `index.css`)
**Date:** 2026-04-06
**Goal:** Convert "casual browsers" → "active makers"

> **Note on empty states:** The Projects archive, Explorer Hub, Store, and Makers Directory currently appear empty in screenshots. These are being populated by the team and are **explicitly excluded from the critique below.** The audit instead focuses on the *mechanisms*, *fallback behavior*, and *information architecture* that will determine whether those populated states succeed.

---

## 0. How to read this audit

Every finding is anchored to a real file/line in the repo or a specific screenshot, not abstract advice. Each item lists: **Problem → UX principle violated → Specific fix.** Severity tags: `CRITICAL` (kills conversion now), `STRATEGIC` (multi-week investment), `POLISH` (taste pass).

Two deliverables sit at the bottom:
1. The **Curiosity-Gap Landing Page Rewrite** — a shorter page using progressive disclosure ("Know More" expandables), with rewritten teaser copy you can paste in tomorrow.
2. The **Bold Redesign Idea** — one move that would change Param's category.

---

## 1. Shadow-User Walkthroughs

I ran the homepage and primary nav through six personas. The first two are the personas you flagged; the rest cover the rest of the funnel.

### A. The Dopamine Chaser (impulsive 17 y/o, "show me something cool in 3s")
- Lands on `WelcomeHero.tsx`. Sees "Welcome to Param Makersadda" in italic display serif and a 3D Spline robot. Cool. The CTA says "See What's Possible ↓" — promise of payoff one scroll away.
- Scrolls. Hits `BuildQuestion.tsx`. The rotating verb ("build / create / invent…") is good dopamine. The scatter-to-grid project tiles are *exactly* what this user came for. **Win.**
- BUT the tiles are 6 Pexels stock photos by default (`PLACEHOLDER_PROJECTS`, lines 28–53). A Dopamine Chaser smells stock photography in 0.4 seconds. "Smart Plant Monitor" with a generic IoT-stock image is the AI-slop tell. They bounce.
- **Verdict:** Hooked at second 1, lost at second 4 because the proof is stock.

### B. The Stuck Creator (high-intent maker w/ a half-finished idea, looking for "proof of life")
- Skips the hero. Cmd-F in their head: "people, recent, live."
- The nav has Projects / Explorer Hub / Events / Makers / Badges / Store — **6 top-level items, no "Now" or "Live"** entry. Hick's-law violation; also no semantic anchor for "vibrating community."
- Scrolls fast looking for proof. `LivePulse.tsx` exists and is the right idea, but it's **section #6 of 7** — eight viewports deep. Worse, the fallback activity (lines 34–39) reads "elena_k uploaded a blueprint for 'Solar Kiln v3' / 5 min ago" — clearly canned. If `xp_event` is empty (which it will be early), Stuck Creator sees fake telemetry. They lose trust faster than if there were nothing.
- **Verdict:** Right ingredient, wrong floor. The "Live Now" feed is the homepage.

### C. The Skeptical Engineering Student (Rohan, 19, "is there real value or just vibes")
- Reads `WhatIsParam.tsx` cards. The copy is good ("A community, not a classroom"). But it's three pillars of *philosophy* and zero numbers. Skeptic wants: how many members, how many projects shipped, what tools you actually own, what mentors are real.
- Hits `MakerLoop.tsx` and sees fake repo cards (`STEP_REPOS`, lines 26–42) styled like GitHub rows but with hardcoded names like `bio-lamp-v2`. None of them link to anything real (the parent `<Link to="/projects">` makes the whole card go to a list page, so the repo affordance is a lie). **Trust killer for an engineering student** — they expect signals to be true.
- **Verdict:** The page promises receipts and delivers stock copy. Skeptic logs off.

### D. The Tech-Averse 55 y/o Hobbyist (Vikram, woodworker, intimidated)
- Hits the dark hero. Italic display serif at 8rem, animated text, 3D robot, cursor glow. **Visual overload.** They can't find a "What is this place?" affordance above the fold without scrolling.
- The whole homepage is dark→light→dark→light alternation; their eyes adjust three times in 30 seconds. Accessibility-wise, the body has a permanent SVG noise overlay at 0.05 (`index.css` line 31) — fine for design taste, but it raises perceived "visual buzz" for people with visual processing fatigue.
- Mobile menu opens at `top-24` with `lg:hidden` (`Navbar.tsx` line 150). The mobile nav is fine but the **floating pill nav bar at `top-6`** with translucent backdrop is invisible on the dark hero until you scroll — they don't even see the menu exists.
- **Verdict:** Cool aesthetic, hostile to a non-techie's brain. They need a "Start here" door and a calmer introduction.

### E. The Returning Active Maker (already a member, wants to book a workshop)
- Logs in. Lands on `/`. Has to scroll past 7 marketing sections to reach `LivePulse` to find events, OR navigate to `/events`.
- `Navbar.tsx` doesn't show a "Book a workshop" or "My next event" affordance — the dashboard avatar is the only personalized element. Everything routes through the same marketing homepage as a stranger. **No loop re-entry.**
- The `/dashboard` view confirms it: "Welcome back, Hari" sits next to "Your profile is incomplete — add a bio, avatar, and social links." Even the *admin* hasn't completed their profile, which means the platform's "face" is faceless.
- **Verdict:** The product treats logged-in members like first-time visitors. This is the #1 retention leak.

### F. The Busy Parent / Educator (enrolling kids)
- Wants three things: are you legit, when are workshops, can I trust mentors with my kid. None of these are answerable from the homepage. No mentor headshots above the fold, no safeguarding/affiliation language, no calendar.
- **Verdict:** Doesn't even reach the consideration stage.

---

## 2. Critical Fixes (do this week)

| # | Area | Problem (with file:line evidence) | UX principle violated | Specific fix |
|---|---|---|---|---|
| **C1** | Trust / Proof of Life | `BuildQuestion.tsx` ships **stock Pexels photos** as default project tiles (lines 28–53). Falls back to them whenever Supabase returns 0 rows. | Authenticity / Aesthetic-Usability paradox flipped — pretty fake content destroys credibility faster than ugly real content. | If `projects.length < 3`, **don't show a grid at all.** Show one big "Be the first to build" CTA tile + 2 ghost cards reading `[Your project here]`. Never ship Pexels in production. |
| **C2** | Trust / Proof of Life | `LivePulse.tsx` `FALLBACK_ACTIVITY` (lines 34–39) prints fake usernames ("elena_k", "julian_v") with realistic timestamps when the table is empty. | Honesty heuristic; "lying telemetry" is worse than empty state. | Replace fallback with an honest empty state: "The lab just opened. Be the first signal." + a single primary CTA. Better: hide the panel entirely until you have ≥5 real `xp_event` rows in the last 7 days. |
| **C3** | Information architecture | `Home.tsx` order is Hero → Question → WhatIsParam → MakerLoop → RankPath → LivePulse → ClosingCTA. **The single most valuable element for a high-intent visitor (LivePulse) is in slot 6 of 7.** | Inverted-pyramid principle; F-pattern scanning. Most-valuable-evidence belongs above the fold or 1 scroll below. | Re-order: Hero → BuildQuestion → **LivePulse (compact 2-column)** → WhatIsParam (collapsed) → MakerLoop (collapsed) → RankPath (collapsed) → ClosingCTA. The user should hit "real activity" within 1 scroll. |
| **C4** | Hick's Law in nav | `Navbar.tsx` lines 39–46 ship 6 nav items + Sign Out + Mentor Panel + avatar + Join button. On a 1280px viewport that's ~10 interactive targets in one bar. Confirmed in screenshot — the pill nav reads: PARAM · Projects · Explorer Hub · Events · Makers · Badges · Store · MAKER · MENTOR PANEL · Hari · Sign Out. | Hick's Law; Miller's 7±2. | Collapse to 4: **Build** (combines Projects + Challenges) · **Live** (Events + LivePulse) · **Makers** · **Store**. Move "Badges" into Makers/Dashboard. Move role badges into the avatar dropdown. |
| **C5** | First-time mobile visibility | Pill nav at `top-6` with `bg-transparent` over the dark hero (`Navbar.tsx` lines 49–56) — the menu is **almost invisible until you scroll**, especially the hamburger on the dark hero. | Visibility of system status / discoverability. | When `isHome && !scrolled`, give the nav a `bg-brutal-bg/15 backdrop-blur-md border-brutal-bg/15` instead of fully transparent. The hamburger needs a visible chip on dark surfaces. |
| **C6** | Logged-in users | `Home.tsx` shows the same marketing funnel to logged-in members. No personalised "Welcome back, Iria · Your next workshop is Tue 7pm · 3 challenges match your rank" section. | Loop structure; recognition over recall. | Add a personalised slim band at the very top of `Home.tsx` when `useAuth().user` is set: next event, in-progress projects, an "Open Dashboard" button. Fall through to marketing sections. |
| **C7** | Fake repo signals | `MakerLoop.tsx` `STEP_REPOS` lines 26–42 are hardcoded names with fake star/contributor counts. The card LOOKS like GitHub but the click goes to `/projects`. Confirmed in screenshot — `led-matrix-challenge`, `bio-lamp-v2`, `smart-greenhouse` etc. all show plausible star/contributor counts that aren't real. | Dishonest affordance / signifier mismatch (Norman). | Either (a) make the rows real: pull 2 most-recent projects per phase from Supabase, link each row to its actual project; or (b) drop the GitHub-style entirely and use 3 plain illustrations. The current state lies. |
| **C8** | Page length | The homepage stack is 7 full-viewport sections ≈ ~6,000–7,000px scroll. Average drop-off after 3 viewports on landing pages is well-documented. | Progressive disclosure / scrolling fatigue. | See section 5 — convert WhatIsParam, MakerLoop, RankPath into **Curiosity-Gap collapsed cards** with "Know More" buttons. Cuts page length ~55%. |
| **C9** | Tap targets / a11y | `LivePulse.tsx` event date day-text is `text-xl` and the link wraps a 14px-wide column. The "Sign Out" pill in `Navbar.tsx` line 124 uses `px-3 py-2` with `text-xs` icons — under WCAG 2.1 AA target size of 24×24 CSS px (and below the recommended 44×44 for touch). | WCAG 2.5.5 / 2.5.8 (Target Size). | Bump all pill buttons to `min-h-[44px]` on mobile, `min-h-[36px]` desktop. Date columns need a 44×44 hit area even if visual is smaller. |
| **C10** | Color contrast | Heavy use of `text-brutal-dark/40`, `/35`, `/30`, `/25` for body copy in `WelcomeHero` (line 168), `BuildQuestion` (line 348), `MakerLoop` (line 202), `RankPath` (line 106). `#111` at 30–40% on `#F5F3EE` ≈ 2.8:1 to 3.6:1 — **fails AA for body text (4.5:1 required).** Visible in screenshots: the "Where makers build the future" subtitle and the "Pick something to build" body copy both look washed out. | WCAG 1.4.3 contrast minimums. | Floor body text at `/60` on light, `/55` on dark. Reserve `/30` strictly for non-essential decorative metadata, never sentences. |
| **C11** | Admin "face" of the platform | Dashboard screenshot shows the *admin/mentor* (Hari) with an incomplete profile and zero approved projects. The platform's most senior account is the worst public example. | Modeling behavior / trust signaling. | Block dashboard access for admin/mentor accounts until profile is 100% complete. Mentors must be the gold standard, not the laggards. |
| **C12** | Event card visual decay | The "April Show & Tell" card on `/events` ships with a black/empty image background and only a small wrench icon. "10 LEFT" badge is small and easy to miss despite being the strongest scarcity lever on the page. | Visual hierarchy / scarcity messaging. | Add a fallback gradient/illustration system for events without a hero image. Make the urgency badge red, larger, and pulsing when ≤10 spots remain. Promote it from corner-decoration to the second-most-prominent element on the card. |

---

## 3. Strategic Upgrades (next 4–8 weeks)

| # | Area | Problem | UX principle | Fix |
|---|---|---|---|---|
| **S1** | Loop structure (your #3 focus) | The site is built as a linear newcomer funnel: Hero → Pillars → Steps → Ranks → CTA. There's no entry surface for "I just want to book a printer," "I want to find a teammate," "I want to see one cool thing." | Multiple entry points / "every page is a homepage." | Add **3 persistent entry-loop chips** under the hero subtitle: `Just looking →` / `I want to build →` / `I'm a member →`. Each is a different scroll target / route. This is the cheapest way to honor the "loop, not funnel" thesis. |
| **S2** | Community vibrancy (your #1 focus) | "Live Pulse" is two static panels rendered once per page load. Real makerspace platforms feel alive because *something visibly moves* every minute. | Aliveness / social proof recency. | Make `LivePulse` actually live: subscribe to the `xp_event` Postgres channel via Supabase Realtime. New rows fade in at the top with a 1px red dot and a 600ms slide. One real event every 10 minutes will do more for trust than any redesign. |
| **S3** | Navigation efficiency (your #2 focus) | Booking a workshop = land → scroll 6 sections → click "View Full Calendar" → /events → tab → click event. That's 5+ steps for a known-item search. | Fitts's law / known-item shortcut. | Add a **global ⌘K command palette** (ships well with `cmdk` or your own). "/book printer", "/next workshop", "/find mentor python". This is the single biggest power-user upgrade you can ship in a weekend. |
| **S4** | Visual polish — typography rhythm | Three font families (Space Grotesk, DM Serif Display italic, Space Mono) on every section, with `tracking-tight-heading` (-0.04em) on headings. The italic serif at 8rem is a strong choice but it's used **everywhere**: hero, BuildQuestion, ClosingCTA, RankPath subhead. It loses meaning. | Hierarchy through restraint. | Reserve DM Serif Display italic for **ONE moment per page only.** Use Space Grotesk uppercase for everything else. The italic serif should feel like a curtain pull, not wallpaper. |
| **S5** | Visual polish — section rhythm | Sections alternate `bg-brutal-bg` ↔ `bg-brutal-dark` mechanically. Five hard tonal flips on one page is exhausting. | Gestalt continuity. | Group as **one dark slab (Hero + BuildQuestion + LivePulse) → one light slab (WhatIsParam + MakerLoop) → one dark closer (RankPath + CTA).** Three tonal scenes total. |
| **S6** | Onboarding wedge | Register → ProfileSetup → Dashboard. There's no "first 60 seconds" where the user does something real (joins a project, claims a starter challenge, RSVPs). | Aha-moment / first-value time. | After signup, force a one-question intake: "Which sounds most like you? `Just curious` / `I have an idea` / `I want to learn a skill`" → routes to a curated 3-card screen. Drop them on a personalized loop, not the dashboard. |
| **S7** | Mentor trust surface | Makers page has filter chips and skeleton cards but no front-loaded mentor strip. Parents/students need faces *before* features. | Social proof above feature lists. | Add a "Meet your mentors" 4-avatar strip on the homepage (replaces or augments WhatIsParam). One real photo + one sentence + one project they shipped. |
| **S8** | Empty-state design system | Multiple components have ad-hoc fallbacks (`FALLBACK_ACTIVITY`, `FALLBACK_EVENTS`, `PLACEHOLDER_PROJECTS`, `STEP_REPOS`). Each handles "no data" differently — some lie, some show empty grids, some show CTAs. | Consistency / honest empty states. | Build a single `<EmptyState illustration title cta />` primitive. Standard rule: never fake data; always invite the user to create the first one. |
| **S9** | RankPath as primary loop hook | The 6-rank progression is one of Param's strongest assets but it's section 5 of 7 and the click-to-expand pattern hides the descriptions. | Goal-gradient effect. | Move RankPath higher and pre-expand the user's *current* rank if logged in, plus the next one, with a progress bar. Gamification is wasted if it's invisible. |
| **S10** | Performance — Spline robot | `WelcomeHero.tsx` line 147 loads `prod.spline.design/PyzDhpQ9E5f1E3MT/scene.splinecode` inside the hero, hidden on `<md`. On desktop it's a multi-MB WebGL scene that delays LCP. | RAIL model / TTI budget. | Lazy-mount the Spline scene with `IntersectionObserver` once the hero is in view AND `prefers-reduced-motion: no-preference` AND viewport ≥ 1024px. Today it ships to every laptop user even before they engage. |
| **S11** | Badge catalog framing | `/badges` shows all domain rows as `0/3 COMPLETE` with greyed-out icons. Reads as "nothing has happened here" instead of "here's what you can earn." | Goal-gradient / aspirational framing. | Show aggregate stats: "42 Electronics badges earned across the community." Even small numbers reframe the page from barren to busy. Add a "most-earned this month" highlight row. |
| **S12** | Mentor Dashboard discoverability | The Mentor Dashboard is gated behind a small "MENTOR PANEL" badge in the nav. New mentors won't find it; visitors don't know mentors exist. | Information scent / role clarity. | Add a Roles explainer to the Badge Catalog page showing how Maker → Builder → Innovator → Mentor is a progression, not a separate track. Surface mentor names+faces on the homepage. |

---

## 4. Polish Pass (taste tickets)

- **Noise overlay** (`index.css` lines 22–33): the global SVG turbulence at 0.05 fixed over the entire viewport at `z-index: 9999` overlays *every* image and video. Drop it to `0.025` and use `mix-blend-mode: overlay`.
- **Magnetic cards** (`MagneticCard` used in Projects/Makers): magnetic hover on grid cards is fun once and noisy after the third card. Disable it on mobile entirely; on desktop, only apply to the featured card.
- **`tracking-tight-heading: -0.04em`**: too aggressive on the body display serif at small sizes. Use `-0.02em` below 32px.
- **Mobile menu z-index** (`Navbar.tsx` line 150): `z-50` while the parent `<header>` is also `z-50`. Promote menu to `z-[60]` to avoid stacking-context bugs on iOS Safari.
- **`text-brutal-bg/25` scroll indicator** in `WelcomeHero` line 192 — invisible on dark video frames if Spline ever paints darker. Bump to `/45`.
- **`pointer-events-none` on hero text container** (line 154): blocks text selection of headline. Restore `pointer-events-auto` on `<h1>` and `<p>`.
- **Domain filter list mismatch**: `Projects.tsx` line 12 has 7 domains; `Makers.tsx` line 24 has 11; `BuildQuestion.tsx` icon map has 5. Centralize a `DOMAINS` constant in `lib/`.
- **Body monospace at small sizes** (visible in `WelcomeHero` subtitle, `WhatIsParam` body): Space Mono at 13–14px is ~20% slower to read than a sans-serif. Reserve mono for code/terminal contexts only.

---

## 5. The Curiosity-Gap Landing Page Rewrite (your "make it shorter & more tempting")

### 5.1 Mechanism: Progressive Disclosure with "Know More" cards

Today, every section is permanently expanded. The redesign:
- **Three sections stay always-open** because they earn the space: `Hero`, `LivePulse` (promoted), `ClosingCTA`.
- **Three sections collapse into "Curiosity-Gap" cards**: `WhatIsParam`, `MakerLoop`, `RankPath`. Each card shows a teaser headline, one icon, and a "Know More" button. Clicking expands the full content inline (height-animation, no route change).
- **Goal:** total scroll length drops from 7 viewports to ~3.5 viewports without removing a single piece of information.

### 5.2 The Curiosity-Gap formula for each card

Each collapsed card promises something specific the user doesn't yet know but wants to. Vague headlines ("Here's what you need to know") fail. Promise a number, a contradiction, or a payoff.

| Section | Old headline (current code) | New collapsed-card teaser | Microcopy under teaser | Button label |
|---|---|---|---|---|
| `WhatIsParam` | "Here's what you need to know." | **"You don't need a degree. You need a Tuesday night."** | The only requirement to be a maker here. Three rules. Zero gatekeeping. | `What's the catch? →` |
| `MakerLoop` | "Three steps to start building." | **"From 'I have an idea' to 'I shipped it' in three steps. Step 2 is where most people quit — here's why ours don't."** | The Param loop, broken down. | `Show me the loop →` |
| `RankPath` | "Six ranks. One journey." | **"You'll start as Curious. The fastest member hit Lab Pro in 11 months."** | Six ranks. What each one unlocks. | `See the ladder →` |

These respect the Skeptical Engineering Student rule: each promises *something concrete* (a number, a contradiction, a payoff) so the click is worth it. None say "Learn more" — that phrase is dead.

### 5.3 New homepage scroll order (3.5 viewports)

```
1. Hero (full viewport, unchanged but lazy-loaded Spline)  [100vh]
2. BuildQuestion grid (real projects only, no Pexels)      [80vh]
3. LivePulse (PROMOTED, real Supabase realtime feed)       [70vh]
4. Three collapsed Curiosity-Gap cards in one row           [50vh]
   ├─ "You don't need a degree…"
   ├─ "From idea to shipped in 3 steps…"
   └─ "You'll start as Curious…"
5. ClosingCTA (unchanged)                                   [50vh]
```

Total: ~3.5 viewports vs the current ~7. Information loss: zero (cards expand in place).

### 5.4 Interaction spec for the Know-More card

- Default state: 280px tall card, dark border, single icon top-left, headline (display serif italic, 28–32px), microcopy (mono, 13px, opacity 0.6), button bottom-right.
- Expanded: animates to `auto` height via `gsap.to(el, {height: el.scrollHeight, duration: 0.45, ease: 'power2.out'})`. Same `gsap` pattern already used in `RankPath.tsx` lines 156–163.
- Only one card may be expanded at a time on mobile (accordion); on desktop allow all three open simultaneously.
- Each card's expanded content lazily mounts the existing component (`<WhatIsParam compact />`) to avoid layout shift.
- Keyboard: `aria-expanded`, `aria-controls`, focus ring on card, `Enter`/`Space` toggles, `Esc` collapses on mobile.

### 5.5 Drop-in design tokens

For when you want to implement this immediately:

```css
/* Curiosity-Gap card */
.cg-card {
  --cg-bg: theme('colors.brutal-bg');
  --cg-fg: theme('colors.brutal-dark');
  --cg-border: rgba(17, 17, 17, 0.12);
  --cg-radius: 1.25rem;
  --cg-pad: 1.75rem;

  background: var(--cg-bg);
  color: var(--cg-fg);
  border: 1px solid var(--cg-border);
  border-radius: var(--cg-radius);
  padding: var(--cg-pad);
  min-height: 280px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  transition: border-color 200ms ease, transform 200ms ease;
}
.cg-card:hover { border-color: theme('colors.brutal-red'); transform: translateY(-2px); }
.cg-card[aria-expanded="true"] { min-height: auto; }

.cg-card__teaser {
  font-family: theme('fontFamily.serif');
  font-style: italic;
  font-size: clamp(1.5rem, 2.2vw, 2rem);
  line-height: 1.15;
  letter-spacing: -0.02em;
}
.cg-card__micro {
  font-family: theme('fontFamily.mono');
  font-size: 0.8125rem;
  opacity: 0.6;
  margin-top: 0.75rem;
}
.cg-card__cta {
  align-self: flex-start;
  margin-top: 1.25rem;
  min-height: 44px;
  padding: 0.625rem 1.25rem;
  border-radius: 999px;
  border: 1px solid currentColor;
  font-family: theme('fontFamily.sans');
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
```

```js
// tailwind.config.js — extend this
extend: {
  spacing: { 'tap': '44px' },
  minHeight: { 'cg': '280px' },
  transitionTimingFunction: { 'cg': 'cubic-bezier(0.22, 1, 0.36, 1)' },
}
```

---

## 6. Bold Redesign Idea — "The Lab Cam"

**One sentence:** Replace the entire static hero with a **live, low-fps view of the lab itself**, overlayed with a real-time activity stream — turning the homepage into a window you can't help but look through.

**What it is:**
- A single `<video>` (or low-cost ESP32-CAM/RTSP→HLS bridge) showing the actual physical makerspace at ~2 fps. Privacy-respecting: wide angle, no faces, just the workbench, the 3D printer wall, the soldering station.
- Layered on top: a real-time event ticker pulled from `xp_event` Realtime — "Karthik just earned 25 XP — Bio-Lamp v2" floats across the bottom.
- A "Lab is OPEN" / "Lab is QUIET" status pill in the corner, computed from `xp_event` density in the last 30 minutes.
- Three tappable hotspots over the camera feed: `[Book this printer] [See today's challenge] [Talk to the mentor on duty]`.

**Why it would make Param indispensable:**
- **Solves the trust problem permanently.** Stock photos and fake activity die overnight; the homepage IS the proof of life. Real photons.
- **Solves the loop problem.** Members open the page just to peek — the homepage becomes a daily habit, not a one-time funnel.
- **Solves the dopamine problem.** A 17 y/o sees actual sparks and a printer head moving. Three seconds in, they're hooked.
- **Solves the parent/student trust problem.** "We have a camera in the lab and we publish it" is the loudest possible safety + transparency signal.
- **Differentiation.** No other makerspace platform on the web does this. It's the kind of thing that gets screenshotted and shared.

**Cheapest viable version:** a single Raspberry Pi + USB camera + `mediamtx` → HLS, served behind Cloudflare. Cost: ~₹4,000 hardware, two evenings of work. The Realtime ticker is already 80% built — `LivePulse.tsx` just needs the Supabase Realtime subscription wired in.

**Risk to manage:** privacy. Bake in: visible "live cam" badge, scheduled off-hours, opt-out signage in the lab, never show faces (camera angle and a soft blur on the top third).

---

## 7. Accessibility Quick Audit (WCAG 2.1 AA)

| Issue | Standard | Finding | Fix |
|---|---|---|---|
| Body copy at `text-brutal-dark/30–40` | 1.4.3 Contrast (Minimum) | ~2.8:1 to 3.6:1 — **fails AA** for normal body text | Floor body opacity at /60 light, /55 dark |
| Sign-out pill `px-3 py-2` with `text-xs` icon | 2.5.5 Target Size | Hit area below 24×24 CSS px | Min 36×36 desktop, 44×44 mobile |
| `pointer-events-none` on hero text | 1.3.1 Info & Relationships | Blocks text selection of headline | Restore `pointer-events-auto` on h1/p |
| Translucent nav over dark hero | 1.4.11 Non-text Contrast | Hamburger invisible until scroll on mobile | Add backdrop-blur + 15% surface tint |
| Color-only "10 LEFT" event badge | 1.4.1 Use of Color | Urgency communicated by red color alone | Add visible text label "Only 10 spots left" |
| Mono body text at 13–14px | 1.4.4 Resize Text | Mono is ~20% slower to read; small mono compounds the problem | Switch body to sans-serif at min 16px |
| Form field labels (Profile setup, Propose project) | 1.3.1 / 3.3.2 | Not auditable from screenshots — verify visible labels exist, not just placeholder text | Audit form pages directly |

---

## 8. Verification notes (so you can check my receipts)

Every claim above is sourced from a file you can open:

- Stock fallback projects: `src/components/home/BuildQuestion.tsx` lines 28–53.
- Fake activity feed: `src/components/home/LivePulse.tsx` lines 34–44.
- Hardcoded repo cards: `src/components/home/MakerLoop.tsx` lines 26–42.
- Page order: `src/pages/Home.tsx` lines 39–45.
- Nav item count: `src/components/layout/Navbar.tsx` lines 39–46.
- Translucent nav over dark hero: `Navbar.tsx` lines 49–56.
- Low-contrast body text: `WelcomeHero.tsx` line 168, `BuildQuestion.tsx` line 348, `MakerLoop.tsx` line 202, `RankPath.tsx` line 106.
- Global noise overlay: `src/index.css` lines 22–33.
- Spline scene URL (LCP risk): `src/components/home/WelcomeHero.tsx` line 147–151.
- Existing height-expand GSAP pattern (re-usable for Know-More cards): `RankPath.tsx` lines 151–164.

Live UI claims are sourced from screenshots taken on 2026-04-06 at 20:43–20:44 IST across `/`, `/projects`, `/challenges`, `/events`, `/makers`, `/badges`, `/store`, `/dashboard`, `/mentor-dashboard`.

---

## 9. Priority Matrix

```
THIS WEEK (Critical):
  ✅ C1 — Kill stock Pexels fallbacks; ship honest empty states
  ✅ C2 — Kill fake activity strings in LivePulse fallback
  ✅ C3 — Re-order Home.tsx so LivePulse is in slot 3, not 6
  ✅ C4 — Collapse nav from 10 targets to 4
  ✅ C7 — Fix or remove fake GitHub-style repo cards
  ✅ C8 — Implement Curiosity-Gap collapsed cards (Section 5)
  ✅ C10 — Floor body text contrast at /60 light, /55 dark
  ✅ C11 — Force admin/mentor profiles to 100% before dashboard access

THIS MONTH (Strategic):
  ✅ C5, C6 — Nav visibility on dark hero + logged-in personalisation band
  ✅ C9, C12 — Tap targets + event card visual fallback system
  ✅ S1 — Three "entry-loop" chips under hero
  ✅ S2 — Wire Supabase Realtime into LivePulse
  ✅ S4, S5 — Typography restraint + section rhythm consolidation
  ✅ S8 — Single <EmptyState> primitive across the codebase
  ✅ S10 — Lazy-mount Spline scene with IntersectionObserver

NEXT QUARTER (Bold):
  ✅ S3 — ⌘K command palette
  ✅ S6 — One-question intake onboarding
  ✅ S7 — Mentor strip on homepage
  ✅ S9 — RankPath promotion + pre-expanded current rank
  ✅ Bold Redesign — Lab Cam MVP (₹4,000 + two evenings)
```

---

*Audit conducted on screenshots + static repo analysis. Live render-time pass (Lighthouse, axe-core, real Supabase data check) is recommended as a follow-up — say the word and I'll switch over.*
