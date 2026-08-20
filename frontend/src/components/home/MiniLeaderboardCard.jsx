import React from 'react'
import { Trophy, Medal, ArrowRight } from 'lucide-react'
import { TactileButton } from '../ui/tactile-button'

export default function MiniLeaderboardCard({
  rank = 1,
  userXp = 0,
  topUsers = [],
  onOpenFull,
  loading = false
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" aria-hidden="true" />
          <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
            Xếp hạng tuần
          </h3>
        </div>
        <span className="text-[11px] font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">
          Giải Vàng
        </span>
      </div>

      {/* User Current Rank Banner */}
      <div className="p-3.5 bg-slate-50/90 border border-slate-200 rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-100/80 text-amber-900 font-extrabold flex items-center justify-center text-xs tabular-nums border border-amber-200">
            #{rank}
          </div>
          <div>
            <p className="text-xs font-extrabold text-slate-900 leading-tight">Thứ hạng của bạn</p>
            <p className="text-[11px] text-slate-500 font-medium tabular-nums">{userXp} XP tích lũy</p>
          </div>
        </div>
        <Medal className="w-5 h-5 text-amber-500" aria-hidden="true" />
      </div>

      {/* Preview top 3 if loaded */}
      {topUsers && topUsers.length > 0 && (
        <div className="space-y-1.5 pt-1">
          {topUsers.slice(0, 3).map((u, i) => (
            <div
              key={u.id || i}
              className="flex items-center justify-between text-xs py-1.5 px-2 rounded-xl hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className={`w-4 text-center font-extrabold tabular-nums ${
                  i === 0 ? 'text-amber-500' : i === 1 ? 'text-slate-400' : 'text-amber-700'
                }`}>
                  {i + 1}
                </span>
                <span className="font-bold text-slate-700 truncate max-w-[120px]">
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
        className="w-full"
      >
        <span>Xem bảng xếp hạng đầy đủ</span>
        <ArrowRight className="w-3.5 h-3.5 ml-1" />
      </TactileButton>
    </div>
  )
}
