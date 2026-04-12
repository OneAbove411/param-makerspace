/**
 * Challenge/Explorer Hub constants extracted from ExplorerHubCommandBar
 * so they can be shared across the sidebar and other components
 * without importing the full command bar component.
 */

export type ExplorerSort = 'newest' | 'oldest' | 'quickest' | 'alpha' | 'shuffle';
export type ExplorerTier = 'All' | 'Tier 1' | 'Tier 2' | 'Tier 3';

export const DOMAIN_OPTIONS = [
    'All',
    'Electronics',
    'Robotics',
    'AI',
    'Design',
    'Fabrication',
    'Bio',
    'Interdisciplinary',
    'Woodworking',
] as const;
