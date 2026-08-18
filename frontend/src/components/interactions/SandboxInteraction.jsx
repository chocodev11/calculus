import { useEffect, useMemo, useRef, useState } from 'react'
import api from '../../lib/api'
import {
  createSession,
  defaultSandboxRegistry,
  renderSceneSvg,
  renderTextAlternative,
} from '../../sandbox'

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
    return (
      <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <input
          type="checkbox"
          checked={current === true}
          onChange={event => onChange(event.target.checked)}
          aria-label={control.label}
        />
        {control.label}
      </label>
    )
  }
  if (control.type === 'choice') {
    return (
      <label className="flex min-w-40 flex-col gap-1 text-sm font-semibold text-slate-700">
        {control.label}
        <select value={String(current)} onChange={event => onChange(event.target.value)} className="rounded-lg border border-slate-300 bg-white px-2 py-1">
          {(control.options || []).map(option => <option key={String(option)} value={String(option)}>{String(option)}</option>)}
        </select>
      </label>
    )
  }
  if (control.type === 'slider') {
    return (
      <label className="flex min-w-48 flex-col gap-1 text-sm font-semibold text-slate-700">
        {control.label}: {String(current)}
        <input
          type="range"
          min={control.min}
          max={control.max}
          step={control.step || 1}
          value={Number(current)}
          onChange={event => onChange(Number(event.target.value))}
          aria-label={control.label}
        />
      </label>
    )
  }
  if (control.type === 'reset') return null
  return (
    <label className="flex min-w-40 flex-col gap-1 text-sm font-semibold text-slate-700">
      {control.label}
      <input
        type={control.type === 'numeric_input' ? 'number' : 'text'}
        min={control.min}
        max={control.max}
        step={control.step}
        value={String(current)}
        onChange={event => onChange(control.type === 'numeric_input' ? Number(event.target.value) : event.target.value)}
        className="rounded-lg border border-slate-300 bg-white px-2 py-1"
        aria-label={control.label}
      />
    </label>
  )
}

function SemanticAlternative({ snapshot, manifest }) {
  const rows = Array.isArray(snapshot?.derivedState?.rows) ? snapshot.derivedState.rows : []
  const alternative = manifest.accessibility.textAlternative || renderTextAlternative(snapshot.renderModel)
  return (
    <details className="mt-3 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
      <summary className="cursor-pointer font-semibold">Mô tả bằng chữ và bàn phím</summary>
      <p className="mt-2">{alternative}</p>
      {rows.length > 0 && (
        <table className="mt-2 w-full border-collapse text-left">
          <caption className="sr-only">{alternative}</caption>
          <thead><tr>{Object.keys(rows[0]).map(key => <th key={key} className="border-b px-2 py-1">{key}</th>)}</tr></thead>
          <tbody>{rows.map((row, index) => <tr key={index}>{Object.keys(rows[0]).map(key => <td key={key} className="border-b px-2 py-1">{String(row[key])}</td>)}</tr>)}</tbody>
        </table>
      )}
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

  if (error) return <div role="alert" className="flex h-full items-center justify-center p-6 text-sm font-semibold text-red-600">{error}</div>
  if (!manifest || !snapshot) return <div className="flex h-full items-center justify-center p-6 text-sm text-slate-500">Đang tải sandbox…</div>

  const svg = renderSceneSvg(snapshot.renderModel)
  const state = snapshot.state || {}
  const steps = manifest.solutionGraph?.steps || []
  return (
    <section className="flex h-full flex-col gap-3 overflow-y-auto bg-slate-50 p-4" aria-label={manifest.accessibility.textAlternative}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-indigo-600">Math Sandbox</p>
          <h2 className="text-lg font-extrabold text-slate-900">{manifest.archetypeId}</h2>
        </div>
        <button type="button" onClick={() => dispatch({ type: 'reset' })} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700">Đặt lại</button>
      </div>

      <div className="flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-white p-3">
        {manifest.controls.map(control => (
          <Control key={control.id} control={control} value={state[control.id]} onChange={value => dispatch({ type: 'set_control', controlId: control.id, value: jsonValue(value) })} />
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-2" dangerouslySetInnerHTML={{ __html: svg }} />
      <SemanticAlternative snapshot={snapshot} manifest={manifest} />

      <div className="grid gap-2 sm:grid-cols-2">
        {snapshot.goals.map(goal => <div key={goal.id} className={`rounded-xl border p-3 text-sm ${goal.reached ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-600'}`}><span className="font-bold">{goal.reached ? 'Đạt' : 'Đang làm'}</span> · {goal.id}</div>)}
      </div>

      {snapshot.feedback.length > 0 && <div className="rounded-xl bg-indigo-50 p-3 text-sm text-indigo-900">{snapshot.feedback.map(item => <p key={item.id}>{item.message}</p>)}</div>}
      {hint && <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{hint}</div>}
      {steps.length > 0 && <div className="flex flex-wrap gap-2">{steps.map(step => <button key={step.id} type="button" onClick={() => { setHint(step.hint || 'Hãy kiểm tra điều kiện của bước này.'); dispatch({ type: 'show_hint', hintId: step.id }) }} className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-800">Gợi ý: {step.id}</button>)}</div>}
    </section>
  )
}
