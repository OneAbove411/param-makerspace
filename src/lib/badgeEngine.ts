import { supabase } from './supabase'
import { awardXP } from './xpEngine'
import { XP_REWARDS } from './constants'
import { toast } from './toast'

// Award a badge by name — looks up badge id, inserts user_badge.
// Exported so xpEngine can call it on rank advance.
//
// IMPORTANT: the "already-earned" check MUST win every race. `onUserJoined`
// runs on every session-init (including Supabase re-firing SIGNED_IN on tab
// return), which used to retrigger the celebration toast even though the DB
// correctly rejected the duplicate row. We now:
//   1. Look up the badge id first.
//   2. Check for an existing user_badge row using the resolved badge_id
//      directly (not a nested query) — faster and race-tight.
//   3. Insert with onConflict ignore, and ONLY toast if a row was actually
//      written this call (rowsAffected > 0).
export async function awardBadgeByName(userId: string, badgeName: string): Promise<void> {
  const { data: badge } = await supabase
    .from('badge')
    .select('id')
    .eq('name', badgeName)
    .maybeSingle()

  if (!badge) return  // badge doesn't exist in DB yet

  // 1. Pre-check — fast path for the common case (user already has it).
  //    This is the primary guard against SIGNED_IN re-fires on tab switch.
  const { data: existing } = await supabase
    .from('user_badge')
    .select('id')
    .eq('user_id', userId)
    .eq('badge_id', badge.id)
    .maybeSingle()

  if (existing) return

  // 2. Attempt insert. If a concurrent caller beat us, the unique constraint
  //    on (user_id, badge_id) will reject this — we detect via inserted.data.
  const { data: inserted, error } = await supabase
    .from('user_badge')
    .insert({ user_id: userId, badge_id: badge.id })
    .select('id')
    .maybeSingle()

  // 3. Only celebrate if we actually wrote the row this call. Otherwise this
  //    is a duplicate-insert race (concurrent SIGNED_IN handlers) or the DB
  //    silently rejected — either way, the user has already been told.
  if (error || !inserted) return

  try {
    toast.badgeEarned(badgeName)
  } catch {
    // Silently ignore if toast isn't available (e.g., server-side context)
  }
}

// --- Trigger functions called at specific app events ---

// Called immediately after account creation (on first sign-in)
export async function onUserJoined(userId: string): Promise<void> {
  await awardBadgeByName(userId, 'Curious')
  await awardXP(userId, XP_REWARDS.first_login, 'First login', undefined, 'system')
}

// Called after a challenge_completion is verified
export async function onChallengeVerified(userId: string, challengeId: string): Promise<void> {
  // Get the challenge tier and domain
  const { data: challenge } = await supabase
    .from('challenge')
    .select('tier, domain')
    .eq('id', challengeId)
    .single()

  if (!challenge) return

  // XP based on tier
  const xpAmount =
    challenge.tier === 'Tier 3' ? XP_REWARDS.tier3_challenge :
    challenge.tier === 'Tier 2' ? XP_REWARDS.tier2_challenge :
    XP_REWARDS.tier1_challenge

  await awardXP(userId, xpAmount, `Completed ${challenge.tier} challenge`, challengeId, 'challenge')

  // Check if this is the user's first Tier 1 completion
  if (challenge.tier === 'Tier 1') {
    const { count } = await supabase
      .from('challenge_completion')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'verified')
    if ((count || 0) === 1) {
      await awardBadgeByName(userId, 'Tinkerer')
    }
  }

  // Award Innovator for first Tier 3 completion
  if (challenge.tier === 'Tier 3') {
    await awardBadgeByName(userId, 'Innovator')
  }

  // Award domain-specific badge if exists
  // e.g. "Electronics Explorer", "Robotics Solver"
  if (challenge.domain && challenge.tier) {
    const domainBadgeName = `${challenge.domain} ${challenge.tier.replace('Tier ', 'T')}`
    await awardBadgeByName(userId, domainBadgeName)
  }

  // Award event participation badge if challenge was part of an event
  // (handled separately in onEventCheckin)
}

// Called after a project status changes to 'active' (approved)
export async function onProjectApproved(userId: string, projectId?: string): Promise<void> {
  await awardBadgeByName(userId, 'Builder')
  await awardXP(userId, XP_REWARDS.project_approved, 'Project approved', projectId, 'project')
}

// Called after a project is completed
// For Phase 1: a project is "completed" when admin manually sets status
// Use project status active as proxy — award Maker on first active project
export async function onProjectActive(userId: string, projectId?: string): Promise<void> {
  const { count } = await supabase
    .from('project')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', userId)
    .eq('status', 'active')
  
  if ((count || 0) === 1) {
    await awardBadgeByName(userId, 'Maker')
  }
  await awardXP(userId, XP_REWARDS.project_active, 'Project became active', projectId, 'project')
}

// Called after event registration confirmed
export async function onEventRegistration(userId: string, eventId: string): Promise<void> {
  // Award XP for event registration
  await awardXP(userId, XP_REWARDS.event_registered, 'Event registration', eventId, 'event')

  // Check if the event has an auto_badge_id set
  const { data: event } = await supabase
    .from('event')
    .select('auto_badge_id, title')
    .eq('id', eventId)
    .single()

  if (event?.auto_badge_id) {
    const already = await supabase
      .from('user_badge')
      .select('id')
      .eq('user_id', userId)
      .eq('badge_id', event.auto_badge_id)
      .maybeSingle()

    if (!already.data) {
      await supabase.from('user_badge').insert({
        user_id: userId,
        badge_id: event.auto_badge_id,
      })
    }
  }
}

// Called when role is upgraded to mentor
export async function onMentorRoleGranted(userId: string): Promise<void> {
  // Check project count
  const { count } = await supabase
    .from('project')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', userId)
    .eq('status', 'active')

  if ((count || 0) >= 3) {
    await awardBadgeByName(userId, 'Lab Pro')
  }
}
