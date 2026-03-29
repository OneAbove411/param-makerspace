# Param Makersadda — Full Redesign Workflow

> **This file contains 3 tracks:**
> - **Track A** — Google Stitch (for the 2D layout / UI design of all 4 sections)
> - **Track B** — Google AI Studio / Gemini (for the 3D robot scene, shaders, scroll animations, and code)
> - **Track C** — Whisk (for generating hero placeholder images / textures)
>
> **Work them in parallel.** Stitch gives you the page layout. AI Studio gives you the immersive 3D code. Whisk gives you placeholder assets. Then merge.

---

## BEFORE YOU START: Gather Your References

Take these screenshots and save them — you'll upload them alongside prompts:

1. **Your current Navbar** — screenshot from param-ms.netlify.app (the floating pill navbar). The AI must design BETWEEN this navbar and footer, not replace them.
2. **Your current Footer** — screenshot the dark rounded-top footer.
3. **gsap.com** — screenshot the hero and 2-3 sections. Study how they use scroll-triggered reveals, staggered animations, and parallax. This is the gold standard for scroll animation design.
4. **apple.com/macbook-pro** (or any Apple product page) — screenshot the product reveal sections. Study the sticky scroll technique: product stays fixed while text/specs scroll around it, canvas-based frame sequences, and how the product rotates/opens on scroll. This is the feel we want for the robot reveal.
5. **x.company** — screenshot 2-3 sections for minimal section rhythm and bold typography.
6. **unitree.com/go2** — screenshot the robot's product shots. Note: the 4D LiDAR "eye" on the front sensor, the aluminum alloy body texture, matte black + silver finish, and the various gaits (walking, crouching, standing alert).
7. **bostondynamics.com/products/spot** — screenshot for reference on how a premium robotics company presents a quadruped robot. Note the cinematic video sections and spec callouts.
8. **Awwwards Three.js collection** (awwwards.com/websites/three-js/) — browse and screenshot 2-3 sites that have the level of 3D interactivity you want. Good examples: OHZI Interactive (cursor-reactive distortions), Samsy (cyberpunk 3D world), Solar Journey (space exploration).
9. **Your current site at param-ms.netlify.app** — screenshot the full landing page so the AI knows what exists.

---

# TRACK A — Google Stitch (2D Layout & UI)

> Stitch handles the **page structure, typography, cards, spacing, and content layout.** It does NOT handle 3D or complex JS. Keep prompts under ~5000 characters each.

## Step A1: Feed Reference URLs

Before typing anything, use Stitch's URL extraction on:
- `https://gsap.com` — scroll animation mastery, dark-mode done right, developer-focused editorial feel
- `https://x.company` — bold minimal sections, dramatic typography
- `https://www.apple.com/macbook-pro/` — product reveal scroll patterns, sticky positioning, cinematic pacing

This primes Stitch with premium animation rhythm, Apple-tier product reveal DNA, and bold section structure.

## Step A2: Anchor Prompt

```
Act as a Senior UI/UX Designer specializing in editorial brutalist web design and high-end landing pages.

Context: A landing page for "Param Makersadda" — a community-driven AI & Robotics makerspace platform. Makers learn by building real projects, earn XP ranks, and collaborate on robotics, electronics, and fabrication. The mascot is a Unitree Go2 robot dog that will be rendered as an interactive 3D model (handle this separately — just leave space for it).

Structure: Single-page vertical scroll, exactly 4 full-viewport (100dvh) sections: Hero → Features → Social Proof → CTA. No sidebar. No multi-page. A fixed floating pill-shaped navbar sits at the top (already built — do NOT design it). A dark footer with rounded-top corners sits at the bottom (already built — do NOT design it).

Aesthetic: Editorial brutalist meets cyber-industrial. Dramatic italic serif headlines, monospace data text, museum-level whitespace. Dark mode only. Restrained 3-color palette:
- Background: #111111 (near-black)
- Text: #F5F3EE (warm off-white)
- Accent: #C4291E (brutal red — used ONLY for CTAs, highlights, hover states, the robot's eye glow)
No gradients except one subtle cursor-following radial glow on the hero. No rounded blobs. Sharp, confident, technical. Think $20,000 agency landing page.

Design references (study these for rhythm and pacing):
- gsap.com — scroll-triggered reveals, dark mode, developer editorial feel
- apple.com product pages — sticky scroll product reveals where the product stays fixed and content scrolls around it, cinematic pacing, canvas-driven frame sequences
- x.company — bold minimal sections, dramatic typography, 3-4 sections max
- unitree.com/go2 — the actual robot we're showcasing, study the product photography angles
- Awwwards Three.js sites — for the level of 3D interactivity and immersion we're targeting

Typography:
- DM Serif Display italic — dramatic headlines (hero, section titles)
- Space Grotesk bold uppercase tight tracking — card titles, labels, stats
- Space Mono monospace — body text, timestamps, data

Tech: Tailwind CSS, responsive, dark mode.

Rules:
1. NO accordion or expand/collapse cards anywhere. All content always visible.
2. NO card that closes when another opens. This is banned.
3. Pixel-perfect alignment between all text elements.
4. Every section should have at least 80px vertical padding.
5. Follow all instructions with extreme precision. Do not simplify or genericize.
```

