# Param Makerspace — Stitch / Figma Make Prompt Pack
### Upload each screenshot + paste the matching prompt below

---

## HOW TO USE THIS FILE

1. Open each page of your app at `localhost:5173`
2. Take a full-page screenshot
3. Upload the screenshot into Google Stitch or Figma Make
4. Paste the **MASTER CONTEXT** (Section A) as the system/context prompt
5. Paste the **PAGE-SPECIFIC PROMPT** (Section B) for that page
6. Generate → Review → Manually fix the last 20% (padding, exact hex codes, copy tone)

---

## SECTION A: MASTER CONTEXT (paste this ONCE as system context for ALL pages)

```
You are redesigning a gamified makerspace community platform called "Param Makerspace." This is a React + Tailwind + Supabase + GSAP app. You are ONLY redesigning the UI/UX. All backend logic, data hooks, and game engines stay untouched.

═══════════════════════════════════
BRAND TOKENS (NON-NEGOTIABLE)
═══════════════════════════════════

Colors:
- Background: #F5F0EB (off-white cream)
- Primary dark: #1A1A1A (near-black)
- Accent: #E63B2E (red — used for CTAs, highlights, rank badges)
- Supporting: white (#FFFFFF), dark/10 for borders, dark/40-60 for muted text

Typography:
- Headings: "DM Serif Display", bold, uppercase, tracking tight — scale: 7xl–9xl on desktop, 4xl–5xl on mobile
- Data/labels: "Space Mono", monospace, uppercase, font-bold, text-xs to text-sm, letter-spacing wide
- Body: "Space Grotesk", sans-serif, text-sm to text-base, leading relaxed

Borders & Radius:
- Hairline: 1px for containers and dividers
- Interactive: 2px for cards and inputs
- Hero/emphasis: 4px for featured elements
- Radius: 8px (small elements), 16px (cards), 32px (hero containers, pills)

Shadows:
- Rest: none or subtle (0 1px 2px rgba(0,0,0,0.05))
- Hover: 0 8px 30px rgba(0,0,0,0.12) — "shadow bloom"
- CTA glow: 0 0 20px rgba(230,59,46,0.3) on red buttons

═══════════════════════════════════
DESIGN PRINCIPLES
═══════════════════════════════════

1. APPLE-LEVEL WHITESPACE
   - Minimum 80–120px vertical padding between page sections
   - Cards: 32–48px internal padding
   - No cramming. If it feels "empty," it's correct.

2. SCROLL-DRIVEN STORYTELLING (inspired by apple.com + lusion.co)
   - Content reveals section-by-section on scroll
   - Each viewport-height section has ONE message
   - Parallax depth on images, stagger animations on text/cards

3. ONE PRIMARY CTA PER VIEW
   - One dominant action button per screen (red bg, large, centered or bottom-right)
   - Secondary actions: outlined or muted, never competing visually

4. PROGRESSIVE DISCLOSURE
   - Tabs > endless scroll
   - Accordions > walls of text
   - Show minimum info, reveal on hover/click/scroll

5. GAME UI WOVEN IN (not bolted on)
   - Persistent XP progress bar in navbar: small pill showing rank + progress to next rank
   - Locked features: frosted glass overlay + lock icon + "Reach [Rank] to unlock"
   - Earned badges: glow effect. Unearned: grayscale silhouette
   - Rank-up: full-screen celebration with particle burst

6. MOTION = MEANING
   - Elements enter from below (y:40 → 0, opacity:0 → 1) on scroll via GSAP ScrollTrigger
   - Cards lift 4px on hover with shadow bloom + border→red transition
   - Buttons scale(0.97) on press for tactile feel
   - Filter changes: cards exit (scale down+fade) then new cards enter (scale up+fade)
   - Loading: shimmer skeleton placeholders, NEVER blank white space

7. BEGINNER-FIRST LANGUAGE
   - Write as if a 12-year-old is reading. No jargon.
   - "Sign In" not "Authenticate". "Join the Lab" not "Initialize".
   - "Quests" not "Challenges" in casual references
   - Every locked feature says HOW to unlock it, not just that it's locked.

═══════════════════════════════════
GAMIFICATION SYSTEM (always visible)
═══════════════════════════════════

6 Ranks (progression path, shown in navbar + dashboard + badges page):
  Curious (0 XP) → Tinkerer (60 XP) → Builder (250 XP) → Maker (600 XP) → Innovator (1200 XP) → Lab Pro (2500 XP)

XP Sources:
  Tier 1 challenge = 50 XP | Tier 2 = 150 XP | Tier 3 = 400 XP
  Project approved = 100 XP | Project active = 200 XP
  Event registered = 25 XP | Event presented = 75 XP
  Profile completed = 50 XP

7 Domains: Electronics, Robotics, AI, Design, Fabrication, Bio, Interdisciplinary
3 Tiers per domain: T1 (Explore), T2 (Build), T3 (Architect)
4 User roles: viewer, maker, mentor, admin

═══════════════════════════════════
INTERACTION PATTERNS
═══════════════════════════════════

Navbar ("Command Bar"):
- Floating, glassmorphic: backdrop-blur-xl + 80% bg opacity + subtle 1px border
- Items: Logo | Projects | Explorer Hub | Events | Makers | Badges | Store | [XP Pill] | [Avatar]
- XP pill: shows rank icon + progress bar + "Tinkerer ████░░ 120/250"
- Collapses on scroll-down (just logo+XP+avatar), expands on scroll-up
- Mobile: replace with bottom tab bar (5 tabs: Home, Explore, Dashboard, Badges, Profile)
- Active page: animated underline that slides between items

Cards:
- 2px border-[#1A1A1A]/10, rounded-16px
- Hover: border→#E63B2E, translateY(-4px), shadow bloom
- Image area: hover zoom (scale 1.05, overflow hidden)
- Always have at minimum: image, title, one metadata line, one CTA

Inputs:
- Height: 56px, border: 2px solid #1A1A1A/20, rounded-16px
- Focus: border→#E63B2E with subtle red glow (box-shadow: 0 0 0 3px rgba(230,59,46,0.15))
- Labels: Space Mono, uppercase, text-xs, font-bold, above the input

Buttons:
- Primary: bg-#E63B2E, text-white, rounded-full, h-56px, font-heading uppercase
- Secondary: bg-#1A1A1A, text-white, same shape
- Ghost: border-2px #1A1A1A, text-#1A1A1A, hover fill
- All: scale(0.97) on :active for 100ms

Empty States:
- Never just "No data." Always: illustration/icon + explanatory text + actionable CTA
- e.g., "No upcoming events. Browse past sessions below →"

Loading States:
- Shimmer skeleton placeholders matching the shape of expected content
- Gradient sweep animation: left-to-right, 1.5s, infinite

═══════════════════════════════════
RESPONSIVE BREAKPOINTS
═══════════════════════════════════
- Mobile (<768px): single column, bottom tab bar, full-width cards, 44px min touch targets
- Tablet (768–1024px): 2-column grids, collapsible sidebars
- Desktop (>1024px): 3–4 column grids, hover effects, full navbar
```

