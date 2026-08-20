import React from 'react'
import { Play, ArrowRight, BookOpen, Compass, Trophy, ChevronRight } from 'lucide-react'
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
        <div className="h-2 w-full bg-slate-100 rounded-full" />
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

  return (
    <section 
      aria-label="Tiếp tục bài học"
      className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xs"
    >
      {/* 1. Context Header: Breadcrumb (Course > Chapter) */}
      <div className="flex items-center gap-1.5 min-w-0 text-xs text-slate-500 font-medium">
        <BookOpen className="w-3.5 h-3.5 text-indigo-600 shrink-0" aria-hidden="true" />
        <span className="truncate max-w-[160px] sm:max-w-xs font-bold text-slate-700">
          {course.title}
        </span>
        {chapterName && chapterName !== course.title && (
          <>
            <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" aria-hidden="true" />
            <span className="truncate text-slate-500 font-medium">
              {chapterName}
            </span>
          </>
        )}
      </div>

      {/* 2. Step Title & Core Description */}
      <div className="space-y-1.5 pt-0.5">
        <span className="inline-block text-[11px] font-extrabold text-indigo-600 uppercase tracking-wider">
          Bài học tiếp theo
        </span>
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight leading-snug">
          {stepTitle}
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed max-w-2xl">
          {stepDesc}
        </p>
      </div>

      {/* 3. Action Buttons: Dominant Primary CTA + Balanced Secondary Action */}
      <div className="pt-1 flex flex-col sm:flex-row sm:items-center gap-3">
        <TactileButton
          variant="primary"
          size="md"
          onClick={onContinue}
          className="w-full sm:w-auto"
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
          <span>Xem toàn bộ đề cương</span>
          <ArrowRight className="w-3.5 h-3.5 ml-1 text-slate-400" aria-hidden="true" />
        </TactileButton>
      </div>
    </section>
  )
}
