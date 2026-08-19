import React from 'react'
import { Flame, Zap, Coins, Heart } from 'lucide-react'
import { cn } from '../../lib/utils'

/**
 * Gamification Stat Badges (Streak, XP, Coins, Hearts)
 */
export function GamifyBadge({
  type = 'streak', // 'streak' | 'xp' | 'coins' | 'hearts'
  value = 0,
  max = 5,
  onClick,
  className
}) {
  const configs = {
    streak: {
      icon: Flame,
      iconColor: 'text-amber-500',
      bg: 'bg-amber-50 hover:bg-amber-100/80 border-amber-200/80 text-amber-700',
      bevel: 'border-b-2 border-b-amber-300',
      display: value
    },
    xp: {
      icon: Zap,
      iconColor: 'text-indigo-600',
      bg: 'bg-indigo-50 hover:bg-indigo-100/80 border-indigo-200/80 text-indigo-700',
      bevel: 'border-b-2 border-b-indigo-300',
      display: `${value} XP`
    },
    coins: {
      icon: Coins,
      iconColor: 'text-amber-500',
      bg: 'bg-amber-50 hover:bg-amber-100/80 border-amber-200/80 text-amber-700',
      bevel: 'border-b-2 border-b-amber-300',
      display: value
    },
    hearts: {
      icon: Heart,
      iconColor: 'text-rose-500 fill-rose-500',
      bg: 'bg-rose-50 hover:bg-rose-100/80 border-rose-200/80 text-rose-700',
      bevel: 'border-b-2 border-b-rose-300',
      display: `${value}/${max}`
    }
  }

  const config = configs[type] || configs.streak
  const Icon = config.icon

  const Comp = onClick ? 'button' : 'div'

  return (
    <Comp
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-extrabold tracking-wide select-none',
        'tabular-nums transition-[transform,background-color,border-color,color] duration-150',
        config.bg,
        config.bevel,
        onClick ? 'cursor-pointer active:translate-y-0.5 active:border-b' : '',
        className
      )}
    >
      <Icon className={cn('w-4 h-4 shrink-0', config.iconColor)} />
      <span>{config.display}</span>
    </Comp>
  )
}

export default GamifyBadge