---

## SECTION B: PAGE-SPECIFIC PROMPTS

---

### B1. HOME PAGE (screenshot: localhost:5173/)

```
Redesign this landing page into a 5-section scroll-driven storytelling experience. Each section is roughly one viewport height.

SECTION 1 — HERO (100vh, dark background):
- Center-aligned large heading: "PARAM MAKERSPACE" in DM Serif Display, 9xl
- Below it in italic red: "Future." (large, dramatic)
- Subtitle in Space Grotesk, muted: "Where Curious Minds Build the Future."
- One red CTA button: "Start as Curious →" (rounded-full, large, with subtle red glow shadow)
- Bottom: a gentle bouncing scroll-down arrow indicator
- Background: dark (#1A1A1A) with subtle animated dot grid or slow-moving particles (keep it light, not 3D heavy)
- The hero content fades in with staggered animation (title words appear one by one, 0.08s apart)

SECTION 2 — THE JOURNEY (scroll-pinned horizontal section):
- Heading: "Your Maker Journey"
- 6 rank cards scroll horizontally while the section stays pinned
- Each card: rank icon (circular), rank name, XP threshold, one sentence about what unlocks
- Cards: Curious → Tinkerer → Builder → Maker → Innovator → Lab Pro
- Connected by a thin horizontal line/path
- Current visitor (unauthenticated) sees all cards equally. Authenticated users would see their position highlighted.
- Use GSAP ScrollTrigger horizontal pin pattern

SECTION 3 — WHAT MAKERS BUILD (100vh):
- Heading: "What Makers Build"
- 3 featured project cards floating at different parallax depths
- Each card: cover image, project title, maker name, domain tag
- Cards tilt subtly on mouse move (GSAP quickTo)
- "Explore All Projects →" CTA below

SECTION 4 — LIVE ECOSYSTEM (auto-height, 2-column):
- Left column: "Live Activity" — typewriter-style feed showing recent platform events (challenge completions, project approvals, event registrations)
- Right column: "Upcoming" — next 2-3 events with date, type badge, location
- Both columns fade in on scroll with stagger

SECTION 5 — JOIN CTA (100vh):
- Large centered text: "Every Lab Pro started as Curious."
- Prominent "Create Your Account →" red CTA
- Background: subtle floating rank icons orbiting slowly

FOOTER (compact):
- "Built by makers, for makers." single line + [GitHub] [Discord] [Contact] icon links
- Full nav links only on Home footer
- Dark background (#1A1A1A), cream text
```

