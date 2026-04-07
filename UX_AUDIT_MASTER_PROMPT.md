# UI/UX Audit Master Prompt — Param Makerspace (Community-Driven Platform)

A research-backed reference and a ready-to-use master prompt for conducting a rigorous UI/UX audit of a community-driven makerspace platform. The principles below are synthesized from Nielsen Norman Group, the Interaction Design Foundation, W3C/WCAG 2.2, Google Web Vitals, and current community-platform UX literature. The master prompt itself follows Anthropic's official Claude prompt-engineering guidance (role, XML structuring, chain-of-thought, success criteria, examples, adaptive thinking).

---

## Part 1 — Principles & Practices for UI/UX Auditing of a Community-Driven Makerspace Platform

### 1. Foundational heuristics (the non-negotiable baseline)

The audit's spine is **Jakob Nielsen's 10 Usability Heuristics** (refined since 1994 and still the field standard). Heuristic evaluation reliably surfaces ~75% of major usability issues at a fraction of the cost of full user testing, and it works best when 3–5 evaluators independently review the interface and then merge findings. Each finding should be tied to a specific heuristic so the report is defensible and actionable.

The 10 heuristics, applied to a makerspace platform, are: visibility of system status (build progress, project save state, RSVP confirmations); match between system and the real world (use maker vocabulary — "build log," "BOM," "remix," "mentor hours" — not corporate-speak); user control and freedom (undo, leave-event, cancel-RSVP, draft autosave); consistency and standards (one button system, one event card pattern, one badge style across pages); error prevention (confirm destructive actions on projects, badges, mentorship bookings); recognition over recall (surface recently visited projects, last-used tools, draft challenges); flexibility and efficiency of use (keyboard shortcuts, saved filters, power-user dashboards); aesthetic and minimalist design (signal-to-noise on profile and project pages); help users recognize, diagnose, and recover from errors (plain-language form errors, recoverable upload failures); and help and documentation (contextual help on submitting a project, joining a challenge, applying for a badge).

### 2. Information architecture and navigation

A community makerspace platform lives or dies by its taxonomy. Audit whether members can reach any of the eight core entities — **Makers, Projects, Challenges, Events, Badges, Mentors, Store, Dashboard** — within two clicks of any page, with clear, prominent labels and a clutter-free layout. Validate the taxonomy against how members actually think (open or closed card sorting with 15–30 participants is the field standard, per Tullis, Wood, and Nielsen). Check for orphan pages, redundant categories, and inconsistent labels between the navbar, breadcrumbs, footer, and search.

### 3. Onboarding and first-value time

