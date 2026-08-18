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
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 320" role="img" aria-label="${escapeText(label)}" focusable="false"><rect width="640" height="320" rx="18" fill="#f8fafc"/>${content}</svg>`
}

function truthTable(model: RenderModel): string {
  const rows = (model.elements || []).map(record)
  if (!rows.length) return shell('<text x="28" y="52" fill="#475569">Chưa có dữ liệu</text>', 'Bảng chân trị trống')
  const keys = Object.keys(rows[0])
  const width = 580 / keys.length
  const header = keys.map((key, index) => `<rect x="${30 + index * width}" y="24" width="${width}" height="34" fill="#4338ca"/><text x="${30 + index * width + width / 2}" y="46" text-anchor="middle" fill="white" font-weight="700">${escapeText(key)}</text>`).join('')
  const body = rows.map((row, rowIndex) => keys.map((key, columnIndex) => {
    const value = row[key] === true ? 'Đúng' : row[key] === false ? 'Sai' : row[key]
    return `<rect x="${30 + columnIndex * width}" y="${58 + rowIndex * 32}" width="${width}" height="32" fill="${rowIndex % 2 ? '#eef2ff' : 'white'}" stroke="#cbd5e1"/><text x="${30 + columnIndex * width + width / 2}" y="${79 + rowIndex * 32}" text-anchor="middle" fill="#1e293b">${escapeText(value)}</text>`
  }).join('')).join('')
  return shell(`${header}${body}`, 'Bảng chân trị')
}

function conditionGraph(model: RenderModel): string {
  const rows = (model.elements || []).map(record)
  if (!rows.length) return shell('<text x="28" y="52" fill="#475569">Chưa có dữ liệu</text>', 'Sơ đồ điều kiện trống')
  const cardHeight = Math.min(72, Math.max(48, 280 / rows.length))
  const content = rows.slice(0, 8).map((row, index) => {
    const y = 22 + index * cardHeight
    const entries = Object.entries(row)
      .filter(([key]) => key !== 'id')
      .map(([key, value]) => `${key}: ${value === true ? 'Đúng' : value === false ? 'Sai' : String(value)}`)
      .join(' · ')
    return `<rect x="24" y="${y.toFixed(2)}" width="592" height="${(cardHeight - 6).toFixed(2)}" rx="10" fill="white" stroke="#cbd5e1"/><text x="40" y="${(y + cardHeight / 2 + 5).toFixed(2)}" fill="#1e293b" font-size="13">${escapeText(entries)}</text>`
  }).join('')
  return shell(`${content}<text x="320" y="306" text-anchor="middle" fill="#475569">Sơ đồ điều kiện và phản ví dụ</text>`, 'Sơ đồ điều kiện')
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
