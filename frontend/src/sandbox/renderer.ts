import type { RenderModel } from './types'

function escapeText(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function number(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {}
}

function finiteElements(value: unknown): unknown[] {
  const source = record(value)
  return Array.isArray(source.elements) ? source.elements : Array.isArray(value) ? value : []
}

function shell(content: string, label: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 320" role="img" aria-label="${escapeText(label)}" focusable="false" style="width: 100%; height: auto; display: block;"><rect width="640" height="320" rx="18" fill="#f8fafc"/>${content}</svg>`
}

function truthTable(model: RenderModel): string {
  const rows = (model.elements || []).map(record)
  if (!rows.length) return shell('<text x="28" y="52" fill="#475569">Chưa có dữ liệu</text>', 'Bảng chân trị trống')
  const keys = Object.keys(rows[0])
  const width = 580 / keys.length
  const header = keys.map((key, index) => `<rect x="${30 + index * width}" y="20" width="${width}" height="36" rx="4" fill="#4f46e5"/><text x="${30 + index * width + width / 2}" y="43" text-anchor="middle" fill="white" font-size="13" font-weight="800">${escapeText(key)}</text>`).join('')
  const body = rows.map((row, rowIndex) => keys.map((key, columnIndex) => {
    const isBool = typeof row[key] === 'boolean'
    const value = row[key] === true ? 'Đúng' : row[key] === false ? 'Sai' : row[key]
    const textColor = row[key] === true ? '#059669' : row[key] === false ? '#dc2626' : '#1e293b'
    return `<rect x="${30 + columnIndex * width}" y="${56 + rowIndex * 32}" width="${width}" height="32" fill="${rowIndex % 2 ? '#f8fafc' : 'white'}" stroke="#e2e8f0"/><text x="${30 + columnIndex * width + width / 2}" y="${77 + rowIndex * 32}" text-anchor="middle" fill="${textColor}" font-size="12" font-weight="${isBool ? '700' : '600'}">${escapeText(value)}</text>`
  }).join('')).join('')
  return shell(`${header}${body}`, 'Bảng chân trị')
}

function renderClassifierBins(rows: Record<string, unknown>[]): string {
  const bins = [
    { id: 'proposition', title: 'MỆNH ĐỀ', subtitle: 'Khẳng định đúng hoặc sai', color: '#4338ca', bg: '#eef2ff', stroke: '#c7d2fe', x: 20 },
    { id: 'open_sentence', title: 'MỆNH ĐỀ CHỨA BIẾN', subtitle: 'Khẳng định chứa biến số', color: '#b45309', bg: '#fffbeb', stroke: '#fde68a', x: 226 },
    { id: 'not_proposition', title: 'KHÔNG PHẢI MỆNH ĐỀ', subtitle: 'Câu hỏi, cảm thán, mệnh lệnh', color: '#334155', bg: '#f1f5f9', stroke: '#cbd5e1', x: 432 },
  ]

  const binContent = bins.map(bin => {
    const items = rows.filter(r => String(r.selected) === bin.id)
    const cardSvg = items.map((item, idx) => {
      const cy = 90 + idx * 46
      const isCorrect = item.correct === true
      const borderColor = isCorrect ? '#10b981' : '#f59e0b'
      const checkText = isCorrect ? '✓' : '○'
      const checkColor = isCorrect ? '#059669' : '#b45309'
      const stmt = escapeText(String(item.statement || item.id).slice(0, 22))

      return `
        <g>
          <rect x="${bin.x + 8}" y="${cy}" width="172" height="38" rx="8" fill="white" stroke="${borderColor}" stroke-width="1.5"/>
          <text x="${bin.x + 20}" y="${cy + 23}" fill="#0f172a" font-size="11" font-weight="700">${stmt}</text>
          <text x="${bin.x + 164}" y="${cy + 23}" text-anchor="middle" fill="${checkColor}" font-size="12" font-weight="900">${checkText}</text>
        </g>
      `
    }).join('')

    const placeholder = items.length === 0
      ? `<text x="${bin.x + 94}" y="160" text-anchor="middle" fill="#94a3b8" font-size="11" font-weight="600" font-style="italic">Chưa có câu nào</text>`
      : ''

    return `
      <g>
        <rect x="${bin.x}" y="36" width="188" height="265" rx="14" fill="${bin.bg}" stroke="${bin.stroke}" stroke-width="2"/>
        <rect x="${bin.x + 8}" y="44" width="172" height="32" rx="8" fill="${bin.color}"/>
        <text x="${bin.x + 94}" y="60" text-anchor="middle" fill="white" font-size="11" font-weight="800" letter-spacing="0.5">${bin.title}</text>
        <text x="${bin.x + 94}" y="72" text-anchor="middle" fill="#ffffff" fill-opacity="0.8" font-size="9" font-weight="600">${bin.subtitle}</text>
        ${cardSvg}
        ${placeholder}
      </g>
    `
  }).join('')

  return shell(
    `<text x="320" y="24" text-anchor="middle" fill="#334155" font-size="12" font-weight="800">MÔ HÌNH PHÂN LOẠI CÂU &amp; MỆNH ĐỀ TRỰC QUAN</text>${binContent}`,
    'Mô hình phân loại mệnh đề'
  )
}

function renderQuantifierMathProofs(rows: Record<string, unknown>[]): string {
  return shell(
    `
    <text x="320" y="24" text-anchor="middle" fill="#334155" font-size="12" font-weight="800">TRỰC QUAN HÓA TOÁN HỌC &amp; BẰNG CHỨNG CHỨNG MINH</text>

    <!-- Panel 1: (n-1)n(n+1) -->
    <g>
      <rect x="18" y="38" width="194" height="262" rx="14" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5"/>
      <rect x="26" y="46" width="178" height="28" rx="8" fill="#4338ca"/>
      <text x="115" y="64" text-anchor="middle" fill="white" font-size="11" font-weight="800">1) Tích 3 số liên tiếp</text>
      
      <!-- Mini Number Line Blocks -->
      <g transform="translate(36, 95)">
        <rect x="0" y="0" width="46" height="32" rx="6" fill="#e0e7ff" stroke="#6366f1"/>
        <text x="23" y="20" text-anchor="middle" fill="#312e81" font-size="11" font-weight="800">n−1</text>
        
        <rect x="52" y="0" width="46" height="32" rx="6" fill="#c7d2fe" stroke="#4f46e5"/>
        <text x="75" y="20" text-anchor="middle" fill="#312e81" font-size="11" font-weight="800">n</text>
        
        <rect x="104" y="0" width="46" height="32" rx="6" fill="#e0e7ff" stroke="#6366f1"/>
        <text x="127" y="20" text-anchor="middle" fill="#312e81" font-size="11" font-weight="800">n+1</text>
      </g>
      
      <text x="115" y="156" text-anchor="middle" fill="#0f172a" font-size="11" font-weight="700">n(n²−1) = (n−1)n(n+1)</text>
      <text x="115" y="176" text-anchor="middle" fill="#047857" font-size="11" font-weight="800">Luôn chia hết cho 3 (✓)</text>
      <text x="115" y="202" text-anchor="middle" fill="#64748b" font-size="9.5" font-weight="600">Phủ định đúng:</text>
      <text x="115" y="220" text-anchor="middle" fill="#4338ca" font-size="9" font-weight="700">∃n∈N*: n(n²−1) không chia hết cho 3</text>
      <rect x="62" y="246" width="106" height="24" rx="8" fill="#ecfdf5" stroke="#10b981"/>
      <text x="115" y="262" text-anchor="middle" fill="#047857" font-size="10" font-weight="800">Mệnh đề: ĐÚNG</text>
    </g>

    <!-- Panel 2: x^2 - 6x + 15 > 0 -->
    <g>
      <rect x="223" y="38" width="194" height="262" rx="14" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5"/>
      <rect x="231" y="46" width="178" height="28" rx="8" fill="#059669"/>
      <text x="320" y="64" text-anchor="middle" fill="white" font-size="11" font-weight="800">2) Parabol x² − 6x + 15</text>
      
      <!-- Coordinate Mini Parabola -->
      <g transform="translate(250, 92)">
        <line x1="10" y1="55" x2="130" y2="55" stroke="#94a3b8" stroke-width="1.5"/>
        <line x1="70" y1="0" x2="70" y2="60" stroke="#94a3b8" stroke-width="1.5"/>
        <!-- Parabola path (strictly above y=0) -->
        <path d="M 20 10 Q 70 45 120 10" fill="none" stroke="#059669" stroke-width="2.5"/>
        <circle cx="70" cy="28" r="4" fill="#047857"/>
        <text x="70" y="20" text-anchor="middle" fill="#047857" font-size="9" font-weight="800">I(3, 6) > 0</text>
      </g>

      <text x="320" y="174" text-anchor="middle" fill="#0f172a" font-size="11" font-weight="700">(x−3)² + 6 ≥ 6 > 0</text>
      <text x="320" y="194" text-anchor="middle" fill="#047857" font-size="11" font-weight="800">Dương với mọi x∈R (✓)</text>
      <text x="320" y="218" text-anchor="middle" fill="#64748b" font-size="9.5" font-weight="600">Phủ định đúng:</text>
      <text x="320" y="234" text-anchor="middle" fill="#059669" font-size="9" font-weight="700">∃x∈R: x²−6x+15 ≤ 0</text>
      <rect x="267" y="246" width="106" height="24" rx="8" fill="#ecfdf5" stroke="#10b981"/>
      <text x="320" y="262" text-anchor="middle" fill="#047857" font-size="10" font-weight="800">Mệnh đề: ĐÚNG</text>
    </g>

    <!-- Panel 3: x^2 = 2 on Q -->
    <g>
      <rect x="428" y="38" width="194" height="262" rx="14" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5"/>
      <rect x="436" y="46" width="178" height="28" rx="8" fill="#db2777"/>
      <text x="525" y="64" text-anchor="middle" fill="white" font-size="11" font-weight="800">3) Phương trình x² = 2</text>
      
      <!-- Number Line with Irrational Point -->
      <g transform="translate(445, 105)">
        <line x1="10" y1="20" x2="150" y2="20" stroke="#94a3b8" stroke-width="2"/>
        <line x1="30" y1="12" x2="30" y2="28" stroke="#475569" stroke-width="2"/>
        <text x="30" y="40" text-anchor="middle" fill="#475569" font-size="10" font-weight="700">1</text>
        
        <line x1="130" y1="12" x2="130" y2="28" stroke="#475569" stroke-width="2"/>
        <text x="130" y="40" text-anchor="middle" fill="#475569" font-size="10" font-weight="700">2</text>
        
        <circle cx="71" cy="20" r="5" fill="#dc2626"/>
        <text x="71" y="8" text-anchor="middle" fill="#dc2626" font-size="10" font-weight="800">√2 ∉ Q</text>
      </g>

      <text x="525" y="174" text-anchor="middle" fill="#0f172a" font-size="11" font-weight="700">Nghiệm x = ±√2 vô tỉ</text>
      <text x="525" y="194" text-anchor="middle" fill="#dc2626" font-size="11" font-weight="800">Không có nghiệm hữu tỉ</text>
      <text x="525" y="218" text-anchor="middle" fill="#64748b" font-size="9.5" font-weight="600">Phủ định đúng:</text>
      <text x="525" y="234" text-anchor="middle" fill="#db2777" font-size="9" font-weight="700">∀x∈Q: x² ≠ 2</text>
      <rect x="472" y="246" width="106" height="24" rx="8" fill="#fef2f2" stroke="#ef4444"/>
      <text x="525" y="262" text-anchor="middle" fill="#dc2626" font-size="10" font-weight="800">Mệnh đề: SAI</text>
    </g>
    `,
    'Mô hình bằng chứng toán học lượng từ'
  )
}

function renderImplicationVenn(model: RenderModel): string {
  const pToQ = model.expectedPToQ !== false
  const qToP = model.expectedQToP === true

  return shell(
    `
    <text x="320" y="24" text-anchor="middle" fill="#334155" font-size="12" font-weight="800">MÔ HÌNH TẬP HỢP, QUAN HỆ BAO HÀM &amp; PHẢN VÍ DỤ</text>

    <!-- Universe Map & Venn -->
    <g>
      <rect x="20" y="38" width="370" height="262" rx="14" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5"/>
      <text x="40" y="60" fill="#475569" font-size="11" font-weight="800">Không gian U = {2, 4, 6, 12}</text>
      
      <!-- Outer Circle Q (multiples of 2) -->
      <circle cx="205" cy="170" r="95" fill="#e0e7ff" fill-opacity="0.6" stroke="#4338ca" stroke-width="2.5"/>
      <text x="140" y="105" fill="#312e81" font-size="12" font-weight="800">Tập Q (Chia hết cho 2)</text>
      
      <!-- Inner Circle P (multiples of 6) -->
      <circle cx="240" cy="170" r="50" fill="#d1fae5" fill-opacity="0.85" stroke="#059669" stroke-width="2.5"/>
      <text x="240" y="142" text-anchor="middle" fill="#065f46" font-size="11" font-weight="800">Tập P (⋮ 6)</text>
      
      <!-- Points inside P -->
      <circle cx="225" cy="175" r="4" fill="#047857"/>
      <text x="225" y="192" text-anchor="middle" fill="#047857" font-size="11" font-weight="800">a=6</text>
      
      <circle cx="255" cy="175" r="4" fill="#047857"/>
      <text x="255" y="192" text-anchor="middle" fill="#047857" font-size="11" font-weight="800">a=12</text>
      
      <!-- Counterexample Points in Q \ P -->
      <circle cx="140" cy="175" r="5" fill="#d97706"/>
      <text x="140" y="195" text-anchor="middle" fill="#b45309" font-size="11" font-weight="800">a=2</text>
      
      <circle cx="170" cy="220" r="5" fill="#d97706"/>
      <text x="170" y="240" text-anchor="middle" fill="#b45309" font-size="11" font-weight="800">a=4</text>
      
      <rect x="80" y="258" width="250" height="24" rx="6" fill="#fffbeb" stroke="#fde68a"/>
      <text x="205" y="274" text-anchor="middle" fill="#b45309" font-size="10" font-weight="700">Vùng phản ví dụ Q \\ P = {2, 4}</text>
    </g>

    <!-- Logic Analysis Cards on Right -->
    <g>
      <rect x="402" y="38" width="218" height="262" rx="14" fill="white" stroke="#cbd5e1" stroke-width="1.5"/>
      <rect x="410" y="46" width="202" height="28" rx="8" fill="#4338ca"/>
      <text x="511" y="64" text-anchor="middle" fill="white" font-size="11" font-weight="800">Kết luận logic học</text>

      <!-- Row 1: P => Q -->
      <g transform="translate(412, 88)">
        <rect x="0" y="0" width="198" height="42" rx="8" fill="#ecfdf5" stroke="#10b981"/>
        <text x="12" y="18" fill="#065f46" font-size="11" font-weight="800">P ⇒ Q: ĐÚNG (✓)</text>
        <text x="12" y="32" fill="#047857" font-size="9.5" font-weight="600">Vì P ⊂ Q (Mọi số ⋮ 6 đều ⋮ 2)</text>
      </g>

      <!-- Row 2: Q => P -->
      <g transform="translate(412, 138)">
        <rect x="0" y="0" width="198" height="42" rx="8" fill="#fef2f2" stroke="#ef4444"/>
        <text x="12" y="18" fill="#991b1b" font-size="11" font-weight="800">Q ⇒ P: SAI (✗)</text>
        <text x="12" y="32" fill="#b91c1c" font-size="9.5" font-weight="600">Phản ví dụ: a = 2, 4 ∈ Q nhưng ∉ P</text>
      </g>

      <!-- Row 3: Necessary & Sufficient -->
      <g transform="translate(412, 188)">
        <rect x="0" y="0" width="198" height="48" rx="8" fill="#f8fafc" stroke="#cbd5e1"/>
        <text x="12" y="18" fill="#1e293b" font-size="10" font-weight="700">• P là điều kiện ĐỦ của Q</text>
        <text x="12" y="34" fill="#1e293b" font-size="10" font-weight="700">• Q là điều kiện CẦN của P</text>
      </g>

      <text x="511" y="278" text-anchor="middle" fill="#64748b" font-size="9.5" font-weight="600">Phản đảo ¬Q ⇒ ¬P luôn đúng</text>
    </g>
    `,
    'Biểu đồ Venn kéo theo và phản ví dụ'
  )
}

function renderParameterRootAxis(model: RenderModel): string {
  const m = typeof model.parameter === 'number' ? model.parameter : Number(model.parameter) || 0
  const isMatch = m === 1
  const originX = 320
  const step = 60

  const mX = originX + m * step
  const root1X = originX + 1 * step

  const ticks = [-3, -2, -1, 0, 1, 2, 3]

  return shell(
    `
    <text x="320" y="24" text-anchor="middle" fill="#334155" font-size="12" font-weight="800">TRỤC SỐ THỰC NGHIỆM TẬP NGHIỆM S = {1, m}</text>
    
    <!-- Main Axis Container -->
    <rect x="20" y="38" width="600" height="262" rx="14" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5"/>
    
    <!-- Coordinate Axis -->
    <line x1="60" y1="130" x2="580" y2="130" stroke="#334155" stroke-width="3"/>
    <path d="M580 130l-12 -6v12z" fill="#334155"/>
    <text x="580" y="115" fill="#334155" font-size="12" font-weight="800">x</text>

    <!-- Ticks -->
    ${ticks.map(t => {
      const tx = originX + t * step
      return `
        <line x1="${tx}" y1="122" x2="${tx}" y2="138" stroke="#64748b" stroke-width="2"/>
        <text x="${tx}" y="156" text-anchor="middle" fill="#475569" font-size="11" font-weight="700">${t}</text>
      `
    }).join('')}

    <!-- Fixed Root x=1 -->
    <circle cx="${root1X}" cy="130" r="7" fill="#4338ca"/>
    <line x1="${root1X}" y1="80" x2="${root1X}" y2="120" stroke="#4338ca" stroke-width="2" stroke-dasharray="3,3"/>
    <rect x="${root1X - 44}" y="56" width="88" height="24" rx="6" fill="#4338ca"/>
    <text x="${root1X}" y="72" text-anchor="middle" fill="white" font-size="10" font-weight="800">x₁ = 1 (cố định)</text>

    <!-- Dynamic Parameter Root x=m -->
    ${isMatch ? `
      <!-- Merged Double Root Circle -->
      <circle cx="${root1X}" cy="130" r="14" fill="none" stroke="#10b981" stroke-width="4"/>
      <circle cx="${root1X}" cy="130" r="6" fill="#059669"/>
    ` : `
      <circle cx="${mX}" cy="130" r="7" fill="#db2777"/>
      <line x1="${mX}" y1="80" x2="${mX}" y2="120" stroke="#db2777" stroke-width="2" stroke-dasharray="3,3"/>
      <rect x="${mX - 40}" y="56" width="80" height="24" rx="6" fill="#db2777"/>
      <text x="${mX}" y="72" text-anchor="middle" fill="white" font-size="10" font-weight="800">x₂ = m = ${m}</text>
      
      <!-- Counterexample span -->
      <line x1="${Math.min(mX, root1X)}" y1="180" x2="${Math.max(mX, root1X)}" y2="180" stroke="#ef4444" stroke-width="2.5"/>
      <text x="${(mX + root1X) / 2}" y="174" text-anchor="middle" fill="#dc2626" font-size="10" font-weight="800">2 nghiệm phân biệt (Phản ví dụ x = ${m} ≠ 1)</text>
    `}

    <!-- Conclusion Status Banner -->
    <rect x="40" y="216" width="560" height="60" rx="12" fill="${isMatch ? '#ecfdf5' : '#fef2f2'}" stroke="${isMatch ? '#10b981' : '#ef4444'}" stroke-width="1.5"/>
    <text x="320" y="240" text-anchor="middle" fill="${isMatch ? '#065f46' : '#991b1b'}" font-size="12" font-weight="800">
      ${isMatch ? '✓ Khi m = 1: Phương trình có nghiệm duy nhất x = 1. Mệnh đề Pₘ ⇒ Q là ĐÚNG!' : `✗ Khi m = ${m} ≠ 1: Phương trình có nghiệm ngoại lai x = ${m} không thỏa mãn x = 1 (Pₘ ⇒ Q SAI)`}
    </text>
    <text x="320" y="260" text-anchor="middle" fill="${isMatch ? '#047857' : '#b91c1c'}" font-size="10.5" font-weight="600">
      ${isMatch ? 'Điều kiện để (x−1)(x−m)=0 ⇒ x=1 là m = 1' : 'Thử vài giá trị x không đủ; ta phải chọn m sao cho không xuất hiện nghiệm x ≠ 1.'}
    </text>
    `,
    'Trục số tham số và phản ví dụ'
  )
}

function conditionGraph(model: RenderModel): string {
  const mode = model.labels?.[0] || ''
  const rows = (model.elements || []).map(record)

  if (mode === 'proposition_classifier') {
    return renderClassifierBins(rows)
  }
  if (mode === 'quantifier_negation') {
    return renderQuantifierMathProofs(rows)
  }
  if (mode === 'implication') {
    return renderImplicationVenn(model)
  }
  if (mode === 'parameter_implication') {
    return renderParameterRootAxis(model)
  }

  // Fallback for general condition graphs
  if (!rows.length) return shell('<text x="28" y="52" fill="#475569">Chưa có dữ liệu</text>', 'Sơ đồ điều kiện trống')
  const cardHeight = Math.min(84, Math.max(60, 260 / rows.length))
  const content = rows.slice(0, 5).map((row, index) => {
    const y = 18 + index * cardHeight
    const isCorrect = row.correct === true
    const isAnswered = Object.entries(row).some(([k, v]) => k !== 'id' && k !== 'statement' && k !== 'correct' && v !== '' && v !== undefined)
    const borderColor = isCorrect ? '#10b981' : isAnswered ? '#f59e0b' : '#e2e8f0'
    const statusBg = isCorrect ? '#ecfdf5' : isAnswered ? '#fffbeb' : '#f1f5f9'
    const statusText = isCorrect ? '✓ Đạt' : isAnswered ? 'Đang xét' : 'Chưa chọn'
    const statusColor = isCorrect ? '#047857' : isAnswered ? '#b45309' : '#64748b'

    const stmt = escapeText(row.statement || `Câu ${row.id || index + 1}`)
    
    // Format details into legible parts
    const details = []
    if (row.selected) details.push(`Phân loại: ${row.selected}`)
    if (row.verdict !== undefined && row.verdict !== '') details.push(`Phán đoán: ${row.verdict === true ? 'Đúng' : row.verdict === false ? 'Sai' : row.verdict}`)
    if (row.negation) details.push(`Phủ định: ${row.negation}`)
    if (row.witness) details.push(`Bằng chứng: ${row.witness}`)
    const detailsStr = escapeText(details.join('  |  '))

    return `
      <g>
        <rect x="20" y="${y.toFixed(1)}" width="600" height="${(cardHeight - 8).toFixed(1)}" rx="12" fill="white" stroke="${borderColor}" stroke-width="1.5"/>
        <text x="36" y="${(y + 20).toFixed(1)}" fill="#0f172a" font-size="13" font-weight="700">${stmt}</text>
        ${detailsStr ? `<text x="36" y="${(y + 38).toFixed(1)}" fill="#475569" font-size="11" font-weight="500">${detailsStr}</text>` : ''}
        <rect x="526" y="${(y + 12).toFixed(1)}" width="78" height="22" rx="8" fill="${statusBg}"/>
        <text x="565" y="${(y + 27).toFixed(1)}" text-anchor="middle" fill="${statusColor}" font-size="11" font-weight="700">${statusText}</text>
      </g>
    `
  }).join('')
  return shell(`${content}<text x="320" y="306" text-anchor="middle" fill="#64748b" font-size="11" font-weight="600">Trạng thái suy luận &amp; Kiểm chứng điều kiện</text>`, 'Sơ đồ điều kiện')
}

function venn(model: RenderModel): string {
  const first = record(model.elements?.[0])
  const result = record(first.result)
  const elements = finiteElements(result).map(escapeText).join(', ')
  return shell(
    `<circle cx="260" cy="160" r="92" fill="#818cf8" fill-opacity=".35" stroke="#4338ca" stroke-width="3"/><circle cx="380" cy="160" r="92" fill="#f472b6" fill-opacity=".35" stroke="#be185d" stroke-width="3"/><text x="220" y="88" text-anchor="middle" fill="#312e81" font-weight="700">A</text><text x="420" y="88" text-anchor="middle" fill="#831843" font-weight="700">B</text><text x="320" y="265" text-anchor="middle" fill="#334155">Kết quả: { ${elements} }</text>`,
    'Biểu đồ Venn và kết quả phép toán tập hợp',
  )
}

function numberLine(model: RenderModel): string {
  const first = record(model.elements?.[0])
  const result = record(first.result)
  const left = result.left === null || result.left === undefined ? '−∞' : result.left
  const right = result.right === null || result.right === undefined ? '+∞' : result.right
  const leftClosed = result.leftClosed ? '●' : '○'
  const rightClosed = result.rightClosed ? '●' : '○'
  return shell(`<line x1="64" y1="160" x2="576" y2="160" stroke="#334155" stroke-width="4"/><path d="M64 160l12-7v14zM576 160l-12-7v14z" fill="#334155"/><text x="64" y="132" text-anchor="middle" fill="#334155">${escapeText(left)}</text><text x="576" y="132" text-anchor="middle" fill="#334155">${escapeText(right)}</text><text x="64" y="188" text-anchor="middle" font-size="28" fill="#4f46e5">${leftClosed}</text><text x="576" y="188" text-anchor="middle" font-size="28" fill="#db2777">${rightClosed}</text><text x="320" y="250" text-anchor="middle" fill="#334155">Khoảng nghiệm</text>`, 'Trục số biểu diễn khoảng')
}

function unitCircle(model: RenderModel): string {
  const value = record(model.elements?.[0])
  const degrees = number(value.degrees)
  const radians = degrees * Math.PI / 180
  const x = 320 + Math.cos(radians) * 105
  const y = 160 - Math.sin(radians) * 105
  return shell(`<line x1="90" y1="160" x2="550" y2="160" stroke="#94a3b8"/><line x1="320" y1="30" x2="320" y2="290" stroke="#94a3b8"/><circle cx="320" cy="160" r="105" fill="#eef2ff" stroke="#4338ca" stroke-width="3"/><line x1="320" y1="160" x2="${x.toFixed(2)}" y2="${y.toFixed(2)}" stroke="#db2777" stroke-width="4"/><circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="8" fill="#db2777"/><text x="320" y="24" text-anchor="middle" fill="#312e81" font-weight="700">${escapeText(degrees)}°</text><text x="320" y="306" text-anchor="middle" fill="#334155">sin = ${escapeText(value.exactSin ?? value.sin)}</text><text x="490" y="50" text-anchor="middle" fill="#334155">cos = ${escapeText(value.exactCos ?? value.cos)}</text>`, 'Đường tròn lượng giác')
}

function triangle(model: RenderModel): string {
  const derived = record(model.elements?.[0])
  const triangle = record(derived.triangle)
  const sides = record(triangle.sides)
  const angles = record(triangle.angles)
  return shell(`<polygon points="130,250 500,250 350,70" fill="#e0e7ff" stroke="#4338ca" stroke-width="4"/><text x="130" y="274" text-anchor="middle" fill="#334155">a=${escapeText(sides.a ?? '?')}</text><text x="500" y="274" text-anchor="middle" fill="#334155">b=${escapeText(sides.b ?? '?')}</text><text x="350" y="58" text-anchor="middle" fill="#334155">c=${escapeText(sides.c ?? '?')}</text><text x="182" y="215" fill="#334155">A=${escapeText(angles.A ?? '?')}°</text><text x="432" y="215" fill="#334155">B=${escapeText(angles.B ?? '?')}°</text><text x="350" y="220" text-anchor="middle" fill="#334155">C=${escapeText(angles.C ?? '?')}°</text><text x="320" y="305" text-anchor="middle" fill="#334155">${triangle.valid ? 'Tam giác hợp lệ' : `Chưa hợp lệ: ${triangle.reason ?? 'dữ kiện chưa đủ'}`}</text>`, 'Mô hình tam giác')
}

export function renderSceneSvg(model: RenderModel): string {
  if (model.space === 'truth_table') return truthTable(model)
  if (model.space === 'condition_graph') return conditionGraph(model)
  if (model.space === 'venn_plane') return venn(model)
  if (model.space === 'number_line') return numberLine(model)
  if (model.space === 'unit_circle') return unitCircle(model)
  if (model.space === 'triangle_scene') return triangle(model)
  return shell('<text x="28" y="52" fill="#475569">Không hỗ trợ cảnh này</text>', 'Cảnh tương tác không hỗ trợ')
}

export function renderTextAlternative(model: RenderModel): string {
  if (model.space === 'truth_table') return `Bảng chân trị gồm ${(model.elements || []).length} dòng.`
  if (model.space === 'condition_graph') return `Sơ đồ điều kiện gồm ${(model.elements || []).length} trường hợp cần kiểm tra.`
  if (model.space === 'venn_plane') return 'Biểu đồ Venn biểu diễn hai tập hợp và vùng kết quả.'
  if (model.space === 'number_line') return 'Trục số biểu diễn các đầu mút và tính đóng mở của khoảng.'
  if (model.space === 'unit_circle') return 'Đường tròn lượng giác biểu diễn góc, sin và cos.'
  if (model.space === 'triangle_scene') return 'Hình tam giác hiển thị cạnh, góc và điều kiện tồn tại.'
  return 'Mô hình toán học tương tác.'
}
