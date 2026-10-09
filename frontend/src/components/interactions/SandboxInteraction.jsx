import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import { Lightbulb, RotateCcw, Sparkles, Undo2 } from 'lucide-react'
import api from '../../lib/api'
import { fireConfetti } from '../../lib/confetti'
import { createSession, defaultSandboxRegistry } from '../../sandbox'
import { TactileButton } from '../ui/tactile-button'
import { MathText } from './MathText'
import { Caption } from './SandboxKit'
import { ImplicationLab, ParameterLab, QuantifierLab, TruthTableLab, VariableLab } from './LogicExperiments'
import { PropositionLab } from './PropositionLab'
import { IntervalLab, SetOperationLab } from './SetExperiments'
import { TriangleLab, UnitCircleLab } from './TrigExperiments'

// Plugins are aliases of one engine per domain, so the config mode is what decides the scene.
// The third entry marks labs laid out in two columns on wide screens.
const LABS = {
  proposition_classifier: [PropositionLab, 'Chấm bài Đ/S', true],
  variable_playground: [VariableLab, 'Thế x vào P(x)'],
  quantifier_negation: [QuantifierLab, 'Với mọi hay tồn tại?'],
  implication: [ImplicationLab, 'Vùng P có nằm gọn trong vùng Q?'],
  parameter_implication: [ParameterLab, 'Kéo tham số, theo dấu nghiệm'],
  truth_table: [TruthTableLab, 'Bật tắt từng mệnh đề'],
  builder: [SetOperationLab, 'Gom phần tử vào tập'],
  venn: [SetOperationLab, 'Tô vùng trên biểu đồ Venn'],
  operator: [SetOperationLab, 'Tô vùng trên biểu đồ Venn'],
  number_line: [IntervalLab, 'Dựng khoảng trên trục số'],
  unit_circle: [UnitCircleLab, 'Quay điểm trên đường tròn'],
  triangle_solver: [TriangleLab, 'Nắn tam giác, đọc số đo'],
  law_of_sines: [TriangleLab, 'Định lí sin trên tam giác sống'],
  law_of_cosines: [TriangleLab, 'Định lí côsin trên tam giác sống'],
  measurement_model: [TriangleLab, 'Đo đạc bằng tam giác'],
}

// Matches SandboxEventBatch on the backend; the cap keeps a long offline stretch bounded.
const EVENT_BATCH_SIZE = 100
const EVENT_QUEUE_LIMIT = 500