---

### B2. LOGIN PAGE (screenshot: localhost:5173/login)

```
Redesign this centered login form into a split-screen cinematic layout.

LEFT PANEL (50% width, hidden on mobile):
- Full-height dark background (#1A1A1A)
- Auto-cycling visual: either 3 showcase images from real projects cross-fading, or the 6 rank badge icons slowly orbiting/floating
- Subtle overlay text at bottom-left: "Welcome to the Lab."

RIGHT PANEL (50%, or 100% on mobile):
- Off-white background (#F5F0EB)
- Vertically centered form, max-width 420px, generous padding (48px)
- Heading: "Welcome Back" (DM Serif Display, 5xl, bold)
- Subtext: "Sign in to continue your journey." (Space Grotesk, text-base, muted)
- 32px gap
- Email input: label "Email" (Space Mono, xs, uppercase), input (56px h, 16px rounded, 2px border)
- 16px gap
- Password input: same style, with show/hide toggle icon
- "Forgot password?" link (red, small, right-aligned below password)
- 24px gap
- "Sign In →" button: full-width, 56px h, rounded-full, red bg, white text, DM Serif uppercase
- 24px gap
- "New here? Create an account →" centered below (dark text, "Create an account" part underlined in red)

Error state: form container shakes (translateX ±5px, 3 cycles, 300ms) + inputs get red border pulse
Loading state: button text replaced with spinning loader, button disabled

Remove all jargon: NO "System Access", NO "Authenticate", NO "internal network"
```

---

### B3. REGISTER PAGE (screenshot: localhost:5173/register)

```
Same split-screen layout as Login.

LEFT PANEL: Same visual showcase, but overlay text: "Join 50+ makers building the future."

RIGHT PANEL:
- Heading: "Join the Lab" (DM Serif Display, 5xl)
- Subtext: "Create your maker identity." (muted)
- Full Name input (placeholder: "Your full name")
- Email input
- Password input + password strength bar below (gray → yellow → green, 4px height, animated width)
- "Create Account →" button: full-width, 56px, dark bg (#1A1A1A), white text
- "Already a maker? Sign in →" link below

Post-registration success:
- Form fades out, replaced by: large animated green checkmark (scale 0→1 with elastic ease)
- "Check your email" heading
- "We sent a verification link to [email]. Click it to activate your account."
- "Go to Sign In →" link

Remove: "INITIALIZE", "Create Identity", "New initialization?"
```

