import { readFile, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, relative, resolve } from 'node:path'
import {
  assertPluginManifest,
  createSession,
  defaultSandboxRegistry,
  loadManifest,
  validateManifest,
} from '../frontend/src/sandbox'
import type { SandboxManifest } from '../frontend/src/sandbox/types'
import { compileAllCourses, compileCourse } from './mdx_course_compiler'

type JsonRecord = Record<string, unknown>

type ManifestReference = {
  file: string
  pointer: string
  manifest: SandboxManifest
}

type Finding = {
  severity: 'error' | 'warning'
  source: string
  message: string
}

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

import { existsSync } from 'node:fs'

function parseArgs(argv: string[]): { source: string; generated: string; strict: boolean } {
  const defaultSource = resolve(repoRoot, 'frontend/src/content/courses')
  const defaultGenerated = resolve(repoRoot, 'data/courses')

  const values = {
    source: defaultSource,
    generated: defaultGenerated,
    strict: false,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--strict') {
      values.strict = true
      continue
    }
    if (arg === '--source' || arg === '--generated') {
      const value = argv[index + 1]
      if (!value) throw new Error(arg + ' requires a path')
      values[arg.slice(2) as 'source' | 'generated'] = resolve(repoRoot, value)
      index += 1
    }
  }

  return values
}

async function compileSourceCourses(source: string): Promise<JsonRecord[]> {
  return compileAllCourses({ sourceDir: source, outputDir: resolve(repoRoot, 'data/courses'), write: false })
}

function compiledStepReferences(course: JsonRecord): Array<{ file: string; step: JsonRecord }> {
  const references: Array<{ file: string; step: JsonRecord }> = []
  for (const chapter of course.chapters || []) {
    for (const step of chapter.steps || []) {
      references.push({
        file: resolve(repoRoot, 'frontend/src/content/courses', course.slug, `${step.id}.mdx`),
        step,
      })
    }
  }
  return references
}

function validateCompiledAssessmentStep(reference: { file: string; step: JsonRecord }, findings: Finding[]): void {
  const source = relative(repoRoot, reference.file)
  const pools = new Map<string, { quizType: string; items: Set<string> }>()
  const refs: Array<{ id: string; content: JsonRecord; slide: number }> = []
  for (const [slideIndex, slide] of (reference.step.slides || []).entries()) {
    if (!isRecord(slide) || !Array.isArray(slide.blocks)) {
      findings.push({ severity: 'error', source, message: `slide ${slideIndex} has no blocks array` })
      continue
    }
    const refsOnSlide = slide.blocks.filter((block: unknown) => isRecord(block) && blockType(block) === 'assessment_ref')
    if (refsOnSlide.length > 1) {
      findings.push({ severity: 'error', source, message: `slide ${slideIndex} has more than one assessment_ref` })
    }
    for (const block of slide.blocks) {
      if (!isRecord(block)) continue
      const type = blockType(block)
      const content = blockContent(block)
      const id = typeof block.id === 'string' ? block.id : '<missing-id>'
      if (type === 'assessment_pool') {
        const poolId = content.poolId
        if (typeof poolId !== 'string' || !poolId) {
          findings.push({ severity: 'error', source, message: `assessment_pool ${id} has no poolId` })
          continue
        }
        if (pools.has(poolId)) {
          findings.push({ severity: 'error', source, message: `duplicate assessment_pool ${poolId}` })
          continue
        }
        const items = Array.isArray(content.items) ? content.items : []
        const itemIds = new Set<string>()
        for (const item of items) {
          if (!isRecord(item) || typeof item.id !== 'string' || !item.id) {
            findings.push({ severity: 'error', source, message: `assessment_pool ${poolId} has an item without id` })
            continue
          }
          if (itemIds.has(item.id)) {
            findings.push({ severity: 'error', source, message: `assessment_pool ${poolId} duplicates item ${item.id}` })
          }
          itemIds.add(item.id)
        }
        pools.set(poolId, { quizType: String(content.quiz_type || ''), items: itemIds })
      }
      if (type === 'assessment_ref') refs.push({ id, content, slide: slideIndex })
    }
  }
  if (pools.size === 0 || refs.length === 0) {
    findings.push({ severity: 'error', source, message: 'step must contain assessment pools and delivery references' })
  }
  const seenRefs = new Set<string>()
  for (const ref of refs) {
    const poolId = ref.content.poolId
    const itemId = ref.content.itemId
    const phase = ref.content.phase
    const pool = pools.get(poolId)
    if (!pool) {
      findings.push({ severity: 'error', source, message: `assessment_ref ${ref.id} points to unknown pool ${poolId}` })
      continue
    }
    if (!pool.items.has(itemId)) {
      findings.push({ severity: 'error', source, message: `assessment_ref ${ref.id} points to unknown item ${itemId}` })
    }
    if (typeof phase !== 'string' || !phase) {
      findings.push({ severity: 'error', source, message: `assessment_ref ${ref.id} has no delivery phase` })
    }
    const key = `${phase}:${poolId}:${itemId}`
    if (seenRefs.has(key)) findings.push({ severity: 'error', source, message: `duplicate assessment_ref ${key}` })
    seenRefs.add(key)
  }
}

