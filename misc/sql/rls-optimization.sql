-- ============================================================
-- PARAM MAKERSPACE — RLS HELPER FUNCTION OPTIMIZATION
-- Run this in the Supabase SQL Editor AFTER performance-indexes.sql.
-- Safe to run multiple times (CREATE OR REPLACE).
-- ============================================================

-- The RLS policies call get_my_role() and get_my_app_user_id()
-- on EVERY row check. These functions are marked STABLE, which
-- tells PostgreSQL the result won't change within a single
-- SQL statement — so the planner can cache and reuse the result.
--
-- We also add PARALLEL SAFE so these can run in parallel query plans.

-- ─── Optimized get_my_role() ───
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
PARALLEL SAFE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM app_user WHERE auth_id = auth.uid();
$$;

-- ─── Optimized get_my_app_user_id() ───
CREATE OR REPLACE FUNCTION get_my_app_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
PARALLEL SAFE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM app_user WHERE auth_id = auth.uid();
$$;

-- ============================================================
-- NOTE: With the idx_app_user_auth_id index from
-- performance-indexes.sql, these functions now do an index
-- lookup (O(log n)) instead of a full table scan (O(n)).
--
-- The STABLE marking tells PostgreSQL the result is constant
-- within a single statement, so even if multiple RLS policies
-- call get_my_role() in the same query, it only executes once.
-- ============================================================
