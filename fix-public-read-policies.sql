-- ============================================================
-- FIX: Allow anonymous/logged-out users to read public data
--
-- WHAT THIS DOES (read-only policies only):
--   1. Adds a SELECT policy on app_user so anyone can see user names
--      (needed for project owners, team members, comment authors)
--   2. Adds a SELECT policy on xp_event so the landing page activity
--      feed works for visitors who aren't logged in
--
-- WHAT THIS DOES NOT DO:
--   - Does NOT grant write/update/delete access to anyone
--   - Does NOT change any existing policies
--   - Does NOT modify any data
--
-- HOW TO RUN:
--   1. Go to your Supabase Dashboard (jtbiupmtrblbruzjyvvw)
--   2. Open SQL Editor
--   3. Paste this entire file and click "Run"
-- ============================================================

-- 1. Allow anyone (including anonymous/logged-out visitors) to read
--    basic user info like names. This is public community information
--    needed to display project owners, comment authors, and team members.
CREATE POLICY user_public_read ON app_user
  FOR SELECT
  USING (true);

-- 2. Allow anyone to read XP events for the public activity feed
--    on the landing page.
CREATE POLICY xp_event_public_read ON xp_event
  FOR SELECT
  USING (true);

-- ============================================================
-- DONE. Refresh your app and logged-out users should now see:
--   - Real user names instead of "Unknown"
--   - Project/maker counts on the landing page
--   - Comment author names on project pages
--   - Activity feed data on the landing page
-- ============================================================
