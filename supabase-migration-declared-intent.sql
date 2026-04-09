-- ============================================================================
-- Migration: Add declared_intent column to maker_profile
-- Source ticket: UX_MASTER.md §1.5 Cross-File Auth Flow Gaps
-- Purpose: Persist the Zeigarnik build-intent the visitor commits to on the
--          landing-page hero (WelcomeHero.tsx) so it survives the Register →
--          email-verify → first-dashboard journey, and so OAuth users can
--          backfill it from a one-time prompt on /dashboard.
-- Notes:
--   * The UX_MASTER ticket calls the column `profiles.declared_intent`. The
--     concrete table in this codebase is `maker_profile` (see
--     supabase-schema.sql:47). It is the row created by ensureMakerProfile()
--     in src/lib/auth.tsx after first sign-in, so it is the right home for
--     this attribute.
--   * Nullable on purpose: legacy users and OAuth-first users will not have
--     a value until the post-OAuth prompt fires.
--   * No backfill needed.
-- ============================================================================

ALTER TABLE maker_profile
    ADD COLUMN IF NOT EXISTS declared_intent TEXT;

COMMENT ON COLUMN maker_profile.declared_intent IS
    'The build-intent the user picked on WelcomeHero (e.g. "a Robot", "a CNC part"). Captured from the ?intent= query param on Register, or from the post-OAuth one-time prompt on /dashboard. Nullable.';

-- Optional: cheap btree index in case we want to segment dashboards by intent
-- later. Commented out — uncomment when product asks for it.
-- CREATE INDEX IF NOT EXISTS maker_profile_declared_intent_idx
--     ON maker_profile (declared_intent)
--     WHERE declared_intent IS NOT NULL;
