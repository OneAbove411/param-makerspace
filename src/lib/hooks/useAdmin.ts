/**
 * Admin-specific hooks — user management, project review, challenge review.
 */

import { supabase } from '../supabase';
import { useSupabaseQuery } from './cache';
import { invalidateProjectCache } from './cache';
import type {
    AppUser, MakerProfile, Project, Challenge, ChallengeCompletion, Role,
} from '../database.types';

// ─── Users ───

export function useAllUsers() {
    return useSupabaseQuery<(AppUser & { profile: MakerProfile | null })[]>(async () => {
        const { data, error } = await supabase
            .from('app_user')
            .select('id, auth_id, email, name, role, xp, rank, rank_override, is_active, created_at, updated_at, profile:maker_profile(id, user_id, display_name, avatar_url, is_public)')
            .order('created_at', { ascending: false })
            .range(0, 499);

        if (error || !data) return { data: [], error };

        const enriched = (data as any[]).map(u => {
            const profile = Array.isArray(u.profile) ? u.profile[0] || null : u.profile || null;
            return { ...u, profile };
        });

        return { data: enriched, error: null };
    }, []);
}

export function useUserMutations() {
    const updateRole = async (userId: string, role: Role) => {
        const { error } = await supabase.from('app_user').update({ role }).eq('id', userId);
        return { error: error?.message || null };
    };

    const toggleActive = async (userId: string, isActive: boolean) => {
        const { error } = await supabase.from('app_user').update({ is_active: isActive }).eq('id', userId);
        return { error: error?.message || null };
    };

    const updateXPAndRank = async (userId: string, xp: number, rank: string, rankOverride: boolean) => {
        const { error } = await supabase.from('app_user').update({ xp, rank, rank_override: rankOverride }).eq('id', userId);
        return { error: error?.message || null };
    };

    return { updateRole, toggleActive, updateXPAndRank };
}

// ─── Challenges (admin) ───

export function useAllChallenges() {
    return useSupabaseQuery<Challenge[]>(async () => {
        return supabase
            .from('challenge')
            .select('id, title, tier, domain, time_estimate, cover_image_url, mystery, core_idea, mission, success_criteria, status, created_by, created_at, updated_at')
            .order('created_at', { ascending: false })
            .range(0, 499) as any;
    }, []);
}

export function useChallengeMutations() {
    const createChallenge = async (data: {
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
    }) => {
        const { data: challenge, error } = await supabase
            .from('challenge')
            .insert({ ...data, status: data.status || 'draft' })
            .select('id, title, tier, domain, time_estimate, cover_image_url, mystery, core_idea, mission, success_criteria, status, created_by, created_at, updated_at')
            .single();
        return { data: challenge as Challenge | null, error: error?.message || null };
    };

    const updateChallenge = async (id: string, updates: Partial<Challenge>) => {
        const { error } = await supabase.from('challenge').update(updates).eq('id', id);
        return { error: error?.message || null };
    };

    const deleteChallenge = async (id: string) => {
        await Promise.all([
            supabase.from('challenge_step').delete().eq('challenge_id', id),
            supabase.from('challenge_material').delete().eq('challenge_id', id),
            supabase.from('challenge_skill').delete().eq('challenge_id', id),
            supabase.from('challenge_vocabulary').delete().eq('challenge_id', id),
            supabase.from('challenge_level').delete().eq('challenge_id', id),
            supabase.from('challenge_image').delete().eq('challenge_id', id),
            supabase.from('challenge_video').delete().eq('challenge_id', id),
            supabase.from('challenge_completion').delete().eq('challenge_id', id),
        ]);
        const { error } = await supabase.from('challenge').delete().eq('id', id);
        return { error: error?.message || null };
    };

    return { createChallenge, updateChallenge, deleteChallenge };
}

// ─── Project Review ───

