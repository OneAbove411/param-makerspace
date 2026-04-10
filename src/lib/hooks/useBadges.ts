/**
 * Badge and store hooks.
 */

import { supabase } from '../supabase';
import { useAuth } from '../auth';
import { useSupabaseQuery } from './cache';
import type { Badge, UserBadge, StoreProduct } from '../database.types';

// ─── Badges ───

export function useBadges() {
    return useSupabaseQuery<Badge[]>(async () => {
        return supabase
            .from('badge')
            .select('id, name, description, tier, domain, badge_type, criteria, image_url, created_at')
            .order('tier')
            .order('name') as any;
    }, [], { cacheKey: 'badges:all', cacheTtlMs: 5 * 60_000 });
}

export function useUserBadges(userId?: string) {
    return useSupabaseQuery<(UserBadge & { badge: Badge })[]>(async () => {
        if (!userId) return { data: [], error: null };
        const { data, error } = await supabase
            .from('user_badge')
            .select('id, user_id, badge_id, awarded_at, awarded_by, badge:badge(id, name, description, tier, domain, badge_type, image_url)')
            .eq('user_id', userId);
        return { data: data as any, error };
    }, [userId]);
}

export function useBadgeMutations() {
    const createBadge = async (data: {
        name: string;
        description: string;
        tier: string;
        domain: string;
        badge_type: string;
        criteria: string;
        image_url?: string;
    }) => {
        const { data: badge, error } = await supabase
            .from('badge')
            .insert(data)
            .select('id, name, description, tier, domain, badge_type, criteria, image_url, created_at')
            .single();
        return { data: badge as Badge | null, error: error?.message || null };
    };

    const updateBadge = async (id: string, updates: Partial<Badge>) => {
        const { error } = await supabase.from('badge').update(updates).eq('id', id);
        return { error: error?.message || null };
    };

    const deleteBadge = async (id: string) => {
        await supabase.from('user_badge').delete().eq('badge_id', id);
        const { error } = await supabase.from('badge').delete().eq('id', id);
        return { error: error?.message || null };
    };

    const awardBadge = async (userId: string, badgeId: string, awardedBy?: string) => {
        const { error } = await supabase.from('user_badge').insert({
            user_id: userId,
            badge_id: badgeId,
            awarded_by: awardedBy || null,
        });
        return { error: error?.message || null };
    };

    const revokeBadge = async (userId: string, badgeId: string) => {
        const { error } = await supabase.from('user_badge').delete()
            .eq('user_id', userId)
            .eq('badge_id', badgeId);
        return { error: error?.message || null };
    };

    return { createBadge, updateBadge, deleteBadge, awardBadge, revokeBadge };
}

// ─── Store Products ───

export function useProducts() {
    return useSupabaseQuery<(StoreProduct & { requiredBadge: Badge | null })[]>(async () => {
        const { data: products, error } = await supabase
            .from('store_product')
            .select('id, name, description, price, category, image_url, is_active, required_badge_id, created_at, required_badge:badge!required_badge_id(id, name, tier, image_url)')
            .eq('is_active', true)
            .order('name');

        if (error || !products) return { data: [], error };

        const enriched = (products as any[]).map(p => ({
            ...p,
            requiredBadge: p.required_badge || null,
        }));

        return { data: enriched, error: null };
    }, []);
}

export function useAllProducts() {
    return useSupabaseQuery<StoreProduct[]>(async () => {
        return supabase
            .from('store_product')
            .select('id, name, description, price, category, image_url, is_active, required_badge_id, created_at')
            .order('name') as any;
    }, []);
}

export function useProductMutations() {
    const createProduct = async (data: {
        name: string;
        description: string;
        price: number;
        category?: string;
        image_url?: string;
        is_active?: boolean;
        required_badge_id?: string;
    }) => {
        const { data: product, error } = await supabase
            .from('store_product')
            .insert({ ...data, is_active: data.is_active !== false })
            .select('id, name, description, price, category, image_url, is_active, required_badge_id, created_at')
            .single();
        return { data: product as StoreProduct | null, error: error?.message || null };
    };

    const updateProduct = async (id: string, updates: Partial<StoreProduct>) => {
        const { error } = await supabase.from('store_product').update(updates).eq('id', id);
        return { error: error?.message || null };
    };

    const deleteProduct = async (id: string) => {
        await supabase.from('store_order_item').delete().eq('product_id', id);
        const { error } = await supabase.from('store_product').delete().eq('id', id);
        return { error: error?.message || null };
    };

    return { createProduct, updateProduct, deleteProduct };
}

export function useStoreOrder() {
    const { user } = useAuth();

    const placeOrder = async (productId: string, price: number, quantity: number = 1) => {
        if (!user) return { error: 'Not authenticated' };

        const total = price * quantity;
        const { data: order, error: orderErr } = await supabase
            .from('store_order')
            .insert({ user_id: user.id, total, status: 'pending' })
            .select('id, user_id, total, status, created_at')
            .single();

        if (orderErr || !order) return { error: orderErr?.message || 'Failed to create order' };

        const { error: itemErr } = await supabase
            .from('store_order_item')
            .insert({
                order_id: (order as any).id,
                product_id: productId,
                quantity,
                unit_price: price,
            });

        return { error: itemErr?.message || null };
    };

    return { placeOrder };
}
