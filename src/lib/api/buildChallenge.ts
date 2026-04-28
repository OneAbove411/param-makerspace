/**
 * Build Challenge API — applications, submissions, winners, notes.
 *
 * This module wraps the four P8 tables and a handful of cross-cutting
 * actions (bulk shortlist, publish winners, lock-at-deadline). All
 * functions return the raw Supabase result — callers decide how to
 * surface errors.
 */

import { supabase } from '../supabase';
import type {
    EventApplication,
    EventApplicationStatus,
    EventBlock,
    EventSubmission,
    EventSubmissionNote,
    EventWinner,
} from '../database.types';

// ─── Applications ────────────────────────────────────────────────

export async function fetchApplicationsForEvent(eventId: string) {
    return supabase
        .from('event_application')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true });
}

export async function fetchMyApplicationForEvent(eventId: string, userId: string) {
    return supabase
        .from('event_application')
        .select('*')
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .maybeSingle();
}

export async function fetchApplicationsWhereMemberOf(eventId: string, userId: string) {
    // The captain row is covered by fetchMyApplicationForEvent; this
    // returns applications where the caller is in team_member_user_ids.
    return supabase
        .from('event_application')
        .select('*')
        .eq('event_id', eventId)
        .contains('team_member_user_ids', [userId]);
}

export async function insertApplication(data: {
    event_id: string;
    user_id: string;
    team_name: string;
    team_member_user_ids: string[];
    pitch: string;
}) {
    return supabase
        .from('event_application')
        .insert({ ...data, status: 'pending' as EventApplicationStatus })
        .select('*')
        .single();
}

export async function updateApplication(id: string, updates: Partial<EventApplication>) {
    return supabase.from('event_application').update(updates).eq('id', id);
}

export async function bulkSetApplicationStatus(ids: string[], status: EventApplicationStatus) {
    if (ids.length === 0) return { error: null };
    return supabase.from('event_application').update({ status }).in('id', ids);
}

// ─── Submissions ─────────────────────────────────────────────────

export async function fetchSubmissionsForEvent(eventId: string) {
    return supabase
        .from('event_submission')
        .select('*')
        .eq('event_id', eventId)
        .order('submitted_at', { ascending: true });
}

export async function fetchMySubmissionForApplication(applicationId: string) {
    return supabase
        .from('event_submission')
        .select('*')
        .eq('application_id', applicationId)
        .maybeSingle();
}

export async function insertSubmission(data: {
    event_id: string;
    user_id: string;
    application_id: string;
    title: string;
    repo_url: string;
    demo_url: string;
    description_blocks: EventBlock[];
}) {
    return supabase
        .from('event_submission')
        .insert({
            event_id: data.event_id,
            user_id: data.user_id,
            application_id: data.application_id,
            title: data.title,
            repo_url: data.repo_url,
            demo_url: data.demo_url,
            description_blocks: data.description_blocks,
            submitted_at: new Date().toISOString(),
            status: 'submitted',
        })
        .select('*')
        .single();
}

export async function updateSubmission(id: string, updates: Partial<EventSubmission>) {
    // We deliberately strip locked_at / submitted_at from caller-provided
    // updates — those are server-managed fields.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { locked_at, submitted_at, ...safe } = updates as Record<string, unknown>;
    return supabase.from('event_submission').update(safe).eq('id', id);
}

/**
 * Lock all unlocked submissions for an event. Called by the admin
 * tools (or a future scheduled job) at submission_deadline. After
 * this runs, the team-side UPDATE policy denies further edits.
 */
export async function lockSubmissionsForEvent(eventId: string) {
    return supabase
        .from('event_submission')
        .update({ locked_at: new Date().toISOString() })
        .eq('event_id', eventId)
        .is('locked_at', null);
}

// ─── Submission notes (admin only) ──────────────────────────────

export async function fetchNotesForSubmissions(submissionIds: string[]) {
    if (submissionIds.length === 0) {
        return { data: [] as EventSubmissionNote[], error: null };
    }
    return supabase
        .from('event_submission_note')
        .select('*')
        .in('submission_id', submissionIds);
}

export async function upsertSubmissionNote(data: {
    submission_id: string;
    author_id: string;
    body: string;
}) {
    return supabase
        .from('event_submission_note')
        .upsert(data, { onConflict: 'submission_id,author_id' })
        .select('*')
        .single();
}

export async function deleteSubmissionNote(id: string) {
    return supabase.from('event_submission_note').delete().eq('id', id);
}

// ─── Winners ─────────────────────────────────────────────────────

export async function fetchWinnersForEvent(eventId: string) {
    return supabase
        .from('event_winner')
        .select('*')
        .eq('event_id', eventId)
        .order('rank', { ascending: true });
}

/**
 * Replace the winners list for an event. We wipe the previous set
 * and insert the new one inside a single round-trip pair so the
 * admin can edit freely without worrying about stale rows.
 */
export async function replaceWinners(
    eventId: string,
    entries: { submission_id: string; rank: number; prize_label: string; citation: string }[],
) {
    const { error: delErr } = await supabase.from('event_winner').delete().eq('event_id', eventId);
    if (delErr) return { error: delErr };
    if (entries.length === 0) return { error: null };
    const rows = entries.map((e) => ({ ...e, event_id: eventId }));
    const { error: insErr } = await supabase.from('event_winner').insert(rows);
    return { error: insErr };
}

export async function publishWinners(eventId: string) {
    return supabase
        .from('event')
        .update({ winners_published_at: new Date().toISOString() })
        .eq('id', eventId);
}

export async function unpublishWinners(eventId: string) {
    return supabase
        .from('event')
        .update({ winners_published_at: null })
        .eq('id', eventId);
}

// ─── User search (for team tagging) ──────────────────────────────

/**
 * Look up users by name or email for the application form's team
 * picker. Limited to 10 results; results exclude the caller (they are
 * already the captain).
 */
export async function searchUsersForTeamPicker(query: string, excludeUserId: string) {
    const q = query.trim();
    if (q.length < 2) return { data: [], error: null };
    return supabase
        .from('app_user')
        .select('id, name, email, role')
        .or(`name.ilike.%${q}%,email.ilike.%${q}%`)
        .neq('id', excludeUserId)
        .eq('is_active', true)
        .limit(10);
}

export async function fetchUsersByIds(ids: string[]) {
    if (ids.length === 0) return { data: [], error: null };
    return supabase.from('app_user').select('id, name, email, role').in('id', ids);
}
