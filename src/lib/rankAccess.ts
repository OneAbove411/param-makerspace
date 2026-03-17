import { RANK_ORDER } from './xpEngine'

export type Feature =
  | 'create_project'
  | 'join_event'
  | 'submit_build_challenge'
  | 'book_showcase_slot'
  | 'view_tier2_challenges'
  | 'view_tier3_challenges'
  | 'propose_t3_project'
  | 'view_makers_directory'
  | 'earn_domain_badges'
  | 'mentor_request'

const FEATURE_MIN_RANK: Record<Feature, string> = {
  'view_makers_directory':    'Curious',    // all can browse
  'join_event':               'Curious',    // all can join events
  'view_tier2_challenges':    'Curious',    // visible to all, attempt requires Tinkerer
  'create_project':           'Tinkerer',   // need at least one challenge done
  'submit_build_challenge':   'Tinkerer',
  'view_tier3_challenges':    'Builder',
  'book_showcase_slot':       'Builder',
  'earn_domain_badges':       'Tinkerer',
  'propose_t3_project':       'Maker',
  'mentor_request':           'Innovator',
}

export function canAccess(userRank: string, feature: Feature): boolean {
  const required = FEATURE_MIN_RANK[feature]
  return RANK_ORDER.indexOf(userRank) >= RANK_ORDER.indexOf(required)
}

export function getRequiredRank(feature: Feature): string {
  return FEATURE_MIN_RANK[feature]
}
