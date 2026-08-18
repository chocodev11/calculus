import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { t, fmt } from '../lib/locale'
import {
  Flame,
  Zap,
  Trophy,
  Crown,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Target,
  Calendar,
  Award,
  TrendingUp,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Play,
  Layers,
  Clock,
  X as XIcon,
  Medal,
  ScrollText
} from 'lucide-react'
import { useAuthStore, useQuestStore } from '../lib/store'
import api from '../lib/api'
import Landing from './Landing'
import LearningStreakCard from '../components/LearningStreakCard'
import HeartsCard from '../components/HeartsCard'
import { TactileButton } from '../components/ui/tactile-button'
import { GamifyBadge } from '../components/ui/gamify-badge'
import { encodeStepId } from '../lib/utils'

export default function Home() {
  const { user, isAuthenticated, fetchUser } = useAuthStore()
  const { quests, fetchQuests, claimCoins } = useQuestStore()
  const navigate = useNavigate()

  const [dashboardData, setDashboardData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [leaderboardUsers, setLeaderboardUsers] = useState([])
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false)
  const [friendlyLine] = useState(() => {
    const list = t.home?.friendlyMessages || [
      'Rất vui được gặp lại bạn!',
      'Hôm nay bạn muốn chinh phục định lý nào?',
      'Từng bước nhỏ tạo nên sự đột phá lớn.',
      'Sẵn sàng duy trì chuỗi học tập chưa?'
    ]
    return list[Math.floor(Math.random() * list.length)]
  })

  useEffect(() => {
    if (!isAuthenticated()) {
      setLoading(false)
      return
    }
    fetchUser()
    loadDashboard()
    fetchQuests()
  }, [])

  const loadDashboard = async () => {
    try {
      const data = await api.get('/progress/dashboard')
      setDashboardData(data)
      try {
        const rankRes = await api.get('/progress/leaderboard?around=true&limit=1')
        if (rankRes && typeof rankRes.current_user_rank !== 'undefined') {
          setDashboardData(prev => ({ ...(prev || {}), rank: rankRes.current_user_rank }))
        }
      } catch (e) {
        console.debug('Failed to fetch rank', e)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const loadFullLeaderboard = async () => {
    setLoadingLeaderboard(true)
    try {
      const data = await api.get('/progress/leaderboard?limit=20')
      setLeaderboardUsers(data?.users || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingLeaderboard(false)
    }
  }

  if (!isAuthenticated()) {
    return <Landing />
  }

  const courses = dashboardData?.in_progress_stories || (dashboardData?.current_story ? [dashboardData.current_story] : [])
  const primaryCourse = courses[0] || null

  const xpValue = user?.xp || 0
  const currentLevel = Math.floor(xpValue / 100) + 1
  const levelProgress = xpValue % 100
  const xpNeeded = 100 - levelProgress

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8 font-sans">
      
      {/* ─── Top Greeting Banner ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border-2 border-slate-200 rounded-3xl p-6 shadow-[0_4px_0_0_#E2E8F0]">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Chào mừng, {user?.display_name || user?.username || 'Học viên'}! 👋
          </h1>
          <p className="text-sm font-medium text-slate-500">
            {friendlyLine}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <GamifyBadge type="streak" value={user?.current_streak || 0} />
          <GamifyBadge type="xp" value={user?.xp || 0} />
          <GamifyBadge type="hearts" value={user?.hearts ?? 5} max={5} />
        </div>
      </div>

      {/* ─── Main Grid: 2-Column Responsive Layout ─────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column (Courses & Quests) */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* 1. Primary Active Course Hero Card */}
          {loading ? (
            <div className="h-64 bg-slate-200 animate-pulse rounded-3xl" />
          ) : primaryCourse ? (
            <div className="bg-white border-2 border-indigo-200 rounded-3xl p-6 sm:p-8 shadow-[0_6px_0_0_#C7D2FE] relative overflow-hidden space-y-6">
              
              {/* Background Accent */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 rounded-full blur-3xl -z-0 pointer-events-none" />

              <div className="flex items-center justify-between relative z-10">
                <span className="inline-flex items-center gap-1.5 text-xs font-extrabold px-3 py-1 rounded-full bg-indigo-100 text-indigo-700">
                  <BookOpen className="w-3.5 h-3.5" />
                  Đang học tiếp
                </span>
                <span className="text-xs font-bold text-slate-400 tabular-nums">
                  {primaryCourse.total_steps ? `${primaryCourse.completed_steps || 0}/${primaryCourse.total_steps} bài học` : ''}
                </span>
              </div>

              <div className="space-y-2 relative z-10">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {primaryCourse.title}
                </h2>
                <p className="text-sm text-slate-600 font-medium max-w-xl line-clamp-2">
                  {primaryCourse.description || 'Tiếp tục bài học tiếp theo để mở khóa toàn bộ trực giác giải tích.'}
                </p>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2 relative z-10">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-600">Tiến độ khoá học</span>
                  <span className="text-indigo-600 tabular-nums">
                    {Math.round(primaryCourse.progress_percent || 0)}%
                  </span>
                </div>
                <div className="h-3.5 rounded-full bg-slate-100 p-0.5 border border-slate-200 overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(5, primaryCourse.progress_percent || 0)}%` }}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3 relative z-10">
                {primaryCourse.next_step_id ? (
                  <TactileButton
                    variant="primary"
                    size="lg"
                    onClick={() => navigate(`/course/${primaryCourse.slug}/step/${encodeStepId(primaryCourse.next_step_id)}`)}
                    className="w-full sm:w-auto shadow-md"
                  >
                    <Play className="w-5 h-5 mr-1.5 fill-white" />
                    <span>Tiếp tục học ngay</span>
                    <ArrowRight className="w-5 h-5 ml-1.5" />
                  </TactileButton>
                ) : (
                  <TactileButton
                    variant="primary"
                    size="lg"
                    onClick={() => navigate(`/course/${primaryCourse.slug}`)}
                    className="w-full sm:w-auto"
                  >
                    <span>Vào khoá học</span>
                    <ArrowRight className="w-5 h-5 ml-1.5" />
                  </TactileButton>
                )}

                <TactileButton
                  variant="secondary"
                  size="lg"
                  onClick={() => navigate(`/course/${primaryCourse.slug}`)}
                  className="w-full sm:w-auto"
                >
                  <span>Xem đề cương</span>
                </TactileButton>
              </div>

            </div>
          ) : (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-10 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Compass className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-slate-900">Bắt đầu học giải tích</h3>
                <p className="text-sm text-slate-500 max-w-md mx-auto">
                  Bạn chưa bắt đầu khoá học nào. Hãy chọn một chủ đề trong mục Khám phá để bắt đầu!
                </p>
              </div>
              <TactileButton variant="primary" onClick={() => navigate('/explore')}>
                Khám phá các khoá học <ArrowRight className="w-4 h-4 ml-1.5" />
              </TactileButton>
            </div>
          )}

          {/* 2. Other In-Progress Courses */}
          {courses.length > 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-600" />
                Các khoá học khác
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {courses.slice(1).map(c => (
                  <div 
                    key={c.slug}
                    onClick={() => navigate(`/course/${c.slug}`)}
                    className="bg-white border-2 border-slate-200 rounded-2xl p-5 shadow-[0_4px_0_0_#E2E8F0] hover:border-indigo-300 transition-all cursor-pointer space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600">
                        {Math.round(c.progress_percent || 0)}%
                      </span>
                      <ArrowUpRight className="w-4 h-4 text-slate-400" />
                    </div>
                    <h4 className="text-base font-bold text-slate-900">{c.title}</h4>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${c.progress_percent || 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Daily Quests Progress */}
          <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 shadow-[0_4px_0_0_#E2E8F0] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ScrollText className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-extrabold text-slate-900">Nhiệm vụ hàng ngày</h3>
              </div>
              <Link to="/quests" className="text-xs font-bold text-indigo-600 hover:underline">
                Xem tất cả ({quests.length})
              </Link>
            </div>

            <div className="space-y-3">
              {quests.slice(0, 3).map(q => {
                const isComplete = q.is_complete
                const isClaimed = q.coins_claimed
                const pct = Math.min(100, Math.round((q.progress / (q.target || 1)) * 100))

                return (
                  <div key={q.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-4">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-800 truncate">{q.title}</span>
                        <span className="text-slate-500 tabular-nums shrink-0 ml-2">
                          {q.progress} / {q.target}
                        </span>
                      </div>
                      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${isComplete ? 'bg-emerald-500' : 'bg-amber-500'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    <div className="shrink-0">
                      {isComplete && !isClaimed ? (
                        <button
                          onClick={() => claimCoins(q.id)}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-white font-extrabold text-xs rounded-xl border-b-2 border-amber-700 active:border-b-0 active:translate-y-0.5 transition-all shadow-sm"
                        >
                          Nhận +{q.coin_reward} Xu
                        </button>
                      ) : isClaimed ? (
                        <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" /> Đã nhận
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-slate-400">
                          +{q.coin_reward} Xu
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

        </div>

        {/* Right Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Learning Streak Card */}
          <LearningStreakCard />

          {/* Hearts Card */}
          <HeartsCard />

          {/* User Level & XP Progress Card */}
          <div className="bg-white border-2 border-slate-200 rounded-3xl p-5 shadow-[0_4px_0_0_#E2E8F0] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-extrabold text-slate-900">Cấp độ & XP</h3>
              </div>
              <span className="text-xs font-extrabold px-2.5 py-1 rounded-xl bg-indigo-100 text-indigo-700 tabular-nums">
                Cấp {currentLevel}
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-500">Tiến độ lên Cấp {currentLevel + 1}</span>
                <span className="text-indigo-600 tabular-nums">{levelProgress} / 100 XP</span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
                <div
                  className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                  style={{ width: `${levelProgress}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400 font-medium text-right tabular-nums">
                Cần thêm {xpNeeded} XP để lên cấp
              </p>
            </div>
          </div>

          {/* Leaderboard Snapshot Card */}
          <div className="bg-white border-2 border-slate-200 rounded-3xl p-5 shadow-[0_4px_0_0_#E2E8F0] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-extrabold text-slate-900">Bảng xếp hạng tuần</h3>
              </div>
              <span className="text-xs font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">
                Top 20
              </span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 font-extrabold flex items-center justify-center text-xs">
                  #{dashboardData?.rank || 1}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">Thứ hạng của bạn</p>
                  <p className="text-[11px] text-slate-500 font-medium">{user?.xp || 0} XP tích lũy</p>
                </div>
              </div>
              <Medal className="w-5 h-5 text-amber-500" />
            </div>

            <TactileButton
              variant="secondary"
              size="sm"
              onClick={() => {
                setShowLeaderboard(true)
                loadFullLeaderboard()
              }}
              className="w-full"
            >
              Xem bảng xếp hạng đầy đủ
            </TactileButton>
          </div>

        </div>

      </div>

      {/* ─── Leaderboard Modal ─────────────────────────────────────────── */}
      {showLeaderboard && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-slate-200 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                <h3 className="text-lg font-extrabold text-slate-900">Bảng xếp hạng tuần</h3>
              </div>
              <button
                onClick={() => setShowLeaderboard(false)}
                className="p-1 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            {/* List */}
            <div className="p-4 overflow-y-auto space-y-2 flex-1">
              {loadingLeaderboard ? (
                <div className="p-8 text-center text-slate-400 font-bold text-sm">
                  Đang tải bảng xếp hạng...
                </div>
              ) : leaderboardUsers.length > 0 ? (
                leaderboardUsers.map((u, i) => {
                  const isCurrent = u.id === user?.id
                  return (
                    <div
                      key={u.id || i}
                      className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                        isCurrent
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-900 font-extrabold'
                          : 'bg-white border-slate-100 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-6 text-center text-xs font-extrabold tabular-nums ${
                          i === 0 ? 'text-amber-500 text-sm' : i === 1 ? 'text-slate-400 text-sm' : i === 2 ? 'text-amber-700 text-sm' : 'text-slate-400'
                        }`}>
                          {i + 1}
                        </span>
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs">
                          {(u.display_name || u.username || 'U')[0].toUpperCase()}
                        </div>
                        <span className="text-sm font-bold truncate max-w-[140px]">
                          {u.display_name || u.username} {isCurrent && '(Bạn)'}
                        </span>
                      </div>

                      <span className="text-xs font-extrabold text-indigo-600 tabular-nums">
                        {u.xp || 0} XP
                      </span>
                    </div>
                  )
                })
              ) : (
                <div className="p-8 text-center text-slate-400 text-sm">
                  Chưa có dữ liệu bảng xếp hạng tuần này.
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50">
              <TactileButton variant="secondary" size="sm" onClick={() => setShowLeaderboard(false)} className="w-full">
                Đóng
              </TactileButton>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}
