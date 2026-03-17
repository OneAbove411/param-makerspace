import React from 'react'
import { RANK_ORDER, RANK_THRESHOLDS, getProgressToNextRank, getNextRank } from '../../lib/xpEngine'
import { getBadgeIcon } from '../../lib/badgeIcons'
import { cn } from '../../lib/utils'

export const RANK_STYLES: Record<string, {
  bg: string; text: string; border: string; glow: string; barColor: string
}> = {
  'Curious':   { bg: 'bg-brutal-dark/5',  text: 'text-brutal-dark/60', border: 'border-brutal-dark/20', glow: '',                              barColor: 'bg-brutal-dark/30' },
  'Tinkerer':  { bg: 'bg-brutal-dark/10', text: 'text-brutal-dark',    border: 'border-brutal-dark/40', glow: '',                              barColor: 'bg-brutal-dark/60' },
  'Builder':   { bg: 'bg-brutal-dark/15', text: 'text-brutal-dark',    border: 'border-brutal-dark',    glow: '',                              barColor: 'bg-brutal-dark' },
  'Maker':     { bg: 'bg-brutal-red/5',   text: 'text-brutal-red',     border: 'border-brutal-red/30',  glow: 'shadow-[0_0_12px_rgba(196,41,30,0.15)]', barColor: 'bg-brutal-red' },
  'Innovator': { bg: 'bg-brutal-red/10',  text: 'text-brutal-red',     border: 'border-brutal-red/50',  glow: 'shadow-[0_0_16px_rgba(196,41,30,0.25)]', barColor: 'bg-brutal-red' },
  'Lab Pro':   { bg: 'bg-brutal-dark',    text: 'text-brutal-bg',      border: 'border-brutal-dark',    glow: 'shadow-[0_0_20px_rgba(17,17,17,0.3)]',   barColor: 'bg-brutal-bg' },
}

interface RankBadgeProps {
  rank: string
  xp: number
  variant?: 'pill' | 'card' | 'full'
  showProgress?: boolean
  showXP?: boolean
  className?: string
}

export function RankBadge({ rank, xp, variant = 'pill', showProgress = false, showXP = false, className }: RankBadgeProps) {
  const style = RANK_STYLES[rank] || RANK_STYLES['Curious']
  const progress = getProgressToNextRank(xp, rank)
  const nextRank = getNextRank(rank)
  const Icon = getBadgeIcon({ name: rank, badge_type: 'achievement', domain: 'General' })
  const xpForNext = nextRank ? RANK_THRESHOLDS[nextRank] : null

  if (variant === 'pill') {
    return (
      <span className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full border font-data text-xs font-bold uppercase',
        style.bg, style.text, style.border, style.glow,
        className
      )}>
        <Icon size={12} strokeWidth={2} />
        {rank}
      </span>
    )
  }

  if (variant === 'card') {
    return (
      <div className={cn(
        'flex items-center gap-3 p-4 rounded-2xl border-2',
        style.bg, style.border, style.glow,
        className
      )}>
        <div className={cn('w-10 h-10 rounded-full flex items-center justify-center border-2', style.border, style.bg)}>
          <Icon size={20} className={style.text} strokeWidth={1.5} />
        </div>
        <div className="flex-1 min-w-0">
          <div className={cn('font-heading font-bold text-lg uppercase', style.text)}>{rank}</div>
          {showXP && <div className="font-data text-xs text-brutal-dark/50">{xp.toLocaleString()} XP</div>}
          {showProgress && nextRank && (
            <div className="mt-1.5">
              <div className="h-1.5 bg-brutal-dark/10 rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all duration-500', style.barColor)}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="font-data text-[10px] text-brutal-dark/40 mt-1">
                {xp.toLocaleString()} / {xpForNext?.toLocaleString()} XP → {nextRank}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // variant === 'full' — expanded rank card with tier breakdown
  return (
    <div className={cn('p-6 rounded-[2rem] border-2 space-y-4', style.bg, style.border, style.glow, className)}>
      <div className="flex items-center gap-4">
        <div className={cn('w-16 h-16 rounded-full flex items-center justify-center border-2', style.border)}>
          <Icon size={32} className={style.text} strokeWidth={1.5} />
        </div>
        <div>
          <div className="font-data text-xs uppercase font-bold text-brutal-dark/40 tracking-widest">Current Rank</div>
          <div className={cn('font-heading font-bold text-4xl uppercase tracking-tight-heading', style.text)}>{rank}</div>
          {showXP && <div className="font-data text-sm text-brutal-dark/50 font-bold">{xp.toLocaleString()} XP total</div>}
        </div>
      </div>

      {showProgress && (
        <div>
          {nextRank ? (
            <>
              <div className="flex justify-between items-center mb-2">
                <span className="font-data text-xs font-bold text-brutal-dark/50 uppercase">{rank}</span>
                <span className="font-data text-xs font-bold text-brutal-dark/50 uppercase">{nextRank}</span>
              </div>
              <div className="h-3 bg-brutal-dark/10 rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all duration-700', style.barColor)}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="font-data text-xs text-brutal-dark/50 mt-2 text-center">
                {xpForNext ? xpForNext - xp : 0} XP to reach {nextRank}
              </div>
            </>
          ) : (
            <div className={cn('text-center font-data text-sm font-bold', style.text)}>
              Maximum rank achieved
            </div>
          )}
        </div>
      )}

      {/* Mini rank ladder */}
      <div className="flex items-center gap-1 pt-2 border-t border-brutal-dark/10">
        {RANK_ORDER.map((r, i) => {
          const reached = RANK_ORDER.indexOf(rank) >= i
          const isCurrent = r === rank
          const RankIcon = getBadgeIcon({ name: r, badge_type: 'achievement', domain: 'General' })
          return (
            <div key={r} className="flex items-center gap-1 flex-1">
              <div
                title={r}
                className={cn(
                  'flex-1 flex flex-col items-center gap-1 p-1 rounded transition-all',
                  isCurrent ? cn(style.bg, 'border border-current', style.border) : ''
                )}
              >
                <RankIcon
                  size={14}
                  className={reached ? style.text : 'text-brutal-dark/20'}
                  strokeWidth={isCurrent ? 2 : 1.5}
                />
                <div className={cn('font-data text-[8px] font-bold uppercase hidden sm:block', reached ? style.text : 'text-brutal-dark/20')}>
                  {r.split(' ')[0]}
                </div>
              </div>
              {i < RANK_ORDER.length - 1 && (
                <div className={cn('w-2 h-px flex-shrink-0', reached ? style.barColor : 'bg-brutal-dark/10')} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
