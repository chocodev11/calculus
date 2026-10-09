import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Check, Eye, FlipHorizontal2, Pin, X } from 'lucide-react'
import soundFX from '../../lib/soundEffects'
import { cn } from '../../lib/utils'
import { compilePredicate } from '../../sandbox'
import { TactileButton } from '../ui/tactile-button'
import { MathText } from './MathText'
import { CaseDots, Caption, ChoiceChips, INK, Stage, formatNumber, optionLabel, placeInSlots, sliderKeys, truthColor, useSvgDrag, vennSlots } from './SandboxKit'

const SUPERSCRIPTS = { 2: '²', 3: '³' }

// Turns evaluator syntax (x^3, 2*x) into the notation printed in the textbook.
function prettyMath(source = '') {
  return source
    .replace(/\^([23])/g, (_, power) => SUPERSCRIPTS[power])
    .replace(/\s*\*\s*/g, '·')
    .replace(/==/g, '=')
    .replace(/>=/g, '≥')
    .replace(/<=/g, '≤')
    .replace(/!=/g, '≠')
    .replace(/-/g, '−')
}

const playFor = correct => soundFX.play(correct ? 'correct' : 'incorrect')

/* ───────────────────────────── Mệnh đề chứa biến: cân hai vế ───────────────────────────── */

export function VariableLab({ manifest, snapshot, dispatch }) {
  const d = snapshot.derivedState
  const activity = manifest.config.activity || {}
  const ids = {
    probe: activity.probeControlId || 'probe_value',
    true: activity.trueWitnessControlId || 'true_witness',
    false: activity.falseWitnessControlId || 'false_witness',
  }
  const [tested, setTested] = useState(() => new Set())
  const [draft, setDraft] = useState('')
  const probe = d.probe
  const ready = probe.inDomain === true && typeof probe.truthValue === 'boolean'
  const rows = d.domainRows
  const comparison = d.comparison

  function tryValue(input) {
    const next = dispatch({ type: 'set_control', controlId: ids.probe, value: String(input) })
    if (!next?.derivedState.probe.inDomain) return
    setTested(previous => new Set(previous).add(String(input)))
    soundFX.play('select')
  }

  function keepWitness(kind) {
    const next = dispatch({ type: 'set_control', controlId: ids[kind], value: String(probe.input) })
    if (next) playFor((kind === 'true' ? next.derivedState.trueWitness : next.derivedState.falseWitness).truthValue === (kind === 'true'))
  }

  const values = rows.map(row => row.value)
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  const tokenX = value => (hi === lo ? 180 : 50 + (value - lo) / (hi - lo) * 260)
  const magnitudes = [...rows, probe].flatMap(row => [row.left, row.right]).filter(Number.isFinite).map(Math.abs)
  const scale = 96 / Math.max(1e-9, ...magnitudes)
  const bar = value => (ready && Number.isFinite(value) ? Math.max(3, Math.abs(value) * scale) : 0)

  return (
    <div className="space-y-5">
      <div className="text-center">
        <p className="text-2xl font-extrabold text-slate-900"><MathText text={prettyMath(d.expressionLabel)} /></p>
        <p className="mt-1 text-sm font-semibold text-slate-600"><MathText text={d.domainLabel} /></p>
      </div>

      <Stage label="So sánh hai vế sau khi thế x">
        <svg viewBox="0 0 360 250" className="block w-full" role="img" aria-label={ready ? `Thế x = ${probe.input}: ${probe.truthValue ? 'đúng' : 'sai'}` : 'Chưa thế giá trị'}>
          {comparison ? (
            <>
              <line x1="70" x2="290" y1="150" y2="150" stroke={INK.line} strokeWidth="2" />
              {[[118, probe.left, INK.indigo, comparison.left], [242, probe.right, INK.cyan, comparison.right]].map(([cx, value, color, label]) => (
                <g key={cx}>
                  <rect x={cx - 26} y={54} width="52" height="96" rx="12" fill="none" stroke={INK.line} strokeDasharray="4 5" />
                  <motion.rect x={cx - 26} width="52" rx="12" fill={color} initial={false} animate={{ y: 150 - bar(value), height: bar(value) }} transition={{ type: 'spring', stiffness: 220, damping: 24 }} />
                  <text x={cx} y="172" textAnchor="middle" fontSize="16" fontWeight="800" fill={INK.ink}>{prettyMath(label)}</text>
                  {ready && <text x={cx} y={140 - bar(value)} textAnchor="middle" fontSize="14" fontWeight="700" fill={INK.ink}>{formatNumber(value)}</text>}
                </g>
              ))}
              <motion.text
                key={`${probe.input}-${probe.truthValue}`}
                x="180" y="116" textAnchor="middle" fontSize="40" fontWeight="800"
                initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                style={{ transformOrigin: '180px 104px' }}
                fill={ready ? truthColor(probe.truthValue) : INK.muted}
              >
                {prettyMath(comparison.operator)}
              </motion.text>
              {ready && <text x="180" y="138" textAnchor="middle" fontSize="13" fontWeight="800" fill={truthColor(probe.truthValue)}>{probe.truthValue ? 'ĐÚNG' : 'SAI'}</text>}
            </>
          ) : (
            <g>
              <circle cx="180" cy="96" r="40" fill={ready ? truthColor(probe.truthValue) : '#E2E8F0'} />
              <text x="180" y="106" textAnchor="middle" fontSize="28" fontWeight="800" fill="white">{ready ? (probe.truthValue ? 'Đ' : 'S') : '?'}</text>
            </g>
          )}
          <line x1="30" x2="330" y1="214" y2="214" stroke={INK.muted} strokeWidth="2" />
          {rows.map(row => {
            const active = ready && Math.abs(Number(probe.value) - row.value) < 1e-9
            const seen = tested.has(row.input)
            return (
              <motion.g
                key={row.input}
                role="button"
                tabIndex={0}
                aria-label={`Thế x = ${row.input}`}
                onClick={() => tryValue(row.input)}
                onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); tryValue(row.input) } }}
                className="cursor-pointer outline-none [&:focus-visible>circle]:stroke-indigo-500"
                animate={{ y: active ? -8 : 0 }}
              >
                <circle cx={tokenX(row.value)} cy="214" r="19" fill={seen ? truthColor(row.truthValue) : 'white'} stroke={active ? INK.amber : INK.ink} strokeWidth={active ? 4 : 2} />
                <text x={tokenX(row.value)} y="219" textAnchor="middle" fontSize="13" fontWeight="800" fill={seen ? 'white' : INK.ink}>{row.input}</text>
              </motion.g>
            )
          })}
        </svg>
      </Stage>

      {ready && (
        <Caption>
          <p className="font-semibold">
            P({probe.input}): <MathText text={prettyMath(String(probe.substitution))} /> <span className="font-extrabold">→ {probe.truthValue ? 'Đúng' : 'Sai'}</span>
          </p>
          <p className="text-sm">Chạm một số trên trục để thế tiếp. Mỗi số sẽ giữ lại màu kết quả của nó.</p>
        </Caption>
      )}
      {probe.error && <Caption tone="error">{probe.error}</Caption>}

      <div className="grid grid-cols-2 gap-3">
        {[['true', d.trueWitness, 'Làm P(x) đúng'], ['false', d.falseWitness, 'Làm P(x) sai']].map(([kind, witness, title]) => {
          const filled = witness.input !== ''
          const good = filled && witness.inDomain && witness.truthValue === (kind === 'true')
          return (
            <div key={kind} className={cn('rounded-3xl border-2 p-4', !filled ? 'border-dashed border-slate-300 bg-white' : good ? 'border-emerald-500 bg-emerald-50' : 'border-rose-500 bg-rose-50')}>
              <p className="text-xs font-extrabold uppercase tracking-wide text-slate-600">Nhân chứng</p>
              <p className="text-sm font-bold text-slate-900">{title}</p>
              <p className="my-2 flex items-center gap-2 text-2xl font-extrabold tabular-nums text-slate-900">
                {filled ? <>x = {witness.input} {good ? <Check className="h-5 w-5 text-emerald-600" strokeWidth={3} /> : <X className="h-5 w-5 text-rose-600" strokeWidth={3} />}</> : <span className="text-slate-400">—</span>}
              </p>
              <TactileButton size="sm" variant="secondary" className="w-full" disabled={!ready} onClick={() => keepWitness(kind)}>
                {ready ? `Giữ x = ${probe.input}` : 'Thế một số trước'}
              </TactileButton>
            </div>
          )
        })}
      </div>

      <form
        className="flex items-end gap-2"
        onSubmit={event => { event.preventDefault(); if (draft.trim()) tryValue(draft.trim()) }}
      >
        <label className="block flex-1 space-y-1.5">
          <span className="text-sm font-semibold text-slate-700">Thử một số khác (vd. 2 hoặc 1/2)</span>
          <input value={draft} maxLength={64} onChange={event => setDraft(event.target.value)} className="h-12 w-full rounded-2xl border-2 border-slate-200 bg-white px-4 text-base font-semibold tabular-nums outline-none focus:border-indigo-500" />
        </label>
        <TactileButton type="submit" variant="secondary" disabled={!draft.trim()}>Thế</TactileButton>
      </form>
    </div>
  )
}

