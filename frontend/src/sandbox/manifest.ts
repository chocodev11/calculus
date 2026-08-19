import type {
  ControlSpec,
  JsonObject,
  SandboxManifest,
  ValidationIssue,
  ValidationResult,
} from './types'
import Ajv from 'ajv'
import manifestSchema from './manifest.schema.json'

const MAX_MANIFEST_BYTES = 100_000
const MAX_CONTROLS = 32
const MAX_GOALS = 32
const MAX_ASSESSMENTS = 64
const LEVELS = new Set(['recognition', 'understanding', 'application', 'advanced_application'])
const DOMAINS = new Set(['logic', 'set', 'trigonometry'])
const GOAL_EVIDENCE = new Set(['truth_value', 'truth_table_complete', 'unit_circle_value', 'set_equal', 'interval_equal', 'triangle_valid', 'triangle_solved', 'measurement_consistent', 'structured_steps'])
const ASSESSMENT_TYPES = new Set(['choice', 'boolean', 'boolean_group', 'set', 'interval', 'numeric', 'fraction', 'expression', 'angle', 'quantity', 'ordered_steps', 'structured_reasoning'])
const schemaValidator = new Ajv({ allErrors: true, strict: false }).compile(manifestSchema)

function issue(path: string, code: string, message: string): ValidationIssue {
  return { path, code, message }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function isJsonSafe(value: unknown, depth = 0): boolean {
  if (depth > 64 || value === undefined || typeof value === 'function' || typeof value === 'symbol' || typeof value === 'bigint') return false
  if (typeof value === 'number') return Number.isFinite(value)
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true
  if (Array.isArray(value)) return value.every(item => isJsonSafe(item, depth + 1))
  if (!isObject(value)) return false
  return Object.entries(value).every(([key, item]) => typeof key === 'string' && isJsonSafe(item, depth + 1))
}

function stringAt(value: Record<string, unknown>, key: string): string | null {
  return typeof value[key] === 'string' && value[key] ? value[key] as string : null
}

function isNamespacedEvidence(value: unknown): value is string {
  return typeof value === 'string' && /^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/.test(value)
}

function validateControl(value: unknown, index: number): ValidationIssue[] {
  const path = `controls[${index}]`
  if (!isObject(value)) return [issue(path, 'invalid_control', 'Control must be an object')]
  const issues: ValidationIssue[] = []
  if (!stringAt(value, 'id')) issues.push(issue(`${path}.id`, 'missing_id', 'Control id is required'))
  if (!stringAt(value, 'label')) issues.push(issue(`${path}.label`, 'missing_label', 'Control label is required'))
  const allowed = new Set(['slider', 'numeric_input', 'choice', 'toggle', 'drag_item', 'reset'])
  if (typeof value.type !== 'string' || !allowed.has(value.type)) {
    issues.push(issue(`${path}.type`, 'invalid_control_type', 'Unsupported control type'))
  }
  if (value.min !== undefined && typeof value.min !== 'number') issues.push(issue(`${path}.min`, 'invalid_number', 'min must be numeric'))
  if (value.max !== undefined && typeof value.max !== 'number') issues.push(issue(`${path}.max`, 'invalid_number', 'max must be numeric'))
  if (typeof value.min === 'number' && typeof value.max === 'number' && value.min > value.max) {
    issues.push(issue(path, 'invalid_range', 'min must not be greater than max'))
  }
  if (value.step !== undefined && (typeof value.step !== 'number' || value.step <= 0)) {
    issues.push(issue(`${path}.step`, 'invalid_step', 'step must be positive'))
  }
  return issues
}

function uniqueStrings(values: unknown, path: string): ValidationIssue[] {
  if (!Array.isArray(values) || values.some(item => typeof item !== 'string' || !item)) {
    return [issue(path, 'invalid_string_list', 'Expected a list of non-empty strings')]
  }
  if (new Set(values).size !== values.length) return [issue(path, 'duplicate_id', 'Values must be unique')]
  return []
}

export function validateManifest(input: unknown): ValidationResult {
  const issues: ValidationIssue[] = []
  if (!isObject(input)) return { valid: false, issues: [issue('$', 'invalid_manifest', 'Manifest must be an object')] }

  if (!schemaValidator(input)) {
    for (const error of schemaValidator.errors || []) {
      issues.push(issue(error.instancePath || '$', 'schema_error', error.message || 'Schema validation failed'))
    }
  }

  if (!isJsonSafe(input)) issues.push(issue('$', 'non_json_value', 'Manifest may contain JSON values only'))

  try {
    const bytes = new TextEncoder().encode(JSON.stringify(input)).length
    if (bytes > MAX_MANIFEST_BYTES) issues.push(issue('$', 'manifest_too_large', `Manifest exceeds ${MAX_MANIFEST_BYTES} bytes`))
  } catch {
    issues.push(issue('$', 'not_serializable', 'Manifest must be JSON serializable'))
  }

  if (input.schemaVersion !== '1.0') issues.push(issue('schemaVersion', 'unsupported_schema', 'Only schemaVersion 1.0 is supported'))
  if (input.kind !== 'math.sandbox') issues.push(issue('kind', 'invalid_kind', 'kind must be math.sandbox'))
  for (const key of ['id', 'version', 'archetypeId', 'recipe']) {
    if (!stringAt(input, key)) issues.push(issue(key, 'missing_string', `${key} is required`))
  }
  if (typeof input.domainId !== 'string' || !DOMAINS.has(input.domainId)) issues.push(issue('domainId', 'invalid_domain', 'Unsupported sandbox domain'))
  if (typeof input.level !== 'string' || !LEVELS.has(input.level)) issues.push(issue('level', 'invalid_level', 'Unsupported difficulty level'))

  for (const key of ['outcomeIds', 'prerequisites', 'misconceptions']) issues.push(...uniqueStrings(input[key], key))
  if (Array.isArray(input.outcomeIds) && input.outcomeIds.length === 0) issues.push(issue('outcomeIds', 'outcomes_required', 'At least one outcome is required'))
  if (!isObject(input.scene) || typeof input.scene.space !== 'string') issues.push(issue('scene', 'invalid_scene', 'scene.space is required'))
  if (!isObject(input.config)) issues.push(issue('config', 'invalid_config', 'config is required'))

  if (!Array.isArray(input.controls)) issues.push(issue('controls', 'invalid_controls', 'controls must be an array'))
  else {
    if (input.controls.length > MAX_CONTROLS) issues.push(issue('controls', 'too_many_controls', 'Too many controls'))
    const ids = new Set<string>()
    input.controls.forEach((control, index) => {
      issues.push(...validateControl(control, index))
      if (isObject(control) && typeof control.id === 'string') {
        if (ids.has(control.id)) issues.push(issue(`controls[${index}].id`, 'duplicate_id', 'Control ids must be unique'))
        ids.add(control.id)
      }
    })
  }

  if (!Array.isArray(input.goals)) issues.push(issue('goals', 'invalid_goals', 'goals must be an array'))
  else {
    if (input.goals.length > MAX_GOALS) issues.push(issue('goals', 'too_many_goals', 'Too many goals'))
    const ids = new Set<string>()
    input.goals.forEach((goal, index) => {
      if (!isObject(goal) || typeof goal.id !== 'string' || typeof goal.evidence !== 'string') {
        issues.push(issue(`goals[${index}]`, 'invalid_goal', 'Goal id and evidence are required'))
      } else if (!GOAL_EVIDENCE.has(goal.evidence) && !isNamespacedEvidence(goal.evidence)) {
        issues.push(issue(`goals[${index}].evidence`, 'invalid_goal_evidence', 'Unsupported goal evidence'))
      } else if (ids.has(goal.id)) {
        issues.push(issue(`goals[${index}].id`, 'duplicate_id', 'Goal ids must be unique'))
      } else {
        ids.add(goal.id)
      }
    })
  }

  if (!Array.isArray(input.assessment)) issues.push(issue('assessment', 'invalid_assessment', 'assessment must be an array'))
  else {
    if (input.assessment.length > MAX_ASSESSMENTS) issues.push(issue('assessment', 'too_many_assessments', 'Too many assessment items'))
    const ids = new Set<string>()
    input.assessment.forEach((item, index) => {
      if (!isObject(item) || typeof item.id !== 'string' || typeof item.type !== 'string' || typeof item.prompt !== 'string') {
        issues.push(issue(`assessment[${index}]`, 'invalid_assessment_item', 'Assessment id, type and prompt are required'))
      } else if (!ASSESSMENT_TYPES.has(item.type)) {
        issues.push(issue(`assessment[${index}].type`, 'invalid_assessment_type', 'Unsupported assessment type'))
      } else if (ids.has(item.id)) {
        issues.push(issue(`assessment[${index}].id`, 'duplicate_id', 'Assessment ids must be unique'))
      } else {
        ids.add(item.id)
      }
    })
  }

  if (Array.isArray(input.outcomeIds) && input.outcomeIds.length > 0
    && Array.isArray(input.goals) && input.goals.length === 0
    && Array.isArray(input.assessment) && input.assessment.length === 0
    && !isObject(input.solutionGraph)) {
    issues.push(issue('solutionGraph', 'solution_contract_required', 'A lesson needs goals, assessment or solutionGraph'))
  }

  if (!isObject(input.accessibility)) issues.push(issue('accessibility', 'invalid_accessibility', 'Accessibility contract is required'))
  else {
    if (input.accessibility.keyboardControls !== true) issues.push(issue('accessibility.keyboardControls', 'keyboard_required', 'Keyboard controls are required'))
    if (typeof input.accessibility.textAlternative !== 'string' || !input.accessibility.textAlternative) {
      issues.push(issue('accessibility.textAlternative', 'text_alternative_required', 'A text alternative is required'))
    }
  }

  return { valid: issues.length === 0, issues }
}

export function loadManifest(input: unknown): SandboxManifest {
  const migrated = migrateManifest(input)
  const result = validateManifest(migrated)
  if (!result.valid) {
    throw new Error(result.issues.map(item => `${item.path}: ${item.message}`).join('; '))
  }
  return structuredClone(migrated) as SandboxManifest
}

export function migrateManifest(input: unknown): unknown {
  if (!isObject(input)) return input
  if (input.schemaVersion === '1.0') return input
  if (input.schemaVersion === '0.1') {
    return {
      ...input,
      schemaVersion: '1.0',
      kind: input.kind || 'math.sandbox',
      analytics: Array.isArray(input.analytics) ? input.analytics : [],
    }
  }
  return input
}

export function normalizeControlValue(control: ControlSpec, value: unknown): JsonObject[keyof JsonObject] {
  if (control.type === 'slider' || control.type === 'numeric_input') {
    if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`Control ${control.id} expects a finite number`)
    let result = value
    if (typeof control.min === 'number') result = Math.max(control.min, result)
    if (typeof control.max === 'number') result = Math.min(control.max, result)
    if (typeof control.step === 'number') {
      const origin = control.min || 0
      result = origin + Math.round((result - origin) / control.step) * control.step
      result = Number(result.toFixed(12))
    }
    return result
  }
  return value as JsonObject[keyof JsonObject]
}
