import type { JsonObject, PrimitiveState, RecomputeResult, RenderModel, SandboxManifest } from '../types'
import type { SandboxPlugin } from '../registry'
import { angleEqual, evaluateNumericAnswer, normalizeAngle } from '../canonical'

interface TrigConfig {
  mode?: 'unit_circle' | 'triangle_solver' | 'law_of_sines' | 'law_of_cosines' | 'measurement_model'
  unit?: 'degree' | 'radian'
  initialDegrees?: number
  triangle?: {
    a?: number
    b?: number
    c?: number
    A?: number
    B?: number
    C?: number
  }
  expectedMeasurement?: number
}

interface TriangleResult {
  valid: boolean
  sides: { a?: number; b?: number; c?: number }
  angles: { A?: number; B?: number; C?: number }
  area?: number
  inradius?: number
  circumradius?: number
  alternatives?: Array<{ B: number; C: number; c?: number }>
  reason?: string
}

function configOf(manifest: SandboxManifest): TrigConfig {
  return manifest.config as TrigConfig
}

function clampCosine(value: number): number {
  return Math.max(-1, Math.min(1, value))
}

function specialValue(degrees: number, fn: 'sin' | 'cos'): string | null {
  const normalized = normalizeAngle(degrees)
  const table: Record<number, { sin: string; cos: string }> = {
    0: { sin: '0', cos: '1' },
    30: { sin: '1/2', cos: '√3/2' },
    45: { sin: '√2/2', cos: '√2/2' },
    60: { sin: '√3/2', cos: '1/2' },
    90: { sin: '1', cos: '0' },
    120: { sin: '√3/2', cos: '-1/2' },
    135: { sin: '√2/2', cos: '-√2/2' },
    150: { sin: '1/2', cos: '-√3/2' },
    180: { sin: '0', cos: '-1' },
  }
  const entry = Object.entries(table).find(([key]) => angleEqual(Number(key), normalized))
  return entry ? table[Number(entry[0])][fn] : null
}

function unitCircle(degrees: number): JsonObject {
  const radians = degrees * Math.PI / 180
  return {
    degrees,
    radians,
    sin: Number(Math.sin(radians).toFixed(12)),
    cos: Number(Math.cos(radians).toFixed(12)),
    exactSin: specialValue(degrees, 'sin'),
    exactCos: specialValue(degrees, 'cos'),
  }
}