async function compareCompiledParity(sourceCourses: JsonRecord[], generated: string, findings: Finding[]): Promise<void> {
  for (const sourceCourse of sourceCourses) {
    const normalizedSourceCourse = JSON.parse(JSON.stringify(sourceCourse))
    const generatedCoursePath = resolve(generated, String(sourceCourse.slug), 'course.json')
    let generatedCourse: JsonRecord
    try {
      generatedCourse = JSON.parse(await readFile(generatedCoursePath, 'utf8'))
    } catch {
      findings.push({ severity: 'error', source: relative(repoRoot, generatedCoursePath), message: 'generated course.json is missing or invalid' })
      continue
    }
    if (stableStringify(normalizedSourceCourse) !== stableStringify(generatedCourse)) {
      findings.push({ severity: 'error', source: relative(repoRoot, generatedCoursePath), message: 'generated course differs from MDX compilation' })
    }
    for (const chapter of sourceCourse.chapters || []) {
      for (const step of chapter.steps || []) {
        const stepPath = resolve(generated, String(sourceCourse.slug), 'chapters', String(chapter.id || chapter.slug), 'steps', `${step.id}.json`)
        try {
          const generatedStep = JSON.parse(await readFile(stepPath, 'utf8'))
          const normalizedStep = JSON.parse(JSON.stringify(step))
          if (stableStringify(normalizedStep) !== stableStringify(generatedStep)) {
            findings.push({ severity: 'error', source: relative(repoRoot, stepPath), message: 'generated step differs from MDX compilation' })
          }
        } catch {
          findings.push({ severity: 'error', source: relative(repoRoot, stepPath), message: 'generated step artifact is missing or invalid' })
        }
      }
    }
  }
}

async function collectJsonFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true })
  const files: string[] = []

  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue
    const path = resolve(root, entry.name)
    if (entry.isDirectory()) {
      files.push(...await collectJsonFiles(path))
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      files.push(path)
    }
  }

  return files
}

function collectManifests(value: unknown, file: string, pointer = '$'): ManifestReference[] {
  if (Array.isArray(value)) {
    return value.flatMap((child, index) => collectManifests(child, file, pointer + '[' + index + ']'))
  }
  if (!isRecord(value)) return []

  if (value.kind === 'math.sandbox') {
    return [{ file, pointer, manifest: value as unknown as SandboxManifest }]
  }

  if (value.interactionType === 'sandbox' && isRecord(value.lesson)) {
    return collectManifests(value.lesson, file, pointer + '.lesson')
  }

  if (isRecord(value.manifest) && value.manifest.kind === 'math.sandbox') {
    return collectManifests(value.manifest, file, pointer + '.manifest')
  }

  return Object.entries(value).flatMap(([key, child]) =>
    collectManifests(child, file, pointer + '.' + key),
  )
}

type LessonSchemeReference = {
  file: string
  pointer: string
  step: JsonRecord
}

function collectLessonSchemes(value: unknown, file: string, pointer = '$'): LessonSchemeReference[] {
  if (Array.isArray(value)) {
    return value.flatMap((child, index) => collectLessonSchemes(child, file, pointer + '[' + index + ']'))
  }
  if (!isRecord(value)) return []

  if (isRecord(value.learning_scheme) && Array.isArray(value.slides)) {
    return [{ file, pointer, step: value }]
  }

  return Object.entries(value).flatMap(([key, child]) =>
    collectLessonSchemes(child, file, pointer + '.' + key),
  )
}

