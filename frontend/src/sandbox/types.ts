export type SandboxLevel =
  | 'recognition'
  | 'understanding'
  | 'application'
  | 'advanced_application'

export type SandboxDomain = 'logic' | 'set' | 'trigonometry'

export type JsonPrimitive = string | number | boolean | null
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[]
export type JsonObject = { [key: string]: JsonValue }

export interface RationalValue {
  kind: 'rational'
  numerator: number
  denominator: number
}

export interface AngleValue {
  kind: 'angle'
  degrees: number
  unit: 'degree' | 'radian'
}

export interface IntervalValue {
  kind: 'interval'
  left: number | null
  right: number | null
  leftClosed: boolean
  rightClosed: boolean
}

export interface FiniteSetValue {
  kind: 'finite_set'
  elements: MathValue[]
}

export interface PointValue {
  kind: 'point'
  x: number
  y: number
}

export interface VectorValue {
  kind: 'vector'
  x: number
  y: number
}

export type MathValue =
  | boolean
  | number
  | RationalValue
  | AngleValue
  | IntervalValue
  | FiniteSetValue
  | PointValue
  | VectorValue

export type GoalEvidence =
  | 'truth_value'
  | 'truth_table_complete'
  | 'unit_circle_value'
  | 'set_equal'
  | 'interval_equal'
  | 'triangle_valid'
  | 'triangle_solved'
  | 'measurement_consistent'
  | 'structured_steps'
  | `${string}.${string}`

export type PrimitiveState = JsonObject

export interface SceneSpec {
  space: 'truth_table' | 'condition_graph' | 'venn_plane' | 'number_line' | 'unit_circle' | 'triangle_scene'
}

export interface ControlSpec {
  id: string
  type: 'slider' | 'numeric_input' | 'choice' | 'toggle' | 'drag_item' | 'reset'
  label: string
  min?: number
  max?: number
  step?: number
  initial?: JsonValue
  options?: JsonValue[]
}

export interface GoalSpec {
  id: string
  evidence: GoalEvidence
  target?: JsonValue
  required?: boolean
}

export interface SolutionStepSpec {
  id: string
  kind: 'select' | 'transform' | 'justify' | 'calculate' | 'check'
  dependsOn?: string[]
  acceptedValues?: JsonValue[]
  misconceptionIds?: string[]
  hint?: string
}

export interface SolutionGraphSpec {
  steps: SolutionStepSpec[]
  terminalStepIds: string[]
}

export interface AccessibilitySpec {
  keyboardControls: boolean
  textAlternative: string
  highContrast: boolean
}

export interface AssessmentSpec {
  id: string
  type:
    | 'choice'
    | 'boolean'
    | 'boolean_group'
    | 'set'
    | 'interval'
    | 'numeric'
    | 'fraction'
    | 'expression'
    | 'angle'
    | 'quantity'
    | 'ordered_steps'
    | 'structured_reasoning'
  prompt: string
  outcomeIds: string[]
  misconceptionIds?: string[]
  grading?: JsonObject
}

export interface SandboxManifest {
  schemaVersion: '1.0'
  kind: 'math.sandbox'
  id: string
  version: string
  domainId: SandboxDomain
  archetypeId: string
  level: SandboxLevel
  recipe: string
  outcomeIds: string[]
  prerequisites: string[]
  misconceptions: string[]
  scene: SceneSpec
  controls: ControlSpec[]
  goals: GoalSpec[]
  solutionGraph?: SolutionGraphSpec
  assessment: AssessmentSpec[]
  accessibility: AccessibilitySpec
  config: JsonObject
  feedback?: JsonObject
  analytics?: string[]
  prompt?: string
}

export interface ValidationIssue {
  path: string
  message: string
  code: string
}

export interface ValidationResult {
  valid: boolean
  issues: ValidationIssue[]
}

export interface GoalResult {
  id: string
  reached: boolean
  required: boolean
  evidence?: unknown
}

export interface FeedbackResult {
  id: string
  message: string
  misconceptionId?: string
  kind: 'hint' | 'misconception' | 'invariant' | 'goal'
}

export interface RenderModel {
  kind: string
  space: string
  elements: unknown[]
  labels: unknown[]
}

export interface RecomputeResult {
  state: PrimitiveState
  derivedState: Record<string, unknown>
  goals: GoalResult[]
  feedback: FeedbackResult[]
  renderModel: RenderModel
}

export interface SandboxSnapshot extends RecomputeResult {
  manifestId: string
  manifestVersion: string
  historyDepth: number
}

export type SandboxAction =
  | { type: 'set_control'; controlId: string; value: JsonValue }
  | { type: 'select'; targetId: string; value: JsonValue }
  | { type: 'submit_step'; stepId: string; value: JsonValue }
  | { type: 'show_hint'; hintId?: string }
  | { type: 'reset' }
  | { type: 'undo' }

export interface RuntimeEvent {
  id: string
  sessionId: string
  manifestId: string
  manifestVersion: string
  type: string
  sequence: number
  payload: JsonObject
  occurredAt: string
}

export interface RuntimeHooks {
  onEvent?: (event: RuntimeEvent) => void
}
