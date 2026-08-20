import { clsx } from 'clsx'
import { CheckCircle2, AlertTriangle, Info, XCircle } from 'lucide-react'

export default function Toast({ message, type = 'info' }) {
  const icons = {
    success: CheckCircle2,
    error: XCircle,
    warning: AlertTriangle,
    info: Info,
  }
  const Icon = icons[type] || Info

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
      <div className={clsx(
        'flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border font-bold text-xs sm:text-sm select-none',
        type === 'success' && 'bg-emerald-50 border-emerald-300 text-emerald-900',
        type === 'error' && 'bg-rose-50 border-rose-300 text-rose-900',
        type === 'warning' && 'bg-amber-50 border-amber-300 text-amber-900',
        type === 'info' && 'bg-white border-slate-200 text-slate-800'
      )}>
        <Icon className={clsx(
          'w-4 h-4 shrink-0',
          type === 'success' && 'text-emerald-600',
          type === 'error' && 'text-rose-600',
          type === 'warning' && 'text-amber-600',
          type === 'info' && 'text-indigo-600'
        )} />
        <span>{message}</span>
      </div>
    </div>
  )
}
