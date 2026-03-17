import React, { useEffect } from 'react'
import { getBadgeIcon } from '../../lib/badgeIcons'

interface RankUpModalProps {
  previousRank: string
  newRank: string
  newXP: number
  onDismiss: () => void
}

export function RankUpModal({ previousRank, newRank, newXP, onDismiss }: RankUpModalProps) {
  const Icon = getBadgeIcon({ name: newRank, badge_type: 'achievement', domain: 'General' })

  // Auto-dismiss after 6 seconds
  useEffect(() => {
    const t = setTimeout(onDismiss, 6000)
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
        <div className="font-data text-sm text-brutal-dark/60 mb-6">
          You advanced from <strong>{previousRank}</strong> to <strong>{newRank}</strong>
        </div>

        {/* XP display */}
        <div className="bg-brutal-dark/5 rounded-xl p-3 mb-6 font-data text-sm">
          <span className="font-bold text-brutal-dark">{newXP.toLocaleString()} XP</span>
          <span className="text-brutal-dark/50"> total</span>
        </div>

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
