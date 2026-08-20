import React from 'react'
import { ChevronRight } from 'lucide-react'
import { cn } from '../../lib/utils'

/**
 * Standardized Action List Container
 */
export function ActionList({ children, className }) {
  return (
    <div className={cn('bg-white border border-slate-200 rounded-3xl overflow-hidden divide-y divide-slate-100 font-sans', className)}>
      {children}
    </div>
  )
}

/**
 * Standardized Action List Row (Drill-Down / Settings Action)
 */
export function ActionRow({
  icon: Icon,
  title,
  subtitle,
  rightElement,
  onClick,
  variant = 'default', // 'default' | 'danger'
  className,
}) {
  const isDanger = variant === 'danger'

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full p-4 sm:p-5 flex items-center justify-between text-left transition-colors duration-150 cursor-pointer select-none',
        isDanger ? 'hover:bg-rose-50/50' : 'hover:bg-slate-50/80',
        className
      )}
    >
      <div className="flex items-center gap-3.5 min-w-0">
        {Icon && (
          <div className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border',
            isDanger
              ? 'bg-rose-50 border-rose-200 text-rose-600'
              : 'bg-slate-100 border-slate-200/80 text-slate-600'
          )}>
            <Icon className="w-5 h-5" />
          </div>
        )}
        <div className="min-w-0 space-y-0.5">
          <p className={cn(
            'text-sm font-bold truncate',
            isDanger ? 'text-rose-600' : 'text-slate-800'
          )}>
            {title}
          </p>
          {subtitle && (
            <p className="text-xs text-slate-400 font-medium truncate">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 ml-3">
        {rightElement}
        <ChevronRight className={cn('w-4 h-4', isDanger ? 'text-rose-400' : 'text-slate-400')} />
      </div>
    </button>
  )
}

export default ActionRow
