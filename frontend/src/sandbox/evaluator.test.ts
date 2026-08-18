import { describe, expect, it } from 'vitest'
import { compileExpression, compilePredicate, EvaluationError } from './evaluator'

describe('safe evaluator', () => {
  it('evaluates arithmetic, boolean predicates and arrays', () => {
    expect(compileExpression('2 * (x + 1)^2').evaluate({ x: 3 })).toBe(32)
    expect(compilePredicate('p && !q').evaluate({ p: true, q: false })).toBe(true)
    expect(compileExpression('[x, x^2]').evaluate({ x: 3 })).toEqual([3, 9])
  })

  it('supports finite set operations without JavaScript execution', () => {
    expect(compileExpression('contains(union(set(1, 2), set(2, 3)), 3)').evaluate()).toBe(true)
  })

  it('rejects member access and unknown functions', () => {
    expect(() => compileExpression('Math.sin(x)')).toThrow(EvaluationError)
    expect(() => compileExpression('fetch(x)')).toThrow(/not allowed/)
    expect(() => compileExpression('globalThis')).toThrow(/not allowed/)
  })

  it('rejects invalid domains and non-finite values', () => {
    expect(() => compileExpression('sqrt(-1)').evaluate()).toThrow(/undefined/)
    expect(() => compileExpression('1 / 0').evaluate()).toThrow(/zero/)
    expect(() => compileExpression('10^10000').evaluate()).toThrow(/non-finite/)
  })
})
