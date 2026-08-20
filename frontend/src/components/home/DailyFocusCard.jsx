import React from 'react'
import { Link } from 'react-router-dom'
import { Target, CheckCircle2, ArrowRight } from 'lucide-react'
import { TactileButton } from '../ui/tactile-button'

export default function DailyFocusCard({
  quests = [],
  onClaim,
  user
}) {
  const completedCount = quests.filter(q => q.is_complete).length
  const totalCount = quests.length || 3
  const overallPercent = totalCount > 0 ? Math.min(100, Math.round((completedCount / totalCount) * 100)) : 0

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-indigo-600" aria-hidden="true" />
          <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
            Mục tiêu hôm nay
          </h3>
        </div>
        <Link 
          to="/quests" 
          className="text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline flex items-center gap-0.5"
        >
          <span>Tất cả</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Overall Daily Goal Bar */}
      <div className="space-y-1.5 p-3 rounded-xl bg-indigo-50/50 border border-indigo-100">
        <div className="flex justify-between text-xs font-bold">
          <span className="text-slate-700">Tiến độ nhiệm vụ</span>
          <span className="text-indigo-700 tabular-nums">
            {completedCount}/{totalCount} hoàn thành
          </span>
        </div>
        <div className="h-2 bg-slate-200/80 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-600 rounded-full transition-all duration-300"
            style={{ width: `${overallPercent === 0 ? 0 : Math.max(3, overallPercent)}%` }}
          />
        </div>
      </div>

      {/* Priority Quests List */}
      <div className="space-y-2">
        {quests.slice(0, 2).map((q) => {
          const isComplete = q.is_complete
          const isClaimed = q.coins_claimed
          const pct = Math.min(100, Math.round(((q.progress || 0) / (q.target || 1)) * 100))

          return (
            <div
              key={q.id}
              className="p-2.5 bg-slate-50/80 border border-slate-200 rounded-xl flex items-center justify-between gap-3"
            >
              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-800 truncate">{q.title}</span>
                  <span className="text-slate-500 tabular-nums shrink-0 ml-2">
                    {q.progress || 0}/{q.target || 1}
                  </span>
                </div>
                <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isComplete ? 'bg-emerald-500' : 'bg-indigo-500'
                    }`}
                    style={{ width: `${pct === 0 ? 0 : Math.max(3, pct)}%` }}
                  />
                </div>
              </div>

              {/* Action / Reward Badge */}
              <div className="shrink-0">
                {isComplete && !isClaimed ? (
                  <TactileButton
                    variant="amber"
                    size="xs"
                    onClick={() => onClaim(q.id)}
                  >
                    +{q.coin_reward} Xu
                  </TactileButton>
                ) : isClaimed ? (
                  <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Xong
                  </span>
                ) : (
                  <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-md tabular-nums">
                    +{q.coin_reward} Xu
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