function solveTriangle(input: NonNullable<TrigConfig['triangle']>): TriangleResult {
  const initial = { ...input }
  let { a, b, c, A, B, C } = initial
  if ([a, b, c].some(value => value !== undefined && (!Number.isFinite(value) || value <= 0))) {
    return { valid: false, sides: { a, b, c }, angles: { A, B, C }, reason: 'side_must_be_positive' }
  }
  if ([A, B, C].some(value => value !== undefined && (!Number.isFinite(value) || value <= 0 || value >= 180))) {
    return { valid: false, sides: { a, b, c }, angles: { A, B, C }, reason: 'angle_must_be_between_zero_and_180' }
  }

  const knownAngles = [A, B, C].filter(value => value !== undefined) as number[]
  if (knownAngles.length === 3 && Math.abs(knownAngles.reduce((sum, value) => sum + value, 0) - 180) > 1e-7) {
    return { valid: false, sides: { a, b, c }, angles: { A, B, C }, reason: 'angle_sum_failed' }
  }
  if (knownAngles.length === 2 && knownAngles.reduce((sum, value) => sum + value, 0) >= 180) {
    return { valid: false, sides: { a, b, c }, angles: { A, B, C }, reason: 'angle_sum_failed' }
  }

  if (a !== undefined && b !== undefined && C !== undefined && c === undefined) {
    c = Math.sqrt(a * a + b * b - 2 * a * b * Math.cos(C * Math.PI / 180))
  } else if (a !== undefined && c !== undefined && B !== undefined && b === undefined) {
    b = Math.sqrt(a * a + c * c - 2 * a * c * Math.cos(B * Math.PI / 180))
  } else if (b !== undefined && c !== undefined && A !== undefined && a === undefined) {
    a = Math.sqrt(b * b + c * c - 2 * b * c * Math.cos(A * Math.PI / 180))
  }
  if (a !== undefined && b !== undefined && c !== undefined) {
    if (a + b <= c || a + c <= b || b + c <= a) {
      return { valid: false, sides: { a, b, c }, angles: { A, B, C }, reason: 'triangle_inequality_failed' }
    }
    const calculatedA = Math.acos(clampCosine((b * b + c * c - a * a) / (2 * b * c))) * 180 / Math.PI
    const calculatedB = Math.acos(clampCosine((a * a + c * c - b * b) / (2 * a * c))) * 180 / Math.PI
    const calculatedC = 180 - calculatedA - calculatedB
    if (initial.A !== undefined && Math.abs(initial.A - calculatedA) > 1e-6) return { valid: false, sides: { a, b, c }, angles: { A: initial.A, B, C }, reason: 'inconsistent_angle_side_data' }
    if (initial.B !== undefined && Math.abs(initial.B - calculatedB) > 1e-6) return { valid: false, sides: { a, b, c }, angles: { A, B: initial.B, C }, reason: 'inconsistent_angle_side_data' }
    if (initial.C !== undefined && Math.abs(initial.C - calculatedC) > 1e-6) return { valid: false, sides: { a, b, c }, angles: { A, B, C: initial.C }, reason: 'inconsistent_angle_side_data' }
    A = calculatedA
    B = calculatedB
    C = calculatedC
  } else if (a !== undefined && A !== undefined && b !== undefined && B === undefined) {
    const sineRatio = b * Math.sin(A * Math.PI / 180) / a
    if (Math.abs(sineRatio) > 1) return { valid: false, sides: { a, b, c }, angles: { A, B, C }, reason: 'sine_law_no_solution' }
    const acuteB = Math.asin(sineRatio) * 180 / Math.PI
    const obtuseB = 180 - acuteB
    B = acuteB
    C = 180 - A - B
    if (C <= 0) return { valid: false, sides: { a, b, c }, angles: { A, B, C }, reason: 'angle_sum_failed' }
    if (c === undefined) c = a * Math.sin(C * Math.PI / 180) / Math.sin(A * Math.PI / 180)
    const alternatives = obtuseB !== acuteB && 180 - A - obtuseB > 0
      ? [{ B: obtuseB, C: 180 - A - obtuseB, c: a * Math.sin((180 - A - obtuseB) * Math.PI / 180) / Math.sin(A * Math.PI / 180) }]
      : undefined
    const base = { valid: true, sides: { a, b, c }, angles: { A, B, C }, alternatives }
    return withTriangleMetrics(base)
  } else if (a !== undefined && A !== undefined && B !== undefined && c === undefined) {
    C = 180 - A - B
    if (C <= 0) return { valid: false, sides: { a, b, c }, angles: { A, B, C }, reason: 'angle_sum_failed' }
    b = a * Math.sin(B * Math.PI / 180) / Math.sin(A * Math.PI / 180)
    c = a * Math.sin(C * Math.PI / 180) / Math.sin(A * Math.PI / 180)
  }

  const values = [a, b, c, A, B, C]
  if (values.some(value => value !== undefined && !Number.isFinite(value))) {
    return { valid: false, sides: { a, b, c }, angles: { A, B, C }, reason: 'non_finite_triangle' }
  }
  if ([a, b, c, A, B, C].filter(value => value !== undefined).length < 3) {
    return { valid: false, sides: { a, b, c }, angles: { A, B, C }, reason: 'insufficient_data' }
  }
  const area = a !== undefined && b !== undefined && C !== undefined
    ? 0.5 * a * b * Math.sin(C * Math.PI / 180)
    : a !== undefined && b !== undefined && c !== undefined
      ? (() => {
          const s = (a + b + c) / 2
          return Math.sqrt(Math.max(0, s * (s - a) * (s - b) * (s - c)))
        })()
      : undefined
  return withTriangleMetrics({ valid: true, sides: { a, b, c }, angles: { A, B, C }, area })
}

function withTriangleMetrics(result: TriangleResult): TriangleResult {
  const { a, b, c } = result.sides
  const area = result.area
  if (area === undefined || a === undefined || b === undefined || c === undefined) return result
  const semiperimeter = (a + b + c) / 2
  return { ...result, inradius: area / semiperimeter, circumradius: (a * b * c) / (4 * area) }
}

function triangleFromState(state: PrimitiveState, config: TrigConfig): NonNullable<TrigConfig['triangle']> {
  const source = { ...((config.triangle || {}) as Record<string, number | undefined>) }
  const triangleState = state.triangle && typeof state.triangle === 'object' ? state.triangle as Record<string, number | undefined> : {}
  for (const key of ['a', 'b', 'c', 'A', 'B', 'C']) {
    const value = state[key]
    if (typeof value === 'number') source[key] = value
  }
  return { ...source, ...triangleState }
}

