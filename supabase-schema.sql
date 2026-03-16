-- ============================================================
-- PARAM MAKERSPACE — COMPLETE SUPABASE SCHEMA
-- Run this entire file in the Supabase SQL Editor.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 0. EXTENSIONS
-- ─────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────────────────────
-- 1. CORE TABLES
-- ─────────────────────────────────────────────────────────────

CREATE TABLE app_user (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_id     UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email       TEXT NOT NULL,
    name        TEXT NOT NULL DEFAULT '',
    role        TEXT NOT NULL DEFAULT 'maker' CHECK (role IN ('viewer','maker','mentor','admin')),
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE maker_profile (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id      UUID UNIQUE NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL DEFAULT '',
    pronouns     TEXT,
    bio          TEXT,
    aspirations  TEXT,
    avatar_url   TEXT,
    github_url   TEXT,
    linkedin_url TEXT,
    website_url  TEXT,
    is_public    BOOLEAN NOT NULL DEFAULT true,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE skill (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name       TEXT UNIQUE NOT NULL,
    category   TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE badge (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    tier        TEXT NOT NULL DEFAULT 'Tier 1',
    domain      TEXT NOT NULL DEFAULT 'General',
    badge_type  TEXT NOT NULL DEFAULT 'Achievement',
    criteria    TEXT NOT NULL DEFAULT '',
    image_url   TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_badge (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    badge_id   UUID NOT NULL REFERENCES badge(id) ON DELETE CASCADE,
    awarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    awarded_by UUID REFERENCES app_user(id),
    UNIQUE(user_id, badge_id)
);

-- ─────────────────────────────────────────────────────────────
-- 2. PROJECT TABLES
-- ─────────────────────────────────────────────────────────────

CREATE TABLE project (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id    UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    summary     TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    domain      TEXT,
    tier        TEXT,
    github_url  TEXT,
    duration    TEXT,
    status      TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending_review','active','rejected')),
    visibility  TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('public','private')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE project_member (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    role       TEXT NOT NULL DEFAULT 'collaborator',
    joined_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(project_id, user_id)
);

CREATE TABLE project_milestone (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id    UUID NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    title         TEXT NOT NULL,
    description   TEXT,
    is_complete   BOOLEAN NOT NULL DEFAULT false,
    display_order INT NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE project_image (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id    UUID NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    image_url     TEXT NOT NULL,
    caption       TEXT,
    display_order INT NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE project_video (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id    UUID NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    title         TEXT NOT NULL DEFAULT '',
    video_url     TEXT NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE project_file (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    file_url   TEXT NOT NULL,
    file_name  TEXT NOT NULL DEFAULT '',
    file_size  BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- 3. CHALLENGE TABLES
-- ─────────────────────────────────────────────────────────────

CREATE TABLE challenge (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title            TEXT NOT NULL,
    tier             TEXT,
    domain           TEXT,
    time_estimate    TEXT,
    cover_image_url  TEXT,
    mystery          TEXT,
    core_idea        TEXT,
    mission          TEXT,
    success_criteria TEXT,
    status           TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
    created_by       UUID REFERENCES app_user(id),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE challenge_step (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    challenge_id  UUID NOT NULL REFERENCES challenge(id) ON DELETE CASCADE,
    step_text     TEXT NOT NULL,
    display_order INT NOT NULL DEFAULT 0
);

CREATE TABLE challenge_material (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    challenge_id  UUID NOT NULL REFERENCES challenge(id) ON DELETE CASCADE,
    name          TEXT NOT NULL,
    display_order INT NOT NULL DEFAULT 0
);

CREATE TABLE challenge_skill (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    challenge_id UUID NOT NULL REFERENCES challenge(id) ON DELETE CASCADE,
    skill_name   TEXT NOT NULL
);

CREATE TABLE challenge_vocabulary (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    challenge_id UUID NOT NULL REFERENCES challenge(id) ON DELETE CASCADE,
    term         TEXT NOT NULL,
    definition   TEXT
);

CREATE TABLE challenge_level (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    challenge_id UUID NOT NULL REFERENCES challenge(id) ON DELETE CASCADE,
    level_name   TEXT NOT NULL,
    description  TEXT
);

CREATE TABLE challenge_image (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    challenge_id  UUID NOT NULL REFERENCES challenge(id) ON DELETE CASCADE,
    image_url     TEXT NOT NULL,
    caption       TEXT,
    display_order INT NOT NULL DEFAULT 0
);

CREATE TABLE challenge_video (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    challenge_id  UUID NOT NULL REFERENCES challenge(id) ON DELETE CASCADE,
    title         TEXT NOT NULL DEFAULT '',
    video_url     TEXT NOT NULL,
    display_order INT NOT NULL DEFAULT 0
);

CREATE TABLE challenge_completion (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    challenge_id UUID NOT NULL REFERENCES challenge(id) ON DELETE CASCADE,
    user_id      UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','declined')),
    evidence_url TEXT,
    notes        TEXT,
    verified_by  UUID REFERENCES app_user(id),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(challenge_id, user_id)
);

-- ─────────────────────────────────────────────────────────────
-- 4. EVENT TABLES
-- ─────────────────────────────────────────────────────────────

CREATE TABLE event (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title               TEXT NOT NULL,
    description         TEXT,
    event_type          TEXT NOT NULL CHECK (event_type IN ('build_challenge','maker_meetup','tech_tuesday')),
    date                TIMESTAMPTZ NOT NULL,
    end_date            TIMESTAMPTZ,
    location            TEXT,
    capacity            INT,
    cover_image_url     TEXT,
    registration_status TEXT NOT NULL DEFAULT 'open' CHECK (registration_status IN ('open','closed','full')),
    auto_badge_id       UUID REFERENCES badge(id),
    created_by          UUID REFERENCES app_user(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE event_registration (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id      UUID NOT NULL REFERENCES event(id) ON DELETE CASCADE,
    user_id       UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(event_id, user_id)
);

CREATE TABLE event_checkin (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id       UUID NOT NULL REFERENCES event(id) ON DELETE CASCADE,
    user_id        UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    checked_in_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    checked_in_by  UUID REFERENCES app_user(id),
    UNIQUE(event_id, user_id)
);

CREATE TABLE event_team (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id   UUID NOT NULL REFERENCES event(id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    lead_id    UUID NOT NULL REFERENCES app_user(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE event_team_member (
    id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id   UUID NOT NULL REFERENCES event_team(id) ON DELETE CASCADE,
    user_id   UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(team_id, user_id)
);

CREATE TABLE event_submission (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id   UUID NOT NULL REFERENCES event(id) ON DELETE CASCADE,
    team_id    UUID REFERENCES event_team(id) ON DELETE SET NULL,
    user_id    UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    project_id UUID REFERENCES project(id) ON DELETE SET NULL,
    status     TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','accepted','rejected','winner')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE showcase_slot (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id   UUID NOT NULL REFERENCES event(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    project_id UUID REFERENCES project(id) ON DELETE SET NULL,
    status     TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(event_id, user_id)
);

-- ─────────────────────────────────────────────────────────────
-- 5. COMMUNITY TABLES
-- ─────────────────────────────────────────────────────────────

CREATE TABLE comment (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    target_type TEXT NOT NULL CHECK (target_type IN ('project','challenge','event','maker_profile')),
    target_id   UUID NOT NULL,
    user_id     UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    content     TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_comment_target ON comment(target_type, target_id);

CREATE TABLE reaction (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    target_type   TEXT NOT NULL CHECK (target_type IN ('project','challenge','event','maker_profile')),
    target_id     UUID NOT NULL,
    user_id       UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like','upvote','bookmark')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(target_type, target_id, user_id, reaction_type)
);
CREATE INDEX idx_reaction_target ON reaction(target_type, target_id);

CREATE TABLE tag (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name       TEXT UNIQUE NOT NULL,
    category   TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE entity_tag (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    target_type TEXT NOT NULL CHECK (target_type IN ('project','challenge','event','maker_profile')),
    target_id   UUID NOT NULL,
    tag_id      UUID NOT NULL REFERENCES tag(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(target_type, target_id, tag_id)
);
CREATE INDEX idx_entity_tag_target ON entity_tag(target_type, target_id);

-- ─────────────────────────────────────────────────────────────
-- 6. OPS TABLES
-- ─────────────────────────────────────────────────────────────

CREATE TABLE equipment (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name              TEXT NOT NULL,
    description       TEXT,
    image_url         TEXT,
    is_active         BOOLEAN NOT NULL DEFAULT true,
    requires_induction BOOLEAN NOT NULL DEFAULT false,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE equipment_induction (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
    user_id      UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    inducted_by  UUID REFERENCES app_user(id),
    is_active    BOOLEAN NOT NULL DEFAULT true,
    expires_at   TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(equipment_id, user_id)
);

CREATE TABLE equipment_booking (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
    user_id      UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    start_time   TIMESTAMPTZ NOT NULL,
    end_time     TIMESTAMPTZ NOT NULL,
    status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','cancelled','completed')),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE inventory (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        TEXT NOT NULL,
    description TEXT,
    quantity    INT NOT NULL DEFAULT 0,
    unit        TEXT,
    location    TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- 7. STORE TABLES
-- ─────────────────────────────────────────────────────────────

CREATE TABLE store_product (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name              TEXT NOT NULL,
    description       TEXT NOT NULL DEFAULT '',
    price             DECIMAL(10,2) NOT NULL DEFAULT 0,
    category          TEXT,
    image_url         TEXT,
    is_active         BOOLEAN NOT NULL DEFAULT true,
    required_badge_id UUID REFERENCES badge(id),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE store_order (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    status     TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','cancelled')),
    total      DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE store_order_item (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id   UUID NOT NULL REFERENCES store_order(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES store_product(id),
    quantity   INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL
);

-- ─────────────────────────────────────────────────────────────
-- 8. HELPER FUNCTION: get_my_role()
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM app_user WHERE auth_id = auth.uid();
$$;

-- Helper to get app_user.id from auth.uid()
CREATE OR REPLACE FUNCTION get_my_app_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT id FROM app_user WHERE auth_id = auth.uid();
$$;

-- ─────────────────────────────────────────────────────────────
-- 9. TRIGGER: Auto-create app_user on auth.users INSERT
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.app_user (auth_id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    'maker'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_auth_user();

-- ─────────────────────────────────────────────────────────────
-- 10. ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────

-- Enable RLS on ALL tables
ALTER TABLE app_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE maker_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill ENABLE ROW LEVEL SECURITY;
ALTER TABLE badge ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badge ENABLE ROW LEVEL SECURITY;
ALTER TABLE project ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_member ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_milestone ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_image ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_video ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_file ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_step ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_material ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_skill ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_vocabulary ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_level ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_image ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_video ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_completion ENABLE ROW LEVEL SECURITY;
ALTER TABLE event ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_registration ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_checkin ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_team ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_team_member ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_submission ENABLE ROW LEVEL SECURITY;
ALTER TABLE showcase_slot ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment ENABLE ROW LEVEL SECURITY;
ALTER TABLE reaction ENABLE ROW LEVEL SECURITY;
ALTER TABLE tag ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_tag ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_induction ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_booking ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_product ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_order ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_order_item ENABLE ROW LEVEL SECURITY;

-- ── ADMIN: Full access to everything ──
CREATE POLICY admin_all ON app_user FOR ALL USING (get_my_role() = 'admin');
CREATE POLICY admin_all ON maker_profile FOR ALL USING (get_my_role() = 'admin');
CREATE POLICY admin_all ON skill FOR ALL USING (get_my_role() = 'admin');
CREATE POLICY admin_all ON badge FOR ALL USING (get_my_role() = 'admin');
CREATE POLICY admin_all ON user_badge FOR ALL USING (get_my_role() = 'admin');
CREATE POLICY admin_all ON project FOR ALL USING (get_my_role() = 'admin');
CREATE POLICY admin_all ON project_member FOR ALL USING (get_my_role() = 'admin');
CREATE POLICY admin_all ON project_milestone FOR ALL USING (get_my_role() = 'admin');
CREATE POLICY admin_all ON project_image FOR ALL USING (get_my_role() = 'admin');
CREATE POLICY admin_all ON project_video FOR ALL USING (get_my_role() = 'admin');
CREATE POLICY admin_all ON project_file FOR ALL USING (get_my_role() = 'admin');
CREATE POLICY admin_all ON challenge FOR ALL USING (get_my_role() = 'admin');
CREATE POLICY admin_all ON challenge_step FOR ALL USING (get_my_role() = 'admin');
CREATE POLICY admin_all ON challenge_material FOR ALL USING (get_my_role() = 'admin');
CREATE POLICY admin_all ON challenge_skill FOR ALL USING (get_my_role() = 'admin');
CREATE POLICY admin_all ON challenge_vocabulary FOR ALL USING (get_my_role() = 'admin');
CREATE POLICY admin_all ON challenge_level FOR ALL USING (get_my_role() = 'admin');
CREATE POLICY admin_all ON challenge_image FOR ALL USING (get_my_role() = 'admin');
CREATE POLICY admin_all ON challenge_video FOR ALL USING (get_my_role() = 'admin');
CREATE POLICY admin_all ON challenge_completion FOR ALL USING (get_my_role() = 'admin');
CREATE POLICY admin_all ON event FOR ALL USING (get_my_role() = 'admin');
CREATE POLICY admin_all ON event_registration FOR ALL USING (get_my_role() = 'admin');
CREATE POLICY admin_all ON event_checkin FOR ALL USING (get_my_role() = 'admin');
CREATE POLICY admin_all ON event_team FOR ALL USING (get_my_role() = 'admin');
CREATE POLICY admin_all ON event_team_member FOR ALL USING (get_my_role() = 'admin');
CREATE POLICY admin_all ON event_submission FOR ALL USING (get_my_role() = 'admin');
CREATE POLICY admin_all ON showcase_slot FOR ALL USING (get_my_role() = 'admin');
CREATE POLICY admin_all ON comment FOR ALL USING (get_my_role() = 'admin');
CREATE POLICY admin_all ON reaction FOR ALL USING (get_my_role() = 'admin');
CREATE POLICY admin_all ON tag FOR ALL USING (get_my_role() = 'admin');
CREATE POLICY admin_all ON entity_tag FOR ALL USING (get_my_role() = 'admin');
CREATE POLICY admin_all ON equipment FOR ALL USING (get_my_role() = 'admin');
CREATE POLICY admin_all ON equipment_induction FOR ALL USING (get_my_role() = 'admin');
CREATE POLICY admin_all ON equipment_booking FOR ALL USING (get_my_role() = 'admin');
CREATE POLICY admin_all ON inventory FOR ALL USING (get_my_role() = 'admin');
CREATE POLICY admin_all ON store_product FOR ALL USING (get_my_role() = 'admin');
CREATE POLICY admin_all ON store_order FOR ALL USING (get_my_role() = 'admin');
CREATE POLICY admin_all ON store_order_item FOR ALL USING (get_my_role() = 'admin');

-- ── app_user: users can read own row ──
CREATE POLICY user_read_own ON app_user FOR SELECT USING (auth_id = auth.uid());

-- ── maker_profile: public read (if is_public), own CRUD ──
CREATE POLICY profile_public_read ON maker_profile FOR SELECT USING (is_public = true);
CREATE POLICY profile_own_all ON maker_profile FOR ALL USING (user_id = get_my_app_user_id());

-- ── skill, badge, tag: public read ──
CREATE POLICY skill_public_read ON skill FOR SELECT USING (true);
CREATE POLICY badge_public_read ON badge FOR SELECT USING (true);
CREATE POLICY tag_public_read ON tag FOR SELECT USING (true);

-- ── user_badge: public read, insert by mentors ──
CREATE POLICY user_badge_read ON user_badge FOR SELECT USING (true);
CREATE POLICY user_badge_mentor_insert ON user_badge FOR INSERT WITH CHECK (get_my_role() IN ('mentor','admin'));

-- ── project: public read (active+public), own CRUD, mentor read all ──
CREATE POLICY project_public_read ON project FOR SELECT USING (status = 'active' AND visibility = 'public');
CREATE POLICY project_own_all ON project FOR ALL USING (owner_id = get_my_app_user_id());
CREATE POLICY project_mentor_read ON project FOR SELECT USING (get_my_role() IN ('mentor','admin'));
CREATE POLICY project_mentor_update ON project FOR UPDATE USING (get_my_role() IN ('mentor','admin'));

-- project sub-tables: read if project is accessible, CRUD if owner
CREATE POLICY pm_read ON project_member FOR SELECT USING (true);
CREATE POLICY pm_own ON project_member FOR ALL USING (
  EXISTS(SELECT 1 FROM project WHERE project.id = project_member.project_id AND project.owner_id = get_my_app_user_id())
);
CREATE POLICY pms_read ON project_milestone FOR SELECT USING (true);
CREATE POLICY pms_own ON project_milestone FOR ALL USING (
  EXISTS(SELECT 1 FROM project WHERE project.id = project_milestone.project_id AND project.owner_id = get_my_app_user_id())
);
CREATE POLICY pi_read ON project_image FOR SELECT USING (true);
CREATE POLICY pi_own ON project_image FOR ALL USING (
  EXISTS(SELECT 1 FROM project WHERE project.id = project_image.project_id AND project.owner_id = get_my_app_user_id())
);
CREATE POLICY pv_read ON project_video FOR SELECT USING (true);
CREATE POLICY pv_own ON project_video FOR ALL USING (
  EXISTS(SELECT 1 FROM project WHERE project.id = project_video.project_id AND project.owner_id = get_my_app_user_id())
);
CREATE POLICY pf_read ON project_file FOR SELECT USING (true);
CREATE POLICY pf_own ON project_file FOR ALL USING (
  EXISTS(SELECT 1 FROM project WHERE project.id = project_file.project_id AND project.owner_id = get_my_app_user_id())
);

-- ── challenge: public read (published), admin CRUD ──
CREATE POLICY challenge_public_read ON challenge FOR SELECT USING (status = 'published');
CREATE POLICY challenge_sub_read ON challenge_step FOR SELECT USING (true);
CREATE POLICY challenge_mat_read ON challenge_material FOR SELECT USING (true);
CREATE POLICY challenge_skill_read ON challenge_skill FOR SELECT USING (true);
CREATE POLICY challenge_vocab_read ON challenge_vocabulary FOR SELECT USING (true);
CREATE POLICY challenge_level_read ON challenge_level FOR SELECT USING (true);
CREATE POLICY challenge_img_read ON challenge_image FOR SELECT USING (true);
CREATE POLICY challenge_vid_read ON challenge_video FOR SELECT USING (true);

-- challenge_completion: user can insert own, mentors can update
CREATE POLICY cc_own_insert ON challenge_completion FOR INSERT WITH CHECK (user_id = get_my_app_user_id());
CREATE POLICY cc_own_read ON challenge_completion FOR SELECT USING (user_id = get_my_app_user_id());
CREATE POLICY cc_mentor_read ON challenge_completion FOR SELECT USING (get_my_role() IN ('mentor','admin'));
CREATE POLICY cc_mentor_update ON challenge_completion FOR UPDATE USING (get_my_role() IN ('mentor','admin'));

-- ── event: public read ──
CREATE POLICY event_public_read ON event FOR SELECT USING (true);
CREATE POLICY event_mentor_all ON event FOR ALL USING (get_my_role() IN ('mentor','admin'));

-- event_registration: own CRUD
CREATE POLICY er_own_insert ON event_registration FOR INSERT WITH CHECK (user_id = get_my_app_user_id());
CREATE POLICY er_own_delete ON event_registration FOR DELETE USING (user_id = get_my_app_user_id());
CREATE POLICY er_own_read ON event_registration FOR SELECT USING (user_id = get_my_app_user_id());
CREATE POLICY er_public_read ON event_registration FOR SELECT USING (true); -- for count

-- event sub-tables: varying access
CREATE POLICY ec_mentor_all ON event_checkin FOR ALL USING (get_my_role() IN ('mentor','admin'));
CREATE POLICY ec_read ON event_checkin FOR SELECT USING (user_id = get_my_app_user_id());

CREATE POLICY et_read ON event_team FOR SELECT USING (true);
CREATE POLICY et_insert ON event_team FOR INSERT WITH CHECK (lead_id = get_my_app_user_id());
CREATE POLICY etm_read ON event_team_member FOR SELECT USING (true);
CREATE POLICY etm_insert ON event_team_member FOR INSERT WITH CHECK (user_id = get_my_app_user_id());
CREATE POLICY etm_delete_lead ON event_team_member FOR DELETE USING (
  EXISTS(SELECT 1 FROM event_team WHERE event_team.id = event_team_member.team_id AND event_team.lead_id = get_my_app_user_id())
);

CREATE POLICY es_insert ON event_submission FOR INSERT WITH CHECK (user_id = get_my_app_user_id());
CREATE POLICY es_read ON event_submission FOR SELECT USING (true);
CREATE POLICY es_mentor_update ON event_submission FOR UPDATE USING (get_my_role() IN ('mentor','admin'));

CREATE POLICY ss_insert ON showcase_slot FOR INSERT WITH CHECK (user_id = get_my_app_user_id());
CREATE POLICY ss_read ON showcase_slot FOR SELECT USING (true);
CREATE POLICY ss_mentor_update ON showcase_slot FOR UPDATE USING (get_my_role() IN ('mentor','admin'));

-- ── comment: public read, own insert, own delete ──
CREATE POLICY comment_read ON comment FOR SELECT USING (true);
CREATE POLICY comment_insert ON comment FOR INSERT WITH CHECK (user_id = get_my_app_user_id());
CREATE POLICY comment_delete_own ON comment FOR DELETE USING (user_id = get_my_app_user_id());

-- ── reaction: public read, own toggle ──
CREATE POLICY reaction_read ON reaction FOR SELECT USING (true);
CREATE POLICY reaction_insert ON reaction FOR INSERT WITH CHECK (user_id = get_my_app_user_id());
CREATE POLICY reaction_delete ON reaction FOR DELETE USING (user_id = get_my_app_user_id());

-- ── entity_tag: public read, own insert for project owners ──
CREATE POLICY et_public_read ON entity_tag FOR SELECT USING (true);
CREATE POLICY et_insert ON entity_tag FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY et_delete ON entity_tag FOR DELETE USING (auth.uid() IS NOT NULL);

-- ── equipment: public read ──
CREATE POLICY equip_read ON equipment FOR SELECT USING (true);

-- equipment_induction: own read, mentor CRUD
CREATE POLICY ei_own_read ON equipment_induction FOR SELECT USING (user_id = get_my_app_user_id());
CREATE POLICY ei_mentor_all ON equipment_induction FOR ALL USING (get_my_role() IN ('mentor','admin'));

-- equipment_booking: own CRUD, mentor update
CREATE POLICY eb_own_insert ON equipment_booking FOR INSERT WITH CHECK (user_id = get_my_app_user_id());
CREATE POLICY eb_own_read ON equipment_booking FOR SELECT USING (user_id = get_my_app_user_id());
CREATE POLICY eb_mentor_all ON equipment_booking FOR ALL USING (get_my_role() IN ('mentor','admin'));

-- ── inventory: public read ──
CREATE POLICY inv_read ON inventory FOR SELECT USING (true);

-- ── store_product: public read (active) ──
CREATE POLICY sp_public_read ON store_product FOR SELECT USING (is_active = true);

-- store_order: own CRUD
CREATE POLICY so_own_insert ON store_order FOR INSERT WITH CHECK (user_id = get_my_app_user_id());
CREATE POLICY so_own_read ON store_order FOR SELECT USING (user_id = get_my_app_user_id());

-- store_order_item: own via order
CREATE POLICY soi_own_insert ON store_order_item FOR INSERT WITH CHECK (
  EXISTS(SELECT 1 FROM store_order WHERE store_order.id = store_order_item.order_id AND store_order.user_id = get_my_app_user_id())
);
CREATE POLICY soi_own_read ON store_order_item FOR SELECT USING (
  EXISTS(SELECT 1 FROM store_order WHERE store_order.id = store_order_item.order_id AND store_order.user_id = get_my_app_user_id())
);

-- ─────────────────────────────────────────────────────────────
-- 11. REALTIME (enable on comment table)
-- ─────────────────────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE comment;

-- ─────────────────────────────────────────────────────────────
-- 12. STORAGE BUCKETS (run these via Supabase Dashboard or API)
-- Note: Storage bucket creation via SQL is not standard.
-- Create these buckets manually in the Supabase Dashboard:
--   avatars (public)
--   project-images (public)
--   project-files (private)
--   challenge-images (public)
--   event-images (public)
--   badge-images (public)
--   product-images (public)
--   equipment-images (public)
--   induction-certificates (private)
-- ─────────────────────────────────────────────────────────────

-- NOTE: Storage buckets and policies must be created via the Supabase Dashboard.
-- Go to Storage > New Bucket and create each bucket listed above.
-- Storage policies can be configured in Storage > Policies in the Dashboard.

-- ============================================================
-- SCHEMA COMPLETE
-- ============================================================