> **Save a screenshot after this works.**

## Step A3: Inject — Hero Section

```
On the Hero section (Section 1, full viewport height):

Left half (50%) — vertically centered text stack with staggered entrance animations:
1. "Welcome" — DM Serif Display italic, ~7rem, warm off-white
2. "to Param Makersadda." — DM Serif Display italic, ~4.5rem. "Param" in full white, "Makersadda." in red (#C4291E)
3. Monospace tagline at 45% opacity: "Where makers build the future, together."
4. Rotating word — DM Serif Display italic ~2.8rem: "What would you [build]?" — the bracketed word is red and cycles (build/create/invent/explore/design) with vertical slide animation every 2.8s
5. Thin 20px red accent line, 1px tall, subtle pulse animation
6. Red pill CTA button: "Start Exploring" — Space Grotesk bold uppercase, generous padding, red glow shadow on hover

Right half (50%) — reserved for 3D robot canvas (Apple product reveal style):
- The robot area should feel like an Apple product hero — a dramatic reveal out of darkness
- Dark negative space with atmosphere, NOT empty
- Subtle animated dot grid background (32px spacing, 4% opacity warm dots, slow diagonal drift)
- ~30 tiny red particles floating in a loose cloud formation, simulating the robot's LiDAR scanning its environment
- A faint red glow point where the robot's front 4D LiDAR sensor ("eye") will be
- Small monospace label at bottom: "Interactive 3D — Unitree Go2" at 20% opacity
- A very subtle cursor-following radial gradient (red at 4% opacity, 500px radius)
- Think of how apple.com reveals a MacBook out of pure black — the robot should emerge from darkness with cinematic lighting catching its aluminum edges

Bottom center: "Scroll" + animated bouncing chevron, monospace 10px, 20% opacity.

The right side should feel like a living dark atmosphere with ambient energy — cinematic negative space, not an empty div. Reference: the OHZI Interactive site on Awwwards where cursor movement triggers visual distortions.
```

## Step A4: Inject — Features Section

```
On Section 2, "Discover" (full viewport):

Header: DM Serif Display italic "Discover" at ~5rem. Monospace subtitle: "Everything about Param in 60 seconds." at 40% opacity.

3 static cards in a row. Always visible. No accordions. No chevrons. No collapse.

Card styling: #111111 background, 1px border at rgba(245,243,238, 0.08), rounded-2xl (16px). 24-32px internal padding. On hover: border shifts to rgba(196,41,30, 0.25), 2px Y-lift, 300ms ease-out transition.

Card 1 — "The Philosophy":
Globe icon in circular red-tinted container (15% opacity bg). Three paired statements side-by-side with red divider between each pair:
"Curiosity in." → "Innovation out."
"No degrees required." → "No gatekeeping."
"Build real things." → "Ship to the real world."
Bottom: "Built in India. Open to the world." at 50% opacity.

Card 2 — "New Here?":
Lightbulb icon. Three items each with icon + bold title + description:
1. "A Maker is anyone who builds." — No degree needed.
2. "A community, not a classroom." — Learn by doing.
3. "Real projects, real impact." — 3D-printed prosthetics to interactive art.

Card 3 — "How It Works":
Target icon. Three numbered steps:
01 — "Pick a Challenge": Browse challenges across electronics, robotics, design.
02 — "Build & Share": Work at your pace. Document everything.
03 — "Grow Your Skills": Earn XP, unlock ranks from Curious to Lab Pro.

Cards fade in from below with 80ms stagger when section scrolls into view.
```

