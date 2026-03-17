import {
  Cpu, Zap, Bot, Layers, Wrench, FlaskConical, Brain,
  Microscope, Palette, Hammer, Trophy, Star, Shield,
  Flame, Target, Rocket, Award, CheckCircle2, Users,
  Calendar, BookOpen, GitBranch, Compass, Gem, Crown,
  Lightbulb, CircuitBoard, Scan, Cog, Leaf, Globe
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// Domain → icon mapping (semantically meaningful)
const DOMAIN_ICONS: Record<string, LucideIcon> = {
  'Electronics':      CircuitBoard,  // literal circuit board
  'Robotics':         Bot,           // robot
  'AI':               Brain,         // brain for intelligence
  'Design':           Palette,       // palette for design
  'Fabrication':      Hammer,        // hammer for making
  'Bio':              Microscope,    // microscope for biology
  'Interdisciplinary': Globe,        // globe for cross-domain
  'General':          Compass,       // compass for general navigation
  'Other':            Layers,        // layers for misc
}

// Badge type → icon override (when domain icon doesn't apply)
const TYPE_ICONS: Record<string, LucideIcon> = {
  'achievement':  Trophy,
  'skill':        Zap,
  'role':         Shield,
  'event':        Calendar,
  'induction':    CheckCircle2,
  'completion':   Star,
  'participation': Users,
}

// Specific badge name patterns → precise icons
const NAME_ICONS: Array<[RegExp, LucideIcon]> = [
  [/curious/i,        Compass],
  [/tinkerer/i,       Wrench],
  [/builder/i,        Hammer],
  [/maker/i,          Cog],
  [/innovator/i,      Lightbulb],
  [/lab pro/i,        Crown],
  [/safety/i,         Shield],
  [/certified/i,      CheckCircle2],
  [/champion/i,       Trophy],
  [/first/i,          Rocket],
  [/mentor/i,         Users],
  [/community/i,      Users],
  [/research/i,       FlaskConical],
  [/prototype/i,      Scan],
  [/project/i,        GitBranch],
  [/challenge/i,      Target],
  [/hackathon/i,      Flame],
  [/tier 3|architect/i, Gem],
  [/tier 2|solver/i,   Star],
  [/tier 1|explorer/i, Compass],
]

export function getBadgeIcon(badge: {
  name: string
  badge_type: string
  domain: string
}): LucideIcon {
  // 1. Check specific name patterns first (most precise)
  for (const [pattern, icon] of NAME_ICONS) {
    if (pattern.test(badge.name)) return icon
  }
  // 2. Domain-specific icon
  if (DOMAIN_ICONS[badge.domain]) return DOMAIN_ICONS[badge.domain]
  // 3. Badge type fallback
  if (TYPE_ICONS[badge.badge_type]) return TYPE_ICONS[badge.badge_type]
  // 4. Final fallback
  return Award
}

// Color scheme per domain — matches project's brutalist palette
export function getBadgeColors(badge: {
  tier: string
  domain: string
  badge_type: string
}): { bg: string; icon: string; border: string; label: string } {
  // Tier-based color hierarchy
  const tierColors: Record<string, { bg: string; icon: string; border: string; label: string }> = {
    'Tier 3': {
      bg: 'bg-brutal-red/10',
      icon: 'text-brutal-red',
      border: 'border-brutal-red/30',
      label: 'text-brutal-red',
    },
    'Tier 2': {
      bg: 'bg-brutal-dark/10',
      icon: 'text-brutal-dark',
      border: 'border-brutal-dark/30',
      label: 'text-brutal-dark',
    },
    'Tier 1': {
      bg: 'bg-brutal-dark/5',
      icon: 'text-brutal-dark/70',
      border: 'border-brutal-dark/20',
      label: 'text-brutal-dark/70',
    },
  }
  // Special overrides
  if (badge.badge_type === 'role') return {
    bg: 'bg-brutal-dark',
    icon: 'text-brutal-bg',
    border: 'border-brutal-dark',
    label: 'text-brutal-bg',
  }
  return tierColors[badge.tier] || tierColors['Tier 1']
}
