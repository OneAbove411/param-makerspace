/**
 * Tag API — raw Supabase queries.
 */

import { supabase } from '../supabase';
import type { TargetType } from '../database.types';

export async function fetchAllTags() {
    return supabase
        .from('tag')
        .select('id, name, created_at')
        .order('name')
        .range(0, 499);
}

export async function fetchEntityTags(targetType: TargetType, targetId: string) {
    return supabase
        .from('entity_tag')
        .select('tag_id, tag:tag(name)')
        .eq('target_type', targetType)
        .eq('target_id', targetId);
}

export async function upsertTags(names: string[]) {
    return supabase
        .from('tag')
        .upsert(names.map(name => ({ name })), { onConflict: 'name' })
        .select('id, name');
}

export async function insertEntityTags(rows: { target_type: TargetType; target_id: string; tag_id: string }[]) {
    return supabase.from('entity_tag').insert(rows);
}

export async function deleteEntityTags(targetType: TargetType, targetId: string) {
    return supabase.from('entity_tag').delete().eq('target_type', targetType).eq('target_id', targetId);
}

export async function deleteTag(id: string) {
    await supabase.from('entity_tag').delete().eq('tag_id', id);
    return supabase.from('tag').delete().eq('id', id);
}

export async function updateTag(id: string, name: string) {
    return supabase.from('tag').update({ name }).eq('id', id);
}

export async function insertTag(name: string) {
    return supabase.from('tag').insert({ name }).select('id, name, category, created_at').single();
}
