-- ============================================================
-- MIGRATION: Event Layout (Block-based Mentor Canvas)
-- Replaces the HTML website upload workflow with a block-stack
-- editor. The `layout` column stores an ordered JSON array of
-- typed blocks that the event detail page renders in sequence.
--
-- Block schema (TypeScript, see src/lib/eventLayout.ts):
--   { id: string, type: 'heading' | 'richtext' | 'image' | 'video'
--                       | 'registration' | 'schedule',
--     data: Record<string, any> }
--
-- Safe to run multiple times (IF NOT EXISTS guards).
-- If `layout` is NULL the client synthesises a default layout
-- from existing fields (description, cover image, registration).
-- ============================================================

ALTER TABLE event
    ADD COLUMN IF NOT EXISTS layout JSONB;

COMMENT ON COLUMN event.layout IS
    'Ordered array of typed content blocks for the event detail page. '
    'NULL means the client should synthesise a default layout from '
    'description, cover image, and registration fields.';
