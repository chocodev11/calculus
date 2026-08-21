import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Trophy,
  BookOpen,
  X as XIcon,
  Medal,
  ArrowUpRight
} from 'lucide-react'
import { useAuthStore, useQuestStore } from '../lib/store'
import api from '../lib/api'
import Landing from './Landing'
import { TactileButton } from '../components/ui/tactile-button'
import { encodeStepId } from '../lib/utils'

// Home Subcomponents
import NextLessonHero from '../components/home/NextLessonHero'
import SuggestedCoursesCard from '../components/home/SuggestedCoursesCard'
import DailyFocusCard from '../components/home/DailyFocusCard'
import MiniLeaderboardCard from '../components/home/MiniLeaderboardCard'

export default function Home() {
  const { user, isAuthenticated, fetchUser } = useAuthStore()
  const { quests, fetchQuests, claimQuest } = useQuestStore()
  const navigate = useNavigate()

  const [dashboardData, setDashboardData] = useState(null)
  const [allAvailableCourses, setAllAvailableCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [leaderboardUsers, setLeaderboardUsers] = useState([])
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false)
  const [topUsersPreview, setTopUsersPreview] = useState([])

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
        const storiesRes = await api.get('/courses')
        if (Array.isArray(storiesRes)) {
          setAllAvailableCourses(storiesRes)
        }
      } catch (e) {
        console.debug('Failed to fetch courses', e)
      }
      try {
        const rankRes = await api.get('/progress/leaderboard?limit=5')
        if (rankRes?.users) {
          setTopUsersPreview(rankRes.users)
        }
        if (rankRes && typeof rankRes.current_user_rank !== 'undefined') {
          setDashboardData(prev => ({ ...(prev || {}), rank: rankRes.current_user_rank }))
        }
      } catch (e) {
        console.debug('Failed to fetch rank', e)
      }
    } catch (e) {
      console.error('Failed to load dashboard:', e)
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

  // Not authenticated -> Landing page
  if (!isAuthenticated()) {
    return <Landing />
  }

  const courses = dashboardData?.in_progress_stories || (dashboardData?.current_story ? [dashboardData.current_story] : [])
  const primaryCourse = courses[0] || null

  // Extract current step and chapter from primary course
  const { currentChapter, currentStep, nextStepId } = useMemo(() => {
    if (!primaryCourse || !primaryCourse.chapters) {
      return { currentChapter: null, currentStep: null, nextStepId: null }
    }

    let foundChapter = null
    let foundStep = null

    // 1. Search for explicitly marked current step
    for (const ch of primaryCourse.chapters) {
      for (const st of ch.steps || []) {
        if (st.is_current) {
          foundChapter = ch
          foundStep = st
          break
        }
      }
      if (foundStep) break
    }

    // 2. Fallback to first incomplete step
    if (!foundStep) {
      for (const ch of primaryCourse.chapters) {
        for (const st of ch.steps || []) {
          if (!st.is_completed) {
            foundChapter = ch
            foundStep = st
            break
          }
        }
        if (foundStep) break
      }
    }

    // 3. Fallback to first step if all completed or empty
    if (!foundStep && primaryCourse.chapters.length > 0) {
      foundChapter = primaryCourse.chapters[0]
      foundStep = foundChapter.steps?.[0] || null
    }

    return {
      currentChapter: foundChapter,
      currentStep: foundStep,
      nextStepId: foundStep?.id || null
    }
  }, [primaryCourse])

  // Suggested courses that user has not finished and are not the primary course
  const suggestedCourses = useMemo(() => {
    const inProgressOther = (dashboardData?.in_progress_stories || []).filter(
      c => c.slug !== primaryCourse?.slug && (c.progress_percent ?? c.progress ?? 0) < 100
    )

    const inProgressSlugs = new Set(inProgressOther.map(c => c.slug))
    if (primaryCourse) {
      inProgressSlugs.add(primaryCourse.slug)
    }

    const uncompletedOther = allAvailableCourses.filter(
      c => !inProgressSlugs.has(c.slug) && (c.progress_percent ?? c.progress ?? 0) < 100
    )

    return [...inProgressOther, ...uncompletedOther].slice(0, 4)
  }, [dashboardData, primaryCourse, allAvailableCourses])

  const handleContinueLesson = () => {
    if (primaryCourse && nextStepId) {
      navigate(`/course/${primaryCourse.slug}/step/${encodeStepId(nextStepId)}`)
    } else if (primaryCourse) {
      navigate(`/course/${primaryCourse.slug}`)
    } else {
      navigate('/explore')
    }
  }

  const handleViewCourseOutline = () => {
    if (primaryCourse) {
      navigate(`/course/${primaryCourse.slug}`)
    } else {
      navigate('/explore')
    }
  }

  const handleClaimQuest = async (questId) => {
    try {
      await claimQuest(questId)
      fetchUser()
    } catch (e) {
      console.error('Failed to claim quest:', e)
    }
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-6 space-y-6 font-sans">
      
      {/* ─── Main 2-Column Grid: 8 cols Learning Focus + 4 cols Companion Sidebar ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ── Left Column: Primary Learning Stream (70% width on desktop) ── */}
        <main className="lg:col-span-8 space-y-6" aria-label="Khu vực học tập chính">
          
          {/* 1. Next Lesson Hero Card (Single Focal Point + Integrated Progress Bar) */}
          <NextLessonHero
            course={primaryCourse}
            currentChapter={currentChapter}
            currentStep={currentStep}
            onContinue={handleContinueLesson}
            onViewOutline={handleViewCourseOutline}
            loading={loading}
          />

          {/* 2. Suggested & Other Uncompleted Courses (Not the active lesson) */}
          <SuggestedCoursesCard
            courses={suggestedCourses}
            loading={loading}
          />

        </main>

        {/* ── Right Column: Companion Sidebar (30% width on desktop) ── */}
        <aside className="lg:col-span-4 space-y-5" aria-label="Tiện ích đồng hành">
          
          {/* Module 1: Daily Focus & Priority Quests */}
          <DailyFocusCard
            quests={quests}
            onClaim={handleClaimQuest}
            user={user}
          />

          {/* Module 2: Compact Weekly Leaderboard */}
          <MiniLeaderboardCard
            rank={dashboardData?.rank || 1}
            userXp={user?.xp || 0}
            topUsers={topUsersPreview}
            onOpenFull={() => {
              setShowLeaderboard(true)
              loadFullLeaderboard()
            }}
            loading={loading}
          />

          {/* Module 3: Tactical Micro-Tip */}
          <div className="p-3.5 rounded-xl bg-slate-100/70 border border-slate-200 text-slate-500 text-xs font-medium leading-relaxed space-y-1">
            <p className="font-bold text-slate-700 flex items-center gap-1.5">
              <span>💡 Gợi ý học tập</span>
            </p>
            <p>
              Học 1 bài học mỗi ngày giúp duy trì trực giác hình học và giữ vững chuỗi học tập đều đặn.
            </p>
          </div>

        </aside>

      </div>

      {/* ─── Full Leaderboard Modal ─────────────────────────────────────────── */}
      {showLeaderboard && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="leaderboard-modal-title"
        >
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150 shadow-xl">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" aria-hidden="true" />
                <h3 id="leaderboard-modal-title" className="text-lg font-extrabold text-slate-900">
                  Bảng xếp hạng tuần
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowLeaderboard(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                aria-label="Đóng bảng xếp hạng"
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
                          ? 'bg-indigo-50/80 border-indigo-200 text-indigo-900 font-extrabold'
                          : 'bg-white border-slate-100 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-6 text-center text-xs font-extrabold tabular-nums ${
                          i === 0 ? 'text-amber-500 text-sm' : i === 1 ? 'text-slate-400 text-sm' : i === 2 ? 'text-amber-700 text-sm' : 'text-slate-400'
                        }`}>
                          {i + 1}
                        </span>
                        <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700">
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