For community platforms, the goal is **time-to-first-value within ~7 minutes** (Ramli John's benchmark, widely cited in 2025–26 onboarding literature). Audit the registration → email confirmation → profile setup → first meaningful action sequence. Prefer **progressive onboarding** (introduce features at the moment of relevance) over front-loaded tours. For a makerspace, the "aha moment" is usually one of: viewing a featured project, RSVPing to an event, joining a challenge, or following a mentor. Audit whether the platform routes new users toward at least one of these within their first session.

### 4. Community engagement, contribution, and gamification

Personalization is the core engagement driver: even simple filtering by interests, group membership, or past behavior outperforms a generic feed. Audit whether feeds, dashboards, and notifications reflect the user's stated interests and past activity. For gamification (badges, challenges, leaderboards), verify three things: that game elements **enhance** rather than obstruct core tasks; that progress is visible (progress bars, badge case, challenge tracker); and that rewards are tied to **intrinsically meaningful behaviors** (shipping a project, mentoring someone, attending an event) rather than vanity metrics. Engagement studies cite ~48% engagement uplift from well-designed gamification, but only when it doesn't interfere with basic functionality.

### 5. Trust, safety, and content moderation

Community-driven platforms host user-generated content (projects, comments, profiles, photos), so the audit must cover trust & safety surfaces: clear community guidelines, visible reporting controls on every UGC surface, transparent moderation status (pending/approved/removed), block/mute affordances, and a hybrid moderation model (automated filters plus human review) that is at least documented in the UI. Audit whether new users see the community guidelines during signup, whether moderation decisions are explained to affected users, and whether minors (common in makerspaces) have age-appropriate protections.

### 6. Accessibility (WCAG 2.2 AA)

Accessibility is not optional — WCAG 2.2 (87 success criteria across the POUR framework: Perceivable, Operable, Understandable, Robust) has been the global baseline since October 2023. Audit against **Level AA**. The most common failures in production audits are color contrast (1.4.3, 1.4.11), missing/poor alt text, keyboard traps, missing focus indicators, low-contrast placeholders, and icon-only buttons without accessible names. WCAG 2.2 also added nine new criteria addressing low vision, cognitive load, and touch-screen motor accessibility — verify focus appearance (2.4.11), dragging movements (2.5.7), target size minimum (2.5.8), and consistent help (3.2.6).

### 7. Performance and Core Web Vitals

Performance is a UX issue. Audit against Google's 2026 Core Web Vitals targets: **LCP < 2.5 s, INP < 200 ms, CLS < 0.1**, measured on mobile-first. INP has replaced FID as the responsiveness metric and measures *all* interactions across the page lifecycle, not just the first. Use field data (CrUX/PageSpeed Insights) alongside lab data. For an image- and event-heavy makerspace site, watch especially for unoptimized hero/project images, layout shift from late-loading cards, and slow first interaction on dashboards.

### 8. Mobile and responsive design

Audit on real device sizes (small phone, large phone, tablet, laptop, desktop), not just resized desktop. Validate touch target size (minimum 24×24 CSS px per WCAG 2.5.8, 44×44 recommended), thumb-zone placement of primary actions, single-column collapse logic, and mobile navigation discoverability. The majority of community-platform traffic is mobile; the audit should weight mobile findings accordingly.

### 9. Visual design, brand, and content quality

A "brutalist" aesthetic (as Param Makerspace claims) is a deliberate choice, but it must still pass contrast, hierarchy, and scannability tests. Audit typographic hierarchy, spacing rhythm, color system consistency, empty-state design, loading states, error states, and microcopy tone. Check that the voice is welcoming to newcomers without being condescending to experienced makers.

### 10. Conversion and key flows

Map and audit each critical flow end-to-end: **sign-up → profile setup → first project upload; browse events → RSVP → calendar add → attendance; browse challenges → join → submit; discover mentor → request session → confirm; store → cart → checkout**. For each flow, count steps, identify drop-off risks, and confirm error recovery paths.

### 11. Severity and prioritization framework

Use a defensible severity scale. The most defensible is Nielsen's 0–4 scale (0 = not a problem, 1 = cosmetic, 2 = minor, 3 = major, 4 = catastrophic), combined with an **impact × effort** quadrant for prioritization: high-impact/low-effort first (quick wins), then high-impact/high-effort (strategic), with low-impact items going to the backlog. Every issue should carry: a unique ID, location (page + element), heuristic violated, severity, evidence (screenshot or quote), recommended fix, and effort estimate.

### 12. Audit hygiene

Use multiple evaluators where possible (3–5 is the field standard), run two passes (first pass = free exploration, second pass = systematic heuristic checklist), document with screenshots and exact URLs, and present findings sorted by severity with catastrophic and major issues first.

---

## Part 2 — How the Master Prompt Applies Anthropic's Prompt-Engineering Best Practices

The prompt below is engineered against Anthropic's official guidance for Claude 4.6 models. Specifically:

- **Be clear and direct** — the prompt states the success criteria, output format, and constraints explicitly rather than relying on inference.
- **Give Claude a role** — a senior UX auditor persona is set in the system-prompt section to focus tone and rigor.
- **Add context and motivation** — the prompt explains *why* the audit is being done so Claude can generalize beyond the literal instructions.
- **Use XML tags to structure prompts** — `<role>`, `<context>`, `<scope>`, `<methodology>`, `<heuristics>`, `<success_criteria>`, `<output_format>`, `<thinking>`, `<example>` separate concerns so Claude parses them unambiguously. Anthropic notes Claude was specifically trained to recognize XML structure.
- **Use examples (multishot)** — a worked example finding is included to anchor format, tone, and rigor.
- **Chain-of-thought / adaptive thinking** — the prompt explicitly invites step-by-step reasoning inside `<thinking>` before producing the final answer, and is compatible with adaptive-thinking models (Opus 4.6 / Sonnet 4.6) where Claude calibrates depth automatically.
- **Self-check / verification** — the prompt requires Claude to verify each finding against its supporting evidence and against the chosen heuristic before finalizing.
- **Long-context grounding** — when source files are passed in, the prompt asks Claude to quote relevant evidence first, then reason from quotes, which Anthropic recommends for long-document tasks.
- **Tell Claude what to do, not what not to do** — output rules are phrased positively.
- **Specify output format and success criteria** — a strict deliverable schema is given so the audit is comparable across runs.

---

## Part 3 — The Master Audit Prompt (copy-paste ready)

> Paste the block below into Claude (or your Claude-powered tool) as a single user message, with the platform's source files, screenshots, or live URLs attached or referenced. For Claude 4.6 models, use adaptive thinking with `effort: high` for the most rigorous result.

```xml
<role>
You are a Principal UX Researcher and Accessibility Auditor with 15+ years of
experience auditing community-driven platforms (makerspaces, learning
communities, open-source hubs, creator platforms). You hold CPACC accessibility
certification, you have led audits referenced by Nielsen Norman Group, and you
are known for findings that are specific, evidence-backed, severity-rated, and
immediately actionable. You never invent issues you cannot point to in the
source material. You never give opinions you cannot tie to a heuristic, a WCAG
criterion, a Core Web Vitals threshold, or cited community-platform research.
</role>

<context>
The product under audit is the Param Makerspace Portal — a community-driven
web platform for a makerspace. Its users include hobbyist makers, students,
mentors, and event organizers. Core entities are: Makers, Projects, Challenges,
Events, Badges, Mentors, Store, and Dashboards (member, mentor, admin). The
platform is built with React + TypeScript + Tailwind on Supabase, deployed on
Netlify, and adopts a "brutalist" visual aesthetic.

The audit's purpose is to (a) surface usability, accessibility, performance,
trust-and-safety, and engagement issues that block members from joining,
contributing, or returning, and (b) deliver a prioritized, defensible
remediation roadmap that the engineering team can execute against.

The audience for the final report is the product owner and a small engineering
team. They will trust findings that cite a specific page, element, heuristic,
or WCAG criterion. They will dismiss findings that read as generic opinion.
</context>

<scope>
Audit the following surfaces, in this order of priority:
1. First-time visitor flow: landing page → register → email confirm → profile setup → first meaningful action.
2. Core community surfaces: Makers directory, Maker profile, Projects list, Project detail, Project edit/upload.
3. Engagement surfaces: Challenges list, Challenge detail, Events list, Event detail, RSVP, Badges.
4. Relationship surfaces: Mentor discovery, Mentor dashboard, Member dashboard.
5. Transactional surfaces: Store, cart, checkout (if present).
6. Authentication and account surfaces: Login, Forgot password, Update password, email templates.
7. Cross-cutting: global navigation, search, footer, error pages, empty states, loading states, notifications.
</scope>

<methodology>
Apply the following frameworks in combination. Every finding MUST be tagged
with at least one framework reference.

<heuristics>
A. Nielsen's 10 Usability Heuristics (H1–H10):
   H1 Visibility of system status
   H2 Match between system and the real world (maker vocabulary)
   H3 User control and freedom
   H4 Consistency and standards
   H5 Error prevention
   H6 Recognition rather than recall
   H7 Flexibility and efficiency of use
   H8 Aesthetic and minimalist design
   H9 Help users recognize, diagnose, and recover from errors
   H10 Help and documentation

B. WCAG 2.2 Level AA (POUR): cite specific success criteria
   (e.g., 1.4.3 Contrast Minimum, 2.4.7 Focus Visible, 2.5.8 Target Size,
   2.4.11 Focus Appearance, 3.3.7 Redundant Entry, 3.2.6 Consistent Help).

C. Core Web Vitals 2026 thresholds:
   LCP < 2.5 s, INP < 200 ms, CLS < 0.1 — mobile-first.

D. Community-platform principles:
   - 2-clicks-to-anywhere navigation
   - Time-to-first-value within ~7 minutes
   - Progressive (not front-loaded) onboarding
   - Personalized feeds and dashboards
   - Visible, transparent moderation and reporting
   - Gamification that supports — not obstructs — core tasks

E. Information architecture: taxonomy clarity, label consistency across nav,
   breadcrumbs, footer, and search; no orphan pages; no redundant categories.

F. Mobile and touch: target size, thumb-zone, single-column collapse,
   discoverable mobile nav.

G. Trust & safety: visible reporting on every UGC surface, clear community
   guidelines exposed during signup, age-appropriate protections,
   transparent moderation status.
</heuristics>
</methodology>

<process>
Work in the following order. Do not skip steps.

Step 1 — Inventory. Inside <thinking> tags, list every page, flow, and
component you will audit. Cross-reference against <scope>. Flag any scope
items for which you have insufficient evidence and mark them
EVIDENCE_INSUFFICIENT rather than fabricating findings.

Step 2 — Evidence pass. For each surface, quote the specific code, copy,
markup, or screenshot region you are about to critique. Place quotes in
<evidence> tags. Never critique something you have not first quoted or
described concretely.

Step 3 — Heuristic pass. For each piece of evidence, identify which
heuristic(s), WCAG criterion, Core Web Vital, or community principle is
violated or upheld. Reason explicitly about severity.

Step 4 — Severity rating. Rate each issue on Nielsen's 0–4 scale:
   0 = not a usability problem
   1 = cosmetic (fix if time)
   2 = minor (low priority)
   3 = major (high priority)
   4 = catastrophic (must fix before release)

Step 5 — Prioritization. Plot each issue on an Impact × Effort quadrant:
Quick Wins (high impact / low effort), Strategic (high / high),
Fill-ins (low / low), Reconsider (low / high).

Step 6 — Self-check. Before finalizing, re-read every finding and verify:
   (a) it cites concrete evidence,
   (b) it cites a specific framework reference,
   (c) the severity is justified,
   (d) the recommendation is specific enough to implement,
   (e) you are not repeating the same finding under different labels.
   Remove or merge any finding that fails this check.

Step 7 — Output. Produce the final report in the exact schema below.
</process>

<success_criteria>
A successful audit:
- Cites at least one piece of concrete evidence for every finding.
- Tags every finding with at least one framework reference (H1–H10, WCAG SC,
  CWV metric, or community principle).
- Uses the 0–4 severity scale consistently.
- Sorts findings by severity (4 → 0).
- Distinguishes facts from inferences (mark inferences as INFERRED).
- Marks any surface you could not evaluate as EVIDENCE_INSUFFICIENT instead
  of guessing.
- Produces a prioritized remediation roadmap, not just a list of complaints.
- Is written in plain, specific language. No vague phrases like
  "improve the UX" or "make it more modern."
</success_criteria>

<output_format>
Produce the report in this exact structure:

# Param Makerspace — UX Audit Report

## 1. Executive Summary
Three to six sentences. State the overall health, the top three risks, and
the single highest-leverage fix. No marketing language.

## 2. Scorecard
A compact table scoring each of these dimensions 1–5 with one-line
justification: Usability heuristics, Information architecture, Onboarding &
first-value, Engagement & community, Accessibility (WCAG 2.2 AA),
Performance (Core Web Vitals), Mobile & responsive, Trust & safety,
Visual & content, Conversion flows.

## 3. Findings (sorted by severity, 4 → 0)
For each finding, use this template:

   ### F-### — <short title>
   - Surface: <page / component / flow>
   - Evidence: <quoted code / copy / described screenshot region>
   - Framework: <H#, WCAG SC, CWV metric, or community principle>
   - Severity: <0–4> — <one-line justification>
   - Impact: <who is affected and how>
   - Recommendation: <specific, implementable fix>
   - Effort: <S / M / L>
   - Quadrant: <Quick Win / Strategic / Fill-in / Reconsider>

## 4. Flow-by-flow analysis
For each priority flow in <scope>, give a step-by-step walkthrough with
friction points called out inline.

## 5. Accessibility appendix
List every WCAG 2.2 AA criterion you checked, marked Pass / Fail /
Not Applicable / Evidence Insufficient.

## 6. Performance appendix
For each measured page: LCP, INP, CLS, with field vs lab data noted, and
the top three optimization opportunities.

## 7. Prioritized roadmap
A table of the top 15 findings ordered by Quadrant then Severity, with
owner suggestion (frontend / backend / content / design) and a rough
sequencing recommendation (Sprint 1 / 2 / 3 / Backlog).

## 8. Open questions and evidence gaps
List anything marked EVIDENCE_INSUFFICIENT and what you would need to
resolve it (a screenshot, a real-device test, a CrUX export, etc.).
</output_format>

<example>
Here is a single worked finding in the required format. Match this level of
specificity and evidence.

### F-001 — Primary CTA on landing hero fails contrast on mobile
- Surface: Home.tsx, hero section, "Join the Makerspace" button
- Evidence: Button uses `bg-yellow-300 text-white` (Tailwind), measured
  contrast ratio 1.9:1 against the hero background gradient on a 390px
  viewport screenshot.
- Framework: WCAG 2.2 SC 1.4.3 Contrast (Minimum), Nielsen H8 (Aesthetic
  and minimalist design — readability prerequisite).
- Severity: 4 — catastrophic. The primary conversion CTA is unreadable for
  low-vision users and in bright sunlight on mobile, which is the dominant
  traffic mode for this audience.
- Impact: New visitors cannot reliably find or read the main signup
  affordance, directly suppressing registration conversion and excluding
  users with low vision.
- Recommendation: Change to `bg-yellow-400 text-black` or
  `bg-black text-yellow-300` to achieve ≥ 4.5:1 against both ends of the
  hero gradient. Add an automated contrast test in CI using axe-core.
- Effort: S
- Quadrant: Quick Win
</example>

<final_instructions>
Begin by quoting the relevant source material for the first surface in
<scope>, then proceed through the Process steps. Use <thinking> tags for
your internal reasoning and produce the final report under a clear
"# Param Makerspace — UX Audit Report" heading. Be specific. Be evidence-
backed. Do not invent. If a surface cannot be evaluated from the supplied
material, mark it EVIDENCE_INSUFFICIENT and continue.
</final_instructions>
```

---

## Part 4 — How to use this prompt

Attach or paste the platform source (the React/TypeScript files, the email templates, screenshots of each page on mobile and desktop, and ideally a PageSpeed Insights export for each priority page) above the prompt. For Claude Opus 4.6 or Sonnet 4.6, use adaptive thinking with `effort: "high"` and a generous `max_tokens` (≥ 32k) so the model has room to reason and produce the full report. For very large codebases, run the audit in two passes — first pass on public/unauthenticated surfaces, second pass on authenticated dashboards — and merge the findings. If you have 3–5 evaluators (human or model), run the prompt independently and merge findings, which Nielsen Norman shows catches significantly more issues than any single pass.

---

## Sources

- [10 Usability Heuristics for User Interface Design — Nielsen Norman Group](https://www.nngroup.com/articles/ten-usability-heuristics/)
- [How to Conduct a Heuristic Evaluation — Nielsen Norman Group](https://www.nngroup.com/articles/how-to-conduct-a-heuristic-evaluation/)
- [What is Heuristic Evaluation? — Interaction Design Foundation (updated 2026)](https://ixdf.org/literature/topics/heuristic-evaluation)
- [Information Architecture: Study Guide — Nielsen Norman Group](https://www.nngroup.com/articles/ia-study-guide/)
- [How to develop a taxonomy for your information architecture — Optimal Workshop](https://www.optimalworkshop.com/blog/how-to-develop-a-taxonomy-for-your-information-architecture)
- [Card Sorting Guide — Lyssna](https://www.lyssna.com/guides/card-sorting/)
- [How Your Community UX Design Impacts Engagement — BuddyBoss](https://buddyboss.com/blog/how-ux-design-impacts-community-engagement/)
- [UX Onboarding Best Practices in 2025 — UX Design Institute](https://www.uxdesigninstitute.com/blog/ux-onboarding-best-practices-guide/)
- [Top User Onboarding Best Practices for 2026 — UserGuiding](https://userguiding.com/blog/user-onboarding-best-practices)
- [What is Gamification? — Interaction Design Foundation (updated 2026)](https://ixdf.org/literature/topics/gamification)
- [Gamification in UX Design — Usability Geek](https://usabilitygeek.com/gamification-in-ux-design-enhancing-user-experience-and-engagement/)
- [WCAG 2.2 Checklist 2026: All 87 Criteria Explained — Web Accessibility Checker](https://web-accessibility-checker.com/en/blog/wcag-2-2-checklist-2026)
- [WCAG 2.2 Checklist: Complete 2026 Compliance Guide — Level Access](https://www.levelaccess.com/blog/wcag-2-2-aa-summary-and-checklist-for-website-owners/)
- [WCAG 2.2: What You Need to Know in 2026 — accessiBe](https://accessibe.com/blog/knowledgebase/wcag-two-point-two)
- [Core Web Vitals — Google Search Central](https://developers.google.com/search/docs/appearance/core-web-vitals)
- [Core Web Vitals 2026: What's Changed and How to Pass — Rivuletiq](https://www.rivuletiq.com/core-web-vitals-2026-whats-changed-and-how-to-pass/)
- [How Mobile Responsiveness Affects Core Web Vitals — Quattr](https://www.quattr.com/core-web-vitals/optimizing-mobile-responsiveness)
- [UGC Moderation Guide — Utopia Analytics](https://www.utopiaanalytics.com/article/user-generated-content-moderation)
- [Trust and Safety: Reduce Risk on Your Platform — Stream](https://getstream.io/blog/trust-safety/)
- [UX Audit Report Examples — Eleken](https://www.eleken.co/blog-posts/top-three-ux-audit-report-examples-and-how-to-pick-the-right-one)
- [A Complete Guide to UX Audit — UXtweak](https://blog.uxtweak.com/ux-audit/)
- [What's a User Feedback Severity Scale — User Interviews](https://www.userinterviews.com/blog/user-feedback-severity-scale)
- [Prompt engineering overview — Claude API Docs](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/overview)
- [Prompting best practices — Claude API Docs](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
- [Use XML tags to structure your prompts — Claude API Docs](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/use-xml-tags)
- [Let Claude think (chain of thought) — Claude API Docs](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/chain-of-thought)
- [Chain complex prompts for stronger performance — Claude API Docs](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/chain-prompts)
