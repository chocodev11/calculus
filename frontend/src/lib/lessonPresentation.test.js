import { describe, expect, it } from 'vitest'
import { cleanLessonCopy, isLastReaderSection, prepareReaderSlides } from './lessonPresentation'

describe('lesson presentation', () => {
  it('removes repeated curriculum-label wording from learner copy', () => {
    expect(cleanLessonCopy('Đánh giá theo chuẩn GDPT 2018.')).toBe('Đánh giá.')
    expect(cleanLessonCopy('Phân loại đúng 3 nhóm chuẩn SGK Toán 10:')).toBe('Phân loại đúng 3 nhóm:')
    expect(cleanLessonCopy('Tổng kết & Cầu nối Sư phạm')).toBe('Tóm tắt bài học')
  })

  it('splits dense theory blocks without changing the source slide identity', () => {
    const slides = prepareReaderSlides([{
      id: 's01',
      title: 'Khái niệm',
      blocks: [
        {
          id: 'text-1',
          block_type: 'text',
          content: {
            heading: 'Mệnh đề là gì?',
            paragraphs: ['Ý đầu tiên.', 'Ý thứ hai.', 'Ý thứ ba.'],
          },
        },
        {
          id: 'callout-1',
          block_type: 'callout',
          content: { body: '1. Điểm một.\n2. Điểm hai.\n3. Điểm ba.' },
        },
      ],
    }])

    expect(slides).toHaveLength(4)
    expect(slides.every(slide => slide.sourceSlideId === 's01')).toBe(true)
    expect(slides.map(slide => slide.readerSection)).toEqual([
      { index: 1, total: 4 },
      { index: 2, total: 4 },
      { index: 3, total: 4 },
      { index: 4, total: 4 },
    ])
    expect(slides[0].blocks[0].content.heading).toBe('Mệnh đề là gì?')
    expect(slides[1].blocks[0].content.heading).toBeUndefined()
    expect(isLastReaderSection(slides, 2)).toBe(false)
    expect(isLastReaderSection(slides, 3)).toBe(true)
  })

  it('keeps activity slides as one progress unit', () => {
    const [slide] = prepareReaderSlides([{
      id: 'activity',
      title: 'Thực hành',
      blocks: [{ id: 'interaction', block_type: 'interaction', content: {} }],
    }])

    expect(slide.id).toBe('activity')
    expect(slide.sourceSlideId).toBe('activity')
    expect(slide.presentationKind).toBe('activity')
    expect(slide.readerSection).toEqual({ index: 1, total: 1 })
  })

  it('keeps companion math with the preceding theory section', () => {
    const slides = prepareReaderSlides([{
      id: 'note',
      title: 'Ghi nhớ',
      blocks: [
        {
          id: 'callout',
          block_type: 'callout',
          content: { body: '1. Ý một.\n2. Ý hai.\n3. Ý ba.' },
        },
        {
          id: 'math',
          block_type: 'math',
          content: { latex: '\\forall x, P(x)' },
        },
      ],
    }])

    expect(slides).toHaveLength(1)
    expect(slides[0].blocks.map(block => block.block_type)).toEqual(['callout', 'math'])
    expect(slides[0].readerSection).toEqual({ index: 1, total: 1 })
  })

  it('keeps list lines together as one readable text group', () => {
    const slides = prepareReaderSlides([{
      id: 'quantifiers',
      blocks: [{
        id: 'text',
        block_type: 'text',
        content: {
          paragraphs: ['Mở đầu.', '- Với mọi.\n- Tồn tại.'],
        },
      }],
    }])

    expect(slides).toHaveLength(1)
    expect(slides[0].blocks[0].content.paragraphs).toEqual(['Mở đầu.', '- Với mọi.\n- Tồn tại.'])
  })
})
