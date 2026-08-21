import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { unified } from '../frontend/node_modules/unified/index.js'
import remarkFrontmatter from '../frontend/node_modules/remark-frontmatter/index.js'
import remarkGfm from '../frontend/node_modules/remark-gfm/index.js'
import remarkMath from '../frontend/node_modules/remark-math/index.js'
import remarkMdx from '../frontend/node_modules/remark-mdx/index.js'
import remarkParse from '../frontend/node_modules/remark-parse/index.js'
import YAML from '../frontend/node_modules/yaml/dist/index.js'

type JsonRecord = Record<string, any>

const ALLOWED_JSX = new Set(['Slide', 'Callout', 'Sandbox', 'Quiz'])
const ALLOWED_JSON_BLOCKS = new Set([
  'assessment_pool',
  'assessment_ref',
  'math',
  'text',
  'callout',
  'image',
  'reveal',
  'fill_blank',
  'ordering',
  'interaction',
  'video',
  'code',
])

export type CompilerOptions = {
  sourceDir: string
  outputDir: string
  write: boolean
}

export type CompiledStep = JsonRecord & {
  slides: JsonRecord[]
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function sourcePosition(node: any): string {
  const position = node?.position?.start
  return position ? `line ${position.line}, column ${position.column}` : 'unknown position'
}

function fail(message: string, file: string, node?: any): never {
  throw new Error(`${relative(process.cwd(), file)} (${sourcePosition(node)}): ${message}`)
}

function parseFrontmatter(source: string, file: string): JsonRecord {
  const match = source.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)/)
  if (!match) fail('missing YAML frontmatter', file)
  const value = YAML.parse(match[1])
  if (!isRecord(value)) fail('frontmatter must be an object', file)
  return value
}

function parseAttributeValue(attribute: any, file: string): any {
  if (typeof attribute.value === 'string' || attribute.value === null) return attribute.value
  if (attribute.value?.type === 'mdxJsxAttributeValueExpression') {
    const expression = String(attribute.value.value || '').trim()
    try {
      return JSON.parse(expression)
    } catch {
      fail(`attribute ${attribute.name} must contain JSON, not executable JavaScript`, file, attribute)
    }
  }
  fail(`unsupported attribute ${attribute.name}`, file, attribute)
}

function parseAttributes(node: any, file: string): JsonRecord {
  const attributes: JsonRecord = {}
  for (const attribute of node.attributes || []) {
    if (attribute.type !== 'mdxJsxAttribute' || !attribute.name) {
      fail('spread or dynamic JSX attributes are not allowed', file, attribute)
    }
    attributes[attribute.name] = parseAttributeValue(attribute, file)
  }
  return attributes
}

function inlineText(node: any, file: string): string {
  switch (node.type) {
    case 'text':
      return node.value
    case 'inlineMath':
      return `$${node.value}$`
    case 'strong':
      return `**${(node.children || []).map((child: any) => inlineText(child, file)).join('')}**`
    case 'emphasis':
      return `*${(node.children || []).map((child: any) => inlineText(child, file)).join('')}*`
    case 'delete':
      return `~~${(node.children || []).map((child: any) => inlineText(child, file)).join('')}~~`
    case 'inlineCode':
      return `\`${node.value}\``
    case 'break':
      return '\n'
    case 'link':
      return (node.children || []).map((child: any) => inlineText(child, file)).join('')
    case 'mdxTextExpression':
    case 'mdxFlowExpression':
      fail('JavaScript expressions are not allowed in course content', file, node)
    default:
      fail(`unsupported inline node ${node.type}`, file, node)
  }
}

function blockText(node: any, file: string): string {
  if (node.type === 'paragraph' || node.type === 'heading') {
    return (node.children || []).map((child: any) => inlineText(child, file)).join('')
  }
  if (node.type === 'list') {
    return (node.children || [])
      .map((item: any, index: number) => {
        const content = (item.children || []).map((child: any) => blockText(child, file)).join('\n')
        const marker = node.ordered ? `${(node.start || 1) + index}.` : '-'
        return `${marker} ${content}`
      })
      .join('\n')
  }
  if (node.type === 'blockquote') {
    return (node.children || []).map((child: any) => blockText(child, file)).join('\n')
  }
  fail(`unsupported block node ${node.type}`, file, node)
}

