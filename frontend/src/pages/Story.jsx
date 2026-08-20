import { useState, useEffect } from 'react'
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-8">
            <div className="h-96 animate-pulse bg-slate-200 rounded-3xl" />
            <div className="h-96 animate-pulse bg-slate-200 rounded-3xl" />
          </div>
        </div>
      </div>
    )
  }

  if (!story) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center bg-white border border-slate-200 rounded-3xl p-8 space-y-4 max-w-sm">
          <p className="text-slate-600 font-bold">{t.story?.courseNotFound || 'Không tìm thấy khoá học'}</p>
          <TactileButton variant="secondary" onClick={() => navigate('/explore')} className="w-full">
            {t.story?.backToExplore || 'Quay lại Khám phá'}
          </TactileButton>
        </div>
      </div>
    )
  }

  const needsEnrollment = !story.is_enrolled

  return (
    <div className="w-full font-sans">
      
      {/* Top Breadcrumb Navigation */}
      <div className="bg-white border-b border-slate-200 sticky top-16 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              to="/explore"
              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="font-extrabold text-slate-900 truncate text-base sm:text-lg">
              {story.title}
            </h1>
          </div>
          {story.is_enrolled && (
            <span className="shrink-0 text-xs font-extrabold px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/80 tabular-nums">
              {Math.round(story.progress || 0)}% Hoàn thành
            </span>
          )}
        </div>
      </div>

      {/* Main Two-Column Course View */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-8">

          {/* Left Column: Course Overview Card */}
          <div className="relative">
            <div className="lg:sticky lg:top-[144px]">
              <CourseOverviewCard
                story={story}
                totalLessons={story.total_steps || story.steps_count || 0}
                completedLessons={story.completed_steps || 0}
                needsEnrollment={needsEnrollment}
                onEnroll={handleEnroll}
                enrolling={enrolling}
                user={user}
              />
            </div>
          </div>

          {/* Right Column: Chapters & Lessons Path */}
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
      </div>

    </div>
  )
}

function CourseOverviewCard({ story, totalLessons, completedLessons, needsEnrollment, onEnroll, enrolling, user }) {
  const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0
  const illustrationUrl = story.illustration || story.thumbnail_url

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6">
      
      {/* Icon / Illustration */}
      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-indigo-50 border border-indigo-100 flex items-center justify-center p-3">
        {illustrationUrl ? (
          <img
            src={illustrationUrl}
            alt={story.title}
            className="w-full h-full object-contain"
            onError={e => { e.target.style.display = 'none' }}
          />
        ) : (
          <GraduationCap className="w-10 h-10 sm:w-12 sm:h-12 text-indigo-600" />
        )}
      </div>

      {/* Info */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
            {story.difficulty || t.story?.beginner || 'Cơ bản'}
          </span>
        </div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-tight">
          {story.title}
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
          {story.description || 'Làm chủ các khái niệm giải tích thông qua mô phỏng trực quan và thực hành giải đố.'}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 py-3 border-y border-slate-100">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-600" />
          <span className="text-xs font-bold text-slate-700 tabular-nums">
            {totalLessons} bài học
          </span>
        </div>
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-amber-500" />
          <span className="text-xs font-bold text-slate-700 tabular-nums">
            {story.chapters?.length || 0} chương
          </span>
        </div>
      </div>

      {/* Progress if enrolled */}
      {!needsEnrollment && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-bold">
            <span className="text-slate-600">Tiến độ của bạn</span>
            <span className="text-emerald-600 tabular-nums">{progressPercent}%</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden border border-slate-200/60">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400 font-medium text-right tabular-nums">
            Đã hoàn thành {completedLessons} / {totalLessons} bài
          </p>
        </div>
      )}

      {/* Enroll Action CTA */}
      <TactileButton
        variant={needsEnrollment ? 'primary' : 'secondary'}
        size="lg"
        onClick={onEnroll}
        disabled={enrolling || !needsEnrollment}
        className="w-full text-base"
      >
        {needsEnrollment
          ? enrolling
          ? 'Đang đăng ký...'
          : user
          ? 'Bắt đầu học ngay'
          : 'Đăng nhập để học'
          : '✓ Đã tham gia khoá học'}
      </TactileButton>

    </div>
  )
}

