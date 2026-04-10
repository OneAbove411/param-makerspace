/**
 * Event API — raw Supabase queries.
 */

import { supabase } from '../supabase';
import type { Event, EventType } from '../database.types';

export async function fetchEvents(typeFilter?: string) {
    let q = supabase
        .from('event')
        .select('id, title, event_type, date, end_date, location, capacity, cover_image_url, registration_status, created_at')
        .order('date', { ascending: true });

    if (typeFilter && typeFilter !== 'All') {
        q = q.eq('event_type', typeFilter as any);
    }
    return q;
}

export async function fetchEvent(id: string) {
    return supabase
        .from('event')
        .select('id, title, description, event_type, date, end_date, location, capacity, cover_image_url, registration_status, auto_badge_id, created_by, created_at, updated_at')
        .eq('id', id)
        .single();
}

export async function fetchEventRegistrationCount(eventId: string) {
    return supabase
        .from('event_registration')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', eventId);
}

export async function fetchRegistrationCounts(eventIds: string[]) {
    return supabase
        .from('event_registration')
        .select('event_id')
        .in('event_id', eventIds);
}

export async function fetchAllEvents() {
    return supabase
        .from('event')
        .select('id, title, description, event_type, date, end_date, location, capacity, cover_image_url, registration_status, auto_badge_id, created_by, created_at, updated_at')
        .order('date', { ascending: false });
}

export async function insertEvent(data: {
    title: string;
    event_type: EventType;
    date: string;
    end_date?: string;
    description?: string;
    location?: string;
    capacity?: number;
    cover_image_url?: string;
    registration_status?: string;
    created_by?: string;
}) {
    return supabase
        .from('event')
        .insert({ ...data, registration_status: data.registration_status || 'open' })
        .select('id, title, description, event_type, date, end_date, location, capacity, cover_image_url, registration_status, auto_badge_id, created_by, tagline, gallery_urls, results_summary, prizes_info, learnings, created_at, updated_at')
        .single();
}

export async function updateEvent(id: string, updates: Partial<Event>) {
    return supabase.from('event').update(updates).eq('id', id);
}

export async function deleteEventChildren(id: string) {
    await Promise.all([
        supabase.from('event_registration').delete().eq('event_id', id),
        supabase.from('event_checkin').delete().eq('event_id', id),
        supabase.from('event_team_member').delete().eq('team_id', id),
        supabase.from('event_submission').delete().eq('event_id', id),
        supabase.from('showcase_slot').delete().eq('event_id', id),
        supabase.from('event_host').delete().eq('event_id', id),
    ]);
    await supabase.from('event_team').delete().eq('event_id', id);
}

export async function deleteEvent(id: string) {
    return supabase.from('event').delete().eq('id', id);
}