## Step A5: Inject — Social Proof Section

```
Section 3, "Built by Makers" (full viewport):

Header: Space Grotesk bold uppercase ~5rem.

Stats bar — always visible, single row, subtle border + padding:
"47" (Space Mono ~3rem bold) + "Projects Built" label (10px, 35% opacity, uppercase)
Vertical divider
"12" + "Active Makers"

Two side-by-side blocks below:

Left — "Featured Projects": 3 stacked project cards, all visible (no accordion):
Each: 4:3 image, red domain tag (#Fabrication/#Robotics/#Electronics), bold title, one-line summary, builder credit. Hover: image 1.05x scale, border red tint.
Images:
- https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=600&auto=format&fit=crop&q=80
- https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=600&auto=format&fit=crop&q=80
- https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop&q=80
"View All Projects →" red link.

Right — "Rank Progression": 3x2 grid, 6 rank nodes (all visible):
Each: 48px circular icon, rank name bold uppercase, XP in red, short description.
Curious (0), Tinkerer (50), Builder (150), Maker (300), Innovator (500), Lab Pro (800).
```

## Step A6: Inject — CTA Section

```
Section 4, centered, max 768px wide (full viewport):

DM Serif Display italic ~5rem: "You don't need permission to build something amazing."

Monospace 14px, 40% opacity: "Join a community of makers who started exactly where you are now — curious, excited, and ready to learn by doing."

Two side-by-side blocks (always visible, NO accordions):

Left — "Live Activity": Red dot "Live" pill badge. 4 items:
"5 min ago — elena_k uploaded a blueprint for 'Solar Kiln v3'"
"12 min ago — julian_v earned the 'Mechanical Kinematics' badge"
"1 hr ago — Main Lab 3D Printer v2 is now available"
"3 hr ago — sarah_j completed the 'Neural Interface' challenge"

Right — "Upcoming Events": 2 event cards:
24 MAR — Plasma Cutting Workshop — 1:00–3:00 PM
28 MAR — Arduino Night — 7:00–9:00 PM
"View Full Calendar →" button.

Large red pill CTA: "Create Free Account →" with red glow shadow on hover.
Secondary: "Or browse challenges first" at 30% opacity, underline on hover.
```

## Step A7: Tune-Up (one at a time)

```
Increase whitespace between all sections. Museum-curatorial spacing — at least 80px vertical padding each side. The page should breathe like a high-end editorial layout.
```

```
Add scroll-triggered fade-in-up animations: each section fades in + slides up 24px at 60% viewport threshold. Cards stagger 80ms left to right. All transitions 300ms ease-out.
```

```
Make sure the hover states are polished: cards lift 2px, borders transition to red, buttons add soft red box-shadow glow. 300ms transitions everywhere.
```

## Step A8: Fix Pass (if needed)

```
If you see any accordions or chevrons: "Remove ALL expand/collapse behavior. Remove ALL chevron/arrow toggle icons from cards. All content must be statically visible. No click-to-reveal anywhere on the page."
```

```
If spacing is cramped: "Double the vertical padding between every section. Add 32px internal padding to every card. This should look like a $20,000 agency landing page, not a free template."
```

```
If colors look wrong: "Strict 3-color palette only: #111111 background, #F5F3EE text, #C4291E accent. No blues, no grays, no white backgrounds, no other colors."
```

```
If typography looks generic: "Enforce: DM Serif Display italic for all large headlines. Space Grotesk bold uppercase tight tracking for card titles. Space Mono monospace for body text. No fallback sans-serif."
```

---

# TRACK B — Google AI Studio / Gemini (3D Robot & Immersive Code)

> This is where the magic happens. AI Studio handles the **3D scene, shaders, scroll-triggered camera, and robot interactivity.** Use Gemini 2.5 Pro for long context.

## Step B1: Master System Prompt

Paste this as the **system instruction** in AI Studio before any conversation:

