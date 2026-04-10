export const PROGRESSION_BADGES = [
  {
    name: 'Curious',
    description: 'Joined the Param Makerspace and started exploring.',
    tier: 'Tier 1',
    domain: 'General',
    badge_type: 'achievement',
    criteria: 'Create a Param Makerspace account. Earns +10 XP for first login.',
  },
  {
    name: 'Tinkerer',
    description: 'Completed your first Tier 1 challenge.',
    tier: 'Tier 1',
    domain: 'General',
    badge_type: 'achievement',
    criteria: 'Complete and verify one Tier 1 challenge. Earns +50 XP.',
  },
  {
    name: 'Builder',
    description: 'Proposed and had a project approved for execution.',
    tier: 'Tier 2',
    domain: 'General',
    badge_type: 'achievement',
    criteria: 'Have a project proposal approved by a mentor. Earns +100 XP.',
  },
  {
    name: 'Maker',
    description: 'Completed a full project from proposal to completion.',
    tier: 'Tier 2',
    domain: 'General',
    badge_type: 'achievement',
    criteria: 'Complete a project and have it marked active. Earns +200 XP.',
  },
  {
    name: 'Innovator',
    description: 'Completed a Tier 3 Architect challenge or project.',
    tier: 'Tier 3',
    domain: 'General',
    badge_type: 'achievement',
    criteria: 'Complete a Tier 3 challenge or T3 Architect project. Earns +400 XP.',
  },
  {
    name: 'Lab Pro',
    description: 'Recognised by the Param community as a certified maker and mentor.',
    tier: 'Tier 3',
    domain: 'General',
    badge_type: 'role',
    criteria: 'Achieve Mentor role and have at least 3 active projects.',
  },
] as const

import { BADGE_DOMAINS } from './constants'

const DOMAINS = [...BADGE_DOMAINS]
const DOMAIN_TIERS = [
  { suffix: 'T1', tier: 'Tier 1', description: 'Completed a Tier 1 challenge in this domain. Earns +50 XP.' },
  { suffix: 'T2', tier: 'Tier 2', description: 'Completed a Tier 2 challenge in this domain. Earns +150 XP.' },
  { suffix: 'T3', tier: 'Tier 3', description: 'Completed a Tier 3 challenge in this domain. Earns +400 XP.' },
]

export const DOMAIN_BADGES = DOMAINS.flatMap(domain =>
  DOMAIN_TIERS.map(({ suffix, tier, description }) => ({
    name: `${domain} ${suffix}`,
    description: `${description}`,
    tier,
    domain,
    badge_type: 'skill',
    criteria: `Complete and verify a ${tier} challenge in ${domain}. Earns +${tier === 'Tier 1' ? 50 : tier === 'Tier 2' ? 150 : 400} XP.`,
  }))
)
