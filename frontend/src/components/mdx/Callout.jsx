import React from 'react'
import { BookOpen, Lightbulb, AlertTriangle, Info, GraduationCap, CheckCircle2 } from 'lucide-react'
import { cn } from '../../lib/utils'

const VARIANT_CONFIG = {
  theorem: {
    icon: GraduationCap,
    label: 'Định lý',
    bg: 'bg-indigo-50/70 dark:bg-indigo-950/30',
    border: 'border-indigo-200 dark:border-indigo-800',
    titleColor: 'text-indigo-900 dark:text-indigo-200',
    iconColor: 'text-indigo-600 dark:text-indigo-400',
    shadow: 'shadow-[0_3px_0_0_#C7D2FE] dark:shadow-[0_3px_0_0_#3730A3]',
  },
  definition: {
    icon: BookOpen,
    label: 'Định nghĩa',
    bg: 'bg-cyan-50/70 dark:bg-cyan-950/30',
    border: 'border-cyan-200 dark:border-cyan-800',
    titleColor: 'text-cyan-900 dark:text-cyan-200',
    iconColor: 'text-cyan-600 dark:text-cyan-400',
    shadow: 'shadow-[0_3px_0_0_#A5F3FC] dark:shadow-[0_3px_0_0_#155E75]',
  },
  tip: {
    icon: Lightbulb,
    label: 'Mẹo nhớ',
    bg: 'bg-amber-50/70 dark:bg-amber-950/30',
    border: 'border-amber-200 dark:border-amber-800',
    titleColor: 'text-amber-900 dark:text-amber-200',
    iconColor: 'text-amber-600 dark:text-amber-400',
    shadow: 'shadow-[0_3px_0_0_#FDE68A] dark:shadow-[0_3px_0_0_#854D0E]',
  },
  warning: {
    icon: AlertTriangle,
    label: 'Lưu ý / Sai lầm phổ biến',
    bg: 'bg-rose-50/70 dark:bg-rose-950/30',
    border: 'border-rose-200 dark:border-rose-800',
    titleColor: 'text-rose-900 dark:text-rose-200',
    iconColor: 'text-rose-600 dark:text-rose-400',
    shadow: 'shadow-[0_3px_0_0_#FECDD3] dark:shadow-[0_3px_0_0_#9F1239]',
  },
  example: {
    icon: CheckCircle2,
    label: 'Ví dụ minh họa',
    bg: 'bg-emerald-50/70 dark:bg-emerald-950/30',
    border: 'border-emerald-200 dark:border-emerald-800',
    titleColor: 'text-emerald-900 dark:text-emerald-200',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    shadow: 'shadow-[0_3px_0_0_#A7F3D0] dark:shadow-[0_3px_0_0_#065F46]',
  },
  note: {
    icon: Info,
    label: 'Ghi chú',
    bg: 'bg-slate-50 dark:bg-slate-900/50',
    border: 'border-slate-200 dark:border-slate-800',
    titleColor: 'text-slate-900 dark:text-slate-200',
    iconColor: 'text-slate-600 dark:text-slate-400',
    shadow: 'shadow-[0_3px_0_0_#E2E8F0] dark:shadow-[0_3px_0_0_#334155]',
  }
}

export function Callout({ variant = 'note', title, children, body }) {
  const config = VARIANT_CONFIG[variant] || VARIANT_CONFIG.note
  const Icon = config.icon

  return (
    <div className={cn(
      'my-5 rounded-2xl border-2 p-5 transition-all',
      config.bg,
      config.border,
      config.shadow
    )}>
      <div className="flex items-start gap-3">
        <div className={cn('p-2 rounded-xl bg-white/80 dark:bg-slate-800/80 shadow-sm shrink-0 mt-0.5', config.iconColor)}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className={cn('font-black text-base tracking-tight mb-1.5 flex items-center gap-2', config.titleColor)}>
            <span>{title || config.label}</span>
          </div>
          <div className="text-slate-700 dark:text-slate-300 text-sm md:text-base leading-relaxed space-y-2">
            {body && <p>{body}</p>}
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Callout
