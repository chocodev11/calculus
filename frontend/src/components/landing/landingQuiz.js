export const LANDING_QUIZ = Object.freeze({
  id: 'tangent-convergence',
  topicLabel: 'Đạo hàm',
  prompt: 'Khi Δx tiến dần về 0, cát tuyến tiến gần đến điều gì?',
  options: [
    { id: 'extremum', label: 'Một điểm cực trị' },
    { id: 'tangent', label: 'Tiếp tuyến tại A' },
    { id: 'x-axis', label: 'Trục hoành' },
    { id: 'vertical-line', label: 'Một đường thẳng đứng' },
  ],
  correctOptionId: 'tangent',
  explanation: 'Khi Δx tiến về 0, cát tuyến tiến gần tiếp tuyến tại A. Đây là trực giác hình học của đạo hàm.',
})

export function evaluateLandingAnswer(answerId) {
  if (!answerId) {
    return {
      correct: false,
      feedback: 'Chọn một đáp án rồi kiểm tra lại.',
    }
  }

  if (answerId === LANDING_QUIZ.correctOptionId) {
    return {
      correct: true,
      feedback: LANDING_QUIZ.explanation,
    }
  }

  return {
    correct: false,
    feedback: 'Chưa đúng. Hãy kéo Δx nhỏ hơn và quan sát hướng của cát tuyến.',
  }
}
