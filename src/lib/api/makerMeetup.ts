/**
 * Maker Meetup API — applications (reused), interview slots, selection notes.
 *
 * This module wraps the Prompt 9 tables and a handful of cross-cutting
 * actions (batch create slots, book slot, publish selection). Applications
 * share the event_application table with Build Challenge but use the
 * single-applicant convention (team_member_user_ids = [], pitch = "why
 * you want to join", past_work_links populated).
 */

import { supabase } from '../supabase';
import type {
    EventApplication,
    EventInterviewSlot,
    EventSelectionNote,
    PastWorkLink,
} from '../database.types';

// ─── Applications (MM-flavored) ─────────────────────────────────

/**
 * Create a meetup application. The shape is the same as BC's
 * insertApplication but with `past_work_links` and a forced-empty
 * `team_member_user_ids`. Callers don't need to pass team_member_user_ids.
 */
export async function insertMeetupApplication(data: {
    event_id: string;
    user_id: string;
    applicant_display_name: string;
    pitch: string;
    past_work_links: PastWorkLink[];
}) {
    return supabase
        .from('event_application')
        .insert({
            event_id: data.event_id,
            user_id: data.user_id,
            team_name: data.applicant_display_name,
            team_member_user_ids: [],
            pitch: data.pitch,
            past_work_links: data.past_work_links,
            status: 'pending',
        })
        .select('*')
        .single();
}

export async function updateMeetupApplication(
    id: string,
    updates: {
        applicant_display_name?: string;
        pitch?: string;
        past_work_links?: PastWorkLink[];
        status?: EventApplication['status'];
    },
) {
    const payload: Record<string, unknown> = {};
    if (updates.applicant_display_name !== undefined) payload.team_name = updates.applicant_display_name;
    if (updates.pitch !== undefined) payload.pitch = updates.pitch;
    if (updates.past_work_links !== undefined) payload.past_work_links = updates.past_work_links;
    if (updates.status !== undefined) payload.status = updates.status;
    return supabase.from('event_application').update(payload).eq('id', id);
}

// ─── Interview slots ────────────────────────────────────────────

export async function fetchSlotsForEvent(eventId: string) {
    return supabase
        .from('event_interview_slot')
        .select('*')
        .eq('event_id', eventId)
        .order('start_at', { ascending: true });
}

export async function fetchMyBookedSlotForEvent(eventId: string, applicationId: string) {
    return supabase
        .from('event_interview_slot')
        .select('*')
        .eq('event_id', eventId)
        .eq('application_id', applicationId)
        .maybeSingle();
}

/**
 * Batch-create interview slots. The admin picks a start datetime, a
 * slot length (minutes), a count, and a mentor. We produce N adjacent
 * slots starting at `firstStartAt`.
 */
export async function createSlotsBatch(data: {
    event_id: string;
    mentor_user_id: string;
    first_start_at: Date;
    slot_length_min: number;
    count: number;
}) {
    const rows: Array<{
        event_id: string;
        start_at: string;
        end_at: string;
        mentor_user_id: string;
        status: 'open';
    }> = [];
    const ms = data.slot_length_min * 60 * 1000;
    for (let i = 0; i < data.count; i++) {
        const s = new Date(data.first_start_at.getTime() + i * ms);
        const e = new Date(s.getTime() + ms);
        rows.push({
            event_id: data.event_id,
            start_at: s.toISOString(),
            end_at: e.toISOString(),
            mentor_user_id: data.mentor_user_id,
            status: 'open',
        });
    }
    return supabase.from('event_interview_slot').insert(rows).select('*');
}

/**
 * Book an open slot — transition status open → booked and attach
 * application_id. The partial unique index
 * (event_id, application_id) WHERE status='booked' is the real
 * concurrency guard; a losing race returns a PostgREST 23505 error.
 *
 * We guard on the server side by filtering status='open' in the
 * UPDATE so we don't accidentally steal a 'booked' row.
 */
export async function bookSlot(slotId: string, applicationId: string) {
    return supabase
        .from('event_interview_slot')
        .update({ status: 'booked', application_id: applicationId })
        .eq('id', slotId)
        .eq('status', 'open')
        .select('*')
        .maybeSingle();
}

/** Admin flips a booked slot's outcome. */
export async function markSlotOutcome(slotId: string, outcome: 'done' | 'no_show') {
    return supabase
        .from('event_interview_slot')
        .update({ status: outcome })
        .eq('id', slotId);
}

/**
 * Admin releases a booked slot back to 'open' (e.g. when rejecting
 * the applicant) and clears application_id. If the slot wasn't
 * booked this is a no-op.
 */
export async function releaseSlotForApplication(applicationId: string) {
    return supabase
        .from('event_interview_slot')
        .update({ status: 'open', application_id: null })
        .eq('application_id', applicationId)
        .eq('status', 'booked');
}

export async function deleteSlot(slotId: string) {
    return supabase.from('event_interview_slot').delete().eq('id', slotId);
}

// ─── Selection notes (admin-only) ───────────────────────────────

export async function fetchNotesForApplications(applicationIds: string[]) {
    if (applicationIds.length === 0) return { data: [] as EventSelectionNote[], error: null };
    return supabase
        .from('event_selection_note')
        .select('*')
        .in('application_id', applicationIds);
}

export async function upsertSelectionNote(data: {
    application_id: string;
    author_id: string;
    body: string;
}) {
    return supabase
        .from('event_selection_note')
        .upsert(data, { onConflict: 'application_id,author_id' })
        .select('*')
        .single();
}

export async function deleteSelectionNote(applicationId: string, authorId: string) {
    return supabase
        .from('event_selection_note')
        .delete()
        .eq('application_id', applicationId)
        .eq('author_id', authorId);
}

// ─── Selection publish ──────────────────────────────────────────

export async function publishSelection(eventId: string) {
    return supabase
        .from('event')
        .update({ selection_published_at: new Date().toISOString() })
        .eq('id', eventId);
}

export async function unpublishSelection(eventId: string) {
    return supabase
        .from('event')
        .update({ selection_published_at: null })
        .eq('id', eventId);
}

// ─── User lookup for mentor picker ──────────────────────────────

/**
 * Fetch mentors/admins as candidates for interview slot generation.
 * Ordered by name for a stable dropdown.
 */
export async function fetchMentorCandidates() {
    return supabase
        .from('app_user')
        .select('id, name, email, role')
        .in('role', ['mentor', 'admin'])
        .order('name', { ascending: true });
}
