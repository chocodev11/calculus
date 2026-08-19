import { compilePredicate } from '../evaluator'
import type { JsonObject, PrimitiveState, RecomputeResult, RenderModel, SandboxManifest } from '../types'
import type { SandboxPlugin } from '../registry'

type LogicMode =
  | 'truth_table'
  | 'proposition_builder'
  | 'condition_graph'
  | 'proposition_classifier'
  | 'quantifier_negation'
  | 'implication'
  | 'parameter_implication'

interface LogicActivityItem {
  id: string
  label: string
  controlId?: string
  expectedType?: string
  expectedVerdict?: boolean | string
  expectedNegation?: string
  negationControlId?: string
  expectedWitness?: number | string
  witnessControlId?: string
  expectedEvidence?: string
  evidenceControlId?: string
  misconceptionId?: string
}

interface LogicActivity {
  items?: LogicActivityItem[]
  pExpression?: string
  qExpression?: string
  domainValues?: number[]
  pToQControlId?: string
  qToPControlId?: string
  pToQCounterexampleControlId?: string
  qToPCounterexampleControlId?: string
  contrapositiveControlId?: string
  expectedPToQ?: boolean
  expectedQToP?: boolean
  expectedContrapositive?: boolean
  expectedPToQCounterexample?: number | string
  expectedQToPCounterexample?: number | string
  parameterControlId?: string
  strategyControlId?: string
  expectedParameter?: number
  expectedStrategy?: string
}

interface LogicConfig {
  mode?: LogicMode
  variables?: string[]
  expression?: string
  initialValues?: JsonObject
  activity?: LogicActivity
}

function configOf(manifest: SandboxManifest): LogicConfig {
  return manifest.config as unknown as LogicConfig
}

function rowsFor(variables: string[], expression: ReturnType<typeof compilePredicate>) {
  const rows: JsonObject[] = []
  const count = 2 ** variables.length
  for (let mask = 0; mask < count; mask += 1) {
    const assignment: Record<string, boolean> = {}
    variables.forEach((variable, index) => {
      assignment[variable] = Boolean(mask & (1 << (variables.length - index - 1)))
    })
    rows.push({ ...assignment, result: expression.evaluate(assignment) })
  }
  return rows
}

function renderModel(rows: JsonObject[], mode: LogicMode, extra: JsonObject = {}): RenderModel {
  return {
    kind: 'logic',
    space: mode === 'truth_table' ? 'truth_table' : 'condition_graph',
    elements: rows,
    labels: [mode],
    ...extra,
  }
}

function stateInitials(manifest: SandboxManifest): PrimitiveState {
  const state: PrimitiveState = {}
  for (const control of manifest.controls) {
    if (control.initial !== undefined) state[control.id] = control.initial
  }
  return state
}

function sameChoice(actual: unknown, expected: unknown): boolean {
  if (typeof expected === 'boolean') return actual === expected || String(actual) === String(expected)
  return String(actual ?? '').trim() === String(expected ?? '').trim()
}

function goalResults(
  manifest: SandboxManifest,
  complete: boolean,
  evidence: unknown,
): RecomputeResult['goals'] {
  return manifest.goals.map(goal => {
    if (goal.evidence === 'structured_steps' || goal.evidence.startsWith('logic.')) {
      return { id: goal.id, required: goal.required !== false, reached: complete, evidence }
    }
    return { id: goal.id, required: goal.required !== false, reached: false, evidence }
  })
}

function activityFeedback(
  complete: boolean,
  incorrect: Array<{ id: string; message: string; misconceptionId?: string }>,
): RecomputeResult['feedback'] {
  if (complete) {
    return [{ id: 'logic-complete', kind: 'goal', message: 'Các bước suy luận đã đúng.' }]
  }
  return incorrect.map(item => ({
    id: `logic-feedback-${item.id}`,
    kind: 'misconception' as const,
    message: item.message,
    ...(item.misconceptionId ? { misconceptionId: item.misconceptionId } : {}),
  }))
}

function recomputeClassifier(manifest: SandboxManifest, state: PrimitiveState): RecomputeResult {
  const activity = configOf(manifest).activity || {}
  const items = activity.items || []
  const incorrect: Array<{ id: string; message: string; misconceptionId?: string }> = []
  const rows = items.map(item => {
    const selected = state[item.controlId || `class:${item.id}`]
    const correct = sameChoice(selected, item.expectedType)
    if (!correct) {
      incorrect.push({
        id: item.id,
        message: `${item.id}: hãy kiểm tra xem biến đã được gán giá trị hoặc lượng từ hóa chưa.`,
        misconceptionId: item.misconceptionId,
      })
    }
    return { id: item.id, statement: item.label, selected: selected ?? '', correct }
  })
  const complete = items.length > 0 && rows.every(row => row.correct)
  const render = renderModel(rows, 'proposition_classifier', { items })
  return {
    state: structuredClone(state),
    derivedState: { rows, complete },
    goals: goalResults(manifest, complete, rows),
    feedback: activityFeedback(complete, incorrect),
    renderModel: render,
  }
}

