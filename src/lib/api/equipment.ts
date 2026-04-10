/**
 * Equipment & Inventory API — raw Supabase queries.
 */

import { supabase } from '../supabase';
import type { Equipment, Inventory } from '../database.types';

export async function fetchEquipment() {
    return supabase
        .from('equipment')
        .select('id, name, description, image_url, is_active, requires_induction, created_at')
        .order('name');
}

export async function insertEquipment(data: {
    name: string;
    description?: string;
    image_url?: string;
    requires_induction?: boolean;
}) {
    return supabase.from('equipment').insert(data).select('id, name, description, image_url, is_active, requires_induction, created_at').single();
}

export async function updateEquipment(id: string, updates: Partial<Equipment>) {
    return supabase.from('equipment').update(updates).eq('id', id);
}

export async function deleteEquipmentChildren(id: string) {
    return Promise.all([
        supabase.from('equipment_induction').delete().eq('equipment_id', id),
        supabase.from('equipment_booking').delete().eq('equipment_id', id),
    ]);
}

export async function deleteEquipment(id: string) {
    return supabase.from('equipment').delete().eq('id', id);
}

export async function fetchInventory() {
    return supabase
        .from('inventory')
        .select('id, name, description, quantity, unit, location, created_at, updated_at')
        .order('name');
}

export async function insertInventoryItem(data: {
    name: string;
    quantity: number;
    description?: string;
    unit?: string;
    location?: string;
}) {
    return supabase.from('inventory').insert(data).select('id, name, description, quantity, unit, location, created_at, updated_at').single();
}

export async function updateInventoryItem(id: string, updates: Partial<Inventory>) {
    return supabase.from('inventory').update(updates).eq('id', id);
}

export async function deleteInventoryItem(id: string) {
    return supabase.from('inventory').delete().eq('id', id);
}
