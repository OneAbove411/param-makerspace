/**
 * Challenge API — raw Supabase queries.
 */

import { supabase } from '../supabase';
import type { Challenge } from '../database.types';

export async function fetchChallenges(opts?: { tierFilter?: string; domainFilter?: string }) {
    let q = supabase
        .from('challenge')
        .select('id, title, tier, domain, time_estimate, cover_image_url, mystery, status, created_at')
        .eq('status', 'published')
        .order('created_at', { ascending: false });

    if (opts?.tierFilter && opts.tierFilter !== 'All') {
        q = q.ilike('tier', opts.tierFilter);
    }
    if (opts?.domainFilter && opts.domainFilter !== 'All') {
        q = q.ilike('domain', opts.domainFilter);
    }
    return q;
}

export async function fetchChallenge(id: string) {
    return supabase
        .from('challenge')
        .select('id, title, tier, domain, time_estimate, cover_image_url, mystery, core_idea, mission, success_criteria, status, created_by, created_at, updated_at')
        .eq('id', id)
        .single();
}

export async function fetchChallengeRelations(id: string) {
    return Promise.all([
        supabase.from('challenge_step').select('step_text, display_order').eq('challenge_id', id).order('display_order'),
        supabase.from('challenge_material').select('name, display_order').eq('challenge_id', id).order('display_order'),
        supabase.from('challenge_skill').select('skill_name').eq('challenge_id', id),
        supabase.from('challenge_vocabulary').select('term, definition').eq('challenge_id', id),
        supabase.from('challenge_level').select('level_name, description').eq('challenge_id', id),
        supabase.from('entity_tag').select('tag_id, tag:tag(name)').eq('target_type', 'challenge').eq('target_id', id),
        supabase.from('challenge_image').select('image_url, caption, display_order').eq('challenge_id', id).order('display_order'),
        supabase.from('challenge_video').select('title, video_url').eq('challenge_id', id).order('display_order'),
        supabase.from('reaction').select('id', { count: 'exact', head: true }).eq('target_type', 'challenge').eq('target_id', id).eq('reaction_type', 'like'),
        supabase.from('reaction').select('id', { count: 'exact', head: true }).eq('target_type', 'challenge').eq('target_id', id).eq('reaction_type', 'bookmark'),
    ]);
}

export async function fetchAllChallenges() {
    return supabase
        .from('challenge')
        .select('id, title, tier, domain, time_estimate, cover_image_url, mystery, core_idea, mission, success_criteria, status, created_by, created_at, updated_at')
        .order('created_at', { ascending: false })
        .range(0, 499);
}

export async function insertChallenge(data: {
    title: string;
    tier?: string;
    domain?: string;
    time_estimate?: string;
    cover_image_url?: string;
    mystery?: string;
    core_idea?: string;
    mission?: string;
    success_criteria?: string;
    status?: string;
    created_by?: string;
}) {
    return supabase.from('challenge').insert({ ...data, status: data.status || 'draft' }).select('id, title, tier, domain, time_estimate, cover_image_url, mystery, core_idea, mission, success_criteria, status, created_by, created_at, updated_at').single();
}

export async function updateChallenge(id: string, updates: Partial<Challenge>) {
    return supabase.from('challenge').update(updates).eq('id', id);
}

export async function deleteChallengeChildren(id: string) {
    return Promise.all([
        supabase.from('challenge_step').delete().eq('challenge_id', id),
        supabase.from('challenge_material').delete().eq('challenge_id', id),
        supabase.from('challenge_skill').delete().eq('challenge_id', id),
        supabase.from('challenge_vocabulary').delete().eq('challenge_id', id),
        supabase.from('challenge_level').delete().eq('challenge_id', id),
        supabase.from('challenge_image').delete().eq('challenge_id', id),
        supabase.from('challenge_video').delete().eq('challenge_id', id),
        supabase.from('challenge_completion').delete().eq('challenge_id', id),
    ]);
}

export async function deleteChallenge(id: string) {
    return supabase.from('challenge').delete().eq('id', id);
}