async function loadReferences(root: string): Promise<ManifestReference[]> {
  const references: ManifestReference[] = []
  for (const file of await collectJsonFiles(root)) {
    let document: unknown
    try {
      document = JSON.parse(await readFile(file, 'utf8'))
    } catch {
      references.push({
        file,
        pointer: '$',
        manifest: { id: 'invalid:' + file } as unknown as SandboxManifest,
      })
      continue
    }
    references.push(...collectManifests(document, file))
  }
  return references
}

function sourceLabel(reference: ManifestReference): string {
  return relative(repoRoot, reference.file) + reference.pointer
}

function addSchemaFindings(reference: ManifestReference, findings: Finding[]): boolean {
  const result = validateManifest(reference.manifest)
  if (result.valid) return true
  for (const issue of result.issues) {
    findings.push({
      severity: 'error',
      source: sourceLabel(reference),
      message: issue.path + ': ' + issue.message,
    })
  }
  return false
}

function addGraphFindings(manifest: SandboxManifest, source: string, findings: Finding[]): void {
  const graph = manifest.solutionGraph
  if (!graph) return

  const ids = new Set<string>()
  for (const step of graph.steps) {
    if (ids.has(step.id)) {
      findings.push({ severity: 'error', source, message: 'solutionGraph has duplicate step id ' + step.id })
    }
    ids.add(step.id)
  }

  for (const step of graph.steps) {
    for (const dependency of step.dependsOn || []) {
      if (!ids.has(dependency)) {
        findings.push({
          severity: 'error',
          source,
          message: 'solutionGraph step ' + step.id + ' depends on unknown step ' + dependency,
        })
      }
    }
  }

  for (const terminal of graph.terminalStepIds) {
    if (!ids.has(terminal)) {
      findings.push({ severity: 'error', source, message: 'solutionGraph terminal step ' + terminal + ' does not exist' })
    }
  }

  const visiting = new Set<string>()
  const visited = new Set<string>()
  const steps = new Map(graph.steps.map(step => [step.id, step]))
  const visit = (id: string): void => {
    if (visiting.has(id)) {
      findings.push({ severity: 'error', source, message: 'solutionGraph contains a dependency cycle at ' + id })
      return
    }
    if (visited.has(id)) return
    visiting.add(id)
    for (const dependency of steps.get(id)?.dependsOn || []) {
      if (steps.has(dependency)) visit(dependency)
    }
    visiting.delete(id)
    visited.add(id)
  }
  for (const id of ids) visit(id)
}

function addActivityFindings(manifest: SandboxManifest, source: string, findings: Finding[]): void {
  const config = isRecord(manifest.config) ? manifest.config : {}
  const activity = isRecord(config.activity) ? config.activity : {}
  const controlIds = new Set(manifest.controls.map(control => control.id))
  const items = Array.isArray(activity.items) ? activity.items.filter(isRecord) : []

  for (const item of items) {
    for (const key of ['controlId', 'negationControlId', 'witnessControlId', 'evidenceControlId']) {
      const controlId = item[key]
      if (typeof controlId === 'string' && !controlIds.has(controlId)) {
        findings.push({
          severity: 'error',
          source,
          message: 'activity item ' + String(item.id) + ' references unknown ' + key + ' ' + controlId,
        })
      }
    }

    if (item.expectedNegation !== undefined && item.negationControlId === undefined) {
      findings.push({
        severity: 'warning',
        source,
        message: 'activity item ' + String(item.id) + ' has expectedNegation without a negationControlId',
      })
    }
    if (item.expectedWitness !== undefined && item.witnessControlId === undefined) {
      findings.push({
        severity: 'warning',
        source,
        message: 'activity item ' + String(item.id) + ' has expectedWitness without a witnessControlId',
      })
    }
  }

  for (const key of ['pToQControlId', 'qToPControlId', 'pToQCounterexampleControlId', 'qToPCounterexampleControlId', 'contrapositiveControlId', 'parameterControlId', 'strategyControlId']) {
    const controlId = activity[key]
    if (typeof controlId === 'string' && !controlIds.has(controlId)) {
      findings.push({ severity: 'error', source, message: 'activity references unknown ' + key + ' ' + controlId })
    }
  }

  if (activity.expectedCounterexamples !== undefined
    && activity.expectedPToQCounterexample === undefined
    && activity.expectedQToPCounterexample === undefined) {
    findings.push({
      severity: 'warning',
      source,
      message: 'legacy expectedCounterexamples is not connected to a graded counterexample control',
    })
  }
}

function blockType(block: JsonRecord): unknown {
  return block.type ?? block.block_type
}

