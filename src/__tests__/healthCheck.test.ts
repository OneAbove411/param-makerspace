/**
 * healthCheck.ts unit tests — post-simplification contract.
 *
 * What's required to publish (after the UX-simplification pass):
 *   - Title (always).
 *   - Start date (parseable, past OR future — admins post recaps).
 *   - Tech Tuesday: external_rsvp_url must be a Luma link.
 *   - Build Challenge: prize_summary; submission_deadline only checked
 *     for *consistency* (must be after start IF set).
 *   - Maker Meetup: application_deadline only checked for *consistency*
 *     (must be before start IF set).
 *
 * What's NO LONGER required (intentionally, see
 * misc/EVENT_FLOW_SIMPLIFICATION_PLAN.md):
 *   - Tagline (editorial polish, not a publish blocker).
 *   - Cover image (defaults from event_series; the public page
 *     gracefully renders without one).
 *   - Location (Tech Tuesdays in particular often have no physical
 *     venue, just a Luma RSVP).
 *   - Body block count (Luma is the canonical description for TTs).
 *   - Speaker name (autofilled / can be edited post-publish).
 *   - Slot length > 0 for Maker Meetup (defaulted to 15 in blank state).
 */

import { describe, it, expect } from 'vitest';
import { computeHealth } from '../pages/admin/event-wizard/healthCheck';
import { blankWizardState, type WizardFormState } from '../pages/admin/event-wizard/wizardTypes';
import type { EventBlock } from '../lib/database.types';

function fullyValidTechTuesday(start: Date): WizardFormState {
    const base = blankWizardState('tech_tuesday');
    base.title = 'AI & Robotics Demo';
    base.tagline = 'See PAIR ship products live';
    base.cover_image_url = 'https://example.com/cover.png';
    base.start_date = start.toISOString();
    base.location = 'ParSEC Whitefield';
    const blocks: EventBlock[] = [
        { type: 'paragraph', text: 'Intro' },
        { type: 'paragraph', text: 'Demo' },
        { type: 'paragraph', text: 'Q&A' },
    ];
    base.description_blocks = blocks;
    if (base.typeFields.kind === 'tech_tuesday') {
        base.typeFields.external_rsvp_url = 'https://lu.ma/foo';
        base.typeFields.speaker_name = 'Hari';
    }
    return base;
}

describe('computeHealth', () => {
    it('flags only the new required-set on a blank state', () => {
        const blank = blankWizardState('tech_tuesday');
        const h = computeHealth(blank);
        expect(h.allPassing).toBe(false);
        const failingIds = h.items.filter((i) => i.status === 'fail').map((i) => i.id);
        // Required after simplification:
        expect(failingIds).toContain('title');
        expect(failingIds).toContain('start_date');
        expect(failingIds).toContain('luma');
        // Explicitly NOT required anymore:
        expect(failingIds).not.toContain('tagline');
        expect(failingIds).not.toContain('cover');
        expect(failingIds).not.toContain('location');
        expect(failingIds).not.toContain('body');
        expect(failingIds).not.toContain('speaker');
    });

    it('passes a Tech Tuesday with just title + date + Luma URL', () => {
        // The whole point of the simplification: a TT with the Luma URL
        // and a date is publishable. Tagline / cover / body / location
        // are optional polish.
        const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const minimal = blankWizardState('tech_tuesday');
        minimal.title = 'Tech Tuesday — AI demo';
        minimal.start_date = future.toISOString();
        if (minimal.typeFields.kind === 'tech_tuesday') {
            minimal.typeFields.external_rsvp_url = 'https://lu.ma/demo';
        }
        const h = computeHealth(minimal);
        expect(h.allPassing).toBe(true);
    });

    it('passes a fully filled future Tech Tuesday', () => {
        const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const h = computeHealth(fullyValidTechTuesday(future));
        expect(h.allPassing).toBe(true);
    });

    it('ALSO passes a past Tech Tuesday — admins can post recap entries', () => {
        // This is the regression: the wizard previously failed publish
        // for any non-future start_date with "Start date is in the
        // future". Posting last week's session was impossible.
        const past = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const h = computeHealth(fullyValidTechTuesday(past));
        expect(h.allPassing).toBe(true);
        const start = h.items.find((i) => i.id === 'start_date');
        expect(start?.status).toBe('ok');
        expect(start?.label).toMatch(/set/i);
    });

    it('still rejects an unparseable start_date', () => {
        const s = fullyValidTechTuesday(new Date());
        s.start_date = 'not-a-date';
        const h = computeHealth(s);
        const start = h.items.find((i) => i.id === 'start_date');
        expect(start?.status).toBe('fail');
    });

    it('rejects a non-Luma external RSVP URL', () => {
        const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const s = fullyValidTechTuesday(future);
        if (s.typeFields.kind === 'tech_tuesday') {
            s.typeFields.external_rsvp_url = 'https://example.com/foo';
        }
        const h = computeHealth(s);
        const luma = h.items.find((i) => i.id === 'luma');
        expect(luma?.status).toBe('fail');
    });

    it('build_challenge: submission deadline must be after start IF SET', () => {
        const start = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const base = blankWizardState('build_challenge');
        base.title = 'Challenge';
        base.start_date = start.toISOString();
        if (base.typeFields.kind === 'build_challenge') {
            base.typeFields.prize_summary = '₹50k';
            base.typeFields.submission_deadline = new Date(start.getTime() - 1000).toISOString();
        }
        const h = computeHealth(base);
        const sub = h.items.find((i) => i.id === 'submission_after_start');
        expect(sub?.status).toBe('fail');
    });

    it('build_challenge: missing submission deadline is fine (consistency-only)', () => {
        // The wizard now defaults submission_deadline to start+7d via
        // applySmartTypeDefaults; if the mentor clears it, we should
        // not block publish. Cross-field consistency only fires when a
        // value IS set and conflicts with start_date.
        const start = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const base = blankWizardState('build_challenge');
        base.title = 'Challenge';
        base.start_date = start.toISOString();
        if (base.typeFields.kind === 'build_challenge') {
            base.typeFields.prize_summary = '₹50k';
            base.typeFields.submission_deadline = '';
        }
        const h = computeHealth(base);
        const sub = h.items.find((i) => i.id === 'submission_after_start');
        expect(sub?.status).toBe('ok');
    });

    it('maker_meetup: application deadline must be before start IF SET', () => {
        const start = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const base = blankWizardState('maker_meetup');
        base.title = 'Maker Meetup';
        base.start_date = start.toISOString();
        if (base.typeFields.kind === 'maker_meetup') {
            base.typeFields.application_deadline = new Date(
                start.getTime() + 1000,
            ).toISOString();
        }
        const h = computeHealth(base);
        const ad = h.items.find((i) => i.id === 'application_before_start');
        expect(ad?.status).toBe('fail');
    });

    it('maker_meetup: empty application deadline is fine (consistency-only)', () => {
        const start = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const base = blankWizardState('maker_meetup');
        base.title = 'Maker Meetup';
        base.start_date = start.toISOString();
        if (base.typeFields.kind === 'maker_meetup') {
            base.typeFields.application_deadline = '';
        }
        const h = computeHealth(base);
        expect(h.allPassing).toBe(true);
    });
});
