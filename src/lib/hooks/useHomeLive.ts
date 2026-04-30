import { useEffect, useRef, useState } from 'react';
import { supabase } from '../supabase';

/**
 * useHomeLive — single source of truth for the home page's live data.
 *
 * Hoists the queries that WelcomeHero and LivePulse used to make
 * independently into one combined call. Subscribers share a 30s cache so
 * mounting the hook in two places only fires the network once. Refetches
 * every 30 seconds while at least one consumer is mounted.
 *
 * Returns:
 *  - activeMakers: distinct users who earned XP in the last 24h, or null
 *    while loading.
 *  - upcomingEvents: events from the last 30 days through the future,
 *    sorted ascending. Each carries a `completed` flag.
 *  - lastUpdated: epoch ms of the most recent successful fetch (null while
 *    initial load is in flight).
 *  - loading: true until the first fetch resolves.
 *  - refetch: force a fresh fetch (e.g. for a manual refresh affordance).
 */

export interface HomeLiveEvent {
    id: string;
    title: string;
    date: string;
    end_date: string | null;
    completed: boolean;
}

export interface HomeLiveData {
    activeMakers: number | null;
    upcomingEvents: HomeLiveEvent[];
    lastUpdated: number | null;
    loading: boolean;
    refetch: () => void;
}

interface CacheState {
    activeMakers: number | null;
    upcomingEvents: HomeLiveEvent[];
    lastUpdated: number | null;
    fetchedAt: number;
}

const CACHE_TTL_MS = 30_000;

let cache: CacheState | null = null;
let inflight: Promise<CacheState> | null = null;
const subscribers = new Set<(s: CacheState) => void>();
let pollTimer: number | null = null;

function notify(state: CacheState) {
    subscribers.forEach(fn => {
        try { fn(state); } catch { /* ignore */ }
    });
}

async function doFetch(signal?: AbortSignal): Promise<CacheState> {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Two parallel queries — one combined network round-trip from the
    // browser's perspective. We deliberately don't use Promise.allSettled
    // because we want the cache to reflect the freshest available state
    // even if one query is slow.
    const [{ data: xpRows }, { data: eventRows }] = await Promise.all([
        supabase
            .from('xp_event')
            .select('user_id')
            .gte('created_at', since),
        supabase
            .from('event')
            .select('id, title, date, end_date')
            .gte('date', thirtyDaysAgo)
            .order('date', { ascending: true })
            .limit(12),
    ]);

    if (signal?.aborted) {
        throw new DOMException('aborted', 'AbortError');
    }

    const distinct = xpRows
        ? new Set((xpRows as Array<{ user_id: string }>).map(r => r.user_id)).size
        : 0;

    const now = new Date();
    const events: HomeLiveEvent[] = (eventRows || []).map((ev) => {
        const e = ev as { id: string; title: string; date: string; end_date: string | null };
        const endDate = e.end_date ? new Date(e.end_date) : new Date(e.date);
        return {
            id: e.id,
            title: e.title,
            date: e.date,
            end_date: e.end_date,
            completed: endDate < now,
        };
    });

    const fetchedAt = Date.now();
    const next: CacheState = {
        activeMakers: distinct,
        upcomingEvents: events,
        lastUpdated: fetchedAt,
        fetchedAt,
    };
    cache = next;
    notify(next);
    return next;
}

function ensureFetch(force = false): Promise<CacheState> {
    if (!force && cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
        return Promise.resolve(cache);
    }
    if (inflight) return inflight;
    inflight = doFetch().finally(() => { inflight = null; });
    return inflight;
}

function startPolling() {
    if (pollTimer !== null) return;
    pollTimer = window.setInterval(() => {
        if (subscribers.size === 0) return;
        ensureFetch(true).catch(() => { /* swallow — keep cache */ });
    }, CACHE_TTL_MS);
}

function stopPollingIfIdle() {
    if (subscribers.size === 0 && pollTimer !== null) {
        window.clearInterval(pollTimer);
        pollTimer = null;
    }
}

/**
 * Warm the module-level cache so that when useHomeLive() mounts later
 * the data is already present.  Called by Home.tsx during the boot
 * overlay phase.  Returns a promise that settles once the first fetch
 * completes (or the cache is already warm).
 */
export function prefetchHomeLive(): Promise<void> {
    return ensureFetch().then(() => {});
}

export function useHomeLive(): HomeLiveData {
    const [state, setState] = useState<CacheState | null>(cache);
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        const sub = (s: CacheState) => {
            if (mountedRef.current) setState(s);
        };
        subscribers.add(sub);
        startPolling();

        // Kick off initial fetch (or hand back cache).
        ensureFetch().then(s => {
            if (mountedRef.current) setState(s);
        }).catch(() => { /* keep cache */ });

        return () => {
            mountedRef.current = false;
            subscribers.delete(sub);
            stopPollingIfIdle();
        };
    }, []);

    const refetch = () => {
        ensureFetch(true).catch(() => { /* ignore */ });
    };

    return {
        activeMakers: state?.activeMakers ?? null,
        upcomingEvents: state?.upcomingEvents ?? [],
        lastUpdated: state?.lastUpdated ?? null,
        loading: state === null,
        refetch,
    };
}