function isTextNode(node: any): boolean {
  return ['heading', 'paragraph', 'list', 'blockquote'].includes(node.type)
}

function textBlock(id: string, nodes: any[], file: string): JsonRecord {
  const headings = nodes.filter(node => node.type === 'heading')
  const heading = headings.length > 0 ? blockText(headings[0], file) : undefined
  const paragraphs = nodes
    .filter(node => node.type !== 'heading')
    .map(node => blockText(node, file))
    .filter(Boolean)
  const content: JsonRecord = {}
  if (heading) content.heading = heading
  if (paragraphs.length > 0) content.paragraphs = paragraphs
  return { id, block_type: 'text', content }
}

function jsonBlock(node: any, file: string): JsonRecord {
  let value: unknown
  try {
    value = JSON.parse(node.value)
  } catch {
    fail('JSON code blocks must contain valid JSON', file, node)
  }
  if (!isRecord(value) || typeof value.block_type !== 'string') {
    fail('JSON code blocks must be declarative blocks with block_type', file, node)
  }
  if (!ALLOWED_JSON_BLOCKS.has(value.block_type)) {
    fail(`JSON block type ${value.block_type} is not allowlisted`, file, node)
  }
  if (!value.id || typeof value.id !== 'string') {
    fail('JSON content blocks require a stable id', file, node)
  }
  return value
}

function findAttribute(attributes: JsonRecord, name: string): any {
  return attributes[name]
}

function assessmentReference(id: string, pools: JsonRecord[], file: string, node: any): JsonRecord {
  const match = id.match(/^b(\d+)_ref_(mc|tf|short)_(.+)$/)
  if (!match) fail(`Quiz id ${id} must follow bN_ref_{mc|tf|short}_itemId`, file, node)
  const [, phaseNumber, shortType, itemNumber] = match
  const itemPrefix = shortType === 'mc' ? 'mc' : shortType === 'tf' ? 'tf' : 'short'
  const itemId = `${itemPrefix}_${itemNumber}`
  const quizType = shortType === 'mc' ? 'multiple_choice' : shortType === 'tf' ? 'true_false_group' : 'short_answer'
  const pool = pools.find(candidate => candidate.content?.quiz_type === quizType)
  if (!pool) fail(`Quiz ${id} has no ${quizType} assessment_pool in this step`, file, node)
  const item = pool.content.items.find((candidate: JsonRecord) => candidate.id === itemId)
  if (!item) fail(`Quiz ${id} points to missing assessment item ${itemId}`, file, node)
  const phase = phaseNumber === '4' ? 'guided_practice' : phaseNumber === '5' ? 'independent_check' : 'transfer'
  return {
    id,
    block_type: 'assessment_ref',
    content: {
      poolId: pool.content.poolId,
      itemId,
      phase,
    },
  }
}

function renderJsxBlock(node: any, file: string, pools: JsonRecord[], index: number): JsonRecord {
  if (!ALLOWED_JSX.has(node.name)) fail(`JSX block ${node.name} is not allowlisted`, file, node)
  const attributes = parseAttributes(node, file)

  if (node.name === 'Callout') {
    const body = (node.children || []).map((child: any) => blockText(child, file)).join('\n\n').trim()
    return {
      id: String(attributes.id || `callout-${index + 1}`),
      block_type: 'callout',
      content: {
        variant: attributes.variant || 'note',
        title: attributes.title || undefined,
        body,
      },
    }
  }

  if (node.name === 'Sandbox') {
    const lesson = attributes.manifest || {
      schemaVersion: '1.0',
      kind: 'math.sandbox',
      archetypeId: attributes.archetypeId || attributes.recipe || 'logic.proposition',
      recipe: attributes.recipe || attributes.archetypeId || 'logic.proposition',
      mode: attributes.mode || 'default',
      config: attributes.config || (attributes.items ? { activity: { items: attributes.items } } : {}),
      controls: attributes.controls || [],
    }
    if (!isRecord(lesson) || lesson.kind !== 'math.sandbox') {
      fail('Sandbox manifest must be a JSON object with kind=math.sandbox', file, node)
    }
    return {
      id: String(attributes.id || `sandbox-${lesson.id || index + 1}`),
      block_type: 'interaction',
      content: {
        interactionType: attributes.type || 'sandbox',
        lesson,
      },
    }
  }

  if (node.name === 'Quiz') {
    const id = attributes.id
    if (typeof id !== 'string') fail('Quiz requires a stable id', file, node)
    return assessmentReference(id, pools, file, node)
  }

  fail('Slide nodes are only valid at the document root', file, node)
}

