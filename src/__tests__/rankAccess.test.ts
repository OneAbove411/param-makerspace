/**
 * Unit tests for src/lib/rankAccess.ts
 *
 * Tests the feature-gate logic that controls what users can do
 * based on their rank.
 */
import { describe, it, expect } from 'vitest'
import { canAccess, getRequiredRank, type Feature } from '../lib/rankAccess'

describe('rankAccess', () => {
  // ─── canAccess ─────────────────────────────────────────────
  describe('canAccess', () => {
    // Curious can access features with min rank Curious
    it('Curious can view makers directory', () => {
      expect(canAccess('Curious', 'view_makers_directory')).toBe(true)
    })

    it('Curious can join events', () => {
      expect(canAccess('Curious', 'join_event')).toBe(true)
    })

    it('Curious cannot create a project (requires Tinkerer)', () => {
      expect(canAccess('Curious', 'create_project')).toBe(false)
    })

    it('Curious cannot submit build challenge (requires Tinkerer)', () => {
      expect(canAccess('Curious', 'submit_build_challenge')).toBe(false)
    })

    // Tinkerer gains project creation and challenge submission
    it('Tinkerer can create a project', () => {
      expect(canAccess('Tinkerer', 'create_project')).toBe(true)
    })

    it('Tinkerer can earn domain badges', () => {
      expect(canAccess('Tinkerer', 'earn_domain_badges')).toBe(true)
    })

    it('Tinkerer cannot view Tier 3 challenges (requires Builder)', () => {
      expect(canAccess('Tinkerer', 'view_tier3_challenges')).toBe(false)
    })

    // Builder gains T3 visibility and showcase booking
    it('Builder can view Tier 3 challenges', () => {
      expect(canAccess('Builder', 'view_tier3_challenges')).toBe(true)
    })

    it('Builder can book showcase slot', () => {
      expect(canAccess('Builder', 'book_showcase_slot')).toBe(true)
    })

    it('Builder cannot propose T3 project (requires Maker)', () => {
      expect(canAccess('Builder', 'propose_t3_project')).toBe(false)
    })

    // Maker gains T3 project proposals
    it('Maker can propose T3 project', () => {
      expect(canAccess('Maker', 'propose_t3_project')).toBe(true)
    })

    it('Maker cannot request mentor (requires Innovator)', () => {
      expect(canAccess('Maker', 'mentor_request')).toBe(false)
    })

    // Innovator gains mentor requests
    it('Innovator can request mentor', () => {
      expect(canAccess('Innovator', 'mentor_request')).toBe(true)
    })

    // Lab Pro (highest) can access everything
    it('Lab Pro can access all features', () => {
      const features: Feature[] = [
        'create_project',
        'join_event',
        'submit_build_challenge',
        'book_showcase_slot',
        'view_tier2_challenges',
        'view_tier3_challenges',
        'propose_t3_project',
        'view_makers_directory',
        'earn_domain_badges',
        'mentor_request',
      ]
      for (const feature of features) {
        expect(canAccess('Lab Pro', feature)).toBe(true)
      }
    })

    // Higher ranks inherit lower rank access
    it('higher ranks inherit all lower-rank features', () => {
      // Builder should have everything Tinkerer has
      expect(canAccess('Builder', 'create_project')).toBe(true)
      expect(canAccess('Builder', 'submit_build_challenge')).toBe(true)
      expect(canAccess('Builder', 'join_event')).toBe(true)
    })
  })

  // ─── getRequiredRank ───────────────────────────────────────
  describe('getRequiredRank', () => {
    it('returns correct rank for each feature', () => {
      expect(getRequiredRank('view_makers_directory')).toBe('Curious')
      expect(getRequiredRank('join_event')).toBe('Curious')
      expect(getRequiredRank('create_project')).toBe('Tinkerer')
      expect(getRequiredRank('view_tier3_challenges')).toBe('Builder')
      expect(getRequiredRank('propose_t3_project')).toBe('Maker')
      expect(getRequiredRank('mentor_request')).toBe('Innovator')
    })
  })
})
