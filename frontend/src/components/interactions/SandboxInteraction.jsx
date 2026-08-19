import { useEffect, useMemo, useRef, useState } from 'react'
import {
  RotateCcw,
  Undo2,
  BookOpen,
  CheckCircle2,
  Sparkles,
  HelpCircle,
  ChevronDown,
  Info,
  Layers,
  Check,
  X as XIcon,
  Lightbulb
} from 'lucide-react'
import api from '../../lib/api'
import {
  createSession,
  defaultSandboxRegistry,
  renderSceneSvg,
  renderTextAlternative,
} from '../../sandbox'
import { MathText } from './MathText'
import { TactileButton } from '../ui/tactile-button'
import { TactileSelect } from '../ui/tactile-select'

const ARCHETYPE_NAMES = {
  'logic.proposition_identification': 'Nhận diện Mệnh đề & Biến',
  'logic.proposition': 'Nhận diện Mệnh đề & Biến',
  'logic.quantifier_negation': 'Phủ định Mệnh đề & Lượng từ',
  'logic.negation': 'Phủ định Mệnh đề & Lượng từ',
  'logic.compound_truth_table': 'Bảng chân trị Mệnh đề ghép',
  'logic.truth_table': 'Bảng chân trị Mệnh đề ghép',
  'logic.implication': 'Mệnh đề kéo theo & Điều kiện Cần/Đủ',
  'logic.condition_graph': 'Sơ đồ điều kiện logic',
  'logic.parameter_implication': 'Tham số & Phản ví dụ',
  'set.venn_operations': 'Biểu đồ Venn & Tập hợp',
  'set.number_line': 'Trục số & Khoảng đoạn',
  'trigonometry.unit_circle': 'Đường tròn lượng giác',
  'trigonometry.triangle': 'Hệ thức lượng & Tam giác',
}

function manifestFromLesson(lesson) {
  if (!lesson || typeof lesson !== 'object') return null
  if (lesson.manifest && typeof lesson.manifest === 'object') return lesson.manifest
  if (lesson.kind === 'math.sandbox') return lesson
  return null
}

function jsonValue(value) {
  if (value === null || typeof value === 'number' || typeof value === 'boolean' || typeof value === 'string') return value
  return JSON.stringify(value)
}

