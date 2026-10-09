import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import soundFX from '../../lib/soundEffects'
import { Caption, INK, NumberField, Stage, formatNumber, sliderKeys, useSvgDrag } from './SandboxKit'

const SPECIAL_ANGLES = [0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330, 360]
const toRadians = degrees => degrees * Math.PI / 180

/* ───────────────────────────── Đường tròn lượng giác ───────────────────────────── */

export function UnitCircleLab({ manifest, snapshot, dispatch }) {
  const config = manifest.config
  const d = snapshot.derivedState
  const degrees = Number(d.degrees)
  const targetGoal = manifest.goals.find(goal => goal.evidence === 'unit_circle_value' && typeof goal.target === 'number')
  const target = targetGoal ? targetGoal.target : null
  const reached = Boolean(targetGoal && snapshot.goals.find(goal => goal.id === targetGoal.id)?.reached)
  const lastSnap = useRef(null)

  const setAngle = (angle, transient) => {
    const value = config.unit === 'radian' ? toRadians(angle) : angle
    dispatch({ type: 'manipulate', key: 'degrees', value, transient })
  }

  // Special angles pull the point like a magnet, with a tick, so exact values are easy to land on.
  const snapAngle = raw => {
    const special = SPECIAL_ANGLES.find(angle => Math.abs(angle - raw) <= 4)
    if (special === undefined) {
      lastSnap.current = null
      return Math.round(raw)
    }
    if (lastSnap.current !== special) soundFX.play('math-snap')
    lastSnap.current = special
    return special % 360
  }

  const cx = 96
  const cy = 122
  const r = 80
  const angleAt = point => (Math.atan2(cy - point.y, point.x - cx) * 180 / Math.PI + 360) % 360
  const drag = useSvgDrag({
    width: 360,
    height: 244,
    onMove: point => setAngle(snapAngle(angleAt(point)), true),
    onEnd: point => setAngle(snapAngle(angleAt(point)), false),
  })

  const rad = toRadians(degrees)
  const px = cx + r * Math.cos(rad)
  const py = cy - r * Math.sin(rad)
  const graphX = angle => 196 + angle / 360 * 150
  const wave = Array.from({ length: 73 }, (_, i) => `${i ? 'L' : 'M'}${graphX(i * 5).toFixed(1)} ${(cy - r * Math.sin(toRadians(i * 5))).toFixed(1)}`).join(' ')
  const traced = [...Array.from({ length: Math.floor(degrees / 5) + 1 }, (_, i) => i * 5), degrees]
  const arc = degrees > 0 ? `M${cx + 24} ${cy} A24 24 0 ${degrees > 180 ? 1 : 0} 0 ${cx + 24 * Math.cos(rad)} ${cy - 24 * Math.sin(rad)}` : ''

  return (
    <div className="space-y-5">
      {target !== null && (
        <p className="text-center text-xl font-extrabold text-slate-900">
          Quay điểm tới góc <span className="inline-block rounded-xl bg-slate-900 px-3 py-0.5 text-white">{target}°</span> rồi đọc sin, cos
        </p>
      )}
      <Stage label="Đường tròn lượng giác nối với đồ thị sin">
        <svg ref={drag.ref} viewBox="0 0 360 244" className="block w-full touch-none select-none" role="img" aria-label={`Góc ${degrees.toFixed(0)} độ, sin ${formatNumber(d.sin)}, cos ${formatNumber(d.cos)}`} {...drag.bind}>
          <line x1={cx - r - 10} x2={cx + r + 10} y1={cy} y2={cy} stroke={INK.line} strokeWidth="1.5" />
          <line x1={cx} x2={cx} y1={cy - r - 10} y2={cy + r + 10} stroke={INK.line} strokeWidth="1.5" />
          <circle cx={cx} cy={cy} r={r} fill="white" stroke={INK.line} strokeWidth="2" />
          {target !== null && (
            <line x1={cx} y1={cy} x2={cx + (r + 8) * Math.cos(toRadians(target))} y2={cy - (r + 8) * Math.sin(toRadians(target))} stroke={reached ? INK.emerald : INK.muted} strokeWidth="2" strokeDasharray="5 5" />
          )}
          <path d={arc} fill="none" stroke={INK.ink} strokeWidth="2" />
          <line x1={cx} y1={cy} x2={px} y2={py} stroke={INK.indigo} strokeWidth="3" />
          <line x1={cx} y1={cy} x2={px} y2={cy} stroke={INK.cyan} strokeWidth="6" strokeLinecap="round" />
          <line x1={px} y1={cy} x2={px} y2={py} stroke={INK.amber} strokeWidth="6" strokeLinecap="round" />
          <text x={(cx + px) / 2} y={cy + (py > cy ? -8 : 18)} textAnchor="middle" fontSize="12" fontWeight="800" fill={INK.cyan}>cos</text>
          <text x={px + (px >= cx ? 8 : -8)} y={(cy + py) / 2 + 4} textAnchor={px >= cx ? 'start' : 'end'} fontSize="12" fontWeight="800" fill="#B45309">sin</text>

          <line x1="190" x2="352" y1={cy} y2={cy} stroke={INK.line} strokeWidth="1.5" />
          {[90, 180, 270, 360].map(angle => (
            <text key={angle} x={graphX(angle)} y={cy + 16} textAnchor="middle" fontSize="11" fontWeight="600" fill={INK.muted}>{angle}°</text>
          ))}
          <path d={wave} fill="none" stroke={INK.line} strokeWidth="2" />
          <path d={traced.map((angle, i) => `${i ? 'L' : 'M'}${graphX(angle).toFixed(1)} ${(cy - r * Math.sin(toRadians(angle))).toFixed(1)}`).join(' ')} fill="none" stroke={INK.amber} strokeWidth="3.5" strokeLinecap="round" />
          <line x1={px} y1={py} x2={graphX(degrees)} y2={py} stroke={INK.amber} strokeWidth="1.5" strokeDasharray="3 4" />
          <circle cx={graphX(degrees)} cy={py} r="6" fill={INK.amber} stroke="white" strokeWidth="2" />

          <motion.g
            role="slider"
            tabIndex={0}
            aria-label="Góc quay"
            aria-valuemin={0}
            aria-valuemax={359}
            aria-valuenow={Math.round(degrees)}
            onKeyDown={sliderKeys(delta => setAngle((Math.round(degrees) + delta * 5 + 360) % 360, false))}
            className="cursor-grab outline-none active:cursor-grabbing"
          >
            <circle cx={px} cy={py} r="20" fill={INK.indigo} opacity="0.14" />
            <circle cx={px} cy={py} r="11" fill={INK.indigo} stroke="white" strokeWidth="3" />
          </motion.g>
          <text x={cx - r} y={cy + r + 18} fontSize="14" fontWeight="800" fill={INK.ink}>α = {degrees.toFixed(0)}°</text>
        </svg>
      </Stage>

      <dl className="grid grid-cols-2 gap-3 text-center">
        {[['sin α', d.exactSin, d.sin, 'text-amber-700'], ['cos α', d.exactCos, d.cos, 'text-sky-700']].map(([name, exact, value, tone]) => (
          <div key={name} className="rounded-3xl border border-slate-200 bg-white px-3 py-3">
            <dt className={`text-sm font-extrabold ${tone}`}>{name}</dt>
            <dd className="m-0 text-2xl font-extrabold tabular-nums text-slate-900">{exact ? exact.replace('-', '−') : formatNumber(value)}</dd>
            {exact && <dd className="m-0 text-sm font-semibold tabular-nums text-slate-600">≈ {formatNumber(value)}</dd>}
          </div>
        ))}
      </dl>

      <Caption tone={reached ? 'success' : 'neutral'}>
        {reached
          ? <p>Đúng góc {target}°. Độ cao của điểm chính là sin, hình chiếu ngang chính là cos.</p>
          : <p>Kéo điểm trên đường tròn: thanh cam (sin) là độ cao, thanh xanh (cos) là hình chiếu ngang. Đồ thị bên phải ghi lại độ cao theo góc.</p>}
      </Caption>
    </div>
  )
}

