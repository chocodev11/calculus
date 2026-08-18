import { describe, expect, it } from 'vitest'
import { canonicalSet, intervalsEqual, normalizeAngle, setsEqual } from './canonical'
import { defaultSandboxRegistry } from './index'
import { setNumberLinePlugin } from './plugins/set'
import { trigonometryPlugin } from './plugins/trigonometry'
import type { SandboxManifest } from './types'

describe('domain canonicalization', () => {
  it('treats finite sets as unordered and duplicate-free', () => {
    expect(canonicalSet([3, 1, 3, 2])).toEqual([1, 2, 3])
    expect(setsEqual([1, 2], [2, 1])).toBe(true)
  })

  it('preserves open and closed interval endpoints', () => {
    expect(intervalsEqual(
      { kind: 'interval', left: 0, right: 1, leftClosed: true, rightClosed: false },
      { kind: 'interval', left: 0, right: 1, leftClosed: true, rightClosed: false },
    )).toBe(true)
    expect(intervalsEqual(
      { kind: 'interval', left: 0, right: 1, leftClosed: true, rightClosed: false },
      { kind: 'interval', left: 0, right: 1, leftClosed: false, rightClosed: false },
    )).toBe(false)
  })

  it('normalizes angles and exposes all registered plugins', () => {
    expect(normalizeAngle(-30)).toBe(330)
    expect(defaultSandboxRegistry.ids()).toContain('trigonometry.triangle_solver')
    expect(setNumberLinePlugin.id).toBe('set.number_line')
  })

  it('rejects reversed intervals and inconsistent triangles', () => {
    expect(() => intervalsEqual(
      { kind: 'interval', left: 2, right: 1, leftClosed: true, rightClosed: true },
      { kind: 'interval', left: 0, right: 1, leftClosed: true, rightClosed: true },
    )).toThrow('reversed')
    const issues = trigonometryPlugin.validateManifest({
      schemaVersion: '1.0', kind: 'math.sandbox', id: 'invalid-triangle', version: '1', domainId: 'trigonometry',
      archetypeId: 'triangle', level: 'application', recipe: 'trigonometry.triangle_solver', outcomeIds: ['o'],
      prerequisites: [], misconceptions: [], scene: { space: 'triangle_scene' }, controls: [], goals: [], assessment: [],
      accessibility: { keyboardControls: true, textAlternative: 'triangle', highContrast: true },
      config: { mode: 'triangle_solver', triangle: { a: 1, b: 1, c: 3 } },
    })
    expect(issues).toEqual([])
    const manifest = {
      schemaVersion: '1.0', kind: 'math.sandbox', id: 'invalid-triangle', version: '1', domainId: 'trigonometry' as const,
      archetypeId: 'triangle', level: 'application' as const, recipe: 'trigonometry.triangle_solver', outcomeIds: ['o'],
      prerequisites: [], misconceptions: [], scene: { space: 'triangle_scene' as const }, controls: [], goals: [], assessment: [],
      accessibility: { keyboardControls: true, textAlternative: 'triangle', highContrast: true },
      config: { mode: 'triangle_solver' as const, triangle: { a: 1, b: 1, c: 3 } },
    } as SandboxManifest
    const result = trigonometryPlugin.recompute(manifest, trigonometryPlugin.createInitialState(manifest))
    expect((result.derivedState.triangle as { valid: boolean }).valid).toBe(false)
  })
})
