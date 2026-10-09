import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Ban, Variable } from 'lucide-react'
import soundFX from '../../lib/soundEffects'
import { cn } from '../../lib/utils'
import { TactileButton } from '../ui/tactile-button'
import { MathText } from './MathText'
import { CaseDots, Caption, INK, choiceState, truthColor } from './SandboxKit'

// The learner plays the teacher grading "Đúng ghi Đ, sai ghi S": a sentence is a
// proposition exactly when it can be graded, even when the grade is S.
const PEN = '#4338CA'
const LOOP = 'M46 9C69 8 82 25 79 47C76 69 57 81 37 78C17 75 7 57 11 37C15 19 31 10 52 12'

const ACTIONS = [
  { value: 'proposition:true', letter: 'Đ', label: 'Chấm Đúng' },
  { value: 'proposition:false', letter: 'S', label: 'Chấm Sai' },
  { value: 'open_sentence', Icon: Variable, label: 'Còn tùy x' },
  { value: 'not_proposition', Icon: Ban, label: 'Không chấm được' },
]

const GROUPS = [
  { type: 'proposition', rule: 'Chấm được Đ hoặc S', name: 'Mệnh đề' },
  { type: 'open_sentence', rule: 'Còn tùy giá trị của biến', name: 'Mệnh đề chứa biến' },
  { type: 'not_proposition', rule: 'Không chấm được', name: 'Không phải mệnh đề' },
]

function successTitle(row) {
  if (row.expectedType === 'proposition') return row.mark === false ? 'Chấm S vẫn là chấm được: mệnh đề.' : 'Chấm được: đây là mệnh đề.'
  if (row.expectedType === 'open_sentence') return 'Còn tùy x: mệnh đề chứa biến.'
  return 'Không chấm được: không phải mệnh đề.'
}

// One-line nudges that point at the evidence instead of giving the answer away.
function retryTitle(row) {
  if (row.typeCorrect) return 'Chấm được là đúng rồi, nhưng dấu chấm bị nhầm.'
  if (row.expectedType === 'proposition') return row.selectedType === 'open_sentence' ? 'Câu này không có biến để chờ.' : 'Thử lại: câu này khẳng định một điều cụ thể.'
  if (row.expectedType === 'open_sentence') return row.selectedType === 'proposition' ? 'Chấm vậy khi x bằng mấy? Thử các giá trị x.' : 'Biết x là chấm được. Thử các giá trị x.'
  if (row.opinions) return 'Nhưng bạn kia lại chấm ngược lại. Ai đúng?'
  return row.selectedType === 'open_sentence' ? 'Câu này không có biến x.' : 'Câu này khẳng định điều gì để chấm?'
}

function InkMark({ letter, sub, empty }) {
  return (
    <svg viewBox="0 0 90 96" className="h-[84px] w-[78px] -rotate-6" aria-hidden>
      {empty ? (
        <circle cx="45" cy="45" r="33" fill="none" stroke={INK.line} strokeWidth="2.5" strokeDasharray="5 7" />
      ) : (
        <>
          <motion.path key={`loop-${letter}`} d={LOOP} fill="none" stroke={PEN} strokeWidth="4" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }} />
          <motion.text key={`letter-${letter}`} x="45" y="58" textAnchor="middle" fontSize={letter.length > 1 ? 24 : 38} fontWeight="800" fill={PEN} initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.22, type: 'spring', stiffness: 420, damping: 20 }} style={{ transformOrigin: '45px 46px' }}>
            {letter}
          </motion.text>
        </>
      )}
      {sub && <text x="45" y="93" textAnchor="middle" fontSize="13" fontWeight="800" fill={PEN}>{sub}</text>}
    </svg>
  )
}