---

### B4. DASHBOARD (screenshot: localhost:5173/dashboard)

```
Redesign this dense, single-scroll dashboard into a clean, focused "Mission Control" layout.

TOP — WELCOME BANNER (full-width card, 2px border, rounded-32px, 48px padding):
- Left: "Good morning, [Name]." (DM Serif, 4xl) + role badge pill (e.g., "ADMIN" in red bg, xs text)
- Below name: "You're 130 XP away from Maker." (Space Grotesk, muted)
- Right: XP progress bar (200px wide, 8px height, rounded-full, red fill, animated on load with 1.2s ease) + "350 / 600 XP" label
- Far right: "Edit Profile" icon button

MIDDLE — 3 ACTION CARDS (horizontal row, equal width, 16px gap):
Card 1 "Next Quest":
  - Subtle red gradient background tint
  - "🎯 Next Quest" heading
  - Shows the easiest incomplete challenge name
  - "Go →" button
  - Gentle pulse animation on the card border to draw attention

Card 2 "Active Projects":
  - "🚀 Active Projects" heading
  - Large number "3"
  - "View All →" button

Card 3 "Upcoming Event":
  - "📅 Upcoming Event" heading
  - Event name + date (or "None scheduled" with "Browse Events →" CTA)
  - "RSVP →" button

Cards animate in with stagger (0.1s each, fromY:30, opacity:0→1)

BOTTOM — TABBED CONTENT AREA:
Tab bar: [My Projects] [XP History] [Alerts] [Mentor Tools*] [Admin*]
(*only visible for mentor/admin roles)
Active tab: bold text + red underline (animated slide between tabs)
Tab content area: rounded-16px border, min-height 400px

Tab: My Projects
  - Clean list (not grid): each row = status pill (Draft/Pending/Active/Rejected with color coding) + title + "Edit" + "View" buttons
  - "Propose Project" floating action button: bottom-right, red circle with "+" icon, rounded-full, shadow, always visible

Tab: XP History
  - Vertical timeline: each entry = "+200 XP" (red, bold) + "Project became active" + date
  - Entries animate in on tab switch

Tab: Alerts
  - Notification cards: yellow bg for pending, red bg for rejected, with descriptive text

Tab: Mentor Tools (yellow border cards)
  - Project Reviews / Challenge Verification / Event Submissions — same 3 cards, cleaner styling

Tab: Admin (red border cards)
  - Users / Challenges / Badges / Store / Equipment / Inventory / Projects — grid of admin links

Remove: the current layout where everything is on one massive scrolling page
```

---

### B5. EXPLORER HUB / CHALLENGES (screenshot: localhost:5173/challenges)

