import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Check, ChevronRight, X as XIcon } from 'lucide-react'
import api from '../lib/api'
import { MathText } from './interactions/MathText'
import { TactileButton } from './ui/tactile-button'

function clientAttemptId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `adaptive-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function itemContent(item) {
  return item?.payload || item || {}
}

function quizType(item) {
  const payload = itemContent(item)
  return item?.quizType || payload.quiz_type || (payload.items ? 'true_false_group' : 'multiple_choice')
}

function answerReady(item, answer) {
  const type = quizType(item)
  if (type === 'true_false_group') {
    const statements = itemContent(item).items || []
    return statements.length > 0 && statements.every(statement => answer?.[statement.id] !== undefined)
  }
  return answer !== null && answer !== undefined && String(answer).trim() !== ''
}

export default function AdaptiveAssessment({ session, onProgress, onFinished }) {
  const [item, setItem] = useState(session?.current_item || null)
  const [nextItem, setNextItem] = useState(null)
  const [answer, setAnswer] = useState(null)
  const [result, setResult] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [finished, setFinished] = useState(false)
  const [localProgress, setLocalProgress] = useState(session?.progress || { answered: 0, total: 9, current: 1 })

  useEffect(() => {
    setItem(session?.current_item || null)
    setNextItem(null)
    setAnswer(null)
    setResult(null)
    setLocalProgress(session?.progress || { answered: 0, total: 9, current: 1 })
    setFinished(session?.status === 'completed' || !session?.current_item)
  }, [session?.session_id, session?.current_item?.id, session?.current_item?.sequence, session?.status])

  const type = quizType(item)
  const payload = itemContent(item)
  const progress = localProgress
  const canSubmit = useMemo(() => answerReady(item, answer), [item, answer])

  const setBooleanAnswer = (statementId, value) => {
    if (result || submitting) return
    setAnswer(previous => ({ ...(previous || {}), [statementId]: value }))
  }

  const submit = async () => {
    if (!item || !canSubmit || submitting || result) return
    setSubmitting(true)
    setError(null)
    try {
      const response = await api.post(`/adaptive/sessions/${session.session_id}/attempts`, {
        assessment_item_id: item.id,
        sequence: item.sequence,
        client_attempt_id: clientAttemptId(),
        answer,
      }, { redirectOnUnauthorized: false })
      setResult(response)
      setLocalProgress(response?.progress || localProgress)
      onProgress?.(response)
      if (response?.next_item) {
        setNextItem(response.next_item)
      } else {
        setFinished(true)
        onFinished?.(response)
      }
    } catch (requestError) {
      if (requestError?.name !== 'AbortError') {
        setError(requestError?.message || 'Không thể chấm câu trả lời. Vui lòng thử lại.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const continueToNext = () => {
    if (!nextItem) return
    setItem(nextItem)
    setNextItem(null)
    setAnswer(null)
    setResult(null)
  }

  if (!session) return null

  return (
    <section className="rounded-[2rem] border-2 border-indigo-100 bg-gradient-to-br from-white to-indigo-50/40 p-5 sm:p-7 space-y-6" aria-label="Bài kiểm tra thích nghi">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-indigo-600">Adaptive assessment</p>
          <h2 className="mt-1 text-xl sm:text-2xl font-extrabold text-slate-900">Luyện tập theo năng lực</h2>
        </div>
        <div className="shrink-0 rounded-2xl border border-indigo-200 bg-white px-3 py-2 text-center">
          <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Tiến độ</div>
          <div className="text-lg font-black tabular-nums text-indigo-700">{Math.min(progress.answered + (finished ? 0 : 1), 9)}/9</div>
        </div>
      </div>

      {finished ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900">
          <p className="font-extrabold">Bạn đã hoàn thành 9 câu.</p>
          {result && <p className="mt-1 text-sm font-semibold">Điểm tạm tính: {result.progress?.score ?? 0}%. Nhấn nút hoàn thành bài học bên dưới để máy chủ ghi nhận điểm và XP.</p>}
        </div>
      ) : item ? (
        <>
          <div className="flex items-center gap-2 text-xs font-extrabold text-slate-500">
            <span className="rounded-xl bg-slate-100 px-2.5 py-1">Câu {item.sequence}/9</span>
            <span className={`rounded-xl px-2.5 py-1 ${item.difficulty === 'hard' ? 'bg-rose-100 text-rose-700' : item.difficulty === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
              {item.difficulty === 'hard' ? 'Khó' : item.difficulty === 'medium' ? 'Trung bình' : 'Dễ'}
            </span>
          </div>

          <QuestionView item={item} type={type} answer={answer} submitted={Boolean(result)} onAnswer={setAnswer} onBooleanAnswer={setBooleanAnswer} result={result} />

          {error && (
            <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {result && (
            <div className={`rounded-2xl border-2 p-4 ${result.correct ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-rose-200 bg-rose-50 text-rose-900'}`}>
              <div className="flex items-center gap-2 font-extrabold">
                {result.correct ? <Check className="h-5 w-5" /> : <XIcon className="h-5 w-5" />}
                {result.correct ? 'Chính xác' : 'Chưa đúng, câu tiếp theo sẽ được điều chỉnh để hỗ trợ bạn.'}
              </div>
              {result.feedback && <p className="mt-2 whitespace-pre-line text-sm font-medium"><MathText text={result.feedback} /></p>}
            </div>
          )}

          <div className="flex justify-end">
            {nextItem ? (
              <TactileButton variant="primary" size="lg" onClick={continueToNext}>
                Tiếp tục <ChevronRight className="ml-1.5 h-5 w-5" />
              </TactileButton>
            ) : (
              <TactileButton variant="primary" size="lg" onClick={submit} disabled={!canSubmit || submitting || Boolean(result)}>
                {submitting ? 'Đang chấm…' : 'Kiểm tra đáp án'}
                <ChevronRight className="ml-1.5 h-5 w-5" />
              </TactileButton>
            )}
          </div>
        </>
      ) : (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">Phiên học chưa có câu hỏi tiếp theo.</p>
      )}
    </section>
  )
}