function Paper({ number, item, row, probeIndex, onProbe }) {
  const answered = row.selected !== ''
  const probe = row.probe || []
  const showProbe = answered && row.expectedType === 'open_sentence' && probe.length > 0
  const sample = probe[probeIndex]
  let letter = null
  let sub = null
  if (row.selectedType === 'proposition') letter = row.mark === false ? 'S' : 'Đ'
  if (row.selectedType === 'not_proposition') letter = '—'
  if (row.selectedType === 'open_sentence') {
    letter = sample ? (sample.truth ? 'Đ' : 'S') : 'x?'
    sub = sample ? `x = ${sample.input}` : null
  }

  return (
    <motion.article
      key={item.id}
      initial={{ opacity: 0, x: 24, rotate: 1.5 }}
      animate={{ opacity: 1, x: 0, rotate: 0 }}
      exit={{ opacity: 0, x: -24, rotate: -1.5 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_2px_0_#E2E8F0,0_18px_30px_-22px_rgba(15,23,42,0.45)]"
    >
      <div aria-hidden className="absolute inset-0 bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_35px,#E0E7FF_35px,#E0E7FF_36px)] [background-position:0_10px]" />
      <div aria-hidden className="absolute inset-y-0 left-12 w-0.5 bg-rose-200" />
      <span className="absolute left-0 top-7 w-12 text-center text-base font-extrabold tabular-nums text-slate-500">{number}.</span>
      <div className="relative flex min-h-[152px] items-center gap-2 py-6 pl-16 pr-3 lg:min-h-[216px] lg:pr-6">
        <p className="min-w-0 flex-1 text-[22px] font-bold leading-9 text-slate-900 sm:text-2xl sm:leading-9 lg:text-[28px] lg:leading-9">
          <MathText text={item.label} />
        </p>
        <span className="shrink-0">
          {letter ? <InkMark letter={letter} sub={sub} /> : <InkMark empty />}
        </span>
      </div>
      {showProbe && (
        <div className="relative flex flex-wrap gap-2 pb-5 pl-16 pr-4" role="group" aria-label="Thử giá trị của x">
          {probe.map((sample, i) => (
            <button
              key={sample.input}
              type="button"
              onClick={() => onProbe(i)}
              aria-pressed={i === probeIndex}
              className={cn(
                'flex h-10 items-center gap-1.5 rounded-full border-2 bg-white px-3 text-sm font-bold tabular-nums transition-colors',
                i === probeIndex ? 'border-indigo-700 text-indigo-800' : 'border-slate-200 text-slate-600',
              )}
            >
              <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: truthColor(sample.truth) }} />
              x = {sample.input}
            </button>
          ))}
        </div>
      )}
    </motion.article>
  )
}

function Opinions({ opinions }) {
  return (
    <div className="flex items-center justify-center gap-3" aria-label="Hai bạn đã chấm">
      {opinions.map((opinion, i) => (
        <motion.div
          key={opinion.name}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 + i * 0.15 }}
          className="flex items-center gap-2 rounded-full bg-white py-1.5 pl-1.5 pr-4 shadow-[0_2px_0_#E2E8F0] ring-1 ring-slate-200"
        >
          <span className={cn('flex h-8 w-8 items-center justify-center rounded-full text-sm font-extrabold text-white', i ? 'bg-amber-500' : 'bg-sky-600')}>{opinion.name[0]}</span>
          <span className="text-sm font-bold text-slate-700">{opinion.name} chấm</span>
          <span className="text-lg font-extrabold" style={{ color: PEN }}>{opinion.mark ? 'Đ' : 'S'}</span>
        </motion.div>
      ))}
    </div>
  )
}

