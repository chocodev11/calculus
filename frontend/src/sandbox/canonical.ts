import type { FiniteSetValue, IntervalValue, MathValue } from './types'

export interface GradeResult {
  correct: boolean
  normalizedAnswer: unknown
  reason?: string
}

export function canonicalScalar(value: unknown): string {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Scalar must be finite')
    return Number(value.toFixed(12)).toString()
  }
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'string') return value.trim()
  return JSON.stringify(value)
}

export function canonicalSet(value: unknown): unknown[] {
  const source = value && typeof value === 'object' && (value as FiniteSetValue).kind === 'finite_set'
    ? (value as FiniteSetValue).elements
    : Array.isArray(value) ? value : null
  if (!source) throw new Error('Expected a finite set')
  const unique = new Map<string, unknown>()
  source.forEach(item => unique.set(canonicalScalar(item), item))
  return [...unique.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([, item]) => item)
}

export function setsEqual(left: unknown, right: unknown): boolean {
  const leftKeys = canonicalSet(left).map(canonicalScalar)
  const rightKeys = canonicalSet(right).map(canonicalScalar)
  return leftKeys.length === rightKeys.length && leftKeys.every((item, index) => item === rightKeys[index])
}

export function canonicalInterval(value: unknown): IntervalValue {
  if (!value || typeof value !== 'object' || (value as IntervalValue).kind !== 'interval') {
    throw new Error('Expected an interval')
  }
  const interval = value as IntervalValue
  const left = interval.left === null ? null : Number(interval.left)
  const right = interval.right === null ? null : Number(interval.right)
  if ((left !== null && !Number.isFinite(left)) || (right !== null && !Number.isFinite(right))) {
    throw new Error('Interval boundaries must be finite')
  }
  if (left !== null && right !== null && left > right) throw new Error('Interval boundaries are reversed')
  return {
    kind: 'interval',
    left,
    right,
    leftClosed: Boolean(interval.leftClosed),
    rightClosed: Boolean(interval.rightClosed),
  }
}

export function intervalsEqual(left: unknown, right: unknown, tolerance = 1e-9): boolean {
  const a = canonicalInterval(left)
  const b = canonicalInterval(right)
  const sameBoundary = (x: number | null, y: number | null) => x === null || y === null ? x === y : Math.abs(x - y) <= tolerance
  return sameBoundary(a.left, b.left)
    && sameBoundary(a.right, b.right)
    && a.leftClosed === b.leftClosed
    && a.rightClosed === b.rightClosed
}

export function normalizeAngle(degrees: number): number {
  if (!Number.isFinite(degrees)) throw new Error('Angle must be finite')
  const result = ((degrees % 360) + 360) % 360
  return Number(result.toFixed(12))
}

export function angleEqual(left: number, right: number, tolerance = 1e-9): boolean {
  const difference = Math.abs(normalizeAngle(left) - normalizeAngle(right))
  return Math.min(difference, 360 - difference) <= tolerance
}

export function evaluateNumericAnswer(answer: unknown, expected: number, tolerance = 1e-9): GradeResult {
  if (typeof answer !== 'number' || !Number.isFinite(answer)) {
    return { correct: false, normalizedAnswer: answer, reason: 'answer_must_be_finite_number' }
  }
  return {
    correct: Math.abs(answer - expected) <= tolerance,
    normalizedAnswer: Number(answer.toFixed(12)),
  }
}

export function valueToFiniteSet(value: unknown): FiniteSetValue {
  return { kind: 'finite_set', elements: canonicalSet(value) as MathValue[] }
}
