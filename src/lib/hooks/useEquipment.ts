/**
 * Equipment and inventory hooks.
 */

import { supabase } from '../supabase';
import { useSupabaseQuery } from './cache';
import type { Equipment, Inventory } from '../database.types';

// ─── Equipment ───

export function useEquipment() {
    return useSupabaseQuery<Equipment[]>(async () => {
        return supabase
            .from('equipment')
            .select('id, name, description, image_url, is_active, requires_induction, created_at')
            .order('name') as any;
    }, []);
}

export function useEquipmentMutations() {
    const createEquipment = async (data: {
        name: string;
        description?: string;
        image_url?: string;
        requires_induction?: boolean;
    }) => {
        const { data: equip, error } = await supabase
            .from('equipment')
            .insert(data)
            .select('id, name, description, image_url, is_active, requires_induction, created_at')
            .single();
        return { data: equip as Equipment | null, error: error?.message || null };
    };

    const updateEquipment = async (id: string, updates: Partial<Equipment>) => {
        const { error } = await supabase.from('equipment').update(updates).eq('id', id);
        return { error: error?.message || null };
    };

    const deleteEquipment = async (id: string) => {
        await Promise.all([
            supabase.from('equipment_induction').delete().eq('equipment_id', id),
            supabase.from('equipment_booking').delete().eq('equipment_id', id),
        ]);
        const { error } = await supabase.from('equipment').delete().eq('id', id);
        return { error: error?.message || null };
    };

    return { createEquipment, updateEquipment, deleteEquipment };
}

// ─── Inventory ───

export function useInventory() {
    return useSupabaseQuery<Inventory[]>(async () => {
        return supabase
            .from('inventory')
            .select('id, name, description, quantity, unit, location, created_at, updated_at')
            .order('name') as any;
    }, []);
}

export function useInventoryMutations() {
    const createItem = async (data: {
        name: string;
        description?: string;
        quantity: number;
        unit?: string;
        location?: string;
    }) => {
        const { data: item, error } = await supabase
            .from('inventory')
            .insert(data)
            .select('id, name, description, quantity, unit, location, created_at, updated_at')
            .single();
        return { data: item as Inventory | null, error: error?.message || null };
    };

    const updateItem = async (id: string, updates: Partial<Inventory>) => {
        const { error } = await supabase.from('inventory').update(updates).eq('id', id);
        return { error: error?.message || null };
    };

    const deleteItem = async (id: string) => {
        const { error } = await supabase.from('inventory').delete().eq('id', id);
        return { error: error?.message || null };
    };

    return { createItem, updateItem, deleteItem };
}
