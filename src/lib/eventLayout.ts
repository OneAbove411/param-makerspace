// ════════════════════════════════════════════════════════════════
// EVENT LAYOUT — Block-based canvas for event detail pages
// ════════════════════════════════════════════════════════════════
//
// Mentors/admins compose an event page as an ordered list of
// typed blocks. Each block has a stable id, a type, and a data
// payload. The renderer (see src/components/event/EventLayoutEditor)
// switches on `type` and delegates to the appropriate component.
//
// Storage:
//   1. Primary: `event.layout` JSONB column (see
//      supabase-migration-event-layout.sql).
//   2. Fallback: localStorage keyed by event id — used when the
//      Supabase update fails (e.g. migration not yet applied) so
//      the editor still works day-one.
//
// ════════════════════════════════════════════════════════════════

import { supabase } from './supabase';

export type BlockType =
    | 'heading'
    | 'richtext'
    | 'image'
    | 'video'
    | 'registration'
    | 'schedule';

export interface BlockBase<T extends BlockType, D> {
    id: string;
    type: T;
    data: D;
}

export type HeadingBlock = BlockBase<'heading', {
    text: string;
    level: 1 | 2 | 3;
    eyebrow?: string;
}>;

export type RichTextBlock = BlockBase<'richtext', {
    body: string;
}>;

export type ImageBlock = BlockBase<'image', {
    url: string;
    caption?: string;
    alt?: string;
}>;

export type VideoBlock = BlockBase<'video', {
    url: string;        // YouTube / Vimeo / direct mp4
    caption?: string;
}>;

export type RegistrationBlock = BlockBase<'registration', {
    headline?: string;
    subtext?: string;
}>;

export interface ScheduleItem {
    id: string;
    time: string;       // free text, e.g. "10:00 AM" or "Day 1 · 10am"
    title: string;
    detail?: string;
}

export type ScheduleBlock = BlockBase<'schedule', {
    title?: string;
    items: ScheduleItem[];
}>;

export type AnyBlock =
    | HeadingBlock
    | RichTextBlock
    | ImageBlock
    | VideoBlock
    | RegistrationBlock
    | ScheduleBlock;

export type EventLayout = AnyBlock[];

// ── ID helpers ───────────────────────────────────────────────

export function nextId(prefix = 'b'): string {
    return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;
}

// ── Default layout synthesis ────────────────────────────────
// When `event.layout` is null, we generate a sensible default
// from existing fields so the page has content on day one.

export function synthesiseDefaultLayout(event: any): EventLayout {
    const layout: EventLayout = [];

    // About heading + description
    const aboutText = (event?.description || '').split('---RECAP---')[0]?.trim();
    if (aboutText) {
        layout.push({
            id: nextId('h'),
            type: 'heading',
            data: { level: 2, text: 'About this event', eyebrow: 'Overview' },
        });
        layout.push({
            id: nextId('r'),
            type: 'richtext',
            data: { body: aboutText },
        });
    }

    // Registration card — always near the top
    layout.push({
        id: nextId('reg'),
        type: 'registration',
        data: {
            headline: 'Save your spot',
            subtext: 'Registration is handled below. You will get email confirmation.',
        },
    });

    return layout;
}

// ── Validation / normalisation ──────────────────────────────
// Defensive: accept anything, return only well-formed blocks.

const VALID_TYPES: BlockType[] = ['heading', 'richtext', 'image', 'video', 'registration', 'schedule'];

export function normaliseLayout(raw: unknown): EventLayout | null {
    if (!Array.isArray(raw)) return null;
    const out: EventLayout = [];
    for (const block of raw) {
        if (!block || typeof block !== 'object') continue;
        const b: any = block;
        if (!VALID_TYPES.includes(b.type)) continue;
        if (typeof b.id !== 'string' || !b.id) b.id = nextId(b.type.slice(0, 3));
        if (!b.data || typeof b.data !== 'object') b.data = {};
        out.push(b as AnyBlock);
    }
    return out;
}

// ── Block factories (for "Add block" palette) ────────────────

export function makeBlock(type: BlockType): AnyBlock {
    switch (type) {
        case 'heading':
            return { id: nextId('h'), type: 'heading', data: { level: 2, text: 'New heading' } };
        case 'richtext':
            return { id: nextId('r'), type: 'richtext', data: { body: 'Write something here…' } };
        case 'image':
            return { id: nextId('img'), type: 'image', data: { url: '', alt: '' } };
        case 'video':
            return { id: nextId('vid'), type: 'video', data: { url: '' } };
        case 'registration':
            return {
                id: nextId('reg'),
                type: 'registration',
                data: { headline: 'Save your spot', subtext: '' },
            };
        case 'schedule':
            return {
                id: nextId('sch'),
                type: 'schedule',
                data: {
                    title: 'Schedule',
                    items: [
                        { id: nextId('si'), time: '10:00 AM', title: 'Kickoff', detail: '' },
                        { id: nextId('si'), time: '11:00 AM', title: 'Build session', detail: '' },
                    ],
                },
            };
    }
}

// ── Persistence ─────────────────────────────────────────────

const STORAGE_PREFIX = 'param:eventLayout:';

function storageKey(eventId: string) {
    return `${STORAGE_PREFIX}${eventId}`;
}

/** Load layout: DB column first, localStorage fallback, synthesised default last. */
export function loadLayout(event: any): EventLayout {
    // DB (primary)
    const fromDb = normaliseLayout(event?.layout);
    if (fromDb && fromDb.length) return fromDb;

    // localStorage (fallback — only matters until migration is applied)
    try {
        if (event?.id && typeof window !== 'undefined') {
            const raw = window.localStorage.getItem(storageKey(event.id));
            if (raw) {
                const parsed = normaliseLayout(JSON.parse(raw));
                if (parsed && parsed.length) return parsed;
            }
        }
    } catch {
        // ignore JSON / storage errors
    }

    return synthesiseDefaultLayout(event);
}

/** Save layout: try Supabase first, always mirror to localStorage. */
export async function saveLayout(eventId: string, layout: EventLayout): Promise<{ ok: boolean; persisted: 'db' | 'local'; error?: string }> {
    // Mirror locally first so at least the editor survives a refresh.
    try {
        if (typeof window !== 'undefined') {
            window.localStorage.setItem(storageKey(eventId), JSON.stringify(layout));
        }
    } catch {
        // non-fatal
    }

    // Attempt DB write. If the `layout` column doesn't exist yet
    // (migration not applied), Supabase returns a 400 — fall back
    // to local-only persistence and surface that to the caller.
    try {
        const { error } = await supabase
            .from('event')
            .update({ layout } as any)
            .eq('id', eventId);

        if (error) {
            return { ok: true, persisted: 'local', error: error.message };
        }
        return { ok: true, persisted: 'db' };
    } catch (e: any) {
        return { ok: true, persisted: 'local', error: e?.message || String(e) };
    }
}
