import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Check,
  Play,
  Lock,
  Sparkles,
  BookOpen,
  GraduationCap,
  Layers,
  ChevronRight,
  X
} from 'lucide-react'
import { useAuthStore, useUIStore } from '../lib/store'
import api from '../lib/api'
import { t } from '../lib/locale'
import { TactileButton } from '../components/ui/tactile-button'
import { encodeStepId } from '../lib/utils'
import soundFX from '../lib/soundEffects'

export default function Story() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { user, isAuthenticated, fetchUser } = useAuthStore()
  const { showToast } = useUIStore()

  const [story, setStory] = useState(null)
  const [loading, setLoading] = useState(true)
  const [enrolling, setEnrolling] = useState(false)
  const [currentLesson, setCurrentLesson] = useState(null)

  const { totalLessons, completedLessons } = useMemo(() => {
    const allSteps = (story?.chapters || []).flatMap(ch => ch.steps || [])
    const total = allSteps.length
    const completed = allSteps.filter(s => s.is_completed).length
    return { totalLessons: total, completedLessons: completed }
  }, [story])

  const needsEnrollment = Boolean(story && !story.is_enrolled)

  useEffect(() => {
    loadStory()
  }, [slug])

  const loadStory = async () => {
    try {
      const data = await api.get(`/courses/${slug}`)
      setStory(data)

      // Find current active lesson
      if (data && data.chapters) {
        let found = null
        for (const ch of data.chapters) {
          for (const st of ch.steps || []) {
            if (st.is_current) {
              found = { chapter: ch, step: st }
              break
            }
          }
          if (found) break
        }
        if (!found) {
          for (const ch of data.chapters) {
            for (const st of ch.steps || []) {
              if (!st.is_completed) {
                found = { chapter: ch, step: st }
                break
              }
            }
            if (found) break
          }
        }
        if (!found && data.chapters.length > 0) {
          const firstCh = data.chapters[0]
          if (firstCh.steps && firstCh.steps.length > 0) {
            found = { chapter: firstCh, step: firstCh.steps[0] }
          }
        }
        setCurrentLesson(found)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleEnroll = async () => {
    if (!isAuthenticated()) {
      navigate('/login')
      return
    }

    setEnrolling(true)
    try {
      await api.post(`/courses/${slug}/enroll`)
      showToast('Đã đăng ký khoá học thành công!', 'success')
      await loadStory()
      await fetchUser()
    } catch (e) {
      showToast(e.message || 'Không thể đăng ký khoá học', 'error')
    } finally {
      setEnrolling(false)
    }
  }

  const handleContinueLearning = () => {
    if (needsEnrollment) {
      handleEnroll()
      return
    }
    if (currentLesson?.step) {
      navigate(`/course/${slug}/step/${encodeStepId(currentLesson.step.id)}`)
    } else if (story?.chapters?.[0]?.steps?.[0]) {
      navigate(`/course/${slug}/step/${encodeStepId(story.chapters[0].steps[0].id)}`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 py-8 font-sans">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-8">
            <div className="h-96 animate-pulse bg-slate-200 rounded-3xl" />
            <div className="h-96 animate-pulse bg-slate-200 rounded-3xl" />
          </div>
        </div>
      </div>
    )
  }

  if (!story) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
        <div className="text-center bg-white border border-slate-200 rounded-3xl p-8 space-y-4 max-w-sm">
          <p className="text-slate-600 font-bold">{t.story?.courseNotFound || 'Không tìm thấy khoá học'}</p>
          <TactileButton variant="secondary" onClick={() => navigate('/explore')} className="w-full">
            {t.story?.backToExplore || 'Quay lại Khám phá'}
          </TactileButton>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full font-sans pb-20">
      
      {/* ─── Clean Header Bar ────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 sticky top-16 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              to="/explore"
              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
              title="Quay lại Khám phá"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <span className="font-extrabold text-slate-900 truncate text-sm sm:text-base">
              {story.title}
            </span>
          </div>
        </div>
      </header>

      {/* ─── Main Two-Column View ────────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-8 items-start">

          {/* ── Left Column: Course Overview (Sticky) ── */}
          <div className="relative">
            <div className="lg:sticky lg:top-[140px]">
              <CourseOverviewCard
                story={story}
                totalLessons={totalLessons}
                completedLessons={completedLessons}
                needsEnrollment={needsEnrollment}
                onAction={handleContinueLearning}
                enrolling={enrolling}
                user={user}
              />
            </div>
          </div>

          {/* ── Right Column: Chapters & Lesson Stream ── */}
          <div className="space-y-6">
            {story.chapters?.map((chapter, index) => (
              <ChapterSection
                key={chapter.id}
                chapter={chapter}
                index={index}
                isEnrolled={story.is_enrolled}
                currentLesson={currentLesson}
                storySlug={story.slug}
              />
            ))}
          </div>

        </div>
      </main>

    </div>
  )
}

/**
 * Left Column: Focused Course Info Card
 * Adheres strictly to Less is More: No redundant badge soup, active primary CTA
 */
function CourseOverviewCard({ story, totalLessons, completedLessons, needsEnrollment, onAction, enrolling, user }) {
  const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0
  const isAllCompleted = totalLessons > 0 && completedLessons >= totalLessons
  const illustrationUrl = story.illustration || story.thumbnail_url
  const gradeLabel = story.grade_title || (story.grade ? `Toán ${story.grade}` : 'Toán 10')
  const topicLabel = story.topic_title || 'Mệnh đề & Logic'

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 space-y-5">
      
      {/* Icon / Illustration */}
      <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center p-2.5">
        {illustrationUrl ? (
          <img
            src={illustrationUrl}
            alt={story.title}
            className="w-full h-full object-contain"
            onError={e => { e.target.style.display = 'none' }}
          />
        ) : (
          <GraduationCap className="w-8 h-8 text-indigo-600" />
        )}
      </div>

      {/* Info: Unified Metadata Line (No Stacked Candy Badges) */}
      <div className="space-y-1.5">
        <p className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
          <span className="text-indigo-600 font-extrabold">{gradeLabel}</span>
          <span>·</span>
          <span>Chủ điểm {topicLabel}</span>
        </p>
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight leading-snug">
          {story.title}
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
          {story.description || 'Làm chủ các khái niệm toán học thông qua mô phỏng trực quan và bài tập tương tác.'}
        </p>
      </div>

      {/* Meta Specs (Quiet, No Heavy Border Divider) */}
      <div className="flex items-center gap-4 text-xs font-semibold text-slate-500 pt-1">
        <span className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-indigo-500" aria-hidden="true" />
          <span className="tabular-nums">{totalLessons} bài học</span>
        </span>
        <span className="flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
          <span className="tabular-nums">{story.chapters?.length || 1} chương</span>
        </span>
      </div>

      {/* Progress Section (Only when enrolled) */}
      {!needsEnrollment && (
        <div className="space-y-2 pt-2">
          <div className="flex justify-between text-xs font-bold">
            <span className="text-slate-700">Tiến độ khóa học</span>
            <span className="text-indigo-600 tabular-nums font-extrabold">{progressPercent}%</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-indigo-600 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400 font-medium text-right tabular-nums">
            Đã xong {completedLessons} / {totalLessons} bài
          </p>
        </div>
      )}

      {/* Active Primary Action Button */}
      <div className="pt-2">
        <TactileButton
          variant={isAllCompleted ? 'amber' : 'primary'}
          size="md"
          onClick={onAction}
          disabled={enrolling}
          className="w-full text-sm font-extrabold"
        >
          {needsEnrollment ? (
            enrolling ? 'Đang đăng ký...' : user ? 'Bắt đầu học ngay' : 'Đăng nhập để học'
          ) : isAllCompleted ? (
            'Ôn tập lại khóa học'
          ) : (
            <>
              <Play className="w-4 h-4 mr-1.5 fill-white" />
              <span>Tiếp tục học ngay</span>
            </>
          )}
        </TactileButton>
      </div>

    </div>
  )
}

/**
 * Right Column: Chapter Section with Frameless Step Rows
 * Eliminates the Card-in-Card nesting problem.
 */
function ChapterSection({ chapter, index, isEnrolled, currentLesson, storySlug }) {
  const [selectedLesson, setSelectedLesson] = useState(null)
  const steps = chapter.steps || []
  const completedCount = steps.filter(s => s.is_completed).length

  return (
    <section className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 space-y-4">
      
      {/* Chapter Title & Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
        <div className="flex items-center gap-2.5">
          <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-700 font-extrabold text-xs flex items-center justify-center tabular-nums shrink-0">
            {index + 1}
          </span>
          <h3 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
            {chapter.title}
          </h3>
        </div>
        <span className="text-xs font-extrabold text-slate-400 tabular-nums">
          {completedCount}/{steps.length} xong
        </span>
      </div>

      {/* Clean Step List (No Card-in-Card Nesting) */}
      <div className="space-y-1">
        {steps.map((step, stepIndex) => {
          const isCurrentStep = currentLesson?.step?.id === step.id
          const isCompleted = step.is_completed
          const isLocked = !isEnrolled || (!isCompleted && !isCurrentStep)

          return (
            <LessonRow
              key={step.id}
              step={step}
              index={stepIndex}
              isCompleted={isCompleted}
              isCurrent={isCurrentStep}
              isLocked={isLocked}
              onSelect={() => setSelectedLesson({ step, isLocked })}
            />
          )
        })}
      </div>

      {/* Lesson Details Modal */}
      <LessonModal
        lesson={selectedLesson?.step}
        isLocked={selectedLesson?.isLocked}
        onClose={() => setSelectedLesson(null)}
        storySlug={storySlug}
      />
    </section>
  )
}

/**
 * Streamlined Lesson Row (Frameless, clean typographic focus)
 */
function LessonRow({ step, index, isCompleted, isCurrent, isLocked, onSelect }) {
  const handleClick = () => {
    soundFX.play('tap')
    onSelect()
  }

  return (
    <div
      onClick={handleClick}
      className={`group flex items-center justify-between p-3 rounded-xl transition-colors cursor-pointer select-none ${
        isCurrent
          ? 'bg-indigo-50/80 text-indigo-950 font-bold'
          : isCompleted
          ? 'hover:bg-slate-50 text-slate-800'
          : isLocked
          ? 'text-slate-400 opacity-50 cursor-not-allowed'
          : 'hover:bg-slate-50 text-slate-700'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        
        {/* Crisp Status Node */}
        <div
          className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 transition-transform ${
            isCompleted
              ? 'bg-emerald-500 text-white'
              : isCurrent
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-100 text-slate-400'
          }`}
        >
          {isCompleted ? (
            <Check className="w-4 h-4 stroke-[3]" />
          ) : isCurrent ? (
            <Play className="w-3 h-3 fill-white ml-0.5" />
          ) : (
            <Lock className="w-3 h-3" />
          )}
        </div>

        {/* Step Title */}
        <div className="min-w-0">
          <p className={`text-xs sm:text-sm truncate ${isCurrent ? 'font-extrabold text-indigo-950' : 'font-semibold'}`}>
            <span className="tabular-nums mr-1.5 opacity-60">
              {String(index + 1).padStart(2, '0')}.
            </span>
            {step.title}
          </p>
        </div>
      </div>

      {/* Status Label (Only when active or completed) */}
      <div className="shrink-0 ml-2">
        {isCurrent ? (
          <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-indigo-600 text-white">
            Đang học
          </span>
        ) : isCompleted ? (
          <span className="text-xs font-bold text-slate-400 group-hover:text-indigo-600 transition-colors">
            Ôn lại
          </span>
        ) : null}
      </div>
    </div>
  )
}

/**
 * Clean Lesson Modal
 */
function LessonModal({ lesson, isLocked, onClose, storySlug }) {
  const navigate = useNavigate()
  if (!lesson) return null

  const handleStart = () => {
    onClose()
    navigate(`/course/${storySlug}/step/${encodeStepId(lesson.id)}`)
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md p-6 sm:p-7 space-y-5 animate-in fade-in zoom-in-95 duration-150 shadow-xl">
        
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600">
            {lesson.duration || '3 - 5 phút'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-1.5">
          <h3 className="text-lg font-extrabold text-slate-900 tracking-tight leading-snug">
            {lesson.title}
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
            {lesson.description || 'Thực hành các câu hỏi trực quan để nắm vững trực giác toán học.'}
          </p>
        </div>

        <div className="pt-2">
          {!isLocked ? (
            <TactileButton variant="primary" size="md" onClick={handleStart} className="w-full">
              <Play className="w-4 h-4 mr-1.5 fill-white" />
              <span>Bắt đầu bài học</span>
            </TactileButton>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-rose-500 font-bold text-center flex items-center justify-center gap-1.5">
                <Lock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>Bài học đang bị khóa. Hãy hoàn thành bài trước để mở!</span>
              </p>
              <TactileButton variant="secondary" size="sm" onClick={onClose} className="w-full">
                Đã hiểu
              </TactileButton>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