```
Redesign this challenges page with a visual tier progression system.

TOP: "Explorer Hub" heading (DM Serif, 8xl)

TIER SELECTOR (full-width, 3 large cards, equal width, 16px gap):
Each tier card (rounded-16px, 2px border, 80px height):
  - "TIER 1 — Explorer: Curiosity & basics" + personal progress "3/5 done" (or progress bar)
  - "TIER 2 — Solver: Apply & problem-solve" + progress or "🔒 Reach Tinkerer"
  - "TIER 3 — Architect: Build complete systems" + progress or "🔒 Reach Builder"

Active/selected tier: dark bg, white text, red bottom border (4px)
Inactive: light bg, dark text
Locked: frosted glass overlay (backdrop-blur + bg-white/60) + centered lock icon + rank requirement text

Clicking a tier filters the grid below + animated scroll to grid

DOMAIN FILTERS (below tier selector, 16px gap):
Horizontal row of pill buttons:
[All] [Electronics] [Robotics] [AI] [Design] [Fabrication] [Bio] [Interdisciplinary]
Active: dark bg, white text. Inactive: 2px border, dark text.
On mobile: horizontally scrollable.

CHALLENGE GRID (3-column, 24px gap):
Each card (rounded-16px, 2px border, hover-lift):
  - Cover image: top 55% of card, rounded-top-16px, overflow hidden, hover zoom (1.05 scale)
  - Tier badge: top-left overlay on image (e.g., "Tier 1" pill, dark bg)
  - Domain badge: top-right overlay (e.g., "Robotics" pill, light bg)
  - Title: DM Serif, text-xl, bold
  - Mystery text: 2 lines max, text-sm, muted, line-clamp-2
  - Bottom row: ⏱ time estimate (left) + "★ 50 XP" reward (right, RED, bold — the XP must be prominent and motivational)
  - Hover: card lifts, shadow blooms, border→red
  - Completed challenges: muted overlay + "✓ Completed" badge

Grid items animate in with stagger on scroll (GSAP ScrollTrigger)
When filter changes: cards exit (scale:0.95, opacity:0, 0.2s) → new cards enter (scale:1, opacity:1, stagger 0.05s)
```

---

### B6. CHALLENGE DETAIL (screenshot: localhost:5173/challenges/[id])

```
Redesign this challenge detail page as a "quest briefing."

HERO (full-width, 300px height):
- Cover image with dark gradient overlay (bottom 50%)
- Overlaid: Tier badge + Domain badge (top-left)
- Title: large DM Serif, white text, bottom-left
- "★ 50 XP reward" pill, bottom-right (red bg, white text)

TWO-COLUMN LAYOUT BELOW HERO:

LEFT (65%):
- "← Back to Explorer Hub" breadcrumb link (top, Space Mono, xs)
- "THE MYSTERY" section: dark bg card (rounded-16px, 32px padding) with mystery/description text + large "?" watermark
- "STEPS" section: numbered steps with checkbox-style indicators
  - Each step is a card/row with step number, description
  - Completed steps: strikethrough + green check
  - Scroll-triggered stagger animation on steps
- "SUBMIT COMPLETION" section (only if logged in):
  - Opens as a slide-up panel from bottom (not inline form)
  - Notes textarea + file upload + "Submit →" button

RIGHT (35%, sticky on scroll):
- Quick stats card (rounded-16px, 2px border):
  - Domain: [icon] Robotics
  - Tier: Tier 3
  - Time: ~2 hours
  - XP: ★ 400 XP (large, red)
  - Materials needed (list)
  - Skills you'll practice (tag pills)
- "Log in to Track Progress" button (if not authenticated, full-width dark bg)

If already completed: show "Quest Complete ✓" banner at top with confetti animation
```

---

### B7. PROJECTS (screenshot: localhost:5173/projects)

```
Redesign this project archive page.

TOP: "Project Archive" heading (DM Serif, 8xl) + filter/sort row below

FILTERS: [All] [Software & Robotics] [Fabrication] [Electronics] — pill buttons, same style as Challenges
SORT: right-aligned dropdown "Sort by: Newest First"

FEATURED PROJECT (if exists — optional hero):
Full-width card (rounded-32px) with cover image filling the card, dark gradient overlay
Project title (DM Serif, 4xl, white) + maker name + domain tag overlaid
"View Project →" CTA (white bg, dark text, rounded-full)

PROJECT GRID (3-column, 24px gap):
Each card (rounded-16px, 2px border):
  - Image area (60% height): if image exists → show with hover zoom. If NO image → use a subtle gradient (e.g., dark-to-slightly-less-dark) with a centered domain icon (from lucide-react) — NOT a black box saying "NO IMAGE"
  - Type badge: top-left ("T3 ARCHITECT" red bg or "INDEPENDENT" dark bg)
  - Domain: "#ROBOTICS" in red (Space Mono, xs)
  - Title: DM Serif, text-lg, bold
  - Summary: 2 lines, text-sm, muted
  - Hover: border→red, image zoom, card lift

Animated filter transitions: old cards fade out, new cards fade in with stagger
Empty state: dashed border container + "Be the first to build something" + "Propose a Project →" CTA
```

