import React from 'react'
import { getBadgeIcon, getBadgeColors } from '../../lib/badgeIcons'
import { cn } from '../../lib/utils'

interface BadgeIconProps {
  badge: {
    name: string
    badge_type: string
    domain: string
    tier: string
    image_url?: string | null
  }
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizes = {
  sm:  { container: 'w-10 h-10', icon: 16 },
  md:  { container: 'w-16 h-16', icon: 24 },
  lg:  { container: 'w-20 h-20', icon: 32 },
  xl:  { container: 'w-28 h-28', icon: 44 },
}

export function BadgeIcon({ badge, size = 'md', className }: BadgeIconProps) {
  const Icon = getBadgeIcon(badge)
  const colors = getBadgeColors(badge)
  const s = sizes[size]

  // If admin uploaded a custom image, use it — otherwise use generated icon
  if (badge.image_url) {
    return (
      <div className={cn(s.container, 'rounded-full overflow-hidden border-2 border-brutal-dark/10 flex-shrink-0 bg-brutal-bg', className)}>
        <img src={badge.image_url} alt={badge.name} loading="lazy" className="w-full h-full object-cover" />
      </div>
    )
  }

  return (
    <div className={cn(
      s.container,
      'rounded-full flex items-center justify-center flex-shrink-0 border-2',
      colors.bg, colors.border,
      className
    )}>
      <Icon size={s.icon} className={colors.icon} strokeWidth={1.5} />
    </div>
  )
}
