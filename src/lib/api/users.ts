/**
 * User/Profile API — raw Supabase queries.
 */

import { supabase } from '../supabase';
import type { Role } from '../database.types';

export async function fetchAllUsers() {
    return supabase
        .from('app_user')
        .select('id, auth_id, email, name, role, xp, rank, rank_override, is_active, created_at, updated_at, profile:maker_profile(id, user_id, display_name, avatar_url, is_public)')
        .order('created_at', { ascending: false })
        .range(0, 499);
}

export async function updateUserRole(userId: string, role: Role) {
    return supabase.from('app_user').update({ role }).eq('id', userId);
}

export async function toggleUserActive(userId: string, isActive: boolean) {
    return supabase.from('app_user').update({ is_active: isActive }).eq('id', userId);
}

export async function updateUserXPAndRank(userId: string, xp: number, rank: string, rankOverride: boolean) {
    return supabase.from('app_user').update({ xp, rank, rank_override: rankOverride }).eq('id', userId);
}

export async function fetchMakers() {
    return supabase
        .from('maker_profile')
        .select('id, user_id, display_name, bio, avatar_url, is_public')
        .eq('is_public', true)
        .order('display_name');
}

export async function fetchMakerProfile(id: string) {
    const profileSelect = 'id, user_id, display_name, pronouns, bio, aspirations, avatar_url, github_url, linkedin_url, website_url, is_public, created_at, updated_at, instagram_url, mentor_domains, approval_domains, show_email';
    return supabase
        .from('maker_profile')
        .select(profileSelect)
        .or(`id.eq.${id},user_id.eq.${id}`)
        .limit(1)
        .single();
}

export async function fetchUserRankAccess(userId: string) {
    return supabase
        .from('app_user')
        .select('xp, rank, role')
        .eq('id', userId)
        .single();
}

export async function fetchXPHistory(userId: string) {
    return supabase
        .from('xp_event')
        .select('id, amount, reason, created_at, reference_id, reference_type')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
}
