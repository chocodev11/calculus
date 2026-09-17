import { useEffect, useRef, useState } from 'react'
import * as ReactKatexModule from 'react-katex'
import 'katex/dist/katex.min.css'
import soundFX from '../../lib/soundEffects'

const ReactKatex = ReactKatexModule.default || ReactKatexModule
const { InlineMath } = ReactKatex

const TOPICS = [
  {
    id: 'trig',
    label: 'Lượng giác',
    title: 'Đường tròn lượng giác',
    subtitle: 'Kéo điểm trên đường tròn để quan sát biến thiên của sin và cos',
  },
  {
    id: 'tangent',
    label: 'Đạo hàm',
    title: 'Ý nghĩa hình học của đạo hàm',
    subtitle: 'Thu hẹp Δx để quan sát cát tuyến xoay dần thành tiếp tuyến',
  },
  {
    id: 'logic',
    label: 'Logic',
    title: 'Mệnh đề kéo theo P ⇒ Q',
    subtitle: 'Bật tắt giả thiết và kết luận để kiểm tra bảng chân trị',
  },
]

export default function LandingMathStage() {
  const [activeTopic, setActiveTopic] = useState('trig')
  const currentTopic = TOPICS.find((t) => t.id === activeTopic) || TOPICS[0]

  const chooseTopic = (topicId) => {
    if (topicId === activeTopic) return
    setActiveTopic(topicId)
    soundFX.play('select')
  }

  return (
    <div className="w-full max-w-[580px] rounded-2xl border border-slate-200 bg-white p-5">
      {/* Header tối giản: Tiêu đề + Tab chuyển đổi */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="min-h-[38px] flex flex-col justify-center">
          <h3 className="text-sm font-bold text-slate-900 leading-tight">
            {currentTopic.title}
          </h3>
          <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">
            {currentTopic.subtitle}
          </p>
        </div>

        {/* Tab pills tối giản không gây giật */}
        <div className="flex shrink-0 gap-1 rounded-lg bg-slate-100 p-1" role="tablist" aria-label="Chủ đề toán học">
          {TOPICS.map((topic) => {
            const isActive = activeTopic === topic.id
            return (
              <button
                key={topic.id}
                role="tab"
                type="button"
                aria-selected={isActive}
                onClick={() => chooseTopic(topic.id)}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-400 ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {topic.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Vùng nội dung có chiều cao cố định để triệt tiêu hoàn toàn Layout Shift */}
      <div className="pt-4">
        {activeTopic === 'trig' && <TrigCircleLab />}
        {activeTopic === 'tangent' && <TangentConvergenceLab />}
        {activeTopic === 'logic' && <LogicGateLab />}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   1. TAB LƯỢNG GIÁC (Tối giản, kích thước cố định, trực quan)
   ───────────────────────────────────────────────────────────────────────────── */
function TrigCircleLab() {
  const [angleDeg, setAngleDeg] = useState(45)
  const [isDragging, setIsDragging] = useState(false)
  const svgRef = useRef(null)

  const angleRad = (angleDeg * Math.PI) / 180
  const cosVal = Math.cos(angleRad)
  const sinVal = Math.sin(angleRad)

  // Tọa độ tâm và bán kính
  const cx = 180
  const cy = 110
  const radius = 90

  const px = cx + radius * cosVal
  const py = cy - radius * sinVal

  // Cung góc α ở tâm
  const arcR = 24
  const arcEndX = cx + arcR * Math.cos(angleRad)
  const arcEndY = cy - arcR * Math.sin(angleRad)
  const largeArcFlag = angleDeg > 180 ? 1 : 0
  const arcPath =
    angleDeg > 0 && angleDeg < 360
      ? `M ${cx + arcR} ${cy} A ${arcR} ${arcR} 0 ${largeArcFlag} 0 ${arcEndX} ${arcEndY}`
      : ''

  const updateAngleFromPointer = (e) => {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const scaleX = 360 / rect.width
    const scaleY = 220 / rect.height
    const clientX = e.clientX ?? e.touches?.[0]?.clientX
    const clientY = e.clientY ?? e.touches?.[0]?.clientY
    if (clientX == null || clientY == null) return

    const mouseX = (clientX - rect.left) * scaleX
    const mouseY = (clientY - rect.top) * scaleY

    const dx = mouseX - cx
    const dy = mouseY - cy
    const rad = Math.atan2(-dy, dx)
    const deg = Math.round((((rad * 180) / Math.PI) % 360 + 360) % 360)
    setAngleDeg(deg)
  }

  const handlePointerDown = (e) => {
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch (_) {}
    setIsDragging(true)
    updateAngleFromPointer(e)
    soundFX.play('tap')
  }

  const handlePointerMove = (e) => {
    if (!isDragging) return
    updateAngleFromPointer(e)
  }

  const handlePointerUp = (e) => {
    if (isDragging) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch (_) {}
      setIsDragging(false)
    }
  }

  const cosLabelY = sinVal >= 0 ? cy + 16 : cy - 8
  const sinLabelX = cosVal >= 0 ? px + 8 : px - 8
  const sinTextAnchor = cosVal >= 0 ? 'start' : 'end'

  return (
    <div className="space-y-3">
      {/* Khung vẽ SVG chuẩn 220px */}
      <div
        className="relative h-[220px] w-full rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-center overflow-hidden touch-none select-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <svg
          ref={svgRef}
          viewBox="0 0 360 220"
          className={`h-full w-full ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          aria-label="Đường tròn lượng giác"
        >
          {/* Trục tọa độ */}
          <line x1="20" y1={cy} x2="340" y2={cy} stroke="#E2E8F0" strokeWidth="1" />
          <line x1={cx} y1="12" x2={cx} y2="208" stroke="#E2E8F0" strokeWidth="1" />
          <text x="345" y={cy + 4} fill="#94A3B8" fontSize="10" fontWeight="600">x</text>
          <text x={cx + 5} y="18" fill="#94A3B8" fontSize="10" fontWeight="600">y</text>
          <text x={cx - 10} y={cy + 12} fill="#94A3B8" fontSize="9">O</text>

          {/* Đường tròn đơn vị */}
          <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#CBD5E1" strokeWidth="1.2" strokeDasharray="3 3" />

          {/* Cung góc α */}
          {arcPath && <path d={arcPath} fill="none" stroke="#6366F1" strokeWidth="1.8" />}

          {/* Bán kính OP */}
          <line x1={cx} y1={cy} x2={px} y2={py} stroke="#94A3B8" strokeWidth="1" strokeDasharray="3 3" />

          {/* Đoạn cos α (ngang - Indigo) */}
          <line x1={cx} y1={cy} x2={px} y2={cy} stroke="#4F46E5" strokeWidth="3" strokeLinecap="round" />

          {/* Đoạn sin α (dọc - Cyan) */}
          <line x1={px} y1={cy} x2={px} y2={py} stroke="#0284C7" strokeWidth="3" strokeLinecap="round" />

          {/* Nhãn cos α sát đoạn ngang */}
          {Math.abs(cosVal) > 0.15 && (
            <text
              x={(cx + px) / 2}
              y={cosLabelY}
              fill="#4F46E5"
              fontSize="10.5"
              fontWeight="700"
              textAnchor="middle"
              className="tabular-nums"
            >
              cos = {cosVal.toFixed(2)}
            </text>
          )}

          {/* Nhãn sin α sát đoạn đứng */}
          {Math.abs(sinVal) > 0.15 && (
            <text
              x={sinLabelX}
              y={(cy + py) / 2}
              fill="#0284C7"
              fontSize="10.5"
              fontWeight="700"
              dominantBaseline="central"
              textAnchor={sinTextAnchor}
              className="tabular-nums"
            >
              sin = {sinVal.toFixed(2)}
            </text>
          )}

          {/* Điểm kéo P */}
          <g>
            <circle cx={px} cy={py} r="12" fill="#4F46E5" fillOpacity="0.12" className="pointer-events-none" />
            <circle cx={px} cy={py} r="7" fill="#FFFFFF" stroke="#4F46E5" strokeWidth="2.5" />
            <circle cx={px} cy={py} r="3" fill="#4F46E5" />
          </g>
        </svg>

        {/* Huy hiệu hiển thị góc nhỏ gọn */}
        <div className="absolute right-2.5 top-2.5 rounded-md border border-slate-200/80 bg-white/95 px-2 py-0.5 text-[11px] font-bold tabular-nums text-slate-700 shadow-xs pointer-events-none">
          α = {angleDeg}°
        </div>
      </div>

      {/* Thanh điều khiển góc chuẩn 44px */}
      <div className="flex h-[44px] items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1">
          <span className="text-xs font-medium text-slate-500 shrink-0">Góc:</span>
          <input
            type="range"
            min="0"
            max="360"
            step="1"
            value={angleDeg}
            onChange={(e) => setAngleDeg(Number(e.target.value))}
            aria-label="Điều chỉnh góc alpha"
            className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-indigo-600"
          />
        </div>

        <div className="flex shrink-0 gap-1">
          {[0, 90, 180, 270].map((deg) => (
            <button
              key={deg}
              type="button"
              onClick={() => {
                setAngleDeg(deg)
                soundFX.play('tap')
              }}
              className={`rounded px-2 py-1 text-[11px] font-semibold transition-colors ${
                angleDeg === deg
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {deg}°
            </button>
          ))}
        </div>
      </div>

      {/* Dòng tóm tắt ngắn gọn chuẩn 26px */}
      <div className="flex h-[26px] items-center justify-between text-xs text-slate-600 font-medium px-1">
        <span>
          Tọa độ điểm: <span className="font-mono text-slate-900 font-semibold">P({cosVal.toFixed(2)}, {sinVal.toFixed(2)})</span>
        </span>
        <span className="text-slate-400 text-[11px]">
          {angleDeg === 90 && 'sin đạt cực đại (1.00)'}
          {angleDeg === 270 && 'sin đạt cực tiểu (-1.00)'}
          {(angleDeg === 0 || angleDeg === 360) && 'cos đạt cực đại (1.00)'}
          {angleDeg === 180 && 'cos đạt cực tiểu (-1.00)'}
          {angleDeg > 0 && angleDeg < 90 && 'Góc nhọn: cos > 0, sin > 0'}
          {angleDeg > 90 && angleDeg < 180 && 'Góc tù: cos < 0, sin > 0'}
          {angleDeg > 180 && angleDeg < 270 && 'Góc phần tư III: cos < 0, sin < 0'}
          {angleDeg > 270 && angleDeg < 360 && 'Góc phần tư IV: cos > 0, sin < 0'}
        </span>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   2. TAB ĐẠO HÀM (Tối giản, kích thước cố định, trực quan)
   ───────────────────────────────────────────────────────────────────────────── */
export function TangentConvergenceLab() {
  const [deltaX, setDeltaX] = useState(1.1)
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const width = canvas.width
    const height = canvas.height

    const toCanvasX = (x) => (x + 1.2) * (width / 5.2)
    const toCanvasY = (y) => height - (y + 0.3) * (height / 5.6)

    // Đồ thị Parabol f(x) = 0.45 x^2 + 0.8
    const f = (x) => 0.45 * x * x + 0.8
    const x0 = 1
    const y0 = f(x0) // 1.25
    const slopeTangent = 0.90 // f'(1)

    const x1 = x0 + deltaX
    const y1 = f(x1)
    const slopeSecant = (y1 - y0) / (x1 - x0)

    ctx.clearRect(0, 0, width, height)

    // Trục mờ
    ctx.strokeStyle = '#F1F5F9'
    ctx.lineWidth = 1
    for (let x = -1; x <= 4; x += 1) {
      ctx.beginPath()
      ctx.moveTo(toCanvasX(x), 0)
      ctx.lineTo(toCanvasX(x), height)
      ctx.stroke()
    }

    // Đường cong Parabol
    ctx.beginPath()
    ctx.strokeStyle = '#4F46E5'
    ctx.lineWidth = 2
    for (let index = 0; index <= width; index += 2) {
      const x = -1.2 + (index / width) * 5.2
      const y = f(x)
      const cx = toCanvasX(x)
      const cy = toCanvasY(y)
      if (index === 0) ctx.moveTo(cx, cy)
      else ctx.lineTo(cx, cy)
    }
    ctx.stroke()

    // Tiếp tuyến cố định (xanh lá nét đứt)
    ctx.beginPath()
    ctx.strokeStyle = '#059669'
    ctx.lineWidth = 1.5
    ctx.setLineDash([4, 3])
    const tXStart = -0.8
    const tXEnd = 3.6
    ctx.moveTo(toCanvasX(tXStart), toCanvasY(y0 + slopeTangent * (tXStart - x0)))
    ctx.lineTo(toCanvasX(tXEnd), toCanvasY(y0 + slopeTangent * (tXEnd - x0)))
    ctx.stroke()
    ctx.setLineDash([])

    // Cát tuyến động
    const isClose = deltaX <= 0.1
    ctx.beginPath()
    ctx.strokeStyle = isClose ? '#059669' : '#0284C7'
    ctx.lineWidth = isClose ? 2.5 : 1.8
    ctx.moveTo(toCanvasX(tXStart), toCanvasY(y0 + slopeSecant * (tXStart - x0)))
    ctx.lineTo(toCanvasX(tXEnd), toCanvasY(y0 + slopeSecant * (tXEnd - x0)))
    ctx.stroke()

    // Điểm cố định A
    drawPoint(ctx, toCanvasX(x0), toCanvasY(y0), '#4F46E5', 5)

    // Điểm động B
    drawPoint(ctx, toCanvasX(x1), toCanvasY(y1), isClose ? '#059669' : '#0284C7', 5)
  }, [deltaX])

  const slopeSecant = (0.45 * (1 + deltaX) ** 2 + 0.8 - 1.25) / deltaX
  const isClose = deltaX <= 0.1

  return (
    <div className="space-y-3">
      {/* Vùng đồ thị chuẩn 220px */}
      <div className="relative h-[220px] w-full rounded-xl border border-slate-100 bg-slate-50/50 p-2 overflow-hidden flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width="460"
          height="204"
          className="block h-full w-full object-contain"
          aria-label="Đồ thị cát tuyến và tiếp tuyến"
        />

        {/* Chú giải đường thẳng tối giản */}
        <div className="absolute left-2.5 top-2.5 flex items-center gap-2 text-[10px] font-semibold text-slate-600">
          <span className="flex items-center gap-1">
            <span className="h-0.5 w-3 border-t border-dashed border-emerald-600" />
            Tiếp tuyến
          </span>
          <span className="flex items-center gap-1">
            <span className="h-0.5 w-3 bg-sky-600" />
            Cát tuyến
          </span>
        </div>

        {isClose && (
          <span className="absolute right-2.5 top-2.5 rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
            Trùng khít tiếp tuyến
          </span>
        )}
      </div>

      {/* Điều khiển thu hẹp Δx chuẩn 44px */}
      <div className="flex h-[44px] items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1">
          <span className="text-xs font-medium text-slate-500 shrink-0">Khoảng cách Δx:</span>
          <input
            type="range"
            min="0.02"
            max="1.5"
            step="0.02"
            value={deltaX}
            onChange={(e) => {
              setDeltaX(Number(e.target.value))
              soundFX.play('tap')
            }}
            aria-label="Thu hẹp delta x"
            className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-indigo-600"
          />
        </div>

        <div className="flex shrink-0 gap-1">
          {[1.0, 0.5, 0.05].map((val) => (
            <button
              key={val}
              type="button"
              onClick={() => {
                setDeltaX(val)
                soundFX.play('tap')
              }}
              className={`rounded px-2 py-1 text-[11px] font-semibold transition-colors ${
                deltaX === val
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {val === 0.05 ? '→ 0' : val}
            </button>
          ))}
        </div>
      </div>

      {/* So sánh giá trị chuẩn 26px */}
      <div className="flex h-[26px] items-center justify-between text-xs text-slate-600 font-medium px-1">
        <span>
          Độ dốc cát tuyến: <span className="font-mono font-semibold text-sky-600">{slopeSecant.toFixed(3)}</span>
        </span>
        <span>
          Đạo hàm f'(1) = <span className="font-mono font-semibold text-emerald-700">0.900</span>
        </span>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   3. TAB LOGIC: Bảng chân trị tương tác (Tối giản, kích thước đồng nhất 220px)
   ───────────────────────────────────────────────────────────────────────────── */
function LogicGateLab() {
  const [p, setP] = useState(true)
  const [q, setQ] = useState(false)
  const implication = !p || q

  const toggle = (setter) => {
    setter((value) => !value)
    soundFX.play('tap')
  }

  // Bảng chân trị 4 trường hợp
  const rows = [
    { pVal: true, qVal: true, res: true },
    { pVal: true, qVal: false, res: false }, // Phản ví dụ duy nhất
    { pVal: false, qVal: true, res: true },
    { pVal: false, qVal: false, res: true },
  ]

  return (
    <div className="space-y-3">
      {/* Vùng tương tác & Bảng chân trị đồng nhất 220px */}
      <div className="h-[220px] w-full rounded-xl border border-slate-100 bg-slate-50/50 p-3 flex flex-col justify-between">
        {/* Kết quả hiện tại */}
        <div className="flex items-center justify-between rounded-lg bg-white p-2.5 border border-slate-200/80">
          <span className="text-xs font-semibold text-slate-700">
            Mệnh đề <InlineMath math="P \implies Q" />:
          </span>
          <span
            className={`rounded px-2 py-0.5 text-xs font-bold ${
              implication
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}
          >
            {implication ? 'ĐÚNG' : 'SAI (Phản ví dụ)'}
          </span>
        </div>

        {/* Bảng chân trị chuẩn Toán THPT: Ký hiệu KaTeX, căn giữa đều, phông Sans đồng bộ */}
        <div className="rounded-lg border border-slate-200/80 bg-white overflow-hidden text-xs">
          <div className="grid grid-cols-3 bg-slate-100/90 py-1.5 font-bold text-slate-700 text-xs text-center border-b border-slate-200/60">
            <span><InlineMath math="P" /></span>
            <span><InlineMath math="Q" /></span>
            <span><InlineMath math="P \implies Q" /></span>
          </div>
          <div className="divide-y divide-slate-100">
            {rows.map((r, i) => {
              const isCurrent = r.pVal === p && r.qVal === q
              return (
                <div
                  key={i}
                  className={`grid grid-cols-3 py-1.5 text-xs text-center transition-colors ${
                    isCurrent
                      ? r.res
                        ? 'bg-emerald-50/90 font-extrabold text-emerald-900'
                        : 'bg-rose-50/90 font-extrabold text-rose-900'
                      : 'text-slate-600 font-semibold'
                  }`}
                >
                  <span>{r.pVal ? 'Đ' : 'S'}</span>
                  <span>{r.qVal ? 'Đ' : 'S'}</span>
                  <span className={r.res ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold'}>
                    {r.res ? 'Đ' : 'S'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Bộ nút chuyển P & Q chuẩn 44px */}
      <div className="grid grid-cols-2 gap-2 h-[44px]">
        <button
          type="button"
          onClick={() => toggle(setP)}
          className={`flex items-center justify-between rounded-lg border px-3 text-xs font-semibold transition-colors ${
            p
              ? 'border-indigo-300 bg-white text-slate-900 shadow-xs'
              : 'border-slate-200 bg-slate-100 text-slate-500'
          }`}
        >
          <span>P: {p ? 'Đúng' : 'Sai'}</span>
          <span className={`h-2 w-2 rounded-full ${p ? 'bg-indigo-600' : 'bg-slate-300'}`} />
        </button>

        <button
          type="button"
          onClick={() => toggle(setQ)}
          className={`flex items-center justify-between rounded-lg border px-3 text-xs font-semibold transition-colors ${
            q
              ? 'border-indigo-300 bg-white text-slate-900 shadow-xs'
              : 'border-slate-200 bg-slate-100 text-slate-500'
          }`}
        >
          <span>Q: {q ? 'Đúng' : 'Sai'}</span>
          <span className={`h-2 w-2 rounded-full ${q ? 'bg-indigo-600' : 'bg-slate-300'}`} />
        </button>
      </div>

      {/* Nhận xét ngắn gọn chuẩn 26px */}
      <div className="flex h-[26px] items-center text-xs text-slate-500 px-1">
        {p && !q ? (
          <span className="text-rose-600 font-medium">
            Phản ví dụ: Giả thiết đúng nhưng kết luận sai khiến lời hứa bị phá vỡ.
          </span>
        ) : !p ? (
          <span>Khi tiền đề P sai, mệnh đề kéo theo luôn đúng (chân lý chân không).</span>
        ) : (
          <span>Cả giả thiết và kết luận đều đúng: mệnh đề kéo theo đúng.</span>
        )}
      </div>
    </div>
  )
}

function drawPoint(ctx, x, y, color, radius = 4) {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.fill()
}