export function usePendingProjects() {
    return useSupabaseQuery<(Project & { ownerName: string; ownerEmail: string })[]>(async () => {
        const { data, error } = await supabase
            .from('project')
            .select('id, title, summary, description, domain, tier, status, visibility, owner_id, created_at, updated_at, owner:app_user!owner_id(name, email)')
            .eq('status', 'pending_review')
            .order('updated_at', { ascending: false });

        if (error || !data) return { data: [], error };

        const enriched = (data as any[]).map(p => ({
            ...p,
            ownerName: p.owner?.name || 'Unknown',
            ownerEmail: p.owner?.email || '',
        }));

        return { data: enriched, error: null };
    }, []);
}

export function useAllProjectsAdmin() {
    return useSupabaseQuery<(Project & { ownerName: string })[]>(async () => {
        const { data, error } = await supabase
            .from('project')
            .select('id, title, summary, domain, tier, status, visibility, owner_id, created_at, updated_at, owner:app_user!owner_id(name)')
            .order('created_at', { ascending: false })
            .range(0, 499);

        if (error || !data) return { data: [], error };

        const enriched = (data as any[]).map(p => ({
            ...p,
            ownerName: p.owner?.name || 'Unknown',
        }));

        return { data: enriched, error: null };
    }, []);
}

export function useProjectReviewMutations() {
    const approveProject = async (id: string) => {
        const { error } = await supabase.from('project').update({
            status: 'active',
            visibility: 'public',
        }).eq('id', id);
        return { error: error?.message || null };
    };

    const rejectProject = async (id: string) => {
        const { error } = await supabase.from('project').update({
            status: 'rejected',
        }).eq('id', id);
        return { error: error?.message || null };
    };

    return { approveProject, rejectProject };
}

export function useAdminProjectMutations() {
    const adminDeleteProject = async (id: string) => {
        await Promise.all([
            supabase.from('project_video').delete().eq('project_id', id),
            supabase.from('project_image').delete().eq('project_id', id),
            supabase.from('project_file').delete().eq('project_id', id),
            supabase.from('project_milestone').delete().eq('project_id', id),
            supabase.from('project_member').delete().eq('project_id', id),
            supabase.from('reaction').delete().eq('target_type', 'project').eq('target_id', id),
            supabase.from('comment').delete().eq('target_type', 'project').eq('target_id', id),
            supabase.from('entity_tag').delete().eq('target_type', 'project').eq('target_id', id),
        ]);
        const { error } = await supabase.from('project').delete().eq('id', id);
        return { error: error?.message || null };
    };

    const adminUpdateStatus = async (id: string, status: string, visibility?: string) => {
        const updates: any = { status };
        if (visibility) updates.visibility = visibility;
        const { error } = await supabase.from('project').update(updates).eq('id', id);
        return { error: error?.message || null };
    };

    return { adminDeleteProject, adminUpdateStatus };
}

// ─── Challenge Completion Review ───

export function usePendingCompletions() {
    return useSupabaseQuery<(ChallengeCompletion & {
        challengeTitle: string;
        userName: string;
    })[]>(async () => {
        const { data, error } = await supabase
            .from('challenge_completion')
            .select('id, challenge_id, user_id, status, evidence_url, notes, verified_by, created_at, updated_at, challenge:challenge!challenge_id(title), user:app_user!user_id(name)')
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        if (error || !data) return { data: [], error };

        const enriched = (data as any[]).map(c => ({
            ...c,
            challengeTitle: c.challenge?.title || 'Unknown',
            userName: c.user?.name || 'Unknown',
        }));

        return { data: enriched, error: null };
    }, []);
}

export function useCompletionReviewMutations() {
    const verifyCompletion = async (id: string, verifiedBy: string) => {
        const { error } = await supabase.from('challenge_completion').update({
            status: 'verified',
            verified_by: verifiedBy,
        }).eq('id', id);
        return { error: error?.message || null };
    };

    const rejectCompletion = async (id: string) => {
        const { error } = await supabase.from('challenge_completion').update({
            status: 'rejected',
        }).eq('id', id);
        return { error: error?.message || null };
    };

    return { verifyCompletion, rejectCompletion };
}
