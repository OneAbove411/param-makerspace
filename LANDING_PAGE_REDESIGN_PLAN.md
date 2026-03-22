# Landing Page Redesign Plan — Param Makerspace

## Status: PLAN ONLY — No code changes

---

## Part 1: Problem Diagnosis

### What Stitch Got Wrong (Hallucinations & Mismatches)

Based on the screenshots provided vs. the actual codebase at `param-ms.netlify.app`:

| Issue | Stitch Output | Your Actual Codebase |
|-------|--------------|---------------------|
| **Branding** | Uses "INDUSTRIAL ATELIER" and "PARAM" interchangeably, switches logo/wordmark between pages | Your brand is `PARAM` with a custom gear-crosshair SVG logo (`ParamLogo.tsx`). Navbar says "PARAM" with the logo icon. |
| **Font stack** | Uses a heavy serif display font (looks like Playfair Display or similar) for all headlines | Your fonts are `Space Grotesk` (headings), `DM Serif Display` (drama/italic), `Space Mono` (data/mono). Defined in `tailwind.config.js`. |
| **Color tokens** | Close but not exact — uses a slightly different cream, different red weight | Your tokens: `brutal-bg: #F5F3EE`, `brutal-dark: #111111`, `brutal-red: #C4291E`, `brutal-paper: #E8E4DD` |
| **Navbar structure** | Shows different nav items per page, inconsistent placement of XP badge, sometimes no XP pill | Your navbar: floating rounded-full, glassmorphic on scroll, always shows `Projects / Explorer Hub / Events / Makers / Badges / Store` + `RankBadge` pill + avatar |
| **Rank names** | Mixes "Curious/Tinkerer/Builder/Maker/Innovator/Lab Pro" with "Initiate/Master Smith/Artisan" | Your ranks are exactly: `Curious → Tinkerer → Builder → Maker → Innovator → Lab Pro` (from `xpEngine.ts`) |
| **Page concepts** | Invents "Craft" and "Inventory" nav items, "Warehouse Expansion Phase 2", blueprint repos | None of these exist in your codebase. Your pages: Home, Projects, Challenges (Explorer Hub), Events, Makers, Badges, Store, Dashboard |
| **Component style** | Uses thick black borders, sharp corners on many elements, heavy drop shadows | Your components use `border-2 border-brutal-dark/10`, `rounded-2xl`/`rounded-full`, soft `shadow-[0_8px_30px_rgb(0,0,0,0.04)]` |
| **Store page** | Shows physical tools (hydraulic press, caliper, anvil) with INR pricing | Your store exists but is digital/platform rewards, not physical tool retail |
| **Footer** | Sometimes "Industrial Atelier" / "2024 Industrial Atelier", inconsistent | Your footer: "PARAM." heading, platform description, "System Operational" indicator, Platform + Legal links |

### Why Copy-Paste Integration Failed

Stitch generates standalone HTML/CSS with hardcoded values. Your app is a React + TypeScript + Tailwind + GSAP + Supabase stack with:

1. **Custom design tokens** — Stitch doesn't know about `brutal-bg`, `brutal-red`, etc.
2. **Shared components** — `Button`, `Card`, `RankBadge`, `ParamLogo` are reused everywhere. Stitch recreates these from scratch with different styling.
3. **Auth-aware rendering** — Navbar shows different content for logged-in vs. logged-out users. Stitch doesn't account for this.
4. **GSAP animations** — Your existing hero has `gsap.fromTo` stagger animations, `ScrollTrigger` on Philosophy/Protocol sections. Stitch uses CSS animations that conflict.
5. **Font mismatch** — Stitch guesses fonts from screenshots. Your font assignments (`font-heading`, `font-drama`, `font-data`) are semantic classes, not inline styles.

---

## Part 2: What to Keep From Your Current Landing Page

These elements work and should be **preserved or evolved, not replaced**:

### Keep As-Is
- `ParamLogo` SVG component (gear-crosshair icon)
- `Navbar` structure (floating, glassmorphic, auth-aware, RankBadge pill)
- `Footer` component (dark rounded-top, "PARAM." heading, links)
- All Tailwind color tokens and font families
- GSAP as the animation library
- `Button`, `Card` component APIs
- The noise texture overlay (`body::before` in `index.css`)
- `interactive-lift` and `magnetic-btn` hover utilities

