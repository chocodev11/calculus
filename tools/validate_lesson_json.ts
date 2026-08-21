import { readFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

type JsonRecord = Record<string, any>

const ALLOWED_BLOCK_TYPES = new Set([
  'text', 'math', 'callout', 'image', 'quiz', 'assessment_pool',
  'assessment_ref', 'interaction', 'video', 'code', 'reveal',
  'fill_blank', 'ordering', 'drag_drop', 'interactive_graph',
])

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function fail(file: string, message: string): never {
  throw new Error(`${file}: ${message}`)
}

function validateStep(step: JsonRecord, file: string): number {
  if (typeof step.id !== 'string' || !step.id) fail(file, 'missing step id')
  if (typeof step.content_key !== 'string' || !step.content_key) fail(file, 'missing content_key')
  if (!Array.isArray(step.slides) || step.slides.length === 0) fail(file, 'step must contain slides')

  const slideIds = new Set<string>()
  const pools = new Map<string, Set<string>>()
  const refs: JsonRecord[] = []

  for (const [slideIndex, slide] of step.slides.entries()) {
    if (!isRecord(slide)) fail(file, `slide ${slideIndex} must be an object`)
    if (typeof slide.id !== 'string' || !slide.id) fail(file, `slide ${slideIndex} is missing id`)
    if (slideIds.has(slide.id)) fail(file, `duplicate slide id ${slide.id}`)
    slideIds.add(slide.id)
    if (!Array.isArray(slide.blocks)) fail(file, `slide ${slide.id} is missing blocks`)

    const blockIds = new Set<string>()
    for (const block of slide.blocks) {
      if (!isRecord(block)) fail(file, `slide ${slide.id} contains a non-object block`)
      const type = block.block_type || block.type
      if (typeof block.id !== 'string' || !block.id) fail(file, `slide ${slide.id} contains a block without id`)
      if (blockIds.has(block.id)) fail(file, `duplicate block id ${block.id}`)
      blockIds.add(block.id)
      if (!ALLOWED_BLOCK_TYPES.has(type)) fail(file, `unsupported block_type ${type}`)
      const content = isRecord(block.content) ? block.content : isRecord(block.block_data) ? block.block_data : {}

      if (type === 'assessment_pool') {
        if (typeof content.poolId !== 'string' || !content.poolId) fail(file, `pool ${block.id} is missing poolId`)
        if (pools.has(content.poolId)) fail(file, `duplicate assessment pool ${content.poolId}`)
        if (!Array.isArray(content.items) || content.items.length === 0) fail(file, `pool ${content.poolId} has no items`)
        const items = new Set<string>()
        for (const item of content.items) {
          if (!isRecord(item) || typeof item.id !== 'string' || !item.id) fail(file, `pool ${content.poolId} contains an invalid item`)
          if (items.has(item.id)) fail(file, `pool ${content.poolId} duplicates item ${item.id}`)
          items.add(item.id)
        }
        pools.set(content.poolId, items)
      }
      if (type === 'assessment_ref') refs.push(content)
    }
  }

  for (const reference of refs) {
    if (!pools.has(reference.poolId)) fail(file, `assessment_ref points to unknown pool ${reference.poolId}`)
    if (!pools.get(reference.poolId)?.has(reference.itemId)) fail(file, `assessment_ref points to unknown item ${reference.itemId}`)
    if (typeof reference.phase !== 'string' || !reference.phase) fail(file, 'assessment_ref is missing phase')
  }
  return step.slides.length
}

async function collectStepFiles(root: string): Promise<string[]> {
  const result: string[] = []
  const entries = await readdir(root, { withFileTypes: true })
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const path = resolve(root, entry.name)
    if (entry.isDirectory()) result.push(...await collectStepFiles(path))
    else if (entry.isFile() && path.includes('/steps/') && path.endsWith('.json')) result.push(path)
  }
  return result
}

const repoRoot = fileURLToPath(new URL('..', import.meta.url))
const generatedRoot = resolve(repoRoot, 'data/courses')
const files = await collectStepFiles(generatedRoot)
let slideCount = 0
for (const file of files) {
  const value = JSON.parse(await readFile(file, 'utf8'))
  if (!isRecord(value)) fail(file, 'root must be an object')
  slideCount += validateStep(value, file)
}
console.log(`lesson JSON: steps=${files.length}, slides=${slideCount}, errors=0`)