---

### B8. EVENTS (screenshot: localhost:5173/events)

```
Redesign this events page with hero-first layout.

TOP: "Ecosystem Events" heading (DM Serif, 8xl)

FILTERS: [All] [Build Challenge] [Maker Meetup] [Tech Tuesday] — same pill style

IF UPCOMING EVENT EXISTS — HERO CARD:
Full-width large card (rounded-32px, min-height 300px):
- Cover image with gradient overlay
- Event type badge: top-left (e.g., "BUILD CHALLENGE" red pill, or "TECH TUESDAY" dark pill)
- Title (DM Serif, 4xl, white)
- Date + Time + Location (Space Mono, sm, white/80)
- Animated capacity bar: 200px wide, 8px height, color-coded fill (green <50%, yellow <80%, red ≥80%)
- "12 / 20 spots" label next to bar
- "Register Now →" button (large, red bg, white text)
- If Full: "Join Waitlist →" (outline button, dimmed card)

MORE UPCOMING: smaller 3-column cards below (same structure, compact)

PAST EVENTS (collapsible section):
- "Past Events" heading with expand/collapse toggle
- Horizontal scroll row of compact cards
- Each: cover image + "PAST" badge + title + date + "View Recap →" link
- Muted opacity (0.7)

Empty upcoming state: dashed border + "No upcoming events. Browse past sessions below →"
```

---

### B9. MAKERS DIRECTORY (screenshot: localhost:5173/makers)

```
Redesign this directory with a people-first, searchable layout.

TOP: "Makers Directory" heading (DM Serif, 8xl)

SEARCH BAR (large, prominent, full-width, max-w-2xl, centered):
- 56px height, rounded-full, 2px border
- Placeholder: "Search makers by name..."
- Search icon (left), clear button (right when text entered)

FILTERS (below search):
Row 1 — Domain: [All] [Robotics] [Software] [Fabrication] pill buttons
Row 2 — Role: [All] [Makers] [Mentors] pill buttons

MAKER GRID (3-column, 32px gap):
Each card (rounded-16px, 2px border, center-aligned content, 32px padding):
  - Avatar: 120px circular, centered
    - If image: show image, grayscale by default → full color on hover (0.4s transition)
    - If no image: dark bg circle with initial letter (current behavior, but larger and centered)
  - Name: DM Serif, text-xl, bold, centered
  - Rank badge: small pill below name with rank icon + name (e.g., "🔧 TINKERER")
    - Badge has subtle glow: higher rank = brighter glow
    - Curious: no glow. Tinkerer: faint. Builder: mild. Maker+: prominent.
  - Bio: 2 lines, text-sm, muted, centered, line-clamp-2
  - Domain tags: small colored dots (not full pills) — one dot per domain, color-coded
  - Mentor indicator: if mentor, small star icon top-right corner of card
  - Hover: card lifts, shadow bloom

Cards stagger in on scroll
```

---

### B10. BADGE CATALOG (screenshot: localhost:5173/badges)