/* ───────────────────────────── Lượng từ: lưới mẫu ∀ / ∃ ───────────────────────────── */

const QUANTIFIER = { forall: '∀', exists: '∃' }

function sampleFocus(visual, samples, negated) {
  const truth = cell => (negated ? !cell.truth : cell.truth)
  const quantifiers = negated ? visual.quantifiers.map(q => (q === 'forall' ? 'exists' : 'forall')) : visual.quantifiers
  if (visual.variables.length === 2 && quantifiers[0] === 'exists' && quantifiers[1] === 'forall') {
    const [xs] = samples.axes
    return { columns: xs.filter(x => samples.cells.filter(cell => cell[visual.variables[0]] === x).every(truth)) }
  }
  const wanted = quantifiers[0] === 'forall' ? false : true
  const cell = samples.cells.find(item => truth(item) === wanted)
  return { cell, kind: wanted ? 'witness' : 'counter' }
}

function SampleField({ item, samples, negated, inspect, onInspect, witnessScope }) {
  const visual = item.visual
  const truth = cell => (negated ? !cell.truth : cell.truth)
  const focus = sampleFocus(visual, samples, negated)
  const [xName, yName] = visual.variables
  const sameCell = (a, b) => a && b && visual.variables.every(name => a[name] === b[name])
  const isWitness = cell => witnessScope && Object.entries(witnessScope).every(([name, value]) => cell[name] === value)

  if (visual.variables.length === 2) {
    const [xs, ys] = samples.axes
    const size = Math.min(38, 200 / Math.max(xs.length, ys.length))
    const left = 180 - xs.length * size / 2 + 8
    const top = 22
    const at = cell => ({ x: left + xs.indexOf(cell[xName]) * size, y: top + (ys.length - 1 - ys.indexOf(cell[yName])) * size })
    return (
      <svg viewBox="0 0 360 250" className="block w-full" role="img" aria-label={`Lưới ${xs.length}×${ys.length} cặp (${xName}; ${yName})`}>
        {ys.map((y, row) => <text key={`y${y}`} x={left - 12} y={top + (ys.length - 1 - row) * size + size / 2 + 5} textAnchor="end" fontSize="13" fontWeight="700" fill={INK.muted}>{formatNumber(y)}</text>)}
        {xs.map((x, col) => <text key={`x${x}`} x={left + col * size + size / 2} y={top + ys.length * size + 18} textAnchor="middle" fontSize="13" fontWeight="700" fill={INK.muted}>{formatNumber(x)}</text>)}
        <text x={left + xs.length * size + 14} y={top + ys.length * size + 18} fontSize="14" fontWeight="800" fill={INK.ink}>{xName}</text>
        <text x={left - 12} y={top - 6} textAnchor="end" fontSize="14" fontWeight="800" fill={INK.ink}>{yName}</text>
        {samples.cells.map(cell => {
          const { x, y } = at(cell)
          const value = truth(cell)
          return (
            <motion.rect
              key={`${item.id}-${cell[xName]}-${cell[yName]}`}
              x={x + 2} y={y + 2} width={size - 4} height={size - 4} rx="8"
              initial={{ fill: '#FFFFFF' }}
              animate={{ fill: value ? INK.emeraldSoft : INK.crimsonSoft, stroke: value ? INK.emerald : INK.crimson }}
              transition={{ delay: negated ? 0 : xs.indexOf(cell[xName]) * 0.09, duration: 0.25 }}
              strokeWidth={sameCell(cell, inspect) ? 3.5 : 1.5}
              className="cursor-pointer"
              onClick={() => onInspect(cell)}
            />
          )
        })}
        {samples.cells.filter(cell => !truth(cell)).map(cell => {
          const { x, y } = at(cell)
          return <path key={`g${cell[xName]}-${cell[yName]}`} pointerEvents="none" d={`M${x + size / 2 - 5} ${y + size / 2 - 5}l10 10m0 -10l-10 10`} stroke={INK.crimson} strokeWidth="2.5" strokeLinecap="round" />
        })}
        {focus.columns?.map(x => (
          <motion.rect key={`col${x}`} pointerEvents="none" x={left + xs.indexOf(x) * size - 1} y={top - 1} width={size + 2} height={ys.length * size + 2} rx="12" fill="none" stroke={INK.amber} strokeWidth="3.5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: xs.length * 0.09 + 0.1 }} />
        ))}
        {focus.cell && (
          <motion.rect pointerEvents="none" x={at(focus.cell).x - 3} y={at(focus.cell).y - 3} width={size + 6} height={size + 6} rx="11" fill="none" stroke={INK.amber} strokeWidth="3.5" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0.5, 1] }} transition={{ delay: xs.length * 0.09 + 0.1, duration: 1.2 }} />
        )}
        {samples.cells.filter(isWitness).map(cell => {
          const { x, y } = at(cell)
          return <circle key={`w${cell[xName]}-${cell[yName]}`} pointerEvents="none" cx={x + size - 7} cy={y + 7} r="5" fill={INK.indigo} stroke="white" strokeWidth="2" />
        })}
      </svg>
    )
  }

  const xs = samples.axes[0]
  const plot = samples.plot
  const measures = samples.cells.map(cell => cell.measure).filter(Number.isFinite)
  const xAt = plot
    ? value => 34 + (value - Math.min(...xs)) / (Math.max(...xs) - Math.min(...xs) || 1) * 292
    : value => 56 + xs.indexOf(value) * (278 / Math.max(1, xs.length - 1))
  const ys = plot ? [...plot.map(point => point.y), 0] : []
  const yLo = Math.min(...ys)
  const yHi = Math.max(...ys)
  const yAt = value => 150 - (value - yLo) / (yHi - yLo || 1) * 128
  const dotY = cell => (plot ? yAt(cell.measure) : 96)

  return (
    <svg viewBox={`0 0 360 ${plot ? 210 : 170}`} className="block w-full" role="img" aria-label={`${xs.length} giá trị mẫu của ${xName}`}>
      {plot && (
        <>
          <line x1="20" x2="340" y1={yAt(0)} y2={yAt(0)} stroke={INK.muted} strokeWidth="1.5" />
          <text x="336" y={yAt(0) - 6} textAnchor="end" fontSize="12" fontWeight="700" fill={INK.muted}>y = 0</text>
          <motion.path
            key={item.id}
            d={plot.map((point, i) => `${i ? 'L' : 'M'}${xAt(point.x).toFixed(1)} ${yAt(point.y).toFixed(1)}`).join(' ')}
            fill="none" stroke={INK.indigo} strokeWidth="3" strokeLinecap="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          />
        </>
      )}
      {!plot && <line x1="20" x2="340" y1="96" y2="96" stroke={INK.line} strokeWidth="2" />}
      {samples.cells.map((cell, i) => {
        const value = truth(cell)
        const cx = xAt(cell[xName])
        const cy = dotY(cell)
        return (
          <g key={`${item.id}-${cell[xName]}`} className="cursor-pointer" onClick={() => onInspect(cell)}>
            {!plot && measures.length > 0 && <text x={cx} y="58" textAnchor="middle" fontSize="12" fontWeight="700" fill={INK.muted}>{formatNumber(cell.measure, 4)}</text>}
            <motion.circle
              cx={cx} cy={cy} r={plot ? 8 : 14}
              initial={{ fill: '#FFFFFF', scale: 0.4 }}
              animate={{ fill: value ? INK.emerald : INK.crimson, scale: 1 }}
              transition={{ delay: negated ? 0 : 0.2 + i * 0.08, type: 'spring', stiffness: 320, damping: 18 }}
              style={{ transformOrigin: `${cx}px ${cy}px` }}
              stroke={sameCell(cell, inspect) ? INK.ink : 'white'} strokeWidth="3"
            />
            <text x={cx} y={plot ? 196 : 132} textAnchor="middle" fontSize="12" fontWeight="700" fill={INK.ink}>{formatNumber(cell[xName], 4)}</text>
          </g>
        )
      })}
      {focus.cell && (
        <motion.circle pointerEvents="none" cx={xAt(focus.cell[xName])} cy={dotY(focus.cell)} r={plot ? 15 : 22} fill="none" stroke={INK.amber} strokeWidth="3.5" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0.5, 1] }} transition={{ delay: 0.3 + xs.length * 0.08, duration: 1.2 }} />
      )}
      {!plot && <text x="14" y="132" fontSize="13" fontWeight="800" fill={INK.ink}>{xName} =</text>}
    </svg>
  )
}

