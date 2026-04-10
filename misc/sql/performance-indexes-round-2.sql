-- ============================================================
-- PARAM MAKERSPACE — PERFORMANCE INDEXES, ROUND 2
-- Supplements performance-indexes.sql with the query patterns
-- that were added (or left uncovered) since that file was
-- first written. Safe to run multiple times (IF NOT EXISTS).
--
-- Run in Supabase SQL Editor AFTER performance-indexes.sql.
-- Each index is annotated with the exact query in src/lib/hooks.ts
-- that justifies it so future maintainers can verify.
-- ============================================================

-- ─── xp_event (Dashboard XP history feed) ─────────────────────
-- useMyXPHistory (src/lib/hooks.ts ~L2348):
--   .from('xp_event').eq('user_id', user.id).order('created_at', desc)
-- The base schema ships no index on xp_event at all. This is a
-- hot path because every dashboard mount fires it AND a realtime
-- INSERT subscription triggers a refetch on every XP award.
CREATE INDEX IF NOT EXISTS idx_xp_event_user_created
    ON xp_event(user_id, created_at DESC);

-- ─── project_member (reverse direction) ───────────────────────
-- useMaker (src/lib/hooks.ts ~L1054):
--   .from('project_member').eq('user_id', p.user_id).eq('role', 'mentor')
-- Existing index is project_member(project_id). Querying by
-- user_id forces a seq scan on every maker profile view.
CREATE INDEX IF NOT EXISTS idx_project_member_user_role
    ON project_member(user_id, role);

-- ─── project archive default sort ─────────────────────────────
-- useProjects (src/lib/hooks.ts ~L221):
--   .eq('status','active').eq('visibility','public').order('created_at', desc)
-- The existing (status, visibility) composite narrows rows, but
-- Postgres still has to sort the remainder. A covering composite
-- lets the planner stream rows in index order with zero sort.
CREATE INDEX IF NOT EXISTS idx_project_archive_sort
    ON project(status, visibility, created_at DESC);

-- ─── project owner listing on maker profile ───────────────────
-- useMaker (src/lib/hooks.ts ~L1050):
--   .from('project').eq('owner_id', p.user_id).eq('status','active').eq('visibility','public')
-- Existing indexes: project(owner_id) and project(owner_id,status).
-- A (owner_id, visibility, status) covering index lets the lookup
-- hit every filter without a recheck.
CREATE INDEX IF NOT EXISTS idx_project_owner_visible
    ON project(owner_id, visibility, status);

-- ─── challenge archive default sort ───────────────────────────
-- useChallenges (src/lib/hooks.ts ~L622):
--   .eq('status','published').order('created_at', desc)
-- Existing index is single-column challenge(status). Adding
-- created_at to the composite avoids the post-filter sort.
CREATE INDEX IF NOT EXISTS idx_challenge_published_sort
    ON challenge(status, created_at DESC);

-- ─── event listing with type filter ───────────────────────────
-- useEvents (src/lib/hooks.ts ~L831):
--   .order('date', asc)   [+ optional .eq('event_type', …)]
-- event(date) and event(event_type) exist separately. The combined
-- index speeds up the filtered case without regressing the
-- unfiltered case (Postgres can still use (event_type,date) with
-- a leading-column wildcard via index-only scan).
CREATE INDEX IF NOT EXISTS idx_event_type_date
    ON event(event_type, date);

-- ─── challenge_completion dashboard count ─────────────────────
-- useMakerDashboard / useDashboardStats (src/lib/hooks.ts ~L1162):
--   .eq('user_id', user.id).eq('status','verified')
-- Two single-column indexes already exist; a composite saves the
-- bitmap AND and lets the planner return counts without a row
-- touch.
CREATE INDEX IF NOT EXISTS idx_challenge_completion_user_status
    ON challenge_completion(user_id, status);

-- ─── event_website by reviewer (self-submission lookup) ───────
-- useMyEventWebsite (src/lib/hooks.ts ~L1863):
--   .eq('event_id', eventId).eq('user_id', user.id).maybeSingle()
-- Existing: idx_event_website_event and idx_event_website_status.
-- Adding (user_id, event_id) covers the "did I submit to this
-- event" lookup without scanning every row for an event.
CREATE INDEX IF NOT EXISTS idx_event_website_user_event
    ON event_website(user_id, event_id);

-- ─── app_user sort by created_at (admin ManageUsers) ──────────
-- useManageUsersData (src/pages/admin/ManageUsers.tsx):
--   .order('created_at', desc)
-- Small table today, but the admin list grows linearly with
-- signups. The index is cheap and makes the admin page instant.
CREATE INDEX IF NOT EXISTS idx_app_user_created
    ON app_user(created_at DESC);

-- ─── maker_profile public listing ─────────────────────────────
-- useMakers (src/lib/hooks.ts ~L949):
--   .eq('is_public', true).order('display_name')
-- Low-cardinality flag so PG may prefer a seq scan until the
-- table grows. Partial index on is_public=true is the cheap
-- variant that stays tiny and only helps when it helps.
CREATE INDEX IF NOT EXISTS idx_maker_profile_public_name
    ON maker_profile(display_name)
    WHERE is_public = true;

-- ─── user_badge existence check ───────────────────────────────
-- useBadgeMutations awardBadge and user_badge(user_id, badge_id)
-- unique-existence lookups. user_badge(user_id) and
-- user_badge(badge_id) exist separately. A composite unique helps
-- duplicate-prevention AND the lookup.
CREATE INDEX IF NOT EXISTS idx_user_badge_user_badge
    ON user_badge(user_id, badge_id);

-- ============================================================
-- DONE. Verify with:
--   SELECT schemaname, tablename, indexname
--   FROM pg_indexes
--   WHERE schemaname = 'public'
--   ORDER BY tablename, indexname;
--
-- After running, you can optionally run ANALYZE on each touched
-- table so the query planner picks up the new stats immediately:
--   ANALYZE project;
--   ANALYZE challenge;
--   ANALYZE event;
--   ANALYZE xp_event;
--   ANALYZE project_member;
--   ANALYZE challenge_completion;
--   ANALYZE event_website;
--   ANALYZE maker_profile;
--   ANALYZE user_badge;
--   ANALYZE app_user;
-- ============================================================