export default function SandboxInteraction({ lesson, onCompletionChange }) {
  const manifest = lesson?.manifest || lesson
  const manifestKey = useMemo(() => JSON.stringify(manifest), [manifest])
  const session = useRef(null)
  const wasComplete = useRef(false)
  const [snapshot, setSnapshot] = useState(null)
  const [error, setError] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [resets, setResets] = useState(0)
  const [hintCount, setHintCount] = useState(0)
  const [earned, setEarned] = useState(false)

  useEffect(() => {
    const queue = []
    let sending = false
    const send = (events, keepalive) => api.post('/sandbox/events', { events }, { redirectOnUnauthorized: false, keepalive })
    const flush = async () => {
      if (sending || !queue.length) return
      sending = true
      const batch = queue.splice(0, EVENT_BATCH_SIZE)
      try {
        await send(batch, false)
      } catch (cause) {
        // Guests and expired sessions cannot record events; other failures retry on the next tick.
        if (cause.status !== 401) {
          queue.unshift(...batch)
          queue.splice(EVENT_QUEUE_LIMIT)
          console.warn('Sandbox events could not be recorded:', cause.message)
        }
      } finally {
        sending = false
      }
    }
    // Leaving the page: hand the rest to the browser so the request outlives the tab.
    const drain = () => {
      while (queue.length) send(queue.splice(0, EVENT_BATCH_SIZE), true).catch(() => {})
    }
    window.addEventListener('pagehide', drain)
    try {
      session.current = createSession(manifest, defaultSandboxRegistry, { onEvent: event => queue.push(event) })
      const initial = session.current.snapshot()
      setSnapshot(initial)
      setError(null)
      setHintCount(0)
      setEarned(false)
      // Goals already met on load (e.g. a solvable triangle) are not an achievement to celebrate.
      wasComplete.current = initial.goals.length > 0 && initial.goals.every(goal => goal.reached || !goal.required)
    } catch (cause) {
      setError(cause.message)
    }
    const timer = setInterval(flush, 1500)
    return () => {
      clearInterval(timer)
      window.removeEventListener('pagehide', drain)
      drain()
      session.current = null
    }
  }, [manifestKey])

  const complete = Boolean(snapshot?.goals.length) && snapshot.goals.every(goal => goal.reached || !goal.required)
  useEffect(() => {
    if (!snapshot) return
    if (complete && !wasComplete.current) {
      setEarned(true)
      fireConfetti({ particleCount: 45, spread: 60, origin: { x: 0.5, y: 0.75 } })
    }
    wasComplete.current = complete
    onCompletionChange?.(complete)
  }, [complete, Boolean(snapshot)])

  // Returns the new snapshot so a lab can react to the result of its own action.
  // A failed action keeps the previous snapshot: the runtime rolls back, so only a notice is shown.
  function dispatch(action) {
    try {
      const next = session.current.dispatch(action)
      setSnapshot(next)
      setActionError(null)
      if (action.type === 'reset') {
        setResets(value => value + 1)
        setHintCount(0)
      }
      return next
    } catch (cause) {
      console.error('Sandbox action failed:', cause)
      setActionError('Thao tác này chưa thực hiện được. Hãy thử lại với giá trị khác.')
      return null
    }
  }

  if (error) return <p role="alert" className="p-5 text-base font-semibold text-rose-700">Không thể mở hoạt động: {error}</p>
  if (!snapshot) return <p role="status" className="p-5 text-base text-slate-500">Đang chuẩn bị hoạt động…</p>

  const mode = manifest.config.mode || (manifest.domainId === 'logic' ? 'truth_table' : undefined)
  const [Lab, title, wide] = LABS[mode] || LABS.truth_table
  const hints = manifest.solutionGraph?.steps?.filter(step => step.hint) || []

  function revealHint() {
    const step = hints[hintCount]
    if (!step) return
    dispatch({ type: 'show_hint', hintId: step.id })
    setHintCount(count => count + 1)
  }

  return (
    <MotionConfig reducedMotion="user">
      <section className={`mx-auto w-full max-w-2xl space-y-6 px-1 py-3 text-slate-900 [font-feature-settings:'calt'_0] sm:px-4 ${wide ? 'lg:max-w-5xl' : ''}`} aria-label={title} data-sandbox-mode={mode}>
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1.5">
            <h2 className="text-2xl font-extrabold leading-tight tracking-tight text-slate-900">{title}</h2>
            {manifest.prompt && <p className="text-[15px] leading-6 text-slate-600"><MathText text={manifest.prompt} /></p>}
          </div>
          <div className="flex shrink-0 gap-2">
            <TactileButton variant="secondary" size="icon-sm" aria-label="Hoàn tác" disabled={!snapshot.historyDepth} onClick={() => dispatch({ type: 'undo' })}><Undo2 className="h-4 w-4" /></TactileButton>
            <TactileButton variant="secondary" size="icon-sm" aria-label="Làm lại từ đầu" onClick={() => dispatch({ type: 'reset' })}><RotateCcw className="h-4 w-4" /></TactileButton>
          </div>
        </header>

        <Lab key={`${manifestKey}:${resets}`} manifest={manifest} snapshot={snapshot} dispatch={dispatch} />

        {actionError && <Caption tone="error"><p>{actionError}</p></Caption>}

        <footer className="space-y-3">
          <AnimatePresence>
            {complete && earned && (
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                role="status"
                className="flex items-center gap-3 rounded-3xl bg-emerald-500 px-5 py-4 text-white shadow-[0_4px_0_#047857]"
              >
                <Sparkles aria-hidden className="h-6 w-6 shrink-0" />
                <p className="text-base font-extrabold leading-snug">Hoàn thành thí nghiệm! Bạn đã tự tìm ra quy luật.</p>
              </motion.div>
            )}
          </AnimatePresence>
          {!(complete && earned) && hints.length > 0 && (
            <div className="space-y-2">
              {hints.slice(0, hintCount).map(step => (
                <motion.p key={step.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-[15px] leading-6 text-amber-950">
                  <Lightbulb aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                  <span><MathText text={step.hint} /></span>
                </motion.p>
              ))}
              {hintCount < hints.length && (
                <TactileButton variant="ghost" size="sm" onClick={revealHint}>
                  <Lightbulb className="h-4 w-4 text-amber-600" /> {hintCount ? 'Thêm một gợi ý' : 'Cần một gợi ý?'}
                </TactileButton>
              )}
            </div>
          )}
        </footer>
      </section>
    </MotionConfig>
  )
}