function render(mode: string, derived: Record<string, unknown>): RenderModel {
  return {
    kind: 'trigonometry',
    space: mode === 'unit_circle' ? 'unit_circle' : 'triangle_scene',
    elements: [derived],
    labels: [],
  }
}

export const trigonometryPlugin: SandboxPlugin = {
  id: 'trigonometry.unit_circle',
  domainId: 'trigonometry',

  validateManifest(manifest) {
    const config = configOf(manifest)
    const issues: string[] = []
    if (!['unit_circle', 'triangle_solver', 'law_of_sines', 'law_of_cosines', 'measurement_model'].includes(config.mode || '')) issues.push('trigonometry.mode is invalid')
    if (config.mode === 'unit_circle' && (config.initialDegrees !== undefined && !Number.isFinite(config.initialDegrees))) issues.push('initialDegrees must be finite')
    if (config.mode !== 'unit_circle' && !config.triangle) issues.push('triangle configuration is required')
    if (manifest.scene.space !== 'unit_circle' && manifest.scene.space !== 'triangle_scene') issues.push('trigonometry requires unit_circle or triangle_scene')
    return issues
  },

  createInitialState(manifest): PrimitiveState {
    const config = configOf(manifest)
    return { degrees: config.initialDegrees || 0, triangle: config.triangle || {} }
  },

  recompute(manifest, state): RecomputeResult {
    const config = configOf(manifest)
    const mode = config.mode || 'unit_circle'
    const rawAngle = Number(state.degrees ?? config.initialDegrees ?? 0)
    const degrees = config.unit === 'radian' ? rawAngle * 180 / Math.PI : rawAngle
    const derived = mode === 'unit_circle'
      ? unitCircle(normalizeAngle(degrees))
      : { triangle: solveTriangle(triangleFromState(state, config)) }
    const triangle = (derived.triangle || {}) as TriangleResult
    const goals = manifest.goals.map(goal => {
      if (goal.evidence === 'unit_circle_value') {
        const expected = typeof goal.target === 'number' ? goal.target : undefined
        return { id: goal.id, required: goal.required !== false, reached: expected === undefined || angleEqual(Number((derived as JsonObject).degrees), expected), evidence: derived }
      }
      if (goal.evidence === 'triangle_valid') return { id: goal.id, required: goal.required !== false, reached: triangle.valid === true, evidence: triangle }
      if (goal.evidence === 'triangle_solved') {
        const solved = triangle.valid && Object.values(triangle.sides).every(value => value !== undefined) && Object.values(triangle.angles).every(value => value !== undefined)
        return { id: goal.id, required: goal.required !== false, reached: solved, evidence: triangle }
      }
      if (goal.evidence === 'measurement_consistent') {
        const expected = config.expectedMeasurement
        const actual = typeof state.measurement === 'number' ? state.measurement : undefined
        return { id: goal.id, required: goal.required !== false, reached: expected !== undefined && actual !== undefined && evaluateNumericAnswer(actual, expected, 1e-6).correct, evidence: actual }
      }
      return { id: goal.id, required: goal.required !== false, reached: false }
    })
    const feedback = goals.filter(goal => goal.reached).map(goal => ({
      id: goal.id,
      kind: 'goal' as const,
      message: mode === 'unit_circle' ? 'Giá trị lượng giác khớp với vị trí góc.' : 'Các đại lượng trong tam giác nhất quán.',
    }))
    return {
      state: structuredClone(state),
      derivedState: derived,
      goals,
      feedback,
      renderModel: render(mode, derived),
    }
  },

  render(manifest, derivedState) {
    return render(configOf(manifest).mode || 'unit_circle', derivedState)
  },

  getConstraints(manifest) {
    return configOf(manifest).mode === 'unit_circle'
      ? { degrees: { min: 0, max: 360, step: 1 } }
      : { triangleInequality: true, angleSum: 180 }
  },

  gradeStructuredStep(manifest, stepId, value) {
    const step = manifest.solutionGraph?.steps.find(item => item.id === stepId)
    return { correct: Boolean(step?.acceptedValues?.some(item => JSON.stringify(item) === JSON.stringify(value))) }
  },
}

export const triangleSolverPlugin: SandboxPlugin = { ...trigonometryPlugin, id: 'trigonometry.triangle_solver' }
export const lawOfSinesPlugin: SandboxPlugin = { ...trigonometryPlugin, id: 'trigonometry.law_of_sines' }
export const lawOfCosinesPlugin: SandboxPlugin = { ...trigonometryPlugin, id: 'trigonometry.law_of_cosines' }
export const measurementModelPlugin: SandboxPlugin = { ...trigonometryPlugin, id: 'trigonometry.measurement_model' }