```
Act as an Expert Creative Technologist and Senior Frontend Engineer specializing in Three.js (via React Three Fiber), GSAP ScrollTrigger, and immersive web experiences.

You are redesigning the landing page body of param-ms.netlify.app into a $20,000-tier 3D interactive experience.

Constraints:
- The existing Navbar (floating pill, transparent→frosted glass on scroll) and Footer (dark, rounded-top-[4rem]) are ALREADY BUILT in React. Do NOT touch them.
- Tech stack: React 19, TypeScript, @react-three/fiber v9, @react-three/drei v10, Three.js v0.183, GSAP v3.14 with ScrollTrigger, Tailwind CSS.
- The 3D model is a Unitree Go2 robot dog loaded as a .glb file via useGLTF.
- The current model is a STATIC MESH — no skeleton, no bone animations. All animation must be done by transforming the entire group (position, rotation, scale).
- Design palette: #111111 (bg), #F5F3EE (text), #C4291E (accent red / eye glow).

Quality Standards:
1. PBR materials: metalness 0.7-0.8, roughness 0.2-0.3 for the robot's aluminum chassis.
2. Studio HDRI-quality lighting: key light, fill light, rim light to catch metallic edges.
3. The robot's front LiDAR sensor should have a pulsing red point light (the "eye").
4. Cinematic camera positioning, not generic centered view.
5. All GSAP easing should use power3 or power4 curves, never linear.
6. Do NOT simplify geometry, materials, or animations. Return production-quality code.
7. Follow all instructions with extreme precision.
```

## Step B2: Conversation A — The 3D Environment

```
Generate the React Three Fiber environment for the hero section right-half:

1. Canvas setup: camera at [0, 0.3, 4], fov 45, alpha true, antialias, high-performance, dpr [1, 1.5].

2. Lighting rig (cinematic, not flat):
   - Ambient at 0.4 (warm)
   - Key directional light at [5, 6, 4], intensity 2.5, white
   - Fill directional at [-4, 3, 3], intensity 1.0, slight blue tint (#aabbff)
   - Rim/accent directional at [0, -2, 3], intensity 0.4, red (#C4291E) — catches bottom edges
   - Hemisphere light white↔dark gray at 0.8
   - Pulsing red point light at the robot's front (LiDAR eye position), intensity oscillating 0.6–1.1 via sin(time*3)

3. The Go2 model:
   - Load via useGLTF('/models/go2.glb')
   - Clone the scene, apply PBR materials: metalness 0.75, roughness 0.25
   - Slightly brighten base colors (multiply by 1.1, add 0.08) so it reads against #111111
   - Scale 3.0, position [0, -0.65, 0], base rotation [0, -0.5, 0]
   - Wrap in a <Float speed={1.5} rotationIntensity={0.02} floatIntensity={0.06}> for subtle ambient hover

4. Ambient particles:
   - 40 red particles (#C4291E) scattered in a 12×8×6 volume behind the robot
   - Size 0.04, opacity 0.45, slow Y-rotation at 0.015 rad/s
   - Slight size attenuation for depth

5. Background: transparent (alpha canvas), the HTML behind shows the dot grid.

Return the complete React component.
```

## Step B3: Conversation B — Robot Idle Animation (Make It Feel Alive)

```
The Go2 is a static mesh — no skeleton. All animation is group transforms. But it must feel ALIVE, not dead.

Implement these idle behaviors that run continuously when no click animation is active:

1. Cursor follow: smooth lerp (factor 0.04) tracking mouse.x for Y-rotation (±0.35 rad range) and mouse.y for X-rotation (±0.2 rad). The robot "looks at" the cursor.

2. Breathing: sin(time * 1.8) — subtle X-rotation oscillation of ±0.015 rad AND Y-position bob of ±0.02 units. Should feel like the robot is inhaling/exhaling.

3. Weight shift / sway: sin(time * 0.7) — Z-rotation sway of ±0.04 rad. Like it's shifting weight between legs.

4. Micro-fidgets: Every 4-6 seconds (randomized), add a quick 0.3s twitch — a sudden small rotation spike on a random axis (±0.03 rad) with spring-back easing. Like the robot noticed something.

5. Ear/head perk: Every 8-12 seconds, a quick X-rotation dip of -0.08 rad over 0.2s then spring back over 0.5s. Like it's cocking its head curiously.

The combination of all 5 should make the robot feel like a living creature idling, not a static model on a turntable. Layer them additively.
```

