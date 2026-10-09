import { useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import soundFX from '../../lib/soundEffects'
import { cn } from '../../lib/utils'
import { TactileButton } from '../ui/tactile-button'
import { Caption, INK, Stage, formatNumber, placeInSlots, sliderKeys, useSvgDrag, vennSlots } from './SandboxKit'

const OPERATION = { union: '∪', intersection: '∩', difference: '∖' }
const VENN = { A: { cx: 138, cy: 124, r: 84 }, B: { cx: 222, cy: 124, r: 84 } }
const same = (a, b) => String(a) === String(b)
const show = value => (typeof value === 'number' ? formatNumber(value) : String(value))
const braces = values => (values.length ? `{${values.map(show).join('; ')}}` : '∅')

/* ───────────────────────────── Phép toán tập hợp: tô vùng Venn ───────────────────────────── */

export function SetOperationLab({ manifest, snapshot, dispatch }) {
  const c = manifest.config
  const d = snapshot.derivedState
  const hasSets = Array.isArray(c.left) && Array.isArray(c.right)
  const target = Array.isArray(c.target) ? c.target : []
  const selected = d.selected.elements
  const [checked, setChecked] = useState(false)
  const svgRef = useRef(null)
  const goal = snapshot.goals[0] || { reached: false }

  const elements = useMemo(() => {
    const all = [...(c.universe || []), ...(c.left || []), ...(c.right || []), ...target]
    return all.filter((value, i) => all.findIndex(other => same(other, value)) === i)
  }, [c.universe, c.left, c.right, target])
  const regionOf = value => `${hasSets && c.left.some(item => same(item, value)) ? 1 : 0}${hasSets && c.right.some(item => same(item, value)) ? 1 : 0}`
  const positions = useMemo(() => {
    const counts = {}
    elements.forEach(value => { counts[regionOf(value)] = (counts[regionOf(value)] || 0) + 1 })
    const circles = hasSets ? [VENN.A, VENN.B] : [{ cx: -500, cy: -500, r: 1 }, { cx: -500, cy: -500, r: 1 }]
    return placeInSlots(elements, regionOf, vennSlots(circles, counts))
  }, [elements, hasSets])

  const isSelected = value => selected.some(item => same(item, value))
  const regionFull = key => {
    const members = elements.filter(value => regionOf(value) === key)
    return members.length > 0 && members.every(isSelected)
  }

  function commit(next) {
    setChecked(false)
    soundFX.play('select')
    dispatch({ type: 'manipulate', key: 'selected', value: next })
  }

  function toggle(value) {
    commit(isSelected(value) ? selected.filter(item => !same(item, value)) : [...selected, value])
  }

  function toggleRegionAt(event) {
    if (!hasSets) return
    const rect = svgRef.current.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width * 360
    const y = (event.clientY - rect.top) / rect.height * 248
    const key = `${Math.hypot(x - VENN.A.cx, y - VENN.A.cy) < VENN.A.r ? 1 : 0}${Math.hypot(x - VENN.B.cx, y - VENN.B.cy) < VENN.B.r ? 1 : 0}`
    const members = elements.filter(value => regionOf(value) === key)
    if (!members.length) return
    commit(regionFull(key) ? selected.filter(item => !members.some(member => same(member, item))) : [...selected, ...members.filter(value => !isSelected(value))])
  }

  const missing = target.filter(value => !isSelected(value))
  const extra = selected.filter(value => !target.some(item => same(item, value)))

  return (
    <div className="space-y-5">
      {hasSets && (
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-lg font-bold text-slate-900">
          <p><span className="text-indigo-700">A</span> = {braces(c.left)}</p>
          <p><span className="text-sky-700">B</span> = {braces(c.right)}</p>
          <p className="rounded-2xl bg-slate-900 px-4 py-1.5 text-white">Tô vùng A {OPERATION[c.operation] || '∪'} B</p>
        </div>
      )}

      <Stage label="Biểu đồ Venn">
        <svg ref={svgRef} viewBox="0 0 360 248" className="block w-full select-none" role="img" aria-label={`Biểu đồ Venn, đã chọn ${braces(selected)}`} onClick={toggleRegionAt}>
          <defs>
            <clipPath id="set-clip-a"><circle {...VENN.A} /></clipPath>
            <clipPath id="set-clip-b"><circle {...VENN.B} /></clipPath>
            <mask id="set-not-a"><rect width="360" height="248" fill="white" /><circle {...VENN.A} fill="black" /></mask>
            <mask id="set-not-b"><rect width="360" height="248" fill="white" /><circle {...VENN.B} fill="black" /></mask>
            <mask id="set-outside"><rect width="360" height="248" fill="white" /><circle {...VENN.A} fill="black" /><circle {...VENN.B} fill="black" /></mask>
          </defs>
          <rect x="8" y="8" width="344" height="232" rx="22" fill="white" stroke={INK.line} strokeWidth="2" />
          <text x="338" y="228" textAnchor="end" fontSize="13" fontWeight="800" fill={INK.muted}>U</text>
          {hasSets && (
            <>
              <motion.rect x="8" y="8" width="344" height="232" rx="22" fill={INK.indigo} mask="url(#set-outside)" animate={{ fillOpacity: regionFull('00') ? 0.16 : 0 }} />
              <motion.circle {...VENN.A} fill={INK.indigo} mask="url(#set-not-b)" animate={{ fillOpacity: regionFull('10') ? 0.3 : 0 }} />
              <motion.circle {...VENN.B} fill={INK.cyan} mask="url(#set-not-a)" animate={{ fillOpacity: regionFull('01') ? 0.3 : 0 }} />
              <motion.circle {...VENN.B} fill={INK.indigo} clipPath="url(#set-clip-a)" animate={{ fillOpacity: regionFull('11') ? 0.38 : 0 }} />
              <circle {...VENN.A} fill="none" stroke={INK.indigo} strokeWidth="3" />
              <circle {...VENN.B} fill="none" stroke={INK.cyan} strokeWidth="3" />
              <text x={VENN.A.cx - 0.62 * VENN.A.r} y={VENN.A.cy + 0.62 * VENN.A.r} textAnchor="middle" fontSize="18" fontWeight="800" fill={INK.indigo}>A</text>
              <text x={VENN.B.cx + 0.62 * VENN.B.r} y={VENN.B.cy + 0.62 * VENN.B.r} textAnchor="middle" fontSize="18" fontWeight="800" fill={INK.cyan}>B</text>
            </>
          )}
          {elements.map((value, i) => {
            const on = isSelected(value)
            return (
              <motion.g
                key={String(value)}
                role="button"
                tabIndex={0}
                aria-pressed={on}
                aria-label={`Phần tử ${value}`}
                onClick={event => { event.stopPropagation(); toggle(value) }}
                onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggle(value) } }}
                initial={false}
                animate={{ x: positions[i].x, y: positions[i].y, scale: on ? 1.08 : 1 }}
                className="cursor-pointer outline-none"
              >
                <circle r="18" fill={on ? INK.indigo : 'white'} stroke={on ? INK.indigo : INK.ink} strokeWidth="2.5" />
                <text y="5" textAnchor="middle" fontSize="14" fontWeight="800" fill={on ? 'white' : INK.ink}>{show(value)}</text>
              </motion.g>
            )
          })}
        </svg>
      </Stage>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white px-4 py-3">
        <p className="text-lg font-extrabold tabular-nums text-slate-900">
          Kết quả: <motion.span key={selected.join()} initial={{ opacity: 0.4 }} animate={{ opacity: 1 }}>{braces(selected)}</motion.span>
        </p>
        <TactileButton disabled={!selected.length} onClick={() => { setChecked(true); soundFX.play(goal.reached ? 'correct' : 'incorrect') }}>Kiểm tra</TactileButton>
      </div>
      <p className="text-sm font-semibold text-slate-600">{hasSets ? 'Chạm vào một vùng để tô cả vùng, hoặc chạm từng phần tử. Mỗi phần tử chỉ được ghi một lần.' : 'Chạm vào các phần tử để đưa vào tập.'}</p>

      {checked && (
        <Caption tone={goal.reached ? 'success' : 'error'}>
          {goal.reached
            ? <p>Chính xác: vùng được tô gồm đúng các phần tử {braces(selected)}.</p>
            : <p>{missing.length > 0 && <>Còn thiếu <strong>{braces(missing)}</strong>. </>}{extra.length > 0 && <>Thừa <strong>{braces(extra)}</strong>.</>}</p>}
        </Caption>
      )}
    </div>
  )
}

