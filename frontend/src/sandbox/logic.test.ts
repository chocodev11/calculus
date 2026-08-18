import { describe, expect, it } from 'vitest'
import { compilePredicate } from './evaluator'
import { createSession, defaultSandboxRegistry } from './index'
import type { JsonObject, SandboxManifest } from './types'

function manifest(config: JsonObject, recipe: string, controls: SandboxManifest['controls']): SandboxManifest {
  return {
    schemaVersion: '1.0',
    kind: 'math.sandbox',
    id: `logic-test-${recipe}`,
    version: '1.0.0',
    domainId: 'logic',
    archetypeId: recipe,
    level: 'application',
    recipe,
    outcomeIds: ['M10-SET-01'],
    prerequisites: [],
    misconceptions: [],
    scene: { space: 'condition_graph' },
    controls,
    goals: [{ id: 'complete', evidence: 'structured_steps' }],
    assessment: [],
    accessibility: { keyboardControls: true, textAlternative: 'logic test', highContrast: true },
    config,
  }
}

describe('logic sandbox activities', () => {
  it('evaluates divisibility through the safe AST evaluator', () => {
    expect(compilePredicate('divisible(x, 6)').evaluate({ x: 12 })).toBe(true)
    expect(compilePredicate('divisible(x, 6)').evaluate({ x: 10 })).toBe(false)
  })

  it('grades proposition classification with variable awareness', () => {
    const lesson = manifest({
      mode: 'proposition_classifier',
      activity: { items: [{ id: 'a', label: 'x > 0', controlId: 'class:a', expectedType: 'open_sentence' }] },
    }, 'logic.proposition', [{ id: 'class:a', type: 'choice', label: 'a', initial: '', options: ['', 'open_sentence'] }])
    const session = createSession(lesson, defaultSandboxRegistry)
    session.dispatch({ type: 'set_control', controlId: 'class:a', value: 'open_sentence' })
    expect(session.snapshot().goals[0].reached).toBe(true)
  })

  it('requires both implication direction and a counterexample', () => {
    const lesson = manifest({
      mode: 'implication',
      activity: {
        pExpression: 'divisible(x, 6)',
        qExpression: 'divisible(x, 2)',
        domainValues: [2, 4, 6],
        expectedPToQ: true,
        expectedQToP: false,
        expectedPToQCounterexample: 'none',
        expectedQToPCounterexample: '4',
      },
    }, 'logic.implication', [
      { id: 'p-to-q', type: 'choice', label: 'P ⇒ Q', initial: '', options: ['', 'Đúng', 'Sai'] },
      { id: 'p-to-q-counterexample', type: 'choice', label: 'P ⇒ Q phản ví dụ', initial: 'none', options: ['none', '2', '4', '6'] },
      { id: 'q-to-p', type: 'choice', label: 'Q ⇒ P', initial: '', options: ['', 'Đúng', 'Sai'] },
      { id: 'q-to-p-counterexample', type: 'choice', label: 'Q ⇒ P phản ví dụ', initial: 'none', options: ['none', '2', '4', '6'] },
    ])
    const session = createSession(lesson, defaultSandboxRegistry)
    session.dispatch({ type: 'set_control', controlId: 'p-to-q', value: 'Đúng' })
    session.dispatch({ type: 'set_control', controlId: 'q-to-p', value: 'Sai' })
    session.dispatch({ type: 'set_control', controlId: 'q-to-p-counterexample', value: '4' })
    expect(session.snapshot().goals[0].reached).toBe(true)
  })

  it('grades the contrapositive as equivalent to the original implication', () => {
    const lesson = manifest({
      mode: 'implication',
      activity: {
        pExpression: 'divisible(x, 6)',
        qExpression: 'divisible(x, 2)',
        domainValues: [2, 4, 6, 12],
        expectedPToQ: true,
        expectedQToP: false,
        expectedContrapositive: true,
        contrapositiveControlId: 'contra',
      },
    }, 'logic.implication', [
      { id: 'p-to-q', type: 'choice', label: 'P ⇒ Q', initial: 'Đúng', options: ['Đúng', 'Sai'] },
      { id: 'q-to-p', type: 'choice', label: 'Q ⇒ P', initial: 'Sai', options: ['Đúng', 'Sai'] },
      { id: 'contra', type: 'choice', label: '¬Q ⇒ ¬P', initial: 'Đúng', options: ['Đúng', 'Sai'] },
    ])
    const session = createSession(lesson, defaultSandboxRegistry)
    expect(session.snapshot().derivedState.contrapositive).toBe(true)
    expect(session.snapshot().goals[0].reached).toBe(true)
  })

  it('grades quantified statements, negations and witnesses together', () => {
    const lesson = manifest({
      mode: 'quantifier_negation',
      activity: {
        items: [{
          id: 'root',
          label: '∃x∈R: x²−6x+5=0',
          controlId: 'verdict:root',
          expectedVerdict: 'Đúng',
          expectedNegation: '∀x∈R: x²−6x+5 ≠ 0',
          negationControlId: 'negation:root',
          expectedWitness: 1,
          witnessControlId: 'witness:root',
        }],
      },
    }, 'logic.quantifier', [
      { id: 'verdict:root', type: 'choice', label: 'Đúng sai', initial: '', options: ['', 'Đúng', 'Sai'] },
      { id: 'negation:root', type: 'choice', label: 'Phủ định', initial: '', options: ['', '∀x∈R: x²−6x+5 ≠ 0'] },
      { id: 'witness:root', type: 'numeric_input', label: 'Nghiệm', min: -10, max: 10, step: 1, initial: 1 },
    ])
    const session = createSession(lesson, defaultSandboxRegistry)
    session.dispatch({ type: 'set_control', controlId: 'verdict:root', value: 'Đúng' })
    session.dispatch({ type: 'set_control', controlId: 'negation:root', value: '∀x∈R: x²−6x+5 ≠ 0' })
    expect(session.snapshot().goals[0].reached).toBe(true)
  })

  it('requires a general parameter argument instead of a few samples', () => {
    const lesson = manifest({
      mode: 'parameter_implication',
      activity: { parameterControlId: 'parameter', strategyControlId: 'strategy', expectedParameter: 1, expectedStrategy: 'factor_then_check' },
    }, 'logic.parameter_truth', [
      { id: 'parameter', type: 'numeric_input', label: 'm', min: -3, max: 3, step: 1, initial: 0 },
      { id: 'strategy', type: 'choice', label: 'Chiến lược', initial: '', options: ['', 'factor_then_check'] },
    ])
    const session = createSession(lesson, defaultSandboxRegistry)
    session.dispatch({ type: 'set_control', controlId: 'parameter', value: 1 })
    session.dispatch({ type: 'set_control', controlId: 'strategy', value: 'factor_then_check' })
    expect(session.snapshot().derivedState.roots).toEqual([1, 1])
    expect(session.snapshot().goals[0].reached).toBe(true)
  })
})
