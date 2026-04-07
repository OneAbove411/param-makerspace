# Param Makerspace — Per-Component UX/UI Action Plans

> **How to use this file:** Each section below is a self-contained brief for a single component or page flow. Open a new Claude Code chat instance, paste the `UX_AUDIT_MASTER_PROMPT.md` first, then paste the corresponding section from this file as the working ticket. The prompt at the bottom of each section is copy-paste ready.
>
> **Global rules for every instance:**
> - Honor the existing brutalist aesthetic (`brutal-red`, `brutal-dark`, thick borders, mono/serif type mix). Do **not** modernize the look — only the *feel*.
> - Reuse `Button.tsx`, `Card.tsx`, `Input.tsx`, `MagneticCard.tsx`, `RankBadge.tsx`. Extend, do not duplicate.
> - Empty / "no projects yet" states are **out of scope** — they will be populated later.
> - Every interactive element must have a visible `:focus-visible` ring (`focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brutal-red`).
> - Every async action must give optimistic feedback within 100 ms and confirm via the shared toast system (introduce `sonner` or a thin custom toaster if missing).
> - Target Apple-style transitions: `transition-all duration-200 ease-out`, spring on cards (`MagneticCard`), no jank, no CLS.
> - WCAG 2.2 AA, mobile-first, touch targets ≥ 44 × 44 px.

---

## 0. Cross-Cutting Pre-Work (do this in one instance FIRST, then merge)

These primitives are referenced by every other ticket. Land them before splitting work in parallel.

**Scope of work**
1. Fix the `rouned-xl` → `rounded-xl` typo in `src/components/ui/Input.tsx` (line ~17).
2. Add a global `focus-visible` ring utility to `Button.tsx`, `Input.tsx`, `Card.tsx`, and any `<a>` / `<select>` used in pages. Variant-aware (red on dark bg, dark on light bg).
3. Add `disabled:opacity-50 disabled:cursor-not-allowed` to `Button.tsx` base styles and document the `magnetic-btn` global class with a JSDoc comment.
4. Introduce a single `<Toaster />` (sonner or custom) mounted in `RootLayout.tsx`. Export `toast.success`, `toast.error`, `toast.loading`, `toast.promise`. Replace every `alert(...)` and silent success in the codebase in later tickets.
5. Create three shared primitives in `src/components/ui/`:
   - `Skeleton.tsx` (variants: `card`, `line`, `avatar`, `banner`).
   - `EmptyState.tsx` (`title`, `description`, `icon`, `cta`) — built but only wired into surfaces explicitly approved (do **not** wire into projects/makers/etc. unprompted, since population is pending).
   - `FieldError.tsx` (icon + helper text, used by every form).
6. Standardize loading microcopy: `"Loading…"`, `"Saving…"`, `"Redirecting…"`, `"Uploading…"`. Document in `src/lib/copy.ts`.
7. Standardize auth verb microcopy: `"Sign in"`, `"Sign up"`, `"Reset password"`, `"Save new password"`. Document in `src/lib/copy.ts`. (Replaces `Authenticate`, `Create Identity`, `New initialization?`, etc.)
8. Add a `useUnsavedChanges(formDirty: boolean)` hook that hooks `beforeunload` and React Router `useBlocker` for navigation guards. Used by `EditProject`, `ProfileSetup`, `Dashboard` project form.
9. Add a `useOptimistic` helper or tiny wrapper around mutation calls to support optimistic counts (likes, reactions, RSVP).

**Acceptance**
- All four primitives compile, are storybooked or demoed in `App.tsx` dev route, and pass an axe-core scan with zero violations.
- A grep for `alert(` returns zero hits in `src/`.
- A grep for `Authenticate|Create Identity|New initialization` returns zero hits in `src/pages/`.

**Prompt to paste into the new Claude instance**
> You are picking up section **0. Cross-Cutting Pre-Work** of `UX_ACTION_PLAN_PER_COMPONENT.md`. Read `UX_AUDIT_MASTER_PROMPT.md` for context, then read every file under `src/components/ui/` and `src/components/layout/RootLayout.tsx`. Implement only the items in the Scope of Work list above. Do **not** touch any page files. After implementation, run `npm run build` and `npm run lint`, fix any issues, and produce a short diff summary plus a list of follow-up grep commands the next agents can run to confirm the primitives are now available.

