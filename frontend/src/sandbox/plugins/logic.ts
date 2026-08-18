import { compilePredicate } from '../evaluator'
import type { JsonObject, PrimitiveState, RecomputeResult, RenderModel, SandboxManifest } from '../types'
import type { SandboxPlugin } from '../registry'

interface LogicConfig {
  mode?: 'truth_table' | 'proposition_builder' | 'condition_graph'
  variables: string[]
  expression: string
  initialValues?: JsonObject
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

function renderModel(rows: JsonObject[], mode: string): RenderModel {
  return {
    kind: 'logic',
    space: mode === 'truth_table' ? 'truth_table' : 'condition_graph',
    elements: rows,
    labels: [],
  }
}

export const logicPlugin: SandboxPlugin = {
  id: 'logic.truth_table',
  domainId: 'logic',

  validateManifest(manifest) {
    const config = configOf(manifest)
    const issues: string[] = []
    if (!Array.isArray(config.variables) || config.variables.length === 0 || config.variables.length > 8) {
      issues.push('logic.variables must contain between 1 and 8 variables')
    }
    if (typeof config.expression !== 'string' || !config.expression.trim()) issues.push('logic.expression is required')
    if (manifest.scene.space !== 'truth_table') issues.push('logic plugin requires a truth_table scene')
    return issues
  },

  createInitialState(manifest): PrimitiveState {
    const config = configOf(manifest)
    const assignment: JsonObject = {}
    config.variables.forEach(variable => {
      assignment[variable] = config.initialValues?.[variable] === true
    })
    return { assignment, completedRows: [] }
  },

  recompute(manifest, state): RecomputeResult {
    const config = configOf(manifest)
    const expression = compilePredicate(config.expression)
    const assignment = { ...((state.assignment || {}) as Record<string, boolean>) }
    config.variables.forEach(variable => {
      if (typeof state[variable] === 'boolean') assignment[variable] = state[variable] as boolean
    })
    const truthValue = expression.evaluate(assignment)
    const rows = rowsFor(config.variables, expression)
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
      renderModel: renderModel(rows, config.mode || 'truth_table'),
    }
  },

  render(manifest, derivedState) {
    return renderModel((derivedState.rows || []) as JsonObject[], configOf(manifest).mode || 'truth_table')
  },

  getConstraints() {
    return { maxVariables: 8, assignmentValues: [false, true] }
  },

  gradeStructuredStep(manifest, stepId, value) {
    const target = manifest.solutionGraph?.steps.find(step => step.id === stepId)?.acceptedValues || []
    return { correct: target.some(item => JSON.stringify(item) === JSON.stringify(value)) }
  },
}

export const propositionBuilderPlugin: SandboxPlugin = {
  ...logicPlugin,
  id: 'logic.proposition_builder',
}

export const conditionGraphPlugin: SandboxPlugin = {
  ...logicPlugin,
  id: 'logic.condition_graph',
}
