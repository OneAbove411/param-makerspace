/**
 * Project API — raw Supabase queries extracted from hooks.
 *
 * Hooks call these functions instead of hitting `supabase.from(...)` directly.
 * If the backend migrates off Supabase, only this file changes.
 */

import { supabase } from '../supabase';
import type {
    Project, ProjectImage, ProjectVideo, ProjectFile,
    ProjectBomLine, ProjectMake, ProjectCommentPin, ProjectMergeRequest,
} from '../database.types';

// ─── List ───

export async function fetchProjects(opts: {
    domainFilter?: string;
    sortBy?: string;
    signal?: AbortSignal;
}) {
    let q = supabase
        .from('project')
        .select(`
            id, title, summary, domain, tier, status, visibility, created_at, owner_id, remixed_from_id,
            project_image ( image_url, display_order ),
            project_video ( id ),
            project_member ( id ),
            project_milestone ( id, is_complete )
        `)
        .eq('status', 'active')
        .eq('visibility', 'public');

    if (opts.signal) q = q.abortSignal(opts.signal);

    if (opts.sortBy === 'oldest') {
        q = q.order('created_at', { ascending: true });
    } else {
        q = q.order('created_at', { ascending: false });
    }

    if (opts.domainFilter && opts.domainFilter !== 'All') {
        q = q.eq('domain', opts.domainFilter);
    }

    return q;
}

export async function fetchProjectReactions(ids: string[]) {
    return supabase
        .from('reaction')
        .select('target_id, reaction_type')
        .eq('target_type', 'project')
        .in('target_id', ids);
}

export async function fetchProjectTags(ids: string[]) {
    return supabase
        .from('entity_tag')
        .select('target_id, tag:tag(name)')
        .eq('target_type', 'project')
        .in('target_id', ids);
}

export async function fetchUserNames(userIds: string[]) {
    if (userIds.length === 0) return { data: [], error: null } as any;
    return supabase.from('app_user').select('id, name').in('id', userIds);
}

export async function fetchUserAvatars(userIds: string[]) {
    if (userIds.length === 0) return { data: [], error: null } as any;
    return supabase.from('maker_profile').select('user_id, avatar_url').in('user_id', userIds);
}

// ─── Detail ───

export async function fetchProject(id: string, signal?: AbortSignal) {
    let q = supabase
        .from('project')
        .select('id, title, summary, description, domain, tier, github_url, duration, status, visibility, created_at, updated_at, owner_id, remixed_from_id')
        .eq('id', id);
    if (signal) q = q.abortSignal(signal);
    return q.single();
}

export async function fetchProjectRelations(id: string, ownerId: string) {
    return Promise.all([
        supabase.from('project_image').select('id, image_url, caption, display_order').eq('project_id', id).order('display_order'),
        supabase.from('project_video').select('id, title, video_url, display_order').eq('project_id', id).order('display_order'),
        supabase.from('entity_tag').select('tag_id, tag:tag(name)').eq('target_type', 'project').eq('target_id', id),
        supabase.from('app_user').select('name').eq('id', ownerId).single(),
        supabase.from('project_file').select('id, file_url, file_name, file_size').eq('project_id', id).order('created_at'),
        supabase.from('reaction').select('reaction_type').eq('target_type', 'project').eq('target_id', id),
        supabase.from('project_milestone').select('id, title, description, is_complete, display_order').eq('project_id', id).order('display_order'),
        supabase.from('project_member').select('id, user_id, role, joined_at, app_user:app_user!user_id(name, email)').eq('project_id', id),
    ]);
}

// ─── Mutations ───

export async function insertProject(payload: Record<string, unknown>) {
    return supabase.from('project').insert(payload as any).select('id, owner_id, title, summary, description, domain, tier, github_url, duration, remixed_from_id, is_hardware, status, visibility, created_at, updated_at').single();
}

export async function updateProject(id: string, updates: Partial<Project>) {
    return supabase.from('project').update(updates).eq('id', id);
}

export async function deleteProject(id: string) {
    return supabase.from('project').delete().eq('id', id).eq('status', 'draft');
}

// ─── BOM ───

export async function fetchProjectBom(projectId: string, signal?: AbortSignal) {
    let q = supabase
        .from('project_bom_line')
        .select('id, project_id, reference, part, quantity, source_url, cost_cents, notes, image_url, display_order, created_at')
        .eq('project_id', projectId)
        .order('display_order', { ascending: true });
    if (signal) q = q.abortSignal(signal);
    return q;
}

export async function insertBomLine(line: Omit<ProjectBomLine, 'id' | 'created_at'>) {
    return supabase.from('project_bom_line').insert([line]).select('id, project_id, reference, part, quantity, source_url, cost_cents, notes, image_url, display_order, created_at').single();
}

export async function updateBomLine(id: string, updates: Partial<ProjectBomLine>) {
    return supabase.from('project_bom_line').update(updates).eq('id', id).select('id, project_id, reference, part, quantity, source_url, cost_cents, notes, image_url, display_order, created_at').single();
}

export async function deleteBomLine(id: string) {
    return supabase.from('project_bom_line').delete().eq('id', id);
}

// ─── Makes ───

export async function fetchProjectMakes(projectId: string, signal?: AbortSignal) {
    let q = supabase
        .from('project_make')
        .select(`
            id, project_id, user_id, image_url, caption, build_notes, created_at,
            app_user!project_make_user_id_fkey ( name ),
            maker_profile!project_make_user_id_fkey ( avatar_url )
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
    if (signal) q = q.abortSignal(signal);
    return q;
}

// ─── Merge Requests ───

export async function fetchMergeRequests(projectId: string, signal?: AbortSignal) {
    let q = supabase
        .from('project_merge_request')
        .select('id, source_project_id, target_project_id, submitter_id, title, body, status, diff_snapshot, created_at, resolved_at')
        .or(`target_project_id.eq.${projectId},source_project_id.eq.${projectId}`)
        .order('created_at', { ascending: false });
    if (signal) q = q.abortSignal(signal);
    return q;
}
