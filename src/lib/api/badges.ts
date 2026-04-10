/**
 * Badge & Store API — raw Supabase queries.
 */

import { supabase } from '../supabase';
import type { Badge, StoreProduct } from '../database.types';

export async function fetchBadges() {
    return supabase
        .from('badge')
        .select('id, name, description, tier, domain, badge_type, criteria, image_url, created_at')
        .order('tier')
        .order('name')
        .range(0, 499);
}

export async function fetchUserBadges(userId: string) {
    return supabase
        .from('user_badge')
        .select('id, user_id, badge_id, awarded_at, awarded_by, badge:badge(id, name, description, tier, domain, badge_type, image_url)')
        .eq('user_id', userId);
}

export async function insertBadge(data: {
    name: string;
    description: string;
    tier: string;
    domain: string;
    badge_type: string;
    criteria: string;
    image_url?: string;
}) {
    return supabase.from('badge').insert(data).select('id, name, description, tier, domain, badge_type, criteria, image_url, created_at').single();
}

export async function updateBadge(id: string, updates: Partial<Badge>) {
    return supabase.from('badge').update(updates).eq('id', id);
}

export async function deleteBadge(id: string) {
    await supabase.from('user_badge').delete().eq('badge_id', id);
    return supabase.from('badge').delete().eq('id', id);
}

export async function awardBadge(userId: string, badgeId: string, awardedBy?: string) {
    return supabase.from('user_badge').insert({
        user_id: userId,
        badge_id: badgeId,
        awarded_by: awardedBy || null,
    });
}

export async function revokeBadge(userId: string, badgeId: string) {
    return supabase.from('user_badge').delete()
        .eq('user_id', userId)
        .eq('badge_id', badgeId);
}

// ─── Store ───

export async function fetchProducts() {
    return supabase
        .from('store_product')
        .select('id, name, description, price, category, image_url, is_active, required_badge_id, created_at, required_badge:badge!required_badge_id(id, name, tier, image_url)')
        .eq('is_active', true)
        .order('name');
}

export async function fetchAllProducts() {
    return supabase
        .from('store_product')
        .select('id, name, description, price, category, image_url, is_active, required_badge_id, created_at')
        .order('name');
}

export async function insertProduct(data: {
    name: string;
    description: string;
    price: number;
    category?: string;
    image_url?: string;
    is_active?: boolean;
    required_badge_id?: string;
}) {
    return supabase.from('store_product').insert({ ...data, is_active: data.is_active !== false }).select('id, name, description, price, category, image_url, is_active, required_badge_id, created_at').single();
}

export async function updateProduct(id: string, updates: Partial<StoreProduct>) {
    return supabase.from('store_product').update(updates).eq('id', id);
}

export async function deleteProduct(id: string) {
    await supabase.from('store_order_item').delete().eq('product_id', id);
    return supabase.from('store_product').delete().eq('id', id);
}