function Control({ control, value, onChange }) {
  const current = value ?? control.initial ?? ''

  if (control.type === 'toggle') {
    const isChecked = current === true
    return (
      <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between gap-4">
        <span className="text-sm font-bold text-slate-800">
          <MathText text={control.label} />
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={isChecked}
          onClick={() => onChange(!isChecked)}
          className={`w-12 h-7 rounded-full transition-colors relative p-0.5 cursor-pointer select-none ${
            isChecked ? 'bg-indigo-600' : 'bg-slate-300'
          }`}
        >
          <div
            className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform ${
              isChecked ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
    )
  }

  if (control.type === 'choice') {
    return (
      <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
        <TactileSelect
          label={control.label}
          value={current}
          onChange={val => onChange(val)}
          options={control.options || []}
          optionLabels={control.optionLabels || {}}
          placeholder="— Chọn đáp án —"
        />
      </div>
    )
  }

  if (control.type === 'slider') {
    return (
      <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs sm:text-sm font-extrabold text-slate-800">
            <MathText text={control.label} />
          </span>
          <span className="px-2.5 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 font-extrabold text-xs rounded-lg tabular-nums">
            {String(current)}
          </span>
        </div>
        <input
          type="range"
          min={control.min}
          max={control.max}
          step={control.step || 1}
          value={Number(current)}
          onChange={event => onChange(Number(event.target.value))}
          className="w-full accent-indigo-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
          aria-label={control.label}
        />
      </div>
    )
  }

  if (control.type === 'reset') return null

  // numeric_input or text
  const isNumeric = control.type === 'numeric_input'
  const numVal = typeof current === 'number' ? current : Number(current) || 0
  const step = control.step || 1

  return (
    <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 shadow-sm space-y-2.5">
      <label className="block text-xs sm:text-sm font-extrabold text-slate-800 leading-snug">
        <MathText text={control.label} />
      </label>
      <div className="flex items-center gap-2">
        {isNumeric && (
          <button
            type="button"
            onClick={() => onChange(numVal - step)}
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-base flex items-center justify-center transition-colors border border-slate-200 cursor-pointer shrink-0"
          >
            -
          </button>
        )}
        <input
          type={isNumeric ? 'number' : 'text'}
          min={control.min}
          max={control.max}
          step={control.step}
          value={String(current)}
          onChange={event => onChange(isNumeric ? Number(event.target.value) : event.target.value)}
          className="w-full py-2 px-3.5 bg-slate-50 focus:bg-white border-2 border-slate-200 focus:border-indigo-600 rounded-xl text-xs sm:text-sm font-bold text-slate-800 text-center outline-none transition-all"
          aria-label={control.label}
        />
        {isNumeric && (
          <button
            type="button"
            onClick={() => onChange(numVal + step)}
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-base flex items-center justify-center transition-colors border border-slate-200 cursor-pointer shrink-0"
          >
            +
          </button>
        )}
      </div>
    </div>
  )
}

function DerivedSummary({ snapshot }) {
  const derived = snapshot?.derivedState || {}
  const rows = []
  if (typeof derived.pToQ === 'boolean') rows.push(['P ⇒ Q', derived.pToQ ? 'Đúng' : 'Sai'])
  if (typeof derived.qToP === 'boolean') rows.push(['Q ⇒ P', derived.qToP ? 'Đúng' : 'Sai'])
  if (typeof derived.contrapositive === 'boolean') rows.push(['Phản đảo ¬Q ⇒ ¬P', derived.contrapositive ? 'Đúng' : 'Sai'])
  if (typeof derived.sufficient === 'boolean') rows.push(['P là điều kiện đủ của Q', derived.sufficient ? 'Đúng' : 'Sai'])
  if (typeof derived.necessary === 'boolean') rows.push(['Q là điều kiện cần của P', derived.necessary ? 'Đúng' : 'Sai'])
  if (typeof derived.parameter === 'number') rows.push(['Tham số m', String(derived.parameter)])
  if (Array.isArray(derived.roots)) rows.push(['Các nghiệm của Pₘ', derived.roots.join(', ')])
  if (typeof derived.implication === 'boolean') rows.push(['Pₘ ⇒ Q', derived.implication ? 'Đúng' : 'Sai'])
  if (rows.length === 0) return null

  return (
    <div className="bg-indigo-50/70 border-2 border-indigo-100 rounded-2xl p-4">
      <h4 className="text-xs font-extrabold text-indigo-900 uppercase tracking-wide mb-2 flex items-center gap-1.5">
        <Info className="w-3.5 h-3.5 text-indigo-600" />
        Kết luận suy luận tự động
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between bg-white/80 px-3 py-1.5 rounded-xl border border-indigo-100/80">
            <span className="font-semibold text-slate-700">{label}:</span>
            <span className={`font-extrabold ${value === 'Đúng' ? 'text-emerald-600' : value === 'Sai' ? 'text-rose-600' : 'text-indigo-900'}`}>
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function SemanticAlternative({ snapshot, manifest }) {
  const rows = Array.isArray(snapshot?.derivedState?.rows) ? snapshot.derivedState.rows : []
  const alternative = manifest.accessibility?.textAlternative || renderTextAlternative(snapshot.renderModel)
  return (
    <details className="rounded-2xl border-2 border-slate-200 bg-white p-3.5 text-xs text-slate-600 group">
      <summary className="cursor-pointer font-bold text-slate-700 flex items-center justify-between select-none">
        <span className="flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-slate-400" />
          Mô tả dạng chữ & Hỗ trợ phím
        </span>
        <ChevronDown className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform" />
      </summary>
      <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
        <p className="font-medium leading-relaxed">{alternative}</p>
        {rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr>
                  {Object.keys(rows[0]).map(key => (
                    <th key={key} className="border-b border-slate-200 px-2 py-1.5 font-bold text-slate-700">
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-slate-50/60' : 'bg-white'}>
                    {Object.keys(rows[0]).map(key => (
                      <td key={key} className="border-b border-slate-100 px-2 py-1.5 text-slate-800 font-medium">
                        {String(row[key])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </details>
  )
}

export default function SandboxInteraction({ lesson }) {
  const manifest = useMemo(() => manifestFromLesson(lesson), [lesson])
  const manifestKey = useMemo(() => manifest ? JSON.stringify(manifest) : '', [manifest])
  const sessionRef = useRef(null)
  const [snapshot, setSnapshot] = useState(null)
  const [error, setError] = useState(null)
  const [hint, setHint] = useState(null)
  const [showPrompt, setShowPrompt] = useState(false)

  const promptText = lesson?.prompt || manifest?.prompt || ''

  useEffect(() => {
    if (!manifest) {
      setError('Sandbox lesson chưa có manifest hợp lệ.')
      return undefined
    }
    try {
      const session = createSession(manifest, defaultSandboxRegistry, {
        onEvent: event => {
          api.post('/sandbox/events', { events: [event] }).catch(() => {})
        },
      })
      sessionRef.current = session
      setSnapshot(session.snapshot())
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể khởi tạo sandbox.')
    }
    return () => { sessionRef.current = null }
  }, [manifestKey])

  const dispatch = action => {
    try {
      setSnapshot(sessionRef.current?.dispatch(action) || null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Thao tác không hợp lệ.')
    }
  }

  if (error) {
    return (
      <div role="alert" className="flex flex-col items-center justify-center p-8 bg-rose-50 border-2 border-rose-200 rounded-3xl text-rose-700 space-y-2">
        <p className="font-extrabold text-base">Lỗi khởi tạo mô hình toán</p>
        <p className="text-xs font-semibold">{error}</p>
      </div>
    )
  }

  if (!manifest || !snapshot) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400 space-y-3">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-bold">Đang tải phòng thí nghiệm toán học…</span>
      </div>
    )
  }

  const svg = renderSceneSvg(snapshot.renderModel)
  const state = snapshot.state || {}
  const steps = manifest.solutionGraph?.steps || []
  const humanTitle = ARCHETYPE_NAMES[manifest.archetypeId] || manifest.archetypeId || 'Mô hình Toán học'

  return (
    <section className="flex flex-col h-full bg-slate-50/80 p-4 sm:p-6 space-y-5 font-sans" aria-label={manifest.accessibility?.textAlternative}>
      
      {/* ─── Header Toolbar ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-200">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-md bg-indigo-100 text-indigo-700 uppercase tracking-wider">
              <Sparkles className="w-3 h-3" />
              Math Sandbox
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
            {humanTitle}
          </h2>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {promptText && (
            <button
              type="button"
              onClick={() => setShowPrompt(!showPrompt)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs border-2 transition-all cursor-pointer select-none ${
                showPrompt 
                  ? 'bg-indigo-600 text-white border-indigo-800 shadow-sm'
                  : 'bg-white hover:bg-slate-50 text-indigo-700 border-indigo-200 shadow-[0_2px_0_0_#C7D2FE]'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Đề bài</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => dispatch({ type: 'undo' })}
            disabled={snapshot.historyDepth === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs border-2 border-slate-200 shadow-[0_2px_0_0_#E2E8F0] active:translate-y-0.5 active:shadow-none transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer select-none"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>Hoàn tác</span>
          </button>

          <button
            type="button"
            onClick={() => { setHint(null); dispatch({ type: 'reset' }) }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs border-2 border-slate-200 shadow-[0_2px_0_0_#E2E8F0] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer select-none"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Đặt lại</span>
          </button>
        </div>
      </div>

      {/* ─── Problem Prompt Callout (if active or opened) ──────────── */}
      {promptText && showPrompt && (
        <div className="bg-indigo-50 border-2 border-indigo-200 rounded-2xl p-4 text-sm text-indigo-950 flex items-start gap-3 animate-in fade-in zoom-in-95 duration-150">
          <BookOpen className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
          <div className="space-y-1 flex-1">
            <p className="font-extrabold text-indigo-900 text-xs uppercase tracking-wider">Yêu cầu bài toán</p>
            <div className="font-medium text-slate-700 leading-relaxed">
              <MathText text={promptText} />
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowPrompt(false)}
            className="p-1 text-indigo-400 hover:text-indigo-700 rounded-lg"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ─── Interactive Scene SVG Visualizer ───────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            Mô hình trực quan tương tác
          </h3>
          <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
            Phản hồi trực tiếp theo thao tác
          </span>
        </div>
        <div 
          className="rounded-3xl border-2 border-slate-200 bg-white p-3 shadow-sm overflow-hidden" 
          dangerouslySetInnerHTML={{ __html: svg }} 
        />
      </div>

      {/* ─── Interactive Controls Grid ──────────────────────────────── */}
      <div className="space-y-2">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
          Điều khiển &amp; Lựa chọn phán đoán
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {manifest.controls.map(control => (
            <Control
              key={control.id}
              control={control}
              value={state[control.id]}
              onChange={value => dispatch({ type: 'set_control', controlId: control.id, value: jsonValue(value) })}
            />
          ))}
        </div>
      </div>

      {/* ─── Derived Logic Summary (if any) ────────────────────────── */}
      <DerivedSummary snapshot={snapshot} />

      {/* ─── Goal Achievement Status ────────────────────────────────── */}
      <div className="space-y-2">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
          Mục tiêu bài học
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {snapshot.goals.map(goal => {
            const isReached = goal.reached
            return (
              <div
                key={goal.id}
                className={isReached
                  ? "rounded-2xl border-2 p-3.5 flex items-center justify-between transition-all bg-emerald-50 border-emerald-200 text-emerald-900 shadow-sm"
                  : "rounded-2xl border-2 p-3.5 flex items-center justify-between transition-all bg-white border-slate-200 text-slate-800"
                }
              >
                <div className="flex items-center gap-2.5">
                  <div className={isReached
                    ? "w-7 h-7 rounded-xl flex items-center justify-center shrink-0 bg-emerald-600 text-white"
                    : "w-7 h-7 rounded-xl flex items-center justify-center shrink-0 bg-slate-100 text-slate-700"
                  }>
                    {isReached ? <Check className="w-4 h-4 stroke-[3]" /> : <span className="text-xs font-extrabold">○</span>}
                  </div>
                  <div>
                    <p className="text-xs font-extrabold leading-tight">
                      {isReached ? 'Đã hoàn thành mục tiêu' : 'Đang thực hiện'}
                    </p>
                    <p className={isReached ? "text-[11px] text-emerald-700 font-semibold" : "text-[11px] text-slate-500 font-semibold"}>
                      {goal.id}
                    </p>
                  </div>
                </div>
                <span className={isReached
                  ? "text-[10px] font-extrabold px-2.5 py-0.5 rounded-lg uppercase bg-emerald-100 text-emerald-900 border border-emerald-300"
                  : "text-[10px] font-extrabold px-2.5 py-0.5 rounded-lg uppercase bg-slate-100 text-slate-700 border border-slate-200"
                }>
                  {isReached ? 'Hoàn tất' : 'Chưa xong'}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* ─── Feedback & Hint Area ────────────────────────────────────── */}
      {snapshot.feedback.length > 0 && (
        <div className="space-y-2">
          {snapshot.feedback.map(item => (
            <div
              key={item.id}
              className={`rounded-2xl p-4 border-2 text-xs sm:text-sm font-bold flex items-start gap-2.5 ${
                item.kind === 'goal'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}
            >
              <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{item.message}</span>
            </div>
          ))}
        </div>
      )}

      {hint && (
        <div role="status" className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-4 text-xs sm:text-sm font-bold text-amber-900 flex items-start gap-2.5">
          <Lightbulb className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>{hint}</span>
        </div>
      )}

      {/* Step Hints Chips */}
      {steps.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs font-bold text-slate-400">Gợi ý từng bước:</span>
          {steps.map(step => (
            <button
              key={step.id}
              type="button"
              onClick={() => {
                setHint(step.hint || 'Hãy kiểm tra điều kiện của bước này.')
                dispatch({ type: 'show_hint', hintId: step.id })
              }}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-xl border border-amber-200 bg-amber-50/80 hover:bg-amber-100 text-amber-800 font-bold text-xs transition-colors cursor-pointer"
            >
              <Lightbulb className="w-3 h-3 text-amber-600" />
              <span>{step.id}</span>
            </button>
          ))}
        </div>
      )}

      {/* ─── Semantic Accessible Alternative ────────────────────────── */}
      <SemanticAlternative snapshot={snapshot} manifest={manifest} />

    </section>
  )
}