function ChapterSection({ chapter, index, isEnrolled, currentLesson, storySlug }) {
  const [selectedLesson, setSelectedLesson] = useState(null)
  const steps = chapter.steps || []
  const completedCount = steps.filter(s => s.is_completed).length

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6">
      
      {/* Chapter Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 font-extrabold text-xs flex items-center justify-center">
            {index + 1}
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
              {chapter.title}
            </h3>
            <p className="text-xs text-slate-400 font-medium">Chương {index + 1}</p>
          </div>
        </div>
        <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 tabular-nums">
          {completedCount}/{steps.length} bài
        </span>
      </div>

      {/* Lessons Path Grid */}
      <div className="space-y-2.5">
        {steps.map((step, stepIndex) => {
          const isCurrentStep = currentLesson?.step?.id === step.id
          const isCompleted = step.is_completed
          const isLocked = !isEnrolled || (!isCompleted && !isCurrentStep)

          return (
            <LessonNode
              key={step.id}
              step={step}
              index={stepIndex}
              isCompleted={isCompleted}
              isCurrent={isCurrentStep}
              isLocked={isLocked}
              isEnrolled={isEnrolled}
              storySlug={storySlug}
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
    </div>
  )
}

function LessonNode({ step, index, isCompleted, isCurrent, isLocked, isEnrolled, storySlug, onSelect }) {
  const handleClick = () => {
    soundFX.click()
    onSelect()
  }

  return (
    <div
      onClick={handleClick}
      className={`group flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer select-none ${
        isCurrent
          ? 'bg-indigo-50/80 border-indigo-200 text-indigo-950 font-bold'
          : isCompleted
          ? 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
          : isLocked
          ? 'bg-slate-50/50 border-slate-100 text-slate-400 opacity-60'
          : 'bg-white border-slate-200 hover:border-indigo-300'
      }`}
    >
      <div className="flex items-center gap-3.5 min-w-0">
        
        {/* Status Node Icon */}
        <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
          isCompleted
            ? 'bg-emerald-500 text-white shadow-sm'
            : isCurrent
            ? 'bg-indigo-600 text-white shadow-sm'
            : 'bg-slate-100 border border-slate-200 text-slate-400'
        }`}>
          {isCompleted ? (
            <Check className="w-5 h-5 stroke-[3]" />
          ) : isCurrent ? (
            <Play className="w-4 h-4 fill-white ml-0.5" />
          ) : (
            <Lock className="w-4 h-4" />
          )}
        </div>

        {/* Info */}
        <div className="space-y-0.5 min-w-0">
          <p className={`text-xs sm:text-sm font-bold truncate ${
            isCurrent ? 'text-indigo-950 font-extrabold' : isCompleted ? 'text-slate-700' : 'text-slate-800'
          }`}>
            <span className="tabular-nums font-bold mr-1.5 opacity-60">
              {String(index + 1).padStart(2, '0')}.
            </span>
            {step.title}
          </p>
          <p className="text-[11px] text-slate-400 font-medium">
            {step.duration || '3 - 5 phút'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 ml-2">
        {isCurrent && (
          <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
            Đang học
          </span>
        )}
        <ChevronRight className={`w-4 h-4 ${isCurrent ? 'text-indigo-600' : 'text-slate-300'}`} />
      </div>
    </div>
  )
}

function LessonModal({ lesson, isLocked, onClose, storySlug }) {
  const navigate = useNavigate()
  if (!lesson) return null

  const handleStart = () => {
    onClose()
    navigate(`/course/${storySlug}/step/${encodeStepId(lesson.id)}`)
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in-95 duration-150">
        
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
            {lesson.duration || '3 - 5 phút'}
          </span>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-extrabold text-slate-900">{lesson.title}</h3>
          <p className="text-sm text-slate-600 font-medium leading-relaxed">
            {lesson.description || 'Thực hành các câu hỏi tương tác và nắm bắt trực quan toán học.'}
          </p>
        </div>

        <div className="flex flex-col gap-2.5 pt-2">
          {!isLocked ? (
            <TactileButton variant="primary" size="lg" onClick={handleStart} className="w-full">
              <Play className="w-5 h-5 mr-1.5 fill-white" />
              Bắt đầu bài học
            </TactileButton>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-rose-500 font-bold text-center flex items-center justify-center gap-1.5">
                <Lock className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Bài học này đang bị khóa. Hãy hoàn thành các bài học trước để mở khóa!</span>
              </p>
              <TactileButton variant="secondary" size="md" onClick={onClose} className="w-full">
                Đã hiểu
              </TactileButton>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