/* ───────────────────────────── Khoảng trên trục số ───────────────────────────── */

function intervalText({ left, right, leftClosed, rightClosed }) {
  if (left === null && right === null) return 'ℝ'
  return `${left === null ? '(−∞' : `${leftClosed ? '[' : '('}${formatNumber(left)}`}; ${right === null ? '+∞)' : `${formatNumber(right)}${rightClosed ? ']' : ')'}`}`
}

function inequalityText({ left, right, leftClosed, rightClosed }) {
  if (left !== null && right !== null) return `${formatNumber(left)} ${leftClosed ? '≤' : '<'} x ${rightClosed ? '≤' : '<'} ${formatNumber(right)}`
  if (left !== null) return `x ${leftClosed ? '≥' : '>'} ${formatNumber(left)}`
  if (right !== null) return `x ${rightClosed ? '≤' : '<'} ${formatNumber(right)}`
  return 'x là số thực bất kỳ'
}

export function IntervalLab({ manifest, snapshot, dispatch }) {
  const target = manifest.config.target
  const interval = snapshot.derivedState.result
  const goal = snapshot.goals[0] || { reached: false }
  const [checked, setChecked] = useState(false)
  const gesture = useRef(null)
  const finite = [target.left, target.right].filter(value => value !== null && value !== undefined)
  const lo = Math.floor(Math.min(0, ...finite)) - 4
  const hi = Math.ceil(Math.max(0, ...finite)) + 4
  const px = value => 36 + (value - lo) / (hi - lo) * 288
  const handleX = side => (interval[side] === null ? (side === 'left' ? 14 : 346) : px(interval[side]))

  function update(next, transient) {
    setChecked(false)
    dispatch({ type: 'manipulate', key: 'interval', value: { kind: 'interval', ...interval, ...next }, transient })
  }

  // Dragging past either end of the line turns that endpoint into ∞.
  function valueAt(side, x) {
    if (side === 'left' && x < 26) return null
    if (side === 'right' && x > 334) return null
    const value = Math.round(lo + (x - 36) / 288 * (hi - lo))
    const other = interval[side === 'left' ? 'right' : 'left']
    if (other === null) return value
    return side === 'left' ? Math.min(value, other) : Math.max(value, other)
  }

  function endpointPatch(side, value) {
    return { [side]: value, [`${side}Closed`]: value === null ? false : interval[`${side}Closed`] }
  }

  const drag = useSvgDrag({
    width: 360,
    height: 170,
    onMove: (point, start) => {
      if (start) {
        const side = Math.abs(point.x - handleX('left')) <= Math.abs(point.x - handleX('right')) ? 'left' : 'right'
        gesture.current = { side, x: point.x, moved: false }
        return
      }
      if (!gesture.current) return
      if (Math.abs(point.x - gesture.current.x) > 4) gesture.current.moved = true
      if (gesture.current.moved) update(endpointPatch(gesture.current.side, valueAt(gesture.current.side, point.x)), true)
    },
    onEnd: point => {
      const current = gesture.current
      gesture.current = null
      if (!current) return
      if (current.moved) {
        update(endpointPatch(current.side, valueAt(current.side, point.x)), false)
        soundFX.play('math-snap')
      } else if (interval[current.side] !== null) {
        update({ [`${current.side}Closed`]: !interval[`${current.side}Closed`] }, false)
        soundFX.play('select')
      }
    },
  })

  const hints = []
  if (checked && !goal.reached) {
    for (const side of ['left', 'right']) {
      const name = side === 'left' ? 'Đầu mút trái' : 'Đầu mút phải'
      if (interval[side] !== target[side]) hints.push(`${name} chưa đúng vị trí.`)
      else if (interval[side] !== null && interval[`${side}Closed`] !== target[`${side}Closed`]) hints.push(`${name} đúng chỗ, nhưng cần ${target[`${side}Closed`] ? 'lấy (chấm đặc)' : 'bỏ (chấm rỗng)'}.`)
    }
  }

  return (
    <div className="space-y-5">
      <p className="text-center text-xl font-extrabold text-slate-900">Biểu diễn tập các số thực x thỏa <span className="mt-1 inline-block whitespace-nowrap rounded-xl bg-slate-900 px-3 py-1 text-white">{inequalityText(target)}</span></p>

      <Stage label="Trục số">
        <svg ref={drag.ref} viewBox="0 0 360 170" className="block w-full touch-none select-none" role="img" aria-label={`Khoảng hiện tại ${intervalText(interval)}`} {...drag.bind}>
          <line x1="10" x2="350" y1="92" y2="92" stroke={INK.muted} strokeWidth="2" />
          <path d="M350 92l-8 -5v10z" fill={INK.muted} />
          {Array.from({ length: hi - lo + 1 }, (_, i) => lo + i).map(value => (
            <g key={value}>
              <line x1={px(value)} x2={px(value)} y1="86" y2="98" stroke={INK.muted} />
              <text x={px(value)} y="120" textAnchor="middle" fontSize="12" fontWeight="600" fill={INK.muted}>{formatNumber(value)}</text>
            </g>
          ))}
          <motion.line initial={false} animate={{ x1: handleX('left'), x2: handleX('right') }} y1="92" y2="92" stroke={INK.indigo} strokeWidth="8" strokeLinecap="round" />
          {['left', 'right'].map(side => {
            const open = interval[side] === null
            const x = handleX(side)
            return (
              <motion.g
                key={side}
                role="slider"
                tabIndex={0}
                aria-label={side === 'left' ? 'Đầu mút trái' : 'Đầu mút phải'}
                aria-valuetext={open ? 'vô cực' : `${formatNumber(interval[side])}, ${interval[`${side}Closed`] ? 'lấy' : 'không lấy'}`}
                onKeyDown={sliderKeys(
                  delta => {
                    const base = interval[side] === null ? (side === 'left' ? lo : hi) : interval[side]
                    update(endpointPatch(side, valueAt(side, px(base + delta))), false)
                  },
                  () => { if (!open) update({ [`${side}Closed`]: !interval[`${side}Closed`] }, false) },
                )}
                initial={false}
                animate={{ x }}
                transition={{ type: 'spring', stiffness: 500, damping: 34 }}
                className="cursor-grab outline-none active:cursor-grabbing"
              >
                {open ? (
                  <path d={side === 'left' ? 'M-2 92l14 -10v20z' : 'M2 92l-14 -10v20z'} fill={INK.indigo} />
                ) : (
                  <>
                    <circle cx="0" cy="92" r="20" fill={INK.amber} opacity="0.16" />
                    <circle cx="0" cy="92" r="11" fill={interval[`${side}Closed`] ? INK.indigo : 'white'} stroke={INK.indigo} strokeWidth="4" />
                  </>
                )}
                <text x="0" y={side === 'left' ? 58 : 148} textAnchor="middle" fontSize="14" fontWeight="800" fill={INK.ink}>{open ? (side === 'left' ? '−∞' : '+∞') : formatNumber(interval[side])}</text>
              </motion.g>
            )
          })}
        </svg>
      </Stage>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white px-4 py-3">
        <p className="text-2xl font-extrabold tabular-nums text-slate-900">{intervalText(interval)}</p>
        <TactileButton onClick={() => { setChecked(true); soundFX.play(goal.reached ? 'correct' : 'incorrect') }}>Kiểm tra</TactileButton>
      </div>
      <p className="text-sm font-semibold text-slate-600">Kéo hai đầu mút; kéo ra khỏi trục để thành vô cực. Chạm vào chấm để đổi giữa <span className={cn('font-extrabold text-indigo-700')}>lấy (chấm đặc)</span> và bỏ (chấm rỗng).</p>

      {checked && (
        <Caption tone={goal.reached ? 'success' : 'error'}>
          {goal.reached ? <p>Chính xác: {inequalityText(target)} tương ứng với {intervalText(interval)}.</p> : hints.map(hint => <p key={hint}>{hint}</p>)}
        </Caption>
      )}
    </div>
  )
}
