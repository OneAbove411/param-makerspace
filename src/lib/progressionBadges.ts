export const PROGRESSION_BADGES = [
  {
    name: 'Curious',
    description: 'Joined the Param Makerspace and started exploring.',
    tier: 'Tier 1',
    domain: 'General',
    badge_type: 'achievement',
    criteria: 'Create a Param Makerspace account.',
  },
  {
    name: 'Tinkerer',
    description: 'Completed your first Tier 1 challenge.',
    tier: 'Tier 1',
    domain: 'General',
    badge_type: 'achievement',
    criteria: 'Complete and verify one Tier 1 challenge.',
  },
  {
    name: 'Builder',
    description: 'Proposed and had a project approved for execution.',
    tier: 'Tier 2',
    domain: 'General',
    badge_type: 'achievement',
    criteria: 'Have a project proposal approved by a mentor.',
  },
  {
    name: 'Maker',
    description: 'Completed a full project from proposal to completion.',
    tier: 'Tier 2',
    domain: 'General',
    badge_type: 'achievement',
    criteria: 'Complete a project and have it marked active.',
  },
  {
    name: 'Innovator',
    description: 'Completed a Tier 3 Architect challenge or project.',
    tier: 'Tier 3',
    domain: 'General',
    badge_type: 'achievement',
    criteria: 'Complete a Tier 3 challenge or T3 Architect project.',
  },
  {
    name: 'Lab Pro',
    description: 'Recognised by the Param community as a certified maker and mentor.',
    tier: 'Tier 3',
    domain: 'General',
    badge_type: 'role',
    criteria: 'Achieve Mentor role and complete at least 3 projects.',
  },
] as const

const DOMAINS = ['Electronics', 'Robotics', 'AI', 'Design', 'Fabrication', 'Bio', 'Interdisciplinary']
const DOMAIN_TIERS = [
  { suffix: 'T1', tier: 'Tier 1', description: 'Completed a Tier 1 challenge in this domain.' },
  { suffix: 'T2', tier: 'Tier 2', description: 'Completed a Tier 2 challenge in this domain.' },
  { suffix: 'T3', tier: 'Tier 3', description: 'Completed a Tier 3 challenge in this domain.' },
]

export const DOMAIN_BADGES = DOMAINS.flatMap(domain =>
  DOMAIN_TIERS.map(({ suffix, tier, description }) => ({
    name: `${domain} ${suffix}`,
    description: `${description}`,
    tier,
    domain,
    badge_type: 'skill',
    criteria: `Complete and verify a ${tier} challenge in ${domain}.`,
  }))
)
