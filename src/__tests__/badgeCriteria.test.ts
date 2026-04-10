import { describe, it, expect } from 'vitest';
import { getBadgeCriteria } from '../lib/badgeCriteria';

describe('getBadgeCriteria', () => {
    it('returns existing criteria when present', () => {
        const result = getBadgeCriteria({
            name: 'Custom Badge',
            criteria: 'Do something specific.',
        });
        expect(result).toBe('Do something specific.');
    });

    it('returns static criteria for progression badges', () => {
        expect(getBadgeCriteria({ name: 'Curious', criteria: '' })).toMatch(/account/i);
        expect(getBadgeCriteria({ name: 'Tinkerer', criteria: null })).toMatch(/Tier 1/i);
        expect(getBadgeCriteria({ name: 'Builder', criteria: '' })).toMatch(/project/i);
        expect(getBadgeCriteria({ name: 'Maker', criteria: '' })).toMatch(/project/i);
        expect(getBadgeCriteria({ name: 'Innovator', criteria: '' })).toMatch(/Tier 3/i);
        expect(getBadgeCriteria({ name: 'Lab Pro', criteria: '' })).toMatch(/Mentor/i);
    });

    it('returns static criteria for domain badges', () => {
        expect(getBadgeCriteria({ name: 'Electronics T1', criteria: '' })).toMatch(/Tier 1.*Electronics/i);
        expect(getBadgeCriteria({ name: 'Robotics T2', criteria: '' })).toMatch(/Tier 2.*Robotics/i);
        expect(getBadgeCriteria({ name: 'AI T3', criteria: '' })).toMatch(/Tier 3.*AI/i);
    });

    it('infers from domain + tier pattern for unknown badges', () => {
        const result = getBadgeCriteria({ name: 'Quantum T2', criteria: '' });
        expect(result).toMatch(/Tier 2.*Quantum/i);
    });

    it('infers from metadata when name is not recognized', () => {
        const result = getBadgeCriteria({
            name: 'Unknown Badge',
            criteria: '',
            domain: 'Electronics',
            tier: 'Tier 2',
            badge_type: 'skill',
        });
        expect(result).toMatch(/Tier 2.*Electronics/i);
    });

    it('handles event badges', () => {
        const result = getBadgeCriteria({
            name: 'HackWire 2025',
            criteria: '',
            badge_type: 'event',
        });
        expect(result).toMatch(/event/i);
    });

    it('provides a fallback for completely unknown badges', () => {
        const result = getBadgeCriteria({ name: 'Mystery', criteria: '' });
        expect(result.length).toBeGreaterThan(0);
    });

    it('is case-insensitive for name lookup', () => {
        expect(getBadgeCriteria({ name: 'curious', criteria: '' })).toMatch(/account/i);
        expect(getBadgeCriteria({ name: 'TINKERER', criteria: '' })).toMatch(/Tier 1/i);
    });
});
