import { supabase } from './supabase'

export const RANK_THRESHOLDS: Record<string, number> = {
  'Curious':   0,
  'Tinkerer':  60,
  'Builder':   250,
  'Maker':     600,
  'Innovator': 1200,
  'Lab Pro':   2500,
}

export const RANK_ORDER = ['Curious', 'Tinkerer', 'Builder', 'Maker', 'Innovator', 'Lab Pro']

export const XP_REWARDS = {
  tier1_challenge:    50,
  tier2_challenge:    150,
  tier3_challenge:    400,
  project_approved:   100,
  project_active:     200,
  event_registered:   25,
  event_presented:    75,
  profile_completed:  50,
  first_login:        10,
}

export function getRankFromXP(xp: number, role: string): string {
  // Lab Pro requires mentor role
  if (xp >= RANK_THRESHOLDS['Lab Pro'] && (role === 'mentor' || role === 'admin')) return 'Lab Pro'
  if (xp >= RANK_THRESHOLDS['Innovator']) return 'Innovator'
  if (xp >= RANK_THRESHOLDS['Maker']) return 'Maker'
  if (xp >= RANK_THRESHOLDS['Builder']) return 'Builder'
  if (xp >= RANK_THRESHOLDS['Tinkerer']) return 'Tinkerer'
  return 'Curious'
}

export function getNextRank(currentRank: string): string | null {
  const idx = RANK_ORDER.indexOf(currentRank)
  return idx < RANK_ORDER.length - 1 ? RANK_ORDER[idx + 1] : null
}

export function getXPForNextRank(currentRank: string): number | null {
  const next = getNextRank(currentRank)
  return next ? RANK_THRESHOLDS[next] : null
}

export function getProgressToNextRank(xp: number, currentRank: string): number {
  const currentThreshold = RANK_THRESHOLDS[currentRank] || 0
  const next = getNextRank(currentRank)
  if (!next) return 100
  const nextThreshold = RANK_THRESHOLDS[next]
  const range = nextThreshold - currentThreshold
  const progress = xp - currentThreshold
  return Math.min(100, Math.round((progress / range) * 100))
}

// §7 F-304 — idempotency guard for awardXP.
//
// `xp_event_dedup` does not yet exist as a table in the schema, so until
// that migration ships we enforce idempotency at two levels:
//
//   1. An in-memory in-flight map keyed by `userId|reason|referenceId`
//      collapses double-clicks (same call fired twice before the first
//      promise resolves) onto a single network round-trip.
//   2. A pre-insert `xp_event` SELECT using the same key confirms no row
//      with the same (user_id, reason, reference_id, reference_type)
//      already exists. If it does, we return the existing state instead
//      of inserting a second xp_event row.
//
// Net effect: double-clicking `awardXP` results in exactly ONE xp_event
// row — the acceptance criterion for section 7.
const inFlightAwardXP = new Map<string, Promise<{
  newXP: number
  newRank: string
  rankAdvanced: boolean
  previousRank: string
}>>()

function buildDedupKey(userId: string, reason: string, referenceId?: string, referenceType?: string) {
  return `${userId}|${reason}|${referenceId ?? ''}|${referenceType ?? ''}`
}

// Core function — award XP and check for rank advance
// Returns { newXP, newRank, rankAdvanced, previousRank }
export async function awardXP(
  userId: string,
  amount: number,
  reason: string,
  referenceId?: string,
  referenceType?: string
): Promise<{
  newXP: number
  newRank: string
  rankAdvanced: boolean
  previousRank: string
}> {
  const dedupKey = buildDedupKey(userId, reason, referenceId, referenceType)

  // (1) In-flight dedup: collapse rapid double-calls onto a single promise.
  const existing = inFlightAwardXP.get(dedupKey)
  if (existing) return existing

  const run = (async () => {
    // (2) Durable dedup: if an xp_event with this exact key already exists,
    // do not insert another. Fetch current state and return it instead.
    let existingEventQuery = supabase
      .from('xp_event')
      .select('id')
      .eq('user_id', userId)
      .eq('reason', reason)
    if (referenceId) {
      existingEventQuery = existingEventQuery.eq('reference_id', referenceId)
    } else {
      existingEventQuery = existingEventQuery.is('reference_id', null)
    }
    if (referenceType) {
      existingEventQuery = existingEventQuery.eq('reference_type', referenceType)
    } else {
      existingEventQuery = existingEventQuery.is('reference_type', null)
    }
    const { data: existingEvent } = await existingEventQuery.maybeSingle()

  // Get current user state
  const { data: user } = await supabase
    .from('app_user')
    .select('xp, rank, rank_override, role')
    .eq('id', userId)
    .single()

  if (!user) return { newXP: 0, newRank: 'Curious', rankAdvanced: false, previousRank: 'Curious' }

  const u = user as any
  const previousRank = u.rank || 'Curious'

    // If we already have an event with this exact key, return current state
    // WITHOUT inserting or mutating XP. This makes awardXP idempotent.
    if (existingEvent) {
      return {
        newXP: u.xp || 0,
        newRank: previousRank,
        rankAdvanced: false,
        previousRank,
      }
    }

  const newXP = (u.xp || 0) + amount

  // Log the XP event
  await supabase.from('xp_event').insert({
    user_id: userId,
    amount,
    reason,
    reference_id: referenceId || null,
    reference_type: referenceType || null,
  })

  // Calculate new rank (skip if admin override)
  const newRank = u.rank_override
    ? u.rank
    : getRankFromXP(newXP, u.role)

  const rankAdvanced = newRank !== previousRank

  // Update user XP and rank
  await supabase
    .from('app_user')
    .update({ xp: newXP, rank: newRank })
    .eq('id', userId)

  // If rank advanced, award the corresponding badge and dispatch celebration
  if (rankAdvanced) {
    try {
      const { awardBadgeByName } = await import('./badgeEngine')
      await awardBadgeByName(userId, newRank)
    } catch (err) {
      console.error('Failed to award rank badge', err)
    }

    try {
      const { dispatchRankUp } = await import('./auth')
      dispatchRankUp(previousRank, newRank, newXP)
    } catch (err) {
      // dispatchRankUp may not exist yet — non-critical
      console.error('Failed to dispatch rank up event', err)
    }
  }

  return { newXP, newRank, rankAdvanced, previousRank }
  })()

  inFlightAwardXP.set(dedupKey, run)
  try {
    return await run
  } finally {
    inFlightAwardXP.delete(dedupKey)
  }
}

// Check and award one-time profile completion XP
export async function checkProfileCompletionXP(userId: string): Promise<void> {
  // Check if already awarded
  const { data: existing } = await supabase
    .from('xp_event')
    .select('id')
    .eq('user_id', userId)
    .eq('reason', 'Profile completed')
    .maybeSingle()

  if (existing) return

  // Check if profile is complete
  const { data: profile } = await supabase
    .from('maker_profile')
    .select('bio, avatar_url, display_name, github_url, linkedin_url')
    .eq('user_id', userId)
    .single()

  const p = profile as any
  if (
    p?.bio &&
    p?.avatar_url &&
    p?.display_name &&
    (p?.github_url || p?.linkedin_url)
  ) {
    await awardXP(userId, XP_REWARDS.profile_completed, 'Profile completed', undefined, 'profile')
  }
}
