import { useState, useEffect } from 'react'
import { Flame } from 'lucide-react'
import api from '../lib/api'
import { t, fmt } from '../lib/locale'

export default function LearningStreakCard() {
  const [streak, setStreak] = useState(0)
  const [days, setDays] = useState([false, false, false, false, false, false, false])
  const [frozenDays, setFrozenDays] = useState([false, false, false, false, false, false, false])

  const [todayIndex, setTodayIndex] = useState(() => (new Date().getDay() + 6) % 7)
  const [todayCompleted, setTodayCompleted] = useState(false)
  const [longest, setLongest] = useState(0)
  const [weekStart, setWeekStart] = useState(null)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const res = await api.get('/progress/streak-week')
        if (!mounted) return
        if (res) {
          const d = Array.isArray(res.days) && res.days.length === 7 ? res.days.map(x => !!x) : [false, false, false, false, false, false, false]
          setDays(d)
          if (Array.isArray(res.frozen_days) && res.frozen_days.length === 7)
            setFrozenDays(res.frozen_days.map(x => !!x))
          if (typeof res.current_streak === 'number') setStreak(res.current_streak)
          if (typeof res.longest_streak === 'number') setLongest(res.longest_streak)
          if (typeof res.today_index === 'number') setTodayIndex(res.today_index)
          setTodayCompleted(Boolean(res.today_completed))
          if (res.week_start) setWeekStart(res.week_start)
        }
      } catch (e) {
        console.debug('Failed to load streak week', e)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  return (
    <div className="bg-white border-2 border-slate-200 rounded-3xl p-5 shadow-[0_4px_0_0_#E2E8F0] space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3.5">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-b-2 ${
          streak >= 7 
            ? 'bg-amber-500 border-amber-700 text-white shadow-sm' 
            : 'bg-amber-50 border-amber-200 text-amber-600'
        }`}>
          <Flame className={`w-6 h-6 ${streak >= 7 ? 'fill-white' : 'fill-amber-500'}`} />
        </div>
        <div className="flex-1">
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-extrabold text-slate-900 leading-none tabular-nums">{streak}</p>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
              {t.streakCard?.dayStreak || 'Ngày liên tiếp'}
            </span>
          </div>
          <p className="text-xs text-slate-400 font-semibold mt-1">
            Kỷ lục: <span className="text-slate-700 font-bold tabular-nums">{longest} ngày</span>
          </p>
        </div>
      </div>

      {/* Days Grid */}
      <div className="pt-2">
        <div className="grid grid-cols-7 gap-1.5 text-center">
          {(t.streakCard?.days || ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']).map((d, i) => {
            const isToday = i === todayIndex
            const done = Array.isArray(days) && !!days[i]
            const frozen = Array.isArray(frozenDays) && !done && !!frozenDays[i]

            return (
              <div key={d} className="flex flex-col items-center gap-1">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-extrabold transition-all ${
                    done
                      ? 'bg-amber-500 text-white border-b-2 border-amber-700 shadow-sm'
                      : frozen
                      ? 'bg-sky-400 text-white border-b-2 border-sky-600 shadow-sm'
                      : isToday
                      ? 'bg-slate-100 text-slate-700 border-2 border-dashed border-indigo-400'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {frozen ? '❄' : done ? '✓' : d[0]}
                </div>
                <span className={`text-[10px] font-bold ${isToday ? 'text-indigo-600' : 'text-slate-400'}`}>
                  {d}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Bottom Message */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold">
        {todayCompleted ? (
          <span className="text-emerald-600 flex items-center gap-1">
            ✓ {t.streakCard?.completedToday || 'Đã duy trì hôm nay!'}
          </span>
        ) : (
          <span className="text-amber-600 flex items-center gap-1">
            🔥 {t.streakCard?.notCompletedToday || 'Học 1 bài để giữ chuỗi!'}
          </span>
        )}
      </div>
    </div>
  )
}
