import { useState } from 'react'
import { Check, RotateCcw } from 'lucide-react'
import { TactileButton } from '../ui/tactile-button'
import { TangentConvergenceLab } from './LandingMathStage'
import { LANDING_QUIZ, evaluateLandingAnswer } from './landingQuiz'

export default function LandingQuizPreview() {
  const [answerId, setAnswerId] = useState('')
  const [result, setResult] = useState(null)

  const reset = () => {
    setAnswerId('')
    setResult(null)
  }

  const submit = (event) => {
    event.preventDefault()
    setResult(evaluateLandingAnswer(answerId))
  }

  return (
    <section id="try" className="w-full bg-slate-950 text-white">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-20 lg:py-28">
        <div className="max-w-lg">
          <p className="text-sm font-bold text-indigo-300">Một bài thử ngắn</p>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Sai một bước, biết mình sai ở đâu.
          </h2>
          <p className="mt-5 text-base leading-relaxed text-slate-300">
            Kéo điểm trên đồ thị, nhìn điều thay đổi rồi chọn lời giải phù hợp. Không cần đoán mò công thức.
          </p>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-slate-400">
            <span>Quan sát</span>
            <span>Thử lại</span>
            <span>Giải thích</span>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-4 text-slate-900 sm:p-6">
          <div className="rounded-2xl bg-slate-50 p-4 sm:p-5">
            <TangentConvergenceLab />
          </div>

          <form className="mt-6" onSubmit={submit}>
            <fieldset>
              <legend className="text-base font-extrabold leading-relaxed sm:text-lg">
                {LANDING_QUIZ.prompt}
              </legend>
              <div className="mt-4 grid gap-2.5">
                {LANDING_QUIZ.options.map((option, index) => {
                  const isSelected = answerId === option.id
                  const isCorrect = result?.correct && option.id === LANDING_QUIZ.correctOptionId
                  return (
                    <label
                      key={option.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 text-sm font-semibold transition-colors focus-within:ring-2 focus-within:ring-indigo-300 focus-within:ring-offset-2 ${isCorrect ? 'border-emerald-300 bg-emerald-50 text-emerald-900' : isSelected ? 'border-indigo-400 bg-indigo-50 text-indigo-900' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'}`}
                    >
                      <input
                        type="radio"
                        name={LANDING_QUIZ.id}
                        value={option.id}
                        checked={isSelected}
                        onChange={() => {
                          setAnswerId(option.id)
                          setResult(null)
                        }}
                        className="sr-only"
                      />
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-extrabold ${isCorrect ? 'bg-emerald-500 text-white' : isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                        {isCorrect ? <Check className="h-4 w-4" aria-hidden="true" /> : String.fromCharCode(65 + index)}
                      </span>
                      <span>{option.label}</span>
                    </label>
                  )
                })}
              </div>
            </fieldset>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
              <TactileButton type="submit" variant="primary" size="md" disabled={!answerId} className="w-full sm:w-auto">
                Kiểm tra câu trả lời
              </TactileButton>
              {result && (
                <button
                  type="button"
                  onClick={reset}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  Thử lại
                </button>
              )}
            </div>

            <p aria-live="polite" className={`mt-4 min-h-6 text-sm leading-relaxed ${
              result?.correct ? 'text-emerald-700' : result ? 'text-rose-700' : 'text-slate-500'
            }`}>
              {result?.feedback || 'Bạn có thể kéo Δx trên đồ thị trước khi chọn.'}
            </p>
          </form>
        </div>
      </div>
    </section>
  )
}