function QuestionView({ item, type, answer, submitted, onAnswer, onBooleanAnswer, result }) {
  const payload = itemContent(item)
  const question = payload.question || payload.prompt || ''
  if (type === 'true_false_group') {
    return (
      <div className="space-y-4">
        <p className="text-lg sm:text-xl font-extrabold leading-relaxed text-slate-900"><MathText text={question} /></p>
        <div className="space-y-3">
          {(payload.items || []).map((statement, index) => {
            const value = answer?.[statement.id]
            return (
              <div key={statement.id || index} className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                <div className="flex gap-3 text-sm font-semibold leading-relaxed text-slate-700">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-black text-slate-500">{String.fromCharCode(97 + index)}</span>
                  <MathText text={statement.label || statement.text || statement.statement || ''} />
                </div>
                <div className="flex gap-2 pl-10">
                  <button type="button" disabled={submitted} onClick={() => onBooleanAnswer(statement.id, true)} className={`rounded-xl px-3 py-2 text-xs font-extrabold transition ${value === true ? 'bg-emerald-600 text-white' : 'border border-slate-200 bg-white text-emerald-700'}`}>Đúng</button>
                  <button type="button" disabled={submitted} onClick={() => onBooleanAnswer(statement.id, false)} className={`rounded-xl px-3 py-2 text-xs font-extrabold transition ${value === false ? 'bg-rose-600 text-white' : 'border border-slate-200 bg-white text-rose-700'}`}>Sai</button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  if (type === 'short_answer' || type === 'text_input') {
    return (
      <div className="space-y-5">
        <p className="text-lg sm:text-xl font-extrabold leading-relaxed text-slate-900"><MathText text={question} /></p>
        <label className="block rounded-2xl border border-slate-200 bg-white p-4">
          <span className="mb-2 block text-xs font-extrabold uppercase tracking-wide text-slate-500">Nhập đáp án</span>
          <input value={answer ?? ''} disabled={submitted} onChange={event => onAnswer(event.target.value)} className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-center text-lg font-bold text-slate-900 outline-none focus:border-indigo-500 focus:bg-white" placeholder="Đáp số" />
        </label>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <p className="text-lg sm:text-xl font-extrabold leading-relaxed text-slate-900"><MathText text={question} /></p>
      <div className="grid gap-3 sm:grid-cols-2">
        {(payload.options || []).map((option, index) => {
          const value = option.value ?? option.id ?? index
          const label = option.label || option.text || String(option)
          const selected = String(answer) === String(value)
          return (
            <button key={String(value)} type="button" disabled={submitted} onClick={() => onAnswer(value)} className={`min-h-16 rounded-2xl border-2 p-4 text-left text-sm font-bold transition ${selected ? 'border-indigo-500 bg-indigo-50 text-indigo-900' : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300'}`}>
              <span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-xl bg-slate-100 text-xs font-black text-slate-500">{String.fromCharCode(65 + index)}</span>
              <MathText text={label} />
            </button>
          )
        })}
      </div>
      {result && !result.correct && <p className="text-xs font-semibold text-slate-500">Đáp án được chấm ở máy chủ; bạn không thể gửi lại cùng câu để nhận thêm XP.</p>}
    </div>
  )
}