function sampleSummary(visual, samples) {
  const quantifier = visual.quantifiers[0]
  if (visual.variables.length === 2 && visual.quantifiers[0] === 'exists' && visual.quantifiers[1] === 'forall') {
    return samples.sampleVerdict
      ? 'Có một cột sáng trọn vẹn: một giá trị x dùng được cho mọi y trong lưới.'
      : 'Chưa cột nào sáng trọn: chưa thấy x nào dùng được cho mọi y.'
  }
  if (quantifier === 'forall') {
    return samples.sampleVerdict
      ? 'Mọi mẫu đều đúng. Nhưng vài mẫu chưa chứng minh được “với mọi” — cần một lập luận bao quát cả miền.'
      : 'Có mẫu sai (khung cam). Chỉ một phản ví dụ là đủ bác bỏ “với mọi”.'
  }
  return samples.sampleVerdict
    ? 'Có mẫu đúng (khung cam): một nhân chứng là đủ cho “tồn tại”.'
    : 'Chưa mẫu nào đúng. Nhưng “chưa thấy” chưa có nghĩa là “không có” — cần lập luận.'
}

export function QuantifierLab({ manifest, snapshot, dispatch }) {
  const items = manifest.config.activity.items
  const rows = snapshot.derivedState.rows
  const state = snapshot.state
  const [index, setIndex] = useState(0)
  const [checked, setChecked] = useState({})
  const [negated, setNegated] = useState(false)
  const [inspect, setInspect] = useState(null)
  const item = items[index]
  const row = rows[index]
  const visual = item.visual
  const controlOf = id => manifest.controls.find(control => control.id === id)
  const verdictId = item.controlId || `verdict:${item.id}`
  const parts = [
    { key: 'verdict', id: verdictId, title: 'Khẳng định này' },
    item.negationControlId && { key: 'negation', id: item.negationControlId, title: 'Chọn mệnh đề phủ định', stacked: true },
    item.witnessControlId && { key: 'witness', id: item.witnessControlId, title: controlOf(item.witnessControlId)?.label, stacked: true },
  ].filter(Boolean)
  const answered = parts.every(part => state[part.id] !== undefined && state[part.id] !== '')
  const isChecked = checked[item.id]
  const witnessScope = visual?.witnessOptions?.[String(state[item.witnessControlId])]

  function choose(id, value) {
    setChecked(previous => ({ ...previous, [item.id]: false }))
    dispatch({ type: 'set_control', controlId: id, value })
  }

  function inspectCell(cell) {
    setInspect(cell)
    if (!visual?.witnessOptions || !item.witnessControlId) return
    const match = Object.entries(visual.witnessOptions).find(([, scope]) => Object.entries(scope).every(([name, value]) => cell[name] === value))
    if (match) choose(item.witnessControlId, match[0])
  }

  function check() {
    setChecked(previous => ({ ...previous, [item.id]: true }))
    playFor(row.correct)
  }

  function goTo(next) {
    setIndex(next)
    setNegated(false)
    setInspect(null)
  }

  const quantifiers = visual ? (negated ? visual.quantifiers.map(q => (q === 'forall' ? 'exists' : 'forall')) : visual.quantifiers) : []
  const inspectText = inspect && visual
    ? `${visual.variables.map(name => `${name} = ${formatNumber(inspect[name], 4)}`).join(', ')}${inspect.measure !== undefined ? `  →  ${prettyMath(visual.measure)} = ${formatNumber(inspect.measure, 5)}` : ''}  →  ${(negated ? !inspect.truth : inspect.truth) ? 'Đúng' : 'Sai'}`
    : null

  return (
    <div className="space-y-5">
      <h3 className="text-center text-xl font-extrabold leading-snug text-slate-900 sm:text-2xl"><MathText text={item.label} /></h3>

      {row.samples && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-base font-bold text-slate-800">
              {quantifiers.map((q, i) => (
                <motion.span key={`${q}-${i}`} initial={{ rotateY: 90 }} animate={{ rotateY: 0 }} className={cn('inline-flex h-9 min-w-[48px] items-center justify-center rounded-xl px-2 text-white', q === 'forall' ? 'bg-indigo-600' : 'bg-sky-600')}>
                  {QUANTIFIER[q]}{visual.variables[i]}
                </motion.span>
              ))}
              <span className={cn('text-sm font-semibold', negated ? 'text-sky-700' : 'text-slate-600')}>{negated ? 'phủ định của khẳng định' : 'trên các giá trị mẫu'}</span>
            </p>
            <TactileButton size="sm" variant={negated ? 'cyan' : 'secondary'} aria-pressed={negated} onClick={() => { setNegated(value => !value); soundFX.play('select') }}>
              <FlipHorizontal2 className="h-4 w-4" /> {negated ? 'Đang xem phủ định' : 'Lật sang phủ định'}
            </TactileButton>
          </div>
          <Stage label="Kiểm tra trên các giá trị mẫu">
            <SampleField key={`${item.id}-${negated}`} item={item} samples={row.samples} negated={negated} inspect={inspect} onInspect={inspectCell} witnessScope={witnessScope} />
          </Stage>
          <p className="min-h-[24px] text-center text-sm font-semibold tabular-nums text-slate-700">
            {inspectText || 'Chạm vào một ô để xem phép thế.'}
          </p>
          <Caption>
            <p>{negated ? 'Phủ định đổi ∀ ↔ ∃ và đảo màu từng mẫu: ô xanh thành đỏ, đỏ thành xanh.' : sampleSummary(visual, row.samples)}</p>
          </Caption>
        </>
      )}

      <div className="space-y-5 rounded-3xl border border-slate-200 bg-white p-4 sm:p-5">
        {parts.map(part => (
          <div key={part.id} className="space-y-2.5">
            <p className="text-sm font-extrabold text-slate-800"><MathText text={part.title} /></p>
            <ChoiceChips
              control={controlOf(part.id)}
              value={state[part.id]}
              onChange={value => choose(part.id, value)}
              status={isChecked ? row.parts?.[part.key] : undefined}
              stacked={part.stacked}
              label={part.title}
            />
          </div>
        ))}
        <TactileButton className="w-full sm:w-auto" disabled={!answered} onClick={check}>Kiểm tra</TactileButton>
      </div>

      {isChecked && (
        <Caption tone={row.correct ? 'success' : 'error'}>
          <p className="font-bold">{row.correct ? 'Chính xác.' : `Xem lại: ${parts.filter(part => row.parts?.[part.key] === false).map(part => (part.key === 'verdict' ? 'chân trị' : part.key === 'negation' ? 'mệnh đề phủ định' : 'nhân chứng / phản ví dụ')).join(', ')}.`}</p>
          {row.correct && visual?.insight && <p>{visual.insight}</p>}
          {!row.correct && <p>Phủ định đổi “mọi” thành “tồn tại” (và ngược lại), rồi phủ định điều kiện phía sau. Nhân chứng phải nằm trong miền đã nêu.</p>}
        </Caption>
      )}

      <CaseDots count={items.length} index={index} onChange={goTo} status={rows.map(r => (checked[r.id] ? r.correct : undefined))} label="Các khẳng định" />
    </div>
  )
}

