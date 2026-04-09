-- ============================================================
-- MIGRATION: Event Host table
-- Associates mentor users with events they are hosting.
-- Referenced by useEventHosts() in src/lib/hooks.ts.
-- ============================================================

CREATE TABLE IF NOT EXISTS event_host (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id   UUID NOT NULL REFERENCES event(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_host_event ON event_host(event_id);
CREATE INDEX IF NOT EXISTS idx_event_host_user ON event_host(user_id);

ALTER TABLE event_host ENABLE ROW LEVEL SECURITY;

-- Anyone can read the hosts list (public info shown on the event page)
CREATE POLICY eh_public_read ON event_host FOR SELECT USING (true);

-- Admins have full access
CREATE POLICY eh_admin_all ON event_host FOR ALL USING (get_my_role() = 'admin');

-- Mentors can add/remove themselves as hosts on events
CREATE POLICY eh_mentor_insert ON event_host FOR INSERT WITH CHECK (
    get_my_role() IN ('mentor','admin')
);
CREATE POLICY eh_mentor_delete ON event_host FOR DELETE USING (
    get_my_role() IN ('mentor','admin')
);
