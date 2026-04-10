import { supabase } from './supabase'
import { awardXP } from './xpEngine'
import { XP_REWARDS } from './constants'
import { toast } from './toast'

// Check if user already has a badge by name — avoid duplicates
async function hasBadge(userId: string, badgeName: string): Promise<boolean> {
  const { data } = await supabase
    .from('user_badge')
    .select('id')
    .eq('user_id', userId)
    .eq('badge_id',
      (await supabase.from('badge').select('id').eq('name', badgeName).single()).data?.id || ''
    )
    .maybeSingle()
  return !!data
}

// Award a badge by name — looks up badge id, inserts user_badge
// Exported so xpEngine can call it on rank advance
export async function awardBadgeByName(userId: string, badgeName: string): Promise<void> {
  const { data: badge } = await supabase
    .from('badge')
    .select('id')
    .eq('name', badgeName)
    .maybeSingle()

  if (!badge) return  // badge doesn't exist in DB yet

  const already = await hasBadge(userId, badgeName)
  if (already) return  // already awarded

  await supabase.from('user_badge').insert({
    user_id: userId,
    badge_id: badge.id,
  })

  // Fire a celebration toast so the user sees immediate feedback
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
