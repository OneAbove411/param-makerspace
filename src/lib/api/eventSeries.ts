/**
 * Event Series API — recurring-event templates (P10).
 *
 * A series captures the "shape" of a recurring event (default location,
 * duration, capacity, cover image). The "New Tech Tuesday" fast-create
 * and "Duplicate last Tuesday" flows read from here to prefill the
 * wizard / draft event record.
 *
 * Today only Tech Tuesdays exercise this primitive; Build Challenges
 * and Maker Meetups never set series_id. The table is intentionally
 * event-type-agnostic so future recurring series (e.g. a monthly BC)
 * can reuse it without migration.
 */

import { supabase } from '../supabase';
import type { EventSeries, EventType } from '../database.types';

// ─── Reads ──────────────────────────────────────────────────────

export async function listSeries(eventType?: EventType) {
    let q = supabase.from('event_series').select('*').order('created_at', { ascending: false });
    if (eventType) q = q.eq('event_type', eventType);
    return q;
}

export async function getSeries(id: string) {
    return supabase.from('event_series').select('*').eq('id', id).maybeSingle();
}

/**
 * Return the default Tech Tuesday series (the oldest one) or null.
 *
 * The "New Tech Tuesday" button uses this to know which series to
 * pin the draft to. If no series exists yet, the action surfaces a
 * redirect to /admin/series so the admin creates one first.
 */
export async function fetchDefaultTTSeries(): Promise<EventSeries | null> {
    const { data, error } = await supabase
        .from('event_series')
        .select('*')
        .eq('event_type', 'tech_tuesday')
        .order('created_at', { ascending: true })
        .limit(1);
    if (error) return null;
    const rows = (data ?? []) as EventSeries[];
    return rows[0] ?? null;
}

// ─── Writes ─────────────────────────────────────────────────────

export async function createSeries(data: {
    event_type: EventType;
    title_template: string;
    default_location?: string | null;
    default_duration_min?: number | null;
    default_capacity?: number | null;
    default_cover_image_url?: string | null;
    owner_id?: string | null;
}) {
    return supabase
        .from('event_series')
        .insert({
            event_type: data.event_type,
            title_template: data.title_template,
            default_location: data.default_location ?? null,
            default_duration_min: data.default_duration_min ?? null,
            default_capacity: data.default_capacity ?? null,
            default_cover_image_url: data.default_cover_image_url ?? null,
            owner_id: data.owner_id ?? null,
        })
        .select('*')
        .single();
}

export async function updateSeries(
    id: string,
    patch: Partial<Pick<
        EventSeries,
        | 'title_template'
        | 'default_location'
        | 'default_duration_min'
        | 'default_capacity'
        | 'default_cover_image_url'
        | 'owner_id'
    >>,
) {
    return supabase.from('event_series').update(patch).eq('id', id);
}

export async function deleteSeries(id: string) {
    return supabase.from('event_series').delete().eq('id', id);
}

// ─── Helpers ────────────────────────────────────────────────────

/**
 * Compute the next Tuesday at 18:30 local time as an ISO timestamp.
 * Used by the "New Tech Tuesday" fast-create.
 *
 * Rule: if today is Tuesday and it's still before 18:30, "next Tuesday"
 * means *today*. Otherwise step forward to the following Tuesday.
 */
export function nextTuesdayAt1830(now: Date = new Date()): string {
    const TUESDAY = 2;
    const target = new Date(now);
    target.setHours(18, 30, 0, 0);
    const daysAhead = (TUESDAY - now.getDay() + 7) % 7;
    if (daysAhead === 0 && now.getTime() >= target.getTime()) {
        // It's Tuesday but past 18:30 — skip to next week.
        target.setDate(target.getDate() + 7);
    } else {
        target.setDate(target.getDate() + daysAhead);
    }
    return target.toISOString();
}

/**
 * Fetch the most recent past Tech Tuesday event, for the "Duplicate
 * last Tuesday" action on /admin/events. Returns null if none.
 */
export async function fetchMostRecentTechTuesday() {
    const { data, error } = await supabase
        .from('event')
        .select('*')
        .eq('event_type', 'tech_tuesday')
        .order('date', { ascending: false })
        .limit(1);
    if (error) return null;
    const rows = (data ?? []) as { id: string }[];
    return rows[0] ?? null;
}
