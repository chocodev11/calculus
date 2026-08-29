import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import * as ReactKatexModule from 'react-katex'
import 'katex/dist/katex.min.css'
import { ArrowUpRight } from 'lucide-react'
import soundFX from '../../lib/soundEffects'

const ReactKatex = ReactKatexModule.default || ReactKatexModule
const { InlineMath } = ReactKatex

const TOPICS = [
  { id: 'logic', label: 'Logic' },
  { id: 'trig', label: 'Lượng giác' },
  { id: 'tangent', label: 'Đạo hàm' },
]

export default function LandingMathStage() {
  const [activeTopic, setActiveTopic] = useState('logic')

  const chooseTopic = (topic) => {
    if (topic === activeTopic) return
    setActiveTopic(topic)
    soundFX.play('select')
  }

  return (
    <div className="w-full max-w-[620px] rounded-3xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-extrabold text-slate-900">Chọn một ý tưởng để thử</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">Mỗi thao tác thay đổi ngay kết quả.</p>
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Chủ đề mô phỏng">
            {TOPICS.map((topic) => {
              const isActive = activeTopic === topic.id
              const topicClassName = isActive
                ? 'border-indigo-600 bg-indigo-600 text-white'
                : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-900'
              return (
                <button
                  key={topic.id}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => chooseTopic(topic.id)}
                  className={`rounded-xl border px-3 py-2 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-2 ${topicClassName}`}
                >
                  {topic.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="min-h-[320px]">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeTopic}
              id={`landing-panel-${activeTopic}`}
              role="region"
              aria-live="polite"
              aria-label={`${TOPICS.find(topic => topic.id === activeTopic)?.label || 'Chủ đề'} đang được hiển thị`}
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -18 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              {activeTopic === 'logic' && <LogicGateLab />}
              {activeTopic === 'trig' && <TrigCircleLab />}
              {activeTopic === 'tangent' && <TangentConvergenceLab />}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-3 text-xs">
          <span className="text-slate-400">Thử nghiệm theo nhịp của riêng bạn</span>
          <a href="#try" className="inline-flex items-center gap-1 font-bold text-indigo-600 hover:text-indigo-700">
            Xem bài thử
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </div>
      </div>
    </div>
  )
}

function LogicGateLab() {
  const [p, setP] = useState(true)
  const [q, setQ] = useState(true)
  const implication = !p || q

  const toggle = (setter) => {
    setter(value => !value)
    soundFX.play('tap')
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-slate-50 p-4">
        <div className="flex items-center justify-between gap-3 text-sm font-semibold text-slate-700">
          <span>Mệnh đề kéo theo: <InlineMath math="P \implies Q" /></span>
          <span className={`rounded-lg px-2 py-1 text-[11px] font-extrabold ${
            implication ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
          }`}>
            {implication ? 'Đúng' : 'Sai'}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <LogicSwitch label="Giả thiết P" value={p} onClick={() => toggle(setP)} />
          <LogicSwitch label="Kết luận Q" value={q} onClick={() => toggle(setQ)} />
        </div>
      </div>

      <div className={`rounded-xl px-4 py-3 text-sm leading-relaxed ${
        implication ? 'bg-emerald-50 text-emerald-900' : 'bg-rose-50 text-rose-900'
      }`}>
        {p && !q ? (
          <p><strong>Phản ví dụ:</strong> <InlineMath math="P" /> đúng nhưng <InlineMath math="Q" /> sai, nên mệnh đề kéo theo sai.</p>
        ) : !p ? (
          <p><strong>Quan sát:</strong> khi <InlineMath math="P" /> sai, <InlineMath math="P \implies Q" /> vẫn đúng.</p>
        ) : (
          <p><strong>Quan sát:</strong> giả thiết và kết luận cùng đúng, nên mệnh đề kéo theo đúng.</p>
        )}
      </div>
    </div>
  )
}

function LogicSwitch({ label, value, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-2 ${value ? 'border-indigo-300 bg-white text-slate-900' : 'border-slate-200 bg-slate-100 text-slate-500'}`}
    >
      <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">{label}</span>
      <span className="mt-2 flex items-center justify-between text-sm font-extrabold">
        {value ? 'Đúng' : 'Sai'}
        <span className={`h-2.5 w-2.5 rounded-full ${value ? 'bg-indigo-600' : 'bg-slate-300'}`} aria-hidden="true" />
      </span>
    </button>
  )
}

function TrigCircleLab() {
  const [angleDeg, setAngleDeg] = useState(45)
  const canvasRef = useRef(null)
  const angleRad = (angleDeg * Math.PI) / 180
  const cosVal = Math.cos(angleRad)
  const sinVal = Math.sin(angleRad)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const width = canvas.width
    const height = canvas.height
    const cx = width / 2
    const cy = height / 2
    const radius = 76

    ctx.clearRect(0, 0, width, height)
    ctx.strokeStyle = '#CBD5E1'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(12, cy)
    ctx.lineTo(width - 12, cy)
    ctx.moveTo(cx, 12)
    ctx.lineTo(cx, height - 12)
    ctx.stroke()

    ctx.strokeStyle = '#94A3B8'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    ctx.stroke()

    const px = cx + radius * cosVal
    const py = cy - radius * sinVal

    ctx.strokeStyle = '#4F46E5'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(px, cy)
    ctx.stroke()

    ctx.strokeStyle = '#10B981'
    ctx.beginPath()
    ctx.moveTo(px, cy)
    ctx.lineTo(px, py)
    ctx.stroke()

    ctx.strokeStyle = '#334155'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(px, py)
    ctx.stroke()

    ctx.fillStyle = '#4F46E5'
    ctx.beginPath()
    ctx.arc(px, py, 5, 0, Math.PI * 2)
    ctx.fill()
  }, [angleDeg, cosVal, sinVal])

  const updateAngle = (nextAngle) => {
    setAngleDeg(nextAngle)
    soundFX.play('tap')
  }

  return (
    <div className="space-y-4">
      <div className="relative flex items-center justify-center rounded-2xl bg-slate-50 p-2">
        <canvas
          ref={canvasRef}
          width="300"
          height="190"
          className="block h-auto max-w-full"
          aria-label="Đường tròn lượng giác với góc alpha"
        />
        <div className="absolute right-3 top-3 space-y-1 text-right text-[11px] font-bold tabular-nums">
          <span className="block rounded-lg bg-indigo-50 px-2 py-1 text-indigo-700">cos α = {cosVal.toFixed(2)}</span>
          <span className="block rounded-lg bg-emerald-50 px-2 py-1 text-emerald-700">sin α = {sinVal.toFixed(2)}</span>
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-4 text-sm font-semibold text-slate-700">
          <span>Góc α</span>
          <span className="font-extrabold tabular-nums text-slate-900">{angleDeg}°</span>
        </div>
        <input
          type="range"
          min="0"
          max="360"
          step="5"
          value={angleDeg}
          onChange={(event) => updateAngle(Number(event.target.value))}
          aria-label="Điều chỉnh góc alpha"
          className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-indigo-600"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {[30, 45, 60, 90, 180, 270].map((degree) => (
          <button
            key={degree}
            type="button"
            onClick={() => updateAngle(degree)}
            className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
          >
            {degree}°
          </button>
        ))}
      </div>
    </div>
  )
}

export function TangentConvergenceLab() {
  const [deltaX, setDeltaX] = useState(1.4)
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const width = canvas.width
    const height = canvas.height
    const toCanvasX = (x) => (x + 1.5) * (width / 5.5)
    const toCanvasY = (y) => height - (y + 0.5) * (height / 6)
    const f = (x) => 0.45 * x * x + 0.8
    const x0 = 1
    const y0 = f(x0)
    const x1 = x0 + deltaX
    const y1 = f(x1)
    const slope = (y1 - y0) / (x1 - x0)

    ctx.clearRect(0, 0, width, height)
    ctx.strokeStyle = '#E2E8F0'
    ctx.lineWidth = 1
    for (let x = -1; x <= 4; x += 1) {
      ctx.beginPath()
      ctx.moveTo(toCanvasX(x), 0)
      ctx.lineTo(toCanvasX(x), height)
      ctx.stroke()
    }

    ctx.beginPath()
    ctx.strokeStyle = '#4F46E5'
    ctx.lineWidth = 2.5
    for (let index = 0; index <= width; index += 2) {
      const x = -1.5 + (index / width) * 5.5
      const y = f(x)
      const canvasX = toCanvasX(x)
      const canvasY = toCanvasY(y)
      if (index === 0) ctx.moveTo(canvasX, canvasY)
      else ctx.lineTo(canvasX, canvasY)
    }
    ctx.stroke()

    ctx.beginPath()
    ctx.strokeStyle = deltaX < 0.2 ? '#10B981' : '#0284C7'
    ctx.lineWidth = 2
    ctx.setLineDash(deltaX < 0.2 ? [] : [5, 5])
    const lineXStart = -1
    const lineXEnd = 3.5
    ctx.moveTo(toCanvasX(lineXStart), toCanvasY(y0 + slope * (lineXStart - x0)))
    ctx.lineTo(toCanvasX(lineXEnd), toCanvasY(y0 + slope * (lineXEnd - x0)))
    ctx.stroke()
    ctx.setLineDash([])

    drawPoint(ctx, toCanvasX(x0), toCanvasY(y0), '#4F46E5')
    drawPoint(ctx, toCanvasX(x1), toCanvasY(y1), deltaX < 0.2 ? '#10B981' : '#0284C7')
  }, [deltaX])

  const slopeValue = (0.45 * (1 + deltaX) ** 2 + 0.8 - (0.45 * 1 + 0.8)) / deltaX
  const updateDelta = (nextDelta) => {
    setDeltaX(nextDelta)
    soundFX.play('tap')
  }

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl bg-slate-50">
        <canvas
          ref={canvasRef}
          width="480"
          height="220"
          className="block h-auto w-full"
          aria-label="Đồ thị parabol và cát tuyến tiến gần tiếp tuyến"
        />
        {deltaX < 0.2 && (
          <span className="absolute right-3 top-3 rounded-lg bg-emerald-100 px-2 py-1 text-[11px] font-extrabold text-emerald-800">
            Đã gần tiếp tuyến
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-4 text-sm">
        <div>
          <span className="block text-xs font-semibold text-slate-400">Độ dốc cát tuyến</span>
          <span className="font-extrabold tabular-nums text-slate-900">m = {slopeValue.toFixed(3)}</span>
        </div>
        <div className="text-right">
          <span className="block text-xs font-semibold text-slate-400">Đạo hàm tại x = 1</span>
          <span className="font-extrabold tabular-nums text-emerald-600">f'(1) = 0.90</span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-4 text-sm font-semibold text-slate-700">
          <span>Thu hẹp Δx → 0</span>
          <span className="font-extrabold tabular-nums text-slate-900">Δx = {deltaX.toFixed(2)}</span>
        </div>
        <input
          type="range"
          min="0.05"
          max="2"
          step="0.02"
          value={deltaX}
          onChange={(event) => updateDelta(Number(event.target.value))}
          aria-label="Thu hẹp delta x về 0"
          className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-indigo-600"
        />
      </div>
    </div>
  )
}

function drawPoint(ctx, x, y, color) {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(x, y, 5, 0, Math.PI * 2)
  ctx.fill()
}
