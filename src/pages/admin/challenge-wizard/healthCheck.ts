/**
 * Challenge Wizard — health check before publish.
 *
 * Mirrors event-wizard/healthCheck.ts pattern: each check returns
 * { id, label, status, jumpTo } so Step 4 can render a checklist
 * and jump the user to the offending field.
 */

import type { ChallengeWizardState } from './wizardTypes';

export interface HealthAnchor {
    step: number;
    field: string;
}

export interface HealthItem {
    id: string;
    label: string;
    status: 'ok' | 'fail';
    jumpTo: HealthAnchor;
}

export interface HealthResult {
    items: HealthItem[];
    allPassing: boolean;
}

export function computeHealth(state: ChallengeWizardState): HealthResult {
    const items: HealthItem[] = [];

    const check = (id: string, label: string, ok: boolean, step: number, field: string) => {
        items.push({ id, label, status: ok ? 'ok' : 'fail', jumpTo: { step, field } });
    };

    // Step 1 checks
    check('title', 'Title is set', !!state.title.trim(), 1, 'title');
    check('tier', 'Tier is selected', !!state.tier, 1, 'tier');
    check('domain', 'Domain is selected', !!state.domain, 1, 'domain');
    check('core_idea', 'Core idea / driving question is filled', !!state.core_idea.trim(), 1, 'core_idea');
    check('mission', 'Mission / context is filled', !!state.mission.trim(), 1, 'mission');

    // Step 2 checks
    check('steps', 'At least 1 step added', state.steps.length > 0, 2, 'steps');
    check('materials', 'At least 1 material listed', state.materials.length > 0, 2, 'materials');

    // Step 3 checks
    check('cover', 'Cover image is set', !!state.cover_image_url.trim(), 3, 'cover_image_url');

    // Optional but recommended
    check('time', 'Time estimate provided', !!state.time_estimate.trim(), 1, 'time_estimate');
    check('skills', 'At least 1 skill tagged', state.skills.length > 0, 2, 'skills');

    return {
        items,
        allPassing: items.every((i) => i.status === 'ok'),
    };
}
