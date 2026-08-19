const POOL_BLOCK = 'assessment_pool'
const REF_BLOCK = 'assessment_ref'

function blockType(block) {
  return block?.type || block?.block_type
}

function blockContent(block) {
  return block?.content || block?.block_data || {}
}

function poolKey(poolId) {
  return String(poolId || '')
}

function materializeReference(block, pools) {
  const content = blockContent(block)
  const pool = pools.get(poolKey(content.poolId))
  if (!pool) {
    throw new Error(`Assessment reference ${block.id} points to unknown pool ${content.poolId}`)
  }

  const item = pool.items.find(candidate => candidate.id === content.itemId)
  if (!item) {
    throw new Error(`Assessment reference ${block.id} points to unknown item ${content.itemId}`)
  }

  return {
    id: block.id,
    block_type: 'quiz',
    content: {
      ...item,
      phase: content.phase,
      poolId: content.poolId,
      poolItemId: content.itemId,
    },
  }
}

/**
 * Convert authoring-only assessment pools and references into ordinary quiz
 * blocks. Pool definitions never render; only explicit delivery references do.
 */
export function materializeAssessmentPools(slides) {
  if (!Array.isArray(slides)) return []

  const pools = new Map()
  slides.forEach(slide => {
    ;(slide.blocks || []).forEach(block => {
      if (blockType(block) !== POOL_BLOCK) return
      const content = blockContent(block)
      const id = poolKey(content.poolId)
      if (!id) throw new Error(`Assessment pool ${block.id} is missing poolId`)
      if (pools.has(id)) throw new Error(`Duplicate assessment pool ${id}`)
      if (!Array.isArray(content.items) || content.items.length === 0) {
        throw new Error(`Assessment pool ${id} must contain items`)
      }

      const itemIds = new Set()
      for (const item of content.items) {
        if (!item || typeof item !== 'object' || !item.id) {
          throw new Error(`Assessment pool ${id} contains an item without id`)
        }
        if (itemIds.has(item.id)) throw new Error(`Assessment pool ${id} has duplicate item ${item.id}`)
        itemIds.add(item.id)
      }
      pools.set(id, content)
    })
  })

  return slides.map(slide => ({
    ...slide,
    blocks: (slide.blocks || []).flatMap(block => {
      const type = blockType(block)
      if (type === POOL_BLOCK) return []
      if (type === REF_BLOCK) return [materializeReference(block, pools)]
      return [block]
    }),
  }))
}

export function assessmentPoolStats(slides) {
  const stats = {
    multiple_choice: 0,
    true_false_group: 0,
    short_answer: 0,
    delivered: 0,
  }

  for (const slide of slides || []) {
    for (const block of slide.blocks || []) {
      const type = blockType(block)
      const content = blockContent(block)
      if (type === POOL_BLOCK) {
        const quizType = content.quiz_type
        if (quizType in stats) stats[quizType] += Array.isArray(content.items) ? content.items.length : 0
      }
      if (type === REF_BLOCK) stats.delivered += 1
    }
  }

  return stats
}
