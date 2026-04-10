import { BADGE_DOMAINS } from './constants'

/**
 * Aggregate a user's domain badges into a per-domain level map.
 *
 * Domain badges follow the naming convention "Electronics T1", "Robotics T2", etc.
 * This utility scans all earned badges, extracts the highest tier per domain,
 * and returns a map like: { Electronics: "Tier 2", Robotics: "Tier 1" }.
 *
 * Users with no domain badges in a given domain get "Explorer" as a default.
 */

interface BadgeLike {
    name: string
    domain?: string | null
    tier?: string | null
}

// Tier ordering for comparison
const TIER_ORDER: Record<string, number> = {
    'tier 1': 1,
    'tier 2': 2,
    'tier 3': 3,
    't1': 1,
    't2': 2,
    't3': 3,
}

function tierRank(tier: string | null | undefined): number {
    if (!tier) return 0
    return TIER_ORDER[tier.toLowerCase()] || 0
}

function tierLabel(rank: number): string {
    if (rank >= 3) return 'Tier 3'
    if (rank >= 2) return 'Tier 2'
    if (rank >= 1) return 'Tier 1'
    return 'Explorer'
}

export interface DomainLevel {
    domain: string
    level: string      // "Explorer" | "Tier 1" | "Tier 2" | "Tier 3"
    tierRank: number   // 0–3 for sorting/comparison
}

/**
 * Compute the highest domain level for each domain based on earned badges.
 * Only includes domains where the user has at least one badge (+ Explorer for the rest).
 *
 * @param badges – the user's earned badges (any shape with name/domain/tier)
 * @param includeEmpty – if true, include domains with no badges as "Explorer"
 */
export function computeDomainLevels(
    badges: BadgeLike[],
    includeEmpty = false,
): DomainLevel[] {
    const domainMax = new Map<string, number>()

    for (const badge of badges) {
        const domain = badge.domain?.trim()
        if (!domain) continue

        // Normalise domain to match BADGE_DOMAINS casing
        const canonical = BADGE_DOMAINS.find(d => d.toLowerCase() === domain.toLowerCase())
        if (!canonical) continue

        const rank = tierRank(badge.tier)
        // Also check if the badge name encodes a tier (e.g., "Electronics T2")
        const nameMatch = badge.name.match(/\bT([123])\b/i)
        const nameRank = nameMatch ? parseInt(nameMatch[1], 10) : 0

        const best = Math.max(rank, nameRank)
        const current = domainMax.get(canonical) || 0
        if (best > current) {
            domainMax.set(canonical, best)
        }
    }

    const results: DomainLevel[] = []

    for (const domain of BADGE_DOMAINS) {
        const rank = domainMax.get(domain)
        if (rank !== undefined) {
            results.push({ domain, level: tierLabel(rank), tierRank: rank })
        } else if (includeEmpty) {
            results.push({ domain, level: 'Explorer', tierRank: 0 })
        }
    }

    return results
}
