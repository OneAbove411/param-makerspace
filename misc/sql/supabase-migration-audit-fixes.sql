-- ============================================================
-- PARAM MAKERSPACE — AUDIT FIX MIGRATION (DB-18 through DB-22)
-- Generated from Codebase Audit Report, Section 8.4
-- Run in Supabase SQL Editor AFTER performance-indexes.sql
-- and performance-indexes-round-2.sql.
-- Safe to run multiple times (IF NOT EXISTS / OR REPLACE).
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- DB-18: Add indexes on RLS policy columns
-- ────────────────────────────────────────────────────────────
-- These columns appear in RLS USING / WITH CHECK clauses but
-- lack dedicated indexes. Without an index, the policy check
-- triggers a sequential scan on every query.

-- event_checkin: user_id used in ec_read policy
CREATE INDEX IF NOT EXISTS idx_event_checkin_user_id
    ON event_checkin(user_id);

-- event_team: lead_id used in et_insert policy
CREATE INDEX IF NOT EXISTS idx_event_team_lead_id
    ON event_team(lead_id);

-- event_submission: user_id used in es_insert, es_read policies
CREATE INDEX IF NOT EXISTS idx_event_submission_user_id
    ON event_submission(user_id);

-- showcase_slot: user_id used in ss_insert, ss_read policies
CREATE INDEX IF NOT EXISTS idx_showcase_slot_user_id
    ON showcase_slot(user_id);

-- equipment_induction: user_id used in ei_own_read policy
-- (composite idx_equipment_induction_lookup covers equipment_id+user_id
--  but not user_id alone for the RLS check)
CREATE INDEX IF NOT EXISTS idx_equipment_induction_user_id
    ON equipment_induction(user_id);

-- equipment_booking: user_id used in eb_own_insert, eb_own_read policies
CREATE INDEX IF NOT EXISTS idx_equipment_booking_user_id
    ON equipment_booking(user_id);

-- app_user: is_active used in suspended-account checks
-- Low cardinality but cheap to maintain; helps the C-5 signIn guard.
CREATE INDEX IF NOT EXISTS idx_app_user_is_active
    ON app_user(is_active)
    WHERE is_active = false;

-- ────────────────────────────────────────────────────────────
-- DB-19: Wrap auth.uid() in (SELECT auth.uid()) in RLS policies
-- ────────────────────────────────────────────────────────────
-- Per Supabase docs, wrapping auth.uid() in a subselect allows
-- PostgreSQL to evaluate it once per statement instead of once
-- per row. This can provide 100x+ improvement on large tables.
--
-- Source: https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv
--
-- Policies that directly call auth.uid() (not via get_my_app_user_id()):

-- ALTER POLICY is atomic — no gap where RLS is momentarily missing.
-- Ref: https://www.postgresql.org/docs/current/sql-alterpolicy.html
--
-- NOTE: Some policies from the schema file were inside a comment block
-- and may not exist on the live DB. Use DO blocks to skip gracefully.

-- app_user: user_read_own
DO $$ BEGIN
  ALTER POLICY user_read_own ON app_user
      USING (auth_id = (SELECT auth.uid()));
EXCEPTION WHEN undefined_object THEN
  RAISE NOTICE 'Policy user_read_own on app_user does not exist, skipping';
END $$;

-- xp_event: xp_event_read_own
-- (May not exist — the schema defines it inside a comment block.
--  xp_event_public_read with USING(true) already grants full read,
--  making this policy redundant even if it existed.)
DO $$ BEGIN
  ALTER POLICY xp_event_read_own ON xp_event
      USING (user_id = (SELECT auth.uid()));
EXCEPTION WHEN undefined_object THEN
  RAISE NOTICE 'Policy xp_event_read_own on xp_event does not exist, skipping';
END $$;

-- entity_tag: et_insert
DO $$ BEGIN
  ALTER POLICY et_insert ON entity_tag
      WITH CHECK ((SELECT auth.uid()) IS NOT NULL);
EXCEPTION WHEN undefined_object THEN
  RAISE NOTICE 'Policy et_insert on entity_tag does not exist, skipping';
END $$;

-- entity_tag: et_delete
DO $$ BEGIN
  ALTER POLICY et_delete ON entity_tag
      USING ((SELECT auth.uid()) IS NOT NULL);