function compileSlide(node: any, source: string, file: string, index: number, pools: JsonRecord[]): JsonRecord {
  const attributes = parseAttributes(node, file)
  if (typeof attributes.id !== 'string' || !attributes.id.trim()) {
    fail('Slide requires a stable id attribute', file, node)
  }
  const blocks: JsonRecord[] = []
  let pendingText: any[] = []
  const flushText = () => {
    if (pendingText.length === 0) return
    blocks.push(textBlock(`${attributes.id}-text-${blocks.length + 1}`, pendingText, file))
    pendingText = []
  }

  for (const child of node.children || []) {
    if (isTextNode(child)) {
      pendingText.push(child)
      continue
    }
    flushText()
    if (child.type === 'code' && child.lang === 'json') {
      blocks.push(jsonBlock(child, file))
      continue
    }
    if (child.type === 'code') {
      blocks.push({
        id: `${attributes.id}-code-${blocks.length + 1}`,
        block_type: 'code',
        content: { language: child.lang || 'text', code: child.value },
      })
      continue
    }
    if (child.type === 'mdxJsxFlowElement') {
      blocks.push(renderJsxBlock(child, file, pools, blocks.length))
      continue
    }
    if (['mdxTextExpression', 'mdxFlowExpression', 'mdxjsEsm'].includes(child.type)) {
      fail('JavaScript expressions and imports are not allowed in course content', file, child)
    }
    fail(`unsupported Slide child ${child.type}`, file, child)
  }
  flushText()

  return {
    id: attributes.id,
    content_key: `${index + 1}:${attributes.id}`,
    order_index: index,
    title: attributes.title || '',
    subtitle: attributes.subtitle || undefined,
    blocks,
  }
}

export function compileStep(source: string, file: string): CompiledStep {
  const frontmatter = parseFrontmatter(source, file)
  const processor = unified().use(remarkParse).use(remarkFrontmatter).use(remarkMath).use(remarkGfm).use(remarkMdx)
  let tree: any
  try {
    tree = processor.parse(source)
  } catch (error: any) {
    fail(`MDX syntax error: ${error.message}`, file)
  }

  for (const node of tree.children) {
    if (node.type === 'yaml') continue
    if (node.type !== 'mdxJsxFlowElement' || node.name !== 'Slide') {
      fail(`only top-level Slide elements are allowed, found ${node.type}${node.name ? `:${node.name}` : ''}`, file, node)
    }
  }

  const slideNodes = tree.children.filter((node: any) => node.type === 'mdxJsxFlowElement' && node.name === 'Slide')
  const pools = slideNodes.flatMap((slide: any) =>
    (slide.children || [])
      .filter((child: any) => child.type === 'code' && child.lang === 'json')
      .map((child: any) => jsonBlock(child, file))
      .filter((block: JsonRecord) => block.block_type === 'assessment_pool'),
  )
  const poolIds = new Set<string>()
  for (const pool of pools) {
    const poolId = pool.content?.poolId
    if (!poolId || poolIds.has(poolId)) fail(`duplicate or missing assessment pool ${poolId || ''}`, file)
    poolIds.add(poolId)
  }
  const ids = new Set<string>()
  const slides = slideNodes.map((node: any, index: number) => {
    const slide = compileSlide(node, source, file, index, pools)
    if (ids.has(slide.id)) fail(`duplicate Slide id ${slide.id}`, file, node)
    ids.add(slide.id)
    return slide
  })
  const stepId = String(frontmatter.id || file.split('/').pop()?.replace(/\.mdx$/, ''))
  const courseSlug = String(frontmatter.courseSlug || 'unknown')
  const chapterSlug = String(frontmatter.chapterSlug || 'default')
  const stepKey = `${courseSlug}/${chapterSlug}/${stepId}`
  return {
    id: stepId,
    content_key: stepKey,
    title: frontmatter.title || stepId,
    description: frontmatter.description || '',
    xp_reward: Number(frontmatter.xp || 10),
    order_index: Number(frontmatter.order || 0),
    course_slug: courseSlug,
    chapter_slug: chapterSlug,
    slides: slides.map(slide => ({
      ...slide,
      content_key: `${stepKey}/${slide.id}`,
    })),
  }
}