---

## 1. Landing Page — `src/pages/Home.tsx` + `src/components/home/*`

**Files in scope:** `Home.tsx`, `WelcomeHero.tsx`, `WhatIsParam.tsx`, `Philosophy.tsx`, `WhyParam.tsx`, `MakerLoop.tsx`, `Protocol.tsx`, `RankPath.tsx`, `FeaturedProjects.tsx`, `LivePulse.tsx`, `KnowMore.tsx`, `JoinSection.tsx`, `DiscoverSection.tsx`, `BuildQuestion.tsx`, `ProofSection.tsx`, `CursorProtocolScheduler.tsx`, `DiagnosticShuffler.tsx`, `TelemetryTypewriter.tsx`.

**Audit findings to address**
1. `WelcomeHero` is identical for logged-in and logged-out users — no personalization branch (H2, H6).
2. `LivePulse` and `KnowMore` fetch dynamic content with no skeleton; layout shifts on first paint (CWV CLS, H1).
3. `FeaturedProjects` carousel/grid card hover is inconsistent with `MagneticCard` used elsewhere (H4).
4. The hero CTA path (`Join` → `/register`) is not measurable; no scroll cue indicating there is more below the fold (H6).
5. Several home subcomponents (`TelemetryTypewriter`, `DiagnosticShuffler`, `CursorProtocolScheduler`) animate continuously and risk WCAG 2.3.3 / 2.2.2 (animation, pause). No `prefers-reduced-motion` guard.
6. Section rhythm: vertical spacing between sections varies (`py-16`, `py-20`, `py-24`) — break the visual grid (H4, H8).
7. Mobile: `WelcomeHero` headline likely overflows at 320 px; verify and add responsive type scale.
8. No anchor / sticky sub-nav for the long landing page; users scroll blind (H6, H7).

**Action plan**
- **Step 1 — Personalization branch.** In `WelcomeHero`, read `useAuth()`. If logged in: greet by first name, swap CTA to `Open Dashboard`. If logged out: keep current copy but rewrite CTA to `Sign up — it's free` and add a secondary `Sign in` ghost button. Animate transition with `framer-motion` or CSS `view-transition-name` if available.
- **Step 2 — Reduced motion.** Wrap every continuous animation in `useReducedMotion()` (framer) or a CSS `@media (prefers-reduced-motion: reduce)` block. Stop typewriter loop at the final string.
- **Step 3 — Skeletons.** Wire `<Skeleton variant="banner" />` into `LivePulse` and `<Skeleton variant="card" count={3} />` into `FeaturedProjects` while data loads. Reserve height with `min-h-[…]` to kill CLS.
- **Step 4 — Section rhythm.** Standardize on `py-24 md:py-32` for primary sections, `py-16` for secondary. Standardize horizontal padding to `px-6 md:px-12`.
- **Step 5 — Scroll cue.** Add a small bouncing chevron at the bottom of `WelcomeHero` (respect reduced motion) labeled `Scroll`.
- **Step 6 — Mobile typography.** Audit at 320, 375, 414 px. Use `clamp()` or Tailwind `text-4xl md:text-6xl lg:text-7xl` for the hero headline.
- **Step 7 — Anchor nav (optional but recommended).** Add a thin sticky chip nav under the navbar on the home route that jumps to `#what`, `#philosophy`, `#protocol`, `#featured`, `#join`. Hide on scroll down, show on scroll up.
- **Step 8 — Card consistency.** All featured project cards use `MagneticCard intensity={5}` and shared `<Card>` borders.
- **Step 9 — Verification.** Lighthouse mobile run; confirm CLS < 0.1 and LCP < 2.5 s on a throttled run. Manual keyboard pass through every CTA. Axe-core scan.

