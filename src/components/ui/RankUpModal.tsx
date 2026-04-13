import React, { useEffect } from 'react'
import { getBadgeIcon } from '../../lib/badgeIcons'

/* What features unlock at each rank — mirrors OverviewBento's RANK_UNLOCKS */
const RANK_UNLOCKS: Record<string, string[]> = {
  'Tinkerer':  ['Propose Projects', 'Submit Challenges', 'Earn Domain Badges'],
  'Builder':   ['View Tier 3 Challenges', 'Book Showcase Slots'],
  'Maker':     ['Propose T3 Architect Projects'],
  'Innovator': ['Request Mentor Status'],
  'Lab Pro':   ['Full Lab Access'],
}

interface RankUpModalProps {
  previousRank: string
  newRank: string
  newXP: number
  onDismiss: () => void
}

export function RankUpModal({ previousRank, newRank, newXP, onDismiss }: RankUpModalProps) {
  const Icon = getBadgeIcon({ name: newRank, badge_type: 'achievement', domain: 'General' })
  const unlocks = RANK_UNLOCKS[newRank] || []

  // Auto-dismiss after 8 seconds (longer to allow reading unlocks)
  useEffect(() => {
    const t = setTimeout(onDismiss, 8000)
    return () => clearTimeout(t)
  }, [onDismiss])

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-brutal-dark/80 backdrop-blur-sm"
      onClick={onDismiss}
    >
      <div
        className="bg-brutal-bg border-4 border-brutal-dark rounded-[2rem] p-12 text-center max-w-sm mx-4 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Animated icon */}
        <div className="w-24 h-24 rounded-full bg-brutal-dark flex items-center justify-center mx-auto mb-6 animate-[bounce_0.6s_ease-in-out_3]">
          <Icon size={44} className="text-brutal-bg" strokeWidth={1.5} />
        </div>

        <div className="font-data text-xs uppercase font-bold text-brutal-dark/40 tracking-widest mb-2">
          Rank Up!
        </div>
        <div className="font-heading font-bold text-5xl uppercase tracking-tight-heading mb-2 text-brutal-red">
          {newRank}
        </div>
        <div className="font-data text-sm text-brutal-dark/60 mb-4">
          You advanced from <strong>{previousRank}</strong> to <strong>{newRank}</strong>
        </div>

        {/* XP display */}
        <div className="bg-brutal-dark/5 rounded-xl p-3 mb-4 font-data text-sm">
          <span className="font-bold text-brutal-dark">{newXP.toLocaleString()} XP</span>
          <span className="text-brutal-dark/50"> total</span>
        </div>

        {/* Unlocked features */}
        {unlocks.length > 0 && (
          <div className="bg-brutal-red/5 border-2 border-brutal-red/20 rounded-xl p-3 mb-6 text-left">
            <div className="font-data text-[10px] font-bold uppercase tracking-widest text-brutal-red mb-2">
              Now unlocked
            </div>
            {unlocks.map((feature) => (
              <div key={feature} className="flex items-center gap-2 py-0.5">
                <span className="text-brutal-red text-xs" aria-hidden>✦</span>
                <span className="font-data text-xs text-brutal-dark/70">{feature}</span>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={onDismiss}
          className="w-full py-3 bg-brutal-dark text-brutal-bg font-heading font-bold uppercase rounded-full hover:bg-brutal-red transition-colors"
        >
          Continue →
        </button>
      </div>
    </div>
  )
}