```
Redesign this badge page as a "trophy room" experience.

TOP: "Badge Catalog" heading (DM Serif, 8xl)
Subtext: "Earn badges by completing challenges and joining events." (with red left-border accent)

PLATFORM PROGRESSION (full-width section):
Heading: "Your Journey"
- Horizontal connected path with 6 rank badges
- Connected by a thin line/road with small arrow markers
- Each badge: 80px circular icon above, rank name below, XP threshold below that
- EARNED badges: full color, subtle glow (box-shadow: 0 0 15px rgba(230,59,46,0.3)), gentle floating animation (translateY ±3px, 3s, infinite)
- CURRENT rank: pulsing ring animation (red ring that scales 1→1.15→1, 2s, infinite)
- UNEARNED: grayscale icon, reduced opacity (0.4), small lock icon overlay
- Below each badge: full criteria text (NOT truncated) in text-xs, muted
  e.g., "Complete and verify one Tier 1 challenge"

DOMAIN BADGES (grid section):
Heading: "Domain Mastery"
- 7 rows (one per domain), 3 columns (T1, T2, T3)
- Row label: domain name (Space Mono, uppercase, bold) left-aligned
- Each badge cell: icon (48px) + "TIER 1" / "TIER 2" / "TIER 3" label
- Earned: full color, pop-in animation on scroll
- Unearned: silhouette with "?" overlay, muted
- Hover on any badge: tooltip appears with full criteria + "How to earn: Complete a [Domain] Tier [X] challenge"

OTHER / SPECIAL BADGES:
Heading: "Special Badges"
- 4-column grid of larger cards (rounded-16px, 2px border)
- Each: badge icon (64px), name, criteria text
- Hover: badge icon rotates slightly (rotateY 15deg, 0.3s) for 3D tilt effect
```

---

### B11. STORE (screenshot: localhost:5173/store)

```
Redesign this store page with clear unlock paths.

HERO BANNER (full-width, rounded-32px, dark bg, 48px padding):
- "Gear up for your next build." (DM Serif, 4xl, white)
- Right side: "Your rank: BUILDER" with rank icon + XP count

PRODUCT GRID (3-column, 24px gap):
Each card (rounded-16px, 2px border):
  - Product image: top 60%, light bg (#F5F0EB), centered product image
    - If no image: gradient bg + category icon
  - Category badge: top-left (e.g., "MISC" dark pill)
  - Product name (DM Serif, text-lg)
  - Price: "₹50.00" pill (dark bg, white text, Space Mono)
  - Description: 2 lines, text-sm, muted

  IF UNLOCKED:
  - "Purchase →" button (red bg, full-width)

  IF LOCKED:
  - Entire card has frosted glass overlay: backdrop-blur-sm + bg-white/70
  - Centered: lock icon (48px) + "Earn [Badge Name] to unlock" (bold)
  - Below: "Complete [specific challenge/action] →" link (red, underlined) — this is the KEY difference, showing the PATH to unlock, not just "locked"

Purchase confirmation: slide-up panel from bottom (not browser alert)
- Product name, price, "Confirm Purchase" button
Success: animated green checkmark + "Order Placed!" + confetti burst
```

---

### B12. PROFILE SETUP WIZARD (screenshot: localhost:5173/profile-setup)

```
Redesign this single long form into a 4-step wizard.

PROGRESS INDICATOR (top, centered):
- 4 dots connected by lines
- Completed steps: red dot
- Current step: red dot with pulsing ring
- Upcoming: gray dot
- Animated line fills between steps as you progress

STEP 1 — "Let's set up your avatar"
- Large circular upload zone (160px, dashed border, centered)
- "Drag & drop or click to upload" text
- Display name input below
- Top-right corner: "+50 XP" badge indicator (motivational)

STEP 2 — "Tell us about yourself"
- Bio textarea (large, 4 lines minimum, character count indicator)
- Pronouns dropdown (small, below bio)

STEP 3 — "Connect your accounts"
- Social link inputs, each with icon prefix:
  - GitHub (github icon), LinkedIn (linkedin icon), X (twitter icon), Bluesky, Discord
- Each input: 56px height, icon on left inside the input

STEP 4 — "What are you into?"
- Skills: tag/chip multi-select (click to toggle, selected = dark bg, unselected = outline)
- Domains of interest: visual grid of 7 domain cards with icons (click to toggle)

NAVIGATION (bottom, full-width):
- Left: "← Back" (ghost button, only after step 1)
- Right: "Next →" (dark bg button)
- Final step: "Complete Profile →" (red bg button)
- Skip option: small "Skip for now" link (muted, right-aligned above the nav bar)

Step transitions: slide left/right (translateX ±100%, 0.3s, ease)
On final completion (if first time): "+50 XP earned!" animation — number flies up and fades
```

