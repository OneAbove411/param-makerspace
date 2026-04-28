/**
 * Challenge Wizard — type definitions and blank state factory.
 *
 * Follows the event-wizard pattern: a single WizardFormState object
 * tracks all form data + current step. The shell serializes it for
 * autosave and hydrates from drafts.
 */

// ─── Tier-specific field labels ────────────────────────────────────────────
// PRD §6.1 defines distinct templates per tier. We adapt labels, not
// data shape — the DB columns stay the same (core_idea, mission,
// success_criteria), but the wizard shows tier-appropriate labels.

export const TIER_FIELD_LABELS: Record<string, {
    core_idea: string;
    core_idea_placeholder: string;
    mission: string;
    mission_placeholder: string;
    success_criteria: string;
    success_criteria_placeholder: string;
}> = {
    'Tier 1': {
        core_idea: 'Driving Question',
        core_idea_placeholder: 'How does [variable/concept] affect [behaviour/outcome]?',
        mission: 'Context & Mission',
        mission_placeholder: 'This challenge helps learners explore [concept] through direct experimentation.',
        success_criteria: 'Reflection Prompts',
        success_criteria_placeholder: 'What changed? What stayed the same? What do you think is happening?',
    },
    'Tier 2': {
        core_idea: 'Problem Statement',
        core_idea_placeholder: 'Design a way to [solve problem] using [available resources].',
        mission: 'Context',
        mission_placeholder: 'This challenge addresses [real or simulated need].',
        success_criteria: 'Deliverable & Success Criteria',
        success_criteria_placeholder: 'Prototype / test / system / report. Criterion 1, Criterion 2...',
    },
    'Tier 3': {
        core_idea: 'Design Brief',
        core_idea_placeholder: 'Build a system that can [core purpose] for [target user/context].',
        mission: 'Why It Matters',
        mission_placeholder: 'This challenge addresses [real-world relevance].',
        success_criteria: 'Review Questions',
        success_criteria_placeholder: 'Why this architecture? What assumptions? What are the failure points?',
    },
};

export const DEFAULT_LABELS = TIER_FIELD_LABELS['Tier 1'];

// ─── Step items for child data ─────────────────────────────────────────────

export interface StepItem {
    id?: string;       // DB id if saved
    step_text: string;
    display_order: number;
}

export interface MaterialItem {
    id?: string;
    name: string;
    display_order: number;
}

export interface VocabItem {
    id?: string;
    term: string;
    definition: string;
}

export interface SkillItem {
    id?: string;
    skill_name: string;
}

export interface LevelItem {
    id?: string;
    level_name: string;
    description: string;
}

export interface ImageItem {
    id?: string;
    image_url: string;
    caption: string | null;
    display_order: number;
}

export interface VideoItem {
    id?: string;
    title: string;
    video_url: string;
    display_order: number;
}

// ─── Main form state ───────────────────────────────────────────────────────

export interface ChallengeWizardState {
    step: 1 | 2 | 3 | 4;

    // Step 1: Core
    title: string;
    tier: string;
    domain: string;
    status: string;
    time_estimate: string;
    mystery: string;
    core_idea: string;
    mission: string;
    success_criteria: string;

    // Step 2: Content
    steps: StepItem[];
    materials: MaterialItem[];
    skills: SkillItem[];
    vocabulary: VocabItem[];
    levels: LevelItem[];

    // Step 3: Media
    cover_image_url: string;
    images: ImageItem[];
    videos: VideoItem[];

    // Meta
    /** If editing, the challenge ID. Null if creating new. */
    challengeId: string | null;
    /** Title shown in "prefilled from..." banner */
    prefillSourceTitle: string;
}

export function blankWizardState(): ChallengeWizardState {
    return {
        step: 1,
        title: '',
        tier: 'Tier 1',
        domain: 'Interdisciplinary',
        status: 'draft',
        time_estimate: '',
        mystery: '',
        core_idea: '',
        mission: '',
        success_criteria: '',
        steps: [],
        materials: [],
        skills: [],
        vocabulary: [],
        levels: [],
        cover_image_url: '',
        images: [],
        videos: [],
        challengeId: null,
        prefillSourceTitle: '',
    };
}

export const DOMAIN_OPTIONS = [
    'Electronics',
    'Robotics',
    'AI',
    'Design',
    'Fabrication',
    'Bio',
    'Interdisciplinary',
    'Woodworking',
    'Other',
] as const;

export const TIER_OPTIONS = [
    { value: 'Tier 1', label: 'Tier 1 — Explorer' },
    { value: 'Tier 2', label: 'Tier 2 — Solver' },
    { value: 'Tier 3', label: 'Tier 3 — Architect' },
] as const;
