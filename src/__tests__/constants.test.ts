/**
 * Unit tests for src/lib/constants.ts
 *
 * Verifies the single source of truth for ranks, XP thresholds,
 * tiers, badge domains, and badge types.
 */
import { describe, it, expect } from 'vitest'
import {
  RANK_ORDER,
  RANK_THRESHOLDS,
  RANK_COLORS,
  XP_REWARDS,
  TIERS,
  BADGE_DOMAINS,
  BADGE_TYPES,
} from '../lib/constants'
import type { RankName } from '../lib/constants'

describe('constants', () => {
  describe('RANK_ORDER', () => {
    it('has exactly 6 ranks in ascending order', () => {
      expect(RANK_ORDER).toHaveLength(6)
      expect(RANK_ORDER).toEqual([
        'Curious',
        'Tinkerer',
        'Builder',
        'Maker',
        'Innovator',
        'Lab Pro',
      ])
    })
  })

  describe('RANK_THRESHOLDS', () => {
    it('has a threshold for every rank', () => {
      for (const rank of RANK_ORDER) {
        expect(RANK_THRESHOLDS).toHaveProperty(rank)
        expect(typeof RANK_THRESHOLDS[rank]).toBe('number')
      }
    })

    it('starts at 0 XP for Curious', () => {
      expect(RANK_THRESHOLDS['Curious']).toBe(0)
    })

    it('thresholds are strictly ascending', () => {
      for (let i = 1; i < RANK_ORDER.length; i++) {
        const prev = RANK_THRESHOLDS[RANK_ORDER[i - 1]]
        const curr = RANK_THRESHOLDS[RANK_ORDER[i]]
        expect(curr).toBeGreaterThan(prev)
      }
    })

    it('matches documented XP values', () => {
      expect(RANK_THRESHOLDS['Tinkerer']).toBe(60)
      expect(RANK_THRESHOLDS['Builder']).toBe(250)
      expect(RANK_THRESHOLDS['Maker']).toBe(600)
      expect(RANK_THRESHOLDS['Innovator']).toBe(1200)
      expect(RANK_THRESHOLDS['Lab Pro']).toBe(2500)
    })
  })

  describe('RANK_COLORS', () => {
    it('has a Tailwind class for every rank', () => {
      for (const rank of RANK_ORDER) {
        expect(RANK_COLORS).toHaveProperty(rank as RankName)
        expect(RANK_COLORS[rank as RankName]).toMatch(/^text-/)
      }
    })
  })

  describe('XP_REWARDS', () => {
    it('has positive values for all reward types', () => {
      const keys = Object.keys(XP_REWARDS) as Array<keyof typeof XP_REWARDS>
      expect(keys.length).toBeGreaterThanOrEqual(8)
      for (const key of keys) {
        expect(XP_REWARDS[key]).toBeGreaterThan(0)
      }
    })

    it('tier3 > tier2 > tier1 challenge XP', () => {
      expect(XP_REWARDS.tier3_challenge).toBeGreaterThan(XP_REWARDS.tier2_challenge)
      expect(XP_REWARDS.tier2_challenge).toBeGreaterThan(XP_REWARDS.tier1_challenge)
    })

    it('project_active > project_approved XP', () => {
      expect(XP_REWARDS.project_active).toBeGreaterThan(XP_REWARDS.project_approved)
    })
  })

  describe('TIERS', () => {
    it('has exactly 3 tiers', () => {
      expect(TIERS).toHaveLength(3)
      expect(TIERS).toEqual(['Tier 1', 'Tier 2', 'Tier 3'])
    })
  })

  describe('BADGE_DOMAINS', () => {
    it('includes all PRD-specified domains', () => {
      const expected = [
        'Electronics',
        'Robotics',
        'AI',
        'Design',
        'Fabrication',
        'Bio',
        'Interdisciplinary',
      ]
      for (const domain of expected) {
        expect(BADGE_DOMAINS).toContain(domain)
      }
    })

    it('has no duplicates', () => {
      const unique = new Set(BADGE_DOMAINS)
      expect(unique.size).toBe(BADGE_DOMAINS.length)
    })
  })

  describe('BADGE_TYPES', () => {
    it('has the expected types', () => {
      expect(BADGE_TYPES).toEqual(['achievement', 'skill', 'role', 'event'])
    })
  })
})
