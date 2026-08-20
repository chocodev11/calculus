import React from 'react'
import { Play, ArrowRight, BookOpen, Compass, Trophy, Sparkles } from 'lucide-react'
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
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 animate-pulse space-y-5">
        <div className="flex justify-between items-center">
          <div className="h-5 w-32 bg-slate-200 rounded-full" />
        </div>
        <div className="space-y-3">
          <div className="h-8 sm:h-10 w-3/4 bg-slate-200 rounded-2xl" />
          <div className="h-4 w-5/6 bg-slate-200 rounded-xl" />
        </div>
        <div className="h-2.5 w-full bg-slate-100 rounded-full" />
        <div className="h-12 w-48 bg-slate-200 rounded-2xl pt-2" />
      </div>
    )
  }

  // State: No enrolled courses
  if (!course) {
    return (
      <div className="bg-white border border-dashed border-slate-300 rounded-3xl p-8 sm:p-10 text-center space-y-5">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
          <Compass className="w-8 h-8" />
        </div>
        <div className="space-y-1.5 max-w-md mx-auto">
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Khám phá chương trình Toán học
          </h2>
          <p className="text-sm text-slate-500 font-medium leading-relaxed">
            Bạn chưa tham gia khóa học nào. Hãy chọn một chủ điểm trong mục Khám phá để bắt đầu học toán trực quan!
          </p>
        </div>
        <TactileButton variant="primary" size="md" onClick={onViewOutline} className="mx-auto">
          <Compass className="w-4 h-4 mr-2" />
          <span>Khám phá các khóa học</span>
          <ArrowRight className="w-4 h-4 ml-2" />
        </TactileButton>
      </div>
    )
  }

  const isCompleted = (course.progress_percent ?? course.progress ?? 0) >= 100

  // State: 100% completed
  if (isCompleted) {
    return (
      <div className="bg-slate-900 text-white rounded-3xl border border-slate-800 p-6 sm:p-8 relative overflow-hidden space-y-6">
        <div className="flex items-center gap-2 text-amber-400 text-xs font-extrabold uppercase tracking-wider">
          <Trophy className="w-4 h-4" />
          <span>Đã hoàn thành khóa học</span>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {course.title}
          </h2>
          <p className="text-sm text-slate-300 font-medium max-w-xl">
            Chúc mừng bạn đã chinh phục toàn bộ bài học và trực giác hình học của học phần này!
          </p>
        </div>
        <div className="flex flex-wrap gap-3 pt-2">
          <TactileButton variant="amber" size="md" onClick={onViewOutline}>
            <span>Ôn tập đề cương</span>
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </TactileButton>
        </div>
      </div>
    )
  }

  const progressPercent = Math.round(course.progress_percent ?? course.progress ?? 0)
  const stepTitle = currentStep?.title || 'Bài học tiếp theo'
  const stepDesc = currentStep?.description || course.description || 'Tiếp tục bài học để mở khóa toàn bộ trực giác giải tích.'
  const chapterName = currentChapter?.title || course.title

  return (
    <section 
      aria-label="Tiếp tục bài học"
      className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6"
    >
      {/* Top Meta Line: Chapter Tag Only */}
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 text-xs font-extrabold px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700">
          <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{chapterName}</span>
        </span>
      </div>

      {/* Step Title & Core Description */}
      <div className="space-y-2">
        <div className="text-xs font-extrabold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" aria-hidden="true" />
          <span>Bài học tiếp theo</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug">
          {stepTitle}
        </h2>
        <p className="text-sm sm:text-base text-slate-600 font-medium leading-relaxed max-w-2xl">
          {stepDesc}
        </p>
      </div>

      {/* Progress Bar with Integrated Label and Percentage */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-slate-500">Tiến độ khóa học</span>
          <span className="text-indigo-600 font-extrabold tabular-nums">{progressPercent}%</span>
        </div>
        <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
          <div
            className="h-full bg-indigo-600 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${Math.max(4, progressPercent)}%` }}
          />
        </div>
      </div>

      {/* Action Buttons: Dominant Primary CTA + Clean Outline Link */}
      <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-3.5">
        <TactileButton
          variant="primary"
          size="lg"
          onClick={onContinue}
          className="w-full sm:w-auto"
          id="btn-resume-next-lesson"
        >
          <Play className="w-5 h-5 mr-2 fill-white" aria-hidden="true" />
          <span>Tiếp tục học ngay</span>
          <ArrowRight className="w-5 h-5 ml-2" aria-hidden="true" />
        </TactileButton>

        <button
          type="button"
          onClick={onViewOutline}
          className="text-xs sm:text-sm font-bold text-slate-500 hover:text-indigo-600 py-2.5 px-4 rounded-xl hover:bg-slate-50 transition-colors select-none text-center sm:text-left cursor-pointer"
        >
          Xem toàn bộ đề cương →
        </button>
      </div>
    </section>
  )
}
