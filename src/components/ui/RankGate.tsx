import React from 'react'
import { Lock } from 'lucide-react'
import { getBadgeIcon } from '../../lib/badgeIcons'
import { getRequiredRank } from '../../lib/rankAccess'
import type { Feature } from '../../lib/rankAccess'

const FEATURE_LABELS: Record<Feature, string> = {
  'create_project':           'Create Projects',
  'join_event':               'Join Events',
  'submit_build_challenge':   'Submit to Build Challenges',
  'book_showcase_slot':       'Book Showcase Slots',
  'view_tier2_challenges':    'Attempt Tier 2 Challenges',
  'view_tier3_challenges':    'View Tier 3 Challenges',
  'propose_t3_project':       'Propose T3 Architect Projects',
  'view_makers_directory':    'Browse Makers Directory',
  'earn_domain_badges':       'Earn Domain Badges',
  'mentor_request':           'Request Mentor Status',
}

interface RankGateProps {
  feature: Feature
  compact?: boolean
}

export function RankGate({ feature, compact = false }: RankGateProps) {
  const required = getRequiredRank(feature)
  const Icon = getBadgeIcon({ name: required, badge_type: 'achievement', domain: 'General' })
  const label = FEATURE_LABELS[feature]

  if (compact) {
    return (
      <div className="flex items-center gap-2 p-3 bg-brutal-dark/5 border-2 border-dashed border-brutal-dark/20 rounded-xl opacity-60 cursor-not-allowed">
        <Lock size={14} className="text-brutal-dark/40" />
        <span className="font-data text-xs text-brutal-dark/50">Unlocks at {required}</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3 p-8 bg-brutal-dark/5 border-2 border-dashed border-brutal-dark/20 rounded-[2rem] text-center">
      <div className="w-14 h-14 rounded-full bg-brutal-dark/10 flex items-center justify-center">
        <Lock size={24} className="text-brutal-dark/30" />
      </div>
      <div>
        <div className="font-heading font-bold text-xl uppercase text-brutal-dark/50">{label}</div>
        <div className="font-data text-sm text-brutal-dark/40 mt-1">
          Reach <strong className="text-brutal-dark/60">{required}</strong> rank to unlock this feature
        </div>
      </div>
      <div className="flex items-center gap-2 px-3 py-1.5 bg-brutal-bg border border-brutal-dark/20 rounded-full">
        <Icon size={14} className="text-brutal-dark/50" />
        <span className="font-data text-xs font-bold text-brutal-dark/50 uppercase">{required} Required</span>
      </div>
    </div>
  )
}