function blockContent(block: JsonRecord): JsonRecord {
  const content = block.content ?? block.block_data
  return isRecord(content) ? content : {}
}

function addLessonSchemeFindings(reference: LessonSchemeReference, findings: Finding[]): void {
  const source = relative(repoRoot, reference.file) + reference.pointer
  const scheme = reference.step.learning_scheme
  if (!isRecord(scheme)) return

  if (scheme.version !== '1.0') {
    findings.push({ severity: 'error', source, message: "learning_scheme.version must be '1.0'" })
  }
  if (scheme.delivery_layout !== 'one_assessment_ref_per_slide') {
    findings.push({ severity: 'error', source, message: "learning_scheme.delivery_layout must be 'one_assessment_ref_per_slide'" })
  }

  const authoringPool = isRecord(scheme.authoring_pool) ? scheme.authoring_pool : null
  if (!authoringPool) {
    findings.push({ severity: 'error', source, message: 'learning_scheme.authoring_pool must be an object' })
  }

  for (const rangeName of ['theory', 'sandbox', 'media']) {
    const range = authoringPool?.[rangeName]
    if (!isRecord(range) || !Number.isInteger(range.min) || !Number.isInteger(range.max) || range.min < 0 || range.min > range.max) {
      findings.push({ severity: 'error', source, message: 'learning_scheme.authoring_pool.' + rangeName + ' must define valid integer min/max' })
    }
  }

  const quizTypes = ['multiple_choice', 'true_false_group', 'short_answer'] as const
  const expectedPoolCounts = new Map<string, number>()
  for (const quizType of quizTypes) {
    const count = authoringPool?.[quizType]
    if (!Number.isInteger(count) || count <= 0) {
      findings.push({ severity: 'error', source, message: 'learning_scheme.authoring_pool.' + quizType + ' must be a positive integer' })
    } else {
      expectedPoolCounts.set(quizType, count)
    }
  }

  const policy = isRecord(scheme.interaction_policy) ? scheme.interaction_policy : null
  if (!policy || !Array.isArray(policy.required_evidence) || policy.required_evidence.length === 0) {
    findings.push({ severity: 'error', source, message: 'learning_scheme.interaction_policy.required_evidence must be a non-empty list' })
  }
  if (policy && typeof policy.drag_only !== 'boolean') {
    findings.push({ severity: 'error', source, message: 'learning_scheme.interaction_policy.drag_only must be boolean' })
  }

  const slides = Array.isArray(reference.step.slides) ? reference.step.slides : []
  const poolBlocks: Array<{ id: string; content: JsonRecord }> = []
  const refBlocks: Array<{ id: string; content: JsonRecord }> = []
  for (const slide of slides) {
    if (!isRecord(slide) || !Array.isArray(slide.blocks)) continue
    const slideRefCount = slide.blocks.filter(rawBlock => isRecord(rawBlock) && blockType(rawBlock) === 'assessment_ref').length
    if (scheme.delivery_layout === 'one_assessment_ref_per_slide' && slideRefCount > 1) {
      findings.push({ severity: 'error', source, message: 'a delivery slide contains more than one assessment_ref' })
    }
    for (const rawBlock of slide.blocks) {
      if (!isRecord(rawBlock)) continue
      const id = typeof rawBlock.id === 'string' ? rawBlock.id : '<missing-id>'
      const type = blockType(rawBlock)
      if (type === 'assessment_pool') poolBlocks.push({ id, content: blockContent(rawBlock) })
      if (type === 'assessment_ref') refBlocks.push({ id, content: blockContent(rawBlock) })
    }
  }

  if (poolBlocks.length === 0 || refBlocks.length === 0) {
    findings.push({ severity: 'error', source, message: 'learning_scheme requires at least one assessment_pool and assessment_ref' })
  }

  const pools = new Map<string, { quizType: string; items: Map<string, JsonRecord> }>()
  for (const block of poolBlocks) {
    const poolId = block.content.poolId
    const quizType = block.content.quiz_type
    const items = block.content.items
    if (typeof poolId !== 'string' || poolId.length === 0) {
      findings.push({ severity: 'error', source, message: 'assessment_pool ' + block.id + ' is missing poolId' })
      continue
    }
    if (pools.has(poolId)) {
      findings.push({ severity: 'error', source, message: 'duplicate assessment pool ' + poolId })
      continue
    }
    if (!quizTypes.includes(quizType as typeof quizTypes[number])) {
      findings.push({ severity: 'error', source, message: 'assessment_pool ' + block.id + ' has unsupported quiz_type' })
    }
    if (!Array.isArray(items) || items.length === 0) {
      findings.push({ severity: 'error', source, message: 'assessment_pool ' + block.id + ' must contain items' })
      continue
    }

    const itemMap = new Map<string, JsonRecord>()
    for (const [index, rawItem] of items.entries()) {
      if (!isRecord(rawItem)) {
        findings.push({ severity: 'error', source, message: 'assessment_pool ' + block.id + ' item ' + index + ' must be an object' })
        continue
      }
      const itemId = rawItem.id
      if (typeof itemId !== 'string' || itemId.length === 0) {
        findings.push({ severity: 'error', source, message: 'assessment_pool ' + block.id + ' item ' + index + ' is missing id' })
        continue
      }
      if (itemMap.has(itemId)) {
        findings.push({ severity: 'error', source, message: 'assessment_pool ' + block.id + ' has duplicate item ' + itemId })
        continue
      }
      if (rawItem.quiz_type !== quizType) {
        findings.push({ severity: 'error', source, message: 'assessment_pool ' + block.id + ' item ' + itemId + ' quiz_type differs from pool' })
      }
      if (typeof rawItem.question !== 'string' || rawItem.question.length === 0) {
        findings.push({ severity: 'error', source, message: 'assessment_pool ' + block.id + ' item ' + itemId + ' is missing question' })
      }
      itemMap.set(itemId, rawItem)
    }
    pools.set(poolId, { quizType: typeof quizType === 'string' ? quizType : '', items: itemMap })
  }

  const poolCounts = new Map<string, number>()
  for (const pool of pools.values()) {
    poolCounts.set(pool.quizType, (poolCounts.get(pool.quizType) ?? 0) + pool.items.size)
  }
  for (const quizType of quizTypes) {
    const expected = expectedPoolCounts.get(quizType)
    const actual = poolCounts.get(quizType) ?? 0
    if (expected !== undefined && actual !== expected) {
      findings.push({ severity: 'error', source, message: 'authoring pool has ' + actual + ' ' + quizType + ' items; expected ' + expected })
    }
  }

  const delivery = isRecord(scheme.delivery) ? scheme.delivery : null
  if (!delivery) {
    findings.push({ severity: 'error', source, message: 'learning_scheme.delivery must be an object' })
  }
  const delivered = new Map<string, Map<string, number>>()
  const seenRefs = new Set<string>()
  for (const block of refBlocks) {
    const poolId = block.content.poolId
    const itemId = block.content.itemId
    const phase = block.content.phase
    if (typeof poolId !== 'string' || typeof itemId !== 'string' || typeof phase !== 'string') {
      findings.push({ severity: 'error', source, message: 'assessment_ref ' + block.id + ' requires poolId, itemId and phase' })
      continue
    }
    const pool = pools.get(poolId)
    if (!pool) {
      findings.push({ severity: 'error', source, message: 'assessment_ref ' + block.id + ' points to unknown pool ' + poolId })
      continue
    }
    if (!pool.items.has(itemId)) {
      findings.push({ severity: 'error', source, message: 'assessment_ref ' + block.id + ' points to unknown item ' + itemId })
      continue
    }
    const refKey = phase + ':' + poolId + ':' + itemId
    if (seenRefs.has(refKey)) {
      findings.push({ severity: 'error', source, message: 'assessment_ref ' + block.id + ' duplicates a delivery reference' })
    }
    seenRefs.add(refKey)
    const phaseCounts = delivered.get(phase) ?? new Map<string, number>()
    phaseCounts.set(pool.quizType, (phaseCounts.get(pool.quizType) ?? 0) + 1)
    delivered.set(phase, phaseCounts)
  }

  const phases = new Set<string>([...Object.keys(delivery ?? {}), ...delivered.keys()])
  for (const phase of phases) {
    const expectedPhase = isRecord(delivery?.[phase]) ? delivery[phase] : {}
    const actualPhase = delivered.get(phase) ?? new Map<string, number>()
    const types = new Set<string>([...quizTypes, ...Object.keys(expectedPhase), ...actualPhase.keys()])
    for (const quizType of types) {
      const expected = expectedPhase[quizType]
      const expectedCount = expected === undefined ? 0 : expected
      const actualCount = actualPhase.get(quizType) ?? 0
      if (!Number.isInteger(expectedCount) || expectedCount < 0) {
        findings.push({ severity: 'error', source, message: 'delivery.' + phase + '.' + quizType + ' must be a non-negative integer' })
      } else if (actualCount !== expectedCount) {
        findings.push({ severity: 'error', source, message: 'delivery has ' + actualCount + ' ' + quizType + ' items in ' + phase + '; expected ' + expectedCount })
      }
    }
  }
}