### Evolve (Modify, Don't Replace)
- `Home.tsx` — restructure sections, keep GSAP hero animation approach
- `DiagnosticShuffler` — repurpose the card-stack animation for "Maker Loop" demo
- `TelemetryTypewriter` — keep the live-feed typewriter, use for "Live Activity" section
- `CursorProtocolScheduler` — the cursor animation is clever but the "propose project" framing is unclear for new users; repurpose or replace with event scheduling demo
- `Philosophy` — the scroll-triggered word reveal is strong; rewrite copy to be user-benefit focused instead of platform-jargon focused
- `Protocol` — the pinned-card scroll effect is excellent; change the 3 tiers from abstract descriptions to concrete user actions

### Remove
- The "Core Capabilities Overview" heading and 3-column grid layout (too dashboard-like for a landing page)
- "Start As Curious" as the primary CTA label (meaningless to new visitors)
- The hero description paragraph (too long, reads like a mission statement)

---

## Part 3: Landing Page Section-by-Section Redesign Plan

### Section 0: Navbar (No changes needed for landing page)

Your current Navbar is already well-built. It handles:
- Transparent on home → glassmorphic on scroll
- Auth-aware (logged out: "Log In" + CTA, logged in: RankBadge + avatar + sign out)
- Mobile hamburger menu

**One CTA label change needed across the app (not just landing page):**
- Change "Start as Curious" → "Create Account" or "Join the Lab" in the navbar button for logged-out users. This is a one-line edit in `Navbar.tsx` (lines 115-118).

---

### Section 1: Hero (100vh) — "What Would You Build?"

**Current:** Dark background image, "A Platform to build the Future.", long description paragraph, "Start As Curious" button.

**New structure:**

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  PARAM MAKERSPACE          (small wordmark, top-left area)   │
│                                                              │
│         "What would you build?"                              │
│          (DM Serif Display, large, centered)                 │
│                                                              │
│  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐                        │
│  │proj │  │proj │  │proj │  │proj │   ← 3-4 project cards   │
│  │img 1│  │img 2│  │img 3│  │img 4│     auto-rotating       │
│  └─────┘  └─────┘  └─────┘  └─────┘                        │
│                                                              │
│         [ See How It Works ↓ ]                               │
│               (scroll anchor)                                │
│                                                              │
│              ↓ (bounce animation)                            │
└──────────────────────────────────────────────────────────────┘
```

**What to reuse:**
- Keep `heroRef` and `gsap.fromTo('.hero-text', ...)` stagger pattern from current `Home.tsx`
- Keep the dark background approach but swap the Unsplash image for a subtle CSS grid/dot pattern (no external image dependency)
- Keep `brutal-bg` text on dark background color scheme

**What to build new:**
- Project showcase: 3-4 cards that auto-fan or carousel. Can use the `DiagnosticShuffler` card-stack animation pattern (already cycles through items on an interval). Replace tier data with actual project image cards.
- "See How It Works ↓" smooth-scrolls to Section 2 (use `document.querySelector('#maker-loop').scrollIntoView({ behavior: 'smooth' })`)
- Scroll-down arrow with CSS bounce keyframe

**Stitch prompt for this section:**

```
CONTEXT: I'm redesigning the hero section of param-ms.netlify.app.

CONSTRAINTS — follow these EXACTLY:
- Fonts: "Space Grotesk" for the wordmark label, "DM Serif Display" for the main headline, "Space Mono" for any small labels
- Colors: background #111111, text #F5F3EE, accent #C4291E, cream #F5F3EE
- The brand wordmark "PARAM MAKERSPACE" should be small (16-18px, Space Grotesk, uppercase, letter-spacing 0.1em), positioned top-center or top-left of the hero
- The hero headline is: "What would you build?" in DM Serif Display, centered, large (clamp(3rem, 8vw, 6rem))
- Below the headline: 3-4 project showcase cards arranged horizontally with slight overlap/fan, each card showing a project thumbnail image (placeholder), project title, and a domain tag (e.g., "#ROBOTICS"). Cards should have rounded-2xl corners, 2px border with rgba(245,243,238,0.1), and a soft shadow
- Below the cards: a single CTA button that reads "See How It Works ↓" — rounded-full, #C4291E background, #F5F3EE text, Space Grotesk font, uppercase, letter-spacing 0.05em
- At the very bottom: a subtle scroll-down chevron with a CSS bounce animation (translateY 0 to 8px, infinite)
- Background: subtle CSS dot grid pattern (radial-gradient circles, 1px dots, 30px spacing, rgba(245,243,238,0.05)) on #111111. NO external images.
- The section is 100vh height, flexbox column, centered content
- NO navbar in this output — the navbar is handled separately
- Padding: 24px horizontal on mobile, 48px on tablet, 96px on desktop

