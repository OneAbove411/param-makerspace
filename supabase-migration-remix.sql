-- Step 5: Remix column and family tree support
-- Run manually via Supabase SQL editor.

ALTER TABLE project
  ADD COLUMN IF NOT EXISTS remixed_from_id UUID REFERENCES project(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS project_remixed_from_idx ON project(remixed_from_id) WHERE remixed_from_id IS NOT NULL;

COMMENT ON COLUMN project.remixed_from_id IS 'If this project is a remix, points to the origin project. Null for original projects.';
