/**
 * Badge criteria fallback generator.
 *
 * Most badges in the database have empty `criteria` fields. This utility
 * generates human-readable criteria from badge metadata (name, tier, domain,
 * badge_type) using the rules already encoded in badgeEngine.ts and
 * progressionBadges.ts.
 *
 * Used as a fallback when badge.criteria is empty or missing.
 */

import { PROGRESSION_BADGES, DOMAIN_BADGES } from './progressionBadges';

/** Lookup map: badge name → criteria string from static definitions. */
const CRITERIA_MAP = new Map<string, string>();

for (const b of PROGRESSION_BADGES) {
    CRITERIA_MAP.set(b.name.toLowerCase(), b.criteria);
}

for (const b of DOMAIN_BADGES) {
    CRITERIA_MAP.set(b.name.toLowerCase(), b.criteria);
}

/**
 * Generate human-readable criteria for a badge.
 *
 * Priority:
 *   1. If badge.criteria is non-empty, return it as-is.
 *   2. Look up the badge name in static PROGRESSION_BADGES / DOMAIN_BADGES.
 *   3. Infer from metadata patterns (domain + tier combos).
 *   4. Fallback to a generic description.
 */
export function getBadgeCriteria(badge: {
    name: string;
    criteria?: string | null;
    tier?: string | null;
    domain?: string | null;
    badge_type?: string | null;
}): string {
    // 1. Existing criteria in DB
    if (badge.criteria && badge.criteria.trim().length > 0) {
        return badge.criteria;
    }

    // 2. Static lookup by name
    const staticCriteria = CRITERIA_MAP.get(badge.name.toLowerCase());
    if (staticCriteria) {
        return staticCriteria;
    }

    // 3. Infer from domain + tier pattern
    // Domain badges follow the pattern: "{Domain} T{n}" or "{Domain} {Tier}"
    const domainTierMatch = badge.name.match(/^(.+?)\s+T(\d)$/i);
    if (domainTierMatch) {
        const domain = domainTierMatch[1];
        const tierNum = domainTierMatch[2];
        const xpMap: Record<string, number> = { '1': 50, '2': 150, '3': 400 };
        const xp = xpMap[tierNum] || 50;
        return `Complete and verify a Tier ${tierNum} challenge in ${domain}. Earns +${xp} XP.`;
    }

    // If we have domain and tier metadata
    if (badge.domain && badge.domain !== 'General' && badge.tier) {
        return `Complete a ${badge.tier} challenge in ${badge.domain}.`;
    }

    // 4. Infer from badge_type
    if (badge.badge_type === 'event') {
        return 'Participate in the associated event.';
    }

    if (badge.badge_type === 'role') {
        return 'Granted when you achieve this role in the community.';
    }

    if (badge.badge_type === 'skill' && badge.domain) {
        return `Demonstrate skill in ${badge.domain}.`;
    }

    // 5. Tier-based generic
    if (badge.tier === 'Tier 1') {
        return 'Complete a Tier 1 Explorer challenge.';
    }
    if (badge.tier === 'Tier 2') {
        return 'Complete a Tier 2 Solver challenge.';
    }
    if (badge.tier === 'Tier 3') {
        return 'Complete a Tier 3 Architect challenge or project.';
    }

    // 6. Ultimate fallback
    return 'Keep exploring and building to earn this badge.';
}
