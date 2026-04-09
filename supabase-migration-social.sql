-- Step 6: social layer — BOM, Makes, pin comments, merge requests
-- Run manually via Supabase SQL editor.

-- 1. Bill of Materials
CREATE TABLE IF NOT EXISTS project_bom_line (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id    UUID NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    reference     TEXT NOT NULL DEFAULT '',
    part          TEXT NOT NULL,
    quantity      INT NOT NULL DEFAULT 1,
    source_url    TEXT,
    cost_cents    INT,
    notes         TEXT,
    display_order INT NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS project_bom_line_project_idx ON project_bom_line(project_id);

ALTER TABLE project
  ADD COLUMN IF NOT EXISTS is_hardware BOOLEAN NOT NULL DEFAULT false;

-- 2. Makes — user-built copies with a required parent project link
CREATE TABLE IF NOT EXISTS project_make (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id    UUID NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    user_id       UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    image_url     TEXT,
    caption       TEXT NOT NULL DEFAULT '',
    build_notes   TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS project_make_project_idx ON project_make(project_id);

-- 3. Contextual pin comments
CREATE TABLE IF NOT EXISTS project_comment_pin (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id    UUID NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    target_type   TEXT NOT NULL CHECK (target_type IN ('image','log','bom_row')),
    target_id     TEXT NOT NULL,
    x_pct         NUMERIC,
    y_pct         NUMERIC,
    comment_id    UUID REFERENCES comment(id) ON DELETE CASCADE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS project_comment_pin_target_idx ON project_comment_pin(project_id, target_type, target_id);

-- 4. Merge requests (Pull Request for Makers)
CREATE TABLE IF NOT EXISTS project_merge_request (
    id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_project_id  UUID NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    target_project_id  UUID NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    submitter_id       UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    title              TEXT NOT NULL,
    body               TEXT,
    status             TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','accepted','rejected','withdrawn')),
    diff_snapshot      JSONB,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at        TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS pmr_target_idx ON project_merge_request(target_project_id);

-- 5. RLS — public read, owner/member write (follows existing pattern)
ALTER TABLE project_bom_line        ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_make            ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_comment_pin     ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_merge_request   ENABLE ROW LEVEL SECURITY;

CREATE POLICY bom_read ON project_bom_line FOR SELECT USING (true);
CREATE POLICY bom_own  ON project_bom_line FOR ALL USING (
  EXISTS(SELECT 1 FROM project WHERE project.id = project_bom_line.project_id AND project.owner_id = get_my_app_user_id())
);

CREATE POLICY make_read ON project_make FOR SELECT USING (true);
CREATE POLICY make_own  ON project_make FOR ALL USING (user_id = get_my_app_user_id());

CREATE POLICY pin_read ON project_comment_pin FOR SELECT USING (true);
CREATE POLICY pin_own  ON project_comment_pin FOR ALL USING (
  EXISTS(SELECT 1 FROM comment c WHERE c.id = project_comment_pin.comment_id AND c.user_id = get_my_app_user_id())
);

CREATE POLICY pmr_read ON project_merge_request FOR SELECT USING (true);
CREATE POLICY pmr_own  ON project_merge_request FOR ALL USING (
  submitter_id = get_my_app_user_id()
  OR EXISTS(SELECT 1 FROM project WHERE project.id = project_merge_request.target_project_id AND project.owner_id = get_my_app_user_id())
);
