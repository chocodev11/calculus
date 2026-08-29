import { describe, expect, it } from 'vitest'
import { LANDING_QUIZ, evaluateLandingAnswer } from './landingQuiz'

describe('landing quiz', () => {
  it('accepts the tangent answer', () => {
    expect(evaluateLandingAnswer(LANDING_QUIZ.correctOptionId)).toEqual({
      correct: true,
      feedback: LANDING_QUIZ.explanation,
    })
  })

  it('returns a useful explanation for an incorrect answer', () => {
    expect(evaluateLandingAnswer('extremum')).toEqual({
      correct: false,
      feedback: 'Chưa đúng. Hãy kéo Δx nhỏ hơn và quan sát hướng của cát tuyến.',
    })
  })

  it('handles an empty answer', () => {
    expect(evaluateLandingAnswer('')).toEqual({
      correct: false,
      feedback: 'Chọn một đáp án rồi kiểm tra lại.',
    })
  })

  it('treats unknown answers as incorrect', () => {
    expect(evaluateLandingAnswer('unknown')).toEqual({
      correct: false,
      feedback: 'Chưa đúng. Hãy kéo Δx nhỏ hơn và quan sát hướng của cát tuyến.',
    })
  })
})