**Prompt to paste**
> You are implementing section **1. Landing Page** of `UX_ACTION_PLAN_PER_COMPONENT.md`. Context lives in `UX_AUDIT_MASTER_PROMPT.md`. Read `src/pages/Home.tsx` and every file in `src/components/home/`. Then execute steps 1–9 in the action plan. Reuse the primitives created in section 0 (`Skeleton`, toast, focus rings). Do **not** touch routing, auth, or any files outside `src/pages/Home.tsx` and `src/components/home/`. End with a Lighthouse mobile screenshot or numerical summary, an axe-core report, and a short changelog.

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
- Unify success and error banners into a single `<AuthBanner type="success|error" />` shared subcomponent (kept inside `Login.tsx` or moved to `src/components/auth/AuthBanner.tsx` if reusable).
- Make the Google button text reactive: `googleLoading ? 'Redirecting…' : 'Continue with Google'`. Disable on either loading state.
- Add `<FieldError>` from section 0 below the password field; show passive helper `Min. 6 characters` until the user types, then validate live.
- Add `<button type="button">` eye toggle inside the password input (right-aligned, 24 px, accessible name `Show password` / `Hide password`).
- Add Caps Lock detection on password keydown; show inline pill `Caps Lock is on`.
- After successful login, route to `/dashboard` with a `view-transition` if supported, otherwise a 200 ms cross-fade.
- Verify: keyboard-only login flow works end-to-end, screen reader announces banner role="status" / role="alert" appropriately, axe-core passes.

**Prompt to paste**
> You are implementing section **2. Login** of `UX_ACTION_PLAN_PER_COMPONENT.md`. Read `UX_AUDIT_MASTER_PROMPT.md`, then `src/pages/Login.tsx` and `src/lib/auth.tsx`. Execute the action plan exactly. Use the primitives from section 0 (`FieldError`, focus ring, toast, copy strings). Do not modify the auth provider or backend logic. End with a keyboard walkthrough log and an axe-core report.

---

## 3. Register — `src/pages/Register.tsx`

**Audit findings**
1. Password validation is submit-only (H5).
2. The email-sent success screen has a weak CTA (H6).
3. No confirm-password field — typos lock users out until reset (H5).
4. No real-time email format validation (H5).
5. `Create Identity` copy violates H2.
6. No password strength meter; brutalist aesthetic can still accommodate a four-block bar.

**Action plan**
- Add real-time validators for email (RFC-light regex) and password (length + at least one digit). Use `<FieldError>`.
- Add a `Confirm password` field with live mismatch indicator.
- Add a four-block strength meter (Weak / Fair / Good / Strong) styled with `brutal-red` blocks.
- Replace `Create Identity` with `Sign up`. Update the success screen to a centered card with a primary `Sign in` button and a secondary `Resend verification email` link wired to Supabase resend.
- Disable submit while the form is invalid; show a subtle reason on hover/focus.
- After submit, surface a toast `Verification email sent to {email}` and keep the success screen.
- Verify: tab order is name → email → password → confirm → submit → social → footer link. Axe-core clean.

**Prompt to paste**
> You are implementing section **3. Register** of `UX_ACTION_PLAN_PER_COMPONENT.md`. Read `UX_AUDIT_MASTER_PROMPT.md`, then `src/pages/Register.tsx`. Execute the action plan exactly. Reuse section-0 primitives. Do not modify Supabase config. End with screenshots of the four password-strength states and an axe-core report.

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

**Prompt to paste**
> You are implementing section **4. Forgot Password** of `UX_ACTION_PLAN_PER_COMPONENT.md`. Read `UX_AUDIT_MASTER_PROMPT.md`, then `src/pages/ForgotPassword.tsx`. Execute the action plan. Reuse section-0 primitives. End with a keyboard walkthrough and axe-core report.

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

**Prompt to paste**
> You are implementing section **5. Update Password** of `UX_ACTION_PLAN_PER_COMPONENT.md`. Read `UX_AUDIT_MASTER_PROMPT.md`, then `src/pages/UpdatePassword.tsx` and the relevant Supabase password helper in `src/lib/auth.tsx`. Execute the action plan, reusing section-0 primitives. Do not change auth backend logic. End with a screen-recording-equivalent description of the success path.

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
- Verify: tab order traverses every field, screen reader announces section transitions, autosave never blocks input.

