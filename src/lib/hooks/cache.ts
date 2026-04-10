/**
 * Shared cache infrastructure, realtime channel manager, and base query hook.
 *
 * Every domain-specific hook module imports from here. This file owns:
 *   - In-memory TTL caches (project, BOM, makes, list)
 *   - Cross-mount global query cache
 *   - Active query refetch registry (tab-resume recovery)
 *   - Shared realtime channel multiplexing
 *   - The generic `useSupabaseQuery` hook
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '../supabase';

// ─── Project-specific caches ──────────────────────────────────────
export const PROJECT_CACHE_TTL_MS = 5 * 60_000;
export const projectCache = new Map<string, { data: any; at: number }>();

export const PROJECT_LIST_CACHE_TTL_MS = 5 * 60_000;
export const projectListCache = new Map<string, { data: any; at: number }>();

export function projectListCacheKey(domainFilter?: string, sortBy?: string) {
    return `${domainFilter || 'All'}|${sortBy || 'newest'}`;
}

export function invalidateProjectListCache() {
    projectListCache.clear();
}

export const PROJECT_BOM_CACHE_TTL_MS = 5 * 60_000;
export const projectBomCache = new Map<string, { data: any; at: number }>();
export const projectMakesCache = new Map<string, { data: any; at: number }>();

export function invalidateProjectCache(id?: string) {
    if (id) {
        projectCache.delete(id);
        projectBomCache.delete(id);
        projectMakesCache.delete(id);
    } else {
        projectCache.clear();
        projectBomCache.clear();
        projectMakesCache.clear();
    }
    projectListCache.clear();
}

export function patchProjectCache(id: string, patch: Partial<any>) {
    const entry = projectCache.get(id);
    if (entry && entry.data) {
        entry.data = { ...entry.data, ...patch };
        entry.at = Date.now();
    }
}

// ─── Shared realtime channel registry ─────────────────────────────
export type RTListener = (payload: any, table: 'reaction' | 'comment') => void;

interface SharedChannel {
    channel: ReturnType<typeof supabase.channel>;
    listeners: Set<RTListener>;
    refCount: number;
}

const sharedRealtime = new Map<string, SharedChannel>();

export function acquireSharedChannel(
    targetType: string,
    targetId: string,
    listener: RTListener,
): () => void {
    const key = `${targetType}:${targetId}`;
    let entry = sharedRealtime.get(key);
    if (!entry) {
        const listeners = new Set<RTListener>();
        const channel = supabase
            .channel(`rt:${key}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'reaction', filter: `target_id=eq.${targetId}` },
                (payload) => {
                    listeners.forEach((l) => l(payload, 'reaction'));
                },
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'comment', filter: `target_id=eq.${targetId}` },
                (payload) => {
                    listeners.forEach((l) => l(payload, 'comment'));
                },
            )
            .subscribe((status, err) => {
                if (status === 'CHANNEL_ERROR') {
                    console.error(`[realtime] rt:${key} subscription error:`, err);
                }
            });
        entry = { channel, listeners, refCount: 0 };
        sharedRealtime.set(key, entry);
    }
    entry.listeners.add(listener);
    entry.refCount++;

    return () => {
        const e = sharedRealtime.get(key);
        if (!e) return;
        e.listeners.delete(listener);
        e.refCount--;
        if (e.refCount <= 0) {
            supabase.removeChannel(e.channel);
            sharedRealtime.delete(key);
        }
    };
}

// ─── Global cross-mount query cache ───────────────────────────────
const GLOBAL_QUERY_CACHE = new Map<string, { at: number; data: any }>();
const DEFAULT_QUERY_CACHE_TTL_MS = 60_000;

export function invalidateQueryCache(cacheKey: string) {
    GLOBAL_QUERY_CACHE.delete(cacheKey);
}

// ─── Active query refetch registry ────────────────────────────────
const ACTIVE_QUERY_REFETCHERS = new Set<() => void>();

export function refetchAllActiveQueries(): void {
    const snapshot = Array.from(ACTIVE_QUERY_REFETCHERS);
    for (const fn of snapshot) {
        try { fn(); } catch { /* per-hook failure must not stop the cascade */ }
    }
}

// ─── Generic cached query hook ────────────────────────────────────
export function useSupabaseQuery<T>(
    queryFn: (signal: AbortSignal) => Promise<{ data: T | null; error: any }>,
    deps: any[] = [],
    options?: {
        getInitialData?: () => T | null;
        cacheKey?: string;
        cacheTtlMs?: number;
    }
) {
    const cacheKey = options?.cacheKey;
    const cacheTtlMs = options?.cacheTtlMs ?? DEFAULT_QUERY_CACHE_TTL_MS;

    const seed: T | null = (() => {
        if (options?.getInitialData) {
            const v = options.getInitialData();
            if (v != null) return v;
        }
        if (cacheKey) {
            const entry = GLOBAL_QUERY_CACHE.get(cacheKey);
            if (entry && Date.now() - entry.at < cacheTtlMs) {
                return entry.data as T;
            }
        }
        return null;
    })();

    const [data, setData] = useState<T | null>(seed);
    const [loading, setLoading] = useState(seed == null);
    const [error, setError] = useState<string | null>(null);
    const fetchId = useRef(0);
    const hasFetchedOnce = useRef(seed != null);

    const refetch = useCallback(async () => {
        const thisId = ++fetchId.current;
        const controller = new AbortController();

        if (!hasFetchedOnce.current) setLoading(true);
        try {
            const { data, error } = await queryFn(controller.signal);
            if (thisId !== fetchId.current) return;
            setData(data);
            setError(error?.message || null);
            hasFetchedOnce.current = true;
            if (cacheKey && data != null && !error) {
                GLOBAL_QUERY_CACHE.set(cacheKey, { at: Date.now(), data });
            }
        } catch (err: any) {
            if (thisId !== fetchId.current) return;
            setError(err.message || 'Unknown error');
        } finally {
            if (thisId === fetchId.current) setLoading(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);

    useEffect(() => {
        refetch();
        return () => { fetchId.current++; };
    }, [refetch]);

    useEffect(() => {
        ACTIVE_QUERY_REFETCHERS.add(refetch);
        return () => { ACTIVE_QUERY_REFETCHERS.delete(refetch); };
    }, [refetch]);

    return { data, loading, error, refetch };
}