---

### B13. ONBOARDING WELCOME (NEW — no existing screenshot, create from scratch)

```
Design a 3-step onboarding welcome sequence shown ONLY to first-time users after registration + email verification + first login. Full-screen, one step at a time, no navbar visible.

STEP 1 — "Welcome to the Lab, [Name]."
- Dark background (#1A1A1A)
- Large "Curious" rank badge icon centered, animating in (scale 0→1, elastic ease, 0.8s)
- Below: "You are now CURIOUS." (DM Serif, 4xl, white)
- Below: horizontal rank path showing all 6 ranks (like badges page), with Curious highlighted
- Body text: "Every challenge you complete earns you XP. Earn enough and you'll rank up, unlocking new abilities." (Space Grotesk, text-base, white/70)
- "Let's Go →" button (red bg, large, centered)

STEP 2 — "Complete Your Profile"
- Light background (#F5F0EB)
- Avatar upload zone + display name + short bio (same as Profile Step 1+2 combined)
- "+50 XP" motivator badge visible
- "Skip for now" option (muted, small)
- "Save & Continue →" button

STEP 3 — "Your First Quest"
- Shows the easiest available Tier 1 challenge as a featured card (large, centered)
- Card: cover image + title + domain + "★ 50 XP" reward
- "This is your first quest. Complete it to become a Tinkerer."
- "Accept Quest →" button (large, red bg) → routes to that challenge detail page
- "Explore on my own →" link (muted) → routes to Dashboard

Transitions between steps: crossfade (opacity 0→1, 0.4s) with slight upward movement
Step indicator: 3 dots at the bottom, same style as Profile wizard
```

---

## SECTION C: ADMIN PAGES (low priority, function over form)

```
For all admin pages (/admin/*), apply these universal upgrades without changing functionality:

1. Unified left sidebar navigation (not relying on main navbar):
   - Dark bg sidebar, 240px width
   - Sections: "Review" (Projects, Challenges, Events) + "Manage" (Users, Challenges, Badges, Store, Equipment, Inventory, Projects)
   - Active item: red left border + bold text
   - Collapsible on tablet (icon-only mode)

2. Tables:
   - Alternating row bg (white / #F5F0EB)
   - Hover: light red tint
   - Status pills with color coding (green=active, yellow=pending, red=rejected, gray=draft)

3. Forms: open in modals (slide-in from right, 480px width) instead of inline

4. Batch action toolbar: appears when rows are selected (top of table, dark bg, "2 selected | Approve | Reject | Delete")

Keep ALL functionality identical. These are power-user pages — prioritize efficiency.
```

---

## QUICK REFERENCE: FILE-TO-PROMPT MAPPING

| Screenshot Page | Prompt to Use | Priority |
|----------------|--------------|----------|
| localhost:5173/ | B1. HOME PAGE | 1 (sets tone) |
| localhost:5173/login | B2. LOGIN | 2 |
| localhost:5173/register | B3. REGISTER | 2 |
| localhost:5173/dashboard | B4. DASHBOARD | 3 |
| localhost:5173/challenges | B5. EXPLORER HUB | 4 |
| localhost:5173/challenges/[id] | B6. CHALLENGE DETAIL | 5 |
| localhost:5173/projects | B7. PROJECTS | 6 |
| localhost:5173/events | B8. EVENTS | 7 |
| localhost:5173/makers | B9. MAKERS | 8 |
| localhost:5173/badges | B10. BADGES | 9 |
| localhost:5173/store | B11. STORE | 10 |
| localhost:5173/profile-setup | B12. PROFILE WIZARD | 11 |
| (no screenshot — new) | B13. ONBOARDING | 12 |
| localhost:5173/admin/* | C. ADMIN | 13 (last) |

---

*Zero backend changes. All prompts describe UI/UX only. Every data hook, engine, and route stays untouched.*
