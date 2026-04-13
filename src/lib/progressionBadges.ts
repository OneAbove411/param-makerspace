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
    description: 'Reached Tinkerer rank by earning 60 XP.',
    tier: 'Tier 1',
    domain: 'General',
    badge_type: 'achievement',
    criteria: 'Earn 60 XP through challenges, profile completion, or events.',
  },
  {
    name: 'Builder',
    description: 'Reached Builder rank by earning 250 XP.',
    tier: 'Tier 2',
    domain: 'General',
    badge_type: 'achievement',
    criteria: 'Earn 250 XP through projects, challenges, or events.',
  },
  {
    name: 'Maker',
    description: 'Reached Maker rank by earning 600 XP.',
    tier: 'Tier 2',
    domain: 'General',
    badge_type: 'achievement',
    criteria: 'Earn 600 XP through sustained making, challenges, and projects.',
  },
  {
    name: 'Innovator',
    description: 'Reached Innovator rank by earning 1,200 XP.',
    tier: 'Tier 3',
    domain: 'General',
    badge_type: 'achievement',
    criteria: 'Earn 1,200 XP through advanced challenges, projects, and events.',
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