## Step B4: Conversation C — Click Animations

```
On canvas click, cycle through these 3 animations (then return to idle):

1. WAVE (1.8s): Lean left (Z +0.15 rad), rapid Z-axis wiggle (sin(time*12) * 0.06), slight X tilt back (-0.1 rad). Ease in/out with power2. Like the robot is waving hello with its whole body.

2. ROLL OVER (2.0s): Full 360° roll on Z-axis with power3 ease. Y-position arcs up 0.3 units at the peak (sin curve). A playful barrel roll.

3. SIT (2.0s): X-rotation tilts back +0.25 rad (rear down), Y-position drops -0.08 units. Hold for 0.6s, then spring back. Like a dog sitting then getting back up.

After each animation completes, smoothly blend back to idle state over 0.3s. Show "Click me!" text overlay for 3 seconds after the greeting animation finishes.
```

## Step B5: Conversation D — GSAP Scroll Animations (gsap.com + Apple-style)

Study gsap.com's own landing page for scroll animation timing and apple.com/macbook-pro for product reveal pacing. Then implement:

```
Add GSAP ScrollTrigger to the landing page. Reference: gsap.com for scroll-triggered reveal timing, apple.com product pages for sticky scroll product reveals.

1. Hero entrance sequence (on page load, NOT scroll):
   - Elements fade in + translateY(24px→0) sequentially: headline (0.1s delay) → subtitle (0.25s) → tagline (0.45s) → rotating word (0.55s) → accent line (0.6s) → CTA button (0.7s)
   - Each animation: 0.7s duration, cubic-bezier(0.33, 1, 0.68, 1) ease
   - Robot canvas fades in separately: 1.2s fade, 0.2s delay
   - The robot should emerge from darkness like an Apple product reveal — opacity 0 to 1, with a slight scale(0.95→1.0) for a "materializing" effect

2. Apple-style robot scroll behavior:
   - As user scrolls past the hero into Section 2, the robot should smoothly rotate from its 3/4 view to a side profile (Y-rotation transition) using ScrollTrigger's scrub
   - Use position: sticky on the 3D canvas so the robot stays visible during the transition, then unpins as Section 2 content takes over
   - This creates the Apple product page effect where the product stays fixed while the world scrolls around it

3. Section reveals (scroll-triggered, gsap.com style):
   - Each of the 3 below-fold sections: fade in + translateY(24px→0) + scale(0.98→1.0) when 15% enters viewport
   - Duration 0.7s, ease power4.out (snappy attack like gsap.com uses)
   - Cards/elements within each section stagger by 80ms
   - Left-column and right-column elements stagger separately with 120ms offset between columns

4. Parallax layers:
   - The dot grid background in the hero drifts at 0.5x scroll speed
   - Red particles in the hero drift at 0.3x scroll speed (different parallax rate creates depth)

5. Stats counter animation (Section 3):
   - When the stats bar enters viewport, animate the numbers from 0 to their final value (47, 12) using GSAP's snap utility over 1.5s with power2.out easing
   - Like a live counter ticking up

Do NOT use IntersectionObserver — use GSAP ScrollTrigger exclusively for consistency.
```

## Step B6: Surgical Iteration Prompts (use as needed)

For when the first output isn't perfect — use these precise prompts instead of "make it better":

**If the robot looks flat/dull:**
```
The metallic finish on the Go2 chassis has no depth. Increase metalness to 0.8 and decrease roughness to 0.2. Add a stronger rim light from behind-right at [3, 2, -2] with intensity 1.5 and cool white (#e0e8ff) to catch the aluminum edges. The robot should look like a studio product shot.
```

**If the idle animation looks mechanical:**
```
The idle sway is too regular and predictable. Add Perlin noise to the breathing and weight-shift frequencies — vary the amplitude by ±30% every cycle. Add a random delay of 0.1-0.5s between the micro-fidget triggers. Living things are never perfectly rhythmic.
```

**If the eye glow is too subtle:**
```
The LiDAR eye glow is barely visible. Increase the point light intensity range to 0.8 + sin(time*3) * 0.5. Add a secondary red emissive mesh (small sphere, scale 0.02) at the same position with emissiveIntensity 2.0 so there's a visible bright spot even without bloom.
```