async function courseFiles(sourceDir: string): Promise<string[]> {
  const files = await readdir(sourceDir, { withFileTypes: true })
  return files
    .filter(entry => entry.isFile() && entry.name.endsWith('.mdx'))
    .sort((left, right) => left.name.localeCompare(right.name))
    .map(entry => resolve(sourceDir, entry.name))
}

export async function compileCourse(sourceDir: string, outputDir: string, write = true): Promise<JsonRecord> {
  const metaPath = resolve(sourceDir, 'meta.json')
  const meta = JSON.parse(await readFile(metaPath, 'utf8')) as JsonRecord
  const files = await courseFiles(sourceDir)
  const steps: CompiledStep[] = []
  for (const file of files) {
    steps.push(compileStep(await readFile(file, 'utf8'), file))
  }
  steps.sort((left, right) => left.order_index - right.order_index || left.id.localeCompare(right.id))

  const chapterMeta = (meta.chapters || []).map((chapter: JsonRecord) => ({
    ...chapter,
    steps: steps.filter(step => step.chapter_slug === (chapter.slug || chapter.id || 'default')),
  }))
  const course = {
    ...meta,
    generated_from: 'frontend/src/content/courses',
    compiler_version: 'mdx-1',
    chapters: chapterMeta,
  }

  if (write) {
    await mkdir(outputDir, { recursive: true })
    await writeFile(resolve(outputDir, 'course.json'), `${JSON.stringify(course, null, 2)}\n`, 'utf8')
    await writeFile(resolve(outputDir, '_index.json'), `${JSON.stringify({ [course.slug]: course.slug }, null, 2)}\n`, 'utf8')
    for (const chapter of chapterMeta) {
      const chapterDir = resolve(outputDir, 'chapters', chapter.slug || chapter.id || 'default')
      await mkdir(resolve(chapterDir, 'steps'), { recursive: true })
      const chapterFile = { ...chapter, steps: undefined }
      await writeFile(resolve(chapterDir, 'chapter.json'), `${JSON.stringify(chapterFile, null, 2)}\n`, 'utf8')
      for (const step of chapter.steps || []) {
        await writeFile(resolve(chapterDir, 'steps', `${step.id}.json`), `${JSON.stringify(step, null, 2)}\n`, 'utf8')
      }
    }
  }
  return course
}

export async function compileAllCourses(options: CompilerOptions): Promise<JsonRecord[]> {
  const entries = await readdir(options.sourceDir, { withFileTypes: true })
  const courses: JsonRecord[] = []
  for (const entry of entries.filter(item => item.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
    const sourceDir = resolve(options.sourceDir, entry.name)
    if (!await exists(sourceDir, 'meta.json')) continue
    const outputDir = resolve(options.outputDir, entry.name)
    courses.push(await compileCourse(sourceDir, outputDir, options.write))
  }
  if (options.write) {
    await mkdir(options.outputDir, { recursive: true })
    await writeFile(resolve(options.outputDir, '_index.json'), `${JSON.stringify(courses.map(course => ({ slug: course.slug, title: course.title })), null, 2)}\n`, 'utf8')
  }
  return courses
}

async function exists(parent: string, name: string): Promise<boolean> {
  try {
    await readFile(resolve(parent, name))
    return true
  } catch {
    return false
  }
}

if (process.argv[1]?.endsWith('mdx_course_compiler.ts')) {
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
  await compileAllCourses({
    sourceDir: resolve(repoRoot, 'frontend/src/content/courses'),
    outputDir: resolve(repoRoot, 'data/courses'),
    write: true,
  })
}
