-- ============================================================
-- PARAM MAKERSPACE — COMPREHENSIVE PERFORMANCE INDEXES
-- Run this in the Supabase SQL Editor.
-- Safe to run multiple times (IF NOT EXISTS).
-- ============================================================

-- ─── CRITICAL: RLS helper function lookups ───
-- get_my_role() and get_my_app_user_id() query app_user.auth_id
-- on EVERY RLS-checked request. This is THE most important index.
CREATE INDEX IF NOT EXISTS idx_app_user_auth_id ON app_user(auth_id);

-- ─── CORE TABLE FK INDEXES ───
CREATE INDEX IF NOT EXISTS idx_maker_profile_user_id ON maker_profile(user_id);

-- ─── PROJECT INDEXES ───
CREATE INDEX IF NOT EXISTS idx_project_owner_id ON project(owner_id);
CREATE INDEX IF NOT EXISTS idx_project_status ON project(status);
CREATE INDEX IF NOT EXISTS idx_project_status_visibility ON project(status, visibility);
-- Composite: "my projects" filter (owner + status)
CREATE INDEX IF NOT EXISTS idx_project_owner_status ON project(owner_id, status);
CREATE INDEX IF NOT EXISTS idx_project_image_project_id ON project_image(project_id);
CREATE INDEX IF NOT EXISTS idx_project_video_project_id ON project_video(project_id);
CREATE INDEX IF NOT EXISTS idx_project_file_project_id ON project_file(project_id);
CREATE INDEX IF NOT EXISTS idx_project_member_project_id ON project_member(project_id);
CREATE INDEX IF NOT EXISTS idx_project_milestone_project_id ON project_milestone(project_id);

-- ─── CHALLENGE INDEXES ───
CREATE INDEX IF NOT EXISTS idx_challenge_status ON challenge(status);
CREATE INDEX IF NOT EXISTS idx_challenge_step_challenge_id ON challenge_step(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_material_challenge_id ON challenge_material(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_skill_challenge_id ON challenge_skill(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_vocabulary_challenge_id ON challenge_vocabulary(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_level_challenge_id ON challenge_level(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_image_challenge_id ON challenge_image(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_video_challenge_id ON challenge_video(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_completion_lookup ON challenge_completion(challenge_id, user_id);
CREATE INDEX IF NOT EXISTS idx_challenge_completion_status ON challenge_completion(status);
CREATE INDEX IF NOT EXISTS idx_challenge_completion_user_id ON challenge_completion(user_id);

-- ─── EVENT INDEXES ───
CREATE INDEX IF NOT EXISTS idx_event_event_type ON event(event_type);
CREATE INDEX IF NOT EXISTS idx_event_date ON event(date);
CREATE INDEX IF NOT EXISTS idx_event_registration_event_id ON event_registration(event_id);
CREATE INDEX IF NOT EXISTS idx_event_registration_user_id ON event_registration(user_id);
CREATE INDEX IF NOT EXISTS idx_event_registration_lookup ON event_registration(event_id, user_id);
CREATE INDEX IF NOT EXISTS idx_event_checkin_event_id ON event_checkin(event_id);
CREATE INDEX IF NOT EXISTS idx_event_team_event_id ON event_team(event_id);
CREATE INDEX IF NOT EXISTS idx_event_team_member_team_id ON event_team_member(team_id);
CREATE INDEX IF NOT EXISTS idx_event_submission_event_id ON event_submission(event_id);
CREATE INDEX IF NOT EXISTS idx_showcase_slot_event_id ON showcase_slot(event_id);

-- ─── COMMUNITY INDEXES ───
-- (idx_comment_target, idx_reaction_target already exist in schema)
CREATE INDEX IF NOT EXISTS idx_comment_user_id ON comment(user_id);
CREATE INDEX IF NOT EXISTS idx_reaction_user_lookup ON reaction(target_type, target_id, user_id);
-- Reaction count queries filter by reaction_type
CREATE INDEX IF NOT EXISTS idx_reaction_type_target ON reaction(reaction_type, target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_user_badge_user_id ON user_badge(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badge_badge_id ON user_badge(badge_id);
CREATE INDEX IF NOT EXISTS idx_entity_tag_tag_id ON entity_tag(tag_id);

-- ─── STORE INDEXES ───
CREATE INDEX IF NOT EXISTS idx_store_product_is_active ON store_product(is_active);
CREATE INDEX IF NOT EXISTS idx_store_order_user_id ON store_order(user_id);
CREATE INDEX IF NOT EXISTS idx_store_order_status ON store_order(status);
CREATE INDEX IF NOT EXISTS idx_store_order_item_order_id ON store_order_item(order_id);

-- ─── OPS INDEXES ───
CREATE INDEX IF NOT EXISTS idx_equipment_induction_lookup ON equipment_induction(equipment_id, user_id);
CREATE INDEX IF NOT EXISTS idx_equipment_booking_lookup ON equipment_booking(equipment_id, user_id);

-- ============================================================
-- DONE — Verify with:
-- SELECT indexname, tablename FROM pg_indexes
-- WHERE schemaname = 'public' ORDER BY tablename;
-- ============================================================
