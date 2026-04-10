/**
 * Event domain hooks — queries, mutations, registration, hosts, websites.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../auth';
import { useSupabaseQuery } from './cache';
import type { Event, EventHost, EventRegistration, EventWebsite, EventType } from '../database.types';

// ─── List ───

export function useEvents(typeFilter?: string) {
    return useSupabaseQuery<(Event & { registration_count: number })[]>(async () => {
        let q = supabase
            .from('event')
            .select('id, title, event_type, date, end_date, location, capacity, cover_image_url, registration_status, created_at')
            .order('date', { ascending: true });

        if (typeFilter && typeFilter !== 'All') {
            q = q.eq('event_type', typeFilter as any);
        }
        const { data: events, error } = await q;
        if (error || !events) return { data: [], error };

        const eventIds = (events as Event[]).map(e => e.id);
        const { data: regData } = await supabase
            .from('event_registration')
            .select('event_id')
            .in('event_id', eventIds);

        const regCounts: Record<string, number> = {};
        (regData || []).forEach((r: any) => {
            regCounts[r.event_id] = (regCounts[r.event_id] || 0) + 1;
        });

        const enriched = (events as Event[]).map(evt => ({
            ...evt,
            registration_count: regCounts[evt.id] || 0,
        }));

        return { data: enriched, error: null };
    }, [typeFilter], { cacheKey: `events:${typeFilter ?? 'all'}` });
}

// ─── Detail ───

export function useEvent(id: string | undefined) {
    return useSupabaseQuery<(Event & { registration_count: number }) | null>(async () => {
        if (!id) return { data: null, error: null };

        const [eventRes, countRes] = await Promise.all([
            supabase
                .from('event')
                .select('id, title, description, event_type, date, end_date, location, capacity, cover_image_url, registration_status, auto_badge_id, created_by, created_at, updated_at')
                .eq('id', id)
                .single(),
            supabase
                .from('event_registration')
                .select('id', { count: 'exact', head: true })
                .eq('event_id', id),
        ]);

        if (eventRes.error || !eventRes.data) return { data: null, error: eventRes.error };

        return {
            data: { ...(eventRes.data as Event), registration_count: countRes.count || 0 },
            error: null,
        };
    }, [id]);
}

// ─── Hosts ───

export function useEventHosts(eventId: string | undefined) {
    return useSupabaseQuery<{ id: string; user_id: string; name: string; avatar_url: string | null }[]>(async () => {
        if (!eventId) return { data: [], error: null };

        const { data: hosts, error } = await supabase
            .from('event_host')
            .select('id, user_id, event_id, created_at')
            .eq('event_id', eventId);

        if (error || !hosts || hosts.length === 0) return { data: [], error: null };

        const userIds = (hosts as EventHost[]).map(h => h.user_id);

        const [usersRes, profilesRes] = await Promise.all([
            supabase.from('app_user').select('id, name').in('id', userIds),
            supabase.from('maker_profile').select('user_id, avatar_url').in('user_id', userIds),
        ]);

        const nameMap: Record<string, string> = {};
        (usersRes.data || []).forEach((u: any) => { nameMap[u.id] = u.name; });

        const avatarMap: Record<string, string | null> = {};
        (profilesRes.data || []).forEach((p: any) => { avatarMap[p.user_id] = p.avatar_url; });

        const enriched = (hosts as EventHost[]).map(h => ({
            id: h.id,
            user_id: h.user_id,
            name: nameMap[h.user_id] || 'Unknown Mentor',
            avatar_url: avatarMap[h.user_id] || null,
        }));

        return { data: enriched, error: null };
    }, [eventId]);
}

export function useEventHostMutations() {
    const addHost = async (eventId: string, userId: string) => {
        const { error } = await supabase.from('event_host').insert({ event_id: eventId, user_id: userId });
        return { error: error?.message || null };
    };

    const removeHost = async (hostId: string) => {
        const { error } = await supabase.from('event_host').delete().eq('id', hostId);
        return { error: error?.message || null };
    };

    return { addHost, removeHost };
}

// ─── Registration ───

export function useEventRegistration(eventId: string | undefined) {
    const { user } = useAuth();
    const [isRegistered, setIsRegistered] = useState(false);
    const [loading, setLoading] = useState(true);

    const check = useCallback(async () => {
        if (!user || !eventId) { setLoading(false); return; }
        const { data } = await supabase
            .from('event_registration')
            .select('id')
            .eq('event_id', eventId)
            .eq('user_id', user.id)
            .maybeSingle();
        setIsRegistered(!!data);
        setLoading(false);
    }, [user?.id, eventId]);

    useEffect(() => { check(); }, [check]);

    const register = async () => {
        if (!user || !eventId) return;
        setIsRegistered(true);
        const { error } = await supabase.from('event_registration').insert({ event_id: eventId, user_id: user.id });
        if (error) setIsRegistered(false);
    };

    const unregister = async () => {
        if (!user || !eventId) return;
        setIsRegistered(false);
        const { error } = await supabase.from('event_registration').delete().eq('event_id', eventId).eq('user_id', user.id);
        if (error) setIsRegistered(true);
    };

    return { isRegistered, loading, register, unregister };
}

// ─── Websites ───

export function useEventWebsites(eventId: string | undefined) {
    return useSupabaseQuery<(EventWebsite & { userName: string; avatarUrl: string | null })[]>(async () => {
        if (!eventId) return { data: [], error: null };

        const { data, error } = await supabase
            .from('event_website')
            .select('id, event_id, user_id, title, description, html_content, file_url, thumbnail_url, host_names, status, created_at, updated_at, user:app_user!user_id(name)')
            .eq('event_id', eventId)
            .eq('status', 'approved')
            .order('created_at', { ascending: false });

        if (error || !data) return { data: [], error };

        const userIds = [...new Set((data as any[]).map(d => d.user_id))];
        const avatarMap: Record<string, string | null> = {};
        if (userIds.length > 0) {
            const { data: profiles } = await supabase
                .from('maker_profile')
                .select('user_id, avatar_url')
                .in('user_id', userIds);
            (profiles || []).forEach((p: any) => { avatarMap[p.user_id] = p.avatar_url; });
        }

        const enriched = (data as any[]).map(w => ({
            ...w,
            userName: w.user?.name || 'Unknown',
            avatarUrl: avatarMap[w.user_id] || null,
        }));

        return { data: enriched, error: null };
    }, [eventId]);
}

export function useMyEventWebsite(eventId: string | undefined) {
    const { user } = useAuth();
    return useSupabaseQuery<EventWebsite | null>(async () => {
        if (!eventId || !user) return { data: null, error: null };
        const { data, error } = await supabase
            .from('event_website')
            .select('id, event_id, user_id, title, description, html_content, file_url, thumbnail_url, host_names, status, reviewed_by, reviewed_at, created_at, updated_at')
            .eq('event_id', eventId)
            .eq('user_id', user.id)
            .maybeSingle();
        return { data: data as EventWebsite | null, error };
    }, [eventId, user?.id]);
}

export function useEventWebsitesForReview(eventId?: string) {
    return useSupabaseQuery<(EventWebsite & { userName: string; userEmail: string })[]>(async () => {
        let q = supabase
            .from('event_website')
            .select('id, event_id, user_id, title, description, html_content, file_url, thumbnail_url, host_names, status, reviewed_by, reviewed_at, created_at, updated_at, user:app_user!user_id(name, email)')
            .order('created_at', { ascending: false });

        if (eventId) {
            q = q.eq('event_id', eventId);
        }

        const { data, error } = await q;
        if (error || !data) return { data: [], error };

        const enriched = (data as any[]).map(w => ({
            ...w,
            userName: w.user?.name || 'Unknown',
            userEmail: w.user?.email || '',
        }));

        return { data: enriched, error: null };
    }, [eventId]);
}

export function useEventWebsiteMutations() {
    const submitWebsite = async (data: {
        event_id: string;
        user_id: string;
        title: string;
        description?: string;
        html_content?: string;
        file_url?: string;
        thumbnail_url?: string;
        host_names?: string[];
    }) => {
        const { data: rows, error } = await supabase
            .from('event_website')
            .insert({
                ...data,
                host_names: data.host_names || [],
                status: 'pending',
            })
            .select('id, event_id, user_id, title, description, html_content, file_url, thumbnail_url, host_names, status, reviewed_by, reviewed_at, created_at, updated_at');
        const website = rows?.[0] ?? null;
        return { data: website as EventWebsite | null, error: error?.message || null };
    };

    const updateWebsite = async (id: string, updates: Partial<EventWebsite>) => {
        const { error } = await supabase.from('event_website').update({
            ...updates,
            updated_at: new Date().toISOString(),
        }).eq('id', id);
        return { error: error?.message || null };
    };

    const deleteWebsite = async (id: string) => {
        const { error } = await supabase.from('event_website').delete().eq('id', id);
        return { error: error?.message || null };
    };

    const reviewWebsite = async (id: string, status: 'approved' | 'rejected', reviewerId: string) => {
        const { error } = await supabase.from('event_website').update({
            status,
            reviewed_by: reviewerId,
            reviewed_at: new Date().toISOString(),
        }).eq('id', id);
        return { error: error?.message || null };
    };

    return { submitWebsite, updateWebsite, deleteWebsite, reviewWebsite };
}

// ─── Admin Mutations ───

export function useAllEvents() {
    return useSupabaseQuery<Event[]>(async () => {
        return supabase
            .from('event')
            .select('id, title, description, event_type, date, end_date, location, capacity, cover_image_url, registration_status, auto_badge_id, created_by, created_at, updated_at')
            .order('date', { ascending: false }) as any;
    }, []);
}

export function useEventMutations() {
    const createEvent = async (data: {
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
    }) => {
        const { data: event, error } = await supabase
            .from('event')
            .insert({ ...data, registration_status: data.registration_status || 'open' })
            .select('id, title, description, event_type, date, end_date, location, capacity, cover_image_url, registration_status, auto_badge_id, created_by, tagline, gallery_urls, results_summary, prizes_info, learnings, created_at, updated_at')
            .single();
        return { data: event as Event | null, error: error?.message || null };
    };

    const updateEvent = async (id: string, updates: Partial<Event>) => {
        const { error } = await supabase.from('event').update(updates).eq('id', id);
        return { error: error?.message || null };
    };

    const deleteEvent = async (id: string) => {
        await Promise.all([
            supabase.from('event_registration').delete().eq('event_id', id),
            supabase.from('event_checkin').delete().eq('event_id', id),
            supabase.from('event_team_member').delete().eq('team_id', id),
            supabase.from('event_submission').delete().eq('event_id', id),
            supabase.from('showcase_slot').delete().eq('event_id', id),
            supabase.from('event_host').delete().eq('event_id', id),
        ]);
        await supabase.from('event_team').delete().eq('event_id', id);
        const { error } = await supabase.from('event').delete().eq('id', id);
        return { error: error?.message || null };
    };

    return { createEvent, updateEvent, deleteEvent };
}
