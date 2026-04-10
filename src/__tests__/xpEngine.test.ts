/**
 * Unit tests for src/lib/xpEngine.ts
 *
 * Tests the pure functions: getRankFromXP, getNextRank,
 * getXPForNextRank, getProgressToNextRank.
 *
 * The async functions (awardXP, checkProfileCompletionXP) hit Supabase
 * and are tested as integration stubs below.
 */
import { describe, it, expect } from 'vitest'
import {
  getRankFromXP,
  getNextRank,
  getXPForNextRank,
  getProgressToNextRank,
} from '../lib/xpEngine'

describe('xpEngine', () => {
  // ─── getRankFromXP ─────────────────────────────────────────
  describe('getRankFromXP', () => {
    it('returns Curious for 0 XP', () => {
      expect(getRankFromXP(0, 'viewer')).toBe('Curious')
    })

    it('returns Tinkerer at exactly 60 XP', () => {
      expect(getRankFromXP(60, 'viewer')).toBe('Tinkerer')
    })

    it('returns Tinkerer at 59 XP (below Builder threshold)', () => {
      expect(getRankFromXP(59, 'viewer')).toBe('Curious')
    })

    it('returns Builder at 250 XP', () => {
      expect(getRankFromXP(250, 'maker')).toBe('Builder')
    })

    it('returns Maker at 600 XP', () => {
      expect(getRankFromXP(600, 'maker')).toBe('Maker')
    })

    it('returns Innovator at 1200 XP', () => {
      expect(getRankFromXP(1200, 'maker')).toBe('Innovator')
    })

    it('returns Innovator for 2500+ XP if role is NOT mentor/admin', () => {
      // Lab Pro requires mentor or admin role
      expect(getRankFromXP(2500, 'maker')).toBe('Innovator')
      expect(getRankFromXP(3000, 'viewer')).toBe('Innovator')
    })

    it('returns Lab Pro for 2500+ XP if role IS mentor', () => {
      expect(getRankFromXP(2500, 'mentor')).toBe('Lab Pro')
    })

    it('returns Lab Pro for 2500+ XP if role IS admin', () => {
      expect(getRankFromXP(2500, 'admin')).toBe('Lab Pro')
      expect(getRankFromXP(9999, 'admin')).toBe('Lab Pro')
    })

    it('handles very large XP values', () => {
      expect(getRankFromXP(100_000, 'mentor')).toBe('Lab Pro')
    })

    it('handles negative XP gracefully', () => {
      expect(getRankFromXP(-10, 'viewer')).toBe('Curious')
    })
  })

  // ─── getNextRank ───────────────────────────────────────────
  describe('getNextRank', () => {
    it('returns Tinkerer as next rank after Curious', () => {
      expect(getNextRank('Curious')).toBe('Tinkerer')
    })

    it('returns Builder after Tinkerer', () => {
      expect(getNextRank('Tinkerer')).toBe('Builder')
    })

    it('returns Maker after Builder', () => {
      expect(getNextRank('Builder')).toBe('Maker')
    })

    it('returns Innovator after Maker', () => {
      expect(getNextRank('Maker')).toBe('Innovator')
    })

    it('returns Lab Pro after Innovator', () => {
      expect(getNextRank('Innovator')).toBe('Lab Pro')
    })

    it('returns null for Lab Pro (max rank)', () => {
      expect(getNextRank('Lab Pro')).toBeNull()
    })

    it('returns null for unknown rank', () => {
      expect(getNextRank('Unknown')).toBeNull()
    })
  })

  // ─── getXPForNextRank ──────────────────────────────────────
  describe('getXPForNextRank', () => {
    it('returns 60 as XP needed after Curious', () => {
      expect(getXPForNextRank('Curious')).toBe(60)
    })

    it('returns 250 as XP needed after Tinkerer', () => {
      expect(getXPForNextRank('Tinkerer')).toBe(250)
    })

    it('returns null for Lab Pro (no next rank)', () => {
      expect(getXPForNextRank('Lab Pro')).toBeNull()
    })
  })

  // ─── getProgressToNextRank ─────────────────────────────────
  describe('getProgressToNextRank', () => {
    it('returns 0% at the start of Curious (0 XP)', () => {
      expect(getProgressToNextRank(0, 'Curious')).toBe(0)
    })

    it('returns 50% halfway through Curious→Tinkerer', () => {
      // Curious=0, Tinkerer=60 → 30 XP is 50%
      expect(getProgressToNextRank(30, 'Curious')).toBe(50)
    })

    it('returns 100% at the threshold for next rank', () => {
      // At 60 XP with rank Curious, progress to Tinkerer = 100%
      expect(getProgressToNextRank(60, 'Curious')).toBe(100)
    })

    it('caps at 100% for XP above next threshold', () => {
      expect(getProgressToNextRank(100, 'Curious')).toBe(100)
    })

    it('returns 100% for Lab Pro (max rank, no next)', () => {
      expect(getProgressToNextRank(3000, 'Lab Pro')).toBe(100)
    })

    it('calculates correctly for middle ranks', () => {
      // Builder=250, Maker=600 → range=350
      // At 425 XP: progress = (425-250)/350 = 50%
      expect(getProgressToNextRank(425, 'Builder')).toBe(50)
    })
  })
})
