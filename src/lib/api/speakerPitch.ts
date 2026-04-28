/**
 * Speaker Pitch API — public-form submissions + admin triage (P11).
 *
 * Every public event page (and the dedicated /speak route) hosts a
 * "pitch yourself as a speaker for a future Param event" form. The
 * flow is intentionally NOT tied to a specific event — a pitcher may
 * not know which cadence they want. Submissions are triaged globally
 * at /admin/speakers.
 *
 * Access model (enforced by RLS in the migration):
 *   • Anyone can INSERT a new pitch (status must be 'new',
 *     reviewer_id/reviewer_note must be null on first write).
 *   • Only mentor/admin can SELECT, UPDATE, or DELETE.
 *
 * The form caps past_talk_links at 3 and topic_abstract at 5 blocks
 * client-side; the DB additionally caps past_talk_links at 10 so a
 * scripted POST can't flood the row.
 */

import { supabase } from '../supabase';
import type {
    SpeakerPitch,
    SpeakerPitchStatus,
    EventType,
    EventBlock,
} from '../database.types';

// ─── Reads (mentor/admin only — RLS enforces) ────────────────────

export interface PitchFilters {
    status?: SpeakerPitchStatus;
    preferred_event_type?: EventType;
}

/**
 * List pitches, newest first. Optional status / event-type filters
 * power the /admin/speakers triage view.
 */
export async function listPitches(filters: PitchFilters = {}) {
    let q = supabase
        .from('speaker_pitch')
        .select('*')
        .order('created_at', { ascending: false });
    if (filters.status) q = q.eq('status', filters.status);
    if (filters.preferred_event_type) q = q.eq('preferred_event_type', filters.preferred_event_type);
    return q;
}

export async function getPitch(id: string) {
    return supabase.from('speaker_pitch').select('*').eq('id', id).maybeSingle();
}

// ─── Writes ──────────────────────────────────────────────────────

export interface CreatePitchInput {
    name: string;
    email: string;
    topic_title: string;
    topic_abstract: EventBlock[];
    preferred_event_type: EventType;
    past_talk_links: string[];
    /** Optional — set when the submitter is signed in. */
    user_id?: string | null;
}

/**
 * Create a new pitch from the public form. The insert RLS policy
 * forces status='new' and reviewer_id/reviewer_note=NULL on first
 * write, so a malicious POST can't pre-accept itself.
 */
export async function createPitch(input: CreatePitchInput) {
    return supabase
        .from('speaker_pitch')
        .insert({
            user_id: input.user_id ?? null,
            name: input.name.trim(),
            email: input.email.trim(),
            topic_title: input.topic_title.trim(),
            topic_abstract: input.topic_abstract,
            preferred_event_type: input.preferred_event_type,
            past_talk_links: input.past_talk_links.map((u) => u.trim()).filter(Boolean),
            status: 'new',
            reviewer_id: null,
            reviewer_note: null,
        })
        .select('*')
        .single();
}

/**
 * Move a pitch through the triage workflow. Admin/mentor only.
 * `reviewerId` is stamped onto reviewer_id so the detail view can
 * show "last touched by".
 */
export async function updatePitchStatus(
    id: string,
    status: SpeakerPitchStatus,
    reviewerId: string | null,
) {
    return supabase
        .from('speaker_pitch')
        .update({ status, reviewer_id: reviewerId })
        .eq('id', id)
        .select('*')
        .single();
}

/** Save the triage note without changing status. */
export async function updatePitchNote(
    id: string,
    reviewerNote: string | null,
    reviewerId: string | null,
) {
    return supabase
        .from('speaker_pitch')
        .update({ reviewer_note: reviewerNote, reviewer_id: reviewerId })
        .eq('id', id)
        .select('*')
        .single();
}

export async function deletePitch(id: string) {
    return supabase.from('speaker_pitch').delete().eq('id', id);
}

// ─── Helpers ─────────────────────────────────────────────────────

/**
 * Map a SpeakerPitch row to URL params for the prefilled wizard
 * launched by the Accept action. The wizard reads these via
 * ?topic=&speaker=&pitch= (the third param lets the wizard mark the
 * pitch accepted once the event is published, though that wiring
 * lives in the /admin/speakers detail page).
 */
export function acceptPitchWizardHref(pitch: SpeakerPitch): string {
    const slugByType: Record<EventType, string> = {
        build_challenge: 'build-challenge',
        maker_meetup: 'maker-meetup',
        tech_tuesday: 'tech-tuesday',
    };
    const slug = slugByType[pitch.preferred_event_type];
    const params = new URLSearchParams({
        topic: pitch.topic_title,
        speaker: pitch.name,
        pitch: pitch.id,
    });
    return `/admin/events/new/${slug}?${params.toString()}`;
}
