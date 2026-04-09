# Param Makerspace — UX Master File

> **Single source of truth.** This file merges three documents: the handoff context, the UX audit master prompt (framework), and the per-component action plan (with the corrected Section 1 already merged in). Use it as the only attachment per chat instance — paste the relevant section + the "Global context" header below as the working ticket.

---

# PART A — GLOBAL CONTEXT (read first, every time)

## A.1 Project context (non-negotiables)

- **Stakes:** Clients and investors are actively watching. The deliverable must be investor/client ready, not "first draft." Do not ship anything you would not defend in a review.
- **The brutalist aesthetic stays.** `font-drama` italic serif for marketing voice, `font-data` mono for telemetry, `font-heading` for HUD. `brutal-red` is the only accent color, used sparingly (one red touch per viewport). Do not modernize the look — only the *feel*.
- **The 3D Spline robot in the hero is load-bearing and must never be removed or hidden.** Same for the dual auth states, the GSAP timelines, the live `activeMakers` counter, the Zeigarnik build-intent chip flow, and the italic-serif `Welcome to Param Makersadda.` headline. Every change is **additive** — you add around the existing experience, never replace it.
- **"Inconsistencies" in the original audit referred only to font sizes, vertical spacing, and microcopy tone.** Animations, motion, and feature richness should *increase*, not be flattened.
- **Empty / "no projects yet" states are out of scope.** Content is being populated separately. Do not redesign empty states. Do not flag them as audit issues.
- **No generic SaaS trust copy** like `free forever · no credit card · 10 second signup`. Maker-flavored voice or nothing.
- **The logged-out hero must be the *more* dramatic experience** — that is the moment a stranger decides whether to stay. The logged-in HUD should not outshine the marketing hero.
- **User preferences:** Do not give opinions; verify your responses. Honor the brutalist voice. Use web search to find references when proposing creative work. Use AskUserQuestion to clarify before doing real work if requirements are ambiguous. Use TodoWrite to track multi-step progress.

## A.2 Hard constraints every instance must honor

- Do not remove the 3D Spline robot or hide it on any breakpoint without providing a replacement (Lottie or downscaled Spline).
- Do not remove the Zeigarnik build-intent chip flow.
- Do not remove the live `activeMakers` pill or its rolling counter.
- Do not remove the italic-serif `Welcome to Param Makersadda.` headline.
- Do not add generic SaaS trust copy (`free forever`, `no credit card`, `10 second signup`, etc.).
- Do not flag empty / "no projects yet" states as audit issues.
- Do not redefine Section 0 primitives — they are already shipped (`Skeleton`, `EmptyState`, `FieldError`, toast, focus rings, `useUnsavedChanges`, `useOptimistic`, copy strings in `src/lib/copy.ts`). Grep `src/components/ui/` and `src/lib/` before reinventing.
- Honor `prefers-reduced-motion` on every new animation.
- Brutalist aesthetic stays.
- Final deliverables go to `param-makerspace-main/`, shared via `computer://` links.

## A.3 Global rules for every section

- Honor the existing brutalist aesthetic (`brutal-red`, `brutal-dark`, thick borders, mono/serif type mix). Do **not** modernize the look — only the *feel*.
- Reuse `Button.tsx`, `Card.tsx`, `Input.tsx`, `MagneticCard.tsx`, `RankBadge.tsx`. Extend, do not duplicate.
- Every interactive element must have a visible `:focus-visible` ring (`focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brutal-red`).
- Every async action must give optimistic feedback within 100 ms and confirm via the shared toast system.
- Target Apple-style transitions: `transition-all duration-200 ease-out`, spring on cards (`MagneticCard`), no jank, no CLS.
- WCAG 2.2 AA, mobile-first, touch targets ≥ 44 × 44 px.

## A.4 Quick orientation: files to read first

Before doing anything, read in order:
1. Part B of this file (the audit framework).
2. The relevant section in Part C (the per-component ticket).
3. `param-makerspace-main/src/pages/Home.tsx`
4. `param-makerspace-main/src/components/home/WelcomeHero.tsx`
5. `param-makerspace-main/src/components/ui/interactive-3d-robot.tsx`
6. `param-makerspace-main/src/lib/auth.tsx`
7. `param-makerspace-main/src/App.tsx` (routing)
8. `param-makerspace-main/src/lib/copy.ts` (Section 0 copy strings — confirm they exist)
9. `param-makerspace-main/src/components/ui/` (confirm Section 0 primitives exist)

---

# PART B — UX AUDIT MASTER PROMPT (the framework)

A research-backed reference for conducting a rigorous UI/UX audit of a community-driven makerspace platform. Principles synthesized from Nielsen Norman Group, Interaction Design Foundation, W3C/WCAG 2.2, Google Web Vitals, and current community-platform UX literature.

## B.1 Foundational heuristics

The audit's spine is **Jakob Nielsen's 10 Usability Heuristics**. Heuristic evaluation reliably surfaces ~75% of major usability issues. Each finding should be tied to a specific heuristic so the report is defensible and actionable.

The 10 heuristics, applied to a makerspace platform:
- **H1 Visibility of system status** — build progress, project save state, RSVP confirmations
- **H2 Match between system and the real world** — maker vocabulary ("build log," "BOM," "remix," "mentor hours"), not corporate-speak
- **H3 User control and freedom** — undo, leave-event, cancel-RSVP, draft autosave
- **H4 Consistency and standards** — one button system, one event card pattern, one badge style
- **H5 Error prevention** — confirm destructive actions on projects, badges, mentorship bookings
- **H6 Recognition rather than recall** — surface recently visited projects, last-used tools, draft challenges
- **H7 Flexibility and efficiency of use** — keyboard shortcuts, saved filters, power-user dashboards
- **H8 Aesthetic and minimalist design** — signal-to-noise on profile and project pages
- **H9 Help users recognize, diagnose, and recover from errors** — plain-language form errors, recoverable upload failures
- **H10 Help and documentation** — contextual help on submitting a project, joining a challenge, applying for a badge

## B.2 Information architecture and navigation

Audit whether members can reach any of the eight core entities — **Makers, Projects, Challenges, Events, Badges, Mentors, Store, Dashboard** — within two clicks of any page. Check for orphan pages, redundant categories, and inconsistent labels between navbar, breadcrumbs, footer, and search.

## B.3 Onboarding and first-value time