DO NOT: use any font other than the three specified. Do not use Playfair Display, do not use Georgia, do not use Times New Roman. Do not change the color values. Do not add navigation elements.
```

---

### Section 2: "The Maker Loop" (auto-height) — Show, Don't Tell

**Current:** "Core Capabilities Overview" with 3 abstract cards (DiagnosticShuffler, TelemetryTypewriter, CursorProtocolScheduler)

**New:** A 3-step visual story explaining what users actually DO on the platform.

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│    THE MAKER LOOP                                            │
│    How we work at Param                                      │
│                                                              │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐               │
│  │    01     │    │    02     │    │    03     │              │
│  │           │    │           │    │           │              │
│  │ PICK A    │    │ BUILD &   │    │ LEVEL    │              │
│  │ QUEST     │    │ DOCUMENT  │    │ UP       │              │
│  │           │    │           │    │           │              │
│  │ Browse    │    │ Log your  │    │ Earn XP, │              │
│  │ challenges│    │ builds in │    │ unlock   │              │
│  │ matched   │    │ the Maker │    │ new ranks│              │
│  │ to your   │    │ Notebook. │    │ and      │              │
│  │ skill     │    │ Share     │    │ badges.  │              │
│  │ level.    │    │ progress. │    │          │              │
│  └──────────┘    └──────────┘    └──────────┘               │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**What to reuse:**
- The `Card` component for each step card
- GSAP ScrollTrigger for staggered reveal (same pattern as `Philosophy.tsx` word reveal)
- The visual animation ideas from DiagnosticShuffler (card stack for step 1), CursorProtocolScheduler (cursor interaction for step 2), and could show an XP bar filling animation for step 3

**What to build new:**
- 3 step cards with number, title, short description, and a small visual/animation inside each
- Section heading "THE MAKER LOOP" with subtitle "How we work at Param"
- Scroll-triggered stagger: each card fades up (y:40→0, opacity:0→1) with 0.15s stagger

**Stitch prompt for this section:**

```
CONTEXT: This is Section 2 of the Param Makerspace landing page. It explains the core user loop in 3 steps.

CONSTRAINTS:
- Background: #F5F3EE (cream)
- Section heading: "THE MAKER LOOP" in Space Grotesk, bold, uppercase, #111111, tracking -0.04em. Below it: "How we work at Param" in Space Mono, 14px, #111111 at 60% opacity
- Three cards in a horizontal row (stack vertically on mobile):
  - Card style: background #F5F3EE, border 2px solid rgba(17,17,17,0.1), border-radius 2rem, padding 32px, soft shadow (0 8px 30px rgba(0,0,0,0.04))
  - Each card has:
    - A step number ("01", "02", "03") in Space Mono, #C4291E, 48px bold
    - A title in Space Grotesk, bold, uppercase, 24px, #111111
    - A description in Space Grotesk, 16px, #111111 at 80% opacity, max 2 lines
    - A visual area (200px height) with a placeholder animation/illustration zone
  - Card 1: "PICK A QUEST" — "Browse challenges matched to your skill level. Start with Tier 1 Explorer missions."
  - Card 2: "BUILD & DOCUMENT" — "Log your milestones in the Maker Notebook. Sharing your failures is just as important."
  - Card 3: "LEVEL UP" — "Earn XP and convert your passion into Rank: Curious → Tinkerer → Builder → Maker → Innovator → Lab Pro."
- Section padding: 128px vertical, same horizontal as hero
- Grid: 3 columns on desktop (gap 32px), 1 column on mobile
- Fonts: Space Grotesk (headings/body), Space Mono (numbers/labels), DM Serif Display (NOT used here)
- Colors: only #F5F3EE, #111111, #C4291E

