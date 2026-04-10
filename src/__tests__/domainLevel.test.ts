import { describe, it, expect } from 'vitest'
import { computeDomainLevels } from '../lib/domainLevel'

describe('computeDomainLevels', () => {
    it('returns empty array when no domain badges', () => {
        const badges = [{ name: 'Curious', domain: 'General', tier: 'standard' }]
        expect(computeDomainLevels(badges)).toEqual([])
    })

    it('computes highest tier per domain from badge tier field', () => {
        const badges = [
            { name: 'Electronics T1', domain: 'Electronics', tier: 'Tier 1' },
            { name: 'Electronics T2', domain: 'Electronics', tier: 'Tier 2' },
            { name: 'Robotics T1', domain: 'Robotics', tier: 'Tier 1' },
        ]
        const levels = computeDomainLevels(badges)
        expect(levels).toHaveLength(2)
        expect(levels.find(l => l.domain === 'Electronics')).toEqual({
            domain: 'Electronics', level: 'Tier 2', tierRank: 2,
        })
        expect(levels.find(l => l.domain === 'Robotics')).toEqual({
            domain: 'Robotics', level: 'Tier 1', tierRank: 1,
        })
    })

    it('extracts tier from badge name pattern when tier field is missing', () => {
        const badges = [
            { name: 'AI T3', domain: 'AI', tier: null },
        ]
        const levels = computeDomainLevels(badges)
        expect(levels).toHaveLength(1)
        expect(levels[0]).toEqual({ domain: 'AI', level: 'Tier 3', tierRank: 3 })
    })

    it('includes empty domains as Explorer when includeEmpty is true', () => {
        const badges = [
            { name: 'Electronics T1', domain: 'Electronics', tier: 'Tier 1' },
        ]
        const levels = computeDomainLevels(badges, true)
        // Should include all 7 BADGE_DOMAINS
        expect(levels.length).toBe(7)
        const elec = levels.find(l => l.domain === 'Electronics')
        const robo = levels.find(l => l.domain === 'Robotics')
        expect(elec?.level).toBe('Tier 1')
        expect(robo?.level).toBe('Explorer')
    })

    it('ignores badges with non-standard domains', () => {
        const badges = [
            { name: 'Special Badge', domain: 'QuantumComputing', tier: 'Tier 1' },
        ]
        expect(computeDomainLevels(badges)).toEqual([])
    })

    it('handles case-insensitive domain matching', () => {
        const badges = [
            { name: 'fabrication T2', domain: 'fabrication', tier: 'Tier 2' },
        ]
        const levels = computeDomainLevels(badges)
        expect(levels).toHaveLength(1)
        expect(levels[0].domain).toBe('Fabrication') // Canonical casing
        expect(levels[0].level).toBe('Tier 2')
    })

    it('preserves BADGE_DOMAINS ordering in output', () => {
        const badges = [
            { name: 'Bio T1', domain: 'Bio', tier: 'Tier 1' },
            { name: 'AI T2', domain: 'AI', tier: 'Tier 2' },
            { name: 'Electronics T1', domain: 'Electronics', tier: 'Tier 1' },
        ]
        const levels = computeDomainLevels(badges)
        // BADGE_DOMAINS order: Electronics, Robotics, AI, Design, Fabrication, Bio, Interdisciplinary
        expect(levels.map(l => l.domain)).toEqual(['Electronics', 'AI', 'Bio'])
    })
})