**Prompt to paste**
> You are implementing section **6. Profile Setup** of `UX_ACTION_PLAN_PER_COMPONENT.md`. Read `UX_AUDIT_MASTER_PROMPT.md`, then `src/pages/ProfileSetup.tsx` and any helpers under `src/lib/` it imports. Execute the action plan. Reuse section-0 primitives (`Skeleton`, toast, `useUnsavedChanges`). Do not change the database schema. End with a per-section autosave log and an axe-core report.

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

**Prompt to paste**
> You are implementing section **7. Dashboard** of `UX_ACTION_PLAN_PER_COMPONENT.md`. Read `UX_AUDIT_MASTER_PROMPT.md`, then `src/pages/Dashboard.tsx`. Execute the action plan exactly. Reuse section-0 primitives. Do not redesign empty states — those are pending content. End with a keyboard walkthrough log and an axe-core report.

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

**Prompt to paste**
> You are implementing section **8. Projects List** of `UX_ACTION_PLAN_PER_COMPONENT.md`. Read `UX_AUDIT_MASTER_PROMPT.md`, then `src/pages/Projects.tsx`. Execute the action plan. Do not redesign empty states — those are pending content. Reuse section-0 primitives. End with a screenshot description of the active-filter chips and the loading skeleton.

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

**Prompt to paste**
> You are implementing section **9. Project Details** of `UX_ACTION_PLAN_PER_COMPONENT.md`. Read `UX_AUDIT_MASTER_PROMPT.md`, then `src/pages/ProjectDetails.tsx`. Execute the action plan. Reuse section-0 primitives, especially `useOptimistic` and toast. Do not redesign the page layout, only the friction points. End with a list of every aria-attribute added and an axe-core report.

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

**Prompt to paste**
> You are implementing section **10. Edit Project** of `UX_ACTION_PLAN_PER_COMPONENT.md`. Read `UX_AUDIT_MASTER_PROMPT.md`, then `src/pages/EditProject.tsx`. Execute the action plan. Reuse `useUnsavedChanges`, `FieldError`, and toast. Add `@dnd-kit/sortable` only if it is already in `package.json`; otherwise use up/down arrow buttons. End with a checklist of validators added and an axe-core report.

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

**Prompt to paste**
> You are implementing section **11. Makers Directory** of `UX_ACTION_PLAN_PER_COMPONENT.md`. Read `UX_AUDIT_MASTER_PROMPT.md`, then `src/pages/Makers.tsx`. Execute the action plan. Reuse section-0 primitives. Do not change the user data shape. End with screenshots of the badge layout at xs / md / lg breakpoints.

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

**Prompt to paste**
> You are implementing section **12. Maker Details (Explorer Hub)** of `UX_ACTION_PLAN_PER_COMPONENT.md`. Read `UX_AUDIT_MASTER_PROMPT.md`, then `src/pages/MakerDetails.tsx` and the contents of `public/icons.svg` if present. Execute the action plan. Reuse section-0 primitives. End with an axe-core report and a list of every accessible name added.

---

## 13. Challenges + Challenge Details — `src/pages/Challenges.tsx`, `src/pages/ChallengeDetails.tsx`

**Audit findings**
1. Page title `Explorer Hub` does not match the route `/challenges` (H4, navigation clarity).
2. Tier filter active state is CSS-only and is not URL-synced (H6).
3. `DOMAIN_COLORS` is hardcoded with hex; some colors fail 4.5:1 against the brutalist dark background (WCAG 1.4.3).
4. Challenge detail page (verify in file) likely lacks a clear submission status indicator (H1).

