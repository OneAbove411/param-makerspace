/**
 * Platform constants — single source of truth.
 *
 * Previously duplicated across xpEngine.ts, badgeEngine.ts,
 * progressionBadges.ts, and rankAccess.ts. Import from here.
 *
 * IMPORTANT: if you change a threshold or add a rank, update the
 * corresponding Supabase check constraints / triggers as well.
 */

// ─── RANKS ────────────────────────────────────────────────────────

/** Ordered list of all user ranks from lowest to highest. */
export const RANK_ORDER: string[] = [
    'Curious',
    'Tinkerer',
    'Builder',
    'Maker',
    'Innovator',
    'Lab Pro',
];

export type RankName = 'Curious' | 'Tinkerer' | 'Builder' | 'Maker' | 'Innovator' | 'Lab Pro';

/** XP required to reach each rank. */
export const RANK_THRESHOLDS: Record<string, number> = {
    'Curious':   0,
    'Tinkerer':  60,
    'Builder':   250,
    'Maker':     600,
    'Innovator': 1200,
    'Lab Pro':   2500,
};

/** Tailwind-compatible color tokens per rank (used by RankBadge, profile, etc.). */
export const RANK_COLORS: Record<RankName, string> = {
    'Curious':   'text-brutal-dark/40',
    'Tinkerer':  'text-brutal-dark/60',
    'Builder':   'text-brutal-dark/80',
    'Maker':     'text-brutal-dark',
    'Innovator': 'text-brutal-red',
    'Lab Pro':   'text-brutal-red',
};

// ─── XP REWARDS ──────────────────────────────────────────────────

export const XP_REWARDS = {
    tier1_challenge:    50,
    tier2_challenge:    150,
    tier3_challenge:    400,
    project_approved:   100,
    project_active:     200,
    event_registered:   25,
    event_presented:    75,
    profile_completed:  50,
    first_login:        10,
} as const;

export type XPReason = keyof typeof XP_REWARDS;

// ─── TIERS ───────────────────────────────────────────────────────

export const TIERS = ['Tier 1', 'Tier 2', 'Tier 3'] as const;
export type Tier = (typeof TIERS)[number];

// ─── BADGE DOMAINS ───────────────────────────────────────────────
// The canonical set of maker domains used for badge generation and
// domain-level progression. Page-specific filter lists (which include
// extra items like "Woodworking", "IoT", etc.) are intentionally
// kept in their respective components because they serve a different
// purpose (UI filtering vs badge/progression tracking).

export const BADGE_DOMAINS = [
    'Electronics',
    'Robotics',
    'AI',
    'Design',
    'Fabrication',
    'Bio',
    'Interdisciplinary',
] as const;

export type BadgeDomain = (typeof BADGE_DOMAINS)[number];

// ─── BADGE TYPES ─────────────────────────────────────────────────

export const BADGE_TYPES = ['achievement', 'skill', 'role', 'event'] as const;
export type BadgeType = (typeof BADGE_TYPES)[number];
