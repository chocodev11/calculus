const THEORY_BLOCK_TYPES = new Set(['text', 'callout', 'math', 'image'])
const PARAGRAPHS_PER_SECTION = 2
const CALLOUT_SECTIONS_PER_SECTION = 2

function blockType(block) {
  return block?.type || block?.block_type
}

function blockContent(block) {
  const content = block?.content || block?.block_data || {}
  return content && typeof content === 'object' && !Array.isArray(content) ? content : {}
}

function chunk(items, size) {
  const result = []
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size))
  }
  return result
}

/**
 * Keep source-specific claims in the course metadata, not in every lesson
 * description or learner-facing heading.
 */
export function cleanLessonCopy(value) {
  if (typeof value !== 'string') return value

  return value
    .replace(/\s+theo chuẩn GDPT 2018/giu, '')
    .replace(/\s+theo chuẩn SGK Toán 10/giu, '')
    .replace(/\s*\(SGK Toán 10\)/giu, '')
    .replace(/đúng 3 nhóm chuẩn SGK Toán 10/giu, 'đúng 3 nhóm')
    .replace(/Chuẩn hóa Thuật ngữ Cần & Đủ/gu, 'Điều kiện cần và đủ')
    .replace(/chuẩn hóa thuật ngữ/giu, 'dùng đúng thuật ngữ')
    .replace(/Tổng kết & Cầu nối Sư phạm/gu, 'Tóm tắt bài học')
    .replace(/[ \t]{2,}/g, ' ')
}

function normalizeValue(value) {
  if (typeof value === 'string') return cleanLessonCopy(value)
  if (Array.isArray(value)) return value.map(normalizeValue)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, normalizeValue(child)]))
  }
  return value
}

function splitStructuredText(value) {
  if (typeof value !== 'string' || !value.trim()) return []

  return value
    .replace(/\r\n/gu, '\n')
    .split(/\n{2,}/u)
    .map(paragraph => paragraph.trim())
    .filter(Boolean)
}

function textParagraphs(content) {
  if (Array.isArray(content.paragraphs)) {
    return content.paragraphs.flatMap(splitStructuredText)
  }
  return splitStructuredText(content.content)
}

function splitTextBlock(block) {
  const content = blockContent(block)
  const paragraphs = textParagraphs(content)
  if (paragraphs.length <= PARAGRAPHS_PER_SECTION) return [block]

  return chunk(paragraphs, PARAGRAPHS_PER_SECTION).map((paragraphGroup, index) => ({
    ...block,
    content: {
      ...content,
      heading: index === 0 ? content.heading : undefined,
      paragraphs: paragraphGroup,
      content: undefined,
    },
  }))
}

function splitCalloutBody(body) {
  if (typeof body !== 'string' || !body.trim()) return []
  const normalized = body.replace(/\r\n/gu, '\n').trim()
  const numberedSections = normalized.split(/\n(?=\s*\d+[.)]\s)/u).filter(Boolean)
  if (numberedSections.length > 1) return numberedSections

  return normalized.split(/\n{2,}/u).map(section => section.trim()).filter(Boolean)
}

function splitCalloutBlock(block) {
  const content = blockContent(block)
  const bodyKey = typeof content.body === 'string' ? 'body' : 'content'
  const sections = splitCalloutBody(content[bodyKey])
  if (sections.length <= CALLOUT_SECTIONS_PER_SECTION) return [block]

  return chunk(sections, CALLOUT_SECTIONS_PER_SECTION).map(sectionGroup => ({
    ...block,
    content: {
      ...content,
      [bodyKey]: sectionGroup.join('\n\n'),
    },
  }))
}

function splitTheoryBlock(block) {
  switch (blockType(block)) {
    case 'text':
      return splitTextBlock(block)
    case 'callout':
      return splitCalloutBlock(block)
    default:
      return [block]
  }
}

function splitTheorySections(blocks) {
  const sections = []

  for (const [index, block] of blocks.entries()) {
    const type = blockType(block)
    if (type === 'text' || type === 'callout') {
      const nextType = blockType(blocks[index + 1])
      const hasCompanion = nextType === 'math' || nextType === 'image'
      const splitBlocks = type === 'callout' && hasCompanion
        ? [block]
        : splitTheoryBlock(block)
      sections.push(...splitBlocks.map(splitBlock => [splitBlock]))
      continue
    }

    // Formulas and illustrations explain the preceding text/callout. Keep
    // them in that semantic section instead of promoting them to an orphan
    // slide of their own.
    if (sections.length > 0) {
      sections[sections.length - 1].push(block)
    } else {
      sections.push([block])
    }
  }

  return sections
}

function isTheorySlide(slide) {
  const blocks = slide?.blocks || []
  return blocks.length > 0 && blocks.every(block => THEORY_BLOCK_TYPES.has(blockType(block)))
}

function presentTheorySlide(slide) {
  const normalizedSlide = normalizeValue(slide)
  const sections = splitTheorySections(normalizedSlide.blocks || [])
  const shouldSplit = isTheorySlide(normalizedSlide) && sections.length > 1
  const sourceSlideId = normalizedSlide.id

  if (!shouldSplit) {
    return [{
      ...normalizedSlide,
      blocks: sections[0] || normalizedSlide.blocks || [],
      sourceSlideId,
      presentationKind: isTheorySlide(normalizedSlide) ? 'theory' : 'activity',
      readerSection: { index: 1, total: 1 },
    }]
  }

  return sections.map((blocks, index) => ({
    ...normalizedSlide,
    id: `${sourceSlideId}--section-${index + 1}`,
    sourceSlideId,
    presentationKind: 'theory',
    readerSection: { index: index + 1, total: sections.length },
    blocks,
  }))
}

/**
 * Expand dense theory slides into reader-sized sections while retaining the
 * original slide ID as the progress/XP identity.
 */
export function prepareReaderSlides(slides) {
  if (!Array.isArray(slides)) return []
  return slides.flatMap(presentTheorySlide)
}

export function isLastReaderSection(slides, index) {
  const current = slides?.[index]
  const next = slides?.[index + 1]
  if (!current) return false
  if (!next) return true
  return (current.sourceSlideId || current.id) !== (next.sourceSlideId || next.id)
}
