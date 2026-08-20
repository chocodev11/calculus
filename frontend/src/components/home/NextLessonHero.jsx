import React from 'react'
import { Link } from 'react-router-dom'
import { Play, ArrowRight, BookOpen, Compass, Trophy, ChevronRight, Clock, Sparkles } from 'lucide-react'
import { TactileButton } from '../ui/tactile-button'

export default function NextLessonHero({
  course,
  currentChapter,
  currentStep,
  onContinue,
  onViewOutline,
  loading = false
}) {
  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 animate-pulse space-y-4">
        <div className="flex justify-between items-center">
          <div className="h-4 w-40 bg-slate-200 rounded-lg" />
          <div className="h-4 w-20 bg-slate-200 rounded-lg" />
        </div>
        <div className="space-y-2 pt-2">
          <div className="h-7 w-3/5 bg-slate-200 rounded-xl" />
          <div className="h-4 w-4/5 bg-slate-200 rounded-lg" />
        </div>
        <div className="h-11 w-44 bg-slate-200 rounded-xl pt-2" />
      </div>
    )
  }

  // State: No enrolled courses
  if (!course) {
    return (
      <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-6 sm:p-8 text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
          <Compass className="w-7 h-7" />
        </div>
        <div className="space-y-1 max-w-md mx-auto">
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
            Khám phá chương trình Toán học
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
            Bạn chưa tham gia khóa học nào. Hãy chọn một chủ điểm trong mục Khám phá để bắt đầu học toán trực quan!
          </p>
        </div>
        <TactileButton variant="primary" size="md" onClick={onViewOutline} className="mx-auto">
          <Compass className="w-4 h-4 mr-2" />
          <span>Khám phá các khóa học</span>
          <ArrowRight className="w-4 h-4 ml-1.5" />
        </TactileButton>
      </div>
    )
  }

  const isCompleted = (course.progress_percent ?? course.progress ?? 0) >= 100

  // State: 100% completed
  if (isCompleted) {
    return (
      <div className="bg-slate-900 text-white rounded-2xl border border-slate-800 p-6 sm:p-7 relative overflow-hidden space-y-4">
        <div className="flex items-center gap-2 text-amber-400 text-xs font-extrabold uppercase tracking-wider">
          <Trophy className="w-4 h-4" />
          <span>Đã hoàn thành khóa học</span>
        </div>
        <div className="space-y-1.5">
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
            {course.title}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 font-medium max-w-xl">
            Chúc mừng bạn đã chinh phục toàn bộ bài học và trực giác hình học của học phần này!
          </p>
        </div>
        <div className="pt-2">
          <TactileButton variant="amber" size="md" onClick={onViewOutline}>
            <span>Ôn tập đề cương</span>
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </TactileButton>
        </div>
      </div>
    )
  }

  const stepTitle = currentStep?.title || 'Bài học tiếp theo'
  const stepDesc = currentStep?.description || 'Tiếp tục hoàn thành nội dung bài học để củng cố trực giác toán học.'
  const chapterName = currentChapter?.title || course.title
  const duration = currentStep?.duration || '3 - 5 phút'

  // Chapter progress calculation
  const chapterSteps = currentChapter?.steps || []
  const completedSteps = chapterSteps.filter(s => s.is_completed).length
  const totalSteps = chapterSteps.length
  const chapterProgressPercent = totalSteps > 0
    ? Math.round((completedSteps / totalSteps) * 100)
    : Math.round(course.progress_percent ?? course.progress ?? 0)

  const gradeLabel = course.grade 
    ? (String(course.grade).startsWith('Toán') ? course.grade : `Toán ${course.grade}`)
    : (course.grade_title?.includes('Toán') ? course.grade_title : (course.grade_title ? `Toán ${course.grade_title.replace(/Lớp\s*/i, '')}` : 'Toán 10'))

  return (
    <section
      aria-label="Tiếp tục bài học"
      className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4"
    >
      {/* 1. Context Header: Clickable Breadcrumb (Grade > Course Title) */}
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0 text-xs text-slate-500 font-medium">
          <BookOpen className="w-3.5 h-3.5 text-indigo-600 shrink-0" aria-hidden="true" />
          <Link
            to="/explore"
            className="font-medium text-slate-500 hover:text-indigo-600 transition-colors shrink-0"
            title="Khám phá chương trình"
          >
            {gradeLabel}
          </Link>
          <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" aria-hidden="true" />
          <Link
            to={`/course/${course.slug}`}
            className="truncate max-w-[220px] sm:max-w-xs font-bold text-slate-700 hover:text-indigo-600 transition-colors hover:underline"
            title={`Xem toàn bộ đề cương: ${course.title}`}
          >
            {course.title}
          </Link>
        </div>

        {/* Micro Badges: Duration & XP */}
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200/60">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>{duration}</span>
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
            <Sparkles className="w-3 h-3 text-indigo-500" />
            <span>+15 XP</span>
          </span>
        </div>
      </div>

      {/* 2. Integrated Segmented Progress Bar (Placed higher up) */}
      {totalSteps > 0 && (
        <div className="space-y-1">
          <div className="flex justify-end">
            <span className="text-xs sm:text-sm font-extrabold text-indigo-600 tabular-nums leading-none">
              {chapterProgressPercent}%
            </span>
          </div>
          <div className="flex items-center gap-1.5 w-full">
            {chapterSteps.map((step, idx) => {
              const isDone = step.is_completed || idx < completedSteps
              const isCurrent = step.id === currentStep?.id || (!isDone && idx === completedSteps)

              return (
                <div
                  key={step.id || idx}
                  className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                    isDone
                      ? 'bg-indigo-600'
                      : isCurrent
                      ? 'bg-indigo-300'
                      : 'bg-slate-100 border border-slate-200/60'
                  }`}
                  title={`${step.title || `Bài ${idx + 1}`}: ${isDone ? 'Đã xong' : isCurrent ? 'Đang học' : 'Chưa học'}`}
                />
              )
            })}
          </div>
        </div>
      )}

      {/* 3. Step Title & Core Description */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="inline-block text-[11px] font-extrabold text-indigo-600 uppercase tracking-wider">
            Bài học tiếp theo
          </span>
          {/* Mobile Micro Badges */}
          <div className="flex sm:hidden items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              {duration}
            </span>
            <span className="text-[10px] font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
              +15 XP
            </span>
          </div>
        </div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight leading-snug">
          {stepTitle}
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed max-w-2xl">
          {stepDesc}
        </p>
      </div>

      {/* 4. Action Buttons: Primary CTA + Xem toàn bộ chương */}
      <div className="pt-2 sm:pt-2.5 flex flex-col sm:flex-row sm:items-center gap-3">
        <TactileButton
          variant="primary"
          size="md"
          onClick={onContinue}
          className="w-full sm:w-auto px-6"
          id="btn-resume-next-lesson"
        >
          <Play className="w-4 h-4 mr-2 fill-white" aria-hidden="true" />
          <span>Tiếp tục học ngay</span>
          <ArrowRight className="w-4 h-4 ml-1.5" aria-hidden="true" />
        </TactileButton>

        <TactileButton
          variant="ghost"
          size="md"
          onClick={onViewOutline}
          className="w-full sm:w-auto text-slate-600 hover:text-indigo-600"
        >
          <span>Xem toàn bộ chương</span>
          <ArrowRight className="w-3.5 h-3.5 ml-1 text-slate-400" aria-hidden="true" />
        </TactileButton>
      </div>
    </section>
  )
}
