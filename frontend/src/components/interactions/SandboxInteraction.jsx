import { useEffect, useMemo, useRef, useState } from 'react'
import {
  RotateCcw,
  Undo2,
  Check,
  X as XIcon,
  Lightbulb,
} from 'lucide-react'
import api from '../../lib/api'
import {
  createSession,
  defaultSandboxRegistry,
  renderSceneSvg,
} from '../../sandbox'
import { MathText } from './MathText'
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

const STEP_LABELS_FALLBACK = {
  'check_factual_truth': 'Kiểm tra tính đúng / sai',
  'separate_exclamations': 'Loại trừ câu cảm thán & câu hỏi',
  'check_substitution': 'Kiểm tra phép thế biến x',
  'distinguish_unbound_variable': 'Nhận diện biến chưa gán',
}

const GOAL_LABELS_FALLBACK = {
  'classify_propositions': 'Phân loại chính xác 4 câu vào 3 nhóm theo SGK',
  'classify_variables': 'Phân loại mệnh đề chứa biến và mệnh đề sau khi thế',
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

/**
 * Minimalist, Modernist Drag and Drop Workspace for Proposition Classification
 * Adheres to less-is-more-ui: calm, balanced, zero visual noise, disciplined height (~440px).
 */
function MinimalPropositionClassifier({ manifest, state, dispatch, snapshot }) {
  const activity = manifest.config?.activity || {}
  const items = activity.items || []
  const [selectedCardId, setSelectedCardId] = useState(null)
  const [dragOverBin, setDragOverBin] = useState(null)

  const BINS = [
    {
      id: 'proposition',
      title: 'Mệnh đề',
      subtitle: 'Khẳng định đúng / sai',
      colorBadge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      activeBorder: 'border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-400',
    },
    {
      id: 'open_sentence',
      title: 'Mệnh đề chứa biến',
      subtitle: 'Chứa biến số (x, n...)',
      colorBadge: 'bg-amber-50 text-amber-800 border-amber-200',
      activeBorder: 'border-amber-500 bg-amber-50/40 ring-1 ring-amber-400',
    },
    {
      id: 'not_proposition',
      title: 'Không phải mệnh đề',
      subtitle: 'Câu hỏi, cảm thán, lệnh',
      colorBadge: 'bg-slate-100 text-slate-700 border-slate-200',
      activeBorder: 'border-slate-500 bg-slate-50 ring-1 ring-slate-400',
    },
  ]

  const getItemPlacement = itemId => {
    const item = items.find(i => i.id === itemId)
    if (!item) return ''
    return String(state[item.controlId || `class:${item.id}`] || '')
  }

  const handlePlace = (itemId, targetBinId) => {
    const item = items.find(i => i.id === itemId)
    if (!item) return
    const controlId = item.controlId || `class:${item.id}`
    dispatch({ type: 'set_control', controlId, value: targetBinId })
    setSelectedCardId(null)
    setDragOverBin(null)
  }

  const handleUnassign = itemId => {
    const item = items.find(i => i.id === itemId)
    if (!item) return
    const controlId = item.controlId || `class:${item.id}`
    dispatch({ type: 'set_control', controlId, value: '' })
    setSelectedCardId(null)
  }

  const placedCount = items.filter(i => getItemPlacement(i.id) !== '').length
  const allPlaced = placedCount === items.length
  const isAllCorrect = snapshot?.derivedState?.complete === true

  return (
    <div className="space-y-4">
      {/* ─── 2-Column Balanced Board (Desktop: 5 / 7 Ratio) ──────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Left Column (5 Cols): Statements to Classify */}
        <div className="lg:col-span-5 space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Các câu phát biểu ({placedCount}/{items.length})
            </span>
            <span className="text-[11px] text-slate-400 font-medium">
              Kéo hoặc chọn câu
            </span>
          </div>

          <div className="space-y-2">
            {items.map((item, idx) => {
              const currentBin = getItemPlacement(item.id)
              const isSelected = selectedCardId === item.id
              const binInfo = BINS.find(b => b.id === currentBin)

              return (
                <div
                  key={item.id}
                  draggable
                  onDragStart={e => {
                    e.dataTransfer.setData('text/plain', item.id)
                    setSelectedCardId(item.id)
                  }}
                  onDragEnd={() => setSelectedCardId(null)}
                  onClick={() => setSelectedCardId(isSelected ? null : item.id)}
                  className={`group relative rounded-xl p-3 border transition-all cursor-grab active:cursor-grabbing select-none flex items-start gap-2.5 ${
                    isSelected
                      ? 'bg-indigo-50/60 border-indigo-600 shadow-[0_2px_0_#4f46e5]'
                      : currentBin
                      ? 'bg-slate-50/80 border-slate-200 hover:border-slate-300'
                      : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-[0_2px_0_#cbd5e1]'
                  }`}
                >
                  <span className="w-5 h-5 rounded-md bg-slate-100 group-hover:bg-indigo-100 text-slate-500 group-hover:text-indigo-700 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5 transition-colors">
                    {idx + 1}
                  </span>

                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-xs sm:text-[13px] font-bold text-slate-800 leading-snug">
                      <MathText text={item.label} />
                    </p>

                    {/* Active assigned tag or prompt to assign */}
                    <div className="flex items-center justify-between gap-1.5 pt-0.5">
                      {binInfo ? (
                        <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded border ${binInfo.colorBadge}`}>
                          <Check className="w-3 h-3 stroke-[2.5]" />
                          {binInfo.title}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-medium">
                          {isSelected ? 'Đang chọn ──> Nhấp vào hộp bên phải' : 'Chưa phân loại'}
                        </span>
                      )}

                      {currentBin && (
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); handleUnassign(item.id) }}
                          className="text-[10px] text-slate-400 hover:text-rose-600 font-bold px-1.5 py-0.5 rounded transition-colors"
                        >
                          Đặt lại
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right Column (7 Cols): 3 Target Drop Zones */}
        <div className="lg:col-span-7 space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              3 Nhóm phân loại SGK
            </span>
            <span className="text-[11px] text-slate-400 font-medium">
              Thả vào hộp đích
            </span>
          </div>

          <div className="space-y-2.5">
            {BINS.map(bin => {
              const binItems = items.filter(i => getItemPlacement(i.id) === bin.id)
              const isOver = dragOverBin === bin.id
              const isTargeting = Boolean(selectedCardId)

              return (
                <div
                  key={bin.id}
                  onDragOver={e => { e.preventDefault(); if (dragOverBin !== bin.id) setDragOverBin(bin.id) }}
                  onDragLeave={() => { if (dragOverBin === bin.id) setDragOverBin(null) }}
                  onDrop={e => {
                    e.preventDefault()
                    const cardId = e.dataTransfer.getData('text/plain') || selectedCardId
                    if (cardId) handlePlace(cardId, bin.id)
                  }}
                  onClick={() => {
                    if (selectedCardId) handlePlace(selectedCardId, bin.id)
                  }}
                  className={`rounded-xl border p-3 transition-all min-h-[96px] flex flex-col justify-between ${
                    isOver
                      ? bin.activeBorder
                      : isTargeting
                      ? 'border-indigo-300 bg-indigo-50/20 hover:bg-indigo-50/50 cursor-pointer'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-100">
                    <div className="flex items-baseline gap-2">
                      <h4 className="text-xs font-extrabold text-slate-900">
                        {bin.title}
                      </h4>
                      <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                        ({bin.subtitle})
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md tabular-nums">
                      {binItems.length}
                    </span>
                  </div>

                  {/* Dropped items row inside the bucket */}
                  <div className="pt-2 flex flex-wrap gap-1.5">
                    {binItems.length === 0 ? (
                      <span className="text-[11px] text-slate-400 italic py-1">
                        {isOver ? 'Thả vào đây' : isTargeting ? 'Nhấp để xếp vào nhóm này' : 'Chưa có câu nào'}
                      </span>
                    ) : (
                      binItems.map(item => (
                        <div
                          key={item.id}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 transition-all hover:border-slate-300"
                        >
                          <span className="max-w-[200px] truncate">
                            <MathText text={item.label} />
                          </span>
                          <button
                            type="button"
                            onClick={e => { e.stopPropagation(); handleUnassign(item.id) }}
                            className="p-0.5 text-slate-400 hover:text-rose-600 rounded transition-colors"
                            title="Bỏ câu này"
                          >
                            <XIcon className="w-3 h-3" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

      </div>

      {/* ─── Pedagogical Feedback (Only when all placed or feedback available) ─ */}
      {snapshot?.feedback?.length > 0 && allPlaced && (
        <div className={`p-3 rounded-xl border text-xs font-bold flex items-start gap-2.5 transition-all ${
          isAllCorrect
            ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
            : 'bg-amber-50/90 border-amber-300 text-amber-950'
        }`}>
          <span className="font-extrabold shrink-0 mt-0.5">
            {isAllCorrect ? '✓' : '💡'}
          </span>
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-extrabold tracking-wider block opacity-70">
              {isAllCorrect ? 'Hoàn thành chính xác' : 'Gợi ý điều chỉnh'}
            </span>
            <div className="leading-relaxed">
              <MathText text={snapshot.feedback[0].message} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Tactile Segmented Button Group for direct 1-click interaction
 */
function TactileSegmentedGroup({ control, value, onChange }) {
  const options = control.options || []
  const labels = control.optionLabels || {}
  const currentStr = String(value ?? '')

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2 flex flex-col justify-between transition-all hover:border-slate-300">
      <span className="text-xs font-bold text-slate-800 leading-snug">
        <MathText text={control.label} />
      </span>

      <div className={`grid gap-1.5 ${options.length === 2 ? 'grid-cols-2' : options.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
        {options.map(opt => {
          const optValStr = String(opt)
          const isSelected = currentStr === optValStr
          const label = labels[opt] || labels[optValStr] || optValStr

          let activeStyles = 'bg-indigo-600 text-white border-indigo-700'
          if (optValStr === 'true' || optValStr === 'Đúng') {
            activeStyles = 'bg-emerald-600 text-white border-emerald-700'
          } else if (optValStr === 'false' || optValStr === 'Sai') {
            activeStyles = 'bg-rose-600 text-white border-rose-700'
          }

          return (
            <button
              key={optValStr}
              type="button"
              onClick={() => onChange(opt)}
              className={`min-h-[38px] py-1.5 px-2.5 rounded-lg font-bold text-xs border transition-all flex items-center justify-center text-center cursor-pointer select-none active:translate-y-0.5 ${
                isSelected
                  ? `${activeStyles} shadow-[0_2px_0_rgba(0,0,0,0.15)]`
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <MathText text={label} />
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Control({ control, value, onChange }) {
  const current = value ?? control.initial ?? ''

  if (control.type === 'choice') {
    const options = control.options || []
    if (options.length <= 4) {
      return (
        <TactileSegmentedGroup
          control={control}
          value={current}
          onChange={onChange}
        />
      )
    }

    return (
      <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col justify-between transition-all hover:border-slate-300">
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

  if (control.type === 'toggle') {
    const isChecked = current === true || current === 'true'
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3 transition-all hover:border-slate-300">
        <span className="text-xs font-bold text-slate-800">
          <MathText text={control.label} />
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={isChecked}
          onClick={() => onChange(!isChecked)}
          className={`w-12 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer select-none border ${
            isChecked ? 'bg-indigo-600 border-indigo-700' : 'bg-slate-200 border-slate-300'
          }`}
        >
          <div
            className={`w-4.5 h-4.5 rounded-full bg-white transform transition-transform ${
              isChecked ? 'translate-x-6' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
    )
  }

  if (control.type === 'slider') {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2 transition-all hover:border-slate-300">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800">
            <MathText text={control.label} />
          </span>
          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-bold text-xs rounded tabular-nums">
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
        <div className="flex justify-between text-[10px] text-slate-400">
          <span>{control.min}</span>
          <span>{control.max}</span>
        </div>
      </div>
    )
  }

  if (control.type === 'reset') return null

  const isNumeric = control.type === 'numeric_input'
  const numVal = typeof current === 'number' ? current : Number(current) || 0
  const step = control.step || 1

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2 transition-all hover:border-slate-300">
      <label className="block text-xs font-bold text-slate-800 leading-snug">
        <MathText text={control.label} />
      </label>
      <div className="flex items-center gap-2">
        {isNumeric && (
          <button
            type="button"
            onClick={() => onChange(numVal - step)}
            className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-base flex items-center justify-center transition-colors border border-slate-200 active:translate-y-0.5 cursor-pointer shrink-0"
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
          className="w-full h-9 py-1 px-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-600 rounded-lg text-xs font-bold text-slate-800 text-center outline-none transition-all"
          aria-label={control.label}
        />
        {isNumeric && (
          <button
            type="button"
            onClick={() => onChange(numVal + step)}
            className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-base flex items-center justify-center transition-colors border border-slate-200 active:translate-y-0.5 cursor-pointer shrink-0"
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
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between bg-white px-3 py-1.5 rounded-lg border border-slate-200">
            <span className="font-medium text-slate-600">{label}:</span>
            <span className={`font-extrabold ${value === 'Đúng' ? 'text-emerald-600' : value === 'Sai' ? 'text-rose-600' : 'text-slate-900'}`}>
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function SandboxInteraction({ lesson }) {
  const manifest = useMemo(() => manifestFromLesson(lesson), [lesson])
  const manifestKey = useMemo(() => manifest ? JSON.stringify(manifest) : '', [manifest])
  const sessionRef = useRef(null)
  const [snapshot, setSnapshot] = useState(null)
  const [error, setError] = useState(null)
  const [activeHint, setActiveHint] = useState(null)

  const isClassifierMode = manifest?.config?.mode === 'proposition_classifier'

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
      <div role="alert" className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 space-y-1 text-center">
        <p className="font-bold text-sm">Lỗi khởi tạo mô hình toán</p>
        <p className="text-xs text-rose-600">{error}</p>
      </div>
    )
  }

  if (!manifest || !snapshot) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400 space-x-2">
        <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-medium">Đang tải mô hình toán học…</span>
      </div>
    )
  }

  const svg = renderSceneSvg(snapshot.renderModel)
  const state = snapshot.state || {}
  const steps = manifest.solutionGraph?.steps || []
  const humanTitle = ARCHETYPE_NAMES[manifest.archetypeId] || manifest.archetypeId || 'Mô hình Toán học'

  const totalGoals = snapshot.goals.length
  const reachedGoals = snapshot.goals.filter(g => g.reached).length
  const allReached = totalGoals > 0 && reachedGoals === totalGoals

  return (
    <section className="flex flex-col bg-white p-4 sm:p-5 space-y-4 font-sans max-w-4xl mx-auto" aria-label={manifest.accessibility?.textAlternative}>
      
      {/* ─── Compact Header Toolbar ─────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
            {humanTitle}
          </h2>
          {allReached ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Check className="w-3 h-3 stroke-[2.5]" />
              Hoàn thành
            </span>
          ) : totalGoals > 0 ? (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
              {reachedGoals}/{totalGoals} mục tiêu
            </span>
          ) : null}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => dispatch({ type: 'undo' })}
            disabled={snapshot.historyDepth === 0}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-xs border border-slate-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            title="Hoàn tác"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Hoàn tác</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveHint(null); dispatch({ type: 'reset' }) }}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-xs border border-slate-200 transition-all cursor-pointer"
            title="Đặt lại"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Đặt lại</span>
          </button>
        </div>
      </div>

      {/* ─── Main Workspace: Clean Minimal Classifier OR SVG Scene ──── */}
      {isClassifierMode ? (
        <MinimalPropositionClassifier
          manifest={manifest}
          state={state}
          dispatch={dispatch}
          snapshot={snapshot}
        />
      ) : (
        <div className="space-y-3">
          <div 
            className="rounded-2xl border border-slate-200 bg-slate-50/50 p-2 overflow-hidden" 
            dangerouslySetInnerHTML={{ __html: svg }} 
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
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
      )}

      {/* Derived Logic Summary */}
      <DerivedSummary snapshot={snapshot} />

      {/* ─── Minimal Step Hints ─────────────────────────────────────── */}
      {steps.length > 0 && (
        <div className="pt-1 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold text-slate-400">Gợi ý:</span>
          {steps.map(step => {
            const stepLabel = step.label || step.title || STEP_LABELS_FALLBACK[step.id] || step.id
            const isActive = activeHint === step.hint

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => {
                  setActiveHint(isActive ? null : (step.hint || 'Hãy kiểm tra điều kiện.'))
                  dispatch({ type: 'show_hint', hintId: step.id })
                }}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer border ${
                  isActive
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                <Lightbulb className="w-3 h-3 text-amber-600" />
                <span>{stepLabel}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Inline Active Hint Callout */}
      {activeHint && (
        <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs font-medium text-amber-900 flex items-start justify-between gap-2">
          <div className="flex items-start gap-1.5">
            <Lightbulb className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
            <MathText text={activeHint} />
          </div>
          <button
            type="button"
            onClick={() => setActiveHint(null)}
            className="text-amber-600 hover:text-amber-900 p-0.5"
          >
            <XIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

    </section>
  )
}