function Summary({ items, rows, onOpen }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <p className="text-center text-xl font-extrabold text-slate-900 [text-wrap:balance]">Mệnh đề là câu chấm được Đ hoặc S.</p>
      <div className="grid gap-3 sm:grid-cols-3">
        {GROUPS.map(group => (
          <section key={group.type} className="rounded-3xl bg-slate-50 p-4">
            <h4 className="text-base font-extrabold text-slate-900">{group.name}</h4>
            <p className="mb-3 text-sm font-semibold text-slate-600">{group.rule}</p>
            <ul className="space-y-2">
              {rows.map((row, i) => row.expectedType === group.type && (
                <li key={row.id}>
                  <button type="button" onClick={() => onOpen(i)} className="w-full rounded-2xl bg-white px-3 py-2 text-left text-[15px] font-semibold leading-snug text-slate-800 ring-1 ring-slate-200 hover:ring-indigo-300">
                    <MathText text={items[i].label} />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </motion.div>
  )
}

export function PropositionLab({ manifest, snapshot, dispatch }) {
  const items = manifest.config.activity.items
  const rows = snapshot.derivedState.rows
  const firstOpen = rows.findIndex(row => !row.correct)
  const [index, setIndex] = useState(firstOpen < 0 ? rows.length : firstOpen)
  const [probeIndex, setProbeIndex] = useState(0)
  const [pinnedProbe, setPinnedProbe] = useState(false)
  const summary = index >= rows.length
  const item = items[index]
  const row = rows[index]
  const control = item && manifest.controls.find(c => c.id === (item.controlId || `class:${item.id}`))
  const answered = Boolean(row) && row.selected !== ''
  const probeCount = row?.probe?.length || 0

  // Walk through the x values once the open sentence is on the table, until the learner takes over.
  useEffect(() => {
    if (!answered || row.expectedType !== 'open_sentence' || pinnedProbe || probeCount < 2) return undefined
    const timer = setInterval(() => setProbeIndex(i => (i + 1) % probeCount), 1200)
    return () => clearInterval(timer)
  }, [answered, row?.expectedType, pinnedProbe, probeCount])

  function open(next) {
    setIndex(next)
    setProbeIndex(0)
    setPinnedProbe(false)
  }

  function grade(value) {
    const next = dispatch({ type: 'set_control', controlId: control.id, value })
    if (next) soundFX.play(next.derivedState.rows[index].correct ? 'correct' : 'incorrect')
  }

  const nextIndex = rows.findIndex((r, i) => i > index && !r.correct)
  const fallbackIndex = rows.findIndex(r => !r.correct)
  const advanceTo = nextIndex >= 0 ? nextIndex : fallbackIndex >= 0 ? fallbackIndex : rows.length

  return (
    <div className="space-y-5 lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start lg:gap-x-8 lg:space-y-0">
      <div className={cn('space-y-4 lg:col-start-1', summary && 'lg:col-span-2')}>
        <CaseDots count={rows.length} index={Math.min(index, rows.length - 1)} onChange={open} status={rows.map(r => (r.selected === '' ? undefined : r.correct))} label="Các câu cần chấm" />
        {summary ? (
          <Summary items={items} rows={rows} onOpen={open} />
        ) : (
          <>
            {row.opinions && <Opinions opinions={row.opinions} />}
            <AnimatePresence mode="wait">
              <Paper key={item.id} number={index + 1} item={item} row={row} probeIndex={probeIndex} onProbe={i => { setPinnedProbe(true); setProbeIndex(i) }} />
            </AnimatePresence>
          </>
        )}
      </div>

      {!summary && (
        <div className="space-y-3 lg:col-start-2 lg:row-start-1 lg:pt-14">
          {answered && (
            <Caption tone={row.correct ? 'success' : 'error'}>
              <p className="font-bold">{row.correct ? successTitle(row) : retryTitle(row)}</p>
              {(row.correct || (row.typeCorrect && !row.markCorrect)) && row.explanation && <p className="text-sm"><MathText text={row.explanation} /></p>}
            </Caption>
          )}
          {row.correct ? (
            <TactileButton size="lg" className="w-full" onClick={() => open(advanceTo)}>
              {advanceTo >= rows.length ? 'Xem tổng kết' : 'Câu tiếp theo'} <ArrowRight className="h-5 w-5" />
            </TactileButton>
          ) : (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-1" role="group" aria-label="Chấm câu này">
              {ACTIONS.map(action => {
                const chosen = row.selected === action.value
                const state = choiceState(chosen, chosen ? row.correct : undefined)
                return (
                  <button
                    key={action.value}
                    type="button"
                    aria-label={action.label}
                    aria-pressed={chosen}
                    data-state={state}
                    onClick={() => grade(action.value)}
                    className="choice-option h-16 justify-center px-3 text-[15px] leading-tight lg:h-14 lg:justify-start lg:px-5"
                  >
                    {action.letter ? (
                      <>
                        <span className={cn('text-3xl font-extrabold', state === 'idle' && 'text-indigo-700')}>{action.letter}</span>
                        <span className="text-sm font-bold">{action.label.replace('Chấm ', '')}</span>
                      </>
                    ) : (
                      <>
                        <action.Icon className="h-5 w-5 shrink-0" />
                        {action.label}
                      </>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