/* ───────────────────────────── Tam giác: kéo đỉnh C ───────────────────────────── */

const INVALID_REASON = {
  side_must_be_positive: 'Độ dài cạnh phải dương.',
  angle_must_be_between_zero_and_180: 'Góc phải nằm giữa 0° và 180°.',
  angle_sum_failed: 'Tổng các góc phải bằng 180°.',
  triangle_inequality_failed: 'Vi phạm bất đẳng thức tam giác: tổng hai cạnh phải lớn hơn cạnh còn lại.',
  sine_law_no_solution: 'Dữ kiện này không tạo được tam giác (sin vượt quá 1).',
  inconsistent_angle_side_data: 'Số đo góc và cạnh mâu thuẫn nhau.',
  insufficient_data: 'Chưa đủ dữ kiện để dựng tam giác.',
}

function triangleGeometry(sides) {
  const { a, b, c } = sides
  const x = (b * b + c * c - a * a) / (2 * c)
  return { C: { x, y: Math.sqrt(Math.max(0, b * b - x * x)) }, c }
}

export function TriangleLab({ manifest, snapshot, dispatch }) {
  const mode = manifest.config.mode
  const t = snapshot.derivedState.triangle
  const solved = t.valid && ['a', 'b', 'c'].every(key => Number.isFinite(t.sides[key]))
  const frozen = useRef(null)
  const [dragging, setDragging] = useState(false)

  const geometry = solved ? triangleGeometry(t.sides) : null
  const fit = () => {
    const minX = Math.min(0, geometry.C.x)
    const maxX = Math.max(geometry.c, geometry.C.x)
    const scale = Math.min(270 / (maxX - minX), 160 / Math.max(geometry.C.y, 0.5))
    return { scale, ox: 180 - (minX + maxX) / 2 * scale, oy: 206 }
  }
  const view = solved ? (dragging && frozen.current) || fit() : null
  const toSvg = point => ({ x: view.ox + point.x * view.scale, y: view.oy - point.y * view.scale })

  const setTriangle = (sides, transient) => dispatch({ type: 'manipulate', key: 'triangle', value: sides, transient })
  const drag = useSvgDrag({
    width: 360,
    height: 250,
    onMove: (point, start) => {
      if (!solved) return
      if (start) {
        frozen.current = view
        setDragging(true)
      }
      const frame = frozen.current
      const wx = (point.x - frame.ox) / frame.scale
      const wy = Math.max(0.15, (frame.oy - point.y) / frame.scale)
      setTriangle({ a: Math.hypot(wx - geometry.c, wy), b: Math.hypot(wx, wy), c: geometry.c }, true)
    },
    onEnd: () => {
      if (!solved) return
      setDragging(false)
      setTriangle(snapshot.state.triangle, false)
    },
  })

  if (!solved) {
    return (
      <div className="space-y-5">
        <Caption tone="error"><p>{INVALID_REASON[t.reason] || 'Dữ kiện chưa tạo được tam giác.'}</p></Caption>
        <SideFields sides={t.sides} onCommit={sides => setTriangle(sides, false)} />
      </div>
    )
  }

  const A = toSvg({ x: 0, y: 0 })
  const B = toSvg({ x: geometry.c, y: 0 })
  const C = toSvg(geometry.C)
  const foot = toSvg({ x: geometry.C.x, y: 0 })
  const { a, b, c } = t.sides
  const angles = t.angles
  const mid = (p, q) => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 })
  const circumcenter = toSvg({ x: geometry.c / 2, y: (geometry.C.x ** 2 + geometry.C.y ** 2 - geometry.c * geometry.C.x) / (2 * geometry.C.y) })
  const height = geometry.C.y
  const cos = angle => Math.cos(toRadians(angle))

  return (
    <div className="space-y-5">
      <Stage label="Tam giác ABC, kéo đỉnh C để thay đổi">
        <svg ref={drag.ref} viewBox="0 0 360 250" className="block w-full touch-none select-none" role="img" aria-label={`Tam giác với a = ${formatNumber(a, 2)}, b = ${formatNumber(b, 2)}, c = ${formatNumber(c, 2)}`} {...drag.bind}>
          {mode === 'law_of_sines' && t.circumradius && (
            <circle cx={circumcenter.x} cy={circumcenter.y} r={t.circumradius * view.scale} fill="none" stroke={INK.cyan} strokeWidth="2" strokeDasharray="6 6" />
          )}
          <path d={`M${A.x} ${A.y}L${B.x} ${B.y}L${C.x} ${C.y}Z`} fill={INK.indigoSoft} stroke={INK.indigo} strokeWidth="3" strokeLinejoin="round" />
          {(mode === 'triangle_solver' || mode === 'measurement_model') && (
            <>
              <line x1={C.x} y1={C.y} x2={foot.x} y2={foot.y} stroke={INK.amber} strokeWidth="2.5" strokeDasharray="5 5" />
              <text x={foot.x + 6} y={(C.y + foot.y) / 2} fontSize="13" fontWeight="800" fill="#B45309">h</text>
            </>
          )}
          {[[B, C, 'a', a], [C, A, 'b', b], [A, B, 'c', c]].map(([p, q, name, value]) => {
            const m = mid(p, q)
            const dx = m.x - (A.x + B.x + C.x) / 3
            const dy = m.y - (A.y + B.y + C.y) / 3
            const length = Math.hypot(dx, dy) || 1
            return (
              <text key={name} x={m.x + dx / length * 18} y={m.y + dy / length * 18 + 5} textAnchor="middle" fontSize="13" fontWeight="800" fill={INK.ink}>
                {name} = {formatNumber(value, 2)}
              </text>
            )
          })}
          {[[A, 'A', angles.A, -16, 18], [B, 'B', angles.B, 16, 18]].map(([p, name, angle, dx, dy]) => (
            <text key={name} x={p.x + dx} y={p.y + dy} textAnchor="middle" fontSize="13" fontWeight="800" fill={INK.muted}>{name} {formatNumber(angle, 1)}°</text>
          ))}
          <motion.g className="cursor-grab outline-none active:cursor-grabbing" animate={{ scale: dragging ? 1.15 : 1 }} style={{ transformOrigin: `${C.x}px ${C.y}px` }}>
            <circle cx={C.x} cy={C.y} r="22" fill={INK.indigo} opacity="0.14" />
            <circle cx={C.x} cy={C.y} r="11" fill={INK.indigo} stroke="white" strokeWidth="3" />
          </motion.g>
          <text x={C.x} y={C.y - 20} textAnchor="middle" fontSize="13" fontWeight="800" fill={INK.ink}>C {formatNumber(angles.C, 1)}°</text>
        </svg>
      </Stage>

      <div className="rounded-3xl border border-slate-200 bg-white px-4 py-4 text-center tabular-nums">
        {mode === 'law_of_sines' ? (
          <>
            <p className="text-sm font-extrabold text-sky-700">Định lí sin — đường tròn nét đứt là đường tròn ngoại tiếp</p>
            <p className="mt-1 text-lg font-bold text-slate-900">
              a/sin A = {formatNumber(a / Math.sin(toRadians(angles.A)), 2)} · b/sin B = {formatNumber(b / Math.sin(toRadians(angles.B)), 2)} · c/sin C = {formatNumber(c / Math.sin(toRadians(angles.C)), 2)}
            </p>
            <p className="text-base font-extrabold text-slate-900">= 2R = {formatNumber(2 * t.circumradius, 2)}</p>
          </>
        ) : mode === 'law_of_cosines' || mode === 'triangle_solver' ? (
          <>
            <p className="text-sm font-extrabold text-indigo-700">Định lí côsin</p>
            <p className="mt-1 text-lg font-bold text-slate-900">c² = a² + b² − 2ab·cos C</p>
            <p className="text-base font-semibold text-slate-700">
              {formatNumber(c * c, 2)} = {formatNumber(a * a, 2)} + {formatNumber(b * b, 2)} − {formatNumber(2 * a * b * cos(angles.C), 2)}
            </p>
            {Math.abs(angles.C - 90) < 0.5 && <p className="mt-1 text-sm font-bold text-sky-700">C vuông: cos C = 0, công thức trở thành định lí Pythagore.</p>}
          </>
        ) : null}
        {(mode === 'triangle_solver' || mode === 'measurement_model') && (
          <p className="mt-2 text-base font-semibold text-slate-700">S = ½·c·h = ½ · {formatNumber(c, 2)} · {formatNumber(height, 2)} = <strong className="text-slate-900">{formatNumber(t.area, 2)}</strong></p>
        )}
      </div>

      {mode === 'measurement_model' && (
        <NumberField label="Kết quả đo theo yêu cầu của bài" value={snapshot.state.measurement} onCommit={value => dispatch({ type: 'manipulate', key: 'measurement', value })} />
      )}

      <details className="rounded-3xl border border-slate-200 bg-white px-4 py-3">
        <summary className="min-h-[40px] cursor-pointer py-2 text-sm font-extrabold text-slate-800">Nhập số đo chính xác</summary>
        <SideFields sides={t.sides} onCommit={sides => setTriangle(sides, false)} />
      </details>

      <Caption>
        <p>Kéo đỉnh C: cạnh c giữ nguyên, các cạnh và góc còn lại đổi theo. Đưa C ra xa đáy để thấy diện tích và góc C thay đổi thế nào.</p>
      </Caption>
    </div>
  )
}

function SideFields({ sides, onCommit }) {
  const rounded = value => (Number.isFinite(value) ? Number(value.toFixed(2)) : undefined)
  return (
    <div className="grid grid-cols-3 gap-3 pb-2 pt-1">
      {['a', 'b', 'c'].map(name => (
        <NumberField
          key={name}
          label={`Cạnh ${name}`}
          min={0}
          value={rounded(sides[name])}
          onCommit={value => { if (value > 0) onCommit({ a: sides.a, b: sides.b, c: sides.c, [name]: value }) }}
        />
      ))}
    </div>
  )
}