DO NOT: add a navbar, footer, or any branding elements. This is one isolated section.
```

---

### Section 3: "What Makers Build" (auto-height) — Social Proof

**Current:** No equivalent section.

**New:** Featured project cards with animated counters.

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  WHAT MAKERS BUILD                                           │
│                                                              │
│  47 projects built    12 makers leveling up                  │
│  (count-up animation on scroll enter)                        │
│                                                              │
│  ┌────────┐   ┌────────┐   ┌────────┐                       │
│  │        │   │        │   │        │                        │
│  │ Project│   │ Project│   │ Project│   ← 3 featured cards   │
│  │ Card 1 │   │ Card 2 │   │ Card 3 │     with parallax     │
│  │        │   │        │   │        │     depth on hover     │
│  └────────┘   └────────┘   └────────┘                       │
│                                                              │
│              [ Explore All Projects → ]                       │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**What to reuse:**
- The `Card` component
- GSAP ScrollTrigger for count-up animation
- Existing project card patterns from `Projects.tsx` (if any)
- Link to `/projects`

**What to build new:**
- Animated counter (GSAP `gsap.to` on a number ref, snapping to integers)
- 3 project cards with cover image, title, maker name, domain tag
- Subtle parallax: cards at slightly different `translateY` offsets that shift on scroll
- "Explore All Projects →" link using existing `Button` component with `variant="outline"`

**Stitch prompt for this section:**

```
CONTEXT: Section 3 of Param Makerspace landing page. Shows real projects built by community members as social proof.