async function validateLessonSchemes(root: string, findings: Finding[]): Promise<void> {
  for (const file of await collectJsonFiles(root)) {
    let document: unknown
    try {
      document = JSON.parse(await readFile(file, 'utf8'))
    } catch {
      continue
    }
    for (const reference of collectLessonSchemes(document, file)) {
      addLessonSchemeFindings(reference, findings)
    }
  }
}

function validateReference(reference: ManifestReference, findings: Finding[]): void {
  const source = sourceLabel(reference)
  if (!addSchemaFindings(reference, findings)) return

  try {
    const manifest = loadManifest(reference.manifest)
    assertPluginManifest(manifest, defaultSandboxRegistry)
    const session = createSession(manifest, defaultSandboxRegistry)
    session.snapshot()
    addGraphFindings(manifest, source, findings)
    addActivityFindings(manifest, source, findings)
  } catch (error) {
    findings.push({
      severity: 'error',
      source,
      message: error instanceof Error ? error.message : String(error),
    })
  }
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']'
  if (!isRecord(value)) return JSON.stringify(value)
  return '{' + Object.keys(value).sort().map(key =>
    JSON.stringify(key) + ':' + stableStringify(value[key]),
  ).join(',') + '}'
}

function compareGenerated(
  raw: ManifestReference[],
  generated: ManifestReference[],
  findings: Finding[],
): void {
  const generatedById = new Map<string, ManifestReference>()
  for (const reference of generated) {
    const id = reference.manifest.id
    if (generatedById.has(id)) {
      const previous = generatedById.get(id)!
      if (stableStringify(previous.manifest) !== stableStringify(reference.manifest)) {
        findings.push({ severity: 'error', source: sourceLabel(reference), message: 'generated manifest id ' + id + ' has conflicting copies' })
      }
      continue
    }
    generatedById.set(id, reference)
  }

  for (const reference of raw) {
    const generatedReference = generatedById.get(reference.manifest.id)
    if (!generatedReference) {
      findings.push({
        severity: 'error',
        source: sourceLabel(reference),
        message: 'manifest ' + reference.manifest.id + ' is missing from generated artifacts',
      })
      continue
    }
    if (stableStringify(reference.manifest) !== stableStringify(generatedReference.manifest)) {
      findings.push({
        severity: 'error',
        source: sourceLabel(reference),
        message: 'generated manifest ' + reference.manifest.id + ' differs from raw source',
      })
    }
  }
}

