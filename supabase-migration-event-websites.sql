-- ============================================================
-- MIGRATION: Event Website Showcase Feature
-- Adds event_website table for participants to upload
-- HTML/CSS websites that are displayed inside event pages.
-- ============================================================

-- New table: stores uploaded website submissions per event
CREATE TABLE event_website (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id        UUID NOT NULL REFERENCES event(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    title           TEXT NOT NULL DEFAULT '',
    description     TEXT,
    -- Stores the full HTML content (single-file approach for lightweight rendering)
    html_content    TEXT,
    -- OR stores a URL to a ZIP/HTML file in Supabase Storage
    file_url        TEXT,
    -- Thumbnail screenshot URL (auto-generated or uploaded)
    thumbnail_url   TEXT,
    -- Multiple hosts/creators for this website (stored as JSON array of names)
    host_names      TEXT[] NOT NULL DEFAULT '{}',
    -- Approval workflow
    status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
    reviewed_by     UUID REFERENCES app_user(id),
    reviewed_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(event_id, user_id)
);

-- Enable RLS
ALTER TABLE event_website ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY admin_all ON event_website FOR ALL USING (get_my_role() = 'admin');

-- Mentor full access (for review)
CREATE POLICY ew_mentor_all ON event_website FOR ALL USING (get_my_role() IN ('mentor','admin'));

-- Public can read approved websites
CREATE POLICY ew_public_read ON event_website FOR SELECT USING (status = 'approved');

-- User can read their own (any status)
CREATE POLICY ew_own_read ON event_website FOR SELECT USING (user_id = get_my_app_user_id());

-- Registered users can insert their own
CREATE POLICY ew_own_insert ON event_website FOR INSERT WITH CHECK (user_id = get_my_app_user_id());

-- Users can update their own (before approval)
CREATE POLICY ew_own_update ON event_website FOR UPDATE USING (
    user_id = get_my_app_user_id() AND status = 'pending'
);

-- Users can delete their own
CREATE POLICY ew_own_delete ON event_website FOR DELETE USING (user_id = get_my_app_user_id());

-- Index for fast lookups
CREATE INDEX idx_event_website_event ON event_website(event_id);
CREATE INDEX idx_event_website_status ON event_website(event_id, status);

-- ============================================================
-- STORAGE BUCKET (create manually in Supabase Dashboard):
--   event-websites (public)
-- ============================================================
