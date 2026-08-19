import { describe, expect, it } from 'vitest'
import { assessmentPoolStats, materializeAssessmentPools } from '../lib/lessonScheme.js'

describe('lesson assessment scheme', () => {
  const slides = [
    {
      slide_number: 1,
      blocks: [
        {
          id: 'mc-pool',
          block_type: 'assessment_pool',
          content: {
            poolId: 'lesson.mc',
            quiz_type: 'multiple_choice',
            items: [{ id: 'mc-1', quiz_type: 'multiple_choice', question: 'Q', options: [{ id: 'A', text: 'A' }], correct: 'A' }],
          },
        },
        {
          id: 'mc-ref',
          block_type: 'assessment_ref',
          content: { poolId: 'lesson.mc', itemId: 'mc-1', phase: 'guided_practice' },
        },
      ],
    },
  ]

  it('renders only explicitly delivered references', () => {
    const materialized = materializeAssessmentPools(slides)
    expect(materialized[0].blocks).toHaveLength(1)
    expect(materialized[0].blocks[0]).toMatchObject({
      id: 'mc-ref',
      block_type: 'quiz',
      content: { id: 'mc-1', phase: 'guided_practice', poolId: 'lesson.mc' },
    })
  })

  it('counts authoring pool and delivery references separately', () => {
    expect(assessmentPoolStats(slides)).toEqual({
      multiple_choice: 1,
      true_false_group: 0,
      short_answer: 0,
      delivered: 1,
    })
  })

  it('fails loudly for a broken reference', () => {
    expect(() => materializeAssessmentPools([{
      blocks: [{ id: 'ref', block_type: 'assessment_ref', content: { poolId: 'missing', itemId: 'x' } }],
    }])).toThrow('unknown pool missing')
  })
})