function recomputeQuantifier(manifest: SandboxManifest, state: PrimitiveState): RecomputeResult {
  const activity = configOf(manifest).activity || {}
  const items = activity.items || []
  const incorrect: Array<{ id: string; message: string; misconceptionId?: string }> = []
  const rows = items.map(item => {
    const verdict = state[item.controlId || `verdict:${item.id}`]
    const negation = item.negationControlId === undefined
      ? true
      : sameChoice(state[item.negationControlId || `negation:${item.id}`], item.expectedNegation)
    const witness = item.witnessControlId === undefined
      ? true
      : sameChoice(state[item.witnessControlId || `witness:${item.id}`], item.expectedWitness)
    const evidence = item.expectedEvidence === undefined
      ? true
      : sameChoice(state[item.evidenceControlId || `evidence:${item.id}`], item.expectedEvidence)
    const correct = sameChoice(verdict, item.expectedVerdict) && negation && witness && evidence
    if (!correct) {
      incorrect.push({
        id: item.id,
        message: `${item.id}: kiểm tra lại miền biến, lượng từ và phép đổi dấu khi phủ định.`,
        misconceptionId: item.misconceptionId,
      })
    }
    return {
      id: item.id,
      statement: item.label,
      verdict: verdict ?? '',
      negation: state[item.negationControlId || `negation:${item.id}`] ?? '',
      witness: state[item.witnessControlId || `witness:${item.id}`] ?? '',
      correct,
    }
  })
  const complete = items.length > 0 && rows.every(row => row.correct)
  return {
    state: structuredClone(state),
    derivedState: { rows, complete },
    goals: goalResults(manifest, complete, rows),
    feedback: activityFeedback(complete, incorrect),
    renderModel: renderModel(rows, 'quantifier_negation', { items }),
  }
}

function predicateRows(activity: LogicActivity): JsonObject[] {
  if (!activity.pExpression || !activity.qExpression || !Array.isArray(activity.domainValues)) return []
  const p = compilePredicate(activity.pExpression)
  const q = compilePredicate(activity.qExpression)
  return activity.domainValues.map(value => ({
    value,
    P: p.evaluate({ x: value, n: value }),
    Q: q.evaluate({ x: value, n: value }),
  }))
}

function recomputeImplication(manifest: SandboxManifest, state: PrimitiveState): RecomputeResult {
  const activity = configOf(manifest).activity || {}
  const rows = predicateRows(activity)
  const implicationRows = rows as Array<{ value: number; P: boolean; Q: boolean }>
  const expectedPToQ = activity.expectedPToQ ?? implicationRows.every(row => !row.P || row.Q)
  const expectedQToP = activity.expectedQToP ?? implicationRows.every(row => !row.Q || row.P)
  const pToQCounterexamples = implicationRows.filter(row => row.P && !row.Q).map(row => row.value)
  const qToPCounterexamples = implicationRows.filter(row => row.Q && !row.P).map(row => row.value)
  const pToQControlId = activity.pToQControlId || 'p-to-q'
  const qToPControlId = activity.qToPControlId || 'q-to-p'
  const pToQCounterexampleControlId = activity.pToQCounterexampleControlId || 'p-to-q-counterexample'
  const qToPCounterexampleControlId = activity.qToPCounterexampleControlId || 'q-to-p-counterexample'
  const contrapositiveControlId = activity.contrapositiveControlId || 'contrapositive'
  const pToQCorrect = sameChoice(state[pToQControlId], expectedPToQ ? 'Đúng' : 'Sai')
    && (activity.expectedPToQCounterexample === undefined
      || sameChoice(state[pToQCounterexampleControlId], activity.expectedPToQCounterexample))
  const qToPCorrect = sameChoice(state[qToPControlId], expectedQToP ? 'Đúng' : 'Sai')
    && (activity.expectedQToPCounterexample === undefined
      || sameChoice(state[qToPCounterexampleControlId], activity.expectedQToPCounterexample))
  const hasContrapositive = activity.expectedContrapositive !== undefined || activity.contrapositiveControlId !== undefined
  const expectedContrapositive = activity.expectedContrapositive ?? expectedPToQ
  const contrapositiveCorrect = !hasContrapositive || sameChoice(state[contrapositiveControlId], expectedContrapositive ? 'Đúng' : 'Sai')
  const necessary = expectedQToP && !expectedPToQ
  const sufficient = expectedPToQ && !expectedQToP
  const rowsWithResult = implicationRows.map(row => ({
    ...row,
    pImpliesQ: !row.P || row.Q,
    qImpliesP: !row.Q || row.P,
  }))
  const complete = pToQCorrect && qToPCorrect && contrapositiveCorrect
  const incorrect = []
  if (!pToQCorrect) incorrect.push({ id: 'p-to-q', message: 'Kiểm tra dòng P đúng nhưng Q sai; đó là điều kiện làm mệnh đề kéo theo sai.', misconceptionId: 'logic.reverse_implication' })
  if (!qToPCorrect) incorrect.push({ id: 'q-to-p', message: 'Mệnh đề đảo phải được kiểm tra độc lập; không được suy ra chỉ bằng cách đổi tên P và Q.', misconceptionId: 'logic.confuse_converse_with_contrapositive' })
  if (!contrapositiveCorrect) incorrect.push({ id: 'contrapositive', message: 'Phản đảo của P ⇒ Q là ¬Q ⇒ ¬P và luôn tương đương với mệnh đề ban đầu.', misconceptionId: 'logic.confuse_converse_with_contrapositive' })
  return {
    state: structuredClone(state),
    derivedState: {
      rows: rowsWithResult,
      complete,
      pToQ: expectedPToQ,
      qToP: expectedQToP,
      contrapositive: expectedContrapositive,
      necessary,
      sufficient,
      pToQCounterexamples,
      qToPCounterexamples,
    },
    goals: goalResults(manifest, complete, { pToQ: expectedPToQ, qToP: expectedQToP, necessary, sufficient }),
    feedback: activityFeedback(complete, incorrect),
    renderModel: renderModel(rowsWithResult, 'implication', {
      expectedPToQ,
      expectedQToP,
      pToQCounterexamples,
      qToPCounterexamples,
      domain: activity.domainValues,
      pToQCorrect,
      qToPCorrect,
    }),
  }
}