CONSTRAINTS:
- Background: #F5F3EE
- Section heading: "WHAT MAKERS BUILD" — Space Grotesk, bold, uppercase, #111111, tracking -0.04em
- Stats row below heading: "47" and "12" as large numbers (Space Mono, bold, 48px, #111111) with labels below each ("PROJECTS BUILT" and "MAKERS LEVELING UP" in Space Mono, 11px, uppercase, #111111 at 50% opacity). Separated by a thin vertical line or generous gap.
- Three project cards in a row:
  - Each card: border-radius 2rem, border 2px solid rgba(17,17,17,0.1), overflow hidden
  - Top: image area (aspect-ratio 4/3, placeholder gray)
  - Bottom: padding 24px with:
    - Domain tag ("#ROBOTICS") in Space Mono, 11px, #C4291E, uppercase
    - Project title in Space Grotesk, bold, 20px, #111111
    - "Maker: [Name]" in Space Mono, 12px, #111111 at 50% opacity
  - On hover: card lifts 4px (translateY) and shadow deepens
- Below cards: "Explore All Projects →" — Space Grotesk, bold, 14px, uppercase, #111111, with arrow, no background, underline on hover. Centered.
- Section padding: 128px vertical
- 3-column grid on desktop, 1-column stack on mobile (gap 32px)

DO NOT: use any font other than Space Grotesk, Space Mono, DM Serif Display. Do not invent navigation or footer.
```

---

### Section 4: "Your Path" (auto-height) — The Rank Journey

**Current:** `Protocol.tsx` — 3 full-viewport pinned cards showing Tier 1/2/3 with abstract visualizations.

**New:** Horizontal rank progression path that makes sense because the user now understands the loop from Section 2.

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  YOUR PATH                                                   │
│  Start as Curious. End as Lab Pro.                           │
│                                                              │
│  ○ Curious → ○ Tinkerer → ○ Builder → ○ Maker → ○ Innovator → ● Lab Pro │
│                                                              │
│  Each node: icon + rank name + one-line unlock description   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**What to reuse:**
- `RankBadge` component (it has a `full` variant with a mini rank ladder — line 118-148 — that already renders all 6 ranks with icons)
- `RANK_ORDER` and `RANK_THRESHOLDS` from `xpEngine.ts`
- `getBadgeIcon` from `badgeIcons.ts` for each rank's icon
- GSAP ScrollTrigger (could keep the horizontal-scroll-pin concept from the Protocol component, but simplified)

**What to build new:**
- A horizontal path/timeline visualization with 6 nodes
- Each node: rank icon (from `getBadgeIcon`), rank name, one line about what unlocks
- Optional: horizontal scroll-pin (GSAP ScrollTrigger pin) where the section stays fixed while ranks scroll in

**Stitch prompt for this section:**

```
CONTEXT: Section 4 of Param Makerspace landing page. Shows the 6-rank progression path.

CONSTRAINTS:
- Background: #111111 (dark section for contrast)
- Text color: #F5F3EE
- Section heading: "YOUR PATH" — Space Grotesk, bold, uppercase, #F5F3EE
- Subtitle: "Start as Curious. End as Lab Pro." — DM Serif Display, italic, 32px, #F5F3EE at 80% opacity
- Horizontal timeline with 6 nodes connected by lines:
  - Ranks (left to right): Curious, Tinkerer, Builder, Maker, Innovator, Lab Pro
  - Each node: a circle (48px) with an icon placeholder, rank name below (Space Grotesk, bold, 14px, uppercase), one-line description below that (Space Mono, 12px, at 60% opacity)
  - Unlocks per rank:
    - Curious: "Attend intro workshops. Create your first maker profile."
    - Tinkerer: "Complete 3 basic projects. Verify 2 machine safety certifications."
    - Builder: "Lead a small group project. Document 10 successful builds."
    - Maker: "Master 3 advanced fabrication tools. Contribute to the community wiki."
    - Innovator: "Develop an original open-source tool or program."
    - Lab Pro: "Instruct 15 workshops and oversee lab safety for 100+ hours."
  - Connecting line: 2px solid #C4291E between nodes
  - First 2 nodes (#F5F3EE fill) are "active" styled, rest are dimmed (at 40% opacity) to suggest progression
- On mobile: vertical timeline (nodes stack vertically)
- Section padding: 128px vertical

DO NOT: change the rank names. Do not add extra ranks. Do not use any font other than the three specified.
```

---

### Section 5: "Live Pulse" (auto-height) — Community Activity

**Current:** `TelemetryTypewriter` (terminal-style live feed) + `CursorProtocolScheduler` (cursor animation) exist as cards in the 3-column grid.

**New:** Side-by-side "Live Activity" feed + "Upcoming Events" panel.

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  ┌─── LIVE ACTIVITY ────────┐  ┌─── UPCOMING ──────────┐    │
│  │                          │  │                        │    │
│  │  > user_x uploaded a     │  │  MAR 24  PLASMA CUTTING│    │
│  │    blueprint for "Solar  │  │          WORKSHOP      │    │
│  │    Kiln v3"              │  │          1:00 - 3:00PM │    │
│  │                          │  │                        │    │
│  │  > maker_y earned the    │  │  MAR 28  ARDUINO NIGHT │    │
│  │    "Laser Master" badge  │  │          7:00 - 9:00PM │    │
│  │                          │  │                        │    │
│  │  > Build Lab 3D Printer  │  │                        │    │
│  │    v2 is now available   │  │  [ VIEW FULL CALENDAR ]│    │
│  │                          │  │                        │    │
│  └──────────────────────────┘  └────────────────────────┘    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**What to reuse:**
- `TelemetryTypewriter` component — the typewriter effect is distinctive. Modify the FEED array content to be more human-readable (current feed is too terminal-jargon: "INITIALIZING EVENT SUBSYSTEM")
- `CursorProtocolScheduler` — replace with an actual upcoming events list (or simplify to show real event data if available from Supabase)
- The `Card` component for both panels

**What to build new:**
- 2-column layout (1 column on mobile)
- Left: activity feed with typewriter/streaming text effect (evolve TelemetryTypewriter)
- Right: upcoming events with dates, formatted cleanly
- "View Full Calendar →" link to `/events`

**Stitch prompt for this section:**

```
CONTEXT: Section 5 of Param Makerspace landing page. Shows real-time community activity and upcoming events.

CONSTRAINTS:
- Background: #F5F3EE
- Two-column layout (50/50), stacks on mobile
- LEFT COLUMN — "LIVE ACTIVITY":
  - Card: background #111111, text #F5F3EE, border-radius 2rem, padding 32px
  - Header: "LIVE ACTIVITY" in Space Grotesk, bold, 14px, uppercase, with a red dot (8px circle, #C4291E) with pulse animation next to it
  - Content: 3-4 activity items in Space Mono, 14px, #F5F3EE at 80% opacity, each prefixed with a timestamp ("5 MIN AGO" in 11px, #F5F3EE at 40% opacity)
  - Activity examples:
    - "elena_k uploaded a blueprint for Project Kiln v3"
    - "officerRobot.AI earned the 'Laser Master' badge ⚡"
    - "Main Lab 3D Printer v2 is now available."
- RIGHT COLUMN — "UPCOMING":
  - Card: background #F5F3EE, border 2px solid rgba(17,17,17,0.1), border-radius 2rem, padding 32px
  - Header: "UPCOMING" in Space Grotesk, bold, 14px, uppercase
  - 2 event items, each with:
    - Date block: day number (Space Mono, bold, 32px, #C4291E) + month (Space Mono, 11px, uppercase)
    - Event name (Space Grotesk, bold, 18px, #111111)
    - Time range (Space Mono, 12px, #111111 at 50% opacity)
  - Bottom: "VIEW FULL CALENDAR →" button — rounded-full, border 2px solid #111111, Space Grotesk, bold, 12px, uppercase, #111111, no fill. Links to /events.
- Section padding: 128px vertical, gap 32px between columns

DO NOT: invent a navigation bar, header, or footer for this section.
```

---

### Section 6: Final CTA (100vh) — Conversion

**Current:** No dedicated closing CTA section.

**New:** Full-viewport closing statement.

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│                                                              │
│      "Every Lab Pro                                          │
│       started as Curious."                                   │
│                                                              │
│      [ Create Your Account → ]    (primary, red)             │
│      Or explore challenges first → (secondary, text link)    │
│                                                              │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**What to reuse:**
- `Button` component (primary variant for main CTA)
- GSAP fade-in on scroll
- Links to `/register` and `/challenges`

**What to build new:**
- Full-viewport centered section
- Large DM Serif Display italic headline
- Two CTAs: primary button + secondary text link
- Optional subtle background: floating rank icons at low opacity (purely decorative, CSS only)

**Stitch prompt for this section:**

```
CONTEXT: Final section of Param Makerspace landing page. Closing CTA for conversion.

CONSTRAINTS:
- Background: #111111
- Height: 100vh, flexbox centered vertically and horizontally
- Headline: "Every Lab Pro started as Curious." — DM Serif Display, italic, clamp(2.5rem, 6vw, 5rem), #F5F3EE, centered, max-width 700px
- Primary CTA: "Create Your Account →" — rounded-full, background #C4291E, text #F5F3EE, Space Grotesk, bold, 16px, uppercase, padding 16px 40px, hover: background #111111 border 2px #F5F3EE
- Secondary link: "Or explore challenges first →" — Space Mono, 14px, #F5F3EE at 60% opacity, underline on hover, centered, margin-top 16px
- Subtle decorative background: 5-6 geometric shapes (circles, hexagons) at 5% opacity, scattered, different sizes (40px-120px), #F5F3EE outlines only. Static, no animation needed.
- No other content in this section.

DO NOT: use any font other than the three specified. Do not add a navbar or footer.
```

---

### Section 7: Footer (Minimal changes)

Your existing `Footer.tsx` is fine. The only recommended change:
- In the `Philosophy` section that currently sits between features and protocol — absorb its copy into one of the new sections or remove it as a standalone section. The word-by-word reveal animation can be repurposed for the Section 6 headline.

---

## Part 4: Integration Strategy (For When You Code This)

### Order of Operations

1. **Edit `Home.tsx` structure** — Replace the current section order with the 6-section layout. Don't delete old components yet; comment them out.
2. **Section 1 (Hero)** — Modify the existing hero `div` in-place. Swap headline text, swap CTA, add project showcase cards (can be static placeholders initially).
3. **Section 2 (Maker Loop)** — Create a new component `src/components/home/MakerLoop.tsx`. Reuse `Card` and GSAP ScrollTrigger patterns.
4. **Section 3 (What Makers Build)** — Create `src/components/home/FeaturedProjects.tsx`. Static data initially, connect to Supabase later.
5. **Section 4 (Your Path)** — Create `src/components/home/RankPath.tsx`. Import `RANK_ORDER`, `getBadgeIcon` from existing libs.
6. **Section 5 (Live Pulse)** — Create `src/components/home/LivePulse.tsx`. Evolve `TelemetryTypewriter` inside it, add events column.
7. **Section 6 (Final CTA)** — Create `src/components/home/ClosingCTA.tsx`. Simple component.
8. **Clean up** — Remove unused imports from `Home.tsx`, delete or archive old components that were fully replaced.

### File Impact Map

| File | Action |
|------|--------|
| `src/pages/Home.tsx` | **Major edit** — new section structure, new imports |
| `src/components/home/MakerLoop.tsx` | **New file** |
| `src/components/home/FeaturedProjects.tsx` | **New file** |
| `src/components/home/RankPath.tsx` | **New file** |
| `src/components/home/LivePulse.tsx` | **New file** |
| `src/components/home/ClosingCTA.tsx` | **New file** |
| `src/components/home/DiagnosticShuffler.tsx` | **Evolve** — reuse animation for MakerLoop step 1 |
| `src/components/home/TelemetryTypewriter.tsx` | **Evolve** — reuse inside LivePulse with better copy |
| `src/components/home/CursorProtocolScheduler.tsx` | **Archive** — cursor animation is cool but doesn't serve the new flow |
| `src/components/home/Philosophy.tsx` | **Archive** — word reveal effect reusable, but the section itself is cut |
| `src/components/home/Protocol.tsx` | **Archive** — pinned-card scroll effect reusable in RankPath if desired |
| `src/components/layout/Navbar.tsx` | **Minor edit** — change "Start as Curious" → "Join the Lab" (line 117) |
| `src/components/layout/Footer.tsx` | **No change** |
| `tailwind.config.js` | **No change** |
| `src/index.css` | **No change** |

### What NOT to Touch
- Any file in `src/pages/` other than `Home.tsx`
- Any file in `src/lib/`
- Any file in `src/pages/admin/`
- `src/components/ui/` (Button, Card, RankBadge, ParamLogo, etc.)
- `src/components/layout/` (except the one-line Navbar CTA text change)
- Tailwind config, Vite config, TypeScript config
- Supabase schema, auth logic

---

## Part 5: Stitch Workflow — How to Use These Prompts

### Do NOT paste all prompts at once.

Work section by section:

1. **Open Stitch** → Paste the Section 1 (Hero) prompt → Generate → Screenshot the output
2. **Review** the screenshot against the constraints. Check: Are fonts correct? Are colors exact? Is there a navbar where there shouldn't be?
3. **If wrong**, add a correction prompt: "The headline font is wrong. It must be DM Serif Display, not [whatever Stitch used]. The colors are [what's wrong]. Fix ONLY those issues."
4. **Once Section 1 looks right**, save/export the HTML/CSS for that section only.
5. **Move to Section 2** — paste the Section 2 prompt. Repeat the review cycle.
6. **Continue** through all 6 sections independently.

### When Bringing Stitch Output Into Your Codebase

Do NOT copy-paste raw HTML. Instead:

1. **Extract only the layout structure** (the divs, the grid, the flex arrangements)
2. **Replace all inline styles** with your Tailwind classes (`bg-brutal-dark`, `font-heading`, `rounded-2xl`, etc.)
3. **Replace all hardcoded text** with your component data
4. **Wrap interactive elements** in your existing components (`Button`, `Card`)
5. **Replace CSS animations** with GSAP equivalents using your existing ScrollTrigger patterns

Think of Stitch output as a **visual reference / wireframe**, not as production code.

---

## Part 6: Verification Checklist

Before considering the landing page done, verify:

- [ ] All 6 fonts render as Space Grotesk / DM Serif Display / Space Mono (inspect in browser DevTools → Computed → font-family)
- [ ] Colors match tokens exactly: `#F5F3EE`, `#111111`, `#C4291E`, `#E8E4DD`
- [ ] Navbar still works: transparent on home, glassmorphic on scroll, auth-aware
- [ ] "Join the Lab" / "Create Account" replaces "Start as Curious" everywhere it appears to logged-out users
- [ ] No broken imports — all old component references either updated or removed
- [ ] Mobile responsive: all sections stack cleanly, no horizontal overflow
- [ ] GSAP animations don't conflict or pile up (check `ctx.revert()` cleanup in all `useEffect` hooks)
- [ ] Links work: hero CTA scrolls to section 2, "Explore All Projects" → `/projects`, "View Full Calendar" → `/events`, "Create Your Account" → `/register`, "Explore challenges" → `/challenges`
- [ ] Noise texture overlay still visible (the `body::before` in `index.css`)
- [ ] No console errors
- [ ] Lighthouse performance: no layout shift from GSAP animations (use `will-change: transform` on animated elements)
