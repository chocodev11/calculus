import React from 'react'
import { Trophy, ArrowRight } from 'lucide-react'
import { TactileButton } from '../ui/tactile-button'

export default function MiniLeaderboardCard({
  rank = 1,
  userXp = 0,
  topUsers = [],
  onOpenFull,
  loading = false
}) {
  const getRankBadgeStyle = (r) => {
    if (r === 1) return 'bg-amber-100/90 text-amber-900 border-amber-300'
    if (r === 2) return 'bg-slate-200/80 text-slate-800 border-slate-300'
    if (r === 3) return 'bg-amber-200/60 text-amber-950 border-amber-300'
    return 'bg-slate-100 text-slate-700 border-slate-200'
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-500" aria-hidden="true" />
          <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
            Xếp hạng tuần
          </h3>
        </div>
        <span className="text-[11px] font-extrabold text-amber-800 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-md">
          Giải Vàng
        </span>
      </div>

      {/* User Current Rank Banner - Clean, No Redundant Medal Icon */}
      <div className="p-3 bg-slate-50/90 border border-slate-200 rounded-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg font-extrabold flex items-center justify-center text-xs tabular-nums border ${getRankBadgeStyle(rank)}`}>
            #{rank}
          </div>
          <div>
            <p className="text-xs font-extrabold text-slate-900 leading-tight">Thứ hạng của bạn</p>
            <p className="text-[11px] text-slate-500 font-medium tabular-nums">{userXp.toLocaleString()} XP tích lũy</p>
          </div>
        </div>
      </div>

      {/* Preview top 3 if loaded */}
      {topUsers && topUsers.length > 0 && (
        <div className="space-y-1 pt-0.5">
          {topUsers.slice(0, 3).map((u, i) => (
            <div
              key={u.id || i}
              className="flex items-center justify-between text-xs py-1 px-2 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className={`w-4 text-center font-extrabold tabular-nums text-xs ${
                  i === 0 ? 'text-amber-500' : i === 1 ? 'text-slate-400' : 'text-amber-700'
                }`}>
                  {i + 1}
                </span>
                <span className="font-bold text-slate-700 truncate max-w-[130px]">
                  {u.display_name || u.username}
                </span>
              </div>
              <span className="font-bold text-indigo-600 tabular-nums">
                {u.xp || 0} XP
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Button to open full modal */}
      <TactileButton
        variant="secondary"
        size="sm"
        onClick={onOpenFull}
        className="w-full text-xs font-bold"
      >
        <span>Xem bảng xếp hạng</span>
        <ArrowRight className="w-3.5 h-3.5 ml-1" />
      </TactileButton>
    </div>
  )
}
