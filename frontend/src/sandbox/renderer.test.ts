import { describe, expect, it } from 'vitest'
import { renderSceneSvg } from './renderer'

describe('sandbox renderer', () => {
  it('renders each first-release scene as escaped svg', () => {
    expect(renderSceneSvg({ kind: 'logic', space: 'truth_table', elements: [{ p: true, result: '<x>' }], labels: [] })).toContain('&lt;x&gt;')
    expect(renderSceneSvg({ kind: 'logic', space: 'condition_graph', elements: [{ statement: 'P ⇒ Q', correct: false }], labels: [] })).toContain('Sơ đồ điều kiện')
    expect(renderSceneSvg({ kind: 'set', space: 'venn_plane', elements: [{ result: { kind: 'finite_set', elements: [1, 2] } }], labels: [] })).toContain('Biểu đồ Venn')
    expect(renderSceneSvg({ kind: 'set', space: 'number_line', elements: [{ result: { kind: 'interval', left: 0, right: 1, leftClosed: true, rightClosed: false } }], labels: [] })).toContain('Khoảng nghiệm')
    expect(renderSceneSvg({ kind: 'trigonometry', space: 'unit_circle', elements: [{ degrees: 60, sin: 0.86, cos: 0.5 }], labels: [] })).toContain('60°')
    expect(renderSceneSvg({ kind: 'trigonometry', space: 'triangle_scene', elements: [{ triangle: { valid: true, sides: { a: 3 }, angles: { A: 30 } } }], labels: [] })).toContain('Tam giác hợp lệ')
  })
})