async function main(): Promise<void> {
  const { source, generated, strict } = parseArgs(process.argv.slice(2))
  const sourceCourses = await compileSourceCourses(source)
  const rawReferences = sourceCourses.flatMap(course =>
    collectManifests(course, resolve(source, String(course.slug) + '.compiled.json')),
  )
  const generatedReferences = await loadReferences(generated)
  const findings: Finding[] = []

  for (const course of sourceCourses) {
    for (const reference of compiledStepReferences(course)) {
      validateCompiledAssessmentStep(reference, findings)
    }
  }
  rawReferences.forEach(reference => validateReference(reference, findings))
  generatedReferences.forEach(reference => validateReference(reference, findings))
  compareGenerated(rawReferences, generatedReferences, findings)
  await compareCompiledParity(sourceCourses, generated, findings)
  await validateLessonSchemes(source, findings)
  await validateLessonSchemes(generated, findings)

  for (const finding of findings) {
    if (finding.severity === 'warning' && !strict) continue
    console.error('[' + finding.severity.toUpperCase() + '] ' + finding.source + ': ' + finding.message)
  }

  const errors = findings.filter(finding => finding.severity === 'error')
  const warnings = findings.filter(finding => finding.severity === 'warning')
  console.log('sandbox manifests: raw=' + rawReferences.length
    + ', generated=' + generatedReferences.length
    + ', errors=' + errors.length
    + ', warnings=' + warnings.length)
  if (strict && warnings.length > 0) process.exitCode = 1
  if (errors.length > 0) process.exitCode = 1
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
