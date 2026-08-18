import type { FiniteSetValue, IntervalValue, JsonObject, MathValue, PrimitiveState, RecomputeResult, RenderModel, SandboxManifest } from '../types'
import type { SandboxPlugin } from '../registry'
import { canonicalScalar, canonicalSet, intervalsEqual, setsEqual } from '../canonical'

type SetOperation = 'union' | 'intersection' | 'difference'

interface SetConfig {
  mode?: 'builder' | 'venn' | 'number_line' | 'operator'
  universe?: JsonValueList
  left?: JsonValueList
  right?: JsonValueList
  operation?: SetOperation
  target?: JsonValueList | JsonObject
  initial?: JsonValueList
  initialInterval?: JsonObject
}

type JsonValueList = (string | number | boolean | null)[]

function configOf(manifest: SandboxManifest): SetConfig {
  return manifest.config as SetConfig
}

function finiteSet(values: unknown): FiniteSetValue {
  return { kind: 'finite_set', elements: canonicalSet(values) as MathValue[] }
}

function operation(left: FiniteSetValue, right: FiniteSetValue, kind: SetOperation): FiniteSetValue {
  if (kind === 'union') return finiteSet([...left.elements, ...right.elements])
  if (kind === 'intersection') return finiteSet(left.elements.filter(item => right.elements.some(other => canonicalScalar(item) === canonicalScalar(other))))
  return finiteSet(left.elements.filter(item => !right.elements.some(other => canonicalScalar(item) === canonicalScalar(other))))
}

function interval(value: unknown): IntervalValue {
  if (!value || typeof value !== 'object') throw new Error('Invalid interval')
  const source = value as Record<string, unknown>
  if (source.kind !== 'interval') throw new Error('Invalid interval kind')
  return {
    kind: 'interval',
    left: source.left === null ? null : Number(source.left),
    right: source.right === null ? null : Number(source.right),
    leftClosed: Boolean(source.leftClosed),
    rightClosed: Boolean(source.rightClosed),
  }
}

function intervalFromState(state: PrimitiveState, config: SetConfig): IntervalValue {
  const source = (state.interval || config.initialInterval || config.target) as JsonObject | undefined
  if (!source) throw new Error('number_line mode requires an interval')
  return interval(source)
}

function model(mode: string, result: FiniteSetValue | IntervalValue, universe: unknown[] = []): RenderModel {
  return {
    kind: 'set',
    space: mode === 'number_line' ? 'number_line' : 'venn_plane',
    elements: [{ result, universe }],
    labels: [],
  }
}

export const setPlugin: SandboxPlugin = {
  id: 'set.operator',
  domainId: 'set',

  validateManifest(manifest) {
    const config = configOf(manifest)
    const issues: string[] = []
    if (!['builder', 'venn', 'number_line', 'operator'].includes(config.mode || '')) issues.push('set.mode is invalid')
    if (config.mode === 'operator' && (!Array.isArray(config.left) || !Array.isArray(config.right) || !config.operation)) {
      issues.push('operator mode requires left, right and operation')
    }
    if (config.mode === 'number_line' && !config.target) issues.push('number_line mode requires target interval')
    if (manifest.scene.space !== 'venn_plane' && manifest.scene.space !== 'number_line') issues.push('set plugin requires venn_plane or number_line scene')
    return issues
  },

  createInitialState(manifest): PrimitiveState {
    const config = configOf(manifest)
    return {
      selected: config.initial || [],
      left: config.left || [],
      right: config.right || [],
      ...(config.initialInterval ? { interval: config.initialInterval } : {}),
    }
  },

  recompute(manifest, state): RecomputeResult {
    const config = configOf(manifest)
    const left = finiteSet(state.left || config.left || [])
    const right = finiteSet(state.right || config.right || [])
    const result: FiniteSetValue | IntervalValue = config.mode === 'operator'
      ? operation(left, right, config.operation || 'union')
      : config.mode === 'number_line'
        ? intervalFromState(state, config)
        : finiteSet(state.selected || config.initial || [])
    const target = config.target
    const targetIsInterval = Boolean(target && typeof target === 'object' && !Array.isArray(target) && (target as JsonObject).kind === 'interval')
    const goals = manifest.goals.map(goal => {
      if (goal.evidence === 'set_equal' && target !== undefined) {
        return { id: goal.id, required: goal.required !== false, reached: !targetIsInterval && setsEqual(result, target), evidence: result }
      }
      if (goal.evidence === 'interval_equal' && targetIsInterval) {
        return { id: goal.id, required: goal.required !== false, reached: intervalsEqual(result, target), evidence: result }
      }
      return { id: goal.id, required: goal.required !== false, reached: false }
    })
    const feedback = goals.filter(goal => goal.reached).map(goal => ({
      id: goal.id,
      kind: 'goal' as const,
      message: 'Biểu diễn tập hợp đã đúng.',
    }))
    return {
      state: structuredClone(state),
      derivedState: { left, right, result },
      goals,
      feedback,
      renderModel: model(config.mode || 'builder', result, config.universe || []),
    }
  },

  render(manifest, derivedState) {
    return model(configOf(manifest).mode || 'builder', derivedState.result as FiniteSetValue | IntervalValue, configOf(manifest).universe || [])
  },

  getConstraints() {
    return { duplicateElements: false, intervalEndpointRequired: true }
  },

  gradeStructuredStep(manifest, stepId, value) {
    const step = manifest.solutionGraph?.steps.find(item => item.id === stepId)
    return { correct: Boolean(step?.acceptedValues?.some(item => JSON.stringify(item) === JSON.stringify(value))) }
  },
}

export const setBuilderPlugin: SandboxPlugin = { ...setPlugin, id: 'set.builder' }
export const setVennPlugin: SandboxPlugin = { ...setPlugin, id: 'set.venn' }
export const setNumberLinePlugin: SandboxPlugin = { ...setPlugin, id: 'set.number_line' }
