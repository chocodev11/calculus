import React from 'react'
import { Check, Play, Lock, Sparkles } from 'lucide-react'

export default function ChapterTimeline({
  chapter,
  currentStepId,
  courseSlug,
  onSelectStep
}) {
  if (!chapter || !chapter.steps || chapter.steps.length === 0) {
    return null
  }

  const steps = chapter.steps

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
            Lộ trình học phần
          </span>
          <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
            {chapter.title}
          </h3>
        </div>
        <span className="text-xs font-bold text-slate-400 tabular-nums">
          {steps.filter(s => s.is_completed).length} / {steps.length} bài xong
        </span>
      </div>

      {/* Steps List */}
      <div className="space-y-2.5 pt-1">
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
              className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all select-none ${
                isCurrent
                  ? 'bg-indigo-50/70 border-indigo-200 text-indigo-950 font-bold cursor-pointer'
                  : isCompleted
                  ? 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100/70 cursor-pointer'
                  : 'bg-white/50 border-slate-100 text-slate-400 opacity-60 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* Node Status Icon */}
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 transition-transform ${
                    isCurrent
                      ? 'bg-indigo-600 text-white ring-2 ring-indigo-300 ring-offset-1'
                      : isCompleted
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {isCurrent ? (
                    <Play className="w-3.5 h-3.5 fill-white ml-0.5" aria-hidden="true" />
                  ) : isCompleted ? (
                    <Check className="w-4 h-4 stroke-[3]" aria-hidden="true" />
                  ) : (
                    <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                  )}
                </div>

                <div className="min-w-0">
                  <p className={`text-xs sm:text-sm truncate ${isCurrent ? 'font-extrabold text-indigo-950' : 'font-medium'}`}>
                    <span className="tabular-nums font-bold mr-1.5 opacity-70">
                      {String(idx + 1).padStart(2, '0')}.
                    </span>
                    {step.title}
                  </p>
                </div>
              </div>

              {/* Status Pill */}
              <div className="shrink-0 ml-3">
                {isCurrent ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
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
