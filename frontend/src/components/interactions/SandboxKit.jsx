import { useEffect, useRef, useState } from 'react'
import { Check, Lightbulb, X } from 'lucide-react'
import { cn } from '../../lib/utils'
import { MathText } from './MathText'

// SVG needs literal colors; these mirror the TiaMath Kinetic tokens in tailwind.config.js.
export const INK = {
  indigo: '#4F46E5',
  indigoSoft: '#E0E7FF',
  cyan: '#0284C7',
  cyanSoft: '#E0F2FE',
  amber: '#F59E0B',
  amberSoft: '#FEF3C7',
  emerald: '#10B981',
  emeraldDeep: '#047857',
  emeraldSoft: '#D1FAE5',
  crimson: '#EF4444',
  crimsonDeep: '#BE123C',
  crimsonSoft: '#FFE4E6',
  ink: '#0F172A',
  muted: '#64748B',
  line: '#CBD5E1',
  paper: '#F8FAFC',
}

export const truthColor = truth => (truth === true ? INK.emerald : truth === false ? INK.crimson : INK.line)

export function optionLabel(control, option) {
  return control?.optionLabels?.[String(option)] ?? (typeof option === 'boolean' ? (option ? 'Đúng' : 'Sai') : String(option))
}

/** Graph-paper stage that holds every manipulable scene. */
export function Stage({ children, className, label }) {
  return (
    <figure
      aria-label={label}
      className={cn(
        'relative m-0 overflow-hidden rounded-3xl border border-slate-200 bg-slate-50',
        'bg-[radial-gradient(#E2E8F0_1px,transparent_1px)] [background-size:18px_18px]',
        className,
      )}
    >
      {children}
    </figure>
  )
}

/** Maps a choice to the shared `.choice-option` state: indigo while chosen, emerald/crimson once graded. */
export function choiceState(active, status) {
  if (!active) return 'idle'
  if (status === true) return 'correct'
  return status === false ? 'incorrect' : 'selected'
}

/** Graded glyph shown next to a choice, so correctness never relies on color alone. */
export function ChoiceMark({ state }) {
  if (state === 'correct') return <Check aria-hidden className="ml-auto h-5 w-5 shrink-0 text-emerald-600" strokeWidth={3} />
  if (state === 'incorrect') return <X aria-hidden className="ml-auto h-5 w-5 shrink-0 text-rose-600" strokeWidth={3} />
  return null
}

/** Answer choices in the same visual grammar as the lesson quizzes; no dropdowns. */
export function ChoiceChips({ control, options = control?.options || [], value, onChange, status, stacked = false, label }) {
  return (
    <div role="radiogroup" aria-label={label || control?.label} className={cn('flex gap-2.5', stacked ? 'flex-col' : 'flex-wrap')}>
      {options.map(option => {
        const state = choiceState(String(value ?? '') === String(option), status)
        return (
          <button
            key={String(option)}
            type="button"
            role="radio"
            aria-checked={state !== 'idle'}
            data-state={state}
            onClick={() => onChange(option)}
            className={cn('choice-option min-h-[48px] leading-snug', stacked && 'w-full')}
          >
            <MathText text={optionLabel(control, option)} />
            <ChoiceMark state={state} />
          </button>
        )
      })}
    </div>
  )
}

/** One line of in-scene feedback with a glyph, so color is never the only cue. */
export function Caption({ tone = 'neutral', children, className }) {
  const Icon = tone === 'success' ? Check : tone === 'error' ? X : Lightbulb
  return (
    <div
      role="status"
      className={cn(
        'flex items-start gap-3 rounded-2xl px-4 py-3 text-[15px] leading-6',
        tone === 'success' && 'bg-emerald-50 text-emerald-900',
        tone === 'error' && 'bg-rose-50 text-rose-900',
        tone === 'neutral' && 'bg-indigo-50 text-indigo-950',
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white',
          tone === 'success' ? 'bg-emerald-500' : tone === 'error' ? 'bg-rose-500' : 'bg-indigo-500',
        )}
      >
        <Icon className="h-3.5 w-3.5" strokeWidth={3} />
      </span>
      <div className="min-w-0 space-y-1">{children}</div>
    </div>
  )
}

/** Numbered case switcher; each dot carries its own status. */
export function CaseDots({ count, index, onChange, status = [], label = 'Chọn tình huống' }) {
  return (
    <nav aria-label={label} className="flex flex-wrap items-center gap-2">
      {Array.from({ length: count }, (_, i) => {
        const done = status[i] === true
        const wrong = status[i] === false
        return (
          <button
            key={i}
            type="button"
            aria-current={i === index ? 'step' : undefined}
            aria-label={`Tình huống ${i + 1}${done ? ', đã xong' : ''}`}
            onClick={() => onChange(i)}
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-extrabold tabular-nums transition-colors',
              i === index ? 'border-indigo-600 bg-white text-indigo-700 ring-4 ring-indigo-100' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300',
              done && 'border-emerald-500 bg-emerald-500 text-white',
              wrong && 'border-rose-400 text-rose-600',
            )}
          >
            {done ? <Check aria-hidden className="h-4 w-4" strokeWidth={3} /> : i + 1}
          </button>
        )
      })}
    </nav>
  )
}