function recomputeParameter(manifest: SandboxManifest, state: PrimitiveState): RecomputeResult {
  const activity = configOf(manifest).activity || {}
  const parameterControlId = activity.parameterControlId || 'parameter'
  const strategyControlId = activity.strategyControlId || 'strategy'
  const parameter = Number(state[parameterControlId])
  const expectedParameter = activity.expectedParameter
  const parameterCorrect = Number.isFinite(parameter) && expectedParameter !== undefined && parameter === expectedParameter
  const strategyCorrect = activity.expectedStrategy === undefined || sameChoice(state[strategyControlId], activity.expectedStrategy)
  const complete = parameterCorrect && strategyCorrect
  const roots = [1, parameter]
  const rows = [{
    parameter: Number.isFinite(parameter) ? parameter : '',
    roots: roots.map(root => (Number.isFinite(root) ? root : '?')).join(', '),
    implication: parameterCorrect ? 'Đúng' : 'Sai',
    counterexample: parameterCorrect ? 'không có' : parameter,
  }]
  const incorrect = []
  if (!parameterCorrect) incorrect.push({ id: 'parameter', message: 'Phân tích nghiệm tổng quát trước, rồi mới chọn giá trị tham số.', misconceptionId: 'logic.forget_all_parameter_cases' })
  if (!strategyCorrect) incorrect.push({ id: 'strategy', message: 'Thử vài giá trị không đủ để chứng minh mệnh đề với mọi x; cần phân tích nghiệm hoặc tìm phản ví dụ.', misconceptionId: 'logic.single_example_proves_claim' })
  return {
    state: structuredClone(state),
    derivedState: { rows, complete, parameter, roots, implication: parameterCorrect },
    goals: goalResults(manifest, complete, { parameter, roots, implication: parameterCorrect }),
    feedback: activityFeedback(complete, incorrect),
    renderModel: renderModel(rows, 'parameter_implication', { parameter, roots, complete, parameterCorrect }),
  }
}