/* ───────────────────────────── Kéo theo: biểu đồ Euler ───────────────────────────── */

const EULER = {
  overlap: { P: { cx: 138, cy: 122, r: 82 }, Q: { cx: 222, cy: 122, r: 82 } },
  pInQ: { P: { cx: 150, cy: 124, r: 66 }, Q: { cx: 178, cy: 120, r: 104 } },
  qInP: { P: { cx: 178, cy: 120, r: 104 }, Q: { cx: 150, cy: 124, r: 66 } },
  same: { P: { cx: 180, cy: 120, r: 92 }, Q: { cx: 180, cy: 120, r: 100 } },
}

function CaseGlyph({ glyph, color }) {
  const common = { fill: 'white', stroke: color, strokeWidth: 3, strokeLinejoin: 'round' }
  if (glyph === 'square') return <rect x="-13" y="-13" width="26" height="26" {...common} />
  if (glyph === 'rectangle') return <rect x="-18" y="-11" width="36" height="22" {...common} />
  if (glyph === 'parallelogram') return <path d="M-12 -11H18L12 11H-18Z" {...common} />
  if (glyph === 'rhombus') return <path d="M0 -15L14 0L0 15L-14 0Z" {...common} />
  return null
}

export function ImplicationLab({ manifest, snapshot, dispatch }) {
  const activity = manifest.config.activity
  const d = snapshot.derivedState
  const state = snapshot.state
  const cases = activity.domainCases || {}
  const [focus, setFocus] = useState(null)
  const [inspect, setInspect] = useState(null)
  const directions = [
    { key: 'pToQ', controlId: activity.pToQControlId || 'p-to-q', from: 'P', to: 'Q', counterId: activity.pToQCounterexampleControlId, counters: d.pToQCounterexamples },
    { key: 'qToP', controlId: activity.qToPControlId || 'q-to-p', from: 'Q', to: 'P', counterId: activity.qToPCounterexampleControlId, counters: d.qToPCounterexamples },
  ].filter(direction => manifest.controls.some(control => control.id === direction.controlId))
  const controlOf = id => manifest.controls.find(control => control.id === id)
  const answered = key => {
    const direction = directions.find(item => item.key === key)
    return direction && state[direction.controlId] !== undefined
  }
  const conclusionControl = d.conclusion && controlOf(d.conclusion.controlId)
  const labelOf = value => cases[String(value)]?.label || `a = ${value}`

  const layoutKey = (() => {
    const pSubset = answered('pToQ') && d.verdicts.pToQ && d.pToQ
    const qSubset = answered('qToP') && d.verdicts.qToP && d.qToP
    if (pSubset && qSubset) return 'same'
    if (pSubset) return 'pInQ'
    if (qSubset) return 'qInP'
    return 'overlap'
  })()
  const layout = EULER[layoutKey]
  const regionOf = row => `${row.P ? 1 : 0}${row.Q ? 1 : 0}`
  const positions = useMemo(() => {
    const counts = {}
    d.rows.forEach(row => { counts[regionOf(row)] = (counts[regionOf(row)] || 0) + 1 })
    return placeInSlots(d.rows, regionOf, vennSlots([layout.P, layout.Q], counts))
  }, [layout, d.rows])

  const activeDirection = directions.find(direction => direction.key === focus)
  const counterDirection = directions.find(direction => direction.counterId && controlOf(direction.counterId))

  function answer(direction, value) {
    const next = dispatch({ type: 'set_control', controlId: direction.controlId, value })
    setFocus(direction.key)
    if (next) playFor(next.derivedState.verdicts[direction.key])
  }

  function tapToken(row) {
    setInspect(row)
    if (!counterDirection || !answered(counterDirection.key)) return
    const control = controlOf(counterDirection.counterId)
    const option = control.options.find(item => String(item).split('_or_').includes(String(row.value)))
    if (!option) return
    const next = dispatch({ type: 'set_control', controlId: control.id, value: option })
    setFocus(counterDirection.key)
    if (next) playFor(next.derivedState.counterexamples[counterDirection.key])
  }

  const inspectNote = (() => {
    if (!inspect) return null
    const base = `${labelOf(inspect.value)}: P ${inspect.P ? 'đúng' : 'sai'}, Q ${inspect.Q ? 'đúng' : 'sai'}`
    if (!counterDirection || !answered(counterDirection.key)) return base
    const from = counterDirection.from === 'P' ? inspect.P : inspect.Q
    const to = counterDirection.to === 'P' ? inspect.P : inspect.Q
    if (!from) return `${base} — không nằm trong ${counterDirection.from} nên không kiểm tra được ${counterDirection.from} ⇒ ${counterDirection.to}.`
    if (to) return `${base} — thỏa cả hai, chưa bác bỏ ${counterDirection.from} ⇒ ${counterDirection.to}.`
    return `${base} — nằm trong ${counterDirection.from} mà ngoài ${counterDirection.to}: phản ví dụ!`
  })()

  const tokenTone = row => {
    if (!activeDirection) return 'plain'
    const from = activeDirection.from === 'P' ? row.P : row.Q
    const to = activeDirection.to === 'P' ? row.P : row.Q
    if (!from) return 'dim'
    return to ? 'pass' : 'counter'
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row">
        {[['P', activity.pExpressionLabel || activity.pExpression, 'bg-indigo-600'], ['Q', activity.qExpressionLabel || activity.qExpression, 'bg-sky-600']].map(([name, text, tone]) => (
          <p key={name} className="flex flex-1 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-[15px] font-semibold text-slate-800">
            <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-base font-extrabold text-white', tone)}>{name}</span>
            <MathText text={text} />
          </p>
        ))}
      </div>

      <Stage label="Biểu đồ Euler của P và Q">
        <svg viewBox="0 0 360 240" className="block w-full" role="img" aria-label={`Các trường hợp: ${d.rows.map(row => `${labelOf(row.value)} (P ${row.P ? 'đúng' : 'sai'}, Q ${row.Q ? 'đúng' : 'sai'})`).join('; ')}`}>
          <rect x="8" y="8" width="344" height="224" rx="22" fill="white" stroke={INK.line} strokeWidth="2" />
          {[['Q', INK.cyan, INK.cyanSoft], ['P', INK.indigo, INK.indigoSoft]].map(([name, stroke, fill]) => {
            const circle = layout[name]
            const lit = activeDirection?.from === name
            return (
              <motion.circle
                key={name}
                initial={false}
                animate={{ cx: circle.cx, cy: circle.cy, r: circle.r, fillOpacity: lit ? 0.9 : 0.55, strokeWidth: lit ? 4 : 2.5 }}
                transition={{ type: 'spring', stiffness: 120, damping: 18 }}
                fill={fill} stroke={stroke}
              />
            )
          })}
          {[['P', INK.indigo, -1], ['Q', INK.cyan, 1]].map(([name, color]) => {
            const circle = layout[name]
            const annotate = d.conclusion?.correct && state[d.conclusion.controlId] !== undefined
            const role = name === 'P' ? (d.sufficient ? 'đủ' : d.necessary ? 'cần' : '') : (d.sufficient ? 'cần' : d.necessary ? 'đủ' : '')
            return (
              <motion.g key={`label${name}`} initial={false} animate={{ x: circle.cx + (name === 'P' ? -0.7 : 0.7) * circle.r, y: circle.cy - 0.7 * circle.r }} transition={{ type: 'spring', stiffness: 120, damping: 18 }}>
                <rect x="-15" y="-15" width={annotate && role ? 64 : 30} height="26" rx="10" fill={color} />
                <text x="0" y="3" textAnchor="middle" fontSize="15" fontWeight="800" fill="white">{name}</text>
                {annotate && role && <text x="30" y="3" textAnchor="middle" fontSize="12" fontWeight="800" fill="white">{role}</text>}
              </motion.g>
            )
          })}
          {d.rows.map((row, i) => {
            const tone = tokenTone(row)
            const color = tone === 'counter' ? INK.crimson : tone === 'pass' ? INK.emerald : INK.ink
            const glyph = cases[String(row.value)]?.glyph
            const selected = counterDirection && String(state[counterDirection.counterId] ?? '').split('_or_').includes(String(row.value))
            return (
              <motion.g
                key={row.value}
                role="button"
                tabIndex={0}
                aria-label={labelOf(row.value)}
                onClick={() => tapToken(row)}
                onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); tapToken(row) } }}
                initial={false}
                animate={{ x: positions[i].x, y: positions[i].y, opacity: tone === 'dim' ? 0.35 : 1, scale: tone === 'counter' ? [1, 1.18, 1] : 1 }}
                transition={{ type: 'spring', stiffness: 140, damping: 16 }}
                className="cursor-pointer outline-none"
              >
                {selected && <circle r="24" fill="none" stroke={INK.amber} strokeWidth="4" />}
                {glyph ? <CaseGlyph glyph={glyph} color={color} /> : (
                  <>
                    <circle r="18" fill={tone === 'counter' ? INK.crimson : 'white'} stroke={color} strokeWidth="2.5" />
                    <text y="5" textAnchor="middle" fontSize="14" fontWeight="800" fill={tone === 'counter' ? 'white' : INK.ink}>{row.value}</text>
                  </>
                )}
              </motion.g>
            )
          })}
        </svg>
      </Stage>

      {Object.keys(cases).length > 0 && (
        <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm font-semibold text-slate-700" aria-label="Chú giải hình">
          {d.rows.map(row => (
            <li key={row.value} className="flex items-center gap-2">
              <svg viewBox="-20 -16 40 32" className="h-5 w-7" aria-hidden><CaseGlyph glyph={cases[String(row.value)]?.glyph} color={INK.ink} /></svg>
              {labelOf(row.value)}
            </li>
          ))}
        </ul>
      )}

      <p className="min-h-[24px] text-center text-sm font-semibold text-slate-700">{inspectNote || 'Chạm vào một phần tử để xem nó thỏa P, Q hay không.'}</p>

      <div className="space-y-4">
        {directions.map(direction => {
          const control = controlOf(direction.controlId)
          const done = answered(direction.key)
          const correct = d.verdicts[direction.key]
          const expected = direction.key === 'pToQ' ? d.pToQ : d.qToP
          return (
            <div key={direction.key} className="space-y-3 rounded-3xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-base font-bold leading-snug text-slate-900"><MathText text={control.label} /></p>
                <TactileButton size="icon-sm" variant={focus === direction.key ? 'cyan' : 'secondary'} aria-label={`Soi vùng ${direction.from}`} aria-pressed={focus === direction.key} onClick={() => setFocus(value => (value === direction.key ? null : direction.key))}>
                  <Eye className="h-4 w-4" />
                </TactileButton>
              </div>
              <ChoiceChips control={control} value={state[direction.controlId]} onChange={value => answer(direction, value)} status={done ? correct : undefined} />
              {done && (
                <Caption tone={correct ? 'success' : 'error'}>
                  {expected
                    ? <p>Mọi phần tử trong vùng {direction.from} đều nằm trong {direction.to}, nên {direction.from} ⇒ {direction.to} <strong>đúng</strong>.</p>
                    : <p>{direction.counters.map(labelOf).join(', ')} nằm trong {direction.from} nhưng ngoài {direction.to} (tô đỏ), nên {direction.from} ⇒ {direction.to} <strong>sai</strong>.</p>}
                </Caption>
              )}
              {done && direction === counterDirection && (
                <div className="space-y-2">
                  <p className="text-sm font-bold text-slate-800">{controlOf(direction.counterId).label}: chạm vào phần tử đó trên hình, hoặc</p>
                  <ChoiceChips
                    control={controlOf(direction.counterId)}
                    options={controlOf(direction.counterId).options.filter(option => !String(option).split('_or_').some(part => d.rows.some(row => String(row.value) === part)))}
                    value={state[direction.counterId]}
                    onChange={value => dispatch({ type: 'set_control', controlId: direction.counterId, value })}
                    status={state[direction.counterId] !== undefined ? d.counterexamples[direction.key] : undefined}
                  />
                  {state[direction.counterId] !== undefined && (
                    <p className={cn('flex items-center gap-2 text-sm font-bold', d.counterexamples[direction.key] ? 'text-emerald-700' : 'text-rose-700')}>
                      {d.counterexamples[direction.key] ? <Check className="h-4 w-4" strokeWidth={3} /> : <X className="h-4 w-4" strokeWidth={3} />}
                      Đã chọn: {optionLabel(controlOf(direction.counterId), state[direction.counterId])}
                    </p>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {conclusionControl && directions.every(direction => answered(direction.key)) && (
          <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-4">
            <p className="text-base font-bold text-slate-900"><MathText text={conclusionControl.label} /></p>
            <ChoiceChips
              control={conclusionControl}
              options={conclusionControl.options.filter(option => option !== 'none')}
              value={state[conclusionControl.id]}
              onChange={value => { const next = dispatch({ type: 'set_control', controlId: conclusionControl.id, value }); if (next) playFor(next.derivedState.conclusion.correct) }}
              status={state[conclusionControl.id] !== undefined ? d.conclusion.correct : undefined}
              stacked
            />
            {state[conclusionControl.id] !== undefined && (
              <Caption tone={d.conclusion.correct ? 'success' : 'error'}>
                <p>Nằm trong vùng P là <strong>đủ</strong> để nằm trong Q; muốn nằm trong P thì <strong>cần</strong> nằm trong Q.</p>
              </Caption>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ───────────────────────────── Tham số: kéo nghiệm trên parabol ───────────────────────────── */

export function ParameterLab({ manifest, snapshot, dispatch }) {
  const activity = manifest.config.activity
  const d = snapshot.derivedState
  const state = snapshot.state
  const control = manifest.controls.find(c => c.id === (activity.parameterControlId || 'parameter'))
  const strategy = manifest.controls.find(c => c.id === (activity.strategyControlId || 'strategy'))
  const name = activity.parameterName || 'm'
  const step = control.step || 1
  const mMin = control.min ?? -3
  const mMax = control.max ?? 4
  const [fixedRoot] = d.roots
  const [visited, setVisited] = useState(() => new Map([[d.parameter, d.implication]]))

  useEffect(() => {
    setVisited(previous => (previous.get(d.parameter) === d.implication ? previous : new Map(previous).set(d.parameter, d.implication)))
  }, [d.parameter, d.implication])

  const conclusion = useMemo(() => (activity.qTemplate ? compilePredicate(activity.qTemplate.replace(/≥/g, '>=').replace(/≤/g, '<=')) : null), [activity.qTemplate])
  const xLo = Math.min(mMin, fixedRoot) - 1
  const xHi = Math.max(mMax, fixedRoot) + 1
  const px = x => 24 + (x - xLo) / (xHi - xLo) * 312
  const toX = svgX => xLo + (svgX - 24) / 312 * (xHi - xLo)
  const deepest = Math.max(...[mMin, mMax].map(m => ((fixedRoot - m) / 2) ** 2))
  const yLo = -deepest - 1
  const yHi = deepest + 3
  const py = y => 170 - (y - yLo) / (yHi - yLo) * 150
  const axisY = py(0)
  const m = d.parameter
  const curve = Array.from({ length: 81 }, (_, i) => {
    const x = xLo + (xHi - xLo) * i / 80
    return `${i ? 'L' : 'M'}${px(x).toFixed(1)} ${py((x - fixedRoot) * (x - m)).toFixed(1)}`
  }).join(' ')
  const shade = conclusion ? Array.from({ length: 120 }, (_, i) => xLo + (xHi - xLo) * (i + 0.5) / 120).filter(x => conclusion.evaluate({ x })) : []
  const rootOk = x => (conclusion ? conclusion.evaluate({ x }) : true)
  const snap = x => Math.max(mMin, Math.min(mMax, mMin + Math.round((x - mMin) / step) * step))

  const setParameter = (value, transient) => {
    if (value === m && transient) return
    dispatch({ type: 'set_control', controlId: control.id, value, transient })
  }
  const drag = useSvgDrag({
    width: 360,
    height: 220,
    onMove: (point, start) => {
      if (start) soundFX.play('select')
      setParameter(snap(toX(point.x)), true)
    },
    onEnd: point => setParameter(snap(toX(point.x)), false),
  })

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center">
        <p className="text-lg font-extrabold text-slate-900">P<sub>{name}</sub>: <MathText text={activity.pTemplate} /></p>
        {activity.qTemplate && <p className="text-sm font-semibold text-slate-600">Q: <MathText text={activity.qTemplate} /> · Khi nào P<sub>{name}</sub> ⇒ Q đúng?</p>}
      </div>

      <Stage label="Đồ thị và nghiệm theo tham số">
        <svg ref={drag.ref} viewBox="0 0 360 220" className="block w-full touch-none select-none" role="img" aria-label={`${name} = ${m}; nghiệm ${d.roots.join(' và ')}`} {...drag.bind}>
          {shade.length > 0 && <rect x={px(Math.min(...shade))} y="12" width={px(Math.max(...shade)) - px(Math.min(...shade))} height="166" fill={INK.emeraldSoft} opacity="0.7" />}
          {shade.length > 0 && <text x={px(Math.min(...shade)) + 8} y="30" fontSize="13" fontWeight="800" fill={INK.emeraldDeep}>vùng Q: <tspan>{activity.qTemplate}</tspan></text>}
          <line x1="16" x2="344" y1={axisY} y2={axisY} stroke={INK.muted} strokeWidth="2" />
          {Array.from({ length: Math.round(xHi - xLo) + 1 }, (_, i) => xLo + i).map(x => (
            <g key={x}>
              <line x1={px(x)} x2={px(x)} y1={axisY - 4} y2={axisY + 4} stroke={INK.muted} />
              {x !== fixedRoot && x !== m && <text x={px(x)} y={axisY + 18} textAnchor="middle" fontSize="11" fill={INK.muted}>{formatNumber(x)}</text>}
            </g>
          ))}
          <clipPath id="parameter-plot"><rect x="0" y="12" width="360" height="166" /></clipPath>
          <path d={curve} clipPath="url(#parameter-plot)" fill="none" stroke={INK.indigo} strokeWidth="3" strokeLinecap="round" />
          <g>
            <circle cx={px(fixedRoot)} cy={axisY} r="10" fill={truthColor(rootOk(fixedRoot))} stroke="white" strokeWidth="3" />
            <foreignObject x={px(fixedRoot) - 9} y={axisY + 10} width="18" height="18"><Pin className="h-[18px] w-[18px] text-slate-500" aria-hidden /></foreignObject>
            <text x={px(fixedRoot)} y={axisY - 16} textAnchor="middle" fontSize="13" fontWeight="800" fill={INK.ink}>x = {formatNumber(fixedRoot)}</text>
          </g>
          <motion.g
            role="slider"
            tabIndex={0}
            aria-label={`Tham số ${name}`}
            aria-valuemin={mMin}
            aria-valuemax={mMax}
            aria-valuenow={m}
            onKeyDown={sliderKeys(delta => setParameter(snap(m + delta * step), false))}
            initial={false}
            animate={{ x: px(m) }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="cursor-grab outline-none active:cursor-grabbing"
          >
            <circle cx="0" cy={axisY} r="22" fill={INK.amber} opacity="0.18" />
            <circle cx="0" cy={axisY} r="13" fill={truthColor(rootOk(m))} stroke={INK.amber} strokeWidth="4" />
            <text x="0" y={axisY + 40} textAnchor="middle" fontSize="13" fontWeight="800" fill={INK.ink}>x = {name} = {formatNumber(m)}</text>
          </motion.g>
        </svg>
        <div className="border-t border-slate-200 bg-white/80 px-4 py-3">
          <p className="mb-2 text-xs font-extrabold uppercase tracking-wide text-slate-600">Các giá trị {name} đã thử</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label={`Chọn ${name}`}>
            {Array.from({ length: Math.round((mMax - mMin) / step) + 1 }, (_, i) => Number((mMin + i * step).toFixed(6))).map(value => {
              const seen = visited.has(value)
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setParameter(value, false)}
                  aria-pressed={value === m}
                  className={cn(
                    'flex h-10 min-w-[44px] items-center justify-center rounded-full border-2 px-2 text-sm font-extrabold tabular-nums transition-colors',
                    seen ? (visited.get(value) ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-rose-500 bg-rose-500 text-white') : 'border-slate-200 bg-white text-slate-700',
                    value === m && '!border-amber-500 ring-4 ring-amber-100',
                  )}
                >
                  {formatNumber(value)}
                </button>
              )
            })}
          </div>
        </div>
      </Stage>

      <Caption tone={d.implication ? 'success' : 'error'}>
        <p>
          {name} = {formatNumber(m)}: nghiệm x = {d.roots.map(root => formatNumber(root)).join(' và x = ')}.{' '}
          {d.implication ? 'Mọi nghiệm đều thỏa Q, nên Pₘ ⇒ Q đúng.' : `Có nghiệm nằm ngoài vùng Q — đó là phản ví dụ, Pₘ ⇒ Q sai.`}
        </p>
        <p className="text-sm">Kéo chấm cam trên trục: nghiệm x = {formatNumber(fixedRoot)} đứng yên, nghiệm còn lại chạy theo {name}.</p>
      </Caption>

      {strategy && (
        <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-4">
          <p className="text-base font-bold text-slate-900"><MathText text={strategy.label} /></p>
          <ChoiceChips
            control={strategy}
            value={state[strategy.id]}
            onChange={value => dispatch({ type: 'set_control', controlId: strategy.id, value })}
            status={state[strategy.id] !== undefined ? snapshot.goals.every(goal => goal.reached) || undefined : undefined}
          />
        </div>
      )}
    </div>
  )
}

/* ───────────────────────────── Bảng chân trị ───────────────────────────── */

export function TruthTableLab({ manifest, snapshot, dispatch }) {
  const d = snapshot.derivedState
  const variables = manifest.config.variables || []
  const visited = new Set(d.completedRows || [])

  function flip(name) {
    if (!manifest.controls.some(control => control.id === name)) return
    dispatch({ type: 'set_control', controlId: name, value: !d.assignment[name] })
    soundFX.play('select')
  }

  return (
    <div className="space-y-5">
      <p className="text-center text-2xl font-extrabold text-slate-900"><MathText text={prettyMath(manifest.config.expression).replace(/&&/g, '∧').replace(/\|\|/g, '∨').replace(/!/g, '¬')} /></p>
      <Stage label="Bật tắt từng mệnh đề">
        <div className="flex flex-wrap items-center justify-center gap-6 px-4 py-6">
          {variables.map(name => (
            <button key={name} type="button" role="switch" aria-checked={d.assignment[name]} onClick={() => flip(name)} className="flex flex-col items-center gap-2">
              <span className={cn('relative h-14 w-24 rounded-full transition-colors', d.assignment[name] ? 'bg-emerald-500' : 'bg-slate-300')}>
                <motion.span layout className={cn('absolute top-1.5 h-11 w-11 rounded-full bg-white shadow-[0_3px_0_rgba(15,23,42,0.18)]', d.assignment[name] ? 'right-1.5' : 'left-1.5')} />
              </span>
              <span className="text-base font-extrabold text-slate-900">{name} = {d.assignment[name] ? 'Đ' : 'S'}</span>
            </button>
          ))}
          <ArrowRight aria-hidden className="h-6 w-6 text-slate-400" />
          <motion.span key={String(d.truthValue)} initial={{ scale: 0.7 }} animate={{ scale: 1 }} className="flex h-20 w-20 items-center justify-center rounded-full text-3xl font-extrabold text-white" style={{ background: truthColor(d.truthValue) }}>
            {d.truthValue ? 'Đ' : 'S'}
          </motion.span>
        </div>
      </Stage>
      <table className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white text-center text-base tabular-nums">
        <thead className="bg-slate-50 text-sm font-extrabold text-slate-600">
          <tr>{variables.map(name => <th key={name} className="py-2">{name}</th>)}<th className="py-2">Kết quả</th></tr>
        </thead>
        <tbody>
          {d.rows.map(row => {
            const key = variables.map(name => (row[name] ? '1' : '0')).join('')
            const seen = visited.has(key)
            return (
              <tr key={key} className={cn('border-t border-slate-100', key === d.rowKey && 'bg-indigo-50 font-extrabold')}>
                {variables.map(name => <td key={name} className="py-2">{row[name] ? 'Đ' : 'S'}</td>)}
                <td className="py-2 font-extrabold" style={{ color: seen ? truthColor(row.result) : INK.muted }}>{seen ? (row.result ? 'Đ' : 'S') : '?'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