/** Text field that keeps its own draft and only commits a finished number. */
export function NumberField({ label, value, onCommit, step = 'any', min, className }) {
  const [draft, setDraft] = useState(value === undefined || value === null ? '' : String(value))
  const focused = useRef(false)
  useEffect(() => {
    if (!focused.current) setDraft(value === undefined || value === null ? '' : String(value))
  }, [value])
  const parsed = Number(draft.replace(',', '.'))
  const valid = draft.trim() !== '' && Number.isFinite(parsed) && (min === undefined || parsed >= min)
  const commit = () => {
    if (valid && parsed !== value) onCommit(parsed)
  }
  return (
    <label className={cn('block space-y-1.5', className)}>
      <span className="block text-sm font-semibold text-slate-700">{label}</span>
      <input
        type="text"
        inputMode="decimal"
        step={step}
        value={draft}
        aria-invalid={draft.trim() !== '' && !valid}
        onFocus={() => { focused.current = true }}
        onBlur={() => { focused.current = false; commit() }}
        onChange={event => setDraft(event.target.value)}
        onKeyDown={event => { if (event.key === 'Enter') commit() }}
        className="h-12 w-full rounded-2xl border-2 border-slate-200 bg-white px-4 text-base font-semibold tabular-nums text-slate-900 outline-none transition-colors focus:border-indigo-500 aria-[invalid=true]:border-rose-400"
      />
    </label>
  )
}

/**
 * Pointer gesture on an SVG in viewBox units. `onMove` fires on every move with
 * `transient: true`; `onEnd` commits once, so undo sees one step per gesture.
 */
export function useSvgDrag({ width, height, onMove, onEnd }) {
  const ref = useRef(null)
  const active = useRef(false)
  const toPoint = event => {
    const rect = ref.current.getBoundingClientRect()
    return { x: (event.clientX - rect.left) / rect.width * width, y: (event.clientY - rect.top) / rect.height * height }
  }
  return {
    ref,
    bind: {
      onPointerDown: event => {
        active.current = true
        event.currentTarget.setPointerCapture(event.pointerId)
        onMove(toPoint(event), true)
      },
      onPointerMove: event => {
        if (active.current) onMove(toPoint(event), false)
      },
      onPointerUp: event => {
        if (!active.current) return
        active.current = false
        onEnd(toPoint(event))
      },
      onPointerCancel: event => {
        if (!active.current) return
        active.current = false
        onEnd(toPoint(event))
      },
    },
  }
}

/** Keyboard support shared by SVG handles that behave like sliders. */
export function sliderKeys(onStep, onToggle) {
  return event => {
    const delta = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[event.key]
    if (delta !== undefined) {
      event.preventDefault()
      onStep(delta)
    } else if (onToggle && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault()
      onToggle()
    }
  }
}

/**
 * Token slots for a two-circle Venn/Euler scene. Region keys are membership bits
 * ('11' both, '10' first only, '01' second only, '00' neither); slots spread greedily
 * from each region's centre so any number of tokens fits without overlapping.
 */
export function vennSlots([first, second], counts, bounds = { x0: 30, x1: 330, y0: 30, y1: 214 }) {
  const side = (circle, x, y) => {
    const distance = Math.hypot(x - circle.cx, y - circle.cy)
    if (distance < circle.r - 18) return '1'
    return distance > circle.r + 18 ? '0' : null
  }
  const candidates = {}
  for (let x = bounds.x0; x <= bounds.x1; x += 8) {
    for (let y = bounds.y0; y <= bounds.y1; y += 8) {
      const a = side(first, x, y)
      const b = side(second, x, y)
      if (a && b) (candidates[a + b] ||= []).push({ x, y })
    }
  }
  // Prefer points far from every circle outline and frame edge, i.e. the roomiest part of each region.
  const clearance = ({ x, y }) => Math.min(
    Math.abs(Math.hypot(x - first.cx, y - first.cy) - first.r),
    Math.abs(Math.hypot(x - second.cx, y - second.cy) - second.r),
    x - bounds.x0 + 16, bounds.x1 - x + 16, y - bounds.y0 + 16, bounds.y1 - y + 16,
  )
  const slots = {}
  for (const [key, count] of Object.entries(counts)) {
    const picked = []
    for (const point of [...(candidates[key] || [])].sort((p, q) => clearance(q) - clearance(p))) {
      if (picked.length >= count) break
      if (picked.every(other => Math.hypot(other.x - point.x, other.y - point.y) >= 38)) picked.push(point)
    }
    while (picked.length < count) picked.push(picked[picked.length - 1] || { x: (bounds.x0 + bounds.x1) / 2, y: (bounds.y0 + bounds.y1) / 2 })
    slots[key] = picked
  }
  return slots
}

/** Places each item into the next free slot of its region. */
export function placeInSlots(items, regionOf, slots) {
  const used = {}
  return items.map(item => {
    const key = regionOf(item)
    used[key] = (used[key] || 0) + 1
    return slots[key][used[key] - 1]
  })
}

export const formatNumber = (value, digits = 3) => {
  if (!Number.isFinite(value)) return '—'
  const rounded = Number(value.toFixed(digits))
  return String(rounded).replace('-', '−').replace('.', ',')
}
