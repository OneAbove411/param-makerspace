# STITCH REFINEMENT PROMPT — Home Page Landing
### Paste this into Google Stitch alongside the current output screenshot

---

```
ROLE: You are a senior interaction designer thinking ONLY from the perspective of a first-time visitor who has NEVER heard of Param Makerspace. They landed here from a Google search or a friend's link. They don't know what "Curious" means, what XP is, or why they should care.

PROBLEM WITH CURRENT DESIGN:
The hero is a giant static text block that says "PARAM MAKERSPACE / Future. / Where Curious Minds Build the Future / Start as Curious →". This fails because:
1. "Start as Curious" is meaningless jargon to a new user. They don't know it's a rank.
2. There is ZERO demonstration of what happens on this platform. No social proof, no visual of the actual experience.
3. Nothing pulls the user to scroll. The hero feels like a dead end — read text, click button, or leave.
4. The "Your Maker Journey" section below dumps 6 rank cards immediately. A new user doesn't care about ranks yet — they haven't seen what the platform DOES.

WHAT I NEED INSTEAD — a storytelling landing page that SHOWS before it TELLS:

Keep the fonts (DM Serif Display headings, Space Mono data, Space Grotesk body) and colors (#F5F0EB cream bg, #1A1A1A dark, #E63B2E red accent) exactly as they are. Do NOT change the visual identity.

SECTION 1 — HERO (100vh):
DON'T open with the platform name as a giant headline. Instead:
- Short punchy question that creates curiosity: "What would you build?" in large DM Serif
- Below: a looping showcase — 3-4 real project images/cards that auto-rotate or fan out, showing actual things makers built (robot arm, LED matrix, 3D printed object, bio experiment). These are the HOOK.
- Small "PARAM MAKERSPACE" wordmark above the question (not the hero headline)
- One CTA: "See How It Works ↓" (NOT "Start as Curious") — this scrolls them down, not away to a registration page
- Subtle scroll-down arrow with bounce animation
- The entire point: intrigue them with OUTCOMES, not platform terminology

SECTION 2 — THE DEMO (show, don't tell):
Instead of immediately showing ranks, SHOW a 3-step visual story of what a user actually DOES here:
  Step 1: "Pick a Quest" — show a challenge card (e.g., "Build a Line-Following Robot") with tier badge and XP reward visible
  Step 2: "Build & Document" — show a project card being created with images, milestones
  Step 3: "Level Up" — show the rank-up celebration (badge earned, XP bar filling, new rank achieved)
Each step animates in as user scrolls (left-to-right stagger or vertical reveal).
This is the "aha moment" — now they understand the loop: do challenges → build projects → earn ranks.

SECTION 3 — SOCIAL PROOF / "What Makers Build":
NOW show real projects. This section is fine in current design — 3 project cards with parallax depth. Keep it. But add:
- A counter: "47 projects built. 12 makers leveling up." (animated count-up)
- "Explore All Projects →" link

SECTION 4 — THE JOURNEY (now it makes sense):
NOW show the rank progression — but frame it as "Your Path", not just cards:
- "Start as Curious. End as Lab Pro."
- Horizontal path: Curious → Tinkerer → Builder → Maker → Innovator → Lab Pro
- Each rank shows ONE line about what unlocks (not a paragraph)
- Current section stays pinned while ranks scroll horizontally
- This works NOW because the user already understands the loop from Section 2

SECTION 5 — LIVE PULSE:
The "Live Activity" + "Upcoming Events" two-column section. This is fine — keep it. It shows the platform is alive and active. Real-time social proof.

SECTION 6 — FINAL CTA:
"Every Lab Pro started as Curious." — this line NOW lands because they understand the journey.
CTA: "Create Your Account →" (NOT "Start as Curious" — say what it IS, not what rank they'll get)
Secondary: "Or explore challenges first →" (low-commitment option for hesitant users)

KEY ANIMATION NOTES:
- Each section fades in from below (y:40→0, opacity:0→1) as it enters the viewport
- Project showcase in hero: cards auto-rotate with a smooth 3D carousel or fan-out effect
- The 3-step demo in Section 2: each step slides in sequentially as user scrolls (scroll-triggered, not auto-playing)
- Rank path in Section 4: horizontal scroll-pinned section (GSAP ScrollTrigger pin)
- Count-up numbers in Section 3: animate from 0 to final number when section enters viewport

WHAT TO FIX FROM CURRENT OUTPUT:
1. Hero: Remove "PARAM MAKERSPACE" as the giant headline → make it a small wordmark. Replace with "What would you build?" + project showcase
2. "Start as Curious →" → "See How It Works ↓" (scroll anchor) in hero, "Create Your Account →" in final CTA only
3. "Your Maker Journey" section: move it AFTER the demo section, not immediately after hero
4. Add the 3-step demo section (Pick Quest → Build → Level Up) between hero and projects
5. The live activity + upcoming sections are good — keep them
6. Footer CTA: "Start as Curious" → "Create Your Account →" with a secondary "Explore challenges first →" link

USER PSYCHOLOGY FLOW:
Hero → "Wow, people build cool stuff here" (intrigue)
Demo → "Oh, I see — you do challenges, build things, level up" (understanding)
Projects → "These are real, other people are doing this" (social proof)
Journey → "There's a progression path, I want to reach Lab Pro" (aspiration)
Live feed → "This community is active right now" (urgency/FOMO)
Final CTA → "I'm in, let me sign up" (conversion)
```

---

*Fonts and colors stay exactly the same. This is a FLOW and CONTENT restructure, not a visual redesign.*
