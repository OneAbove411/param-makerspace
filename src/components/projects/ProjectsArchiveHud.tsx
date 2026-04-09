import React, { useMemo } from 'react';
import { Archive, Layers, Sparkles, Bookmark } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { ProjectListItem } from '../../lib/hooks';

/**
 * §8 Archive Cockpit — HUD Telemetry Strip.
 *
 * Mirrors the Dashboard's BentoStat vocabulary (2-row tile, red
 * shadow, tabular nums, brutal border) so the Projects page reads as
 * a sibling of the Dashboard rather than a visually unrelated page.
 *
 * Four tiles at a glance:
 *   1. TOTAL         — unfiltered total of active public projects.
 *   2. DOMAINS       — distinct non-null domains currently surfaced.
 *   3. NEW THIS WEEK — projects with created_at ≥ now() − 7 days.
 *   4. BOOKMARKS     — the current user's bookmarked count (personal).
 *
 * The HUD reads from the SAME `ProjectListItem[]` array the grid
 * renders so the numbers always match what's on screen. No extra
 * fetches.
 *
 * Accessibility: each tile is a div with `role="status"` and an
 * `aria-label` that packs the value + label; screen readers never
 * read out the decorative icon.
 */

export interface ProjectsArchiveHudProps {
    projects: ProjectListItem[] | null;
    loading: boolean;
    bookmarkedCount: number;
}

export function ProjectsArchiveHud({
    projects,
    loading,
    bookmarkedCount,
}: ProjectsArchiveHudProps) {
    const stats = useMemo(() => {
        const list = projects || [];
        const total = list.length;
        const domains = new Set<string>();
        let thisWeek = 0;
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        for (const p of list) {
            if (p.domain) domains.add(p.domain);
            if (p.created_at && new Date(p.created_at).getTime() >= sevenDaysAgo) {
                thisWeek += 1;
            }
        }
        return { total, domains: domains.size, thisWeek };
    }, [projects]);

    return (
        <div
            className="archive-hud grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10"
            role="region"
            aria-label="Archive telemetry"
        >
            <HudTile
                icon={Archive}
                label="Total Projects"
                value={stats.total}
                loading={loading}
                dark
            />
            <HudTile
                icon={Layers}
                label="Active Domains"
                value={stats.domains}
                loading={loading}
            />
            <HudTile
                icon={Sparkles}
                label="New This Week"
                value={stats.thisWeek}
                loading={loading}
                accent
            />
            <HudTile
                icon={Bookmark}
                label="Your Bookmarks"
                value={bookmarkedCount}
                loading={loading}
            />
        </div>
    );
}

interface HudTileProps {
    icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
    label: string;
    value: number;
    loading: boolean;
    dark?: boolean;
    accent?: boolean;
}

function HudTile({ icon: Icon, label, value, loading, dark, accent }: HudTileProps) {
    return (
        <div
            role="status"
            aria-label={`${label}: ${value}`}
            className={cn(
                'archive-hud-tile relative rounded-2xl p-4 min-h-[120px] overflow-hidden',
                'border-2 flex flex-col justify-between',
                'transition-transform duration-150 ease-out',
                dark
                    ? 'bg-brutal-dark text-brutal-bg border-brutal-dark shadow-[6px_6px_0_0_rgba(196,41,30,0.9)]'
                    : accent
                        ? 'bg-brutal-bg border-brutal-red/40 shadow-[6px_6px_0_0_rgba(196,41,30,0.28)]'
                        : 'bg-brutal-bg border-brutal-dark/20 shadow-[6px_6px_0_0_rgba(196,41,30,0.18)]'
            )}
        >
            <div className="flex items-start justify-between gap-3">
                <Icon
                    className={cn(
                        'w-5 h-5 flex-shrink-0',
                        dark ? 'text-brutal-bg/70' : 'text-brutal-red'
                    )}
                    aria-hidden
                />
                {loading ? (
                    <div
                        className={cn(
                            'h-9 w-14 rounded motion-safe:animate-pulse',
                            dark ? 'bg-brutal-bg/15' : 'bg-brutal-dark/10'
                        )}
                    />
                ) : (
                    <div
                        className={cn(
                            'text-4xl font-heading font-bold tabular-nums leading-none',
                            dark ? 'text-brutal-bg' : 'text-brutal-dark'
                        )}
                    >
                        {value}
                    </div>
                )}
            </div>
            <div
                className={cn(
                    'font-data text-[11px] font-bold uppercase tracking-widest leading-snug',
                    dark ? 'text-brutal-bg/60' : 'text-brutal-dark/60'
                )}
            >
                {label}
            </div>
        </div>
    );
}