**Time-to-first-value within ~7 minutes** (Ramli John's benchmark). Audit registration → email confirmation → profile setup → first meaningful action. Prefer **progressive onboarding** over front-loaded tours. The "aha moment" is usually one of: viewing a featured project, RSVPing to an event, joining a challenge, or following a mentor.

## B.4 Community engagement, contribution, gamification

Personalization is the core engagement driver. Audit whether feeds, dashboards, and notifications reflect stated interests and past activity. For gamification, verify three things: game elements **enhance** rather than obstruct core tasks; progress is visible; rewards are tied to **intrinsically meaningful behaviors** (shipping a project, mentoring, attending) rather than vanity metrics.

## B.5 Trust, safety, content moderation

Cover trust & safety: clear community guidelines, visible reporting controls on every UGC surface, transparent moderation status (pending/approved/removed), block/mute affordances, hybrid moderation. Check whether new users see community guidelines during signup and whether minors have age-appropriate protections.

## B.6 Accessibility (WCAG 2.2 AA)

WCAG 2.2 (87 success criteria across POUR: Perceivable, Operable, Understandable, Robust). Audit against **Level AA**. Most common failures: color contrast (1.4.3, 1.4.11), missing/poor alt text, keyboard traps, missing focus indicators, low-contrast placeholders, icon-only buttons without accessible names. WCAG 2.2 added: focus appearance (2.4.11), dragging movements (2.5.7), target size minimum (2.5.8), consistent help (3.2.6).

## B.7 Performance and Core Web Vitals (2026 targets)

**LCP < 2.5 s, INP < 200 ms, CLS < 0.1**, mobile-first. INP replaces FID and measures *all* interactions. Watch for unoptimized hero/project images, layout shift from late-loading cards, slow first interaction on dashboards.

## B.8 Mobile and responsive

Real device sizes (small phone, large phone, tablet, laptop, desktop). Touch target size: minimum 24×24 CSS px per WCAG 2.5.8, 44×44 recommended. Thumb-zone placement of primary actions, single-column collapse logic, mobile navigation discoverability.

## B.9 Visual design, brand, content quality

Brutalist aesthetic must still pass contrast, hierarchy, and scannability tests. Audit typographic hierarchy, spacing rhythm, color system consistency, empty-state design, loading states, error states, microcopy tone.

## B.10 Conversion and key flows

Map each critical flow end-to-end: **sign-up → profile setup → first project upload; browse events → RSVP → calendar add → attendance; browse challenges → join → submit; discover mentor → request session → confirm; store → cart → checkout**. For each flow, count steps, identify drop-off risks, confirm error recovery paths.

## B.11 Severity scale (Nielsen 0–4)

- 0 = not a usability problem
- 1 = cosmetic (fix if time)
- 2 = minor (low priority)
- 3 = major (high priority)
- 4 = catastrophic (must fix before release)

Combined with **Impact × Effort** quadrant: Quick Wins (high/low), Strategic (high/high), Fill-ins (low/low), Reconsider (low/high). Every issue carries: unique ID, location, heuristic violated, severity, evidence, recommended fix, effort estimate.

## B.12 Required output schema for any audit pass

```
# Param Makerspace — UX Audit Report

## 1. Executive Summary (3–6 sentences)
## 2. Scorecard (1–5 per dimension)
## 3. Findings (sorted severity 4 → 0)
   ### F-### — <short title>
   - Surface, Evidence, Framework, Severity, Impact, Recommendation, Effort, Quadrant
## 4. Flow-by-flow analysis
## 5. Accessibility appendix (every WCAG 2.2 AA criterion: Pass/Fail/N-A/EVIDENCE_INSUFFICIENT)
## 6. Performance appendix (LCP/INP/CLS per page)
## 7. Prioritized roadmap (top 15)
## 8. Open questions and evidence gaps
```

Mark anything you cannot verify as **EVIDENCE_INSUFFICIENT** rather than fabricating.

---

# PART C — PER-COMPONENT ACTION PLAN

> Each section below is a self-contained brief. Open a new chat instance, attach this `UX_MASTER.md`, then paste the relevant section as the working ticket. The prompt at the bottom of each section is copy-paste ready.

---

## 0. Cross-Cutting Pre-Work — ALREADY SHIPPED

> **Status: DONE on disk.** Section 0 primitives are live in the codebase. Do not redefine. Grep `src/components/ui/` and `src/lib/` before reinventing.

**What shipped**
1. `rouned-xl` → `rounded-xl` typo fixed in `src/components/ui/Input.tsx`.
2. Global `focus-visible` ring on `Button.tsx`, `Input.tsx`, `Card.tsx`, anchors, selects.
3. `disabled:opacity-50 disabled:cursor-not-allowed` on `Button.tsx`; `magnetic-btn` documented.
4. `<Toaster />` mounted in `RootLayout.tsx`. Exports: `toast.success`, `toast.error`, `toast.loading`, `toast.promise`.
5. Shared primitives in `src/components/ui/`: `Skeleton.tsx` (variants `card | line | avatar | banner`), `EmptyState.tsx`, `FieldError.tsx`.
6. Standardized loading microcopy in `src/lib/copy.ts`: `Loading…`, `Saving…`, `Redirecting…`, `Uploading…`.
7. Standardized auth verbs in `src/lib/copy.ts`: `Sign in`, `Sign up`, `Reset password`, `Save new password`.
8. `useUnsavedChanges(formDirty: boolean)` hook (uses `beforeunload` + React Router `useBlocker`).
9. `useOptimistic` helper for optimistic counts.

**Acceptance grep checks** — should all return zero hits in `src/`:
- `alert(`
- `Authenticate|Create Identity|New initialization`
- `rouned-xl`

---

## 1. Landing Page

The landing page is **four** top-level sections rendered by `src/pages/Home.tsx`: `WelcomeHero`, `BuildQuestion`, `LivePulse`, `KnowMore`. Each gets its own ticket below (1A → 1D) so the four can be implemented in parallel chat instances without trampling each other. **Do them in order if you have to choose** — the hero is the conversion fulcrum and clients see it first.

**Global non-negotiables for every landing ticket**
- The 3D Spline robot, the dual auth states, the GSAP timelines, the live `activeMakers` counter, the Zeigarnik build-intent chip flow, and the italic-serif `Welcome to Param Makersadda.` headline are all **load-bearing** and must remain. You are *adding around them*, never replacing them.
- Honor `prefers-reduced-motion` on every new animation (`useReducedMotion()` from framer-motion, or a CSS `@media (prefers-reduced-motion: reduce)` fallback that freezes the final state).
- Section 0 primitives (`Skeleton`, toast, focus rings, copy strings) are already merged. Use them — do not redefine them. Section 0 did not modify any file in `src/pages/Home.tsx` or `src/components/home/*`, so there is zero conflict with the work you are about to do.
- Brutalist aesthetic stays: `font-drama` italic serif for the marketing voice, `font-data` mono for telemetry, `font-heading` for HUD. `brutal-red` is the only accent color; use it sparingly (one red touch per viewport).
- "Inconsistencies" in the original audit referred only to font sizes / vertical spacing / microcopy tone. Animations, motion, and feature richness should *increase*, not be flattened.

---

### 1A. Welcome Hero — `src/components/home/WelcomeHero.tsx`

**What is already there (do not remove):**
- `<InteractiveRobotSpline>` 3D robot occupying the right half of the viewport, currently showing a "CLICK ME" tooltip at the robot's hand.
- Italic-serif `Welcome / to Param Makersadda.` split-char GSAP reveal.
- `font-drama` tagline "Where makers build the future, together."
- Live credibility pill ("X MAKERS ACTIVE IN THE LAB TODAY") sourced from real Supabase `xp_event` data, with a GSAP counter roll.
- "I want to build…" `BUILD_INTENTS` chip row (Robot / Smart Lamp / IoT Sensor / Game / Surprise me) → on click moves into a "You picked X" → "Save it. Join in 10 seconds" Zeigarnik commit state.
- "Or just join the lab" fast-path link.
- `Scroll` chevron at the bottom, logged-out only.
- Logged-in HUD branch with "The Lab Is Open" eyebrow + `BUILD SOMETHING TODAY, {NAME}` headline + Dashboard CTA + Browse Challenges secondary.
- Cursor-following radial glow.
- Drifting dot grid background.

**What is wrong / underbuilt right now**
1. The trust microcopy `free forever · no credit card · 10 second signup` reads as generic SaaS boilerplate and does not match the brutalist maker voice. The user explicitly wants it gone.
2. The robot's "CLICK ME" tooltip and the robot itself feel inert on first paint — the robot is "resting and looking right" away from the content. It needs a Wall-E / pixar-lamp moment at first load: a flickering bulb of red light pulsing over the robot's button hand, drawing the eye left toward the text. This is the single highest-leverage motion change on the page.
3. The "I want to build…" chip row is a one-shot first-touch but stops there. After commit it just navigates to `/register?intent=…`. The intent is never echoed back inside the hero before navigation, and the row never refreshes to invite a second exploration.
4. The logged-out hero has no visible secondary `Sign in` affordance. Users with existing accounts have to climb back up to the navbar.
5. There is no proof of recency beyond the active-maker count. Modern community heroes pair the live count with one rotating real artifact ("Riya just shipped Project X · 4 min ago") to make the lab feel inhabited (Linear, Vercel, Layer3 all do this).
6. The headline `Welcome / to Param Makersadda.` is great but never *responds* to the user's cursor or pointer — the cursor glow exists but the type is static. Awwwards-tier hero treatments use light-clipped or magnet-attracted typography to make the name feel alive.
7. The mobile breakpoint hides the robot entirely (`hidden md:block`). On phones the right half of the hero is empty space. We need a deliberate mobile hero treatment, not a fallback hole.
8. No keyboard affordance for the chip flow — Tab order works because they are buttons, but there is no `aria-live` region announcing the picked state or the live counter rolling.
9. The logged-in HUD is stronger than the logged-out hero. The user's note is right: the logged-out hero needs to be the more dramatic one, because that is the moment a stranger decides whether to stay.

**Action plan — additive only**

1. **Remove the SaaS trust line.** Delete the two `welcome-trust` paragraphs (`free forever · no credit card · 10 second signup`) in both the chip-row and picked states. Replace with nothing in the chip-row state. Replace with a single line in the picked state that reads, in `font-data` lowercase: ``one tap. no credit card. you're in.`` — only because anxiety is highest at the moment of commit, not while browsing chips. If the user prefers it fully gone, drop the picked-state line too; do not invent a new trust line.

2. **Wall-E light-flicker over the robot's hand.** This is the marquee addition.
   - Add an absolutely-positioned `<div className="robot-bulb">` inside the existing robot container, anchored over the approximate world-space position of the "CLICK ME" tooltip (roughly `top-[58%] left-[68%]` of the hero on `md+`; verify by eye and pin to a CSS variable so it can be tuned without recompiling).
   - The bulb is a 120 × 120 px radial-gradient circle: `bg: radial-gradient(circle, rgba(196,41,30,0.85) 0%, rgba(196,41,30,0.35) 30%, rgba(196,41,30,0) 70%)` with `mix-blend-mode: screen`, `filter: blur(8px)`, `pointer-events: none`.
   - Animate it with a non-uniform GSAP keyframe sequence (Wall-E flicker is uneven on purpose):
     ```
     0%   opacity 0
     8%   opacity 0.95
     11%  opacity 0.15
     14%  opacity 0.9
     18%  opacity 0.05
     22%  opacity 1
     30%  opacity 0.6
     45%  opacity 0.95
     60%  opacity 0.4
     75%  opacity 0.9
     100% opacity 0.7  (settles into a slow breathing 0.55↔0.85 loop)
     ```
     Total intro duration: 2.4 s, then the breathing loop runs forever at 3 s per cycle. This matches the GSAP master timeline that already times the hero text to land at ~2.5 s, so the bulb finishes its hard flicker exactly as the chips settle.
   - Add a secondary, larger, softer halo (`240 × 240 px`, `blur(28px)`, `opacity 0.3` peak) that pulses on the same beat at half-amplitude. The two layers together read as a real bulb, not a CSS gradient.
   - Wrap both in `prefers-reduced-motion: reduce` → render the bulb at static `opacity 0.55`, no animation.
   - Add a one-time `audio-cue` hook that *can* play a soft `tick-tick-tzzzt` sound (under 18 KB ogg) on first user interaction (must be gesture-gated for autoplay rules). Default off, controlled by a `?sound=on` URL param so investors can demo it but normal visitors get silence. Do not ship sound on by default.
   - **Why it works:** the flicker pulls the eye left across the screen toward the content (the robot is looking right, away from text — the bulb on its hand becomes the visual hook that arcs the eye back to the headline). It is also the single most "Apple keynote / Pixar opening" beat we can add for almost no perf cost.

3. **Magnetic / cursor-reactive headline.** Wire the existing cursor-glow handler to also pass `clientX/clientY` into a tiny CSS-variable system on the headline (`--mx`, `--my`) and use it to drive a *very subtle* `text-shadow` warm spot on the `Welcome` chars, plus a 2–4 px translate on hover of each char (already split via `welcome-char` spans). Cap movement at 4 px so it never feels like a gimmick. Disable on touch and on `prefers-reduced-motion`.

4. **Live activity ticker — second row of credibility.** Below the existing `activeMakers` pill, add a single rotating one-line ticker fed from the most recent 5 `xp_event` rows joined to user names and project titles. Format: `Riya shipped "Mini CNC" · 4 min ago`. Crossfade every 5 s (`opacity 0 → 1 → 0`, 600 ms each side). Hide entirely if there are no recent events (no fabrication — the existing component already follows that rule for the maker count, copy that pattern). Skeleton with `<Skeleton variant="line" />` on first paint.

5. **Add a `Sign in` secondary affordance.** In the chip-row state, after the `Or just join the lab →` link, add a second tiny line: `Already a member? Sign in →` linking to `/login`, same `font-data text-[10px]` styling, `text-brutal-bg/35 hover:text-brutal-bg/80`. Do not make it visually compete with the primary path.

6. **Refresh the chip row.** Add a sixth chip — `the next thing →` (no icon, italic, slight offset) — that randomizes from a longer pool every 4 s while idle (label cross-fades). The pool: `a wearable`, `a drone`, `a synth`, `a robotic arm`, `an AR toy`, `a kinetic sculpture`, `a weather station`, `a chess engine`. Pause the rotation on hover/focus of any chip in the row so it never moves under the user's cursor. Respect `prefers-reduced-motion` (freeze on the first label).

7. **Echo the picked intent inside the hero before navigation.** When the user picks `a Robot`, hold the picked state for 1.2 s and animate a 1-line preview above the commit button: `we'll save "a robot" to your maker journey →`. Then the user clicks `Save it. Join in 10 seconds`. This widens the Zeigarnik gap by giving the user a visible artifact to "lose" if they bounce. The current code navigates immediately on commit click — keep that — but the in-between preview is what makes the flow feel intentional.

8. **Mobile hero treatment.** On `< md`, the Spline robot is hidden. Replace the empty right column with one of:
   - **Option A (cheaper):** a single looping 360 × 360 px Lottie of a smaller stylized robot waving, positioned above the headline (so the visual hierarchy on mobile becomes robot → headline → tagline → chips → CTA). Lottie file ≤ 60 KB. Pause when the section scrolls out of view.
   - **Option B (richer):** keep the Spline robot but reduce its scene cost on mobile (fewer lights, lower DPR via Spline's `dpr` prop) and pin it as a smaller floating element top-right of the hero.
   - Pick one decisively. Default to Option A unless the Spline scene is already mobile-cheap.
   - Either way, the bulb-flicker (step 2) ports to mobile too, anchored to the mobile robot.

9. **Mobile typography pass.** The current hero uses `text-4xl sm:text-6xl md:text-8xl lg:text-[8rem]`. Verify at 320 / 360 / 390 / 414 px that `Welcome` does not wrap and `to Param Makersadda.` does not overflow. If either does, drop the `sm` step or switch to `clamp(2.25rem, 12vw, 8rem)`.

10. **Section rhythm.** `WelcomeHero` already uses `min-h-[100dvh]` and `py-20 md:py-0`. Standardize the next three sections to `py-24 md:py-32` so the visual rhythm of the page is `100vh hero → breathing → breathing → breathing`. Do not add a sticky sub-nav (the previous draft of this plan recommended one — withdrawn; it would compete with the navbar HUD pill).

11. **Accessibility.**
    - Add `role="status" aria-live="polite"` to the activeMakers count and to the picked-intent label so screen readers announce them.
    - Ensure every chip is reachable by Tab in row order, with the section-0 focus ring.
    - Add `aria-hidden="true"` to the bulb glow so it is ignored by AT — it's decoration.
    - The cursor glow is purely decorative; mark it `aria-hidden="true"`.
    - The Spline scene needs an `aria-label="Interactive 3D robot mascot"` on its container plus a visually-hidden `<p>` explaining "Decorative; the page is fully usable without it."

12. **Performance budget.**
    - The Spline scene is the LCP villain. Lazy-mount it after the headline GSAP timeline finishes (`delay: 0.4 s`) so it does not block LCP. Show a 1-frame still PNG poster underneath while it boots.
    - Preload the active-maker query and the live-ticker query in parallel so the second-row credibility never pops in late and causes CLS. Reserve `min-h-[44px]` for the ticker row.
    - Target: LCP < 2.0 s on mobile 4G throttled, INP < 150 ms, CLS < 0.05.

13. **Verification.**
    - Lighthouse mobile run with throttling. Record LCP / INP / CLS.
    - `prefers-reduced-motion` test: enable in OS, reload, confirm the bulb is static, the chips do not rotate, the headline does not split-reveal, and the cursor glow does not move.
    - Keyboard-only walkthrough from page load → chip pick → commit → /register.
    - VoiceOver / NVDA pass: announce activeMakers, ticker, picked intent.
    - Axe-core scan: zero serious / critical violations.
    - Mobile screenshot at 360 / 414 / 768 / 1280 / 1920 px.

**Prompt to paste**
> You are implementing section **1A. Welcome Hero** of `UX_MASTER.md`. Read Part A and Part B first, then read `src/components/home/WelcomeHero.tsx` and `src/components/ui/interactive-3d-robot.tsx` end to end. The hero is load-bearing — every element currently on the page must remain. Your job is purely additive. Execute steps 1–13 in the action plan exactly. The marquee change is step 2 (Wall-E flicker bulb on the robot's CLICK ME hand). Do not skip the GSAP keyframe values — they are calibrated. Do not regress any existing animation. Constraints: do not touch any file outside `src/components/home/WelcomeHero.tsx` and `src/components/ui/interactive-3d-robot.tsx`. Reuse Section 0 primitives. Section 0 has already shipped — if you cannot find a primitive, grep `src/components/ui/` and `src/lib/copy.ts` before reinventing. Deliverables: a Lighthouse mobile run (LCP / INP / CLS numbers), an axe-core report, screenshots at 360 / 768 / 1280 px, a `prefers-reduced-motion` walkthrough log, and a 10-line changelog.

---

### 1B. Build Question — `src/components/home/BuildQuestion.tsx`

**Audit findings**
1. The "scatter-to-grid project tiles + rotating verb" treatment has no skeleton while project tiles load — empty grid flash.
2. The rotating verb risks a continuous-motion WCAG violation if it never settles.
3. Verb pool likely too short; rotation feels mechanical after two cycles.
4. Tiles likely all use the same hover treatment; no `MagneticCard` integration.
5. No connection back to the hero's picked intent — the user picked `a Robot` thirty seconds ago, so this section should bias the verb / first tile toward robot projects.

**Action plan**
1. Reserve grid space with `<Skeleton variant="card" count={6} />` so tile loads do not cause CLS.
2. Wrap the rotating verb in a `useReducedMotion()` guard. After 3 full cycles (or after the section is in view for 12 s), settle on `build` and stop. Add a manual `↻ shuffle` affordance for power users.
3. Expand the verb pool to ≥ 12 entries. Lean maker-flavored: `build`, `solder`, `prototype`, `flash`, `print`, `wire`, `code`, `cast`, `mill`, `weld`, `etch`, `ship`. Each verb has a ghost 1-letter mono badge that fades in next to it.
4. Wrap each tile in `MagneticCard intensity={4}`. Add a subtle parallax on the tile thumbnail (translate Y by `-4px` on hover).
5. Read the picked intent from a shared store (or `sessionStorage` set by the hero) and, if present, sort matching projects to the front and pre-highlight one tile with a thin red border. Add a 1-line eyebrow above the section: `because you said "a robot" →`. If no picked intent exists, render normally.
6. On click of a tile, navigate to `/projects/:id` with a `view-transition` if the browser supports it.
7. Mobile: stack to a 2-column grid below `md`; reduce verb font size with `clamp()`.
8. Verification: axe-core, keyboard nav, reduced-motion test.

**Prompt to paste**
> You are implementing section **1B. Build Question** of `UX_MASTER.md`. Read Part A and Part B, then `src/components/home/BuildQuestion.tsx` and any helper it imports. Execute the action plan. Reuse Section 0 primitives. Do not modify the hero or any other home section. End with an axe-core report and screenshots at 360 / 768 / 1280 px.

---

### 1C. Live Pulse — `src/components/home/LivePulse.tsx`

**Audit findings**
1. Fetches dynamic content with no skeleton — CLS villain.
2. Likely shares data sources with the hero's `activeMakers` query — duplicate Supabase round trips.
3. Probably renders upcoming events without a clear scheduled state.
4. Likely lacks a refresh affordance for live data (the page is the kind of thing investors will sit on for minutes).

**Action plan**
1. `<Skeleton variant="banner" />` and `<Skeleton variant="card" count={3} />` while loading. Reserve heights to kill CLS.
2. Hoist the `activeMakers` and recent-events queries into a single `useHomeLive()` hook in `src/lib/hooks/useHomeLive.ts` so the hero and LivePulse share one network call. Cache for 30 s. Cancel on unmount.
3. Add a small `Live · updated 14s ago` indicator (the same red pulsing dot pattern the hero uses). Increment the "ago" counter every second client-side; refetch every 30 s.
4. For upcoming events, show countdown chips (reuse the helper from `src/pages/Events.tsx` — section 14 standardizes this).
5. If there are zero recent events, do not render an empty state — render an evergreen "What you can build here" strip instead (fed from a static array of three tagged showcase projects). The user said empty states are out of scope; this is the dodge.
6. Wrap motion in `prefers-reduced-motion`.
7. Mobile: collapse to a single column with horizontal scroll snapping for event chips.
8. Verification: axe-core, no CLS, network panel shows one combined call instead of two.

**Prompt to paste**
> You are implementing section **1C. Live Pulse** of `UX_MASTER.md`. Read Part A and Part B, then `src/components/home/LivePulse.tsx` and `src/components/home/WelcomeHero.tsx` (read-only). Execute the action plan. Create the `useHomeLive` hook under `src/lib/hooks/`. Reuse Section 0 primitives. Do not change the hero. End with a network waterfall screenshot showing the combined call and an axe-core report.

---

### 1D. Know More — `src/components/home/KnowMore.tsx` (+ sub-components)

**Context**
`KnowMore` is the third-act section that wraps three connected node-cards (What is Param / The Maker Loop / Six Ranks) collapsed by default, with a closing convert CTA strip folded into its bottom. Other home/* files are likely sub-components used inside it.

**Audit findings**
1. Collapsed-by-default reduces above-the-fold information but risks discovery — visitors who only scroll once see locked accordions.
2. The convert CTA strip ("You don't need permission…") is the second-most-important conversion surface on the page and likely lacks the same magnetic / motion treatment as the hero CTAs.
3. The three node-cards are conceptually connected but visually disconnected.
4. Long-form copy blocks need typographic hierarchy consistent with the hero's italic-serif voice.

**Action plan**
1. Audit which sub-components are actually rendered by `KnowMore`. Mark unused ones for deletion in a separate cleanup PR (do not delete in this ticket).
2. Open the first node-card by default (`What is Param`) and leave the other two collapsed. The first one is the answer to the most common visitor question and should not require a click.
3. Draw an SVG spline (`stroke="rgba(196,41,30,0.4)"`, `stroke-width="1"`, dashed) connecting the three node-cards. Animate the dash offset on scroll using `ScrollTrigger` so the line "draws" as the user scrolls. Reduced-motion → static line.
4. Promote the convert CTA strip into a full-width sticky-bottom moment: when the user scrolls to it, pin it for 600 ms, animate the headline in with the same `font-drama` italic treatment as the hero, and add a magnetic primary button (`Join the lab →`) using `MagneticCard intensity={5}`.
5. The convert CTA must have two branches:
   - Logged-out → primary `Join the lab` (→ `/register`), secondary `Sign in` ghost.
   - Logged-in → primary `Open dashboard` (→ `/dashboard`), secondary `Browse challenges`.
6. Standardize the typographic hierarchy across `WhatIsParam`, `MakerLoop`, `RankPath` so that `h2` is `font-drama italic text-5xl md:text-7xl`, body is `font-data text-base text-brutal-dark/75 leading-relaxed`, and any pull-quote uses the red accent line.
7. Add `prefers-reduced-motion` to every entrance animation in this group.
8. Verification: axe-core, scroll-driven SVG line works without JavaScript errors, both convert-CTA branches render correctly with `useAuth` mocked.

**Prompt to paste**
> You are implementing section **1D. Know More** of `UX_MASTER.md`. Read Part A and Part B, then `src/components/home/KnowMore.tsx` and every file it imports (read transitively). Execute the action plan. Reuse Section 0 primitives. Do not modify the hero, BuildQuestion, or LivePulse. The convert CTA strip must branch on `useAuth()`. End with screenshots of both auth branches and an axe-core report.

---

> **NOTE on sections 2–19 below.** Each section now contains BOTH the original surface-defect findings AND the cross-file flow-trace findings (marked **[FLOW]**) gathered from the five end-to-end traces (auth / project lifecycle / rank-XP / mentor-community / events-challenges-store). New cross-cutting sections **1.5 (Auth Flow Gaps)** and **15.5 (Notifications System)** capture findings that span multiple files and require new tables or hooks. Severity 4 items are tagged **[SEV-4 BLOCKING]**.

---

## 1.5. Cross-File Auth Flow Gaps — `WelcomeHero.tsx` → `Register.tsx` → `auth.tsx` → `ProfileSetup.tsx`

**Scope:** Findings that emerge only when you trace a first-time visitor from the landing page through email verification, OAuth, profile setup, and the first dashboard load. These do NOT appear in any single-file scan.

**Audit findings (flow-trace)**
1. **F-101 [SEV-3]** `WelcomeHero.tsx:230` calls `navigate(/register?intent=${encodeURIComponent(pickedIntent)})` but `Register.tsx` never calls `useSearchParams()` — the Zeigarnik build-intent the user committed to is silently dropped. Section 1B's entire psychological hook is invalidated downstream.
2. **F-102 [SEV-3]** No profile-completion gate after email verification. A user who verifies and lands on `/dashboard` with an empty profile sees rank-locked cards and no guidance to `/profile/setup`. Drop-off risk between verification and first contribution.
3. **F-103 [SEV-2]** Google OAuth bypasses `Register.tsx` entirely, so no `intent` and no profile-setup nudge can fire on the OAuth path. The two auth surfaces have unequal first-run flows.
4. **F-104 [SEV-2]** Voice mismatch: `WelcomeHero` is brutalist-italic ("Welcome to Param Makersadda."), `Register` is plain SaaS ("Create your account"). Cognitive whiplash inside one flow.
5. **F-105 [SEV-2]** No `?redirect=` round-trip. A logged-out user clicking a deep link (e.g. `/projects/abc`) lands on `/login`, signs in, and is dumped on `/dashboard` instead of the originally requested page (H3, H6).
6. **F-106 [SEV-2]** Email verification success page (`/auth/callback` or equivalent) lacks a clear "next step" CTA tying back to the chosen intent.
7. **F-107 [SEV-1]** No autosave on `Register.tsx` — a user who closes the tab during signup loses everything (acceptable for security, but the field should at minimum preserve email locally).

**Action plan**
- Add `const [params] = useSearchParams(); const intent = params.get('intent');` to `Register.tsx`. If present: render the eyebrow `you said: {intent}` (italic serif, brutal-red), persist `intent` in form state, pass through to `signUp()` metadata, and write it to `profiles.declared_intent` after signup.
- On the OAuth callback, if `profiles.declared_intent` is empty, prompt the user once on `/dashboard` with a small dismissable card: `What brought you here? [Build a robot] [Cut metal] [Print 3D] [Just exploring]`. Persist the answer to the same column.
- Add a profile-completion gate hook `useRequireProfile()` that wraps `/dashboard` and `/projects/*`. If `profile.bio || profile.skills || profile.avatar_url` are all empty, redirect to `/profile/setup?next=/dashboard` once.
- Pass-through `?redirect=` from `Login.tsx` and `Register.tsx`: read it via `useSearchParams`, default to `/dashboard`, validate that it starts with `/` and is not `//` (open-redirect guard), then navigate to it after auth success.
- Rewrite the Register hero copy in the same italic-serif voice as the landing page: e.g. `Pick up where you left off.` Replace `Create Identity` / `Create your account` with `Sign up`.
- Verify: open `/projects/abc` while logged out → redirected to `/login?redirect=/projects/abc` → after sign-in, lands on `/projects/abc`. Open `/register?intent=robot` → eyebrow visible → `profiles.declared_intent='robot'` after signup.

**Prompt to paste**
> You are implementing section **1.5 Cross-File Auth Flow Gaps** of `UX_MASTER.md`. Read Part A, Part B, and sections 1B, 2, 3, 6 here. Then read `src/components/home/WelcomeHero.tsx` (read-only), `src/pages/Register.tsx`, `src/pages/Login.tsx`, `src/lib/auth.tsx`, `src/pages/ProfileSetup.tsx`, and any auth callback route. Execute the action plan exactly. Add `profiles.declared_intent` as a new nullable text column via Supabase migration. Do not modify the brutalist hero. End with a flow log: anonymous deep link → login → redirected destination, plus an axe-core report on `/login` and `/register`.

---

## 2. Login — `src/pages/Login.tsx`

**Audit findings**
1. Success and error banners use inconsistent border thickness, color, and icon usage (H4).
2. Google button does not change label while `googleLoading` is true (H1).
3. `"New initialization?"` and `"Authenticate"` violate H2 (real-world language).
4. No password helper text; min length only surfaces after submit (H5).
5. No `:focus-visible` ring on form fields after the section-0 fix lands — verify it carries through.
6. `Caps Lock` warning missing on the password field (H5, recognized auth pattern).
7. No "Show password" toggle (H7, H8).

**Action plan**
- Replace all auth verb microcopy with the standardized strings from `src/lib/copy.ts`.
- Unify success and error banners into a single `<AuthBanner type="success|error" />` shared subcomponent.
- Make the Google button text reactive: `googleLoading ? 'Redirecting…' : 'Continue with Google'`. Disable on either loading state.
- Add `<FieldError>` from section 0 below the password field; show passive helper `Min. 6 characters` until the user types, then validate live.
- Add `<button type="button">` eye toggle inside the password input (right-aligned, 24 px, accessible name `Show password` / `Hide password`).
- Add Caps Lock detection on password keydown; show inline pill `Caps Lock is on`.
- After successful login, route to `/dashboard` with a `view-transition` if supported, otherwise a 200 ms cross-fade.
- Verify: keyboard-only login flow, screen reader announces banner role="status" / role="alert", axe-core passes.

**[FLOW] additions (from section 1.5 trace)**
- Read `?redirect=` query param via `useSearchParams()`. After successful sign-in, validate it (`startsWith('/') && !startsWith('//')`) and `navigate(redirect ?? '/dashboard')`. Pass it through to the Register link as `/register?redirect=${redirect}`.
- After OAuth success, if `profiles.declared_intent` is null, set a sessionStorage flag the dashboard reads to show the one-time intent picker (see section 1.5 action plan).
- Match the brutalist voice from the landing page: replace any plain SaaS hero copy with the italic-serif `Welcome back.` so Login → Landing voice is consistent.

**Prompt to paste**
> You are implementing section **2. Login** of `UX_MASTER.md`. Read Part A, Part B, and section 1.5, then `src/pages/Login.tsx` and `src/lib/auth.tsx`. Execute the action plan AND the [FLOW] additions exactly. Use the primitives from section 0 (`FieldError`, focus ring, toast, copy strings). Do not modify the auth provider or backend logic. End with a keyboard walkthrough log, a `?redirect=` round-trip log, and an axe-core report.

---

## 3. Register — `src/pages/Register.tsx`

**Audit findings**
1. Password validation is submit-only (H5).
2. The email-sent success screen has a weak CTA (H6).
3. No confirm-password field — typos lock users out until reset (H5).
4. No real-time email format validation (H5).
5. `Create Identity` copy violates H2.
6. No password strength meter; brutalist aesthetic can still accommodate a four-block bar.
7. **Flow gap to verify:** the hero passes `?intent=robot` (or similar) but `Register.tsx` may never read it. Trace the param end-to-end.

**Action plan**
- Add real-time validators for email (RFC-light regex) and password (length + at least one digit). Use `<FieldError>`.
- Add a `Confirm password` field with live mismatch indicator.
- Add a four-block strength meter (Weak / Fair / Good / Strong) styled with `brutal-red` blocks.
- Replace `Create Identity` with `Sign up`. Update the success screen to a centered card with a primary `Sign in` button and a secondary `Resend verification email` link wired to Supabase resend.
- Disable submit while the form is invalid; show a subtle reason on hover/focus.
- After submit, surface a toast `Verification email sent to {email}` and keep the success screen.
- Read `?intent=` from the URL; if present, render an eyebrow `you said: {intent}` above the form and persist it to the user's profile after signup.
- Verify: tab order is name → email → password → confirm → submit → social → footer link. Axe-core clean.

**[FLOW] additions — finding F-101 [SEV-3] CONFIRMED**
- `WelcomeHero.tsx:230` does pass `?intent=`. `Register.tsx` does NOT call `useSearchParams()`. The Zeigarnik build-intent is dropped on the floor today. This is the highest-leverage two-line fix in the file.
- Implement: `const [params] = useSearchParams(); const intent = params.get('intent') ?? null;` Render `{intent && <p className="font-drama italic text-brutal-red text-sm">you said: {intent}</p>}` above the form. Persist via `signUp({ data: { declared_intent: intent } })` so the Supabase metadata reaches `profiles.declared_intent` after the email-verification trigger fires.
- Also read `?redirect=` and forward it through to the `Login` link and to the post-verification redirect target (defaults to `/profile/setup`, see section 1.5 F-102).
- Voice fix: replace `Create Identity` / `Create your account` with the italic-serif `Pick up where you left off.` Brutalist consistency with WelcomeHero.

**Prompt to paste**
> You are implementing section **3. Register** of `UX_MASTER.md`. Read Part A, Part B, and section 1.5, then `src/pages/Register.tsx` and `src/components/home/WelcomeHero.tsx` (read-only — to confirm the `?intent=` param contract). Execute the action plan AND the [FLOW] additions exactly. Add the `declared_intent` Supabase migration if it does not yet exist. Reuse section-0 primitives. Do not modify Supabase auth config. End with screenshots of the four password-strength states, a log proving `?intent=robot` survives end-to-end into `profiles.declared_intent`, and an axe-core report.

---

## 4. Forgot Password — `src/pages/ForgotPassword.tsx`

**Audit findings**
1. Success message is vague — user might think nothing happened (H1).
2. Back link is faint and small (`text-brutal-dark/60`) — fails touch and contrast targets (WCAG 1.4.3, 2.5.8).
3. No client-side email format validation (H5).

**Action plan**
- Add inline email validator with `<FieldError>`.
- Rewrite the confirmation copy: `"If an account exists for {email}, we've sent a recovery link. Check your inbox — and your spam folder."`
- Promote the back link to a real `Button variant="ghost"` with full focus ring and 44×44 touch area.
- Add a `Resend in 30s` cooldown button on the success screen.
- Verify: tab order, screen reader announces success via `role="status"`.

**[FLOW] additions**
- Confirm Supabase resetPasswordForEmail redirects back to `/auth/update-password` (or whatever section 5 expects); if not, the recovery loop is broken end-to-end.
- After the success screen, surface a secondary `Open mail app` link that uses `mailto:` (mobile) — small wins on mobile recovery completion.
- Voice fix: brutalist italic-serif success copy, e.g. `Check your inbox.` then the explanatory body.

**Prompt to paste**
> You are implementing section **4. Forgot Password** of `UX_MASTER.md`. Read Part A, Part B, and section 5 here, then `src/pages/ForgotPassword.tsx` and `src/lib/auth.tsx`. Execute the action plan AND the [FLOW] additions. Reuse section-0 primitives. End with a full recovery loop log (request → email → click → update → sign-in) and an axe-core report.

---

## 5. Update Password — `src/pages/UpdatePassword.tsx`

**Audit findings**
1. Hidden 8 s timeout on Supabase calls — user is told nothing while it ticks (H1).
2. Mismatch only caught on submit (H5).
3. No visual grouping for the two password fields (H4).
4. No success state — page just navigates away (H1).

**Action plan**
- Show a non-blocking inline note `Still working… this can take a few seconds.` at 4 s.
- Add live password match indicator under the confirm field (✓ or ✗).
- Wrap both password inputs in a single `<fieldset>` with a thin `border-l-2 border-brutal-red/40` to communicate they're paired.
- On success, flash a toast `Password updated.` then redirect to `/dashboard` after 600 ms.
- Add the same Caps Lock and show-password affordances from section 2.

**[FLOW] additions**
- Add an `Account Recovery` eyebrow above the form (italic serif) so the user knows they came from a reset link, not from a normal settings change.
- After success, if `?redirect=` is present from the original deep link, honor it; else go to `/dashboard`.
- Verify that the `prefers-reduced-motion` user does not see a fade — instant route swap instead.

**Prompt to paste**
> You are implementing section **5. Update Password** of `UX_MASTER.md`. Read Part A, Part B, and section 4 here, then `src/pages/UpdatePassword.tsx` and `src/lib/auth.tsx`. Execute the action plan AND the [FLOW] additions, reusing section-0 primitives. Do not change auth backend logic. End with a screen-recording-equivalent description of the success path including the 4-second "still working" note path.

---

## 6. Profile Setup — `src/pages/ProfileSetup.tsx`

**Audit findings**
1. Privacy toggle uses raw emoji (👁/🔒) with cross-platform render risk (WCAG 1.1.1).
2. No progress indicator across the multi-section form (H1).
3. Avatar upload is silent — no toast, no spinner (H1).
4. Mentor approval domain helper text is jargon (H2).
5. No autosave; users can lose work (H3).
6. No `useUnsavedChanges` guard.

**Action plan**
- Replace emoji with `lucide-react` `Eye` / `Lock` icons and accessible labels.
- Add a slim progress strip at the top of the form: `Step X of Y · N% complete`, computed from filled-required fields.
- Wire avatar upload to show `<Skeleton variant="avatar" />` during upload, then a `toast.success('Avatar updated')`.
- Rewrite mentor approval domain helper text to: `Approval domains must be a subset of your mentor domains — pick from the list.` Provide a chip multi-select rather than freeform if possible.
- Implement section-by-section autosave to Supabase (debounced 1.5 s) and show `Saved` / `Saving…` text near the section title.
- Wire `useUnsavedChanges(true)` whenever the dirty flag is set; clear it after autosave succeeds.
- Verify: tab order, screen reader announces section transitions, autosave never blocks input.

**[FLOW] additions (from section 1.5 trace)**
- If `profiles.declared_intent` is set (came in via `?intent=` on Register or via the OAuth post-prompt), pre-select the matching mentor/skill domain chip and show an italic eyebrow `you said: {intent}` at the top of the form.
- After save, if a `?next=` query param is present (set by `useRequireProfile()` from section 1.5), redirect to that path instead of `/dashboard`. Validate the param the same way Login does.
- Insert the `rank_up` notification trigger hook here too: when `checkProfileCompletionXP()` fires and crosses a rank, the trigger from section 15.5 inserts a notification idempotently (do NOT call `awardXP` twice — section 7 finding).

**Prompt to paste**
> You are implementing section **6. Profile Setup** of `UX_MASTER.md`. Read Part A, Part B, sections 1.5 and 15.5, then `src/pages/ProfileSetup.tsx`, `src/lib/xpEngine.ts`, and any helpers under `src/lib/` it imports. Execute the action plan AND the [FLOW] additions. Reuse section-0 primitives (`Skeleton`, toast, `useUnsavedChanges`). Do not change the database schema beyond adding the `declared_intent` column from section 1.5. End with a per-section autosave log, a `?next=` redirect proof, and an axe-core report.

---

## 7. Dashboard — `src/pages/Dashboard.tsx`

**Audit findings (excluding empty/no-projects state)**
1. `Propose Project` card is `opacity-50 cursor-not-allowed` for viewers with no explanation (H1, H10).
2. Project create form gives no toast on success (H1).
3. `View-only access` banner does not tell users *how* to advance (H10).
4. `videoUrlError` state is lost when the form closes (H6).
5. XP history list scroll has no visual indicator (H6).
6. `Mentor Tools` label duplicates the `Review Queue` h2 (H4).

**Action plan**
- Add a hover/focus tooltip on the disabled `Propose Project` card: `Requires Maker rank — talk to a mentor.` and link the words `talk to a mentor` to `/mentors` (or a Discord URL if that exists).
- After successful project creation: close the form, fire `toast.success('Project created — opening editor.')`, then navigate to `/projects/:id/edit`.
- Rewrite the view-only banner to include a primary `Find a mentor` link plus a secondary `Read induction guide` link. No vague exhortations.
- Persist `videoUrlError` in a stable state slice that survives form open/close, or simply re-validate on reopen.
- Add a faint `mask-image` fade at the bottom of the XP history list when more content is below; show a thin scrollbar via `scrollbar-thin` plugin or CSS.
- Remove the `Mentor Tools` label; keep only the `Review Queue` h2. Use a chip/badge to indicate it's a mentor-only zone.
- Wrap the project create form with `useUnsavedChanges`.
- Verify: keyboard tab order, screen-reader landmarks, axe-core clean.

**[FLOW] additions — multiple [SEV-4] gaps confirmed**
- **F-301 [SEV-4]** `RankGate` component is defined in `src/components/ui/RankGate.tsx` but `<RankGate` has **zero** usages anywhere in the codebase. The entire rank-based access control loop is disconnected. Wrap `Propose Project`, `Submit Challenge`, `Mentor Tools`, and any other rank-locked surface in `<RankGate feature="propose_project">…</RankGate>`. Wire `canAccess()` and `FEATURE_MIN_RANK` from `src/lib/rankAccess.ts`.
- **F-302 [SEV-3]** `Dashboard.tsx:133` calls `handleCloseModal(); refetchProjects();` after project create with NO navigation. The user is dumped back on the dashboard and has no signal that anything happened. Replace with: `toast.success('Project created — opening editor.'); navigate('/projects/' + newProject.id + '/edit');`. (Already in original action plan — confirmed and elevated.)
- **F-303 [SEV-3]** `Dashboard.tsx:122-131` fires the video insert in the background as fire-and-forget; if it fails, the user is never told. Wrap in try/catch and `toast.error('Couldn't attach the video — you can add it from the editor.')`.
- **F-304 [SEV-3]** `xpEngine.awardXP()` (lines 84-90) has no idempotency check; double-clicks award double XP. Copy the pattern from `checkProfileCompletionXP()` lines 129-136 (insert into a `xp_event_dedup(user_id, event_key)` unique table, ignore on conflict). Without this, every rank-up notification fires twice.
- **F-305 [SEV-3]** `Dashboard.tsx:201` `Speak to a mentor to get inducted!` is text-only with no link. Convert to a real `<Link to="/makers?role=mentor">` (or `/mentors` if that route exists), styled as a brutal-red ghost button with a focus ring.
- **F-306 [SEV-2]** `useSupabaseQuery()` in `src/lib/hooks.ts` has no `.subscribe()` — XP and rank do not update in realtime. After section 15.5 ships, switch the dashboard's XP/rank reads to a realtime subscription on `profiles` filtered by `id=eq.${userId}`.

**Prompt to paste**
> You are implementing section **7. Dashboard** of `UX_MASTER.md`. Read Part A, Part B, sections 1.5, 15.5, and 18, then `src/pages/Dashboard.tsx`, `src/components/ui/RankGate.tsx`, `src/lib/rankAccess.ts`, `src/lib/xpEngine.ts`, and `src/lib/hooks.ts`. Execute the action plan AND every [FLOW] addition. The `RankGate` wiring is non-negotiable — without it the gamification loop is dead. Reuse section-0 primitives. Do not redesign empty states. End with: a keyboard walkthrough log, proof that double-clicking `awardXP` results in exactly one xp event row, screenshots of the wrapped `<RankGate>` surfaces, and an axe-core report.

---

## 8. Projects List — `src/pages/Projects.tsx`

**Audit findings**
1. Featured banner vanishes during load instead of skeletoning (H1).
2. Filter selects do not communicate active state (H6).
3. `Load Archive Files (X remaining)` button has no `onClick` — broken affordance (H4, severity 3).
4. No URL-state sync for filters — refresh loses state (H7).
5. Magnetic card intensity is undocumented (dev clarity).

**Action plan**
- Replace the disappearing featured banner with `<Skeleton variant="banner" />` while loading.
- Either implement client-side pagination behind the `Load Archive Files` button **or** disable it with `aria-disabled="true"` and the label `Coming soon`. Pick one decisively — do not leave it broken.
- Reflect filter state in the URL using `useSearchParams`. Add active filter chips above the grid (`Domain: Electronics ✕`).
- Style the active select by giving it a `border-brutal-red` when its value ≠ the default.
- JSDoc the `intensity` prop in `MagneticCard.tsx` (1 = subtle, 5 = strong).
- Verify: focus ring on every chip, axe-core clean, refresh preserves filters.

**[FLOW] additions**
- The featured banner needs an `aria-label="Featured project"` and a focus ring on the inner CTA so keyboard users land on something meaningful when they tab into it.
- Add a sticky `Propose Project` CTA on mobile (only when the user passes `<RankGate>` from section 7) so the contribution loop is always one tap away.
- Wire the realtime project list: subscribe to `project` inserts so a freshly created project from another tab appears without refresh.

**Prompt to paste**
> You are implementing section **8. Projects List** of `UX_MASTER.md`. Read Part A, Part B, sections 7 and 15.5, then `src/pages/Projects.tsx`, `src/components/ui/RankGate.tsx`, and `src/lib/hooks.ts`. Execute the action plan AND the [FLOW] additions. Do not redesign empty states. Reuse section-0 primitives. End with a screenshot description of the active-filter chips, the loading skeleton, and a realtime-insert log.

---

## 9. Project Details — `src/pages/ProjectDetails.tsx`

**Audit findings**
1. Comment input has no character counter or maxlength (H5).
2. Delete-comment button uses `opacity-0 group-hover:opacity-100` — invisible on touch (WCAG 2.5.7 / 2.5.8).
3. Video play button has no loading state while the iframe loads (H1).
4. Reaction (heart, upvote) counts wait for the server before updating (H1, H8).
5. Milestone progress bar lacks `role="progressbar"` and ARIA values (WCAG 4.1.2).
6. `Back to Archive` assumes referrer (H3).

**Action plan**
- Add a 500-char limit and a `0/500` counter under the comment input. Disable submit at zero or over limit.
- Always render the delete button (visible, 32 px target). On click, open a small confirm popover (`Delete comment? Cancel / Delete`).
- Add an inline `<Loader2 className="animate-spin" />` overlay while the YouTube iframe loads.
- Use `useOptimistic` from section 0 to bump the reaction count immediately, then reconcile with the server response. Roll back and toast on failure.
- Add `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, and `aria-label="Project milestones complete"` on the progress bar.
- Replace `Back to Archive` with smart logic: if `window.history.length > 1`, render `Back`; otherwise render `Browse all projects`.
- Add a `Share` button using the Web Share API with a clipboard fallback and toast.
- Verify: keyboard delete confirmation flow, axe-core clean, mobile touch targets ≥ 44 px.

**[FLOW] additions**
- **F-401 [SEV-3]** `src/lib/hooks.ts:621-639` reaction toggle has no error handling — failures are silent. `src/lib/hooks.ts:696-703` `addComment` is the same. Wrap both in try/catch and `toast.error('Couldn't save your reaction — try again.')` / `'Couldn't post your comment.'`. After section 0 `useOptimistic` is in use, the rollback path needs the toast to fire.
- **F-402 [SEV-3]** Comments and reactions are the trigger for notification F-201/F-202. After section 15.5 trigger functions ship, no client change needed — but verify the trigger insertion fires by leaving a comment as user A and confirming user B's bell badge increments.
- **F-403 [SEV-3]** `useSupabaseQuery` does not subscribe; milestones and comments do not appear in realtime. Switch the `project_milestone` and `project_comment` reads to a `.subscribe()` pattern.
- **F-404 [SEV-2]** Cover image is not lazy-loaded; LCP suffers on slow connections. Add `loading="lazy"` and an explicit width/height to prevent CLS.
- **F-405 [SEV-2]** `supabase-schema.sql:661-670` RLS allows any authenticated user to comment or react with no rate limit. Add a Postgres trigger that rejects > 10 comments/minute per user and surface a friendly toast when the 429-equivalent error returns.

**Prompt to paste**
> You are implementing section **9. Project Details** of `UX_MASTER.md`. Read Part A, Part B, section 15.5, then `src/pages/ProjectDetails.tsx`, `src/lib/hooks.ts`, and `supabase-schema.sql`. Execute the action plan AND the [FLOW] additions. Reuse section-0 primitives, especially `useOptimistic` and toast. Do not redesign the page layout. End with a list of every aria-attribute added, a realtime comment log, a rate-limit error log, and an axe-core report.

---

## 10. Edit Project — `src/pages/EditProject.tsx`

**Audit findings**
1. No unsaved-changes guard (H3, data-loss risk).
2. Video URL validation only fires on blur (H1).
3. Search-collaborator field has no spinner while searching (H1).
4. Milestones cannot be reordered in the UI even though `display_order` exists (H7).
5. Member role selector is inconsistent with the rest of the form (H4).

**Action plan**
- Wire `useUnsavedChanges(formDirty)` from section 0.
- Validate the video URL `onChange`; show a red `<FieldError>` immediately on invalid input.
- Show a `<Loader2 />` inside the search input's right slot while `isSearching` is true.
- Implement drag-to-reorder milestones with `@dnd-kit/sortable` (or a 6-line custom up/down arrow control if dnd-kit is not in deps). Persist `display_order` on drop.
- Replace the `addingRole` selector with a `[Collaborator | Mentor]` toggle button group matching `ProfileSetup.tsx`.
- Add a sticky bottom action bar on mobile: `Save changes` + `Discard`.
- Verify: leaving the page with dirty state shows a confirm dialog; axe-core clean; keyboard reorder works (arrow keys + space).

**[FLOW] additions**
- **F-501 [SEV-3]** `EditProject.tsx:362` does an optimistic milestone insert with `id: 'temp-' + Date.now()`. If the server insert fails, the temp ID persists in the UI forever (and any subsequent edits target a non-existent row). Wrap in try/catch: on failure, REMOVE the temp row from local state and `toast.error('Couldn't add milestone — try again.')`. Same pattern for collaborator add.
- **F-502 [SEV-2]** Member list does not dedupe — adding the same user twice creates duplicate `project_member` rows. Add a client-side `existingMemberIds.has(userId)` guard before insert AND a unique constraint `(project_id, user_id)` in the SQL schema.
- **F-503 [SEV-2]** Video URL error focus: on blur invalid, focus stays on the next field instead of the error. Use `inputRef.current?.focus()` inside the error branch so screen-reader users hear the error in context.
- **F-504 [SEV-2]** Owner of the project should receive a notification when a collaborator is added (kind=`system`, link to the project) — wire via section 15.5 trigger.

**Prompt to paste**
> You are implementing section **10. Edit Project** of `UX_MASTER.md`. Read Part A, Part B, section 15.5, then `src/pages/EditProject.tsx`, `supabase-schema.sql`, and `src/lib/hooks.ts`. Execute the action plan AND the [FLOW] additions. Reuse `useUnsavedChanges`, `FieldError`, and toast. Add `@dnd-kit/sortable` only if it is already in `package.json`; otherwise use up/down arrow buttons. End with a checklist of validators added, a failed-insert rollback log, and an axe-core report.

---

## 11. Makers Directory — `src/pages/Makers.tsx`

**Audit findings**
1. Search placeholder mentions `domain` but the field doesn't search domains (H4).
2. Mentor star and rank badge can collide on small avatars (H8).
3. `visibleCount` exists but no working `Load More` button (H7).

**Action plan**
- Update placeholder to `Search makers by name or skill…`.
- Move the rank badge to top-left and the mentor star to top-right; add a `gap-1` between them and shrink to 18 px on `xs` breakpoints.
- Implement a working `Load More` button that increments `visibleCount` by 12, with a `Showing X of Y` counter above it.
- Add URL-synced search/filter state.
- Verify: keyboard nav, focus rings on cards, axe-core clean.

**[FLOW] additions — Mentor loop entry point**
- **F-601 [SEV-3]** This page is the only natural entry point for "find a mentor" flows surfaced from Dashboard F-305 and the view-only banner. Add a `?role=mentor` filter that pre-applies when the URL has it, with a visible chip showing the active filter.
- **F-602 [SEV-3]** Add a primary `Request Mentor` CTA on every mentor card, gated by an authenticated user, that opens the request modal (depends on the new `mentor_session_request` table from section 17). Until the table ships, render the button as `aria-disabled` with a tooltip `Coming in next release` — do NOT leave it broken.
- **F-603 [SEV-2]** Search "tag" wording is ambiguous — relabel to `Search by name or skill`. Domain filter belongs in a separate select chip group.
- **F-604 [SEV-2]** Skeleton count is hardcoded; should match `visibleCount` so the layout doesn't shift when results load.

**Prompt to paste**
> You are implementing section **11. Makers Directory** of `UX_MASTER.md`. Read Part A, Part B, sections 7, 12, 17, 15.5, then `src/pages/Makers.tsx`. Execute the action plan AND the [FLOW] additions. Reuse section-0 primitives. Do not change the user data shape. End with screenshots of the badge layout at xs / md / lg breakpoints, plus a screenshot of the `?role=mentor` URL-filter chip.

---

## 12. Maker Details / "Explorer Hub" — `src/pages/MakerDetails.tsx`

**Audit findings**
1. SVG icons load via `<use href="/icons.svg#…" />` with no `aria-label` and no fallback (WCAG 1.1.1).
2. Discord username is hidden inside a `title` attribute (H6).
3. Back link is small, faint, and not touch-friendly (WCAG 2.5.8).
4. `Tier 1/2/3` badges are not explained (H10).

**Action plan**
- Wrap each social `<svg>` in a `<a aria-label="{platform} profile">` and add a visible `<title>` element inside the SVG as a fallback. Verify icons.svg actually contains the symbols.
- Show the Discord handle as visible text next to the icon, with a click-to-copy button that toasts `Copied`.
- Convert the back link to a `Button variant="ghost"` with a 44 × 44 touch area and a focus ring.
- Add a small `?` info popover next to the `Tier` badge: `Highest challenge tier completed in this domain.`
- Add an `Open dashboard` CTA if the viewed profile is the logged-in user.
- Verify: every link has an accessible name, axe-core clean.

**[FLOW] additions — [SEV-4] mentor request entry**
- **F-701 [SEV-4]** `MakerDetails.tsx:151-182` shows the mentor identity block but has **no `Request Mentor Session` button**. This is the missing front door to the entire mentor loop. After the `mentor_session_request` table from section 17 lands, add a brutal-red primary CTA `Request Mentor Session` that opens a modal (topic, preferred slots, optional message), inserts a row into `mentor_session_request`, and fires a section-15.5 notification to the mentor. While the table is missing, render the CTA as `aria-disabled` with `title="Coming in next release"` — do NOT hide it (sets the design intent).
- **F-702 [SEV-3]** `MakerDetails.tsx:13-27` `SocialIcon` SVG has no `aria-label`. Wrap with `<a aria-label="${platform} profile">` (already in original action plan — confirmed).
- **F-703 [SEV-2]** Discord username currently inside `title` attribute — copy/paste UX for mentor introductions is broken. Surface as visible text with click-to-copy (already in action plan).
- **F-704 [SEV-2]** When the viewer IS the profile owner, render an `Edit profile` ghost button next to `Open dashboard` (extends original action plan).

**Prompt to paste**
> You are implementing section **12. Maker Details (Explorer Hub)** of `UX_MASTER.md`. Read Part A, Part B, sections 11, 17, 15.5, then `src/pages/MakerDetails.tsx`, the contents of `public/icons.svg` if present, and `supabase-schema.sql`. Execute the action plan AND the [FLOW] additions. Reuse section-0 primitives. End with an axe-core report, a list of every accessible name added, and a screenshot of the `Request Mentor Session` CTA in both enabled and disabled states.

---

## 13. Challenges + Challenge Details — `src/pages/Challenges.tsx`, `src/pages/ChallengeDetails.tsx`

**Audit findings**
1. Page title `Explorer Hub` does not match the route `/challenges` (H4, navigation clarity).
2. Tier filter active state is CSS-only and is not URL-synced (H6).
3. `DOMAIN_COLORS` is hardcoded with hex; some colors fail 4.5:1 against the brutalist dark background (WCAG 1.4.3).
4. Challenge detail page likely lacks a clear submission status indicator (H1).

**Action plan**
- Decide on **one** page title — `Challenges` is the safer match. If the brand insists on `Explorer Hub`, add a breadcrumb `Challenges › Explorer Hub`.
- URL-sync `tierFilter` and `domainFilter` via `useSearchParams`.
- Replace `DOMAIN_COLORS` with Tailwind tokens defined in `tailwind.config.{js,ts}`. Run a contrast check; bump any color that's < 4.5:1 against `brutal-dark` and against `brutal-cream`.
- On `ChallengeDetails`, add a clear status pill: `Not started / In progress / Submitted / Approved / Rejected`. Show the submission CTA only when applicable.
- Add countdown for time-bound challenges (reuse the events countdown helper).
- Verify: keyboard nav, focus rings, axe-core clean.

**[FLOW] additions**
- **F-801 [SEV-3] WCAG 1.4.3 confirmed.** `Challenges.tsx:39-47` `DOMAIN_COLORS` is hardcoded with `blue-600 / green-700 / purple-600 / amber-600`, all of which fail 4.5:1 against `brutal-cream`. Replace with token equivalents picked from a contrast-validated palette (suggested: `#1E3A8A`, `#14532D`, `#5B21B6`, `#78350F`). Run `axe-core` on the chip rendered against the cream background and confirm Pass.
- **F-802 [SEV-3]** `useCountdown` is currently inlined per page. Extract to `src/lib/hooks.ts` as a shared helper and reuse across `Challenges`, `ChallengeDetails`, `EventDetails`, and the dashboard. (Section 14 has the same finding — must be the same helper.)
- **F-803 [SEV-2]** Submission notes need a 1000-char limit and a counter (mirrors Section 9).
- **F-804 [SEV-2]** Submission URL needs `new URL()` validation in a try/catch with `<FieldError>`.
- **F-805 [SEV-2]** `Submit` button needs `toast.promise(submitChallenge, { loading, success, error })` so the user sees state for the full request lifecycle.
- **F-806 [SEV-2]** Add a `Start Challenge` state that creates a draft submission row so the UI can show `In progress` immediately on the list view.
- **F-807 [SEV-3]** Wrap the `Submit Challenge` action in `<RankGate feature="submit_challenge">` (Section 7 dependency).

**Prompt to paste**
> You are implementing section **13. Challenges + Challenge Details** of `UX_MASTER.md`. Read Part A, Part B, sections 7, 14, 15.5, then `src/pages/Challenges.tsx`, `src/pages/ChallengeDetails.tsx`, `src/lib/hooks.ts`, and `tailwind.config.*`. Execute the action plan AND the [FLOW] additions. The shared `useCountdown` helper is non-negotiable — ship it once. Reuse section-0 primitives. End with a contrast-check table for every domain color (with computed ratios), proof that all four pass 4.5:1 against `brutal-cream` AND `brutal-dark`, and an axe-core report.

---

## 14. Events + Event Details — `src/pages/Events.tsx`, `src/pages/EventDetails.tsx`

**Audit findings**
1. Countdown silently disappears at > 30 days out (H1).
2. Past events look the same as upcoming ones (H4).
3. Capacity copy alternates between `spots left` and `registered` (H4).
4. No `Add to calendar` affordance on event detail (H7).
5. RSVP confirmation likely lacks toast feedback (H1).

**Action plan**
- For events > 30 days out, show an `Upcoming` chip with the event date instead of hiding the countdown.
- Apply `grayscale opacity-75` to past event cards and replace the primary action with a `View recap` link.
- Standardize capacity copy to `{remaining} spots left · {registered}/{capacity}`.
- On the detail page, add a `Add to calendar` dropdown (Google, Apple, Outlook, .ics download).
- After RSVP, fire `toast.success("You're in. Check your email for the .ics file.")` and update the button to `You're going · Cancel RSVP`.
- Verify: keyboard nav on the dropdown, focus traps where appropriate, axe-core clean.

**[FLOW] additions**
- **F-901 [SEV-3]** `EventDetails.tsx:56-88` `CountdownHero` returns null silently when `diff <= 0` AND `EventDetails.tsx:67` makes the countdown vanish silently if event > 30 days out. Replace BOTH with explicit chips: `Live now` (diff <= 0 and event_end > now), `Started` (event_end < now), `Upcoming · {date}` (> 30 days). Use the shared `useCountdown` from section 13 F-802.
- **F-902 [SEV-3]** `EventDetails.tsx:738` `useEventRegistration()` does not send an email after RSVP. Wire a Supabase edge function `send-rsvp-email` (or trigger from a SQL trigger that posts to a webhook). Until the email function exists, at minimum insert an `event_reminder` notification (kind from section 15.5) scheduled for 24h before the event.
- **F-903 [SEV-3]** No "Add to calendar" UI anywhere in the file. Build an inline ICS string builder (no dependency) that emits `data:text/calendar;charset=utf-8,...` and offers Google / Apple / Outlook / .ics download options in a dropdown.
- **F-904 [SEV-2]** `Cancel RSVP` should be a full button, not a small text link. After cancel, fire `toast.success("RSVP cancelled.")` and re-show the original `RSVP` CTA.
- **F-905 [SEV-2]** Add waitlist behavior: when capacity is full, allow waitlist signup, surface position, auto-promote on cancel.

**Prompt to paste**
> You are implementing section **14. Events + Event Details** of `UX_MASTER.md`. Read Part A, Part B, sections 13 and 15.5, then `src/pages/Events.tsx`, `src/pages/EventDetails.tsx`, and `src/lib/hooks.ts`. Execute the action plan AND every [FLOW] addition. Reuse the shared `useCountdown` hook from section 13. Implement the calendar dropdown without adding a heavy dependency — a small inline ICS string builder is fine. End with screenshots of the past-event style, the `Live now` / `Upcoming` chip states, and an axe-core report.

---

## 15. Badges — `src/pages/Badges.tsx`

**Audit findings**
1. Progression timeline uses absolute positioning that crowds on small screens (H8).
2. Badge unlock conditions are not surfaced (H10).

**Action plan**
- Refactor the timeline to a horizontal row on `md+` and a vertical stack on mobile.
- Add a hover/focus popover (or tap drawer on mobile) showing each badge's unlock criteria and progress (`3 / 5 projects shipped`).
- Add a celebratory micro-interaction when a badge is newly earned: 600 ms scale spring + confetti respecting `prefers-reduced-motion`.
- Verify: keyboard reachable popovers, axe-core clean.

**[FLOW] additions**
- **F-1001 [SEV-3]** No leaderboard page exists yet, but the badges page should still link to a `View Global Leaderboard` CTA — even if it 404s today, file the route stub. Without it the rank loop has no comparative motivation.
- **F-1002 [SEV-3]** Show `X / Y XP to next rank` next to each rank pill so users understand the climb.
- **F-1003 [SEV-2]** Add a `How XP Works` collapsible card explaining the events that award XP, sourced from `xpEngine.ts` constants so it stays in sync.
- **F-1004 [SEV-2]** Subscribe to the `notification` table for `kind='rank_up'` and `kind='badge_earned'` (section 15.5) so a rank-up while the page is open immediately animates the timeline.

**Prompt to paste**
> You are implementing section **15. Badges** of `UX_MASTER.md`. Read Part A, Part B, sections 7 and 15.5, then `src/pages/Badges.tsx`, `src/components/ui/RankUpModal.tsx`, `src/components/ui/RankBadge.tsx`, and `src/lib/xpEngine.ts`. Execute the action plan AND the [FLOW] additions. Reuse section-0 primitives. End with breakpoint screenshots at 320, 768, and 1280 px and proof that an `awardXP` call from another tab triggers the rank-up animation here.

---

## 15.5. Notifications System (NEW — does not exist yet) — **[SEV-4 BLOCKING]**

**Scope:** Cross-cutting infrastructure required by sections 7, 9, 11, 12, 14, 16, 17. Currently the codebase has zero `notification`, `message`, or `inbox` tables in `supabase-schema.sql`, no notification hook in `src/lib/hooks.ts`, and no bell icon in the navbar. Without this, mentor session requests, project comment replies, RSVP reminders, store order updates, and rank-up celebrations have no in-app surface — every flow that "should ping the user" silently dies on the server.

**Audit findings (flow-trace)**
1. **F-201 [SEV-4]** Project owners are never notified when a viewer comments on or reacts to their project. The contribution loop is mute.
2. **F-202 [SEV-4]** Mentors are never notified when a session request arrives (depends on Section 17's new table). Requests rot.
3. **F-203 [SEV-4]** Admins are never notified when a new project is proposed and needs review.
4. **F-204 [SEV-3]** Event RSVPs receive no day-of reminder.
5. **F-205 [SEV-3]** Store orders have no status-change notification (pending → packed → shipped).
6. **F-206 [SEV-3]** Rank-up events fire `RankUpModal` only if the user is on the page when XP crosses the threshold; offline rank-ups are lost.
7. **F-207 [SEV-2]** No badge count anywhere; users have no signal that anything happened while they were away.

**Schema (add to `supabase-schema.sql`)**
```sql
create table if not exists public.notification (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  kind text not null check (kind in (
    'comment_received','reaction_received','project_review_requested',
    'mentor_session_requested','mentor_session_responded',
    'event_reminder','rsvp_confirmed',
    'store_order_status','rank_up','badge_earned','system'
  )),
  subject_table text,
  subject_id uuid,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notification_recipient_unread_idx
  on public.notification(recipient_id, created_at desc) where read_at is null;
create index notification_recipient_all_idx
  on public.notification(recipient_id, created_at desc);

alter table public.notification enable row level security;
create policy notification_select_own on public.notification
  for select using (auth.uid() = recipient_id);
create policy notification_update_own on public.notification
  for update using (auth.uid() = recipient_id);
-- Inserts happen via SECURITY DEFINER trigger functions; no direct insert policy.
```

**Trigger functions (one per kind, server-side)**
- `on_comment_insert` → insert notification for project owner with `kind='comment_received'`, `link='/projects/'||NEW.project_id`.
- `on_reaction_insert` → same pattern.
- `on_project_insert` → insert notification for every admin with `kind='project_review_requested'`.
- `on_mentor_session_request_insert` → insert notification for the target mentor (see Section 17).
- `on_rank_up` (called from `xpEngine.ts` after detecting rank crossing) → insert notification for the user.

**Client primitives**
- `src/lib/hooks.ts` → add `useNotifications()` returning `{ items, unreadCount, markRead, markAllRead }`. It MUST use a Supabase `realtime` subscription on `notification` filtered by `recipient_id=eq.${userId}` so new rows arrive without polling.
- `src/components/notifications/NotificationBell.tsx` → bell icon + red dot when `unreadCount > 0`. Mounted in `Navbar.tsx` between `XPHudPill` and the avatar.
- `src/components/notifications/NotificationCenter.tsx` → popover with grouped list (Today / Earlier / Read). Clicking an item calls `markRead(id)` then navigates to `link`.
- `useRankUp()` (Section 7/15 dependency) consumes notifications of `kind='rank_up'` and triggers the existing `RankUpModal`.

**Action plan**
- Ship the schema, indexes, RLS, and trigger functions in one migration. Seed two test notifications for the demo account.
- Build `useNotifications`, `NotificationBell`, `NotificationCenter`. Mount the bell in the navbar (Section 18).
- Wire the existing `xpEngine.awardXP` to insert a `rank_up` notification when crossing a threshold (and idempotency-guard the insert — see Section 7).
- Honor `prefers-reduced-motion` on the bell's red-dot pulse and the popover open animation.
- Verify: a viewer comments on a project → owner sees a real-time bell badge increment without refresh; clicking it navigates to the project; the row's `read_at` populates; badge count drops.

**Prompt to paste**
> You are implementing section **15.5 Notifications System** of `UX_MASTER.md`. Read Part A, Part B, and section 18 here. Then read `supabase-schema.sql`, `src/lib/hooks.ts`, `src/components/layout/Navbar.tsx`, and `src/lib/xpEngine.ts`. Execute the action plan exactly: ship the migration, the trigger functions, the `useNotifications` hook with realtime subscription, `NotificationBell`, and `NotificationCenter`. Do not modify the brutalist navbar layout — only add the bell. End with a screen-recording-equivalent description of: comment posted by user A → real-time badge increment for user B without refresh → click → mark read → badge clears, plus an axe-core report on the popover.

---

## 16. Store — `src/pages/Store.tsx`

**Audit findings (verify in file)**
1. Likely shares the inconsistent loading/empty patterns from the rest of the app.
2. Likely lacks toast feedback on add-to-cart.
3. Likely lacks accessible product card focus rings.

**Action plan**
- Add `<Skeleton variant="card" count={6} />` while products load.
- Wrap product cards in a focusable `<Card>` with the shared focus ring.
- Add `toast.success('Added to cart')` on add-to-cart with an `Undo` action.
- If checkout exists, audit it as a sub-step: enforce a single primary CTA per step, real-time field validation, and a clear order summary. If checkout does not exist yet, mark the section `EVIDENCE_INSUFFICIENT` and stop.
- Verify: keyboard add-to-cart, axe-core clean.

**[FLOW] additions — [SEV-4 BLOCKING] entire commerce surface missing**
- **F-1101 [SEV-4]** `Store.tsx` has NO `/store/cart` page, NO `/store/checkout` page, NO `/store/:productId` detail page. `placeOrder()` inserts directly into `store_order` with `status='pending'` and **no payment step**. This is not investor-shippable.
- **F-1102 [SEV-4]** No client-side cart persistence (no Zustand/context store, no localStorage fallback). Refresh = lost cart.
- **F-1103 [SEV-4]** No order status notifications (depends on section 15.5 `kind='store_order_status'`).
- **F-1104 [SEV-3]** No category/filter UI on the product grid.
- **F-1105 [SEV-3]** No product detail page; users cannot read full descriptions, see multiple images, or pick variants.

**Action plan additions (replace original action plan if checkout is missing)**
- **Phase 1 — Cart**:
  - Build `src/store/cartStore.ts` (Zustand) with `{ items, add, remove, updateQty, clear }`. Persist to `localStorage`.
  - Build `/store/cart` route with the brutalist line-item layout, qty steppers, subtotal, and a primary `Checkout` CTA. Empty state: `Your cart is empty.` (out of scope for empty redesign — just a headline).
- **Phase 2 — Product detail**:
  - Build `/store/:productId` route. Hero image, description, price, qty stepper, `Add to cart` (toast + Undo). Lazy-load image.
- **Phase 3 — Checkout** (single page, four steps via wizard state):
  - Step 1 Shipping: name, address, phone, pin. Real-time validation, `<FieldError>`.
  - Step 2 Payment: integrate Razorpay (or Stripe) — wire the client SDK and the order-creation edge function. Do NOT roll your own payment.
  - Step 3 Review: cart summary, address summary, terms checkbox, primary `Place order` CTA.
  - Step 4 Confirmation: order ID, expected delivery, `View order status` link, `toast.success`.
  - On `Place order`, transition `store_order.status` from `pending → paid` only after the payment webhook fires.
- **Phase 4 — Order tracking**: `/store/orders` list + `/store/orders/:id` detail. Status timeline `paid → packed → shipped → delivered`. Subscribe to the order row in realtime. Each status change inserts a section-15.5 notification.
- **Schema additions** to `supabase-schema.sql`:
  ```sql
  alter table public.store_order add column if not exists razorpay_order_id text;
  alter table public.store_order add column if not exists razorpay_payment_id text;
  alter table public.store_order add column if not exists shipping_address jsonb;
  alter table public.store_order add column if not exists status text not null default 'pending'
    check (status in ('pending','paid','packed','shipped','delivered','cancelled','refunded'));
  create index if not exists store_order_user_idx on public.store_order(user_id, created_at desc);
  ```

**Prompt to paste**
> You are implementing section **16. Store** of `UX_MASTER.md`. Read Part A, Part B, sections 9, 15.5, 17, then `src/pages/Store.tsx`, `supabase-schema.sql`, and any existing `cartStore` or order helper. Execute the [FLOW] action plan in phases (Cart → Product detail → Checkout → Order tracking). Use Razorpay (or whatever payment provider is already in `package.json`); do not invent payment. Reuse section-0 primitives. End with: a screen-recording-equivalent description of the full add-to-cart → checkout → confirmation → order-status notification path, the razorpay-test-card receipt, and an axe-core report on every new route.

---

## 17. Mentor Dashboard — `src/pages/MentorDashboard.tsx`

**Audit findings**
1. Likely shares review-queue patterns with admin pages and the regular dashboard — verify consistency.
2. Long review queues likely lack pagination, filtering, and bulk actions (H7).
3. Approve / reject actions likely lack confirmation and toast feedback (H5, H1).

**Action plan**
- Audit the review queue table; add column sort, a status filter, and pagination (10 / 25 / 50).
- Add a confirmation popover on `Reject` with a required reason field.
- Toast every approve/reject; include an `Undo` action that reverses the call within 5 s.
- Add keyboard shortcuts: `j` / `k` to move between items, `a` to approve, `r` to reject (document in a `?` shortcuts modal triggered by `?`).
- Verify: shortcuts respect input focus, axe-core clean.

**[FLOW] additions — [SEV-4 BLOCKING] mentor session requests do not exist**
- **F-1201 [SEV-4]** `MentorDashboard.tsx` (412 lines) handles event submissions and showcase slots only — there is **zero code** for mentor session requests. No fetch, no UI, no approve/reject. Combined with F-701 (no entry CTA on `MakerDetails`), the mentor loop is structurally absent.
- **F-1202 [SEV-3]** `MentorDashboard.tsx:87` calls `window.location.reload()` after an action — destroys all client state, kills the back/forward stack, and is the worst possible feedback. Replace with `toast.promise()` + local state update.
- **F-1203 [SEV-3]** Reject without a required reason field — mentees get rejected with no context.
- **F-1204 [SEV-2]** Approve / Reject buttons use inconsistent styles vs the rest of the dashboard.

**Schema (add to `supabase-schema.sql`)**
```sql
create table if not exists public.mentor_session_request (
  id uuid primary key default gen_random_uuid(),
  mentee_id uuid not null references public.profiles(id) on delete cascade,
  mentor_id uuid not null references public.profiles(id) on delete cascade,
  topic text not null,
  message text,
  preferred_slots jsonb,            -- array of ISO timestamps
  scheduled_at timestamptz,
  status text not null default 'pending'
    check (status in ('pending','accepted','rejected','completed','cancelled')),
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index msr_mentor_pending_idx
  on public.mentor_session_request(mentor_id, created_at desc) where status='pending';
create index msr_mentee_all_idx
  on public.mentor_session_request(mentee_id, created_at desc);

alter table public.mentor_session_request enable row level security;
create policy msr_mentee_select on public.mentor_session_request
  for select using (auth.uid() = mentee_id);
create policy msr_mentor_select on public.mentor_session_request
  for select using (auth.uid() = mentor_id);
create policy msr_mentee_insert on public.mentor_session_request
  for insert with check (auth.uid() = mentee_id);
create policy msr_mentor_update on public.mentor_session_request
  for update using (auth.uid() = mentor_id);

-- Trigger: insert notification on new request and on status change.
-- Wire to section 15.5 notification table.
```

**Action plan additions**
- Build a `Mentor Session Requests` queue panel at the top of `MentorDashboard.tsx`. Columns: mentee, topic, requested at, preferred slots, status. Actions: `Accept` (opens slot picker), `Reject` (opens reason field, required, 280 char limit). On accept, fire a `mentor_session_responded` notification (section 15.5) to the mentee with the chosen slot. On reject, same kind with the reason.
- Replace `window.location.reload()` with `toast.promise(updateRequest, { loading: 'Saving…', success: 'Updated.', error: 'Couldn't save — try again.' })` and update local state in place.
- Approve and Reject buttons must use the brutalist primary/ghost variants from section 0 — same as everywhere else.
- Wire the section-15.5 trigger function `on_mentor_session_request_insert` so the mentor's bell badge ticks the moment a mentee submits.
- Verify: a new request inserted from `MakerDetails.tsx` (section 12 F-701) lands here in realtime; reject flow requires a reason; accept flow shows the chosen slot to the mentee via notification.

**Prompt to paste**
> You are implementing section **17. Mentor Dashboard** of `UX_MASTER.md`. Read Part A, Part B, sections 11, 12, 15.5, then `src/pages/MentorDashboard.tsx`, `supabase-schema.sql`, `src/lib/hooks.ts`, and the admin review pages it shares logic with. Execute the action plan AND the [FLOW] additions, INCLUDING the schema migration for `mentor_session_request`. Reuse section-0 primitives. Replace every `window.location.reload()` with toast + state update. End with a keyboard-shortcuts cheat sheet, a full request → notification → accept → mentee notification log, and an axe-core report.

---

## 18. Global Navbar — `src/components/layout/Navbar.tsx`

**Audit findings**
1. Mobile menu does not close if a tapped link does not change the route (H3).
2. Avatar dropdown overlaps content on mobile (H8).
3. XP pill truncates with long rank names (H8).
4. Active route highlight is fragile for nested routes (H6).
5. No skip-to-content link (WCAG 2.4.1).

**Action plan**
- Add `onClick={() => setMobileOpen(false)}` to every mobile nav link.
- On viewports < 768 px, render the avatar menu as a bottom sheet (`fixed inset-x-0 bottom-0`) with a backdrop and focus trap.
- Truncate long rank names with an abbreviation map (`Innovator` → `Inno`) below `sm`. Show full name in the avatar dropdown.
- Compute the active link with: `location.pathname === to || location.pathname.startsWith(to + '/')`. Test against `/projects/123`, `/challenges/abc`, `/makers/me`.
- Add a visually hidden `Skip to main content` link as the first focusable element; reveal on focus.
- Verify: keyboard nav across all breakpoints, axe-core clean, no scroll-lock leaks.

**[FLOW] additions**
- **F-1301 [SEV-3]** Mount the new `<NotificationBell />` from section 15.5 between `XPHudPill` and the avatar. The bell consumes `useNotifications()` and shows a red dot when `unreadCount > 0`. Animate the dot pulse only if `prefers-reduced-motion: no-preference`.
- **F-1302 [SEV-3]** `XPHudPill.tsx` does not subscribe to `profiles` realtime. Switch to a subscription so XP/rank changes (from comments, project creates, challenge submits in other tabs) reflect immediately.
- **F-1303 [SEV-2]** Use the rank abbreviation map: Curious → CUR, Tinkerer → TIN, Builder → BLD, Maker → MKR, Innovator → INN, Lab Lead → LAB. On hover/focus, show a tooltip `{Full name} · X / Y XP to next rank`.
- **F-1304 [SEV-2]** Skip-to-content link must land on `<main id="main-content">` — verify `RootLayout.tsx` has the correct id.

**Prompt to paste**
> You are implementing section **18. Global Navbar** of `UX_MASTER.md`. Read Part A, Part B, sections 7 and 15.5, then `src/components/layout/Navbar.tsx`, `src/components/layout/RootLayout.tsx`, `src/components/layout/XPHudPill.tsx`, and the new `src/components/notifications/NotificationBell.tsx`. Execute the action plan AND the [FLOW] additions. Reuse section-0 primitives. End with breakpoint screenshots, a realtime XP-update screen-recording-equivalent, and an axe-core report.

---

## 19. Footer — `src/components/layout/Footer.tsx`

**Audit findings**
1. `System Operational` pulse has no meaning (H10).
2. Legal links go to `#` (H3).

**Action plan**
- Either remove the status pulse or wire it to a real status endpoint and show `Last updated {time}`.
- Replace `#` legal links with real routes (`/legal/terms`, `/legal/privacy`) and create stub pages with a `Last updated` line. Empty content is fine — broken affordances are not.
- Add focus rings to every footer link.

**Prompt to paste**
> You are implementing section **19. Footer** of `UX_MASTER.md`. Read Part A and Part B, then `src/components/layout/Footer.tsx` and `src/App.tsx`. Execute the action plan. Reuse section-0 primitives. Stub legal pages are acceptable. End with an axe-core report.

---

## 20. Verification & Sign-off Pass (run LAST)

After every component instance has shipped, run a final verification instance.

**Scope**
- Lighthouse mobile run on `/`, `/login`, `/register`, `/dashboard`, `/projects`, `/projects/:id`, `/makers`, `/challenges`, `/events`. Record LCP, INP, CLS.
- Axe-core scan on the same routes; zero serious / critical violations.
- Keyboard-only walkthrough of the full first-time-visitor flow: landing → sign up → verify email → sign in → profile setup → create project → edit project → comment on a project → log out.
- Grep audit: zero `alert(`, zero `Authenticate|Create Identity|New initialization`, zero `console.log` left in `src/`.
- Screen-reader smoke test (VoiceOver or NVDA) on landing, login, dashboard, project details.
- Cross-browser smoke test on Safari, Chrome, Firefox at 320 / 768 / 1280 / 1920 px.

**Prompt to paste**
> You are running section **20. Verification & Sign-off** of `UX_MASTER.md`. Do **not** edit code unless you find a regression. Read Part A and Part B for context. Execute every check in the Scope list above and produce a single signed-off report with a Pass/Fail verdict per route and a list of any blocking issues found. If any blocker exists, file a follow-up ticket referencing the relevant section number from this file.

---

# PART D — SANITY CHECK BEFORE YOU SHIP

Before declaring any rewrite investor-ready, verify all of the following return true:

- [ ] Section 1 is split into 1A/1B/1C/1D, contains the Wall-E flicker keyframe table, and contains zero references to "free forever / no credit card / 10 second signup".
- [ ] Every section being shipped contains at least one finding sourced from a flow trace, not only from a per-file scan.
- [ ] Every animation-related ticket mentions `prefers-reduced-motion`.
- [ ] Every form-related ticket mentions real-time validation, focus order, and accessible error feedback.
- [ ] Every ticket reuses Section 0 primitives instead of redefining them.
- [ ] No ticket proposes removing the robot, the personalization, the chip flow, or the italic-serif headline.
- [ ] No ticket contains generic SaaS trust copy.
- [ ] You have produced computer:// links for every deliverable in your final reply to the user.

If any of those is false, you are not done. Keep working.
