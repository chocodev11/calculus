import React from 'react'
import { Link } from 'react-router-dom'
import { Check, Play, Lock, Sparkles, ChevronRight } from 'lucide-react'

export default function ChapterTimeline({
  chapter,
  currentStepId,
  courseSlug,
  totalChapters = 1,
  onSelectStep
}) {
  if (!chapter || !chapter.steps || chapter.steps.length === 0) {
    return null
  }

  const steps = chapter.steps
  const completedCount = steps.filter(s => s.is_completed).length

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4">
      <div className="space-y-3">
        <div className="flex items-start sm:items-center justify-between gap-3">
          <div className="space-y-0.5 min-w-0">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
              Lộ trình học phần
            </span>
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 truncate">
              {chapter.title}
            </h3>
          </div>

          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1.5 sm:gap-3 shrink-0">
            <span className="text-xs sm:text-sm font-extrabold text-indigo-600 tabular-nums">
              {completedCount}/{steps.length} bài xong !
            </span>
            {courseSlug && totalChapters > 1 && (
              <Link
                to={`/course/${courseSlug}`}
                className="text-xs font-bold text-slate-500 hover:text-indigo-600 inline-flex items-center gap-0.5 transition-colors"
                title="Xem toàn bộ các chương của khóa học"
              >
                <span>Tất cả {totalChapters} chương</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>

        {/* Segmented Pill Progress Bar */}
        <div className="flex items-center gap-1.5 w-full">
          {steps.map((step, idx) => {
            const isDone = step.is_completed || idx < completedCount
            const isCurrent = step.id === currentStepId || (!isDone && idx === completedCount)

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

      {/* Steps List (No-Card Frameless Rows) */}
      <div className="space-y-1.5 pt-0.5">
        {steps.map((step, idx) => {
          const isCurrent = step.id === currentStepId || step.is_current
          const isCompleted = step.is_completed
          const isLocked = !isCurrent && !isCompleted

          return (
            <div
              key={step.id || idx}
              onClick={() => {
                if (!isLocked && onSelectStep) {
                  onSelectStep(step)
                }
              }}
              className={`flex items-center justify-between p-3 rounded-xl transition-all select-none ${
                isCurrent
                  ? 'bg-indigo-50/80 text-indigo-950 font-bold cursor-pointer'
                  : isCompleted
                  ? 'bg-slate-50/70 text-slate-700 hover:bg-slate-100/70 cursor-pointer'
                  : 'bg-transparent text-slate-400 opacity-60 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {/* Node Status Icon */}
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-transform ${
                    isCurrent
                      ? 'bg-indigo-600 text-white'
                      : isCompleted
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {isCurrent ? (
                    <Play className="w-3 h-3 fill-white ml-0.5" aria-hidden="true" />
                  ) : isCompleted ? (
                    <Check className="w-3.5 h-3.5 stroke-[3]" aria-hidden="true" />
                  ) : (
                    <Lock className="w-3 h-3" aria-hidden="true" />
                  )}
                </div>

                <div className="min-w-0">
                  <p className={`text-xs sm:text-sm truncate ${isCurrent ? 'font-extrabold text-indigo-950' : 'font-medium'}`}>
                    <span className="tabular-nums font-bold mr-1.5 opacity-60">
                      {String(idx + 1).padStart(2, '0')}.
                    </span>
                    {step.title}
                  </p>
                </div>
              </div>

              {/* Status Pill */}
              <div className="shrink-0 ml-2.5">
                {isCurrent ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                    <Sparkles className="w-3 h-3 text-indigo-600" />
                    <span>Đang học</span>
                  </span>
                ) : isCompleted ? (
                  <span className="text-[11px] font-bold text-emerald-600">
                    Ôn lại
                  </span>
                ) : (
                  <span className="text-[11px] font-medium text-slate-300">
                    Chưa mở
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