export const logicPlugin: SandboxPlugin = {
  id: 'logic.truth_table',
  domainId: 'logic',

  validateManifest(manifest) {
    const config = configOf(manifest)
    const mode = config.mode || 'truth_table'
    const issues: string[] = []
    const supportedGoalEvidence = new Set([
      'structured_steps',
      'logic.classifier_complete',
      'logic.quantifier_complete',
      'logic.implication_complete',
      'logic.parameter_complete',
    ])
    manifest.goals.forEach(goal => {
      if (goal.evidence.startsWith('logic.') && !supportedGoalEvidence.has(goal.evidence)) {
        issues.push(`Unsupported logic goal evidence: ${goal.evidence}`)
      }
    })
    const activityModes = new Set(['proposition_classifier', 'quantifier_negation', 'implication', 'parameter_implication'])
    if (activityModes.has(mode)) {
      if (!config.activity || !Array.isArray(config.activity.items) && mode !== 'implication' && mode !== 'parameter_implication') {
        issues.push(`logic.${mode} requires activity.items`)
      }
      if (manifest.scene.space !== 'condition_graph') issues.push(`logic.${mode} requires a condition_graph scene`)
      if (mode === 'implication' && (!config.activity?.pExpression || !config.activity?.qExpression || !Array.isArray(config.activity.domainValues))) {
        issues.push('logic.implication requires pExpression, qExpression and domainValues')
      }
      if (mode === 'parameter_implication' && config.activity?.expectedParameter === undefined) {
        issues.push('logic.parameter_implication requires expectedParameter')
      }
      return issues
    }
    if (!Array.isArray(config.variables) || config.variables.length === 0 || config.variables.length > 8) {
      issues.push('logic.variables must contain between 1 and 8 variables')
    }
    if (typeof config.expression !== 'string' || !config.expression.trim()) issues.push('logic.expression is required')
    if (manifest.scene.space !== 'truth_table') issues.push('logic plugin requires a truth_table scene')
    return issues
  },

  createInitialState(manifest): PrimitiveState {
    const config = configOf(manifest)
    const mode = config.mode || 'truth_table'
    if (mode === 'proposition_classifier' || mode === 'quantifier_negation' || mode === 'implication' || mode === 'parameter_implication') {
      return stateInitials(manifest)
    }
    const assignment: JsonObject = {}
    for (const variable of config.variables || []) {
      assignment[variable] = config.initialValues?.[variable] === true
    }
    return { assignment, completedRows: [] }
  },

  recompute(manifest, state): RecomputeResult {
    const mode = configOf(manifest).mode || 'truth_table'
    if (mode === 'proposition_classifier') return recomputeClassifier(manifest, state)
    if (mode === 'quantifier_negation') return recomputeQuantifier(manifest, state)
    if (mode === 'implication') return recomputeImplication(manifest, state)
    if (mode === 'parameter_implication') return recomputeParameter(manifest, state)

    const config = configOf(manifest)
    const expression = compilePredicate(config.expression || '')
    const assignment = { ...((state.assignment || {}) as Record<string, boolean>) }
    for (const variable of config.variables || []) {
      if (typeof state[variable] === 'boolean') assignment[variable] = state[variable] as boolean
    }
    const truthValue = expression.evaluate(assignment)
    const rows = rowsFor(config.variables || [], expression)
    const completedRows = Array.isArray(state.completedRows) ? state.completedRows : []
    const goals = manifest.goals.map(goal => {
      if (goal.evidence === 'truth_value') {
        return { id: goal.id, required: goal.required !== false, reached: goal.target === truthValue, evidence: truthValue }
      }
      if (goal.evidence === 'truth_table_complete') {
        return { id: goal.id, required: goal.required !== false, reached: completedRows.length >= rows.length, evidence: completedRows.length }
      }
      return { id: goal.id, required: goal.required !== false, reached: false }
    })
    const feedback = goals.filter(goal => goal.reached).map(goal => ({
      id: goal.id,
      kind: 'goal' as const,
      message: 'Mệnh đề đạt điều kiện của hoạt động.',
    }))
    return {
      state: structuredClone(state),
      derivedState: { assignment, truthValue, rows },
      goals,
      feedback,
      renderModel: renderModel(rows, mode),
    }
  },

  render(manifest, derivedState) {
    return renderModel((derivedState.rows || []) as JsonObject[], configOf(manifest).mode || 'truth_table')
  },

  getConstraints(manifest) {
    const mode = configOf(manifest).mode || 'truth_table'
    if (mode === 'implication') return { finiteDomainRequired: true, counterexampleRequired: true }
    if (mode === 'quantifier_negation') return { quantifierNegation: true, domainRequired: true }
    if (mode === 'parameter_implication') return { parameterCasesRequired: true, counterexampleRequired: true }
    return { maxVariables: 8, assignmentValues: [false, true] }
  },

  gradeStructuredStep(manifest, stepId, value) {
    const target = manifest.solutionGraph?.steps.find(step => step.id === stepId)?.acceptedValues || []
    return { correct: target.some(item => JSON.stringify(item) === JSON.stringify(value)) }
  },
}

export const propositionBuilderPlugin: SandboxPlugin = { ...logicPlugin, id: 'logic.proposition_builder' }
export const conditionGraphPlugin: SandboxPlugin = { ...logicPlugin, id: 'logic.condition_graph' }
export const propositionPlugin: SandboxPlugin = { ...logicPlugin, id: 'logic.proposition' }
export const quantifierPlugin: SandboxPlugin = { ...logicPlugin, id: 'logic.quantifier' }
export const implicationPlugin: SandboxPlugin = { ...logicPlugin, id: 'logic.implication' }
export const necessarySufficientPlugin: SandboxPlugin = { ...logicPlugin, id: 'logic.necessary_sufficient' }
export const parameterTruthPlugin: SandboxPlugin = { ...logicPlugin, id: 'logic.parameter_truth' }
