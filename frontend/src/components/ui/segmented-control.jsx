import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '../../lib/utils'

/**
 * Unified Segmented Control & Tab Switcher Primitive
 * Used strictly for view, filter, or category switching (Resting cards on a sunken track).
 * Never uses 2.5D push bevels because tabs represent states, not physical actions.
 */
export function SegmentedControl({
  options = [],
  value,
  onChange,
  size = 'md', // 'sm' | 'md' | 'lg'
  className,
  fullWidth = true
}) {
  const sizeConfig = {
    sm: {
      track: 'p-1 rounded-xl gap-1 text-xs',
      item: 'py-1.5 px-3 rounded-lg',
      icon: 'w-3.5 h-3.5',
    },
    md: {
      track: 'p-1.5 rounded-2xl gap-1.5 text-xs sm:text-sm',
      item: 'py-2.5 px-4 rounded-xl',
      icon: 'w-4 h-4',
    },
    lg: {
      track: 'p-2 rounded-2xl gap-2 text-sm sm:text-base',
      item: 'py-3 px-5 rounded-xl',
      icon: 'w-5 h-5',
    }
  }

  const cfg = sizeConfig[size] || sizeConfig.md

  return (
    <div
      role="tablist"
      className={cn(
        'bg-slate-100/90 border border-slate-200/80 font-sans select-none flex items-center',
        fullWidth ? 'w-full' : 'inline-flex',
        cfg.track,
        className
      )}
    >
      {options.map((opt) => {
        const optValue = typeof opt === 'object' && opt !== null ? opt.value : opt
        const optLabel = typeof opt === 'object' && opt !== null ? opt.label : opt
        const Icon = typeof opt === 'object' && opt !== null ? opt.icon : null
        const badge = typeof opt === 'object' && opt !== null ? opt.badge : null
        const isActive = value === optValue

        return (
          <button
            key={String(optValue)}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange?.(optValue)}
            className={cn(
              'relative flex items-center justify-center gap-2 font-extrabold transition-colors duration-150 cursor-pointer',
              fullWidth ? 'flex-1' : 'shrink-0',
              cfg.item,
              isActive
                ? 'bg-white text-indigo-700 border border-slate-200/80'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
            )}
          >
            {Icon && (
              <Icon className={cn(cfg.icon, isActive ? 'text-indigo-600' : 'text-slate-400')} />
            )}
            <span className="truncate">{optLabel}</span>
            {badge !== undefined && badge !== null && (
              <span className={cn(
                'text-[10px] font-black px-1.5 py-0.5 rounded-md tabular-nums',
                isActive ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-slate-200 text-slate-600'
              )}>
                {badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export default SegmentedControl