**Action plan**
- Decide on **one** page title — `Challenges` is the safer match. If the brand insists on `Explorer Hub`, add a breadcrumb `Challenges › Explorer Hub`.
- URL-sync `tierFilter` and `domainFilter` via `useSearchParams`.
- Replace `DOMAIN_COLORS` with Tailwind tokens defined in `tailwind.config.{js,ts}`. Run a contrast check; bump any color that's < 4.5:1 against `brutal-dark` and against `brutal-cream`.
- On `ChallengeDetails`, add a clear status pill: `Not started / In progress / Submitted / Approved / Rejected`. Show the submission CTA only when applicable.
- Add countdown for time-bound challenges (reuse the events countdown helper).
- Verify: keyboard nav, focus rings, axe-core clean.

**Prompt to paste**
> You are implementing section **13. Challenges + Challenge Details** of `UX_ACTION_PLAN_PER_COMPONENT.md`. Read `UX_AUDIT_MASTER_PROMPT.md`, then `src/pages/Challenges.tsx`, `src/pages/ChallengeDetails.tsx`, and `tailwind.config.*`. Execute the action plan. Reuse section-0 primitives. End with a contrast-check table for every domain color and an axe-core report.

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
- After RSVP, fire `toast.success('You're in. Check your email for the .ics file.')` and update the button to `You're going · Cancel RSVP`.
- Verify: keyboard nav on the dropdown, focus traps where appropriate, axe-core clean.

**Prompt to paste**
> You are implementing section **14. Events + Event Details** of `UX_ACTION_PLAN_PER_COMPONENT.md`. Read `UX_AUDIT_MASTER_PROMPT.md`, then `src/pages/Events.tsx` and `src/pages/EventDetails.tsx`. Execute the action plan. Reuse section-0 primitives. Implement the calendar dropdown without adding a heavy dependency — a small inline ICS string builder is fine. End with screenshots of the past-event style and an axe-core report.

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

**Prompt to paste**
> You are implementing section **15. Badges** of `UX_ACTION_PLAN_PER_COMPONENT.md`. Read `UX_AUDIT_MASTER_PROMPT.md`, then `src/pages/Badges.tsx` and the `RankUpModal.tsx` / `RankBadge.tsx` components. Execute the action plan. Reuse section-0 primitives. End with breakpoint screenshots at 320, 768, and 1280 px.

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

**Prompt to paste**
> You are implementing section **16. Store** of `UX_ACTION_PLAN_PER_COMPONENT.md`. Read `UX_AUDIT_MASTER_PROMPT.md`, then `src/pages/Store.tsx`. Execute the action plan. Reuse section-0 primitives. If checkout is not implemented, stop after the cart-feedback step and report it. End with an axe-core report.

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

**Prompt to paste**
> You are implementing section **17. Mentor Dashboard** of `UX_ACTION_PLAN_PER_COMPONENT.md`. Read `UX_AUDIT_MASTER_PROMPT.md`, then `src/pages/MentorDashboard.tsx` and the admin review pages it shares logic with. Execute the action plan. Reuse section-0 primitives. End with a keyboard-shortcuts cheat sheet and an axe-core report.

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

**Prompt to paste**
> You are implementing section **18. Global Navbar** of `UX_ACTION_PLAN_PER_COMPONENT.md`. Read `UX_AUDIT_MASTER_PROMPT.md`, then `src/components/layout/Navbar.tsx`, `src/components/layout/RootLayout.tsx`, and `src/components/layout/XPHudPill.tsx`. Execute the action plan. Reuse section-0 primitives. End with breakpoint screenshots and an axe-core report.

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
> You are implementing section **19. Footer** of `UX_ACTION_PLAN_PER_COMPONENT.md`. Read `UX_AUDIT_MASTER_PROMPT.md`, then `src/components/layout/Footer.tsx` and `src/App.tsx`. Execute the action plan. Reuse section-0 primitives. Stub legal pages are acceptable. End with an axe-core report.

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
> You are running section **20. Verification & Sign-off** of `UX_ACTION_PLAN_PER_COMPONENT.md`. Do **not** edit code unless you find a regression. Read `UX_AUDIT_MASTER_PROMPT.md` for context. Execute every check in the Scope list above and produce a single signed-off report with a Pass/Fail verdict per route and a list of any blocking issues found. If any blocker exists, file a follow-up ticket referencing the relevant section number from this file.