**If scroll animations feel generic:**
```
The section reveals feel like a WordPress template. Change the easing to power4.out for a snappier attack. Add a subtle scale(0.98 → 1.0) alongside the translateY for a "growing into frame" effect. Stagger the left-column and right-column reveals separately with 120ms offset.
```

**If spacing is wrong on mobile:**
```
On viewports under 768px, the 3D canvas is clipping the hero text. Write a custom hook that: (1) detects viewport width, (2) on mobile stacks the hero vertically (text on top, robot below at 50vh), (3) reduces the robot scale to 2.0, (4) adjusts camera fov to 55 for a wider view.
```

---

# TRACK C — Whisk (Robot Placeholder Image)

If you want a polished placeholder image while the 3D model loads or for the Stitch mockup:

```
A Unitree Go2 quadruped robot dog, matte black aluminum chassis with silver joint accents, standing alert in a 3/4 view, dramatic red LiDAR eye glow on the front sensor, cinematic studio lighting with strong rim light catching metallic edges, dark background matching #111111, editorial tech product photography, clean composition with negative space on the right, ultra high quality, 8K detail
```

---

# AFTER ALL TRACKS — Integration Checklist

Once you have outputs from all 3 tracks, bring them back and I will:

1. **Merge Stitch's HTML layout** into the existing React component structure (Home.tsx, HeroSection.tsx, etc.)
2. **Drop in AI Studio's 3D code** into RobotScene.tsx, replacing the current implementation
3. **Connect the existing Navbar and Footer** (unchanged)
4. **Wire up React Router** for navigation links and auth-aware CTAs (Dashboard vs. Create Account)
5. **Hook up Supabase** for real stats, activity feed, project data, and event data
6. **Test on localhost:5173** and fix any integration issues
7. **Optimize**: lazy-load the 3D canvas, compress textures, ensure <3s initial load

---

# Quick Reference: What NOT to Do

| In Stitch | In AI Studio | General |
|-----------|-------------|---------|
| Don't write prompts >5000 chars | Don't ask for the whole page in one prompt | Don't say "make it better" — be surgical |
| Don't mix layout + content changes | Don't let it simplify the Three.js code | Don't use accordion/expand-collapse anywhere |
| Save screenshots after every working step | Start with environment, then add behaviors | Don't exceed 3 colors (black, off-white, red) |
| Upload reference screenshots alongside text | Specify exact easing curves and durations | Don't forget to attach navbar/footer screenshots |
| Use design vocab: "editorial," "brutalist," "museum-curatorial" | Use physics vocab: "metalness," "roughness," "rim light," "IK" | Screenshot every step that works |
| Feed gsap.com + apple.com + x.company URLs first | Reference apple.com sticky-scroll for robot reveal | Don't reference stripe.com — use gsap.com instead |
| | Reference gsap.com for scroll timing/easing | Study Awwwards Three.js sites for 3D quality bar |

---

# Reference Sites Summary

| Site | What to Study | How It Applies |
|------|--------------|----------------|
| **gsap.com** | Scroll-triggered reveals, dark mode, staggered animations, parallax | Our scroll animation timing, section reveal patterns, overall dark editorial feel |
| **apple.com/macbook-pro** | Sticky scroll product reveals, canvas frame sequences, cinematic pacing, product emerging from darkness | The robot hero reveal — emerging from black, staying fixed during scroll transition, dramatic lighting |
| **x.company** | 3-4 bold sections, minimal text, dramatic typography, generous whitespace | Overall page structure — 4 sections, breathing room, bold type hierarchy |
| **unitree.com/go2** | Product photography angles, LiDAR sensor detail, aluminum texture, gait showcases | The robot itself — materials, lighting, the red LiDAR eye as a design feature |
| **bostondynamics.com/products/spot** | Premium robotics product presentation, cinematic video sections, spec callouts | How a top robotics company presents a quadruped — authority and technical credibility |
| **Awwwards Three.js collection** | OHZI (cursor distortions), Samsy (cyberpunk 3D), Solar Journey (interactive 3D exploration) | The quality bar for 3D interactivity — our robot scene should compete at this level |