EXCEPTION WHEN undefined_object THEN
  RAISE NOTICE 'Policy et_delete on entity_tag does not exist, skipping';
END $$;

-- Also optimize the RLS helper functions to use (SELECT auth.uid())
-- internally, benefiting ALL policies that call them.
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
PARALLEL SAFE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM app_user WHERE auth_id = (SELECT auth.uid());
$$;

CREATE OR REPLACE FUNCTION get_my_app_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
PARALLEL SAFE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM app_user WHERE auth_id = (SELECT auth.uid());
$$;

-- ────────────────────────────────────────────────────────────
-- DB-20: Verify UPDATE policies have matching SELECT policies
-- ────────────────────────────────────────────────────────────
-- PostgreSQL requires a matching SELECT policy for UPDATE
-- operations (needs to read existing row before updating).
--
-- Audit of all UPDATE policies:
--
-- project_mentor_update → project_mentor_read EXISTS ✓
-- cc_mentor_update      → cc_mentor_read EXISTS ✓
-- es_mentor_update      → es_read (public read) EXISTS ✓
-- ss_mentor_update      → ss_read (public read) EXISTS ✓
-- event_mentor_all      → event_public_read EXISTS ✓
-- ec_mentor_all         → ec_read EXISTS ✓
-- ei_mentor_all         → ei_own_read EXISTS ✓
-- eb_mentor_all         → eb_own_read EXISTS ✓
-- admin_all (all tables) → various public_read policies ✓
--
-- Tables with FOR ALL policies (which cover UPDATE):
-- profile_own_all       → profile_public_read + profile_own_all covers SELECT ✓
-- project_own_all       → project_own_all covers SELECT ✓
-- pm_own, pms_own, etc. → pm_read, pms_read, etc. cover SELECT ✓
--
-- RESULT: All UPDATE policies have matching SELECT policies. No fix needed.

-- ────────────────────────────────────────────────────────────
-- DB-21: Add BRIN indexes on created_at/updated_at
-- ────────────────────────────────────────────────────────────
-- BRIN indexes are 10x smaller than B-tree for sequentially-
-- inserted data (like timestamps). They're ideal for append-
-- heavy tables where rows are inserted in chronological order.
--
-- Source: https://supabase.com/docs/guides/database/postgres/indexes

-- project: large, append-heavy, frequently sorted by created_at
CREATE INDEX IF NOT EXISTS idx_project_created_brin
    ON project USING brin(created_at);

CREATE INDEX IF NOT EXISTS idx_project_updated_brin
    ON project USING brin(updated_at);

-- comment: high-volume, always sorted by created_at
CREATE INDEX IF NOT EXISTS idx_comment_created_brin
    ON comment USING brin(created_at);

-- reaction: high-volume, used in time-based queries
CREATE INDEX IF NOT EXISTS idx_reaction_created_brin
    ON reaction USING brin(created_at);

-- xp_event: high-volume, sorted by created_at in dashboard
CREATE INDEX IF NOT EXISTS idx_xp_event_created_brin
    ON xp_event USING brin(created_at);

-- event: sorted by date in listing pages
CREATE INDEX IF NOT EXISTS idx_event_created_brin
    ON event USING brin(created_at);

-- ────────────────────────────────────────────────────────────
-- DB-22: Add composite index on entity_tag(target_type, target_id)
-- ────────────────────────────────────────────────────────────
-- entity_tag queries ALWAYS filter on both target_type AND
-- target_id together. A composite index serves both the
-- exact-match lookup and the polymorphic join pattern.

CREATE INDEX IF NOT EXISTS idx_entity_tag_target
    ON entity_tag(target_type, target_id);

-- ============================================================
-- DONE. Verify with:
--   SELECT schemaname, tablename, indexname, indexdef
--   FROM pg_indexes
--   WHERE schemaname = 'public'
--   ORDER BY tablename, indexname;
--
-- After running, update statistics:
--   ANALYZE app_user;
--   ANALYZE event_checkin;
--   ANALYZE event_team;
--   ANALYZE event_submission;
--   ANALYZE showcase_slot;
--   ANALYZE equipment_induction;
--   ANALYZE equipment_booking;
--   ANALYZE project;
--   ANALYZE comment;
--   ANALYZE reaction;
--   ANALYZE xp_event;
--   ANALYZE event;
--   ANALYZE entity_tag;
-- ============================================================
